"""SQLAlchemy ORM 模型。"""
from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


# ---------- 用户 ----------
class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    EDITOR = "editor"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(256))
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # 默认管理员首次登录后必须改密
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=False)
    # --- 账号身份信息（用于身份验证和密码恢复） ---
    student_id: Mapped[str] = mapped_column(String(32), index=True)  # 学号
    real_name: Mapped[str] = mapped_column(String(64))               # 真实姓名
    phone: Mapped[str] = mapped_column(String(32))                   # 手机号（含区号）
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    # IANA 时区（如 Asia/Shanghai）；NULL = 使用浏览器自动探测
    timezone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # 用户物理位置：国家 + 省份/城市（手动设置或浏览器 Geolocation 自动定位）
    country: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # 一级行政区（省/州）
    region: Mapped[str | None] = mapped_column(String(128), nullable=True)
    # 二级行政区（市/郡）；为空时仅 country + region 两级
    locality: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


# ---------- 登录会话（设备管理 / 踢出登录 / 30 分钟滑动超时） ----------
class LoginSession(Base):
    __tablename__ = "login_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    # JWT jti，唯一标识一次登录会话
    session_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    # 设备名称（浏览器 + 操作系统），如 "Chrome 129 · Windows"
    device_name: Mapped[str] = mapped_column(String(128))
    # 设备型号，如 "Windows 10/11 桌面" / "iPhone" / "22081212C (Android 13)"
    device_model: Mapped[str] = mapped_column(String(128))
    # 完整 User-Agent（详细展示用）
    user_agent: Mapped[str] = mapped_column(String(512), default="")
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # 登录地点（IP 归属地）：中文（ip2region）/ 英文（GeoLite2）；
    # "local"=本机回环，"intranet"=校园内网（枚举由前端按语言渲染）
    location_zh: Mapped[str | None] = mapped_column(String(128), nullable=True)
    location_en: Mapped[str | None] = mapped_column(String(128), nullable=True)
    # 勾选「记住此设备」登录：空闲超时从 30 分钟放宽到 30 天
    remember_device: Mapped[bool] = mapped_column(Boolean, default=False)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    login_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    # 滑动续期：每次认证请求刷新
    last_active_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    # 会话硬顶：登录时间 + token 有效期
    expires_at: Mapped[datetime] = mapped_column(DateTime)


# ---------- 活动 ----------
class ActivityStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    REGISTRATION_OPEN = "registration_open"
    ENDED = "ended"
    ARCHIVED = "archived"


class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(64))
    status: Mapped[ActivityStatus] = mapped_column(SAEnum(ActivityStatus), default=ActivityStatus.DRAFT)
    register_start: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    register_end: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    max_participants: Mapped[int] = mapped_column(Integer, default=0)  # 0 = 无上限
    cover_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    # 签到开关：管理员在活动开始时手动开放，报名者凭回执码签到
    checkin_open: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    registrations: Mapped[list["Registration"]] = relationship(back_populates="activity")


# ---------- 报名 ----------
class RegistrationStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CHECKED_IN = "checked_in"


class RegistrationType(str, Enum):
    ACTIVITY = "activity"   # 活动报名（关联 Activity）
    CLUB = "club"           # 社团报名（意向部门入会）


class Registration(Base):
    __tablename__ = "registrations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # 回执码（唯一，用于扫码/输号查询进度）
    receipt_code: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    # 提交内容语言（zh-CN / zh-TW / en / ja，后台按此自动翻译）
    content_lang: Mapped[str] = mapped_column(String(8), default="zh-CN")
    # 提交来源 IP（内网 / 公网 / IPv6，取自 XFF → X-Real-IP → 直连）
    submit_ip: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    # 报名类型：activity 需关联活动，club 无需关联
    registration_type: Mapped[RegistrationType] = mapped_column(
        SAEnum(RegistrationType), default=RegistrationType.ACTIVITY, index=True
    )
    activity_id: Mapped[int | None] = mapped_column(
        ForeignKey("activities.id"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(64))
    student_id: Mapped[str] = mapped_column(String(32))
    college: Mapped[str] = mapped_column(String(128))
    major: Mapped[str] = mapped_column(String(128))
    phone_cc: Mapped[str] = mapped_column(String(16))  # 国家区号，如 +86
    phone_number: Mapped[str] = mapped_column(String(32))
    email: Mapped[str | None] = mapped_column(String(128), nullable=True)
    # 意向部门（社团报名必填，活动报名可选）
    position: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # 自我介绍
    introduction: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[RegistrationStatus] = mapped_column(
        SAEnum(RegistrationStatus), default=RegistrationStatus.PENDING
    )
    remark: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 签到时间（仅通过回执码公开签到接口产生，管理员不可手动设置）
    checked_in_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)

    activity: Mapped[Activity] = relationship(back_populates="registrations")


