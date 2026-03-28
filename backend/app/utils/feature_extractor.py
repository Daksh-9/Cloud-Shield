"""
Feature extraction pipeline for ML model input.
"""
from typing import Dict, Any, List

class FeatureExtractor:
    """Extract features from various data sources for ML inference."""
    
    @staticmethod
    def extract_from_log(log_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract features from a log entry."""
        features = {}
        severity_map = {"info": 0, "warning": 1, "error": 2, "critical": 3}
        features["severity_encoded"] = severity_map.get(log_data.get("severity", "info").lower(), 0)
        
        source = log_data.get("source", "unknown")
        features["source_hash"] = hash(source) % 1000
        
        message = log_data.get("message", "")
        features["message_length"] = len(message)
        features["message_word_count"] = len(message.split())
        features["has_special_chars"] = 1 if any(c in message for c in ['@', '#', '$', '%', '&']) else 0
        
        metadata = log_data.get("metadata", {})
        features["has_metadata"] = 1 if metadata else 0
        features["metadata_key_count"] = len(metadata) if metadata else 0
        
        timestamp = log_data.get("timestamp")
        if timestamp:
            if isinstance(timestamp, str):
                from datetime import datetime
                try:
                    dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                    features["hour_of_day"] = dt.hour
                    features["day_of_week"] = dt.weekday()
                except:
                    features["hour_of_day"] = 12
                    features["day_of_week"] = 0
            else:
                features["hour_of_day"] = timestamp.hour if hasattr(timestamp, 'hour') else 12
                features["day_of_week"] = timestamp.weekday() if hasattr(timestamp, 'weekday') else 0
        else:
            features["hour_of_day"] = 12
            features["day_of_week"] = 0
        
        return features
    
    @staticmethod
    def extract_from_network_data(network_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract features from generic network traffic data."""
        features = {}
        protocol = network_data.get("protocol", "unknown").lower()
        protocol_map = {"tcp": 0, "udp": 1, "icmp": 2, "http": 3, "https": 4}
        features["protocol_encoded"] = protocol_map.get(protocol, 5)
        
        features["src_port"] = network_data.get("src_port", 0)
        features["dst_port"] = network_data.get("dst_port", 0)
        features["is_privileged_port"] = 1 if features["dst_port"] < 1024 else 0
        features["packet_size"] = network_data.get("packet_size", 0)
        features["bytes_sent"] = network_data.get("bytes_sent", 0)
        features["bytes_received"] = network_data.get("bytes_received", 0)
        features["connection_duration"] = network_data.get("duration", 0)
        features["packet_count"] = network_data.get("packet_count", 0)
        
        flags = network_data.get("flags", {})
        features["has_syn"] = 1 if flags.get("syn") else 0
        features["has_fin"] = 1 if flags.get("fin") else 0
        features["has_rst"] = 1 if flags.get("rst") else 0
        
        return features
    
    @staticmethod
    def extract_from_generic(data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Passes generic JSON data directly through or attempts intelligent extraction.
        For the DDoS PCA model, the frontend/simulator sends the exact features.
        """
        # If it looks like a pre-computed PCA payload, return it as-is
        if "PC1" in data or "PC2" in data:
            return data
            
        features = {}
        if "severity" in data or "message" in data:
            features.update(FeatureExtractor.extract_from_log(data))
        if "protocol" in data or "port" in data or "src_port" in data:
            features.update(FeatureExtractor.extract_from_network_data(data))
            
        numeric_keys = [k for k, v in data.items() if isinstance(v, (int, float))]
        for key in numeric_keys[:10]:
            features[f"numeric_{key}"] = data[key]
            
        string_keys = [k for k, v in data.items() if isinstance(v, str)]
        for key in string_keys[:5]:
            features[f"str_len_{key}"] = len(data[key])
            
        return features if features else data
    
    @staticmethod
    def to_feature_vector(features: Dict[str, Any], feature_order: List[str] = None, model_name: str = None) -> Any:
        """
        Convert feature dictionary to a pandas DataFrame (if available) or numpy array for model input.
        """
        if model_name and "ddos" in model_name.lower():
            # The DDoS model was trained on PCA components, so we MUST send it exactly 35 PC columns
            feature_order = [f"PC{i}" for i in range(1, 36)]
            
        elif model_name and "traffic_classifier" in model_name.lower():
            feature_order = [
                "protocol_encoded", "src_port", "dst_port", "packet_size", 
                "bytes_sent", "bytes_received", "connection_duration", 
                "packet_count", "has_syn", "has_fin", "has_rst"
            ]

        if feature_order:
            vector = [float(features.get(feat, 0.0)) for feat in feature_order]
        else:
            vector = [float(features.get(k, 0.0)) for k in sorted(features.keys())]
            feature_order = sorted(features.keys())
            
        try:
            import pandas as pd
            # Create a DataFrame so the model receives exact feature names (PC1, PC2, etc.)
            return pd.DataFrame([vector], columns=feature_order)
        except ImportError:
            import numpy as np
            return np.array([vector], dtype=np.float32)