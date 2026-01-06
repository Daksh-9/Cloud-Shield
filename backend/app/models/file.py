"""
File model and schemas for managing encrypted file metadata.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
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

class FileMetadataBase(BaseModel):
    """Base schema for file metadata."""
    filename: str = Field(..., description="Original name of the file")
    mime_type: str = Field(..., description="MIME type of the file")
    encrypted_size: int = Field(..., description="Size of the encrypted file in bytes")

class FileMetadataCreate(FileMetadataBase):
    """Schema for creating a new file record."""
    gridfs_id: str
    iv: str = Field(..., description="Base64 encoded Initialization Vector")
    auth_tag: str = Field(..., description="Base64 encoded Authentication Tag (for GCM)")
    encrypted_file_key: str = Field(..., description="File key encrypted with user's master key")
    original_file_hash: str = Field(..., description="SHA-256 hash of the unencrypted file")

class FileMetadataResponse(FileMetadataBase):
    """Schema for file metadata responses."""
    id: str
    owner_id: str
    gridfs_id: str
    iv: str
    auth_tag: str
    encrypted_file_key: str
    original_file_hash: str
    upload_date: datetime
    is_deleted: bool

    class Config:
        from_attributes = True
        json_encoders = {ObjectId: str}

class FileMetadataInDB:
    """File metadata document structure in MongoDB."""
    def __init__(
        self,
        owner_id: str,
        filename: str,
        mime_type: str,
        encrypted_size: int,
        gridfs_id: str,
        iv: str,
        auth_tag: str,
        encrypted_file_key: str,
        original_file_hash: str
    ):
        self._id = ObjectId()
        self.owner_id = ObjectId(owner_id)
        self.filename = filename
        self.mime_type = mime_type
        self.encrypted_size = encrypted_size
        self.gridfs_id = ObjectId(gridfs_id)
        self.iv = iv
        self.auth_tag = auth_tag
        self.encrypted_file_key = encrypted_file_key
        self.original_file_hash = original_file_hash
        self.upload_date = datetime.utcnow()
        self.is_deleted = False

    def to_dict(self):
        """Convert to dictionary for MongoDB."""
        return {
            "_id": self._id,
            "owner_id": self.owner_id,
            "filename": self.filename,
            "mime_type": self.mime_type,
            "encrypted_size": self.encrypted_size,
            "gridfs_id": self.gridfs_id,
            "iv": self.iv,
            "auth_tag": self.auth_tag,
            "encrypted_file_key": self.encrypted_file_key,
            "original_file_hash": self.original_file_hash,
            "upload_date": self.upload_date,
            "is_deleted": self.is_deleted
        }

    @classmethod
    def from_dict(cls, data: dict):
        """Create FileMetadataInDB from MongoDB document."""
        file_meta = cls.__new__(cls)
        file_meta._id = data["_id"]
        file_meta.owner_id = data["owner_id"]
        file_meta.filename = data["filename"]
        file_meta.mime_type = data["mime_type"]
        file_meta.encrypted_size = data["encrypted_size"]
        file_meta.gridfs_id = data["gridfs_id"]
        file_meta.iv = data["iv"]
        file_meta.auth_tag = data["auth_tag"]
        file_meta.encrypted_file_key = data["encrypted_file_key"]
        file_meta.original_file_hash = data["original_file_hash"]
        file_meta.upload_date = data.get("upload_date", datetime.utcnow())
        file_meta.is_deleted = data.get("is_deleted", False)
        return file_meta