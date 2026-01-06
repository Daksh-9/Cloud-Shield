"""
Log model and schemas for security event and audit logging.
"""
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from bson import ObjectId

class LogBase(BaseModel):
    """Base log schema."""
    source: str = Field(..., description="Source (e.g., 'firewall', 'application')")
    log_type: str = Field(..., description="Type of log event")
    severity: str = Field(..., description="Severity level: info, warning, error, critical")
    message: str = Field(..., description="Log message")
    action: Optional[str] = Field(None, description="Action performed (e.g., FILE_UPLOAD)")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata")

class LogCreate(LogBase):
    """Schema for log creation."""
    timestamp: Optional[datetime] = Field(default=None)
    user_id: Optional[str] = None
    target_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class LogResponse(LogBase):
    """Schema for log response."""
    id: str
    timestamp: datetime
    user_id: Optional[str]
    target_id: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class LogInDB:
    """Log document structure in MongoDB with audit logging support."""
    def __init__(
        self,
        source: str,
        log_type: str,
        severity: str,
        message: str,
        action: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        timestamp: Optional[datetime] = None,
        user_id: Optional[str] = None,
        target_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        self._id = ObjectId()
        self.source = source
        self.log_type = log_type
        self.severity = severity
        self.message = message
        self.action = action
        self.metadata = metadata or {}
        self.timestamp = timestamp or datetime.utcnow()
        self.user_id = ObjectId(user_id) if user_id else None
        self.target_id = ObjectId(target_id) if target_id else None
        self.ip_address = ip_address
        self.user_agent = user_agent
        self.created_at = datetime.utcnow()

    def to_dict(self):
        """Convert to dictionary for MongoDB."""
        return {
            "_id": self._id,
            "source": self.source,
            "log_type": self.log_type,
            "severity": self.severity,
            "message": self.message,
            "action": self.action,
            "metadata": self.metadata,
            "timestamp": self.timestamp,
            "user_id": self.user_id,
            "target_id": self.target_id,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
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
        log.action = data.get("action")
        log.metadata = data.get("metadata", {})
        log.timestamp = data.get("timestamp", datetime.utcnow())
        log.user_id = data.get("user_id")
        log.target_id = data.get("target_id")
        log.ip_address = data.get("ip_address")
        log.user_agent = data.get("user_agent")
        log.created_at = data.get("created_at", datetime.utcnow())
        return log