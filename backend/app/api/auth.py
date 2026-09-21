"""认证接口：登录、当前用户、用户管理、改密、忘记密码、安全问题恢复、个人资料、头像上传。"""
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    Role,
    create_access_token,
    hash_password,
    require_role,
    verify_password,
)
from app.db.models import (
    AuditLog,
    PasswordResetRequest,
    SecurityQuestion,
    User,
    UserRole,
)
from app.db.session import get_db
from app.schemas.auth import (
    AvatarUploadOut,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    PasswordResetHandleRequest,
    PasswordResetOut,
    ProfileUpdate,
    SecurityAnswerRequest,
    SecurityQuestionOut,
    SecurityQuestionUpdate,
    TokenResponse,
    UserCreate,
    UserOut,
    UserUpdate,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _log(db: AsyncSession, user_id: int | None, action: str, detail: str | None, ip: str | None):
    db.add(AuditLog(user_id=user_id, action=action, detail=detail, ip=ip))


# ---------- 登录 ----------
@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    if not req.username and not req.email:
        raise HTTPException(status_code=400, detail="必须提供 username 或 email")
    stmt = select(User).where(
        or_(
            User.username == req.username,
            User.email == req.email,
        )
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="账号或密码错误")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="账号已停用")
    token = create_access_token(str(user.id), user.role)
    _log(db, user.id, "login", None, request.client.host if request.client else None)
    return TokenResponse(
        access_token=token,
        role=user.role,
        username=user.username,
        must_change_password=user.must_change_password,
    )


# ---------- 当前用户 ----------
@router.get("/me", response_model=UserOut)
async def me(user: dict = Depends(require_role(Role.EDITOR)), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == int(user["user_id"])))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="用户不存在")
    return u


# ---------- 个人资料 ----------
ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_AVATAR_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
AVATAR_MAX_SIZE = 5 * 1024 * 1024  # 5MB
AVATAR_DIR = Path("uploads/avatars")


