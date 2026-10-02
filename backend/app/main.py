"""FastAPI 入口：应用创建、路由注册、安全中间件、启动时初始化超级管理员。"""
import logging
import os
import secrets
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import activities, admin_stats, auth, bug_report, query, register, system, translations
from app.api.auth import security_answer_digest
from app.core.config import get_settings
from app.core.csrf import CSRF_HEADER, csrf_middleware
from app.core.log import setup_logging
from app.core.middleware import ip_blacklist_middleware, security_headers_middleware
from app.core.password_policy import check_password_strength
from app.core.security import Role, hash_password, is_bcrypt_hash, verify_password
from app.core.trace import TRACE_HEADER, trace_middleware
from app.db.models import Base, SecurityQuestion, SystemSetting, User
from app.db.session import async_session, engine

settings = get_settings()
# 统一日志格式（含 traceId）：尽早初始化，覆盖启动阶段与 uvicorn 自身日志
setup_logging(settings.LOG_LEVEL, settings.LOG_FORMAT)
logger = logging.getLogger("gdueca")

# 旧版本预置的弱安全问题（答案可被轻易猜中），启动时自动清除
_LEGACY_SECURITY_QUESTION = ("计算机协会成立于哪一年？", "2008")
# 自动生成的初始超管口令写入该文件（权限 0600），首次登录后必须修改并删除此文件
_INITIAL_PASSWORD_FILE = Path("initial_admin_password.txt")


# ---------- 启动时：建表 + 轻量列迁移 + 初始化超级管理员 ----------
async def _migrate_columns(conn):
    """SQLite 轻量迁移：为已有表补缺失列（create_all 不会给旧表加列）。"""
    from sqlalchemy import text

    expected = {
        "audit_logs": [("trace_id", "VARCHAR(64) NULL")],
        "users": [
            ("failed_login_count", "INTEGER DEFAULT 0"),
            ("locked_until", "DATETIME NULL"),
            ("password_changed_at", "DATETIME NULL"),
            ("timezone", "VARCHAR(64) NULL"),
            ("country", "VARCHAR(64) NULL"),
            ("region", "VARCHAR(128) NULL"),
            ("locality", "VARCHAR(128) NULL"),
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
    if conn.dialect.name == "postgresql":
        # PostgreSQL 原生 ENUM 需显式追加新角色值
        await conn.execute(text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'MEMBER'"))
    if conn.dialect.name != "sqlite":
        return
    for table, columns in expected.items():
        rows = await conn.execute(text(f"PRAGMA table_info({table})"))
        existing = {row[1] for row in rows}
        for col, ddl in columns:
            if col not in existing:
                await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {ddl}"))
    await conn.execute(text(
        "CREATE INDEX IF NOT EXISTS ix_audit_logs_trace_id ON audit_logs (trace_id)"
    ))


async def _init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await _migrate_columns(conn)

    # 预置系统设置记录
    async with async_session() as s:
        rec = await s.get(SystemSetting, 1)
        if not rec:
            s.add(SystemSetting(id=1))

        # 安全问题：不再预置默认问题；旧版明文答案迁移为哈希，弱默认问题直接清除
        sec_q = await s.get(SecurityQuestion, 1)
        if sec_q and (sec_q.question, sec_q.answer) == _LEGACY_SECURITY_QUESTION:
            await s.delete(sec_q)
            logger.warning("已清除旧版默认安全问题，请超级管理员在后台重新设置")
        elif sec_q and not is_bcrypt_hash(sec_q.answer):
            sec_q.answer = hash_password(security_answer_digest(sec_q.answer))

        # 初始化超级管理员：口令不满足强口令策略时自动生成随机强口令
        from sqlalchemy import select
        existing = (await s.execute(
            select(User).where(User.email == settings.FIRST_SUPERADMIN_EMAIL)
        )).scalar_one_or_none()
        username = settings.FIRST_SUPERADMIN_EMAIL.split("@")[0]
        if not existing:
            password = settings.FIRST_SUPERADMIN_PASSWORD
            if check_password_strength(password, username, settings.FIRST_SUPERADMIN_EMAIL):
                password = _generate_strong_password()
                _INITIAL_PASSWORD_FILE.write_text(
                    f"{settings.FIRST_SUPERADMIN_EMAIL}\n{password}\n", encoding="utf-8"
                )
                os.chmod(_INITIAL_PASSWORD_FILE, 0o600)
                logger.warning(
                    "已生成初始超级管理员随机口令，见 %s（首次登录后必须修改，并删除该文件）",
                    _INITIAL_PASSWORD_FILE.resolve(),
                )
            s.add(User(
                username=username,
                email=settings.FIRST_SUPERADMIN_EMAIL,
                password_hash=hash_password(password),
                role=Role.SUPER_ADMIN,
                must_change_password=True,
                student_id="00000000",
                real_name="超级管理员",
                phone="+8613800000000",
            ))
        elif verify_password("admin", existing.password_hash):
            # 旧版本默认 admin/admin 仍未修改：强制下次登录改密
            existing.must_change_password = True
            logger.warning("超级管理员仍在使用默认弱口令，已强制要求登录后修改")
        await s.commit()


def _generate_strong_password() -> str:
    while True:
        candidate = secrets.token_urlsafe(12) + secrets.choice("!@#$%^&*") + "Aa9"
        if not check_password_strength(candidate):
            return candidate


@asynccontextmanager
async def lifespan(app: FastAPI):
    await _init_db()
    yield


app = FastAPI(
    title="GDUECA 社团官网后端",
    description="广东第二师范学院计算机协会官网 FastAPI 后端 — 活动发布、报名收集、Bug 反馈、权限管理、数据导出",
    version="1.0.0",
    lifespan=lifespan,
    # 生产环境默认关闭接口文档，减少攻击面
    docs_url="/docs" if settings.ENABLE_API_DOCS else None,
    redoc_url="/redoc" if settings.ENABLE_API_DOCS else None,
    openapi_url="/openapi.json" if settings.ENABLE_API_DOCS else None,
)

# ---------- 中间件（后注册的在外层） ----------
# 1. CSRF：写请求校验 X-CSRF-Token 与来源（最内层，先于路由执行）
app.middleware("http")(csrf_middleware)
# 2. IP 黑名单 + Host 白名单
app.middleware("http")(ip_blacklist_middleware)
# 3. 安全响应头（覆盖所有响应，包括被拦截的请求）
app.middleware("http")(security_headers_middleware)
# 4. CORS：登录态走 Cookie，必须显式列出来源，禁止 "*"
#    推荐前端通过同源反代访问 /api（Next.js rewrites / Nginx），此时无需 CORS
if settings.cors_origins_list:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Content-Type", CSRF_HEADER],
        expose_headers=[TRACE_HEADER],
    )
# 5. traceId（最外层）：覆盖所有请求，包括被 CORS / 黑名单 / CSRF 拦截的请求
app.middleware("http")(trace_middleware)


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
