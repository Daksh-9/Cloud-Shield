"""
Feature extraction pipeline for ML model input.
"""
from typing import Dict, Any, List
import numpy as np


class FeatureExtractor:
    """Extract features from various data sources for ML inference."""
    
    @staticmethod
    def extract_from_log(log_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract features from a log entry.
        
        Features:
        - Severity level (encoded)
        - Source type (encoded)
        - Message length
        - Has metadata flag
        - Metadata key count
        """
        features = {}
        
        # Severity encoding (info=0, warning=1, error=2, critical=3)
        severity_map = {"info": 0, "warning": 1, "error": 2, "critical": 3}
        features["severity_encoded"] = severity_map.get(log_data.get("severity", "info").lower(), 0)
        
        # Source encoding (simple hash-based)
        source = log_data.get("source", "unknown")
        features["source_hash"] = hash(source) % 1000  # Normalize to 0-999
        
        # Message features
        message = log_data.get("message", "")
        features["message_length"] = len(message)
        features["message_word_count"] = len(message.split())
        features["has_special_chars"] = 1 if any(c in message for c in ['@', '#', '$', '%', '&']) else 0
        
        # Metadata features
        metadata = log_data.get("metadata", {})
        features["has_metadata"] = 1 if metadata else 0
        features["metadata_key_count"] = len(metadata) if metadata else 0
        
        # Timestamp features (if available)
        timestamp = log_data.get("timestamp")
        if timestamp:
            # Extract hour of day (0-23)
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
        """
        Extract features from network traffic data.
        
        Features:
        - Protocol type
        - Port numbers
        - Packet size
        - Connection duration
        - Flags
        """
        features = {}
        
        # Protocol encoding
        protocol = network_data.get("protocol", "unknown").lower()
        protocol_map = {"tcp": 0, "udp": 1, "icmp": 2, "http": 3, "https": 4}
        features["protocol_encoded"] = protocol_map.get(protocol, 5)
        
        # Port features
        features["src_port"] = network_data.get("src_port", 0)
        features["dst_port"] = network_data.get("dst_port", 0)
        features["is_privileged_port"] = 1 if features["dst_port"] < 1024 else 0
        
        # Size features
        features["packet_size"] = network_data.get("packet_size", 0)
        features["bytes_sent"] = network_data.get("bytes_sent", 0)
        features["bytes_received"] = network_data.get("bytes_received", 0)
        
        # Connection features
        features["connection_duration"] = network_data.get("duration", 0)
        features["packet_count"] = network_data.get("packet_count", 0)
        
        # Flags
        flags = network_data.get("flags", {})
        features["has_syn"] = 1 if flags.get("syn") else 0
        features["has_fin"] = 1 if flags.get("fin") else 0
        features["has_rst"] = 1 if flags.get("rst") else 0
        
        return features
    
    @staticmethod
    def extract_from_generic(data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract features from generic data structure.
        Attempts to intelligently extract features based on available fields.
        """
        features = {}
        
        # Try to extract log-like features
        if "severity" in data or "message" in data:
            log_features = FeatureExtractor.extract_from_log(data)
            features.update(log_features)
        
        # Try to extract network-like features
        if "protocol" in data or "port" in data:
            network_features = FeatureExtractor.extract_from_network_data(data)
            features.update(network_features)
        
        # Generic numeric features
        numeric_keys = [k for k, v in data.items() if isinstance(v, (int, float))]
        for key in numeric_keys[:10]:  # Limit to first 10 numeric features
            features[f"numeric_{key}"] = data[key]
        
        # String length features
        string_keys = [k for k, v in data.items() if isinstance(v, str)]
        for key in string_keys[:5]:  # Limit to first 5 string features
            features[f"str_len_{key}"] = len(data[key])
        
        return features
    
    @staticmethod
    def to_feature_vector(features: Dict[str, Any], feature_order: List[str] = None) -> np.ndarray:
        """
        Convert feature dictionary to numpy array for model input.
        
        Args:
            features: Dictionary of feature names to values
            feature_order: Optional list specifying feature order (for consistency)
        
        Returns:
            numpy array of feature values
        """
        if feature_order:
            # Use specified feature order
            vector = [features.get(feat, 0.0) for feat in feature_order]
        else:
            # Use all features in sorted order
            vector = [float(features.get(k, 0.0)) for k in sorted(features.keys())]
        
        return np.array(vector, dtype=np.float32)

