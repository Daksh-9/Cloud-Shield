"""
User settings and preferences models.
"""
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, EmailStr
from bson import ObjectId


class UserPreferences(BaseModel):
    """User preferences schema."""
    theme: str = Field(default="light", description="UI theme: light, dark, auto")
    language: str = Field(default="en", description="Language code")
    timezone: str = Field(default="UTC", description="Timezone")
    date_format: str = Field(default="YYYY-MM-DD", description="Date format")
    time_format: str = Field(default="24h", description="Time format: 12h or 24h")
    items_per_page: int = Field(default=50, ge=10, le=500, description="Items per page")


class NotificationPreferences(BaseModel):
    """Notification preferences schema."""
    email_notifications: bool = Field(default=True, description="Enable email notifications")
    alert_notifications: bool = Field(default=True, description="Notify on new alerts")
    critical_alerts_only: bool = Field(default=False, description="Only notify on critical alerts")
    log_notifications: bool = Field(default=False, description="Notify on new logs")
    ml_detection_notifications: bool = Field(default=True, description="Notify on ML detections")
    suricata_notifications: bool = Field(default=True, description="Notify on Suricata events")
    notification_sound: bool = Field(default=True, description="Play notification sound")
    notification_desktop: bool = Field(default=True, description="Show desktop notifications")


class DashboardPreferences(BaseModel):
    """Dashboard preferences schema."""
    default_view: str = Field(default="overview", description="Default dashboard view")
    show_recent_activity: bool = Field(default=True, description="Show recent activity feed")
    show_statistics: bool = Field(default=True, description="Show statistics cards")
    refresh_interval: int = Field(default=30, ge=5, le=300, description="Auto-refresh interval in seconds")
    chart_type: str = Field(default="line", description="Default chart type: line, bar, pie")


class UserSettingsBase(BaseModel):
    """Base user settings schema."""
    preferences: Optional[UserPreferences] = Field(default_factory=UserPreferences)
    notifications: Optional[NotificationPreferences] = Field(default_factory=NotificationPreferences)
    dashboard: Optional[DashboardPreferences] = Field(default_factory=DashboardPreferences)
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")


class UserSettingsResponse(UserSettingsBase):
    """User settings response schema."""
    user_id: str
    created_at: datetime
    updated_at: datetime


class UserSettingsUpdate(BaseModel):
    """Schema for updating user settings."""
    preferences: Optional[UserPreferences] = None
    notifications: Optional[NotificationPreferences] = None
    dashboard: Optional[DashboardPreferences] = None
    metadata: Optional[Dict[str, Any]] = None


class UserProfileUpdate(BaseModel):
    """Schema for updating user profile."""
    full_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20, description="User phone number")
    department: Optional[str] = Field(None, max_length=100, description="User department")


class PasswordChange(BaseModel):
    """Schema for password change."""
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=100)


class UserActivity(BaseModel):
    """User activity log schema."""
    activity_type: str = Field(..., description="Type of activity: login, logout, password_change, etc.")
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class UserActivityResponse(UserActivity):
    """User activity response schema."""
    id: str
    user_id: str


class UserSession(BaseModel):
    """User session schema."""
    token_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_activity: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None


class UserSessionResponse(UserSession):
    """User session response schema."""
    id: str
    user_id: str