import asyncio
import os
import subprocess
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId

from app.database.connection import get_database
from app.services.log_service import create_log
from app.config import settings

# --- Event Parsing Functions ---

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

# --- Rule Management Functions ---

async def create_suricata_rule(name: str, rule_content: str, description: Optional[str] = None, enabled: bool = True) -> dict:
    db = get_database()
    rule_doc = {
        "name": name, "rule_content": rule_content, "description": description,
        "enabled": enabled, "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()
    }
    result = await db.suricata_rules.insert_one(rule_doc)
    return {"id": str(result.inserted_id), **rule_doc}

async def get_suricata_rules(enabled_only: bool = False, limit: Optional[int] = None) -> List[dict]:
    db = get_database()
    query = {"enabled": True} if enabled_only else {}
    cursor = db.suricata_rules.find(query).sort("created_at", -1)
    if limit:
        cursor = cursor.limit(limit)
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

# --- Config Management ---

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


# --- Real World Integration Functions ---

async def sync_rules_to_disk() -> bool:
    """
    Fetches all ENABLED rules from MongoDB and writes them to the 
    Suricata rules file defined in settings.
    """
    try:
        rules = await get_suricata_rules(enabled_only=True)
        
        rule_lines = [
            f"# Rule: {rule['name']} (ID: {rule['id']})\n{rule['rule_content']}\n"
            for rule in rules
        ]
        
        file_content = (
            f"# Cloud Shield Auto-Generated Rules - {datetime.utcnow()}\n"
            "# DO NOT EDIT MANUALLY - Changes will be overwritten\n\n"
        ) + "\n".join(rule_lines)

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


# --- NEW: Process Management Variables & Functions ---
_suricata_process: Optional[subprocess.Popen] = None

async def start_suricata_subprocess() -> bool:
    """Spawns Suricata as a child process of the backend using robust Popen."""
    global _suricata_process
    
    print("\n--- [SYSTEM] Attempting to start Suricata Subprocess ---")
    
    # Always sync rules to disk before starting
    await sync_rules_to_disk()
    print(f"--- [SYSTEM] Rules synced to {settings.SURICATA_RULES_PATH} ---")

    # If it's already running, don't start a new one (poll() returns None if running)
    if _suricata_process and _suricata_process.poll() is None:
        print("--- [SYSTEM] Suricata is already running! ---")
        return True 

    # We wrap the paths in double quotes so Windows doesn't get confused by spaces
    shell_cmd = f'"{settings.SURICATA_EXEC_PATH}" -c "{settings.SURICATA_CONFIG_PATH}" -i "{settings.SURICATA_INTERFACE}"'
    print(f"--- [SYSTEM] Executing Command: {shell_cmd} ---")
    
    try:
        # Use synchronous Popen to completely bypass the Windows asyncio bug.
        # We send output to DEVNULL so Windows doesn't freeze the process if the print buffer fills up.
        _suricata_process = subprocess.Popen(
            shell_cmd,
            shell=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        
        success_msg = f"Suricata started successfully as subprocess (PID: {_suricata_process.pid})"
        print(f"\n✅ {success_msg}\n")
        
        await create_log(
            source="suricata", log_type="system", severity="info",
            message=success_msg
        )
        return True
    except Exception as e:
        import traceback
        error_msg = f"Failed to start Suricata subprocess: {repr(e)}"
        print(f"\n❌ [ERROR] {error_msg}")
        traceback.print_exc()
        print("\n")
        
        await create_log(
            source="suricata", log_type="error", severity="error",
            message=error_msg
        )
        return False

async def stop_suricata_subprocess():
    """Gracefully terminates the Suricata child process."""
    global _suricata_process
    
    if _suricata_process and _suricata_process.poll() is None:
        print("\n--- [SYSTEM] Attempting to stop Suricata Subprocess ---")
        try:
            _suricata_process.terminate()
            # Wait up to 5 seconds for a graceful shutdown
            _suricata_process.wait(timeout=5.0)
            print("✅ [SYSTEM] Suricata subprocess terminated gracefully.\n")
            
            await create_log(
                source="suricata", log_type="system", severity="info",
                message="Suricata subprocess terminated gracefully."
            )
        except subprocess.TimeoutExpired:
            # Force kill if it hangs
            _suricata_process.kill()
            _suricata_process.wait()
            print("⚠️ [SYSTEM] Suricata subprocess was force killed.\n")
            
            await create_log(
                source="suricata", log_type="system", severity="warning",
                message="Suricata subprocess was force killed."
            )
        finally:
            _suricata_process = None

async def reload_suricata() -> dict:
    """
    Reloads Suricata by killing the current subprocess and starting a new one.
    """
    print("\n--- [SYSTEM] Reloading Suricata Subprocess ---")
    synced = await sync_rules_to_disk()
    if not synced:
        return {"status": "error", "message": "Failed to sync rules. Aborting reload."}

    try:
        # Stop the existing process
        await stop_suricata_subprocess()
        
        # Start a fresh process
        started = await start_suricata_subprocess()
        
        if started:
            return {
                "status": "success",
                "message": "Suricata subprocess restarted and new rules applied.",
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            return {
                "status": "error",
                "message": "Failed to restart Suricata subprocess.",
                "timestamp": datetime.utcnow().isoformat()
            }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Internal error during reload: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }