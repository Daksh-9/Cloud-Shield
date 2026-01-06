"""
ML inference and detection routes.
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query, UploadFile, File
import os 
from app.models.ml_detection import MLInferenceRequest, MLInferenceResponse, MLDetectionResponse
from app.services.ml_service import run_inference, get_detections, get_detection_by_id
from app.middleware.auth import get_current_user
from app.utils.ml_model_loader import get_model_loader, initialize_models

router = APIRouter(prefix="/ml", tags=["machine learning"])


@router.post("/inference", response_model=MLInferenceResponse)
async def ml_inference(
    request: MLInferenceRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Run ML inference on input data.
    """
    try:
        result = await run_inference(
            data=request.data,
            model_name=request.model_name,
            auto_create_alert=request.auto_create_alert
        )
        
        return MLInferenceResponse(
            prediction=result["prediction"],
            confidence=result["confidence"],
            detection_type=result["detection_type"],
            model_name=result["model_name"],
            features=result["features"],
            detection_id=result.get("detection_id"),
            alert_id=result.get("alert_id")
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"ML inference failed: {str(e)}"
        )


@router.post("/inference/from-log/{log_id}", response_model=MLInferenceResponse)
async def ml_inference_from_log(
    log_id: str,
    model_name: Optional[str] = None,
    auto_create_alert: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """
    Run ML inference on a log entry.
    """
    from app.services.log_service import get_log_by_id
    
    log = await get_log_by_id(log_id)
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Log not found"
        )
    
    try:
        result = await run_inference(
            data=log,
            model_name=model_name,
            auto_create_alert=auto_create_alert
        )
        
        # Update detection with log ID
        from app.services.ml_service import update_detection_log
        if result.get("detection_id"):
            await update_detection_log(result["detection_id"], log_id)
            result["related_log_id"] = log_id
        
        return MLInferenceResponse(
            prediction=result["prediction"],
            confidence=result["confidence"],
            detection_type=result["detection_type"],
            model_name=result["model_name"],
            features=result["features"],
            detection_id=result.get("detection_id"),
            alert_id=result.get("alert_id")
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"ML inference failed: {str(e)}"
        )


@router.get("/detections", response_model=list[MLDetectionResponse])
async def list_detections(
    limit: int = Query(default=100, ge=1, le=1000),
    skip: int = Query(default=0, ge=0),
    detection_type: Optional[str] = Query(default=None),
    model_name: Optional[str] = Query(default=None),
    min_confidence: Optional[float] = Query(default=None, ge=0.0, le=1.0),
    current_user: dict = Depends(get_current_user)
):
    """Get ML detection results with optional filtering."""
    detections = await get_detections(
        limit=limit,
        skip=skip,
        detection_type=detection_type,
        model_name=model_name,
        min_confidence=min_confidence
    )
    
    return [
        MLDetectionResponse(
            id=det["id"],
            detection_type=det["detection_type"],
            confidence=det["confidence"],
            prediction=det["prediction"],
            features=det["features"],
            model_name=det["model_name"],
            metadata=det.get("metadata"),
            related_log_id=det.get("related_log_id"),
            related_alert_id=det.get("related_alert_id"),
            created_at=det["created_at"]
        )
        for det in detections
    ]


@router.get("/detections/{detection_id}", response_model=MLDetectionResponse)
async def get_detection(
    detection_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific detection by ID."""
    detection = await get_detection_by_id(detection_id)
    
    if not detection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Detection not found"
        )
    
    return MLDetectionResponse(
        id=detection["id"],
        detection_type=detection["detection_type"],
        confidence=detection["confidence"],
        prediction=detection["prediction"],
        features=detection["features"],
        model_name=detection["model_name"],
        metadata=detection.get("metadata"),
        related_log_id=detection.get("related_log_id"),
        related_alert_id=detection.get("related_alert_id"),
        created_at=detection["created_at"]
    )


@router.get("/models")
async def list_models(current_user: dict = Depends(get_current_user)):
    """List available ML models."""
    loader = get_model_loader()
    models = loader.list_models()
    
    return {
        "models": models,
        "default_model": loader.default_model_name
    }


@router.post("/models/upload")
async def upload_model(
    file: UploadFile = File(...),
    model_name: str = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Upload a new ML model file.
    Note: In production, this should have additional security checks.
    """
    if not file.filename.endswith(('.joblib', '.pkl')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .joblib and .pkl files are supported"
        )
    
    # Use provided name or filename without extension
    if not model_name:
        model_name = os.path.splitext(file.filename)[0]
    
    # Save model file
    models_dir = os.getenv("ML_MODELS_DIR", "models")
    os.makedirs(models_dir, exist_ok=True)
    
    model_path = os.path.join(models_dir, f"{model_name}.joblib")
    
    try:
        with open(model_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Load the model
        loader = get_model_loader()
        loader.load_model(model_name, model_path)
        
        return {
            "status": "success",
            "message": f"Model {model_name} uploaded and loaded successfully",
            "model_name": model_name
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload model: {str(e)}"
        )

