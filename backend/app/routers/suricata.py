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
    
    # 1. Format the event for MongoDB
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
    
    # 2. Insert into database
    result = await db.suricata_events.insert_one(document)
    
    # 3. Format response for real-time broadcast
    broadcast_payload = {
        "id": str(result.inserted_id),
        "event_type": event_type,
        "timestamp": timestamp.isoformat(),
        "raw_event": event_data
    }
    
    # 4. Broadcast to WebSocket clients
    background_tasks.add_task(
        broadcast_event,
        {
            "type": "LOG_UPDATE", 
            "payload": {
                 "id": broadcast_payload["id"],
                 "severity": event_type.lower(), 
                 "message": f"Suricata {event_type.upper()}: {event_data.get('src_ip', 'Unknown')} -> {event_data.get('dest_ip', 'Unknown')}",
                 "timestamp": broadcast_payload["timestamp"],
                 "raw_event": event_data, 
                 "event_type": event_type
            }
        }
    )
    
    return {"status": "success", "id": str(result.inserted_id)}


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