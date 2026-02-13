"""
Unified database connection management for Cloud Shield.
Consolidates database connection logic.
"""
import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket, AsyncIOMotorDatabase
from typing import Optional
from pathlib import Path
from dotenv import load_dotenv

from app.config import settings


# Global connection variables
client: Optional[AsyncIOMotorClient] = None
db: Optional[AsyncIOMotorDatabase] = None
fs: Optional[AsyncIOMotorGridFSBucket] = None


async def connect_to_mongo():
    """
    Connect to MongoDB and initialize database.
    This function:
    1. Establishes connection to MongoDB
    2. Initializes indexes
    3. Runs migrations
    """
    global client, db, fs
    
    if not settings.MONGO_URI:
        raise ValueError("❌ MONGO_URI is missing! Check your .env file.")
    
    try:
        print("Connecting to MongoDB...")
        client = AsyncIOMotorClient(
            settings.MONGO_URI,
            tlsCAFile=None  # Use system CA if available, otherwise None
        )
        db = client[settings.DB_NAME]
        
        # Test connection
        await client.admin.command('ping')
        print(f"✅ Successfully connected to MongoDB: {settings.DB_NAME}")
        
        # Initialize GridFS if needed
        fs = AsyncIOMotorGridFSBucket(db)
        
        # Initialize schema (indexes and migrations)
        from app.database.indexes import initialize_all_indexes
        from app.database.migrations import run_migrations
        
        print("Initializing database schema...")
        await initialize_all_indexes(db, recreate=False)
        
        print("Running migrations...")
        await run_migrations(db)
        
        print("✅ Database initialization complete")
        
    except Exception as e:
        print(f"❌ Error connecting to MongoDB: {e}")
        raise e


async def close_mongo_connection():
    """Close MongoDB connection."""
    global client
    if client:
        client.close()
        print("MongoDB connection closed.")


def get_database():
    """Get MongoDB database instance."""
    if db is None:
        raise RuntimeError("Database not initialized. Call connect_to_mongo() first.")
    return db


def get_gridfs():
    """Get GridFS bucket instance."""
    if fs is None:
        raise RuntimeError("GridFS not initialized. Call connect_to_mongo() first.")
    return fs
