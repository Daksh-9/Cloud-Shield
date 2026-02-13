"""
Database migration system for schema changes.
Simple version-based migration system for MongoDB.
"""
from typing import Dict, Any, Optional
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.schema import SCHEMA_VERSION


class Migration:
    """Represents a database migration."""
    def __init__(self, version: str, description: str, up_func, down_func=None):
        self.version = version
        self.description = description
        self.up_func = up_func  # Function to apply migration
        self.down_func = down_func  # Function to rollback migration
    
    async def apply(self, db: AsyncIOMotorDatabase):
        """Apply this migration."""
        await self.up_func(db)
    
    async def rollback(self, db: AsyncIOMotorDatabase):
        """Rollback this migration."""
        if self.down_func:
            await self.down_func(db)
        else:
            raise NotImplementedError(f"Rollback not implemented for migration {self.version}")


# Migration registry
MIGRATIONS: Dict[str, Migration] = {}


def register_migration(version: str, description: str, up_func, down_func=None):
    """Register a migration."""
    MIGRATIONS[version] = Migration(version, description, up_func, down_func)


async def get_current_schema_version(db: AsyncIOMotorDatabase) -> Optional[str]:
    """Get current schema version from database."""
    try:
        version_doc = await db.schema_version.find_one({}, sort=[("version", -1)])
        if version_doc:
            return version_doc.get("version")
    except Exception:
        pass
    return None


async def set_schema_version(db: AsyncIOMotorDatabase, version: str, description: str = ""):
    """Set schema version in database."""
    await db.schema_version.insert_one({
        "version": version,
        "description": description,
        "applied_at": datetime.utcnow()
    })


async def run_migrations(db: AsyncIOMotorDatabase, target_version: Optional[str] = None) -> list:
    """
    Run migrations up to target version (or latest if None).
    
    Returns:
        List of applied migration versions
    """
    current_version = await get_current_schema_version(db)
    target_version = target_version or SCHEMA_VERSION
    
    # Get migrations to apply (sorted by version)
    migrations_to_apply = []
    for version, migration in sorted(MIGRATIONS.items()):
        if current_version is None or version > current_version:
            if target_version is None or version <= target_version:
                migrations_to_apply.append((version, migration))
    
    applied = []
    for version, migration in migrations_to_apply:
        try:
            print(f"Applying migration {version}: {migration.description}")
            await migration.apply(db)
            await set_schema_version(db, version, migration.description)
            applied.append(version)
            print(f"✓ Migration {version} applied successfully")
        except Exception as e:
            print(f"✗ Failed to apply migration {version}: {e}")
            raise
    
    return applied


# Define migrations
async def migration_1_0_0_up(db: AsyncIOMotorDatabase):
    """Initial schema setup - create all indexes."""
    from app.database.indexes import initialize_all_indexes
    await initialize_all_indexes(db, recreate=False)


register_migration(
    "1.0.0",
    "Initial schema setup - create all indexes",
    migration_1_0_0_up
)
