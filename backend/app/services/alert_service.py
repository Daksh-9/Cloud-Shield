"""
Alert service for database operations.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId

from app.database import get_database
from app.models.alert import AlertInDB


async def create_alert(
    title: str,
    description: str,
    severity: str,
    alert_type: str,
    source: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    related_log_ids: Optional[List[str]] = None,
    created_by: Optional[str] = None
) -> dict:
    """Create a new alert in the database."""
    db = get_database()
    
    alert = AlertInDB(
        title=title,
        description=description,
        severity=severity,
        alert_type=alert_type,
        source=source,
        metadata=metadata,
        related_log_ids=related_log_ids,
        created_by=created_by
    )
    
    # Insert into database
    result = await db.alerts.insert_one(alert.to_dict())
    
    # Return alert data
    alert_dict = alert.to_dict()
    alert_dict["_id"] = result.inserted_id
    return {
        "id": str(alert_dict["_id"]),
        "title": alert_dict["title"],
        "description": alert_dict["description"],
        "severity": alert_dict["severity"],
        "alert_type": alert_dict["alert_type"],
        "source": alert_dict["source"],
        "metadata": alert_dict["metadata"],
        "related_log_ids": alert_dict["related_log_ids"],
        "status": alert_dict["status"],
        "created_by": alert_dict["created_by"],
        "assigned_to": alert_dict["assigned_to"],
        "notes": alert_dict["notes"],
        "created_at": alert_dict["created_at"],
        "updated_at": alert_dict["updated_at"]
    }


async def get_alerts(
    limit: int = 100,
    skip: int = 0,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    alert_type: Optional[str] = None
) -> List[dict]:
    """Get alerts with optional filtering."""
    db = get_database()
    
    # Build query filter
    query = {}
    if status:
        query["status"] = status
    if severity:
        query["severity"] = severity
    if alert_type:
        query["alert_type"] = alert_type
    
    # Fetch alerts
    cursor = db.alerts.find(query).sort("created_at", -1).skip(skip).limit(limit)
    alerts = await cursor.to_list(length=limit)
    
    # Convert to response format
    return [
        {
            "id": str(alert["_id"]),
            "title": alert["title"],
            "description": alert["description"],
            "severity": alert["severity"],
            "alert_type": alert["alert_type"],
            "source": alert.get("source"),
            "metadata": alert.get("metadata", {}),
            "related_log_ids": alert.get("related_log_ids", []),
            "status": alert.get("status", "open"),
            "created_by": alert.get("created_by"),
            "assigned_to": alert.get("assigned_to"),
            "notes": alert.get("notes"),
            "created_at": alert.get("created_at"),
            "updated_at": alert.get("updated_at")
        }
        for alert in alerts
    ]


async def get_alert_by_id(alert_id: str) -> Optional[dict]:
    """Get an alert by ID."""
    db = get_database()
    
    try:
        alert_doc = await db.alerts.find_one({"_id": ObjectId(alert_id)})
        if not alert_doc:
            return None
        
        return {
            "id": str(alert_doc["_id"]),
            "title": alert_doc["title"],
            "description": alert_doc["description"],
            "severity": alert_doc["severity"],
            "alert_type": alert_doc["alert_type"],
            "source": alert_doc.get("source"),
            "metadata": alert_doc.get("metadata", {}),
            "related_log_ids": alert_doc.get("related_log_ids", []),
            "status": alert_doc.get("status", "open"),
            "created_by": alert_doc.get("created_by"),
            "assigned_to": alert_doc.get("assigned_to"),
            "notes": alert_doc.get("notes"),
            "created_at": alert_doc.get("created_at"),
            "updated_at": alert_doc.get("updated_at")
        }
    except Exception:
        return None


async def update_alert(
    alert_id: str,
    status: Optional[str] = None,
    notes: Optional[str] = None,
    assigned_to: Optional[str] = None
) -> Optional[dict]:
    """Update an alert."""
    db = get_database()
    
    try:
        update_data = {"updated_at": datetime.utcnow()}
        if status is not None:
            update_data["status"] = status
        if notes is not None:
            update_data["notes"] = notes
        if assigned_to is not None:
            update_data["assigned_to"] = assigned_to
        
        result = await db.alerts.update_one(
            {"_id": ObjectId(alert_id)},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            return None
        
        # Return updated alert
        return await get_alert_by_id(alert_id)
    except Exception:
        return None


async def get_alert_count(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    alert_type: Optional[str] = None
) -> int:
    """Get count of alerts matching filters."""
    db = get_database()
    
    query = {}
    if status:
        query["status"] = status
    if severity:
        query["severity"] = severity
    if alert_type:
        query["alert_type"] = alert_type
    
    return await db.alerts.count_documents(query)

