"""系统配置 Pydantic 模型。"""
from pydantic import BaseModel, Field, field_validator

from app.schemas.common import UTCDatetime


class SystemSettingOut(BaseModel):
    id: int
    site_name: str
    footer: str | None
    icp_info: str | None
    ip_blacklist: list[str]
    allowed_hosts: list[str]
    cors_origins: list[str]
    club_checkin_open: bool
    # 系统默认 IANA 时区（降级回退用）
    system_timezone: str = "Asia/Shanghai"
    # 网络配置
    network_port: int = 443
    network_listen_ip: str = "0.0.0.0"
    network_domains: list[str] = []

    model_config = {"from_attributes": True}


class SystemSettingUpdate(BaseModel):
    site_name: str | None = Field(default=None, max_length=128)
    footer: str | None = None
    icp_info: str | None = Field(default=None, max_length=128)
    ip_blacklist: list[str] | None = None
    allowed_hosts: list[str] | None = None
    cors_origins: list[str] | None = None
    club_checkin_open: bool | None = None  # 社团报名签到开关
    # IANA 时区字符串；PUT 时校验有效性
    system_timezone: str | None = Field(default=None, max_length=64)
    # 网络配置
    network_port: int | None = Field(default=None, ge=1, le=65535)
    network_listen_ip: str | None = Field(default=None, max_length=64)
    network_domains: list[str] | None = None

    @field_validator("network_listen_ip")
    @classmethod
    def _valid_ip(cls, v: str | None) -> str | None:
        if v is None or v == "":
            return "0.0.0.0"
        from ipaddress import ip_address
        try:
            ip_address(v)
        except ValueError:
            raise ValueError("无效的监听 IP 地址")
        return v

    @field_validator("network_domains")
    @classmethod
    def _valid_domains(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return None
        import re
        # 允许 domain.tld 或 *.domain.tld 的域名格式
        pattern = re.compile(
            r"^(?:\*\.)?(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$"
        )
        for d in v:
            d = d.strip()
            if d and not pattern.match(d):
                raise ValueError(f"无效的域名格式：{d}")
        return [d.strip() for d in v if d.strip()]


class NetworkConfigHistoryOut(BaseModel):
    id: int
    config_snapshot: dict
    change_summary: str | None = None
    user_id: int | None = None
    ip: str | None = None
    created_at: UTCDatetime | None = None

    model_config = {"from_attributes": True}
