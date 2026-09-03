from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional


class UserOut(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True


class DocumentCreate(BaseModel):
    title: str = "Untitled Document"
    content: str = ""
    owner_id: int

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, v):
        v = v.strip()
        return v if v else "Untitled Document"


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, v):
        if v is not None and not v.strip():
            raise ValueError("Title cannot be empty")
        return v


class DocumentOut(BaseModel):
    id: int
    title: str
    content: str
    owner_id: int
    owner_name: str
    created_at: datetime
    updated_at: datetime
    is_owner: bool
    shared_with: list[UserOut] = []

    class Config:
        from_attributes = True


class ShareCreate(BaseModel):
    owner_id: int
    target_email: str
