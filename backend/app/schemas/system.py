"""系统配置 Pydantic 模型。"""
from pydantic import BaseModel, Field


class SystemSettingOut(BaseModel):
    id: int
    site_name: str
    footer: str | None
    icp_info: str | None
    ip_blacklist: list[str]
    allowed_hosts: list[str]
    cors_origins: list[str]

    model_config = {"from_attributes": True}


class SystemSettingUpdate(BaseModel):
    site_name: str | None = Field(default=None, max_length=128)
    footer: str | None = None
    icp_info: str | None = Field(default=None, max_length=128)
    ip_blacklist: list[str] | None = None
    allowed_hosts: list[str] | None = None
    cors_origins: list[str] | None = None
