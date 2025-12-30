"""
Alert model and schemas for security alerts.
"""
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from bson import ObjectId


class AlertBase(BaseModel):
    """Base alert schema."""
    title: str = Field(..., min_length=1, max_length=200, description="Alert title")
    description: str = Field(..., description="Alert description")
    severity: str = Field(..., description="Severity level: low, medium, high, critical")
    alert_type: str = Field(..., description="Type of alert (e.g., 'intrusion', 'malware', 'anomaly')")
    source: Optional[str] = Field(default=None, description="Source of the alert")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata")
    related_log_ids: Optional[List[str]] = Field(default=None, description="Related log entry IDs")


class AlertCreate(AlertBase):
    """Schema for alert creation."""
    pass


class AlertUpdate(BaseModel):
    """Schema for alert updates."""
    status: Optional[str] = Field(default=None, description="Alert status: open, investigating, resolved, false_positive")
    notes: Optional[str] = Field(default=None, description="Additional notes")
    assigned_to: Optional[str] = Field(default=None, description="User ID assigned to handle the alert")


class AlertResponse(AlertBase):
    """Schema for alert response."""
    id: str
    status: str
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str]
    assigned_to: Optional[str]
    notes: Optional[str]

    class Config:
        from_attributes = True


class AlertInDB:
    """Alert document structure in MongoDB."""
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
        self._id = ObjectId()
        self.title = title
        self.description = description
        self.severity = severity
        self.alert_type = alert_type
        self.source = source
        self.metadata = metadata or {}
        self.related_log_ids = related_log_ids or []
        self.status = "open"
        self.created_by = created_by
        self.assigned_to = None
        self.notes = None
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()

    def to_dict(self):
        """Convert to dictionary for MongoDB."""
        return {
            "_id": self._id,
            "title": self.title,
            "description": self.description,
            "severity": self.severity,
            "alert_type": self.alert_type,
            "source": self.source,
            "metadata": self.metadata,
            "related_log_ids": self.related_log_ids,
            "status": self.status,
            "created_by": self.created_by,
            "assigned_to": self.assigned_to,
            "notes": self.notes,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }

    @classmethod
    def from_dict(cls, data: dict):
        """Create AlertInDB from MongoDB document."""
        alert = cls.__new__(cls)
        alert._id = data["_id"]
        alert.title = data["title"]
        alert.description = data["description"]
        alert.severity = data["severity"]
        alert.alert_type = data["alert_type"]
        alert.source = data.get("source")
        alert.metadata = data.get("metadata", {})
        alert.related_log_ids = data.get("related_log_ids", [])
        alert.status = data.get("status", "open")
        alert.created_by = data.get("created_by")
        alert.assigned_to = data.get("assigned_to")
        alert.notes = data.get("notes")
        alert.created_at = data.get("created_at", datetime.utcnow())
        alert.updated_at = data.get("updated_at", datetime.utcnow())
        return alert

