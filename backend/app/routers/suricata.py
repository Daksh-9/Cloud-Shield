"""
Suricata integration routes.
"""
from typing import Optional, List
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form
import json

from app.models.suricata import (
    SuricataEventCreate,
    SuricataEventResponse,
    SuricataRuleCreate,
    SuricataRuleResponse,
    SuricataConfigCreate,
    SuricataConfigResponse
)
from app.services.suricata_service import (
    parse_and_store_suricata_event,
    get_suricata_events,
    create_suricata_rule,
    get_suricata_rules,
    update_suricata_rule,
    delete_suricata_rule,
    create_suricata_config,
    get_suricata_configs,
    reload_suricata
)
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/suricata", tags=["suricata"])


@router.post("/events", response_model=SuricataEventResponse, status_code=status.HTTP_201_CREATED)
async def ingest_suricata_event(
    event_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Ingest a Suricata EVE JSON event."""
    try:
        event = await parse_and_store_suricata_event(event_data)
        return SuricataEventResponse(
            id=event["id"],
            event_type=event["event_type"],
            timestamp=event["timestamp"],
            raw_event=event["raw_event"],
            created_at=event["created_at"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to process Suricata event: {str(e)}"
        )


@router.post("/events/batch", status_code=status.HTTP_201_CREATED)
async def ingest_suricata_events_batch(
    events: List[dict],
    current_user: dict = Depends(get_current_user)
):
    """Ingest multiple Suricata EVE JSON events."""
    results = []
    errors = []
    
    for idx, event_data in enumerate(events):
        try:
            event = await parse_and_store_suricata_event(event_data)
            results.append(event)
        except Exception as e:
            errors.append({"index": idx, "error": str(e)})
    
    return {
        "processed": len(results),
        "errors": len(errors),
        "results": results,
        "error_details": errors
    }


@router.get("/events", response_model=List[SuricataEventResponse])
async def list_suricata_events(
    limit: int = 100,
    skip: int = 0,
    event_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get Suricata events."""
    events = await get_suricata_events(limit=limit, skip=skip, event_type=event_type)
    
    return [
        SuricataEventResponse(
            id=event["id"],
            event_type=event["event_type"],
            timestamp=event["timestamp"],
            raw_event=event["raw_event"],
            created_at=event["created_at"]
        )
        for event in events
    ]


@router.post("/rules", response_model=SuricataRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_rule(
    rule_data: SuricataRuleCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new Suricata rule."""
    rule = await create_suricata_rule(
        name=rule_data.name,
        rule_content=rule_data.rule_content,
        description=rule_data.description,
        enabled=rule_data.enabled
    )
    
    return SuricataRuleResponse(
        id=rule["id"],
        name=rule["name"],
        rule_content=rule["rule_content"],
        description=rule["description"],
        enabled=rule["enabled"],
        created_at=rule["created_at"],
        updated_at=rule["updated_at"]
    )


@router.get("/rules", response_model=List[SuricataRuleResponse])
async def list_rules(
    enabled_only: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """Get Suricata rules."""
    rules = await get_suricata_rules(enabled_only=enabled_only)
    
    return [
        SuricataRuleResponse(
            id=rule["id"],
            name=rule["name"],
            rule_content=rule["rule_content"],
            description=rule["description"],
            enabled=rule["enabled"],
            created_at=rule["created_at"],
            updated_at=rule["updated_at"]
        )
        for rule in rules
    ]


@router.patch("/rules/{rule_id}", response_model=SuricataRuleResponse)
async def update_rule(
    rule_id: str,
    enabled: Optional[bool] = None,
    rule_content: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Update a Suricata rule."""
    rule = await update_suricata_rule(rule_id, enabled=enabled, rule_content=rule_content)
    
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rule not found"
        )
    
    return SuricataRuleResponse(
        id=rule["id"],
        name=rule["name"],
        rule_content=rule["rule_content"],
        description=rule["description"],
        enabled=rule["enabled"],
        created_at=rule["created_at"],
        updated_at=rule["updated_at"]
    )


@router.delete("/rules/{rule_id}")
async def delete_rule(
    rule_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a Suricata rule."""
    success = await delete_suricata_rule(rule_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rule not found"
        )
    
    return {"status": "success", "message": "Rule deleted"}


@router.post("/configs", response_model=SuricataConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_config(
    config_data: SuricataConfigCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new Suricata configuration."""
    config = await create_suricata_config(
        config_name=config_data.config_name,
        config_content=config_data.config_content,
        description=config_data.description
    )
    
    return SuricataConfigResponse(
        id=config["id"],
        config_name=config["config_name"],
        config_content=config["config_content"],
        description=config["description"],
        created_at=config["created_at"],
        updated_at=config["updated_at"]
    )


@router.get("/configs", response_model=List[SuricataConfigResponse])
async def list_configs(
    current_user: dict = Depends(get_current_user)
):
    """Get Suricata configurations."""
    configs = await get_suricata_configs()
    
    return [
        SuricataConfigResponse(
            id=config["id"],
            config_name=config["config_name"],
            config_content=config["config_content"],
            description=config["description"],
            created_at=config["created_at"],
            updated_at=config["updated_at"]
        )
        for config in configs
    ]


@router.post("/reload")
async def reload_suricata_rules(
    current_user: dict = Depends(get_current_user)
):
    """Reload Suricata rules."""
    result = await reload_suricata()
    return result

