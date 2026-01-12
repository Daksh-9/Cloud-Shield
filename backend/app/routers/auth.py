"""
Authentication routes: registration and login.
"""
from datetime import timedelta
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPAuthorizationCredentials

from app.models.user import UserCreate, UserLogin, UserResponse
from app.services.user_service import create_user, authenticate_user
from app.utils.jwt import create_access_token
from app.middleware.auth import get_current_user, security
from app.config import settings

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """Register a new user."""
    try:
        user = await create_user(
            email=user_data.email,
            full_name=user_data.full_name,
            password=user_data.password,
            key_salt=user_data.key_salt,
            encrypted_master_key=user_data.encrypted_master_key
        )
        # We can return the user dict directly as it matches UserResponse schema (with aliasing)
        return user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/login")
async def login(credentials: UserLogin):
    """Login and receive JWT token."""
    user = await authenticate_user(credentials.email, credentials.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["id"], "email": user["email"]},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"]
        }
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user information."""
    from app.services.user_service import get_user_by_id
    
    user = await get_user_by_id(current_user["id"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user