"""
Backup service for periodic MongoDB exports.
Exports selected collections to JSON files using async patterns.
"""
import asyncio
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any

from bson.json_util import dumps

from app.config import settings
from app.database.connection import get_database


logger = logging.getLogger(__name__)


def _ensure_backup_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


async def _write_file_async(path: Path, content: str) -> None:
    """
    Write content to a file using a background thread to avoid blocking the event loop.
    """

    def _write() -> None:
        _ensure_backup_dir(path.parent)
        with path.open("w", encoding="utf-8") as f:
            f.write(content)

    await asyncio.to_thread(_write)


async def cleanup_old_backups(backup_dir: Path, collection_name: str, keep_latest: int = 3) -> None:
    """
    Deletes old backup files for a specific collection, keeping only the most recent 'keep_latest' files.
    """
    def _cleanup() -> None:
        if not backup_dir.exists():
            return
            
        # Find all backup files for this collection
        pattern = f"{collection_name}-*.json"
        backup_files = list(backup_dir.glob(pattern))
        
        if len(backup_files) <= keep_latest:
            return
            
        # Sort files alphabetically. Since the filename includes YYYYMMDD-HHMMSS,
        # alphabetical sorting naturally orders them from oldest to newest.
        backup_files.sort(key=lambda p: p.name)
        
        # Identify files to delete (all except the last 'keep_latest')
        files_to_delete = backup_files[:-keep_latest]
        
        for file_path in files_to_delete:
            try:
                file_path.unlink()
                logger.info("Cleaned up old backup: %s", file_path)
            except OSError as exc:
                logger.error("Error deleting old backup %s: %s", file_path, exc)

    await asyncio.to_thread(_cleanup)


async def export_collection(
    collection_name: str,
    backup_dir: Path,
) -> Path:
    """
    Export all documents from a collection to a JSON file.

    Returns the path to the created backup file.
    """
    db = get_database()
    collection = db[collection_name]

    timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    filename = f"{collection_name}-{timestamp}.json"
    backup_path = backup_dir / filename

    logger.info("Starting backup for collection '%s' -> %s", collection_name, backup_path)

    try:
        cursor = collection.find({})
        documents: List[Dict[str, Any]] = await cursor.to_list(length=None)
        json_payload = dumps(documents, indent=2)

        await _write_file_async(backup_path, json_payload)

        logger.info(
            "Completed backup for collection '%s'. %d document(s) written.",
            collection_name,
            len(documents),
        )
        return backup_path
    except Exception as exc:
        logger.error(
            "Backup failed for collection '%s': %s",
            collection_name,
            exc,
        )
        raise


async def run_backup_job() -> Dict[str, Any]:
    """
    Run a single backup job for critical collections.

    Returns a summary dict with per-collection results.
    """
    backup_root = Path(settings.BACKUP_DIR)
    collections_to_backup = ["users", "suricata_rules"]

    logger.info(
        "Running backup job for collections: %s (directory: %s)",
        ", ".join(collections_to_backup),
        backup_root,
    )

    results: Dict[str, Any] = {"success": [], "failed": []}

    for name in collections_to_backup:
        try:
            path = await export_collection(name, backup_root)
            
            # Automatically clean up old backups for this collection, keeping the latest 3
            await cleanup_old_backups(backup_root, name, keep_latest=3)
            
            results["success"].append({"collection": name, "path": str(path)})
        except Exception as exc:
            # Error already logged in export_collection; track minimal detail here.
            results["failed"].append({"collection": name, "error": str(exc)})

    logger.info(
        "Backup job finished. Success: %d, Failed: %d",
        len(results["success"]),
        len(results["failed"]),
    )

    return results