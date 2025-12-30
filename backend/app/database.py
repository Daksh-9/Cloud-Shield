"""
MongoDB database connection and management.
"""
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional

from app.config import settings

# Global database client
client: Optional[AsyncIOMotorClient] = None
database = None


async def connect_to_mongo():
    """Create database connection."""
    global client, database
    
    try:
        client = AsyncIOMotorClient(settings.MONGODB_URL)
        database = client[settings.MONGODB_DB_NAME]
        
        # Test connection
        await client.admin.command('ping')
        print(f"✓ Connected to MongoDB: {settings.MONGODB_DB_NAME}")
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

