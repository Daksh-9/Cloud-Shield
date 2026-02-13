"""
Database package for Cloud Shield.
Provides database connection, schema management, and migrations.
"""
from app.database.connection import (
    connect_to_mongo,
    close_mongo_connection,
    get_database
)
from app.database.schema import (
    COLLECTIONS,
    get_collection_schema,
    get_all_collections,
    SCHEMA_VERSION
)
from app.database.indexes import (
    initialize_all_indexes,
    verify_indexes,
    create_indexes_for_collection
)
from app.database.migrations import (
    run_migrations,
    get_current_schema_version,
    set_schema_version
)

__all__ = [
    "connect_to_mongo",
    "close_mongo_connection",
    "get_database",
    "COLLECTIONS",
    "get_collection_schema",
    "get_all_collections",
    "SCHEMA_VERSION",
    "initialize_all_indexes",
    "verify_indexes",
    "create_indexes_for_collection",
    "run_migrations",
    "get_current_schema_version",
    "set_schema_version",
]
