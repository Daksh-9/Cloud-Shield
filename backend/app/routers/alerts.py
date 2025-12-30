"""
Alert creation and querying routes.
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query

from app.models.alert import AlertCreate, AlertUpdate, AlertResponse
from app.services.alert_service import (
    create_alert,
    get_alerts,
    get_alert_by_id,
    update_alert,
    get_alert_count
)
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.post("", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
async def create_new_alert(
    alert_data: AlertCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new alert."""
    alert = await create_alert(
        title=alert_data.title,
        description=alert_data.description,
        severity=alert_data.severity,
        alert_type=alert_data.alert_type,
        source=alert_data.source,
        metadata=alert_data.metadata,
        related_log_ids=alert_data.related_log_ids,
        created_by=current_user["id"]
    )
    
    alert_response = AlertResponse(
        id=alert["id"],
        title=alert["title"],
        description=alert["description"],
        severity=alert["severity"],
        alert_type=alert["alert_type"],
        source=alert["source"],
        metadata=alert["metadata"],
        related_log_ids=alert["related_log_ids"],
        status=alert["status"],
        created_by=alert["created_by"],
        assigned_to=alert["assigned_to"],
        notes=alert["notes"],
        created_at=alert["created_at"],
        updated_at=alert["updated_at"]
    )
    
    # Broadcast to WebSocket clients
    try:
        from app.routers.monitoring import broadcast_new_alert
        await broadcast_new_alert(alert_response.dict())
    except Exception:
        pass  # WebSocket not available
    
    return alert_response


@router.get("", response_model=list[AlertResponse])
async def list_alerts(
    limit: int = Query(default=100, ge=1, le=1000, description="Maximum number of alerts to return"),
    skip: int = Query(default=0, ge=0, description="Number of alerts to skip"),
    status: Optional[str] = Query(default=None, description="Filter by status"),
    severity: Optional[str] = Query(default=None, description="Filter by severity"),
    alert_type: Optional[str] = Query(default=None, description="Filter by alert type"),
    current_user: dict = Depends(get_current_user)
):
    """Get list of alerts with optional filtering."""
    alerts = await get_alerts(
        limit=limit,
        skip=skip,
        status=status,
        severity=severity,
        alert_type=alert_type
    )
    
    return [
        AlertResponse(
            id=alert["id"],
            title=alert["title"],
            description=alert["description"],
            severity=alert["severity"],
            alert_type=alert["alert_type"],
            source=alert["source"],
            metadata=alert["metadata"],
            related_log_ids=alert["related_log_ids"],
            status=alert["status"],
            created_by=alert["created_by"],
            assigned_to=alert["assigned_to"],
            notes=alert["notes"],
            created_at=alert["created_at"],
            updated_at=alert["updated_at"]
        )
        for alert in alerts
    ]


@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert(
    alert_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific alert by ID."""
    alert = await get_alert_by_id(alert_id)
    
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
    
    return AlertResponse(
        id=alert["id"],
        title=alert["title"],
        description=alert["description"],
        severity=alert["severity"],
        alert_type=alert["alert_type"],
        source=alert["source"],
        metadata=alert["metadata"],
        related_log_ids=alert["related_log_ids"],
        status=alert["status"],
        created_by=alert["created_by"],
        assigned_to=alert["assigned_to"],
        notes=alert["notes"],
        created_at=alert["created_at"],
        updated_at=alert["updated_at"]
    )


@router.patch("/{alert_id}", response_model=AlertResponse)
async def update_alert_status(
    alert_id: str,
    alert_update: AlertUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update an alert's status, notes, or assignment."""
    alert = await update_alert(
        alert_id=alert_id,
        status=alert_update.status,
        notes=alert_update.notes,
        assigned_to=alert_update.assigned_to
    )
    
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
    
    return AlertResponse(
        id=alert["id"],
        title=alert["title"],
        description=alert["description"],
        severity=alert["severity"],
        alert_type=alert["alert_type"],
        source=alert["source"],
        metadata=alert["metadata"],
        related_log_ids=alert["related_log_ids"],
        status=alert["status"],
        created_by=alert["created_by"],
        assigned_to=alert["assigned_to"],
        notes=alert["notes"],
        created_at=alert["created_at"],
        updated_at=alert["updated_at"]
    )


@router.get("/stats/count")
async def get_alert_stats(
    status: Optional[str] = Query(default=None),
    severity: Optional[str] = Query(default=None),
    alert_type: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user)
):
    """Get alert count statistics."""
    count = await get_alert_count(
        status=status,
        severity=severity,
        alert_type=alert_type
    )
    
    return {"count": count}

