"""
Standalone script to run database migrations and index initialization.
Usage: python -m app.database.migration_script
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from app.config import settings
from app.database.connection import connect_to_mongo, close_mongo_connection, get_database
from app.database.indexes import initialize_all_indexes, verify_indexes
from app.database.migrations import run_migrations, get_current_schema_version


async def main():
    """Run database migrations and index initialization."""
    print("=" * 60)
    print("Cloud Shield - Database Migration Script")
    print("=" * 60)
    print(f"Database: {settings.DB_NAME}")
    from app.database.schema import SCHEMA_VERSION
    print(f"Target Schema Version: {SCHEMA_VERSION}")
    print()
    
    try:
        # Connect to database
        await connect_to_mongo()
        db = get_database()
        
        # Check current schema version
        current_version = await get_current_schema_version(db)
        print(f"Current schema version: {current_version or 'None (fresh install)'}")
        print()
        
        # Run migrations
        print("Running migrations...")
        applied = await run_migrations(db)
        if applied:
            print(f"✓ Applied {len(applied)} migration(s)")
        else:
            print("ℹ️  No migrations to apply")
        print()
        
        # Initialize indexes
        print("Initializing indexes...")
        results = await initialize_all_indexes(db, recreate=False)
        total_indexes = sum(len(indexes) for indexes in results.values())
        print(f"✓ Initialized indexes for {len(results)} collection(s) ({total_indexes} total indexes)")
        print()
        
        # Verify indexes
        print("Verifying indexes...")
        verification = await verify_indexes(db)
        missing_count = sum(len(v["missing"]) for v in verification.values())
        if missing_count == 0:
            print("✓ All indexes verified")
        else:
            print(f"⚠️  {missing_count} index(es) missing")
            for collection, info in verification.items():
                if info["missing"]:
                    print(f"  - {collection}: {', '.join(info['missing'])}")
        print()
        
        # Final schema version
        final_version = await get_current_schema_version(db)
        print(f"Final schema version: {final_version}")
        print()
        print("=" * 60)
        print("✓ Database migration complete")
        print("=" * 60)
        
    except Exception as e:
        print(f"✗ Error: {e}")
        sys.exit(1)
    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(main())
