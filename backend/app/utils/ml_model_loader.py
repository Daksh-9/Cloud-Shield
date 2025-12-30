"""
ML model loader for joblib serialized models.
"""
import os
import joblib
from typing import Optional, Dict, Any
from pathlib import Path

from app.config import settings


class MLModelLoader:
    """Load and manage ML models from joblib files."""
    
    def __init__(self, models_dir: str = "models"):
        """
        Initialize model loader.
        
        Args:
            models_dir: Directory containing model files
        """
        self.models_dir = Path(models_dir)
        self.models: Dict[str, Any] = {}
        self.default_model_name: Optional[str] = None
    
    def load_model(self, model_name: str, model_path: Optional[str] = None) -> Any:
        """
        Load a model from a joblib file.
        
        Args:
            model_name: Name identifier for the model
            model_path: Path to the model file (if None, looks in models_dir)
        
        Returns:
            Loaded model object
        """
        if model_name in self.models:
            return self.models[model_name]
        
        if model_path is None:
            # Look for model in models directory
            model_file = self.models_dir / f"{model_name}.joblib"
            if not model_file.exists():
                # Try with .pkl extension
                model_file = self.models_dir / f"{model_name}.pkl"
            if not model_file.exists():
                raise FileNotFoundError(f"Model file not found: {model_name}")
            model_path = str(model_file)
        
        try:
            model = joblib.load(model_path)
            self.models[model_name] = model
            print(f"✓ Loaded ML model: {model_name}")
            return model
        except Exception as e:
            raise Exception(f"Failed to load model {model_name}: {str(e)}")
    
    def get_model(self, model_name: Optional[str] = None) -> Any:
        """
        Get a loaded model.
        
        Args:
            model_name: Name of the model (uses default if None)
        
        Returns:
            Model object
        """
        if model_name is None:
            model_name = self.default_model_name
        
        if model_name is None:
            # Try to use first available model
            if self.models:
                model_name = list(self.models.keys())[0]
            else:
                raise ValueError("No model loaded and no default model specified")
        
        if model_name not in self.models:
            raise ValueError(f"Model {model_name} not loaded. Call load_model() first.")
        
        return self.models[model_name]
    
    def set_default_model(self, model_name: str):
        """Set the default model to use."""
        if model_name not in self.models:
            raise ValueError(f"Model {model_name} not loaded")
        self.default_model_name = model_name
    
    def list_models(self) -> list:
        """List all loaded models."""
        return list(self.models.keys())
    
    def predict(self, features: Any, model_name: Optional[str] = None) -> tuple:
        """
        Make a prediction using the specified model.
        
        Args:
            features: Feature vector/array for prediction
            model_name: Name of model to use (uses default if None)
        
        Returns:
            Tuple of (prediction, confidence/probability)
        """
        model = self.get_model(model_name)
        
        # Ensure features is a numpy array
        import numpy as np
        if not isinstance(features, np.ndarray):
            features = np.array(features)
        
        # Reshape if needed (for single sample)
        if len(features.shape) == 1:
            features = features.reshape(1, -1)
        
        # Make prediction
        prediction = model.predict(features)[0]
        
        # Try to get prediction probability/confidence
        confidence = 0.5  # Default confidence
        if hasattr(model, "predict_proba"):
            try:
                proba = model.predict_proba(features)[0]
                confidence = float(max(proba))  # Use max probability as confidence
            except:
                pass
        elif hasattr(model, "decision_function"):
            try:
                decision = model.decision_function(features)[0]
                # Normalize decision function to 0-1 range (simple sigmoid approximation)
                confidence = float(1 / (1 + np.exp(-decision)))
            except:
                pass
        
        return prediction, confidence


# Global model loader instance
_model_loader: Optional[MLModelLoader] = None


def get_model_loader() -> MLModelLoader:
    """Get or create the global model loader instance."""
    global _model_loader
    if _model_loader is None:
        models_dir = os.getenv("ML_MODELS_DIR", "models")
        _model_loader = MLModelLoader(models_dir=models_dir)
    return _model_loader


def initialize_models():
    """Initialize default models on startup."""
    loader = get_model_loader()
    
    # Try to load default model if it exists
    default_model = os.getenv("ML_DEFAULT_MODEL", "threat_detection")
    models_dir = os.getenv("ML_MODELS_DIR", "models")
    
    model_path = Path(models_dir) / f"{default_model}.joblib"
    if not model_path.exists():
        model_path = Path(models_dir) / f"{default_model}.pkl"
    
    if model_path.exists():
        try:
            loader.load_model(default_model, str(model_path))
            loader.set_default_model(default_model)
            print(f"✓ Initialized default ML model: {default_model}")
        except Exception as e:
            print(f"⚠ Failed to load default ML model: {e}")
    else:
        print(f"⚠ Default ML model not found at {model_path}. ML features will be limited.")

