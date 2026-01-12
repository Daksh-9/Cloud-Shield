"""
Log Source model for configuring external log ingestion.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from bson import ObjectId
from app.models.user import PyObjectId

# --- Nested Schemas ---

class LogSourceAuth(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None  # Should be encrypted before storage
    api_key: Optional[str] = None

class LogSourceConfig(BaseModel):
    log_format: str = "syslog"  # 'json', 'syslog', 'custom'
    parser: Optional[str] = None
    polling_interval: int = 60  # seconds

class LogSourceHealth(BaseModel):
    last_seen: Optional[datetime] = None
    logs_per_second: float = 0.0
    error_count: int = 0
    uptime_percentage: float = 100.0

# --- Main Log Source Schemas ---

class LogSourceBase(BaseModel):
    name: str
    type: str = Field(..., description="'cloud_vm', 'firewall', 'load_balancer', 'suricata'")
    host: str
    port: Optional[int] = None
    protocol: str = "syslog"  # 'syslog', 'http', 'agent'
    status: str = "active"  # 'active', 'inactive', 'error'
    config: LogSourceConfig = Field(default_factory=LogSourceConfig)

class LogSourceCreate(LogSourceBase):
    auth: Optional[LogSourceAuth] = None

class LogSourceInDB(LogSourceBase):
    """Log Source document structure in MongoDB."""
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    auth: Optional[LogSourceAuth] = None
    health: LogSourceHealth = Field(default_factory=LogSourceHealth)
    created_by: Optional[PyObjectId] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}