"""
User profile and settings routes.
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, Request, Query
from fastapi.security import HTTPAuthorizationCredentials

from app.models.user_settings import (
    UserSettingsResponse,
    UserSettingsUpdate,
    UserProfileUpdate,
    PasswordChange,
    UserActivityResponse,
    UserSessionResponse
)
from app.services.user_service import (
    update_user_profile,
    change_user_password,
    delete_user_account,
    get_user_by_id
)
from app.services.user_settings_service import (
    get_user_settings,
    update_user_settings,
    log_user_activity,
    get_user_activities,
    get_user_sessions,
    revoke_user_session,
    revoke_all_user_sessions
)
from app.middleware.auth import get_current_user, security
from app.utils.jwt import verify_token

router = APIRouter(prefix="/user", tags=["user"])


@router.get("/profile", response_model=dict)
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Get current user profile."""
    user = await get_user_by_id(current_user["id"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Remove sensitive fields
    user.pop("key_salt", None)
    user.pop("encrypted_master_key", None)
    
    return user


@router.patch("/profile", response_model=dict)
async def update_profile(
    profile_update: UserProfileUpdate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Update user profile."""
    try:
        # Get client IP and user agent
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        
        user = await update_user_profile(
            user_id=current_user["id"],
            full_name=profile_update.full_name,
            email=profile_update.email
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Log activity
        await log_user_activity(
            user_id=current_user["id"],
            activity_type="profile_update",
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={"updated_fields": profile_update.dict(exclude_unset=True)}
        )
        
        # Remove sensitive fields
        user.pop("key_salt", None)
        user.pop("encrypted_master_key", None)
        
        return user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Change user password."""
    try:
        # Get client IP and user agent
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        
        success = await change_user_password(
            user_id=current_user["id"],
            current_password=password_data.current_password,
            new_password=password_data.new_password
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to change password"
            )
        
        # Log activity
        await log_user_activity(
            user_id=current_user["id"],
            activity_type="password_change",
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        return {"status": "success", "message": "Password changed successfully"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/settings", response_model=UserSettingsResponse)
async def get_settings(current_user: dict = Depends(get_current_user)):
    """Get user settings."""
    settings = await get_user_settings(current_user["id"])
    return UserSettingsResponse(**settings)


@router.patch("/settings", response_model=UserSettingsResponse)
async def update_settings(
    settings_update: UserSettingsUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update user settings."""
    settings = await update_user_settings(current_user["id"], settings_update)
    return UserSettingsResponse(**settings)


@router.get("/activities", response_model=list[UserActivityResponse])
async def get_activities(
    limit: int = Query(default=100, ge=1, le=500),
    skip: int = Query(default=0, ge=0),
    activity_type: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user)
):
    """Get user activity logs."""
    activities = await get_user_activities(
        user_id=current_user["id"],
        limit=limit,
        skip=skip,
        activity_type=activity_type
    )
    
    return [
        UserActivityResponse(**act)
        for act in activities
    ]


@router.get("/sessions", response_model=list[UserSessionResponse])
async def get_sessions(current_user: dict = Depends(get_current_user)):
    """Get user active sessions."""
    # Extract token ID from current session
    token_id = None
    try:
        credentials: HTTPAuthorizationCredentials = await security()
        if credentials:
            payload = verify_token(credentials.credentials)
            if payload:
                token_id = payload.get("jti")  # JWT ID if available
    except:
        pass
    
    sessions = await get_user_sessions(current_user["id"])
    
    return [
        UserSessionResponse(**sess)
        for sess in sessions
    ]


@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Revoke a specific session."""
    success = await revoke_user_session(session_id, current_user["id"])
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    return {"status": "success", "message": "Session revoked"}


@router.post("/sessions/revoke-all")
async def revoke_all_sessions(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Revoke all sessions except the current one."""
    # Extract current token ID
    token_id = None
    try:
        credentials: HTTPAuthorizationCredentials = await security()
        if credentials:
            payload = verify_token(credentials.credentials)
            if payload:
                token_id = payload.get("jti")
    except:
        pass
    
    count = await revoke_all_user_sessions(current_user["id"], exclude_token_id=token_id)
    
    # Log activity
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    await log_user_activity(
        user_id=current_user["id"],
        activity_type="sessions_revoked",
        ip_address=ip_address,
        user_agent=user_agent,
        metadata={"revoked_count": count}
    )
    
    return {"status": "success", "message": f"Revoked {count} session(s)"}


@router.delete("/account")
async def delete_account(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Delete user account."""
    # Log activity before deletion
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    await log_user_activity(
        user_id=current_user["id"],
        activity_type="account_deleted",
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    success = await delete_user_account(current_user["id"])
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete account"
        )
    
    return {"status": "success", "message": "Account deleted successfully"}
