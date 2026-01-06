"""
User model and schemas for authentication and secure key management.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId


class PyObjectId(ObjectId):
    """Custom ObjectId for Pydantic."""
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")


class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=100)


class UserCreate(UserBase):
    """Schema for user registration including encryption metadata."""
    password: str = Field(..., min_length=8, max_length=100)
    key_salt: str = Field(..., description="Salt used to derive the encryption key from password")
    encrypted_master_key: str = Field(..., description="User's master key, encrypted by password-derived key")


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str


class UserResponse(UserBase):
    """Schema for user response including metadata needed for client-side decryption."""
    id: str
    key_salt: str
    encrypted_master_key: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {ObjectId: str}


class UserInDB:
    """User document structure in MongoDB."""
    def __init__(
        self, 
        email: str, 
        full_name: str, 
        hashed_password: str, 
        key_salt: str, 
        encrypted_master_key: str
    ):
        self._id = ObjectId()
        self.email = email
        self.full_name = full_name
        self.hashed_password = hashed_password
        self.key_salt = key_salt
        self.encrypted_master_key = encrypted_master_key
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()

    def to_dict(self):
        """Convert to dictionary for MongoDB."""
        return {
            "_id": self._id,
            "email": self.email,
            "full_name": self.full_name,
            "hashed_password": self.hashed_password,
            "key_salt": self.key_salt,
            "encrypted_master_key": self.encrypted_master_key,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }

    @classmethod
    def from_dict(cls, data: dict):
        """Create UserInDB from MongoDB document."""
        user = cls.__new__(cls)
        user._id = data["_id"]
        user.email = data["email"]
        user.full_name = data["full_name"]
        user.hashed_password = data["hashed_password"]
        user.key_salt = data.get("key_salt")
        user.encrypted_master_key = data.get("encrypted_master_key")
        user.created_at = data.get("created_at", datetime.utcnow())
        user.updated_at = data.get("updated_at", datetime.utcnow())
        return user