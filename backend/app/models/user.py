"""
User model and schemas for authentication.
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
    """Schema for user registration."""
    password: str = Field(..., min_length=8, max_length=100)


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str


class UserResponse(UserBase):
    """Schema for user response (without password)."""
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserInDB:
    """User document structure in MongoDB."""
    def __init__(self, email: str, full_name: str, hashed_password: str):
        self._id = ObjectId()
        self.email = email
        self.full_name = full_name
        self.hashed_password = hashed_password
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()

    def to_dict(self):
        """Convert to dictionary for MongoDB."""
        return {
            "_id": self._id,
            "email": self.email,
            "full_name": self.full_name,
            "hashed_password": self.hashed_password,
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
        user.created_at = data.get("created_at", datetime.utcnow())
        user.updated_at = data.get("updated_at", datetime.utcnow())
        return user

