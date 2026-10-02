"""活动管理 Pydantic 模型。"""
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field

from app.schemas.common import MultilineText, PlainText, SafeUrl, UTCDatetime


class ActivityStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    REGISTRATION_OPEN = "registration_open"
    ENDED = "ended"
    ARCHIVED = "archived"


class ActivityCreate(BaseModel):
    title: PlainText = Field(min_length=1, max_length=200)
    # Markdown 正文：前端用 react-markdown 渲染（不启用原始 HTML），这里只做清洗
    content: MultilineText = Field(max_length=50_000)
    category: PlainText | None = Field(default=None, max_length=64)
    status: ActivityStatus = ActivityStatus.DRAFT
    register_start: datetime | None = None
    register_end: datetime | None = None
    max_participants: int = Field(default=0, ge=0, le=100_000)  # 0 = 无上限
    cover_url: SafeUrl | None = Field(default=None, max_length=512)


class ActivityUpdate(BaseModel):
    title: PlainText | None = Field(default=None, min_length=1, max_length=200)
    content: MultilineText | None = Field(default=None, max_length=50_000)
    category: PlainText | None = Field(default=None, max_length=64)
    status: ActivityStatus | None = None
    register_start: datetime | None = None
    register_end: datetime | None = None
    max_participants: int | None = Field(default=None, ge=0, le=100_000)
    cover_url: SafeUrl | None = Field(default=None, max_length=512)
    checkin_open: bool | None = None  # 签到开关


class ActivityOut(BaseModel):
    id: int
    title: str
    content: str
    category: str | None
    status: ActivityStatus
    register_start: UTCDatetime | None
    register_end: UTCDatetime | None
    max_participants: int
    cover_url: str | None
    checkin_open: bool
    created_at: UTCDatetime
    updated_at: UTCDatetime

    model_config = {"from_attributes": True}
