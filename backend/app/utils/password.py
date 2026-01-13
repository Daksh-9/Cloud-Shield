"""
Password hashing and verification utilities.
"""
from passlib.context import CryptContext

# --- CHANGE: Switch from "bcrypt" to "argon2" ---
# Argon2 is more secure and does NOT have the 72-character limit.
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password using Argon2."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)