"""
User profile and settings routes.
"""
from typing import Optional, List
from fastapi import APIRouter, HTTPException, status, Depends, Request, Query
from bson import ObjectId

from app.models.user import UserResponse
from app.models.user_settings import UserProfileUpdate, PasswordChange
from app.services.user_service import (
    update_user_profile,
    change_user_password,
    get_user_by_id
)
from app.services.user_settings_service import log_user_activity
from app.middleware.auth import get_current_user, get_admin_user
from app.database.connection import get_database

router = APIRouter(prefix="/user", tags=["user"])


@router.get("/profile", response_model=dict)
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Get current user profile."""
    user = await get_user_by_id(current_user["id"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Remove sensitive fields
    user.pop("key_salt", None)
    user.pop("encrypted_master_key", None)
    
    return user


@router.patch("/profile", response_model=dict)
async def update_profile(
    profile_update: UserProfileUpdate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Update user profile."""
    try:
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        
        user = await update_user_profile(
            user_id=current_user["id"],
            full_name=profile_update.full_name,
            email=profile_update.email
        )
        
        await log_user_activity(
            user_id=current_user["id"],
            activity_type="profile_update",
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={"updated_fields": profile_update.dict(exclude_unset=True)}
        )
        
        return user
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Change user password."""
    try:
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        
        success = await change_user_password(
            user_id=current_user["id"],
            current_password=password_data.current_password,
            new_password=password_data.new_password
        )
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to change password")
        
        await log_user_activity(
            user_id=current_user["id"],
            activity_type="password_change",
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        return {"status": "success", "message": "Password updated successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# --- ADMIN ONLY ROUTES ---

@router.get("/all", response_model=List[UserResponse])
async def get_all_users(
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_admin_user)
):
    """Admin: List all users."""
    db = get_database()
    cursor = db.users.find({}).skip(skip).limit(limit)
    users = await cursor.to_list(length=limit)
    # Convert _id to string id for response model
    return [{"id": str(u["_id"]), **u} for u in users]


@router.delete("/{user_id}/deactivate")
async def deactivate_user(
    user_id: str,
    current_user: dict = Depends(get_admin_user)
):
    """Admin: Deactivate a user account."""
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")

    db = get_database()
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_active": False}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {"status": "success", "message": "User deactivated"}


@router.patch("/{user_id}/reactivate")
async def reactivate_user(
    user_id: str,
    current_user: dict = Depends(get_admin_user)
):
    """Admin: Reactivate a user account."""
    db = get_database()
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_active": True}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {"status": "success", "message": "User reactivated"}