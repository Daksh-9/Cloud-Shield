"""
Suricata integration and management routes.
"""
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, status, Query, BackgroundTasks, Body
from datetime import datetime

# UPDATED IMPORTS to match the new function names in suricata_service.py
from app.services.suricata_service import (
    start_suricata_subprocess,
    stop_suricata_subprocess,
    reload_suricata
)
from app.database.connection import get_database
from app.services.realtime import broadcast_event

# 🟢 IMPORT THE ALERT SERVICE
from app.services.alert_service import create_alert

router = APIRouter(prefix="/suricata", tags=["suricata"])

@router.get("/status")
async def check_status():
    """Get Suricata engine status."""
    # We return a generic 'running' or 'stopped' based on if the subprocess exists.
    # In a full implementation, you might want to query Suricata's UNIX socket.
    from app.services.suricata_service import _suricata_process
    is_running = _suricata_process is not None and _suricata_process.poll() is None
    return {"status": "active" if is_running else "inactive"}

@router.post("/start")
async def start_engine():
    """Start Suricata engine."""
    success = await start_suricata_subprocess()
    if not success:
        raise HTTPException(status_code=500, detail="Failed to start Suricata subprocess")
    return {"status": "success", "message": "Suricata subprocess started"}

@router.post("/stop")
async def stop_engine():
    """Stop Suricata engine."""
    await stop_suricata_subprocess()
    return {"status": "success", "message": "Suricata subprocess stopped"}

@router.post("/reload")
async def reload_engine():
    """Reload Suricata engine with new rules."""
    result = await reload_suricata()
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])
    return result

@router.post("/events", status_code=status.HTTP_201_CREATED)
async def ingest_suricata_event(
    event_data: Dict[str, Any] = Body(...),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    Ingest a raw Suricata EVE JSON event.
    Called heavily by the suricata_shipper.py script.
    """
    db = get_database()
    
    event_type = event_data.get("event_type", "unknown")
    timestamp_str = event_data.get("timestamp")
    
    try:
        if timestamp_str:
             timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        else:
             timestamp = datetime.utcnow()
    except ValueError:
        timestamp = datetime.utcnow()

    document = {
        "event_type": event_type,
        "timestamp": timestamp,
        "raw_event": event_data,
        "created_at": datetime.utcnow()
    }
    
    # 1. Insert the raw event into the logs database
    result = await db.suricata_events.insert_one(document)
    log_id = str(result.inserted_id)
    
    # 2. SEPARATE LOGIC: Is it an Alert or just Traffic?
    if event_type == "alert":
        alert_info = event_data.get("alert", {})
        
        # Suricata severity is usually 1 (High) to 4 (Low). Let's map it to your Dashboard's string severities.
        suri_sev = alert_info.get("severity", 3)
        if suri_sev == 1:
            severity = "critical"
        elif suri_sev == 2:
            severity = "high"
        elif suri_sev == 3:
            severity = "medium"
        else:
            severity = "low"

        # 🟢 Trigger the alert_service, which handles DB insertion AND broadcasts the ALERT_NEW WebSocket event
        await create_alert(
            title=alert_info.get("signature", "Unknown Suricata Alert"),
            description=f"Category: {alert_info.get('category', 'Uncategorized')}",
            severity=severity,
            alert_type="suricata",
            source="Suricata NIDS",
            metadata={
                "src_ip": event_data.get("src_ip", "Unknown"),
                "dest_ip": event_data.get("dest_ip", "Unknown"),
                "dest_port": event_data.get("dest_port"),
                "signature_id": alert_info.get("signature_id")
            },
            related_log_ids=[log_id]
        )
    else:
        # It's just a normal flow, DNS, or TLS log. Broadcast as a standard LOG_UPDATE for the raw event stream.
        background_tasks.add_task(
            broadcast_event,
            {
                "type": "LOG_UPDATE", 
                "payload": {
                     "id": log_id,
                     "severity": "info", 
                     "message": f"Suricata {event_type.upper()}: {event_data.get('src_ip', 'Unknown')} -> {event_data.get('dest_ip', 'Unknown')}",
                     "timestamp": timestamp.isoformat(),
                     "raw_event": event_data, 
                     "event_type": event_type
                }
            }
        )
    
    return {"status": "success", "id": log_id}


@router.get("/events")
async def list_suricata_events(
    limit: int = Query(default=100, ge=1, le=1000),
    skip: int = Query(default=0, ge=0),
    event_type: Optional[str] = Query(default=None)
):
    """Retrieve historical Suricata events."""
    db = get_database()
    
    query = {}
    if event_type:
        query["event_type"] = event_type
        
    cursor = db.suricata_events.find(query).sort("timestamp", -1).skip(skip).limit(limit)
    events = await cursor.to_list(length=limit)
    
    # Format for JSON response
    formatted_events = []
    for e in events:
        e["id"] = str(e.pop("_id"))
        if isinstance(e.get("timestamp"), datetime):
            e["timestamp"] = e["timestamp"].isoformat()
        if isinstance(e.get("created_at"), datetime):
            e["created_at"] = e["created_at"].isoformat()
        formatted_events.append(e)
        
    return formatted_events