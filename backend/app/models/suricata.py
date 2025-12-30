"""
Suricata event model and schemas.
"""
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
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


class SuricataRuleCreate(SuricataRuleBase):
    """Schema for Suricata rule creation."""
    pass


class SuricataRuleResponse(SuricataRuleBase):
    """Schema for Suricata rule response."""
    id: str
    created_at: datetime
    updated_at: datetime

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

