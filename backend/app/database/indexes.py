"""
Database index initialization and management.
"""
from typing import List, Optional
import logging

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.schema import CollectionSchema, CollectionIndex, COLLECTIONS


logger = logging.getLogger(__name__)


async def create_indexes_for_collection(
    db: AsyncIOMotorDatabase,
    schema: CollectionSchema,
    recreate: bool = False
) -> List[str]:
    """
    Create indexes for a collection based on its schema.
    
    Args:
        db: MongoDB database instance
        schema: Collection schema definition
        recreate: If True, drop existing indexes before creating
        
    Returns:
        List of created index names
    """
    created_indexes = []
    collection = db[schema.name]
    
    # Get existing indexes
    existing_indexes = await collection.list_indexes().to_list(length=None)
    existing_index_names = {idx["name"] for idx in existing_indexes}
    
    for index_def in schema.indexes:
        index_name = index_def.name
        
        # Skip if index already exists and not recreating
        if index_name in existing_index_names and not recreate:
            continue
        
        try:
            # Build index specification
            index_spec = [(field, direction) for field, direction in index_def.fields]
            
            # Create index options
            index_options = {}
            if index_def.unique:
                index_options["unique"] = True
            if index_def.sparse:
                index_options["sparse"] = True
            if index_def.ttl:
                index_options["expireAfterSeconds"] = index_def.ttl
            
            # Drop existing index if recreating
            if recreate and index_name in existing_index_names:
                try:
                    await collection.drop_index(index_name)
                except Exception:
                    pass  # Index might not exist
            
            # Create index
            await collection.create_index(
                index_spec,
                name=index_name,
                **index_options
            )
            created_indexes.append(index_name)
            
        except Exception as e:
            logger.warning(
                "Failed to create index '%s' on '%s': %s",
                index_name,
                schema.name,
                e,
            )
    
    return created_indexes


async def create_timeseries_collection(
    db: AsyncIOMotorDatabase,
    schema: CollectionSchema,
    recreate: bool = False
) -> bool:
    """
    Create a time-series collection if it doesn't exist.
    
    Args:
        db: MongoDB database instance
        schema: Collection schema definition
        recreate: If True, drop existing collection before creating
        
    Returns:
        True if collection was created, False if it already exists
    """
    existing_collections = await db.list_collection_names()
    
    if schema.name in existing_collections:
        if recreate:
            await db.drop_collection(schema.name)
        else:
            return False
    
    # Build create options
    create_options = {
        "timeseries": schema.timeseries_config
    }
    
    if schema.expire_after_seconds:
        create_options["expireAfterSeconds"] = schema.expire_after_seconds
    
    await db.create_collection(schema.name, **create_options)
    return True


async def initialize_all_indexes(
    db: AsyncIOMotorDatabase,
    recreate: bool = False,
    collections: Optional[List[str]] = None
) -> dict:
    """
    Initialize indexes for all collections or specified collections.
    
    Args:
        db: MongoDB database instance
        recreate: If True, drop existing indexes before creating
        collections: List of collection names to initialize (None = all)
        
    Returns:
        Dictionary mapping collection names to lists of created indexes
    """
    results = {}
    collections_to_init = collections or COLLECTIONS.keys()
    
    for collection_name in collections_to_init:
        schema = COLLECTIONS.get(collection_name)
        if not schema:
            logger.warning("No schema found for collection '%s'", collection_name)
            continue
        
        # Create time-series collection if needed
        if schema.is_timeseries:
            created = await create_timeseries_collection(db, schema, recreate)
            if created:
                logger.info("Created time-series collection '%s'", schema.name)
        
        # Create indexes
        try:
            created_indexes = await create_indexes_for_collection(db, schema, recreate)
            if created_indexes:
                results[collection_name] = created_indexes
                logger.info(
                    "Created %d index(es) for '%s'",
                    len(created_indexes),
                    collection_name,
                )
            else:
                results[collection_name] = []
                logger.info("Indexes already exist for '%s'", collection_name)
        except Exception as e:
            logger.error(
                "Error initializing indexes for '%s': %s",
                collection_name,
                e,
            )
            results[collection_name] = []
    
    return results


async def verify_indexes(db: AsyncIOMotorDatabase) -> dict:
    """
    Verify that all required indexes exist.
    
    Returns:
        Dictionary mapping collection names to verification results
    """
    results = {}
    existing_collections = await db.list_collection_names()
    
    for collection_name, schema in COLLECTIONS.items():
        collection_exists = collection_name in existing_collections
        collection = db[collection_name]
        existing_indexes = await collection.list_indexes().to_list(length=None)
        existing_index_names = {idx["name"] for idx in existing_indexes}
        
        required_indexes = {idx.name for idx in schema.indexes}
        missing_indexes = required_indexes - existing_index_names

        result_entry = {
            "exists": collection_exists,
            "required": len(required_indexes),
            "existing": len(existing_index_names),
            "missing": list(missing_indexes),
        }

        # --- TTL verification for time-series collections (e.g., raw_logs) ---
        ttl_info = None
        if schema.expire_after_seconds and collection_exists and schema.is_timeseries:
            desired_ttl = schema.expire_after_seconds
            time_field = schema.timeseries_config.get("timeField", "timestamp")

            ttl_index = None
            for idx in existing_indexes:
                if "expireAfterSeconds" in idx:
                    key_fields = list(idx.get("key", {}).keys())
                    # Look for a TTL index on the time field
                    if key_fields == [time_field]:
                        ttl_index = idx
                        break

            current_ttl = None
            status = "missing"

            if ttl_index:
                current_ttl = int(ttl_index.get("expireAfterSeconds", 0))
                if current_ttl == desired_ttl:
                    status = "correct"
                    logger.info(
                        "TTL index for '%s' is correct (%d seconds).",
                        collection_name,
                        desired_ttl,
                    )
                else:
                    status = "incorrect"
                    logger.warning(
                        "TTL index for '%s' has value %d (expected %d). Recreating index...",
                        collection_name,
                        current_ttl,
                        desired_ttl,
                    )
                    try:
                        await collection.drop_index(ttl_index["name"])
                        await collection.create_index(
                            [(time_field, 1)],
                            name=f"{time_field}_ttl",
                            expireAfterSeconds=desired_ttl,
                        )
                        status = "fixed"
                        logger.info(
                            "Recreated TTL index for '%s' with %d seconds.",
                            collection_name,
                            desired_ttl,
                        )
                    except Exception as e:
                        logger.error(
                            "Failed to recreate TTL index for '%s': %s",
                            collection_name,
                            e,
                        )
                        status = "error"
            else:
                logger.warning(
                    "TTL index missing for '%s'. Creating index with %d seconds...",
                    collection_name,
                    desired_ttl,
                )
                try:
                    await collection.create_index(
                        [(time_field, 1)],
                        name=f"{time_field}_ttl",
                        expireAfterSeconds=desired_ttl,
                    )
                    status = "created"
                    current_ttl = desired_ttl
                    logger.info(
                        "Created TTL index for '%s' with %d seconds.",
                        collection_name,
                        desired_ttl,
                    )
                except Exception as e:
                    logger.error(
                        "Failed to create TTL index for '%s': %s",
                        collection_name,
                        e,
                    )
                    status = "error"

            ttl_info = {
                "status": status,
                "expected_seconds": desired_ttl,
                "current_seconds": current_ttl,
            }

        result_entry["ttl"] = ttl_info
        results[collection_name] = result_entry
    
    return results
