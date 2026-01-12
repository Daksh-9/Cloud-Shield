"""
MongoDB database connection and collection initialization.
"""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from typing import Optional
from app.config import settings

client: Optional[AsyncIOMotorClient] = None
database = None
fs: Optional[AsyncIOMotorGridFSBucket] = None

async def init_collections():
    """Initialize Time Series collections and standard indexes."""
    if database is None:
        return

    # 1. Create Time Series Collections if they don't exist
    existing_collections = await database.list_collection_names()
    
    if "raw_logs" not in existing_collections:
        await database.create_collection(
            "raw_logs",
            timeseries={
                "timeField": "timestamp",
                "metaField": "source",
                "granularity": "seconds"
            },
            expireAfterSeconds=7776000  # 90 days
        )
        print("✓ Created time-series collection: raw_logs")

    if "parsed_logs" not in existing_collections:
        await database.create_collection(
            "parsed_logs",
            timeseries={
                "timeField": "timestamp",
                "metaField": "source",
                "granularity": "seconds"
            }
        )
        print("✓ Created time-series collection: parsed_logs")

    # 2. Parsed Logs Indexes
    await database.parsed_logs.create_index([("src_ip", 1), ("timestamp", -1)])
    await database.parsed_logs.create_index([("dst_ip", 1), ("timestamp", -1)])
    await database.parsed_logs.create_index("protocol")
    await database.parsed_logs.create_index("event_type")

    # 3. Alerts Indexes
    await database.alerts.create_index("alert_id", unique=True)
    await database.alerts.create_index([("severity", 1), ("status", 1)])
    await database.alerts.create_index([("triggered_at", -1)])
    await database.alerts.create_index([("status", 1), ("triggered_at", -1)])
    await database.alerts.create_index("source.ips")
    await database.alerts.create_index("target.ip")
    print("✓ Collection indexes configured")

async def connect_to_mongo():
    global client, database, fs
    try:
        client = AsyncIOMotorClient(settings.MONGODB_URL)
        database = client[settings.MONGODB_DB_NAME]
        fs = AsyncIOMotorGridFSBucket(database)
        await client.admin.command('ping')
        print(f"✓ Connected to MongoDB: {settings.MONGODB_DB_NAME}")
        
        # Initialize time-series and indexes
        await init_collections()
    except Exception as e:
        print(f"✗ Failed to connect to MongoDB: {e}")
        raise

async def close_mongo_connection():
    global client
    if client:
        client.close()
        print("✓ MongoDB connection closed")

def get_database():
    return database

def get_gridfs():
    return fs