# ---------- Bug 反馈 ----------
class BugReport(Base):
    __tablename__ = "bug_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    receipt_code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    content_lang: Mapped[str] = mapped_column(String(8), default="zh-CN")
    # 提交来源 IP（内网 / 公网 / IPv6，取自 XFF → X-Real-IP → 直连）
    submit_ip: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    contact_email: Mapped[str | None] = mapped_column(String(128), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(48), nullable=True)
    description: Mapped[str] = mapped_column(Text)
    extra: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)


# ---------- 翻译缓存 ----------
class TranslationCache(Base):
    """表单内容自动翻译的缓存，避免重复调用外部翻译接口。"""
    __tablename__ = "translation_cache"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source_hash: Mapped[str] = mapped_column(String(64), index=True)  # 原文 SHA-256
    source_lang: Mapped[str] = mapped_column(String(8))
    target_lang: Mapped[str] = mapped_column(String(8))
    source_text: Mapped[str] = mapped_column(Text)
    translated_text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


# ---------- 系统配置（单例表，id 固定为 1） ----------
class SystemSetting(Base):
    __tablename__ = "system_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    site_name: Mapped[str] = mapped_column(String(128), default="广东第二师范学院计算机协会")
    footer: Mapped[str | None] = mapped_column(Text, nullable=True)
    icp_info: Mapped[str | None] = mapped_column(String(128), nullable=True)
    # JSON 字段：存储数组更方便改
    ip_blacklist: Mapped[list[str]] = mapped_column(JSON, default=list)
    allowed_hosts: Mapped[list[str]] = mapped_column(JSON, default=list)
    cors_origins: Mapped[list[str]] = mapped_column(JSON, default=list)
    # 社团报名签到开关（社团报名不关联活动，用全局开关控制）
    club_checkin_open: Mapped[bool] = mapped_column(Boolean, default=False)
    # 系统默认 IANA 时区（前端降级回退用）；默认 Asia/Shanghai
    system_timezone: Mapped[str] = mapped_column(String(64), default="Asia/Shanghai")
    # 网络配置（接入层 Nginx/Caddy 热重载参考用；实际生效需运维手动重载）
    network_port: Mapped[int] = mapped_column(Integer, default=443)
    network_listen_ip: Mapped[str] = mapped_column(String(64), default="0.0.0.0")
    network_domains: Mapped[list[str]] = mapped_column(JSON, default=list)


# ---------- 操作日志 ----------
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(64))     # 如 "login" / "activity.create"
    target: Mapped[str | None] = mapped_column(String(64), nullable=True)   # 如 "activity:5"
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


# ---------- 网络配置变更历史（最近 5 次） ----------
class NetworkConfigHistory(Base):
    __tablename__ = "network_config_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # 快照：变更后的完整网络配置（JSON 存储）
    config_snapshot: Mapped[dict] = mapped_column(JSON)
    change_summary: Mapped[str | None] = mapped_column(String(512), nullable=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


# ---------- 忘记密码申请 ----------
class PasswordResetRequest(Base):
    """访客提交的忘记密码申请，管理员审核后手动处理。"""
    __tablename__ = "password_reset_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    contact_email: Mapped[str] = mapped_column(String(128))
    username_hint: Mapped[str | None] = mapped_column(String(128), nullable=True)
    reason: Mapped[str] = mapped_column(Text)
    # pending / handled / rejected
    status: Mapped[str] = mapped_column(String(16), default="pending", index=True)
    admin_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    handled_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    handled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)


# ---------- 安全问题（单例表，id 固定为 1） ----------
class SecurityQuestion(Base):
    """紧急恢复用安全问题，所有管理员失能时通过回答问题恢复超级管理员。"""
    __tablename__ = "security_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question: Mapped[str] = mapped_column(String(256))
    answer: Mapped[str] = mapped_column(String(256))  # 明文存储，仅用于紧急恢复
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)
