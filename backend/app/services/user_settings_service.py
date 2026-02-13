"""
User settings service for managing user preferences and settings.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
from bson import ObjectId

from app.database.connection import get_database
from app.models.user_settings import (
    UserPreferences,
    NotificationPreferences,
    DashboardPreferences,
    UserSettingsUpdate
)


async def get_user_settings(user_id: str) -> Dict[str, Any]:
    """Get user settings or create default if not exists."""
    db = get_database()
    
    settings_doc = await db.user_settings.find_one({"user_id": user_id})
    
    if not settings_doc:
        # Create default settings
        default_settings = {
            "user_id": user_id,
            "preferences": UserPreferences().dict(),
            "notifications": NotificationPreferences().dict(),
            "dashboard": DashboardPreferences().dict(),
            "metadata": {},
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        result = await db.user_settings.insert_one(default_settings)
        settings_doc = default_settings
        settings_doc["_id"] = result.inserted_id
    
    return {
        "user_id": settings_doc["user_id"],
        "preferences": settings_doc.get("preferences", UserPreferences().dict()),
        "notifications": settings_doc.get("notifications", NotificationPreferences().dict()),
        "dashboard": settings_doc.get("dashboard", DashboardPreferences().dict()),
        "metadata": settings_doc.get("metadata", {}),
        "created_at": settings_doc.get("created_at", datetime.utcnow()),
        "updated_at": settings_doc.get("updated_at", datetime.utcnow())
    }


async def update_user_settings(user_id: str, settings_update: UserSettingsUpdate) -> Dict[str, Any]:
    """Update user settings."""
    db = get_database()
    
    # Get current settings
    current_settings = await get_user_settings(user_id)
    
    # Merge updates
    update_data = {"updated_at": datetime.utcnow()}
    
    if settings_update.preferences is not None:
        # Merge preferences
        current_prefs = current_settings.get("preferences", {})
        current_prefs.update(settings_update.preferences.dict(exclude_unset=True))
        update_data["preferences"] = current_prefs
    
    if settings_update.notifications is not None:
        # Merge notifications
        current_notifs = current_settings.get("notifications", {})
        current_notifs.update(settings_update.notifications.dict(exclude_unset=True))
        update_data["notifications"] = current_notifs
    
    if settings_update.dashboard is not None:
        # Merge dashboard
        current_dashboard = current_settings.get("dashboard", {})
        current_dashboard.update(settings_update.dashboard.dict(exclude_unset=True))
        update_data["dashboard"] = current_dashboard
    
    if settings_update.metadata is not None:
        # Merge metadata
        current_metadata = current_settings.get("metadata", {})
        current_metadata.update(settings_update.metadata)
        update_data["metadata"] = current_metadata
    
    # Update in database
    await db.user_settings.update_one(
        {"user_id": user_id},
        {"$set": update_data}
    )
    
    # Return updated settings
    return await get_user_settings(user_id)


async def log_user_activity(
    user_id: str,
    activity_type: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Log user activity."""
    db = get_database()
    
    activity_doc = {
        "user_id": user_id,
        "activity_type": activity_type,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "metadata": metadata or {},
        "timestamp": datetime.utcnow()
    }
    
    result = await db.user_activities.insert_one(activity_doc)
    
    return {
        "id": str(result.inserted_id),
        "user_id": user_id,
        "activity_type": activity_type,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "metadata": metadata or {},
        "timestamp": activity_doc["timestamp"]
    }


async def get_user_activities(
    user_id: str,
    limit: int = 100,
    skip: int = 0,
    activity_type: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Get user activity logs."""
    db = get_database()
    
    query = {"user_id": user_id}
    if activity_type:
        query["activity_type"] = activity_type
    
    cursor = db.user_activities.find(query).sort("timestamp", -1).skip(skip).limit(limit)
    activities = await cursor.to_list(length=limit)
    
    return [
        {
            "id": str(act["_id"]),
            "user_id": act["user_id"],
            "activity_type": act["activity_type"],
            "ip_address": act.get("ip_address"),
            "user_agent": act.get("user_agent"),
            "metadata": act.get("metadata", {}),
            "timestamp": act.get("timestamp")
        }
        for act in activities
    ]


async def create_user_session(
    user_id: str,
    token_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    expires_at: Optional[datetime] = None
) -> Dict[str, Any]:
    """Create a user session."""
    db = get_database()
    
    session_doc = {
        "user_id": user_id,
        "token_id": token_id,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "created_at": datetime.utcnow(),
        "last_activity": datetime.utcnow(),
        "expires_at": expires_at
    }
    
    result = await db.user_sessions.insert_one(session_doc)
    
    return {
        "id": str(result.inserted_id),
        "user_id": user_id,
        "token_id": token_id,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "created_at": session_doc["created_at"],
        "last_activity": session_doc["last_activity"],
        "expires_at": expires_at
    }


async def get_user_sessions(user_id: str) -> List[Dict[str, Any]]:
    """Get all active sessions for a user."""
    db = get_database()
    
    query = {"user_id": user_id}
    # Filter out expired sessions
    query["$or"] = [
        {"expires_at": {"$exists": False}},
        {"expires_at": {"$gt": datetime.utcnow()}}
    ]
    
    cursor = db.user_sessions.find(query).sort("last_activity", -1)
    sessions = await cursor.to_list(length=None)
    
    return [
        {
            "id": str(sess["_id"]),
            "user_id": sess["user_id"],
            "token_id": sess.get("token_id"),
            "ip_address": sess.get("ip_address"),
            "user_agent": sess.get("user_agent"),
            "created_at": sess.get("created_at"),
            "last_activity": sess.get("last_activity"),
            "expires_at": sess.get("expires_at")
        }
        for sess in sessions
    ]


async def revoke_user_session(session_id: str, user_id: str) -> bool:
    """Revoke a user session."""
    db = get_database()
    
    result = await db.user_sessions.delete_one({
        "_id": ObjectId(session_id),
        "user_id": user_id
    })
    
    return result.deleted_count > 0


async def revoke_all_user_sessions(user_id: str, exclude_token_id: Optional[str] = None) -> int:
    """Revoke all user sessions except the current one."""
    db = get_database()
    
    query = {"user_id": user_id}
    if exclude_token_id:
        query["token_id"] = {"$ne": exclude_token_id}
    
    result = await db.user_sessions.delete_many(query)
    return result.deleted_count
