"""
ML detection results model and schemas.
"""
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from bson import ObjectId


class MLDetectionBase(BaseModel):
    """Base ML detection schema."""
    detection_type: str = Field(..., description="Type of detection (e.g., 'anomaly', 'intrusion', 'malware')")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score (0.0 to 1.0)")
    prediction: str = Field(..., description="ML model prediction/classification")
    features: Dict[str, Any] = Field(..., description="Extracted features used for prediction")
    model_name: str = Field(..., description="Name/version of the ML model used")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata")


class MLDetectionCreate(MLDetectionBase):
    """Schema for ML detection creation."""
    related_log_id: Optional[str] = Field(default=None, description="Related log entry ID")
    related_alert_id: Optional[str] = Field(default=None, description="Related alert ID")


class MLDetectionResponse(MLDetectionBase):
    """Schema for ML detection response."""
    id: str
    related_log_id: Optional[str]
    related_alert_id: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class MLInferenceRequest(BaseModel):
    """Schema for ML inference request."""
    data: Dict[str, Any] = Field(..., description="Input data for feature extraction")
    model_name: Optional[str] = Field(default=None, description="Specific model to use (optional)")
    auto_create_alert: bool = Field(default=False, description="Automatically create alert if threat detected")


class MLInferenceResponse(BaseModel):
    """Schema for ML inference response."""
    prediction: str
    confidence: float
    detection_type: str
    model_name: str
    features: Dict[str, Any]
    detection_id: Optional[str] = None
    alert_id: Optional[str] = None


class MLDetectionInDB:
    """ML detection document structure in MongoDB."""
    def __init__(
        self,
        detection_type: str,
        confidence: float,
        prediction: str,
        features: Dict[str, Any],
        model_name: str,
        metadata: Optional[Dict[str, Any]] = None,
        related_log_id: Optional[str] = None,
        related_alert_id: Optional[str] = None
    ):
        self._id = ObjectId()
        self.detection_type = detection_type
        self.confidence = confidence
        self.prediction = prediction
        self.features = features
        self.model_name = model_name
        self.metadata = metadata or {}
        self.related_log_id = related_log_id
        self.related_alert_id = related_alert_id
        self.created_at = datetime.utcnow()

    def to_dict(self):
        """Convert to dictionary for MongoDB."""
        return {
            "_id": self._id,
            "detection_type": self.detection_type,
            "confidence": self.confidence,
            "prediction": self.prediction,
            "features": self.features,
            "model_name": self.model_name,
            "metadata": self.metadata,
            "related_log_id": self.related_log_id,
            "related_alert_id": self.related_alert_id,
            "created_at": self.created_at
        }

    @classmethod
    def from_dict(cls, data: dict):
        """Create MLDetectionInDB from MongoDB document."""
        detection = cls.__new__(cls)
        detection._id = data["_id"]
        detection.detection_type = data["detection_type"]
        detection.confidence = data["confidence"]
        detection.prediction = data["prediction"]
        detection.features = data["features"]
        detection.model_name = data["model_name"]
        detection.metadata = data.get("metadata", {})
        detection.related_log_id = data.get("related_log_id")
        detection.related_alert_id = data.get("related_alert_id")
        detection.created_at = data.get("created_at", datetime.utcnow())
        return detection

