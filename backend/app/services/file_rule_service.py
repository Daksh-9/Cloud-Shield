"""
File-based Suricata rule management service with atomic writes and concurrency safety.
"""
import os
import tempfile
import shutil
import asyncio
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime
from pathlib import Path
# Note: filelock not needed - using asyncio.Lock for concurrency safety

from app.config import settings
from app.utils.rule_validator import validate_suricata_rule, extract_rule_metadata, format_rule_for_file
from app.services.log_service import create_log
from app.database.connection import get_database


# File lock for atomic operations
_rule_file_lock = asyncio.Lock()


def get_rules_file_path() -> str:
    """Get the path to the Suricata rules file."""
    return settings.SURICATA_RULES_PATH


async def read_rules_file() -> Tuple[List[str], Dict[str, Any]]:
    """
    Read the rules file and return lines and metadata.
    
    Returns:
        Tuple of (lines, metadata_dict)
    """
    file_path = get_rules_file_path()
    
    if not os.path.exists(file_path):
        # Create empty file if it doesn't exist
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


async def append_rule_to_file(
    rule_content: str,
    rule_name: Optional[str] = None,
    rule_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Atomically append a rule to the rules file.
    
    Returns:
        Dict with line_number and file info
    """
    # Validate rule
    is_valid, error, warnings = validate_suricata_rule(rule_content)
    if not is_valid:
        raise ValueError(f"Invalid rule: {error}")
    
    file_path = get_rules_file_path()
    file_dir = os.path.dirname(file_path)
    
    # Ensure directory exists
    os.makedirs(file_dir, exist_ok=True)
    
    async with _rule_file_lock:
        # Read current file
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                current_lines = f.readlines()
        else:
            current_lines = ["# Cloud Shield Suricata Rules\n", "# Generated automatically\n\n"]
        
        # Calculate line number (1-indexed)
        line_number = len(current_lines) + 1
        
        # Format rule for file
        formatted_rule = format_rule_for_file(rule_content, rule_name, rule_id)
        
        # Write atomically using temp file
        temp_file = file_path + '.tmp'
        try:
            with open(temp_file, 'w', encoding='utf-8') as f:
                # Write existing content
                f.writelines(current_lines)
                # Append new rule
                f.write(formatted_rule)
            
            # Atomic move
            shutil.move(temp_file, file_path)
            
            # Log history
            await log_rule_history(
                rule_id=rule_id,
                rule_content=rule_content,
                action="created",
                file_path=file_path,
                line_number=line_number,
                user_id=user_id,
                metadata={"warnings": warnings, "rule_name": rule_name}
            )
            
            # Log system event
            await create_log(
                source="suricata",
                log_type="rule_created",
                severity="info",
                message=f"Rule appended to {file_path} at line {line_number}",
                metadata={"rule_name": rule_name, "line_number": line_number}
            )
            
            return {
                "line_number": line_number,
                "file_path": file_path,
                "warnings": warnings
            }
        except Exception as e:
            # Clean up temp file on error
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
    
    Returns:
        Dict with updated line info
    """
    # Validate new rule
    is_valid, error, warnings = validate_suricata_rule(new_rule_content)
    if not is_valid:
        raise ValueError(f"Invalid rule: {error}")
    
    file_path = get_rules_file_path()
    
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Rules file not found: {file_path}")
    
    async with _rule_file_lock:
        # Read current file
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        # Validate line number (1-indexed)
        if line_number < 1 or line_number > len(lines):
            raise ValueError(f"Invalid line number: {line_number}")
        
        # Store old content for history
        old_content = lines[line_number - 1].strip()
        
        # Update the line (preserve comment lines if they exist)
        # Find if there's a comment line before this rule
        comment_line = None
        if line_number > 1 and lines[line_number - 2].strip().startswith('#'):
            comment_line = lines[line_number - 2]
        
        # Format new rule
        formatted_rule = format_rule_for_file(new_rule_content, rule_id=rule_id)
        new_lines = formatted_rule.split('\n')
        
        # Replace the rule line(s)
        if comment_line:
            # Keep comment, replace rule
            lines[line_number - 2] = comment_line
            lines[line_number - 1] = new_lines[0] + '\n'
            if len(new_lines) > 1:
                lines.insert(line_number, '\n')
        else:
            lines[line_number - 1] = new_lines[0] + '\n'
            if len(new_lines) > 1:
                lines.insert(line_number, '\n')
        
        # Write atomically
        temp_file = file_path + '.tmp'
        try:
            with open(temp_file, 'w', encoding='utf-8') as f:
                f.writelines(lines)
            
            shutil.move(temp_file, file_path)
            
            # Log history
            await log_rule_history(
                rule_id=rule_id,
                rule_content=new_rule_content,
                action="updated",
                file_path=file_path,
                line_number=line_number,
                user_id=user_id,
                metadata={"old_content": old_content, "warnings": warnings}
            )
            
            await create_log(
                source="suricata",
                log_type="rule_updated",
                severity="info",
                message=f"Rule updated at line {line_number} in {file_path}",
                metadata={"line_number": line_number}
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


async def get_recent_rules_from_file(limit: int = 5) -> List[Dict[str, Any]]:
    """
    Get the last N rules from the file.
    
    Returns:
        List of rule dicts with line_number and content
    """
    lines, _ = await read_rules_file()
    
    rules = []
    current_rule = None
    current_comment = None
    
    for idx, line in enumerate(reversed(lines)):
        line_num = len(lines) - idx
        stripped = line.strip()
        
        if not stripped or stripped.startswith('#'):
            if stripped.startswith('#') and 'Rule:' in stripped:
                current_comment = stripped
            continue
        
        # Check if it's a valid rule line
        is_valid, _, _ = validate_suricata_rule(stripped)
        if is_valid and not stripped.startswith('#'):
            rule_data = {
                "line_number": line_num,
                "content": stripped,
                "comment": current_comment
            }
            
            # Extract metadata
            metadata = extract_rule_metadata(stripped)
            rule_data.update(metadata)
            
            rules.append(rule_data)
            current_comment = None
            
            if len(rules) >= limit:
                break
    
    return list(reversed(rules))  # Return in file order


async def search_rules_in_file(query: str, case_sensitive: bool = False) -> List[Dict[str, Any]]:
    """
    Search for rules matching a query string.
    
    Returns:
        List of matching rules with line numbers
    """
    lines, _ = await read_rules_file()
    
    if not case_sensitive:
        query = query.lower()
    
    matches = []
    current_comment = None
    
    for idx, line in enumerate(lines, 1):
        stripped = line.strip()
        
        if stripped.startswith('#'):
            if 'Rule:' in stripped:
                current_comment = stripped
            continue
        
        if not stripped:
            continue
        
        # Check if line matches query
        search_line = stripped if case_sensitive else stripped.lower()
        if query in search_line:
            is_valid, _, _ = validate_suricata_rule(stripped)
            if is_valid:
                rule_data = {
                    "line_number": idx,
                    "content": stripped,
                    "comment": current_comment
                }
                metadata = extract_rule_metadata(stripped)
                rule_data.update(metadata)
                matches.append(rule_data)
                current_comment = None
    
    return matches


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
