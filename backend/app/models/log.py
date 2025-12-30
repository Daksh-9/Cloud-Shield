"""
Log model and schemas for security event logging.
"""
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from bson import ObjectId


class LogBase(BaseModel):
    """Base log schema."""
    source: str = Field(..., description="Source of the log (e.g., 'firewall', 'ids', 'application')")
    log_type: str = Field(..., description="Type of log event")
    severity: str = Field(..., description="Severity level: info, warning, error, critical")
    message: str = Field(..., description="Log message")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata")


class LogCreate(LogBase):
    """Schema for log creation."""
    timestamp: Optional[datetime] = Field(default=None, description="Log timestamp (defaults to now)")


class LogResponse(LogBase):
    """Schema for log response."""
    id: str
    timestamp: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class LogInDB:
    """Log document structure in MongoDB."""
    def __init__(
        self,
        source: str,
        log_type: str,
        severity: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None,
        timestamp: Optional[datetime] = None,
        user_id: Optional[str] = None
    ):
        self._id = ObjectId()
        self.source = source
        self.log_type = log_type
        self.severity = severity
        self.message = message
        self.metadata = metadata or {}
        self.timestamp = timestamp or datetime.utcnow()
        self.user_id = user_id
        self.created_at = datetime.utcnow()

    def to_dict(self):
        """Convert to dictionary for MongoDB."""
        return {
            "_id": self._id,
            "source": self.source,
            "log_type": self.log_type,
            "severity": self.severity,
            "message": self.message,
            "metadata": self.metadata,
            "timestamp": self.timestamp,
            "user_id": self.user_id,
            "created_at": self.created_at
        }

    @classmethod
    def from_dict(cls, data: dict):
        """Create LogInDB from MongoDB document."""
        log = cls.__new__(cls)
        log._id = data["_id"]
        log.source = data["source"]
        log.log_type = data["log_type"]
        log.severity = data["severity"]
        log.message = data["message"]
        log.metadata = data.get("metadata", {})
        log.timestamp = data.get("timestamp", datetime.utcnow())
        log.user_id = data.get("user_id")
        log.created_at = data.get("created_at", datetime.utcnow())
        return log

