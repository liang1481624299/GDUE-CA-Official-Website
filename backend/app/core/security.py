"""JWT 认证、密码加密、权限依赖、登录会话校验。"""
from datetime import UTC, datetime, timedelta
from enum import Enum
from typing import Annotated

import bcrypt
from fastapi import Depends, HTTPException, status, Request
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_db

settings = get_settings()

# ---------- 登录会话超时常量 ----------
# 默认空闲超时：30 分钟无任何认证请求 → 会话失效
IDLE_TIMEOUT = timedelta(minutes=30)
# 勾选「记住此设备」：空闲超时放宽到 30 天
IDLE_TIMEOUT_REMEMBER = timedelta(days=30)
# 「记住此设备」token 硬顶：30 天
REMEMBER_DEVICE_DAYS = 30


# ---------- 角色 ----------
class Role(str, Enum):
    SUPER_ADMIN = "super_admin"  # 超级管理员：全部权限 + 可管理管理员账号
    ADMIN = "admin"              # 管理员：活动管理、报名审核、Bug查看、导出
    EDITOR = "editor"            # 编辑：仅活动内容编辑、查看报名/ Bug


ROLE_RANK = {Role.EDITOR: 1, Role.ADMIN: 2, Role.SUPER_ADMIN: 3}


def role_at_least(required: Role, user_role: Role) -> bool:
    """判断 user_role 是否 >= required"""
    return ROLE_RANK.get(user_role, 0) >= ROLE_RANK[required]


# ---------- 密码（直接用 bcrypt，绕过 passlib 在 Python 3.14 上的兼容性 bug） ----------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


# ---------- JWT ----------
def create_access_token(
    sub: str,
    role: Role,
    session_id: str | None = None,
    expires_delta: timedelta | None = None,
) -> str:
    expire = datetime.now(UTC) + (expires_delta or timedelta(hours=settings.JWT_EXPIRE_HOURS))
    payload = {"sub": sub, "role": role.value, "exp": int(expire.timestamp())}
    if session_id:
        payload["jti"] = session_id
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"token无效或过期: {e}")


# ---------- 依赖 ----------
def get_current_user(request: Request) -> dict:
    """从 Authorization: Bearer xxx 解析出 {user_id, role, jti}"""
    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="缺少 Authorization 头")
    payload = decode_token(auth[7:])
    return {
        "user_id": payload.get("sub"),
        "role": payload.get("role"),
        "jti": payload.get("jti"),
    }


def require_role(required: Role):
    """角色权限依赖：确保当前用户角色 >= required，并校验登录会话状态。

    会话校验（jti 存在时；旧 token 无 jti 向后兼容直接放行）：
    - 已踢出 / 已撤销 → 401
    - 超过会话硬顶（expires_at）→ 401
    - 空闲超过 IDLE_TIMEOUT（30 分钟）或 IDLE_TIMEOUT_REMEMBER（记住此设备 30 天）→ 401
    - 正常请求 → 滑动续期（刷新 last_active_at，活跃用户会话自动延长）
    """
    async def _dep(
        user: Annotated[dict, Depends(get_current_user)],
        db: AsyncSession = Depends(get_db),
    ):
        try:
            user_role = Role(user["role"])
        except (KeyError, ValueError):
            raise HTTPException(status_code=401, detail="token 缺少 role")
        if not role_at_least(required, user_role):
            raise HTTPException(status_code=403, detail=f"需要 {required.value} 及以上权限")

        # 登录会话状态校验
        jti = user.get("jti")
        if jti:
            from app.db.models import LoginSession
            row = await db.execute(
                select(LoginSession).where(LoginSession.session_id == jti)
            )
            sess = row.scalar_one_or_none()
            now = datetime.now(UTC).replace(tzinfo=None)
            if not sess or sess.revoked or now > sess.expires_at:
                raise HTTPException(status_code=401, detail="登录会话已失效，请重新登录")
            idle_limit = IDLE_TIMEOUT_REMEMBER if sess.remember_device else IDLE_TIMEOUT
            if now - sess.last_active_at > idle_limit:
                raise HTTPException(status_code=401, detail="登录已超时，请重新登录")
            # 滑动续期：活跃请求自动延长会话有效期
            sess.last_active_at = now
        return user
    return _dep
