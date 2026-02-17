"""
Suricata event model and schemas.
"""
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, validator
from bson import ObjectId


class SuricataEventBase(BaseModel):
    """Base Suricata event schema."""
    event_type: str = Field(..., description="Type of Suricata event (alert, flow, etc.)")
    timestamp: datetime = Field(..., description="Event timestamp")
    raw_event: Dict[str, Any] = Field(..., description="Raw EVE JSON event data")


class SuricataEventCreate(SuricataEventBase):
    """Schema for Suricata event creation."""
    pass


class SuricataEventResponse(SuricataEventBase):
    """Schema for Suricata event response."""
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class SuricataRuleBase(BaseModel):
    """Base Suricata rule schema."""
    name: str = Field(..., min_length=1, max_length=200)
    rule_content: str = Field(..., description="Suricata rule content")
    description: Optional[str] = Field(default=None)
    enabled: bool = Field(default=True)
    
    # --- NEW: Severity Field ---
    severity: str = Field(
        default="medium",
        description="Rule severity: low, medium, high, zero_trust"
    )

    @validator("severity")
    def validate_severity(cls, v):
        allowed = ["low", "medium", "high", "zero_trust"]
        if v not in allowed:
            raise ValueError(f"Severity must be one of: {', '.join(allowed)}")
        return v


class SuricataRuleCreate(SuricataRuleBase):
    """Schema for Suricata rule creation."""
    # --- NEW: Auto-capture fields are handled by backend, but schema allows input ---
    pass


# --- NEW: Schema for Rule Upload ---
class SuricataRuleUpload(BaseModel):
    filename: str
    uploaded_by: str
    rule_count: int
    created_at: datetime


class SuricataRuleResponse(SuricataRuleBase):
    """Schema for Suricata rule response."""
    id: str
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None  # --- NEW: Track creator ---

    class Config:
        from_attributes = True


class SuricataConfigBase(BaseModel):
    """Base Suricata config schema."""
    config_name: str = Field(..., min_length=1, max_length=200)
    config_content: str = Field(..., description="Suricata configuration content")
    description: Optional[str] = Field(default=None)


class SuricataConfigCreate(SuricataConfigBase):
    """Schema for Suricata config creation."""
    pass


class SuricataConfigResponse(SuricataConfigBase):
    """Schema for Suricata config response."""
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True