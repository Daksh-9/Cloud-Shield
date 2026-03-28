"""
ML model loader for joblib serialized models.
"""
import os
import joblib
from typing import Optional, Dict, Any
from pathlib import Path

import numpy as np
import sys

# Set numpy print options to avoid legacy warnings and ensure float formatting
np.set_printoptions(legacy='1.25')

class MLModelLoader:
    """Load and manage ML models from joblib files."""
    
    def __init__(self, models_dir: str = "models"):
        self.models_dir = Path(models_dir)
        self.models: Dict[str, Any] = {}
        self.default_model_name: Optional[str] = None
        
        # Create models directory if it doesn't exist
        os.makedirs(models_dir, exist_ok=True)
    
    def load_model(self, model_name: str, model_path: Optional[str] = None) -> Any:
        if model_name in self.models:
            return self.models[model_name]
        
        if model_path is None:
            model_file = self.models_dir / f"{model_name}.joblib"
            if not model_file.exists():
                model_file = self.models_dir / f"{model_name}.pkl"
            if not model_file.exists():
                raise FileNotFoundError(f"Model file not found: {model_name}")
            model_path = str(model_file)
        
        try:
            raw_model = joblib.load(model_path)
            
            # --- Handle models saved inside dictionaries ---
            if isinstance(raw_model, dict):
                print(f"ℹ️ Model '{model_name}' is a dictionary. Searching for the predictor...")
                possible_keys = ['model', 'pipeline', 'clf', 'classifier', 'random_forest', 'xgb']
                model = None
                
                for key in possible_keys:
                    if key in raw_model and hasattr(raw_model[key], 'predict'):
                        model = raw_model[key]
                        print(f"✓ Found model under key: '{key}'")
                        break
                
                if model is None:
                    for k, v in raw_model.items():
                        if hasattr(v, 'predict'):
                            model = v
                            print(f"✓ Found model under key: '{k}'")
                            break
                            
                if model is None:
                    raise ValueError(f"Could not find an object with a '.predict()' method inside the dictionary. Keys found: {list(raw_model.keys())}")
            else:
                model = raw_model
                
            self.models[model_name] = model
            print(f"✓ Successfully Loaded ML predictor for: {model_name}")
            
            # Set as default if it's the first model loaded
            if self.default_model_name is None:
                self.default_model_name = model_name
                print(f"✓ Set {model_name} as default model")
                
            return model
        except Exception as e:
            print(f"❌ Failed to load model {model_name}: {str(e)}")
            raise Exception(f"Failed to load model {model_name}: {str(e)}")
    
    def get_model(self, model_name: Optional[str] = None) -> Any:
        if not model_name:
            model_name = self.default_model_name
            
        if not model_name or model_name not in self.models:
            raise ValueError("No model loaded and no default model specified")
            
        return self.models[model_name]
    
    def list_models(self) -> list:
        return list(self.models.keys())
    
    def predict(self, features: Any, model_name: Optional[str] = None) -> tuple:
        """Make a prediction using the specified model."""
        model = self.get_model(model_name)
        
        # Keep features as a pandas DataFrame if it already is one
        is_df = False
        try:
            import pandas as pd
            if isinstance(features, pd.DataFrame):
                is_df = True
        except ImportError:
            pass
            
        if not is_df:
            import numpy as np
            if not isinstance(features, np.ndarray):
                features = np.array(features)
            if len(features.shape) == 1:
                features = features.reshape(1, -1)
                
        try:
            prediction = model.predict(features)[0]
            
            # Clean up numpy array predictions
            import numpy as np
            if isinstance(prediction, (list, np.ndarray)):
                prediction = prediction[0]
                
            confidence = 0.5  # Default confidence
            
            if hasattr(model, "predict_proba"):
                proba = model.predict_proba(features)[0]
                confidence = float(max(proba))
            elif hasattr(model, "decision_function"):
                decision = model.decision_function(features)[0]
                confidence = float(1 / (1 + np.exp(-float(decision)))) # Sigmoid normalization
                
            return prediction, confidence
            
        except Exception as e:
            import traceback
            print(f"\n❌ PREDICTION ERROR for {model_name}: {str(e)}")
            traceback.print_exc()
            raise RuntimeError(f"Internal Model Error: {str(e)}")


# Global model loader instance
_model_loader: Optional[MLModelLoader] = None

def get_model_loader() -> MLModelLoader:
    global _model_loader
    if _model_loader is None:
        models_dir = os.getenv("ML_MODELS_DIR", "models")
        _model_loader = MLModelLoader(models_dir=models_dir)
    return _model_loader


def initialize_models():
    """Initialize models by scanning the models directory on startup."""
    loader = get_model_loader()
    models_dir = Path(os.getenv("ML_MODELS_DIR", "models"))
    
    loaded_count = 0
    
    if models_dir.exists() and models_dir.is_dir():
        # Scan for all .joblib and .pkl files
        for file_path in models_dir.glob("*.*"):
            if file_path.suffix in ['.joblib', '.pkl']:
                model_name = file_path.stem
                try:
                    loader.load_model(model_name, str(file_path))
                    loaded_count += 1
                except Exception as e:
                    print(f"⚠ Could not auto-load {file_path.name}: {e}")
                    
    if loaded_count == 0:
        print("⚠ No ML models found in the models/ directory. ML features will be limited.")
    else:
        print(f"✓ Initialized {loaded_count} ML model(s).")