@router.get("/profile", response_model=UserOut)
async def get_profile(
    user: dict = Depends(require_role(Role.EDITOR)),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户完整资料。"""
    result = await db.execute(select(User).where(User.id == int(user["user_id"])))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="用户不存在")
    return u


@router.put("/profile", response_model=UserOut)
async def update_profile(
    req: ProfileUpdate,
    request: Request,
    user: dict = Depends(require_role(Role.EDITOR)),
    db: AsyncSession = Depends(get_db),
):
    """更新个人资料：显示名称、真实姓名、手机号、学号。"""
    result = await db.execute(select(User).where(User.id == int(user["user_id"])))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="用户不存在")

    # 检查 username 唯一性（如修改了）
    if req.username and req.username != u.username:
        dup = await db.execute(select(User).where(User.username == req.username))
        if dup.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="显示名称已存在")
        u.username = req.username
    if req.real_name is not None:
        u.real_name = req.real_name
    if req.phone is not None:
        u.phone = req.phone
    if req.student_id is not None:
        u.student_id = req.student_id

    _log(db, u.id, "profile.update", None, request.client.host if request.client else None)
    await db.commit()
    await db.refresh(u)
    return u


@router.post("/avatar", response_model=AvatarUploadOut)
async def upload_avatar(
    request: Request,
    file: UploadFile = File(...),
    user: dict = Depends(require_role(Role.EDITOR)),
    db: AsyncSession = Depends(get_db),
):
    """上传头像（jpg/png/webp，最大 5MB）。"""
    # 验证文件类型
    if file.content_type not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(status_code=400, detail="仅支持 JPG/PNG/WEBP 格式")

    # 读取并验证大小
    data = await file.read()
    if len(data) > AVATAR_MAX_SIZE:
        raise HTTPException(status_code=400, detail="文件大小不能超过 5MB")

    # 生成文件名
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_AVATAR_EXTS:
        ext = ".jpg"  # 回退
    filename = f"{user['user_id']}_{uuid.uuid4().hex[:8]}{ext}"

    # 确保目录存在
    AVATAR_DIR.mkdir(parents=True, exist_ok=True)
    filepath = AVATAR_DIR / filename
    filepath.write_bytes(data)

    # 更新数据库
    avatar_url = f"/uploads/avatars/{filename}"
    result = await db.execute(select(User).where(User.id == int(user["user_id"])))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="用户不存在")

    # 删除旧头像文件
    if u.avatar_url:
        old_path = Path(u.avatar_url.lstrip("/"))
        if old_path.exists():
            old_path.unlink(missing_ok=True)

    u.avatar_url = avatar_url
    _log(db, u.id, "avatar.upload", None, request.client.host if request.client else None)
    await db.commit()

    return AvatarUploadOut(avatar_url=avatar_url)


# ---------- 修改密码 ----------
@router.post("/change-password")
async def change_password(
    req: ChangePasswordRequest,
    request: Request,
    user: dict = Depends(require_role(Role.EDITOR)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == int(user["user_id"])))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="用户不存在")
    if not verify_password(req.old_password, u.password_hash):
        raise HTTPException(status_code=400, detail="旧密码错误")
    u.password_hash = hash_password(req.new_password)
    u.must_change_password = False
    _log(db, u.id, "password.change", None, request.client.host if request.client else None)
    await db.commit()
    return {"ok": True}


# ---------- 用户管理（仅 super_admin） ----------
@router.get("/users", response_model=list[UserOut])
async def list_users(
    user: dict = Depends(require_role(Role.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).order_by(User.id))
    return result.scalars().all()


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    req: UserCreate,
    request: Request,
    user: dict = Depends(require_role(Role.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    # 查重
    existing = await db.execute(
        select(User).where(or_(User.username == req.username, User.email == req.email))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="用户名或邮箱已存在")
    new_user = User(
        username=req.username,
        email=req.email,
        password_hash=hash_password(req.password),
        role=req.role,
        student_id=req.student_id,
        real_name=req.real_name,
        phone=req.phone,
    )
    db.add(new_user)
    await db.flush()
    _log(db, int(user["user_id"]), "user.create", f"user:{new_user.id} role:{req.role.value}",
         request.client.host if request.client else None)
    return new_user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    request: Request,
    user: dict = Depends(require_role(Role.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    if int(user["user_id"]) == user_id:
        raise HTTPException(status_code=400, detail="不能删除自己")
    u = await db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="用户不存在")
    await db.delete(u)
    _log(db, int(user["user_id"]), "user.delete", f"user:{user_id}",
         request.client.host if request.client else None)


@router.put("/users/{user_id}", response_model=UserOut)
async def update_user(
    user_id: int,
    req: UserUpdate,
    request: Request,
    user: dict = Depends(require_role(Role.EDITOR)),
    db: AsyncSession = Depends(get_db),
):
    """更新账号信息：自己可改基础资料，super_admin 额外可改 role/is_active。"""
    is_self = int(user["user_id"]) == user_id
    is_super = user["role"] == Role.SUPER_ADMIN.value
    if not (is_self or is_super):
        raise HTTPException(status_code=403, detail="只能修改自己的信息")

    u = await db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="用户不存在")

    if req.username is not None and req.username != u.username:
        dup = await db.execute(select(User).where(User.username == req.username))
        if dup.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="显示名称已存在")
        u.username = req.username
    if req.real_name is not None:
        u.real_name = req.real_name
    if req.student_id is not None:
        u.student_id = req.student_id
    if req.phone is not None:
        u.phone = req.phone

    # 仅 super_admin 可改角色和停用状态
    if is_super:
        if req.role is not None:
            u.role = req.role
        if req.is_active is not None:
            u.is_active = req.is_active

    _log(db, int(user["user_id"]), "user.update", f"user:{user_id}",
         request.client.host if request.client else None)
    await db.commit()
    await db.refresh(u)
    return u


# ---------- 忘记密码申请（公开） ----------
@router.post("/forgot-password", status_code=status.HTTP_201_CREATED)
async def submit_forgot_password(
    req: ForgotPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """访客提交忘记密码申请，管理员审核后手动联系处理。"""
    reset_req = PasswordResetRequest(
        contact_email=req.contact_email,
        username_hint=req.username_hint,
        reason=req.reason,
    )
    db.add(reset_req)
    await db.flush()
    _log(db, None, "password_reset.submit", f"reset:{reset_req.id}",
         request.client.host if request.client else None)
    await db.commit()
    return {"ok": True, "id": reset_req.id}


# ---------- 忘记密码申请列表（仅 admin+） ----------
@router.get("/password-resets", response_model=list[PasswordResetOut])
async def list_password_resets(
    status_filter: str | None = None,
    user: dict = Depends(require_role(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(PasswordResetRequest)
    if status_filter:
        stmt = stmt.where(PasswordResetRequest.status == status_filter)
    stmt = stmt.order_by(PasswordResetRequest.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


# ---------- 处理忘记密码申请（仅 admin+） ----------
@router.patch("/password-resets/{reset_id}", response_model=PasswordResetOut)
async def handle_password_reset(
    reset_id: int,
    req: PasswordResetHandleRequest,
    user: dict = Depends(require_role(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    reset_req = await db.get(PasswordResetRequest, reset_id)
    if not reset_req:
        raise HTTPException(status_code=404, detail="申请不存在")
    reset_req.status = req.status
    reset_req.admin_note = req.admin_note
    reset_req.handled_by = int(user["user_id"])
    reset_req.handled_at = datetime.now(timezone.utc)
    await db.commit()
    return reset_req


# ---------- 安全问题（公开获取问题） ----------
@router.get("/security-question", response_model=SecurityQuestionOut)
async def get_security_question(db: AsyncSession = Depends(get_db)):
    """公开接口：返回当前安全问题（不含答案），用于紧急恢复页面。"""
    q = await db.get(SecurityQuestion, 1)
    if not q:
        raise HTTPException(status_code=404, detail="未配置安全问题")
    return SecurityQuestionOut(question=q.question)


# ---------- 安全问题紧急恢复（公开） ----------
@router.post("/recover")
async def recover_via_security_question(
    req: SecurityAnswerRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """所有管理员失能时的紧急恢复：答对安全问题 → 重置超管密码并重新启用。"""
    q = await db.get(SecurityQuestion, 1)
    if not q:
        raise HTTPException(status_code=404, detail="未配置安全问题")
    # 大小写不敏感、去空格比较
    if req.answer.strip().lower() != q.answer.strip().lower():
        raise HTTPException(status_code=403, detail="安全问题答案错误")
    # 找到 super_admin 账号，重置密码并重新启用
    result = await db.execute(
        select(User).where(User.role == UserRole.SUPER_ADMIN).order_by(User.id)
    )
    super_admin = result.scalars().first()
    if not super_admin:
        raise HTTPException(status_code=404, detail="未找到超级管理员账号")
    super_admin.password_hash = hash_password(req.new_password)
    super_admin.is_active = True
    super_admin.must_change_password = True
    _log(db, super_admin.id, "account.recover", None,
         request.client.host if request.client else None)
    await db.commit()
    return {"ok": True, "username": super_admin.username}


# ---------- 安全问题管理（仅 super_admin） ----------
@router.put("/security-question", response_model=SecurityQuestionOut)
async def update_security_question(
    req: SecurityQuestionUpdate,
    user: dict = Depends(require_role(Role.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    q = await db.get(SecurityQuestion, 1)
    if not q:
        q = SecurityQuestion(id=1, question=req.question, answer=req.answer)
        db.add(q)
    else:
        q.question = req.question
        q.answer = req.answer
    await db.commit()
    return SecurityQuestionOut(question=q.question)
