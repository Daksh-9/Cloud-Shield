"""
Rule history model for tracking rule changes.
"""
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from bson import ObjectId


class RuleHistoryBase(BaseModel):
    """Base rule history schema."""
    rule_id: Optional[str] = Field(None, description="MongoDB rule ID if applicable")
    rule_content: str = Field(..., description="Rule content")
    action: str = Field(..., description="Action: created, updated, deleted, enabled, disabled")
    file_path: str = Field(..., description="Path to rules file")
    line_number: Optional[int] = Field(None, description="Line number in file")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata")


class RuleHistoryCreate(RuleHistoryBase):
    """Schema for creating rule history entry."""
    user_id: Optional[str] = Field(None, description="User who made the change")


class RuleHistoryResponse(RuleHistoryBase):
    """Schema for rule history response."""
    id: str
    user_id: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
