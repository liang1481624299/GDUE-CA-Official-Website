"""成员管理接口（现任/往届、归档、头像上传）。

公开接口：GET /api/members 按 display_order 升序，过滤归档项。
管理接口：CRUD + 头像上传（5MB 限制 + 仅图片 + 自动压缩）。
"""
import io
import uuid
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from PIL import Image
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.middleware import get_client_ip
from app.core.permissions import require_permission
from app.db.models import AuditLog, MediaCategory, MediaFile, Member, MemberTerm
from app.db.session import get_db
from app.schemas.member import AvatarUploadOut, MemberCreate, MemberOut, MemberUpdate
from app.utils.crud import apply_eq, apply_search, paginate

public_router = APIRouter(prefix="/api/members", tags=["members-public"])
admin_router = APIRouter(prefix="/api/admin/members", tags=["members-admin"])

MEMBER_AVATAR_DIR = Path("uploads/members")
MEMBER_AVATAR_MAX_SIZE = 5 * 1024 * 1024  # 5MB


def _log(db: AsyncSession, uid: int, action: str, target: str | None, ip: str | None):
    db.add(AuditLog(user_id=uid, action=action, target=target, ip=ip))


def _sniff_image(data: bytes) -> str | None:
    """按文件头魔数识别图片类型。"""
    if data.startswith(b"\xff\xd8\xff"):
        return "JPEG"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "PNG"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "WEBP"
    return None


def _compress_avatar(data: bytes, fmt: str) -> tuple[bytes, str, str]:
    """头像压缩：限制最长边 512px，统一输出 JPEG quality=85（体积小，预览清晰）。

    返回 (压缩后字节, 扩展名, mime)。
    """
    img = Image.open(io.BytesIO(data))
    # 转 RGB（PNG 带 alpha 通道时无法直接存 JPEG）
    if img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGB")
    # 最长边 512px
    max_side = 512
    if max(img.size) > max_side:
        ratio = max_side / max(img.size)
        img = img.resize(
            (int(img.size[0] * ratio), int(img.size[1] * ratio)),
            Image.Resampling.LANCZOS,
        )
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85, optimize=True)
    return buf.getvalue(), ".jpg", "image/jpeg"


