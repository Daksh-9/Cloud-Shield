import os
from motor.motor_asyncio import AsyncIOMotorClient
import certifi
from dotenv import load_dotenv
from pathlib import Path

# --- FIX: Explicitly tell Python where the .env file is ---
# This looks for .env in the folder above 'app' (which is 'backend')
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = "CloudShield"

# Debugging print to confirm it works
print(f"DEBUG: Loading .env from: {env_path}")
print(f"DEBUG: MONGO_URI is: {MONGO_URI}")

client = None
db = None

async def connect_to_mongo():
    global client, db
    if not MONGO_URI:
        raise ValueError("❌ MONGO_URI is missing! Check your .env file.")

    try:
        print("Connecting to MongoDB...")
        client = AsyncIOMotorClient(
            MONGO_URI,
            tlsCAFile=certifi.where()
        )
        db = client[DB_NAME]
        await client.admin.command('ping')
        print("✅ Successfully connected to MongoDB!")
    except Exception as e:
        print(f"❌ Error connecting to MongoDB: {e}")
        raise e

async def close_mongo_connection():
    global client
    if client:
        client.close()
        print("MongoDB connection closed.")

def get_database():
    return db