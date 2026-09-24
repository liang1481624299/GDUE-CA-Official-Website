"""认证 & 用户 Pydantic 模型。"""
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.core.security import Role
from app.schemas.common import UTCDatetime


class LoginRequest(BaseModel):
    username: str | None = None
    email: EmailStr | None = None
    # 默认 admin/admin 仅 5 字符，放行以便首次登录
    password: str = Field(min_length=1)
    # 勾选「记住此设备」：空闲超时 30 分钟 → 30 天，token 硬顶 30 天
    remember_device: bool = False


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: Role
    username: str
    must_change_password: bool = False


# ---------- 登录会话（设备管理） ----------
class LoginSessionOut(BaseModel):
    id: int
    device_name: str
    device_model: str
    user_agent: str
    ip: str | None = None
    # 登录地点（IP 归属地）：zh=en 双语字段；"local"/"intranet" 为枚举 code
    location_zh: str | None = None
    location_en: str | None = None
    remember_device: bool
    revoked: bool
    revoked_at: UTCDatetime | None = None
    login_at: UTCDatetime
    last_active_at: UTCDatetime
    expires_at: UTCDatetime
    # 是否为当前请求所用的登录会话
    is_current: bool = False

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    username: str = Field(min_length=2, max_length=64)
    email: EmailStr
    password: str = Field(min_length=6)
    role: Role = Role.EDITOR
    student_id: str = Field(min_length=1, max_length=32)
    real_name: str = Field(min_length=1, max_length=64)
    phone: str = Field(min_length=1, max_length=32)


class UserUpdate(BaseModel):
    """更新账号信息：自己可改基础资料，super_admin 额外可改 role/is_active"""
    username: str | None = Field(default=None, min_length=2, max_length=64)
    real_name: str | None = Field(default=None, min_length=1, max_length=64)
    student_id: str | None = Field(default=None, min_length=1, max_length=32)
    phone: str | None = Field(default=None, min_length=1, max_length=32)
    role: Role | None = None
    is_active: bool | None = None


class UserOut(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: Role
    is_active: bool
    must_change_password: bool = False
    student_id: str
    real_name: str
    phone: str
    avatar_url: str | None = None
    # IANA 时区；null = 自动探测浏览器时区
    timezone: str | None = None
    # 用户物理位置：国家 + 省份/城市
    country: str | None = None
    region: str | None = None
    created_at: UTCDatetime

    model_config = {"from_attributes": True}


# ---------- 个人资料更新 ----------
class ProfileUpdate(BaseModel):
    """用户自行更新资料：显示名称、真实姓名、手机号、学号、时区"""
    username: str | None = Field(default=None, min_length=2, max_length=64)
    real_name: str | None = Field(default=None, min_length=1, max_length=64)
    phone: str | None = Field(default=None, min_length=1, max_length=32)
    student_id: str | None = Field(default=None, min_length=1, max_length=32)
    # IANA 时区字符串；空字符串 = 恢复自动探测（存 NULL）；不传 = 不修改
    timezone: str | None = Field(default=None, max_length=64)
    # 国家 + 省份/城市；空字符串 = 清空（存 NULL）；不传 = 不修改
    country: str | None = Field(default=None, max_length=64)
    region: str | None = Field(default=None, max_length=128)


class AvatarUploadOut(BaseModel):
    avatar_url: str


# ---------- 修改密码 ----------
class ChangePasswordRequest(BaseModel):
    old_password: str = Field(min_length=1)
    new_password: str = Field(min_length=6)


# ---------- 忘记密码申请 ----------
class ForgotPasswordRequest(BaseModel):
    contact_email: EmailStr
    username_hint: str | None = None
    reason: str = Field(min_length=2, max_length=500)


class PasswordResetOut(BaseModel):
    id: int
    contact_email: str
    username_hint: str | None
    reason: str
    status: str
    admin_note: str | None
    handled_at: UTCDatetime | None
    created_at: UTCDatetime

    model_config = {"from_attributes": True}


class PasswordResetHandleRequest(BaseModel):
    status: str = Field(pattern="^(handled|rejected)$")
    admin_note: str | None = None


# ---------- 安全问题恢复 ----------
class SecurityQuestionOut(BaseModel):
    """公开接口只返回问题，不返回答案。"""
    question: str


class SecurityAnswerRequest(BaseModel):
    answer: str = Field(min_length=1)
    # 恢复后设置的新密码
    new_password: str = Field(min_length=6)


# ---------- 安全问题管理（仅 super_admin） ----------
class SecurityQuestionUpdate(BaseModel):
    question: str = Field(min_length=2, max_length=256)
    answer: str = Field(min_length=1, max_length=256)
