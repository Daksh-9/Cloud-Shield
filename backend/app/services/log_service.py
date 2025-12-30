"""
Log service for database operations.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId

from app.database import get_database
from app.models.log import LogInDB


async def create_log(
    source: str,
    log_type: str,
    severity: str,
    message: str,
    metadata: Optional[Dict[str, Any]] = None,
    timestamp: Optional[datetime] = None,
    user_id: Optional[str] = None
) -> dict:
    """Create a new log entry in the database."""
    db = get_database()
    
    log = LogInDB(
        source=source,
        log_type=log_type,
        severity=severity,
        message=message,
        metadata=metadata,
        timestamp=timestamp,
        user_id=user_id
    )
    
    # Insert into database
    result = await db.logs.insert_one(log.to_dict())
    
    # Return log data
    log_dict = log.to_dict()
    log_dict["_id"] = result.inserted_id
    return {
        "id": str(log_dict["_id"]),
        "source": log_dict["source"],
        "log_type": log_dict["log_type"],
        "severity": log_dict["severity"],
        "message": log_dict["message"],
        "metadata": log_dict["metadata"],
        "timestamp": log_dict["timestamp"],
        "created_at": log_dict["created_at"]
    }


async def get_logs(
    limit: int = 100,
    skip: int = 0,
    source: Optional[str] = None,
    severity: Optional[str] = None,
    log_type: Optional[str] = None
) -> List[dict]:
    """Get logs with optional filtering."""
    db = get_database()
    
    # Build query filter
    query = {}
    if source:
        query["source"] = source
    if severity:
        query["severity"] = severity
    if log_type:
        query["log_type"] = log_type
    
    # Fetch logs
    cursor = db.logs.find(query).sort("timestamp", -1).skip(skip).limit(limit)
    logs = await cursor.to_list(length=limit)
    
    # Convert to response format
    return [
        {
            "id": str(log["_id"]),
            "source": log["source"],
            "log_type": log["log_type"],
            "severity": log["severity"],
            "message": log["message"],
            "metadata": log.get("metadata", {}),
            "timestamp": log.get("timestamp", log.get("created_at")),
            "created_at": log.get("created_at")
        }
        for log in logs
    ]


async def get_log_by_id(log_id: str) -> Optional[dict]:
    """Get a log by ID."""
    db = get_database()
    
    try:
        log_doc = await db.logs.find_one({"_id": ObjectId(log_id)})
        if not log_doc:
            return None
        
        return {
            "id": str(log_doc["_id"]),
            "source": log_doc["source"],
            "log_type": log_doc["log_type"],
            "severity": log_doc["severity"],
            "message": log_doc["message"],
            "metadata": log_doc.get("metadata", {}),
            "timestamp": log_doc.get("timestamp", log_doc.get("created_at")),
            "created_at": log_doc.get("created_at")
        }
    except Exception:
        return None


async def get_log_count(
    source: Optional[str] = None,
    severity: Optional[str] = None,
    log_type: Optional[str] = None
) -> int:
    """Get count of logs matching filters."""
    db = get_database()
    
    query = {}
    if source:
        query["source"] = source
    if severity:
        query["severity"] = severity
    if log_type:
        query["log_type"] = log_type
    
    return await db.logs.count_documents(query)

