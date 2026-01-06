"""
MongoDB database connection and GridFS management.
"""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from typing import Optional
from app.config import settings

# Global database client and GridFS bucket
client: Optional[AsyncIOMotorClient] = None
database = None
fs: Optional[AsyncIOMotorGridFSBucket] = None

async def connect_to_mongo():
    """Create database connection and initialize GridFS."""
    global client, database, fs
    
    try:
        client = AsyncIOMotorClient(settings.MONGODB_URL)
        database = client[settings.MONGODB_DB_NAME]
        
        # Initialize GridFS bucket for scalable file storage
        fs = AsyncIOMotorGridFSBucket(database)
        
        # Test connection
        await client.admin.command('ping')
        print(f"✓ Connected to MongoDB: {settings.MONGODB_DB_NAME}")
        print("✓ GridFS Bucket initialized")
    except Exception as e:
        print(f"✗ Failed to connect to MongoDB: {e}")
        raise

async def close_mongo_connection():
    """Close database connection."""
    global client
    
    if client:
        client.close()
        print("✓ MongoDB connection closed")

def get_database():
    """Get database instance."""
    return database

def get_gridfs():
    """Get GridFS bucket instance."""
    return fs
    