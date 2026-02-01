import asyncio
import platform
import os
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId

from app.database import get_database
from app.services.log_service import create_log
from app.config import settings  # Import settings for paths

# --- Existing Event Parsing Functions (Unchanged) ---
async def parse_and_store_suricata_event(eve_json: Dict[str, Any]) -> dict:
    """Parse Suricata EVE JSON event and store in MongoDB."""
    db = get_database()
    
    event_type = eve_json.get("event_type", "unknown")
    timestamp_str = eve_json.get("timestamp")
    
    if timestamp_str:
        try:
            timestamp = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
        except:
            timestamp = datetime.utcnow()
    else:
        timestamp = datetime.utcnow()
    
    event_doc = {
        "_id": ObjectId(),
        "event_type": event_type,
        "timestamp": timestamp,
        "raw_event": eve_json,
        "created_at": datetime.utcnow()
    }
    
    result = await db.suricata_events.insert_one(event_doc)
    
    if event_type == "alert":
        alert_data = eve_json.get("alert", {})
        severity = alert_data.get("severity", 1)
        
        if severity >= 4: log_severity = "critical"
        elif severity >= 3: log_severity = "error"
        elif severity >= 2: log_severity = "warning"
        else: log_severity = "info"
        
        await create_log(
            source="suricata",
            log_type="alert",
            severity=log_severity,
            message=f"Suricata Alert: {alert_data.get('signature', 'Unknown')}",
            metadata={
                "suricata_event_id": str(result.inserted_id),
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

async def get_suricata_events(limit: int = 100, skip: int = 0, event_type: Optional[str] = None) -> List[dict]:
    db = get_database()
    query = {"event_type": event_type} if event_type else {}
    cursor = db.suricata_events.find(query).sort("timestamp", -1).skip(skip).limit(limit)
    events = await cursor.to_list(length=limit)
    return [{"id": str(e["_id"]), **e} for e in events]

# --- Rule Management Functions (Unchanged) ---
async def create_suricata_rule(name: str, rule_content: str, description: Optional[str] = None, enabled: bool = True) -> dict:
    db = get_database()
    rule_doc = {
        "name": name, "rule_content": rule_content, "description": description,
        "enabled": enabled, "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()
    }
    result = await db.suricata_rules.insert_one(rule_doc)
    return {"id": str(result.inserted_id), **rule_doc}

async def get_suricata_rules(enabled_only: bool = False) -> List[dict]:
    db = get_database()
    query = {"enabled": True} if enabled_only else {}
    cursor = db.suricata_rules.find(query).sort("created_at", -1)
    rules = await cursor.to_list(length=None)
    return [{"id": str(r["_id"]), **r} for r in rules]

async def update_suricata_rule(rule_id: str, enabled: Optional[bool] = None, rule_content: Optional[str] = None) -> Optional[dict]:
    db = get_database()
    update_data = {"updated_at": datetime.utcnow()}
    if enabled is not None: update_data["enabled"] = enabled
    if rule_content is not None: update_data["rule_content"] = rule_content
    
    await db.suricata_rules.update_one({"_id": ObjectId(rule_id)}, {"$set": update_data})
    return await db.suricata_rules.find_one({"_id": ObjectId(rule_id)})

async def delete_suricata_rule(rule_id: str) -> bool:
    db = get_database()
    result = await db.suricata_rules.delete_one({"_id": ObjectId(rule_id)})
    return result.deleted_count > 0

# --- Config Management (Unchanged) ---
async def create_suricata_config(config_name: str, config_content: str, description: Optional[str] = None) -> dict:
    db = get_database()
    doc = {"config_name": config_name, "config_content": config_content, "description": description, "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()}
    res = await db.suricata_configs.insert_one(doc)
    return {"id": str(res.inserted_id), **doc}

async def get_suricata_configs() -> List[dict]:
    db = get_database()
    cursor = db.suricata_configs.find({}).sort("created_at", -1)
    configs = await cursor.to_list(length=None)
    return [{"id": str(c["_id"]), **c} for c in configs]

# --- NEW: Real World Windows Integration Functions ---

async def sync_rules_to_disk() -> bool:
    """
    Fetches all ENABLED rules from MongoDB and writes them to the 
    Suricata rules file defined in settings.
    """
    try:
        rules = await get_suricata_rules(enabled_only=True)
        
        # Format rules for the file
        rule_lines = [
            f"# Rule: {rule['name']} (ID: {rule['id']})\n{rule['rule_content']}\n"
            for rule in rules
        ]
        
        file_content = (
            f"# Cloud Shield Auto-Generated Rules - {datetime.utcnow()}\n"
            "# DO NOT EDIT MANUALLY - Changes will be overwritten\n\n"
        ) + "\n".join(rule_lines)

        # Write to disk
        # Ensure directory exists
        os.makedirs(os.path.dirname(settings.SURICATA_RULES_PATH), exist_ok=True)
        
        with open(settings.SURICATA_RULES_PATH, 'w', encoding='utf-8') as f:
            f.write(file_content)
            
        await create_log(
            source="backend",
            log_type="system",
            severity="info",
            message=f"Synced {len(rules)} rules to {settings.SURICATA_RULES_PATH}"
        )
        return True
        
    except Exception as e:
        await create_log(
            source="backend",
            log_type="error",
            severity="error",
            message=f"Failed to sync rules to disk: {str(e)}",
            metadata={"path": settings.SURICATA_RULES_PATH}
        )
        return False

async def reload_suricata() -> dict:
    """
    Reloads Suricata on Native Windows.
    1. Syncs rules from DB to local.rules file.
    2. Restarts the Suricata Windows Service.
    """
    # 1. Sync Rules
    synced = await sync_rules_to_disk()
    if not synced:
        return {
            "status": "error",
            "message": "Failed to sync rules to disk. Aborting reload."
        }

    # 2. Check Platform
    if platform.system() != "Windows":
        return {
            "status": "error",
            "message": "Server is not running on Windows. Cannot restart service."
        }

    # 3. Restart Service
    # Using PowerShell to restart the service. Requires Admin Privileges.
    service_name = settings.SURICATA_SERVICE_NAME
    command = f'powershell -Command "Restart-Service -Name \'{service_name}\' -Force"'
    
    try:
        process = await asyncio.create_subprocess_shell(
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        output = stdout.decode().strip()
        error = stderr.decode().strip()
        
        if process.returncode == 0:
            await create_log(
                source="suricata",
                log_type="reload",
                severity="info",
                message="Suricata service restarted successfully",
                metadata={"action": "service_restart"}
            )
            return {
                "status": "success",
                "message": "Suricata service restarted and rules applied.",
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            await create_log(
                source="suricata",
                log_type="reload",
                severity="error",
                message="Failed to restart Suricata service",
                metadata={"error": error, "command": command}
            )
            return {
                "status": "error",
                "message": f"Service restart failed: {error}",
                "timestamp": datetime.utcnow().isoformat()
            }

    except Exception as e:
        return {
            "status": "error",
            "message": f"Internal error during reload: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }