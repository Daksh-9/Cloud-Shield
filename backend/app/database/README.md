# Database Schema Documentation

## Overview

Cloud Shield uses MongoDB as its primary database. This document describes the database schema, collections, indexes, and migration system.

## Schema Version

Current schema version: **1.0.0**

## Collections

### Core Collections

#### `users`
Stores user account information.

**Fields:**
- `_id`: ObjectId (primary key)
- `email`: String (unique, indexed)
- `full_name`: String
- `hashed_password`: String
- `key_salt`: String (for encryption key derivation)
- `encrypted_master_key`: String
- `created_at`: DateTime
- `updated_at`: DateTime

**Indexes:**
- `email_unique`: Unique index on `email`
- `created_at`: Descending index on `created_at`
- `updated_at`: Descending index on `updated_at`

#### `logs`
Stores security event logs and audit trails.

**Fields:**
- `_id`: ObjectId (primary key)
- `source`: String (e.g., 'firewall', 'application', 'suricata')
- `log_type`: String
- `severity`: String (info, warning, error, critical)
- `message`: String
- `action`: String (optional)
- `metadata`: Object (optional)
- `timestamp`: DateTime (indexed)
- `user_id`: ObjectId (optional, sparse index)
- `target_id`: ObjectId (optional)
- `ip_address`: String (optional, indexed)
- `user_agent`: String (optional)
- `created_at`: DateTime

**Indexes:**
- `timestamp`: Descending index on `timestamp`
- `source_timestamp`: Compound index on `(source, timestamp)`
- `severity_timestamp`: Compound index on `(severity, timestamp)`
- `log_type`: Index on `log_type`
- `user_id`: Sparse index on `user_id`
- `ip_address`: Index on `ip_address`
- `created_at`: Descending index on `created_at`

#### `alerts`
Stores security alerts and incidents.

**Fields:**
- `_id`: ObjectId (primary key)
- `title`: String
- `description`: String
- `severity`: String (low, medium, high, critical)
- `alert_type`: String
- `source`: String (optional)
- `metadata`: Object
- `related_log_ids`: Array of String
- `status`: String (open, investigating, resolved, closed)
- `created_by`: String (optional, user ID)
- `assigned_to`: String (optional, user ID)
- `notes`: String (optional)
- `created_at`: DateTime
- `updated_at`: DateTime

**Indexes:**
- `severity_status`: Compound index on `(severity, status)`
- `status_created`: Compound index on `(status, created_at)`
- `created_at`: Descending index on `created_at`
- `updated_at`: Descending index on `updated_at`
- `alert_type`: Index on `alert_type`
- `created_by`: Sparse index on `created_by`
- `assigned_to`: Sparse index on `assigned_to`

**Note:** The `alert_id` field referenced in old index definitions has been removed. All queries use `_id` instead.

### Suricata Collections

#### `suricata_events`
Stores parsed Suricata EVE JSON events.

**Fields:**
- `_id`: ObjectId (primary key)
- `event_type`: String (alert, flow, etc.)
- `timestamp`: DateTime (indexed)
- `raw_event`: Object (raw EVE JSON)
- `created_at`: DateTime

**Indexes:**
- `timestamp`: Descending index on `timestamp`
- `event_type_timestamp`: Compound index on `(event_type, timestamp)`
- `event_type`: Index on `event_type`
- `created_at`: Descending index on `created_at`

#### `suricata_rules`
Stores Suricata rules managed via MongoDB (separate from file-based rules).

**Fields:**
- `_id`: ObjectId (primary key)
- `name`: String
- `rule_content`: String
- `description`: String (optional)
- `enabled`: Boolean
- `created_at`: DateTime
- `updated_at`: DateTime

**Indexes:**
- `enabled_created`: Compound index on `(enabled, created_at)`
- `created_at`: Descending index on `created_at`
- `updated_at`: Descending index on `updated_at`
- `name`: Index on `name`

#### `suricata_configs`
Stores Suricata configuration files.

**Fields:**
- `_id`: ObjectId (primary key)
- `config_name`: String
- `config_content`: String
- `description`: String (optional)
- `created_at`: DateTime
- `updated_at`: DateTime

**Indexes:**
- `config_name`: Index on `config_name`
- `created_at`: Descending index on `created_at`
- `updated_at`: Descending index on `updated_at`

#### `rule_history`
Tracks changes to Suricata rules (file-based rules).

**Fields:**
- `_id`: ObjectId (primary key)
- `rule_id`: String (optional, MongoDB rule ID if applicable)
- `rule_content`: String
- `action`: String (created, updated, deleted, enabled, disabled)
- `file_path`: String
- `line_number`: Integer (optional)
- `user_id`: String (optional, user who made the change)
- `metadata`: Object (optional)
- `created_at`: DateTime

**Indexes:**
- `created_at`: Descending index on `created_at`
- `user_id`: Sparse index on `user_id`
- `rule_id`: Sparse index on `rule_id`
- `action`: Index on `action`
- `file_path`: Index on `file_path`

### ML Collections

#### `ml_detections`
Stores ML model detection results.

**Fields:**
- `_id`: ObjectId (primary key)
- `detection_type`: String (anomaly, intrusion, malware, etc.)
- `confidence`: Float (0.0 to 1.0)
- `prediction`: String
- `features`: Object (extracted features)
- `model_name`: String
- `metadata`: Object (optional)
- `related_log_id`: String (optional)
- `related_alert_id`: String (optional)
- `created_at`: DateTime

**Indexes:**
- `created_at`: Descending index on `created_at`
- `detection_type`: Index on `detection_type`
- `confidence`: Descending index on `confidence`
- `model_name`: Index on `model_name`
- `related_log_id`: Sparse index on `related_log_id`
- `related_alert_id`: Sparse index on `related_alert_id`
- `prediction`: Index on `prediction`

### User Management Collections

#### `user_settings`
Stores user preferences and settings.

**Fields:**
- `_id`: ObjectId (primary key)
- `user_id`: String (unique, indexed)
- `preferences`: Object (theme, language, timezone, etc.)
- `notifications`: Object (notification preferences)
- `dashboard`: Object (dashboard preferences)
- `metadata`: Object (optional)
- `created_at`: DateTime
- `updated_at`: DateTime

**Indexes:**
- `user_id_unique`: Unique index on `user_id`
- `updated_at`: Descending index on `updated_at`

#### `user_activities`
Stores user activity logs.

**Fields:**
- `_id`: ObjectId (primary key)
- `user_id`: String (indexed)
- `activity_type`: String (login, logout, password_change, etc.)
- `ip_address`: String (optional, indexed)
- `user_agent`: String (optional)
- `metadata`: Object (optional)
- `timestamp`: DateTime

**Indexes:**
- `user_id_timestamp`: Compound index on `(user_id, timestamp)`
- `activity_type`: Index on `activity_type`
- `timestamp`: Descending index on `timestamp`
- `ip_address`: Sparse index on `ip_address`

#### `user_sessions`
Stores active user sessions.

**Fields:**
- `_id`: ObjectId (primary key)
- `user_id`: String (indexed)
- `token_id`: String (optional)
- `ip_address`: String (optional)
- `user_agent`: String (optional)
- `created_at`: DateTime
- `last_activity`: DateTime
- `expires_at`: DateTime (optional, indexed)

**Indexes:**
- `user_id_last_activity`: Compound index on `(user_id, last_activity)`
- `user_id`: Index on `user_id`
- `expires_at`: Sparse index on `expires_at`
- `last_activity`: Descending index on `last_activity`

### Time-Series Collections

#### `raw_logs`
Time-series collection for raw log data (90-day retention).

**Configuration:**
- Time field: `timestamp`
- Meta field: `source`
- Granularity: `seconds`
- TTL: 90 days (7776000 seconds)

**Indexes:**
- `timestamp`: Descending index on `timestamp`
- `source`: Index on `source`

#### `parsed_logs`
Time-series collection for parsed log data.

**Configuration:**
- Time field: `timestamp`
- Meta field: `source`
- Granularity: `seconds`

**Indexes:**
- `src_ip_timestamp`: Compound index on `(src_ip, timestamp)`
- `dst_ip_timestamp`: Compound index on `(dst_ip, timestamp)`
- `protocol`: Index on `protocol`
- `event_type`: Index on `event_type`

## Migration System

The database uses a simple version-based migration system. Migrations are defined in `app/database/migrations.py`.

### Running Migrations

Migrations are automatically run on application startup. To manually run migrations:

```python
from app.database.connection import get_database
from app.database.migrations import run_migrations

db = get_database()
await run_migrations(db)
```

### Creating a New Migration

1. Define the migration function:

```python
async def migration_X_Y_Z_up(db: AsyncIOMotorDatabase):
    """Description of what this migration does."""
    # Migration logic here
    pass

async def migration_X_Y_Z_down(db: AsyncIOMotorDatabase):
    """Rollback logic."""
    # Rollback logic here
    pass
```

2. Register the migration:

```python
register_migration(
    "X.Y.Z",
    "Description",
    migration_X_Y_Z_up,
    migration_X_Y_Z_down
)
```

3. Update `SCHEMA_VERSION` in `app/database/schema.py`

## Index Management

Indexes are automatically created on application startup. To manually initialize indexes:

```python
from app.database.connection import get_database
from app.database.indexes import initialize_all_indexes

db = get_database()
await initialize_all_indexes(db, recreate=False)
```

To verify indexes:

```python
from app.database.indexes import verify_indexes

results = await verify_indexes(db)
```

## Data Safety

- **No Breaking Changes**: All schema changes are backward compatible
- **Index Creation**: Indexes are created only if they don't exist (no data loss)
- **Migrations**: Migrations are idempotent and can be safely re-run
- **Time-Series Collections**: Existing collections are not recreated unless explicitly requested

## Best Practices

1. **Always use migrations** for schema changes
2. **Test migrations** on a development database first
3. **Document schema changes** in migration descriptions
4. **Use sparse indexes** for optional fields
5. **Use compound indexes** for common query patterns
6. **Monitor index usage** and remove unused indexes
