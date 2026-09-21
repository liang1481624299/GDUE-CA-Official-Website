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
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


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
    submitted_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)

    activity: Mapped[Activity] = relationship(back_populates="registrations")


# ---------- Bug 反馈 ----------
class BugReport(Base):
    __tablename__ = "bug_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    contact_email: Mapped[str | None] = mapped_column(String(128), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(48), nullable=True)
    description: Mapped[str] = mapped_column(Text)
    extra: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)


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
