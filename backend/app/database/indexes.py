"""
Database index initialization and management.
"""
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.schema import CollectionSchema, CollectionIndex, COLLECTIONS


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
            print(f"⚠️  Warning: Failed to create index '{index_name}' on '{schema.name}': {e}")
    
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
            print(f"⚠️  Warning: No schema found for collection '{collection_name}'")
            continue
        
        # Create time-series collection if needed
        if schema.is_timeseries:
            created = await create_timeseries_collection(db, schema, recreate)
            if created:
                print(f"✓ Created time-series collection: {schema.name}")
        
        # Create indexes
        try:
            created_indexes = await create_indexes_for_collection(db, schema, recreate)
            if created_indexes:
                results[collection_name] = created_indexes
                print(f"✓ Created {len(created_indexes)} index(es) for '{collection_name}'")
            else:
                results[collection_name] = []
                print(f"ℹ️  Indexes already exist for '{collection_name}'")
        except Exception as e:
            print(f"✗ Error initializing indexes for '{collection_name}': {e}")
            results[collection_name] = []
    
    return results


async def verify_indexes(db: AsyncIOMotorDatabase) -> dict:
    """
    Verify that all required indexes exist.
    
    Returns:
        Dictionary mapping collection names to verification results
    """
    results = {}
    
    for collection_name, schema in COLLECTIONS.items():
        collection = db[collection_name]
        existing_indexes = await collection.list_indexes().to_list(length=None)
        existing_index_names = {idx["name"] for idx in existing_indexes}
        
        required_indexes = {idx.name for idx in schema.indexes}
        missing_indexes = required_indexes - existing_index_names
        
        results[collection_name] = {
            "exists": collection_name in await db.list_collection_names(),
            "required": len(required_indexes),
            "existing": len(existing_index_names),
            "missing": list(missing_indexes)
        }
    
    return results
