"""
Suricata service for event processing and management.
"""
import json
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId

from app.database import get_database
from app.services.log_service import create_log


async def parse_and_store_suricata_event(eve_json: Dict[str, Any]) -> dict:
    """
    Parse Suricata EVE JSON event and store in MongoDB.
    Also creates a log entry for the event.
    """
    db = get_database()
    
    event_type = eve_json.get("event_type", "unknown")
    timestamp_str = eve_json.get("timestamp")
    
    # Parse timestamp
    if timestamp_str:
        try:
            timestamp = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
        except:
            timestamp = datetime.utcnow()
    else:
        timestamp = datetime.utcnow()
    
    # Store raw event
    event_doc = {
        "_id": ObjectId(),
        "event_type": event_type,
        "timestamp": timestamp,
        "raw_event": eve_json,
        "created_at": datetime.utcnow()
    }
    
    result = await db.suricata_events.insert_one(event_doc)
    
    # Create log entry for alerts
    if event_type == "alert":
        alert_data = eve_json.get("alert", {})
        signature = alert_data.get("signature", "Unknown signature")
        category = alert_data.get("category", "Unknown")
        severity = alert_data.get("severity", 1)
        
        # Map Suricata severity to our severity levels
        if severity >= 4:
            log_severity = "critical"
        elif severity >= 3:
            log_severity = "error"
        elif severity >= 2:
            log_severity = "warning"
        else:
            log_severity = "info"
        
        # Create log entry
        await create_log(
            source="suricata",
            log_type="alert",
            severity=log_severity,
            message=f"Suricata Alert: {signature}",
            metadata={
                "suricata_event_id": str(result.inserted_id),
                "signature": signature,
                "category": category,
                "severity": severity,
                "raw_alert": alert_data
            },
            timestamp=timestamp
        )
    
    return {
        "id": str(result.inserted_id),
        "event_type": event_type,
        "timestamp": timestamp,
        "raw_event": eve_json,
        "created_at": event_doc["created_at"]
    }


async def get_suricata_events(
    limit: int = 100,
    skip: int = 0,
    event_type: Optional[str] = None
) -> List[dict]:
    """Get Suricata events with optional filtering."""
    db = get_database()
    
    query = {}
    if event_type:
        query["event_type"] = event_type
    
    cursor = db.suricata_events.find(query).sort("timestamp", -1).skip(skip).limit(limit)
    events = await cursor.to_list(length=limit)
    
    return [
        {
            "id": str(event["_id"]),
            "event_type": event["event_type"],
            "timestamp": event.get("timestamp", event.get("created_at")),
            "raw_event": event["raw_event"],
            "created_at": event.get("created_at")
        }
        for event in events
    ]


async def create_suricata_rule(
    name: str,
    rule_content: str,
    description: Optional[str] = None,
    enabled: bool = True
) -> dict:
    """Create a Suricata rule."""
    db = get_database()
    
    rule_doc = {
        "_id": ObjectId(),
        "name": name,
        "rule_content": rule_content,
        "description": description,
        "enabled": enabled,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.suricata_rules.insert_one(rule_doc)
    
    return {
        "id": str(result.inserted_id),
        "name": rule_doc["name"],
        "rule_content": rule_doc["rule_content"],
        "description": rule_doc["description"],
        "enabled": rule_doc["enabled"],
        "created_at": rule_doc["created_at"],
        "updated_at": rule_doc["updated_at"]
    }


async def get_suricata_rules(enabled_only: bool = False) -> List[dict]:
    """Get Suricata rules."""
    db = get_database()
    
    query = {}
    if enabled_only:
        query["enabled"] = True
    
    cursor = db.suricata_rules.find(query).sort("created_at", -1)
    rules = await cursor.to_list(length=None)
    
    return [
        {
            "id": str(rule["_id"]),
            "name": rule["name"],
            "rule_content": rule["rule_content"],
            "description": rule.get("description"),
            "enabled": rule.get("enabled", True),
            "created_at": rule.get("created_at"),
            "updated_at": rule.get("updated_at")
        }
        for rule in rules
    ]


async def update_suricata_rule(rule_id: str, enabled: Optional[bool] = None, rule_content: Optional[str] = None) -> Optional[dict]:
    """Update a Suricata rule."""
    db = get_database()
    
    update_data = {"updated_at": datetime.utcnow()}
    if enabled is not None:
        update_data["enabled"] = enabled
    if rule_content is not None:
        update_data["rule_content"] = rule_content
    
    result = await db.suricata_rules.update_one(
        {"_id": ObjectId(rule_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        return None
    
    rule_doc = await db.suricata_rules.find_one({"_id": ObjectId(rule_id)})
    return {
        "id": str(rule_doc["_id"]),
        "name": rule_doc["name"],
        "rule_content": rule_doc["rule_content"],
        "description": rule_doc.get("description"),
        "enabled": rule_doc.get("enabled", True),
        "created_at": rule_doc.get("created_at"),
        "updated_at": rule_doc.get("updated_at")
    }


async def delete_suricata_rule(rule_id: str) -> bool:
    """Delete a Suricata rule."""
    db = get_database()
    
    result = await db.suricata_rules.delete_one({"_id": ObjectId(rule_id)})
    return result.deleted_count > 0


async def create_suricata_config(
    config_name: str,
    config_content: str,
    description: Optional[str] = None
) -> dict:
    """Create a Suricata configuration."""
    db = get_database()
    
    config_doc = {
        "_id": ObjectId(),
        "config_name": config_name,
        "config_content": config_content,
        "description": description,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.suricata_configs.insert_one(config_doc)
    
    return {
        "id": str(result.inserted_id),
        "config_name": config_doc["config_name"],
        "config_content": config_doc["config_content"],
        "description": config_doc["description"],
        "created_at": config_doc["created_at"],
        "updated_at": config_doc["updated_at"]
    }


async def get_suricata_configs() -> List[dict]:
    """Get Suricata configurations."""
    db = get_database()
    
    cursor = db.suricata_configs.find({}).sort("created_at", -1)
    configs = await cursor.to_list(length=None)
    
    return [
        {
            "id": str(config["_id"]),
            "config_name": config["config_name"],
            "config_content": config["config_content"],
            "description": config.get("description"),
            "created_at": config.get("created_at"),
            "updated_at": config.get("updated_at")
        }
        for config in configs
    ]


async def reload_suricata() -> dict:
    """
    Trigger Suricata reload.
    In a real implementation, this would execute suricata-reload command.
    For now, we'll simulate it and log the action.
    """
    # In production, this would execute: subprocess.run(["suricatasc", "-c", "reload-rules"])
    # For now, we'll just log the action
    
    await create_log(
        source="suricata",
        log_type="reload",
        severity="info",
        message="Suricata reload triggered",
        metadata={"action": "reload_rules"}
    )
    
    return {
        "status": "success",
        "message": "Suricata reload triggered",
        "timestamp": datetime.utcnow().isoformat()
    }

