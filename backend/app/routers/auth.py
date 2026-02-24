"""
Authentication routes: registration and login.
"""
from datetime import timedelta, datetime
import secrets
from fastapi import APIRouter, HTTPException, status, Depends, Request
from fastapi.security import HTTPAuthorizationCredentials

from app.models.user import UserCreate, UserLogin, UserResponse
from app.services.user_service import create_user, authenticate_user
from app.utils.jwt import create_access_token
from app.middleware.auth import get_current_user, security
from app.config import settings
from app.database.connection import get_database

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """Register a new user."""
    try:
        # If frontend doesn't send keys, generate server-side placeholders
        salt = user_data.key_salt or secrets.token_hex(16)
        master_key = user_data.encrypted_master_key or secrets.token_hex(32)

        user = await create_user(
            email=user_data.email,
            full_name=user_data.full_name,
            password=user_data.password,
            key_salt=salt,
            encrypted_master_key=master_key,
            role=user_data.role or "analyst"  # Respect the role from the request
        )
        return user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/login")
async def login(credentials: UserLogin, request: Request):
    """Login and receive JWT token."""
    user = await authenticate_user(credentials.email, credentials.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check Active Status
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is inactive. Contact administrator."
        )

    # Update Last Login
    db = get_database()
    await db.users.update_one(
        {"email": credentials.email},
        {
            "$set": {
                "last_login": datetime.utcnow(),
                "failed_login_attempts": 0
            }
        }
    )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES if hasattr(settings, 'ACCESS_TOKEN_EXPIRE_MINUTES') else 60)
    
    # Include role and active status in token
    token_payload = {
        "sub": user["id"],
        "email": user["email"],
        "role": user.get("role", "analyst"),
        "is_active": user.get("is_active", True)
    }
    
    access_token = create_access_token(
        data=token_payload,
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": user # Return user info for frontend state
    }


@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    """Get current user information."""
    # current_user is the dict from the token, we might want to fetch fresh from DB
    from app.services.user_service import get_user_by_id
    user = await get_user_by_id(current_user["id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user