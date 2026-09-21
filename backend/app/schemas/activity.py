"""活动管理 Pydantic 模型。"""
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class ActivityStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    REGISTRATION_OPEN = "registration_open"
    ENDED = "ended"
    ARCHIVED = "archived"


class ActivityCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str
    category: str | None = None
    status: ActivityStatus = ActivityStatus.DRAFT
    register_start: datetime | None = None
    register_end: datetime | None = None
    max_participants: int = 0  # 0 = 无上限
    cover_url: str | None = None


class ActivityUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    content: str | None = None
    category: str | None = None
    status: ActivityStatus | None = None
    register_start: datetime | None = None
    register_end: datetime | None = None
    max_participants: int | None = None
    cover_url: str | None = None


class ActivityOut(BaseModel):
    id: int
    title: str
    content: str
    category: str | None
    status: ActivityStatus
    register_start: datetime | None
    register_end: datetime | None
    max_participants: int
    cover_url: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
