"""
ML service for inference and detection result storage.
"""
from typing import Dict, Any, Optional, List
from datetime import datetime
from bson import ObjectId

from app.database.connection import get_database
from app.utils.ml_model_loader import get_model_loader
from app.utils.feature_extractor import FeatureExtractor
from app.models.ml_detection import MLDetectionInDB
from app.services.alert_service import create_alert


async def run_inference(
    data: Dict[str, Any],
    model_name: Optional[str] = None,
    auto_create_alert: bool = False
) -> Dict[str, Any]:
    """
    Run ML inference on input data.
    """
    # Extract features
    features = FeatureExtractor.extract_from_generic(data)
    
    # Get model and make prediction
    loader = get_model_loader()
    
    try:
        # Convert features to vector (returns a Pandas DataFrame for complex models)
        feature_vector = FeatureExtractor.to_feature_vector(features, model_name=model_name)
        
        # Make prediction
        prediction, confidence = loader.predict(feature_vector, model_name)
        
        # Determine detection type based on prediction
        # Strip brackets in case prediction is returned as a formatted string like "[0]"
        prediction_str = str(prediction).lower().replace('[', '').replace(']', '').strip()
        
        # Parse numerical outputs from the model into human-readable classes
        if "benign" in prediction_str or "normal" in prediction_str or prediction_str in ["0", "0.0"]:
            detection_type = "benign"
            prediction_display = "Benign Traffic"
        elif "suspicious" in prediction_str or "anomaly" in prediction_str or "ddos" in prediction_str or prediction_str in ["1", "1.0"]:
            detection_type = "anomaly"
            prediction_display = "DDoS Attack Detected"
        elif "malware" in prediction_str or "virus" in prediction_str:
            detection_type = "malware"
            prediction_display = "Malware Detected"
        elif "intrusion" in prediction_str or "attack" in prediction_str:
            detection_type = "intrusion"
            prediction_display = "Intrusion Attempt"
        else:
            detection_type = "unknown"
            prediction_display = str(prediction).title()
        
        # Store detection result
        detection = await store_detection(
            detection_type=detection_type,
            confidence=float(confidence),
            prediction=prediction_display,
            features=features,
            model_name=model_name or loader.default_model_name or "default"
        )
        
        # Create alert if threat detected and auto_create_alert is True
        alert_id = None
        # Ensure benign and unknown traffic never trigger alerts
        is_threat = detection_type not in ["benign", "unknown"]
        
        if auto_create_alert and confidence > 0.7 and is_threat:
            alert = await create_alert(
                title=f"ML Detection: {prediction_display}",
                description=f"Machine learning model detected {detection_type} with {confidence:.2%} confidence",
                severity="high" if confidence > 0.9 else "medium",
                alert_type=detection_type,
                source="ml_detection",
                metadata={
                    "model_name": model_name or loader.default_model_name,
                    "confidence": confidence,
                    "features": features
                },
                related_log_ids=None
            )
            alert_id = alert["id"]
            
            # Update detection with alert ID
            await update_detection_alert(detection["id"], alert_id)
        
        return {
            "prediction": prediction_display,
            "confidence": float(confidence),
            "detection_type": detection_type,
            "model_name": model_name or loader.default_model_name or "default",
            "features": features,
            "detection_id": detection["id"],
            "alert_id": alert_id
        }
    
    except Exception as e:
        raise Exception(f"ML inference processing failed: {str(e)}")


async def store_detection(
    detection_type: str,
    confidence: float,
    prediction: str,
    features: Dict[str, Any],
    model_name: str,
    metadata: Optional[Dict[str, Any]] = None,
    related_log_id: Optional[str] = None,
    related_alert_id: Optional[str] = None
) -> Dict[str, Any]:
    """Store ML detection result in MongoDB."""
    db = get_database()
    
    detection = MLDetectionInDB(
        detection_type=detection_type,
        confidence=confidence,
        prediction=prediction,
        features=features,
        model_name=model_name,
        metadata=metadata,
        related_log_id=related_log_id,
        related_alert_id=related_alert_id
    )
    
    result = await db.ml_detections.insert_one(detection.to_dict())
    
    return {
        "id": str(result.inserted_id),
        "detection_type": detection.detection_type,
        "confidence": detection.confidence,
        "prediction": detection.prediction,
        "features": detection.features,
        "model_name": detection.model_name,
        "metadata": detection.metadata,
        "related_log_id": detection.related_log_id,
        "related_alert_id": detection.related_alert_id,
        "created_at": detection.created_at
    }


async def update_detection_alert(detection_id: str, alert_id: str):
    """Update detection with related alert ID."""
    db = get_database()
    
    await db.ml_detections.update_one(
        {"_id": ObjectId(detection_id)},
        {"$set": {"related_alert_id": alert_id}}
    )


async def update_detection_log(detection_id: str, log_id: str):
    """Update detection with related log ID."""
    db = get_database()
    
    await db.ml_detections.update_one(
        {"_id": ObjectId(detection_id)},
        {"$set": {"related_log_id": log_id}}
    )


async def get_detections(
    limit: int = 100,
    skip: int = 0,
    detection_type: Optional[str] = None,
    model_name: Optional[str] = None,
    min_confidence: Optional[float] = None
) -> List[Dict[str, Any]]:
    """Get ML detection results with optional filtering."""
    db = get_database()
    
    query = {}
    if detection_type:
        query["detection_type"] = detection_type
    if model_name:
        query["model_name"] = model_name
    if min_confidence is not None:
        query["confidence"] = {"$gte": min_confidence}
    
    cursor = db.ml_detections.find(query).sort("created_at", -1).skip(skip).limit(limit)
    detections = await cursor.to_list(length=limit)
    
    return [
        {
            "id": str(det["_id"]),
            "detection_type": det["detection_type"],
            "confidence": det["confidence"],
            "prediction": det["prediction"],
            "features": det["features"],
            "model_name": det["model_name"],
            "metadata": det.get("metadata", {}),
            "related_log_id": det.get("related_log_id"),
            "related_alert_id": det.get("related_alert_id"),
            "created_at": det.get("created_at")
        }
        for det in detections
    ]


async def get_detection_by_id(detection_id: str) -> Optional[Dict[str, Any]]:
    """Get a specific detection by ID."""
    db = get_database()
    
    try:
        det_doc = await db.ml_detections.find_one({"_id": ObjectId(detection_id)})
        if not det_doc:
            return None
        
        return {
            "id": str(det_doc["_id"]),
            "detection_type": det_doc["detection_type"],
            "confidence": det_doc["confidence"],
            "prediction": det_doc["prediction"],
            "features": det_doc["features"],
            "model_name": det_doc["model_name"],
            "metadata": det_doc.get("metadata", {}),
            "related_log_id": det_doc.get("related_log_id"),
            "related_alert_id": det_doc.get("related_alert_id"),
            "created_at": det_doc.get("created_at")
        }
    except Exception:
        return None