"""
Suricata file-based rule management routes.
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from fastapi.responses import FileResponse

from app.models.rule_history import RuleHistoryResponse
from app.services.file_rule_service import (
    read_rules_file,
    append_rule_to_file,
    update_rule_in_file,
    get_recent_rules_from_file,
    search_rules_in_file,
    get_rules_file_path,
    log_rule_history
)
from app.middleware.auth import get_current_user
from app.database.connection import get_database
from pydantic import BaseModel

router = APIRouter(prefix="/suricata/rules", tags=["suricata-rules"])


class RuleCreateRequest(BaseModel):
    rule_content: str
    rule_name: Optional[str] = None


class RuleUpdateRequest(BaseModel):
    rule_content: str


@router.post("/create")
async def create_rule(
    request: RuleCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Create and append a new rule to the Suricata rules file.
    """
    if not request.rule_content or not request.rule_content.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rule content cannot be empty"
        )
    
    try:
        result = await append_rule_to_file(
            rule_content=request.rule_content.strip(),
            rule_name=request.rule_name,
            user_id=current_user["id"]
        )
        
        return {
            "status": "success",
            "message": "Rule created successfully",
            "line_number": result["line_number"],
            "file_path": result["file_path"],
            "warnings": result.get("warnings", [])
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create rule: {str(e)}"
        )


@router.get("/recent")
async def get_recent_rules(
    limit: int = Query(default=5, ge=1, le=50),
    current_user: dict = Depends(get_current_user)
):
    """Get the last N rules from the file."""
    try:
        rules = await get_recent_rules_from_file(limit=limit)
        return {"rules": rules, "count": len(rules)}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read rules: {str(e)}"
        )


@router.patch("/update/{line_number}")
async def update_rule(
    line_number: int,
    request: RuleUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a rule at a specific line number.
    """
    if not request.rule_content or not request.rule_content.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rule content cannot be empty"
        )
    
    if line_number < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Line number must be positive"
        )
    
    try:
        result = await update_rule_in_file(
            line_number=line_number,
            new_rule_content=request.rule_content.strip(),
            user_id=current_user["id"]
        )
        
        return {
            "status": "success",
            "message": "Rule updated successfully",
            "line_number": result["line_number"],
            "file_path": result["file_path"],
            "warnings": result.get("warnings", [])
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update rule: {str(e)}"
        )


@router.get("/view")
async def view_rules_file(
    search: Optional[str] = Query(default=None, description="Search query"),
    case_sensitive: bool = Query(default=False, description="Case sensitive search"),
    current_user: dict = Depends(get_current_user)
):
    """
    View the rules file with optional search/filter.
    """
    try:
        if search:
            rules = await search_rules_in_file(search, case_sensitive=case_sensitive)
            return {
                "rules": rules,
                "count": len(rules),
                "search_query": search
            }
        else:
            lines, metadata = await read_rules_file()
            return {
                "lines": lines,
                "line_count": len(lines),
                "metadata": metadata
            }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read rules file: {str(e)}"
        )


@router.get("/download")
async def download_rules_file(
    current_user: dict = Depends(get_current_user)
):
    """Download the rules file."""
    import os
    
    file_path = get_rules_file_path()
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rules file not found"
        )
    
    return FileResponse(
        path=file_path,
        filename="suricata_rules.rules",
        media_type="text/plain"
    )


@router.get("/history")
async def get_rule_history(
    limit: int = Query(default=50, ge=1, le=500),
    rule_id: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user)
):
    """Get rule change history."""
    db = get_database()
    
    query = {}
    if rule_id:
        query["rule_id"] = rule_id
    
    cursor = db.rule_history.find(query).sort("created_at", -1).limit(limit)
    history = await cursor.to_list(length=limit)
    
    return [
        {
            "id": str(h["_id"]),
            "rule_id": h.get("rule_id"),
            "rule_content": h["rule_content"],
            "action": h["action"],
            "file_path": h["file_path"],
            "line_number": h.get("line_number"),
            "user_id": h.get("user_id"),
            "metadata": h.get("metadata", {}),
            "created_at": h.get("created_at")
        }
        for h in history
    ]
