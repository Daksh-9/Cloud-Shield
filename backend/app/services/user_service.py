"""
User service for database operations.
"""
from typing import Optional
from datetime import datetime
from bson import ObjectId

from app.database.connection import get_database
from app.models.user import UserInDB
from app.utils.password import hash_password, verify_password


async def create_user(
    email: str, 
    full_name: str, 
    password: str, 
    key_salt: str, 
    encrypted_master_key: str,
    role: str = "analyst"
) -> dict:
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
        encrypted_master_key=encrypted_master_key,
        role=role
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
        "role": user_dict["role"],
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
        "full_name": user_doc["full_name"],
        "role": user_doc.get("role", "analyst")
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
            "role": user_doc.get("role", "analyst"),
            "key_salt": user_doc.get("key_salt", ""),
            "encrypted_master_key": user_doc.get("encrypted_master_key", ""),
            "created_at": user_doc.get("created_at"),
            "updated_at": user_doc.get("updated_at")
        }
    except Exception:
        return None


async def update_user_profile(user_id: str, full_name: Optional[str] = None, email: Optional[str] = None) -> Optional[dict]:
    """Update user profile information."""
    db = get_database()
    
    update_data = {"updated_at": datetime.utcnow()}
    
    if full_name is not None:
        update_data["full_name"] = full_name
    
    if email is not None:
        # Check if email is already taken
        existing_user = await db.users.find_one({"email": email, "_id": {"$ne": ObjectId(user_id)}})
        if existing_user:
            raise ValueError("Email already in use")
        update_data["email"] = email
    
    if not update_data:
        return await get_user_by_id(user_id)
    
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        return await get_user_by_id(user_id)
    
    return await get_user_by_id(user_id)


async def change_user_password(user_id: str, current_password: str, new_password: str) -> bool:
    """Change user password."""
    db = get_database()
    
    user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user_doc:
        raise ValueError("User not found")
    
    # Verify current password
    if not verify_password(current_password, user_doc["hashed_password"]):
        raise ValueError("Current password is incorrect")
    
    # Hash new password
    new_hashed_password = hash_password(new_password)
    
    # Update password
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"hashed_password": new_hashed_password, "updated_at": datetime.utcnow()}}
    )
    
    return result.modified_count > 0


async def delete_user_account(user_id: str) -> bool:
    """Delete user account and all associated data."""
    db = get_database()
    
    # Delete user and related data
    await db.users.delete_one({"_id": ObjectId(user_id)})
    await db.user_settings.delete_many({"user_id": user_id})
    await db.user_activities.delete_many({"user_id": user_id})
    await db.user_sessions.delete_many({"user_id": user_id})
    
    return True