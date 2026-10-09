"""成员管理 Pydantic 模型。"""
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import MultilineText, PlainText, SafeUrl, UTCDatetime


class MemberCreate(BaseModel):
    name: PlainText = Field(min_length=1, max_length=64)
    role_title: PlainText | None = Field(default=None, max_length=64)
    term: Literal["current", "former"] = "current"
    bio: MultilineText | None = Field(default=None, max_length=2_000)
    avatar_url: SafeUrl | None = Field(default=None, max_length=512)
    display_order: int = Field(default=0, ge=-10000, le=10000)
    archived: bool = False


class MemberUpdate(BaseModel):
    name: PlainText | None = Field(default=None, min_length=1, max_length=64)
    role_title: PlainText | None = Field(default=None, max_length=64)
    term: Literal["current", "former"] | None = None
    bio: MultilineText | None = Field(default=None, max_length=2_000)
    avatar_url: SafeUrl | None = Field(default=None, max_length=512)
    display_order: int | None = Field(default=None, ge=-10000, le=10000)
    archived: bool | None = None


class MemberOut(BaseModel):
    id: int
    name: str
    role_title: str | None
    term: str
    bio: str | None
    avatar_url: str | None
    display_order: int
    archived: bool
    created_at: UTCDatetime

    model_config = {"from_attributes": True}


class AvatarUploadOut(BaseModel):
    avatar_url: str
