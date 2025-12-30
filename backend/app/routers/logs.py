"""
Log ingestion and querying routes.
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query

from app.models.log import LogCreate, LogResponse
from app.services.log_service import create_log, get_logs, get_log_by_id, get_log_count
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/logs", tags=["logs"])


@router.post("", response_model=LogResponse, status_code=status.HTTP_201_CREATED)
async def ingest_log(
    log_data: LogCreate,
    current_user: dict = Depends(get_current_user)
):
    """Ingest a new log entry."""
    log = await create_log(
        source=log_data.source,
        log_type=log_data.log_type,
        severity=log_data.severity,
        message=log_data.message,
        metadata=log_data.metadata,
        timestamp=log_data.timestamp,
        user_id=current_user["id"]
    )
    
    log_response = LogResponse(
        id=log["id"],
        source=log["source"],
        log_type=log["log_type"],
        severity=log["severity"],
        message=log["message"],
        metadata=log["metadata"],
        timestamp=log["timestamp"],
        created_at=log["created_at"]
    )
    
    # Broadcast to WebSocket clients
    try:
        from app.routers.monitoring import broadcast_new_log
        await broadcast_new_log(log_response.dict())
    except Exception:
        pass  # WebSocket not available
    
    return log_response


@router.get("", response_model=list[LogResponse])
async def list_logs(
    limit: int = Query(default=100, ge=1, le=1000, description="Maximum number of logs to return"),
    skip: int = Query(default=0, ge=0, description="Number of logs to skip"),
    source: Optional[str] = Query(default=None, description="Filter by source"),
    severity: Optional[str] = Query(default=None, description="Filter by severity"),
    log_type: Optional[str] = Query(default=None, description="Filter by log type"),
    current_user: dict = Depends(get_current_user)
):
    """Get list of logs with optional filtering."""
    logs = await get_logs(
        limit=limit,
        skip=skip,
        source=source,
        severity=severity,
        log_type=log_type
    )
    
    return [
        LogResponse(
            id=log["id"],
            source=log["source"],
            log_type=log["log_type"],
            severity=log["severity"],
            message=log["message"],
            metadata=log["metadata"],
            timestamp=log["timestamp"],
            created_at=log["created_at"]
        )
        for log in logs
    ]


@router.get("/{log_id}", response_model=LogResponse)
async def get_log(
    log_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific log by ID."""
    log = await get_log_by_id(log_id)
    
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Log not found"
        )
    
    return LogResponse(
        id=log["id"],
        source=log["source"],
        log_type=log["log_type"],
        severity=log["severity"],
        message=log["message"],
        metadata=log["metadata"],
        timestamp=log["timestamp"],
        created_at=log["created_at"]
    )


@router.get("/stats/count")
async def get_log_stats(
    source: Optional[str] = Query(default=None),
    severity: Optional[str] = Query(default=None),
    log_type: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user)
):
    """Get log count statistics."""
    count = await get_log_count(
        source=source,
        severity=severity,
        log_type=log_type
    )
    
    return {"count": count}

