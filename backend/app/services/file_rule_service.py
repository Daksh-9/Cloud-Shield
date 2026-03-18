"""
File-based Suricata rule management service with atomic writes and concurrency safety.
"""
import os
import shutil
import asyncio
import glob
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime
from bson import ObjectId

from app.config import settings
from app.utils.rule_validator import validate_suricata_rule, extract_rule_metadata, format_rule_for_file
from app.services.log_service import create_log
from app.database.connection import get_database


# File lock for atomic operations
_rule_file_lock = asyncio.Lock()
BACKUP_DIR = os.path.join(os.path.dirname(settings.SURICATA_RULES_PATH), "backups")


def get_rules_file_path() -> str:
    """Get the path to the Suricata rules file."""
    return settings.SURICATA_RULES_PATH


# --- Backup Logic ---

async def backup_rules_file() -> str:
    """Create a timestamped backup of the current rules file."""
    file_path = get_rules_file_path()
    if not os.path.exists(file_path):
        return None
        
    os.makedirs(BACKUP_DIR, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join(BACKUP_DIR, f"rules_backup_{timestamp}.rules")
    
    shutil.copy2(file_path, backup_path)
    return backup_path


async def restore_rules_file(backup_filename: str):
    """Restore the rules file from a backup."""
    backup_path = os.path.join(BACKUP_DIR, backup_filename)
    if not os.path.exists(backup_path):
        raise FileNotFoundError(f"Backup {backup_filename} not found")
        
    target_path = get_rules_file_path()
    
    async with _rule_file_lock:
        # Create a safety backup of current state before restoring old state
        await backup_rules_file()
        shutil.copy2(backup_path, target_path)


async def list_rule_backups() -> List[Dict[str, Any]]:
    """List available backups."""
    if not os.path.exists(BACKUP_DIR):
        return []
        
    files = glob.glob(os.path.join(BACKUP_DIR, "*.rules"))
    backups = []
    for f in sorted(files, key=os.path.getmtime, reverse=True):
        stat = os.stat(f)
        backups.append({
            "filename": os.path.basename(f),
            "size": stat.st_size,
            "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat()
        })
    return backups


async def read_rules_file() -> Tuple[List[str], Dict[str, Any]]:
    """
    Read the rules file and return lines and metadata.
    """
    file_path = get_rules_file_path()
    
    if not os.path.exists(file_path):
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write("# Cloud Shield Suricata Rules\n")
        return ["# Cloud Shield Suricata Rules\n"], {"line_count": 1, "file_size": 0}
    
    async with _rule_file_lock:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        file_stat = os.stat(file_path)
        return lines, {
            "line_count": len(lines),
            "file_size": file_stat.st_size,
            "modified": datetime.fromtimestamp(file_stat.st_mtime).isoformat()
        }
        
async def read_backup_file(backup_filename: str) -> List[str]:
    """Read the contents of a specific backup file for diffing."""
    backup_path = os.path.join(BACKUP_DIR, backup_filename)
    if not os.path.exists(backup_path):
        raise FileNotFoundError(f"Backup {backup_filename} not found")
        
    async with _rule_file_lock:
        with open(backup_path, 'r', encoding='utf-8') as f:
            return f.readlines()


# --- Duplicate Check ---
async def check_duplicate_rule_name(rule_name: str, current_lines: List[str]) -> bool:
    """Check if a rule name already exists in the file."""
    if not rule_name:
        return False
    search_str = f"Rule: {rule_name}"
    for line in current_lines:
        if line.strip().startswith('#') and search_str in line:
            return True
    return False


async def append_rule_to_file(
    rule_content: str,
    rule_name: Optional[str] = None,
    rule_id: Optional[str] = None,
    user_id: Optional[str] = None,
    severity: str = "medium"
) -> Dict[str, Any]:
    """
    Atomically append a rule to the rules file with backup and duplicate check.
    """
    is_valid, error, warnings = validate_suricata_rule(rule_content)
    if not is_valid:
        raise ValueError(f"Invalid rule: {error}")
    
    file_path = get_rules_file_path()
    file_dir = os.path.dirname(file_path)
    os.makedirs(file_dir, exist_ok=True)
    
    async with _rule_file_lock:
        # 1. Read current content
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                current_lines = f.readlines()
        else:
            current_lines = ["# Cloud Shield Suricata Rules\n", "# Generated automatically\n\n"]
        
        # 2. Check Duplicates
        if rule_name and await check_duplicate_rule_name(rule_name, current_lines):
            raise ValueError(f"Rule with name '{rule_name}' already exists.")

        # 3. Create Backup
        await backup_rules_file()

        # 4. Prepare new content
        line_number = len(current_lines) + 1
        
        # Format with Severity
        metadata_comment = f"# Metadata: severity={severity}; created_by={user_id}; timestamp={datetime.utcnow().isoformat()}\n"
        formatted_rule = format_rule_for_file(rule_content, rule_name, rule_id)
        final_block = metadata_comment + formatted_rule

        # 5. Atomic Write with Windows Fallback
        temp_file = file_path + '.tmp'
        try:
            with open(temp_file, 'w', encoding='utf-8') as f:
                f.writelines(current_lines)
                f.write(final_block)
            
            try:
                # Primary attempt: atomic replace
                os.replace(temp_file, file_path)
            except PermissionError:
                # Windows Fallback: If Suricata holds a read-lock, do an in-place overwrite
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.writelines(current_lines)
                    f.write(final_block)
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            
            # 6. Logging
            await log_rule_history(
                rule_id=rule_id,
                rule_content=rule_content,
                action="created",
                file_path=file_path,
                line_number=line_number,
                user_id=user_id,
                metadata={"warnings": warnings, "rule_name": rule_name, "severity": severity}
            )
            
            await create_log(
                source="suricata",
                log_type="rule_created",
                severity="info",
                message=f"Rule appended to {file_path}",
                metadata={"rule_name": rule_name, "severity": severity}
            )
            
            return {
                "line_number": line_number,
                "file_path": file_path,
                "warnings": warnings
            }
        except Exception as e:
            if os.path.exists(temp_file):
                os.remove(temp_file)
            raise Exception(f"Failed to append rule: {str(e)}")


async def update_rule_in_file(
    line_number: int,
    new_rule_content: str,
    rule_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Atomically update a rule at a specific line number.
    """
    is_valid, error, warnings = validate_suricata_rule(new_rule_content)
    if not is_valid:
        raise ValueError(f"Invalid rule: {error}")
    
    file_path = get_rules_file_path()
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Rules file not found: {file_path}")
    
    async with _rule_file_lock:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        if line_number < 1 or line_number > len(lines):
            raise ValueError(f"Invalid line number: {line_number}")
        
        # Backup before update
        await backup_rules_file()

        old_content = lines[line_number - 1].strip()
        
        # Preserve existing comments if possible
        comment_line = None
        if line_number > 1 and lines[line_number - 2].strip().startswith('#'):
            comment_line = lines[line_number - 2]
        
        formatted_rule = format_rule_for_file(new_rule_content, rule_id=rule_id)
        new_lines = formatted_rule.split('\n')
        
        if comment_line:
            lines[line_number - 2] = comment_line
            lines[line_number - 1] = new_lines[0] + '\n'
            if len(new_lines) > 1:
                lines.insert(line_number, '\n')
        else:
            lines[line_number - 1] = new_lines[0] + '\n'
            if len(new_lines) > 1:
                lines.insert(line_number, '\n')
        
        # Write with Windows Fallback
        temp_file = file_path + '.tmp'
        try:
            with open(temp_file, 'w', encoding='utf-8') as f:
                f.writelines(lines)
            
            try:
                os.replace(temp_file, file_path)
            except PermissionError:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.writelines(lines)
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            
            await log_rule_history(
                rule_id=rule_id,
                rule_content=new_rule_content,
                action="updated",
                file_path=file_path,
                line_number=line_number,
                user_id=user_id,
                metadata={"old_content": old_content, "warnings": warnings}
            )
            
            return {
                "line_number": line_number,
                "file_path": file_path,
                "warnings": warnings
            }
        except Exception as e:
            if os.path.exists(temp_file):
                os.remove(temp_file)
            raise Exception(f"Failed to update rule: {str(e)}")


async def process_uploaded_rules(content: str, filename: str, user_id: str) -> Dict[str, Any]:
    """
    Parse uploaded rules file, validate each rule, and append valid ones.
    """
    lines = content.splitlines()
    processed_count = 0
    skipped_count = 0
    errors = []

    # Create backup first
    await backup_rules_file()

    try:
        for idx, line in enumerate(lines):
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            
            is_valid, err, _ = validate_suricata_rule(line)
            if is_valid:
                # Extract the rule's SID to guarantee a unique name instead of just the filename
                metadata = extract_rule_metadata(line)
                sid = metadata.get('sid', f"line-{idx}")
                
                try:
                    await append_rule_to_file(
                        rule_content=line,
                        rule_name=f"Imported Rule SID {sid}",
                        user_id=user_id,
                        severity="medium"
                    )
                    processed_count += 1
                except ValueError as e:
                    errors.append(f"Skipped duplicate: SID {sid}")
                    skipped_count += 1
                except Exception as e:
                    errors.append(f"System Error on SID {sid}: {str(e)}")
                    skipped_count += 1
            else:
                errors.append(f"Invalid rule format: {line[:40]}... ({err})")
                skipped_count += 1
                
        await create_log(
            source="suricata",
            log_type="bulk_upload",
            severity="info",
            message=f"Uploaded {filename}: {processed_count} added, {skipped_count} skipped.",
            metadata={"user_id": user_id, "filename": filename}
        )
        
        return {
            "processed_count": processed_count,
            "skipped_count": skipped_count,
            "errors": errors[:15]
        }
        
    except Exception as e:
        raise Exception(f"Bulk processing failed entirely: {str(e)}")


async def get_recent_rules_from_file(limit: int = 5) -> List[Dict[str, Any]]:
    return await _existing_get_recent_rules(limit)


async def search_rules_in_file(query: str, case_sensitive: bool = False) -> List[Dict[str, Any]]:
    return await _existing_search_rules(query, case_sensitive)


async def log_rule_history(
    rule_id: Optional[str],
    rule_content: str,
    action: str,
    file_path: str,
    line_number: Optional[int],
    user_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
):
    """Log rule change to history."""
    db = get_database()
    
    history_doc = {
        "_id": ObjectId(),
        "rule_id": rule_id,
        "rule_content": rule_content,
        "action": action,
        "file_path": file_path,
        "line_number": line_number,
        "user_id": user_id,
        "metadata": metadata or {},
        "created_at": datetime.utcnow()
    }
    
    await db.rule_history.insert_one(history_doc)


# --- Helpers (Internal) ---
async def _existing_get_recent_rules(limit: int):
    lines, _ = await read_rules_file()
    rules = []
    current_comment = None
    for idx, line in enumerate(reversed(lines)):
        line_num = len(lines) - idx
        stripped = line.strip()
        if not stripped or stripped.startswith('#'):
            if stripped.startswith('#') and 'Rule:' in stripped:
                current_comment = stripped
            continue
        is_valid, _, _ = validate_suricata_rule(stripped)
        if is_valid and not stripped.startswith('#'):
            rule_data = {"line_number": line_num, "content": stripped, "comment": current_comment}
            metadata = extract_rule_metadata(stripped)
            rule_data.update(metadata)
            rules.append(rule_data)
            current_comment = None
            if len(rules) >= limit:
                break
    return list(reversed(rules))

async def _existing_search_rules(query, case_sensitive):
    lines, _ = await read_rules_file()
    if not case_sensitive: query = query.lower()
    matches = []
    current_comment = None
    for idx, line in enumerate(lines, 1):
        stripped = line.strip()
        if stripped.startswith('#'):
            if 'Rule:' in stripped: current_comment = stripped
            continue
        if not stripped: continue
        search_line = stripped if case_sensitive else stripped.lower()
        if query in search_line:
            is_valid, _, _ = validate_suricata_rule(stripped)
            if is_valid:
                rule_data = {"line_number": idx, "content": stripped, "comment": current_comment}
                metadata = extract_rule_metadata(stripped)
                rule_data.update(metadata)
                matches.append(rule_data)
                current_comment = None
    return matches