# ---------- 公开：成员列表 ----------
@public_router.get("", response_model=list[MemberOut])
async def list_public_members(
    term: Literal["current", "former"] | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """前端公开：按 display_order 升序，过滤归档项。"""
    stmt = select(Member).where(Member.archived.is_(False))
    if term:
        stmt = stmt.where(Member.term == MemberTerm(term))
    stmt = stmt.order_by(Member.display_order.asc(), Member.id.asc())
    result = await db.execute(stmt)
    return result.scalars().all()


# ---------- 管理：分页列表 ----------
@admin_router.get("", response_model=dict)
async def admin_list_members(
    term: Literal["current", "former"] | None = Query(default=None),
    archived: bool | None = Query(default=None),
    q: str | None = Query(default=None, max_length=64),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    user: dict = Depends(require_permission("members", "view")),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Member)
    if term:
        stmt = apply_eq(stmt, Member.term, MemberTerm(term))
    if archived is not None:
        stmt = apply_eq(stmt, Member.archived, archived)
    stmt = apply_search(stmt, [Member.name, Member.role_title, Member.bio], q)
    stmt = stmt.order_by(Member.display_order.asc(), Member.id.asc())
    return await paginate(db, stmt, page, page_size, out_model=MemberOut)


# ---------- 管理：单条详情 ----------
@admin_router.get("/{mid}", response_model=MemberOut)
async def admin_get_member(
    mid: int,
    user: dict = Depends(require_permission("members", "view")),
    db: AsyncSession = Depends(get_db),
):
    m = await db.get(Member, mid)
    if not m:
        raise HTTPException(status_code=404, detail="成员不存在")
    return m


# ---------- 管理：创建 ----------
@admin_router.post("", response_model=MemberOut, status_code=status.HTTP_201_CREATED)
async def admin_create_member(
    req: MemberCreate,
    request: Request,
    user: dict = Depends(require_permission("members", "manage")),
    db: AsyncSession = Depends(get_db),
):
    m = Member(
        name=req.name,
        role_title=req.role_title,
        term=MemberTerm(req.term),
        bio=req.bio,
        avatar_url=req.avatar_url,
        display_order=req.display_order,
        archived=req.archived,
    )
    db.add(m)
    _log(db, int(user["user_id"]), "member.create", None, get_client_ip(request))
    await db.commit()
    await db.refresh(m)
    return m


# ---------- 管理：更新 ----------
@admin_router.put("/{mid}", response_model=MemberOut)
async def admin_update_member(
    mid: int,
    req: MemberUpdate,
    request: Request,
    user: dict = Depends(require_permission("members", "manage")),
    db: AsyncSession = Depends(get_db),
):
    m = await db.get(Member, mid)
    if not m:
        raise HTTPException(status_code=404, detail="成员不存在")

    data = req.model_dump(exclude_unset=True)
    if "term" in data and data["term"] is not None:
        m.term = MemberTerm(data["term"])
    for k in ("name", "role_title", "bio", "avatar_url", "display_order", "archived"):
        if k in data:
            setattr(m, k, data[k])
    _log(db, int(user["user_id"]), "member.update", f"member:{mid}", get_client_ip(request))
    await db.commit()
    await db.refresh(m)
    return m


# ---------- 管理：删除 ----------
@admin_router.delete("/{mid}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_member(
    mid: int,
    request: Request,
    user: dict = Depends(require_permission("members", "manage")),
    db: AsyncSession = Depends(get_db),
):
    m = await db.get(Member, mid)
    if not m:
        raise HTTPException(status_code=404, detail="成员不存在")
    # 删除成员头像文件
    if m.avatar_url:
        try:
            old_path = (MEMBER_AVATAR_DIR / Path(m.avatar_url).name).resolve()
            if old_path.parent == MEMBER_AVATAR_DIR.resolve() and old_path.exists():
                old_path.unlink(missing_ok=True)
        except Exception:
            pass
    await db.delete(m)
    _log(db, int(user["user_id"]), "member.delete", f"member:{mid}", get_client_ip(request))
    await db.commit()


# ---------- 管理：头像上传 ----------
@admin_router.post("/avatar", response_model=AvatarUploadOut)
async def admin_upload_member_avatar(
    request: Request,
    file: UploadFile = File(...),
    user: dict = Depends(require_permission("members", "manage")),
    db: AsyncSession = Depends(get_db),
):
    """成员头像上传：jpg/png/webp，最大 5MB，自动压缩到最长边 512px。

    返回压缩后的图片 URL，前端直接写入 member.avatar_url 字段。
    """
    data = await file.read(MEMBER_AVATAR_MAX_SIZE + 1)
    if len(data) > MEMBER_AVATAR_MAX_SIZE:
        raise HTTPException(status_code=400, detail="文件大小不能超过 5MB")
    fmt = _sniff_image(data)
    if not fmt:
        raise HTTPException(status_code=400, detail="仅支持 JPG/PNG/WEBP 格式")

    # 压缩
    compressed, ext, mime = _compress_avatar(data, fmt)

    filename = f"member_{uuid.uuid4().hex}{ext}"
    MEMBER_AVATAR_DIR.mkdir(parents=True, exist_ok=True)
    (MEMBER_AVATAR_DIR / filename).write_bytes(compressed)
    avatar_url = f"/uploads/members/{filename}"

    # 记录到 media_files
    media = MediaFile(
        filename=filename,
        original_name=file.filename,
        mime=mime,
        size=len(compressed),
        storage_path=f"uploads/members/{filename}",
        uploader_id=int(user["user_id"]),
        category=MediaCategory.MEMBER,
    )
    db.add(media)
    _log(db, int(user["user_id"]), "member.avatar.upload", None, get_client_ip(request))
    await db.commit()
    return AvatarUploadOut(avatar_url=avatar_url)
