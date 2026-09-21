"""全局配置，从 .env 或环境变量读取。"""
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ---- 数据库 ----
    DATABASE_URL: str = "sqlite+aiosqlite:///./assoc.db"

    # ---- JWT ----
    JWT_SECRET_KEY: str = Field(default="dev-secret-change-me", alias="JWT_SECRET_KEY")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 24

    # ---- CORS / Host ----
    CORS_ORIGINS: str = "http://localhost:3000"
    ALLOWED_HOSTS: str = ""  # 逗号分隔；空则不校验

    # ---- 初始化超级管理员 ----
    # 默认 admin/admin，首次登录强制改密
    FIRST_SUPERADMIN_EMAIL: str = "admin@gdue-ca.cn"
    FIRST_SUPERADMIN_PASSWORD: str = "admin"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def allowed_hosts_list(self) -> list[str]:
        return [h.strip() for h in self.ALLOWED_HOSTS.split(",") if h.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
