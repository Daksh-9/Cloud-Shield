"""
Alert model and schemas for security incident management.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from bson import ObjectId
from app.models.user import PyObjectId

# --- Pydantic Schemas for API ---

class AlertCreate(BaseModel):
    """Schema for creating a new alert."""
    title: str
    description: str
    severity: str
    alert_type: str
    source: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    related_log_ids: Optional[List[str]] = None

class AlertUpdate(BaseModel):
    """Schema for updating an alert."""
    status: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None

class AlertResponse(BaseModel):
    """Schema for alert response."""
    id: str = Field(alias="_id")
    title: str
    description: str
    severity: str
    alert_type: str
    source: Optional[str] = None
    metadata: Dict[str, Any] = {}
    related_log_ids: List[str] = []
    status: str
    created_by: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        json_encoders={ObjectId: str}
    )

# --- Database Model ---

class AlertInDB:
    """
    Database model for Alert.
    Matches the usage in app/services/alert_service.py
    """
    def __init__(
        self, 
        title: str, 
        description: str, 
        severity: str, 
        alert_type: str, 
        source: Optional[str] = None, 
        metadata: Optional[Dict[str, Any]] = None, 
        related_log_ids: Optional[List[str]] = None, 
        created_by: Optional[str] = None
    ):
        self.title = title
        self.description = description
        self.severity = severity
        self.alert_type = alert_type
        self.source = source
        self.metadata = metadata or {}
        self.related_log_ids = related_log_ids or []
        self.created_by = created_by
        
        # Default fields
        self.status = "open"
        self.assigned_to = None
        self.notes = None
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()

    def to_dict(self):
        """Convert object to dictionary for MongoDB insertion."""
        return {
            "title": self.title,
            "description": self.description,
            "severity": self.severity,
            "alert_type": self.alert_type,
            "source": self.source,
            "metadata": self.metadata,
            "related_log_ids": self.related_log_ids,
            "created_by": self.created_by,
            "status": self.status,
            "assigned_to": self.assigned_to,
            "notes": self.notes,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }