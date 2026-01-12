"""
User service for database operations.
"""
from typing import Optional
from bson import ObjectId

from app.database import get_database
from app.models.user import UserInDB
from app.utils.password import hash_password, verify_password


async def create_user(email: str, full_name: str, password: str, key_salt: str, encrypted_master_key: str) -> dict:
    """Create a new user in the database."""
    db = get_database()
    
    # Check if user already exists
    existing_user = await db.users.find_one({"email": email})
    if existing_user:
        raise ValueError("User with this email already exists")
    
    # Hash password and create user
    hashed_password = hash_password(password)
    user = UserInDB(
        email=email, 
        full_name=full_name, 
        hashed_password=hashed_password,
        key_salt=key_salt,
        encrypted_master_key=encrypted_master_key
    )
    
    # Insert into database
    result = await db.users.insert_one(user.to_dict())
    
    # Return user data (without password)
    user_dict = user.to_dict()
    user_dict["_id"] = result.inserted_id
    
    # Remove sensitive password data before returning
    del user_dict["hashed_password"]
    
    return {
        "id": str(user_dict["_id"]),
        "email": user_dict["email"],
        "full_name": user_dict["full_name"],
        "key_salt": user_dict["key_salt"],
        "encrypted_master_key": user_dict["encrypted_master_key"],
        "created_at": user_dict["created_at"],
        "updated_at": user_dict["updated_at"]
    }


async def authenticate_user(email: str, password: str) -> Optional[dict]:
    """Authenticate a user by email and password."""
    db = get_database()
    
    user_doc = await db.users.find_one({"email": email})
    if not user_doc:
        return None
    
    # Verify password
    if not verify_password(password, user_doc["hashed_password"]):
        return None
    
    # Return user data (without password)
    return {
        "id": str(user_doc["_id"]),
        "email": user_doc["email"],
        "full_name": user_doc["full_name"]
    }


async def get_user_by_id(user_id: str) -> Optional[dict]:
    """Get a user by ID."""
    db = get_database()
    
    try:
        user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user_doc:
            return None
        
        return {
            "id": str(user_doc["_id"]),
            "email": user_doc["email"],
            "full_name": user_doc["full_name"],
            "key_salt": user_doc.get("key_salt", ""),
            "encrypted_master_key": user_doc.get("encrypted_master_key", ""),
            "created_at": user_doc.get("created_at"),
            "updated_at": user_doc.get("updated_at")
        }
    except Exception:
        return None