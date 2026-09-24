"""FastAPI 入口：应用创建、路由注册、启动时初始化超级管理员。"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import activities, admin_stats, auth, bug_report, query, register, system, translations
from app.core.config import get_settings
from app.core.middleware import ip_blacklist_middleware
from app.core.security import Role, hash_password
from app.db.models import Base, SecurityQuestion, SystemSetting, User
from app.db.session import async_session, engine

settings = get_settings()


# ---------- 启动时：建表 + 轻量列迁移 + 初始化超级管理员 ----------
async def _migrate_columns(conn):
    """SQLite 轻量迁移：为已有表补缺失列（create_all 不会给旧表加列）。"""
    from sqlalchemy import text

    expected = {
        "users": [
            ("timezone", "VARCHAR(64) NULL"),
            ("country", "VARCHAR(64) NULL"),
            ("region", "VARCHAR(128) NULL"),
        ],
        "activities": [("checkin_open", "BOOLEAN DEFAULT 0")],
        "registrations": [
            ("checked_in_at", "DATETIME NULL"),
            ("submit_ip", "VARCHAR(64) NULL"),
        ],
        "bug_reports": [("submit_ip", "VARCHAR(64) NULL")],
        "login_sessions": [
            ("location_zh", "VARCHAR(128) NULL"),
            ("location_en", "VARCHAR(128) NULL"),
        ],
        "system_settings": [
            ("club_checkin_open", "BOOLEAN DEFAULT 0"),
            ("system_timezone", "VARCHAR(64) DEFAULT 'Asia/Shanghai'"),
            ("network_port", "INTEGER DEFAULT 443"),
            ("network_listen_ip", "VARCHAR(64) DEFAULT '0.0.0.0'"),
            ("network_domains", "TEXT DEFAULT '[]'"),
        ],
    }
    for table, columns in expected.items():
        rows = await conn.execute(text(f"PRAGMA table_info({table})"))
        existing = {row[1] for row in rows}
        for col, ddl in columns:
            if col not in existing:
                await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {ddl}"))


async def _init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await _migrate_columns(conn)

    # 预置系统设置记录
    async with async_session() as s:
        rec = await s.get(SystemSetting, 1)
        if not rec:
            s.add(SystemSetting(id=1))

        # 初始化安全问题（单例，id=1）
        sec_q = await s.get(SecurityQuestion, 1)
        if not sec_q:
            s.add(SecurityQuestion(
                id=1,
                question="计算机协会成立于哪一年？",
                answer="2008",
            ))

        # 初始化超级管理员（默认 admin/admin，必须首次登录改密）
        from sqlalchemy import select
        existing = await s.execute(
            select(User).where(User.email == settings.FIRST_SUPERADMIN_EMAIL)
        )
        if not existing.scalar_one_or_none():
            admin = User(
                username=settings.FIRST_SUPERADMIN_EMAIL.split("@")[0],
                email=settings.FIRST_SUPERADMIN_EMAIL,
                password_hash=hash_password(settings.FIRST_SUPERADMIN_PASSWORD),
                role=Role.SUPER_ADMIN,
                must_change_password=True,
                student_id="00000000",
                real_name="超级管理员",
                phone="+8613800000000",
            )
            s.add(admin)
        await s.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await _init_db()
    yield


app = FastAPI(
    title="GDUECA 社团官网后端",
    description="广东第二师范学院计算机协会官网 FastAPI 后端 — 活动发布、报名收集、Bug 反馈、权限管理、数据导出",
    version="1.0.0",
    lifespan=lifespan,
)

# ---------- CORS ----------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- IP 黑名单 + Host 白名单中间件 ----------
# 注意：此中间件注册为 ASGI 中间件；若需要全局拦截（包括文档 /health 之外的所有请求），
# 可移至 middleware.py 并通过 app.middleware("http")(...) 挂载。
# 这里为简单直接注册。
app.middleware("http")(ip_blacklist_middleware)


# ---------- 健康检查 ----------
@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}


# ---------- 注册路由 ----------
app.include_router(auth.router)
app.include_router(activities.router)
app.include_router(register.router)
app.include_router(bug_report.router)
app.include_router(system.router)
app.include_router(translations.router)
app.include_router(query.router)
app.include_router(admin_stats.router)

# ---------- 静态文件服务（头像上传） ----------
os.makedirs("uploads/avatars", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
