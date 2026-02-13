"""
Database schema definitions and index management for Cloud Shield.
This module defines all collections, indexes, and schema validation rules.
"""
from typing import Dict, List, Any, Optional
from datetime import datetime


# Schema version for migrations
SCHEMA_VERSION = "1.0.0"


class CollectionIndex:
    """Index definition for a MongoDB collection."""
    def __init__(self, name: str, fields: List, unique: bool = False, sparse: bool = False, ttl: Optional[int] = None):
        self.name = name
        self.fields = fields  # List of tuples: [(field, direction), ...]
        self.unique = unique
        self.sparse = sparse
        self.ttl = ttl  # TTL in seconds for time-based expiration


class CollectionSchema:
    """Schema definition for a MongoDB collection."""
    def __init__(
        self,
        name: str,
        indexes: List[CollectionIndex],
        is_timeseries: bool = False,
        timeseries_config: Optional[Dict[str, Any]] = None,
        expire_after_seconds: Optional[int] = None
    ):
        self.name = name
        self.indexes = indexes
        self.is_timeseries = is_timeseries
        self.timeseries_config = timeseries_config or {}
        self.expire_after_seconds = expire_after_seconds


# Define all collection schemas
COLLECTIONS: Dict[str, CollectionSchema] = {
    # Users Collection
    "users": CollectionSchema(
        name="users",
        indexes=[
            CollectionIndex("email_unique", [("email", 1)], unique=True),
            CollectionIndex("created_at", [("created_at", -1)]),
            CollectionIndex("updated_at", [("updated_at", -1)]),
        ]
    ),
    
    # Logs Collection
    "logs": CollectionSchema(
        name="logs",
        indexes=[
            CollectionIndex("timestamp", [("timestamp", -1)]),
            CollectionIndex("source_timestamp", [("source", 1), ("timestamp", -1)]),
            CollectionIndex("severity_timestamp", [("severity", 1), ("timestamp", -1)]),
            CollectionIndex("log_type", [("log_type", 1)]),
            CollectionIndex("user_id", [("user_id", 1)], sparse=True),
            CollectionIndex("ip_address", [("ip_address", 1)], sparse=True),
            CollectionIndex("created_at", [("created_at", -1)]),
        ]
    ),
    
    # Alerts Collection
    "alerts": CollectionSchema(
        name="alerts",
        indexes=[
            CollectionIndex("severity_status", [("severity", 1), ("status", 1)]),
            CollectionIndex("status_created", [("status", 1), ("created_at", -1)]),
            CollectionIndex("created_at", [("created_at", -1)]),
            CollectionIndex("updated_at", [("updated_at", -1)]),
            CollectionIndex("alert_type", [("alert_type", 1)]),
            CollectionIndex("created_by", [("created_by", 1)], sparse=True),
            CollectionIndex("assigned_to", [("assigned_to", 1)], sparse=True),
        ]
    ),
    
    # Suricata Events Collection
    "suricata_events": CollectionSchema(
        name="suricata_events",
        indexes=[
            CollectionIndex("timestamp", [("timestamp", -1)]),
            CollectionIndex("event_type_timestamp", [("event_type", 1), ("timestamp", -1)]),
            CollectionIndex("event_type", [("event_type", 1)]),
            CollectionIndex("created_at", [("created_at", -1)]),
        ]
    ),
    
    # Suricata Rules Collection (MongoDB-based rules)
    "suricata_rules": CollectionSchema(
        name="suricata_rules",
        indexes=[
            CollectionIndex("enabled_created", [("enabled", 1), ("created_at", -1)]),
            CollectionIndex("created_at", [("created_at", -1)]),
            CollectionIndex("updated_at", [("updated_at", -1)]),
            CollectionIndex("name", [("name", 1)]),
        ]
    ),
    
    # Suricata Configs Collection
    "suricata_configs": CollectionSchema(
        name="suricata_configs",
        indexes=[
            CollectionIndex("config_name", [("config_name", 1)]),
            CollectionIndex("created_at", [("created_at", -1)]),
            CollectionIndex("updated_at", [("updated_at", -1)]),
        ]
    ),
    
    # ML Detections Collection
    "ml_detections": CollectionSchema(
        name="ml_detections",
        indexes=[
            CollectionIndex("created_at", [("created_at", -1)]),
            CollectionIndex("detection_type", [("detection_type", 1)]),
            CollectionIndex("confidence", [("confidence", -1)]),
            CollectionIndex("model_name", [("model_name", 1)]),
            CollectionIndex("related_log_id", [("related_log_id", 1)], sparse=True),
            CollectionIndex("related_alert_id", [("related_alert_id", 1)], sparse=True),
            CollectionIndex("prediction", [("prediction", 1)]),
        ]
    ),
    
    # User Settings Collection
    "user_settings": CollectionSchema(
        name="user_settings",
        indexes=[
            CollectionIndex("user_id_unique", [("user_id", 1)], unique=True),
            CollectionIndex("updated_at", [("updated_at", -1)]),
        ]
    ),
    
    # User Activities Collection
    "user_activities": CollectionSchema(
        name="user_activities",
        indexes=[
            CollectionIndex("user_id_timestamp", [("user_id", 1), ("timestamp", -1)]),
            CollectionIndex("activity_type", [("activity_type", 1)]),
            CollectionIndex("timestamp", [("timestamp", -1)]),
            CollectionIndex("ip_address", [("ip_address", 1)], sparse=True),
        ]
    ),
    
    # User Sessions Collection
    "user_sessions": CollectionSchema(
        name="user_sessions",
        indexes=[
            CollectionIndex("user_id_last_activity", [("user_id", 1), ("last_activity", -1)]),
            CollectionIndex("user_id", [("user_id", 1)]),
            CollectionIndex("expires_at", [("expires_at", 1)], sparse=True),
            CollectionIndex("last_activity", [("last_activity", -1)]),
        ]
    ),
    
    # Rule History Collection
    "rule_history": CollectionSchema(
        name="rule_history",
        indexes=[
            CollectionIndex("created_at", [("created_at", -1)]),
            CollectionIndex("user_id", [("user_id", 1)], sparse=True),
            CollectionIndex("rule_id", [("rule_id", 1)], sparse=True),
            CollectionIndex("action", [("action", 1)]),
            CollectionIndex("file_path", [("file_path", 1)]),
        ]
    ),
    
    # Time-Series Collections (if used)
    "raw_logs": CollectionSchema(
        name="raw_logs",
        is_timeseries=True,
        timeseries_config={
            "timeField": "timestamp",
            "metaField": "source",
            "granularity": "seconds"
        },
        expire_after_seconds=7776000,  # 90 days
        indexes=[
            CollectionIndex("timestamp", [("timestamp", -1)]),
            CollectionIndex("source", [("source", 1)]),
        ]
    ),
    
    "parsed_logs": CollectionSchema(
        name="parsed_logs",
        is_timeseries=True,
        timeseries_config={
            "timeField": "timestamp",
            "metaField": "source",
            "granularity": "seconds"
        },
        indexes=[
            CollectionIndex("src_ip_timestamp", [("src_ip", 1), ("timestamp", -1)]),
            CollectionIndex("dst_ip_timestamp", [("dst_ip", 1), ("timestamp", -1)]),
            CollectionIndex("protocol", [("protocol", 1)]),
            CollectionIndex("event_type", [("event_type", 1)]),
        ]
    ),
}


def get_collection_schema(collection_name: str) -> Optional[CollectionSchema]:
    """Get schema definition for a collection."""
    return COLLECTIONS.get(collection_name)


def get_all_collections() -> List[str]:
    """Get list of all collection names."""
    return list(COLLECTIONS.keys())
