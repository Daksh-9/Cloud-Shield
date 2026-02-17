"""
Authentication middleware and dependencies.
"""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.utils.jwt import verify_token
from app.services.log_service import create_log

# This tells FastAPI that the token comes from the "Authorization: Bearer <token>" header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Alias oauth2_scheme as 'security' so other files can import it
security = oauth2_scheme 

async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Validate the token and return the current user's ID, email, and role.
    """
    payload = verify_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Return basic user info from token payload to avoid DB hit on every request
    return {
        "id": payload.get("sub"), # Assuming 'sub' holds ID based on jwt.py
        "email": payload.get("email"),
        "role": payload.get("role", "analyst"),
        "is_active": payload.get("is_active", True)
    }

async def get_current_active_user(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    Middleware to ensure the user is active.
    """
    if not current_user.get("is_active"):
        # Log unauthorized access attempt
        await create_log(
            source="auth_middleware",
            log_type="security",
            severity="warning",
            message=f"Inactive user attempted access: {current_user.get('email')}",
            metadata={"user_id": current_user.get("id")}
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user

async def get_admin_user(
    current_user: dict = Depends(get_current_active_user)
) -> dict:
    """
    Middleware to ensure the user has ADMIN privileges.
    """
    if current_user.get("role") != "admin":
        # Log privilege escalation attempt
        await create_log(
            source="auth_middleware",
            log_type="security",
            severity="warning",
            message=f"Unauthorized Admin access attempt: {current_user.get('email')}",
            metadata={"user_id": current_user.get("id"), "role": current_user.get("role")}
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return current_user