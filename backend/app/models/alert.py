"""
Comprehensive Alert model for security incident management.
"""
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from bson import ObjectId
from app.models.user import PyObjectId

# --- Nested Schemas ---

class AlertSource(BaseModel):
    ips: List[str] = []
    countries: List[str] = []
    count: int = 0

class AlertTarget(BaseModel):
    ip: str
    port: Optional[int] = None
    service: Optional[str] = None

class AlertMetrics(BaseModel):
    packets_per_sec: float = 0.0
    bytes_per_sec: float = 0.0
    duration_seconds: float = 0.0
    peak_rate: float = 0.0

class AlertAction(BaseModel):
    type: str  # 'ip_blocked', 'rate_limited', 'notification_sent'
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    performed_by: Optional[PyObjectId] = None
    details: Dict[str, Any] = {}

class AlertNote(BaseModel):
    user_id: PyObjectId
    username: str
    text: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

# --- Main Alert Schemas ---

class AlertBase(BaseModel):
    alert_id: str = Field(..., description="Unique ID: ALT-YYYY-MMDD-XXX")
    rule_id: Optional[PyObjectId] = None
    rule_name: str
    severity: str  # 'critical', 'high', 'medium', 'low'
    status: str = "new"  # 'new', 'acknowledged', 'investigating', 'resolved', 'false_positive'
    attack_type: str
    confidence: int = Field(0, ge=0, le=100)
    source: AlertSource = Field(default_factory=AlertSource)
    target: AlertTarget
    metrics: AlertMetrics = Field(default_factory=AlertMetrics)
    detected_by: str  # 'rule_engine', 'ml_model', 'suricata'
    detection_details: Dict[str, Any] = {}

class AlertInDB(AlertBase):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    triggered_at: datetime = Field(default_factory=datetime.utcnow)
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[PyObjectId] = None
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[PyObjectId] = None
    actions: List[AlertAction] = []
    notes: List[AlertNote] = []
    related_logs: List[PyObjectId] = []
    related_alerts: List[PyObjectId] = []
    incident_id: Optional[PyObjectId] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}