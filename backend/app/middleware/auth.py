"""
Authentication middleware and dependencies.
"""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.utils.jwt import verify_token

# This tells FastAPI that the token comes from the "Authorization: Bearer <token>" header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# --- FIX: Alias oauth2_scheme as 'security' so other files can import it ---
security = oauth2_scheme 

async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Validate the token and return the current user's ID and email.
    """
    payload = verify_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user_id: str = payload.get("sub")
    email: str = payload.get("email")
    
    if user_id is None or email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Return a simple dict required for the route
    return {"id": user_id, "email": email}