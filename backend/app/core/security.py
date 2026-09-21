"""JWT 认证、密码加密、权限依赖。"""
from datetime import UTC, datetime, timedelta
from enum import Enum
from typing import Annotated

import bcrypt
from fastapi import Depends, HTTPException, status, Request
from jose import JWTError, jwt

from app.core.config import get_settings

settings = get_settings()


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
def create_access_token(sub: str, role: Role) -> str:
    expire = datetime.now(UTC) + timedelta(hours=settings.JWT_EXPIRE_HOURS)
    payload = {"sub": sub, "role": role.value, "exp": int(expire.timestamp())}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"token无效或过期: {e}")


# ---------- 依赖 ----------
def get_current_user(request: Request) -> dict:
    """从 Authorization: Bearer xxx 解析出 {user_id, role}"""
    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="缺少 Authorization 头")
    payload = decode_token(auth[7:])
    return {"user_id": payload.get("sub"), "role": payload.get("role")}


def require_role(required: Role):
    """角色权限依赖：确保当前用户角色 >= required"""
    def _dep(user: Annotated[dict, Depends(get_current_user)]):
        try:
            user_role = Role(user["role"])
        except (KeyError, ValueError):
            raise HTTPException(status_code=401, detail="token 缺少 role")
        if not role_at_least(required, user_role):
            raise HTTPException(status_code=403, detail=f"需要 {required.value} 及以上权限")
        return user
    return _dep
