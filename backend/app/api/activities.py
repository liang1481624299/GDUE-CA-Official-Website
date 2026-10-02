"""活动管理接口。"""
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.middleware import get_client_ip
from app.core.security import Role, get_optional_user, require_role, role_at_least
from app.db.models import Activity, AuditLog
from app.db.session import get_db
from app.schemas.activity import ActivityCreate, ActivityOut, ActivityUpdate

router = APIRouter(prefix="/api/activities", tags=["activities"])


def _log(db: AsyncSession, uid: int | None, action: str, target: str | None, ip: str | None):
    db.add(AuditLog(user_id=uid, action=action, target=target, ip=ip))


# 访客 / 普通成员可见的活动状态（草稿、归档仅后台可见）
_PUBLIC_STATUSES = ["published", "registration_open", "ended"]


def _can_see_all(user: dict | None) -> bool:
    return bool(user) and role_at_least(Role.EDITOR, Role(user["role"]))


# ---------- 公开：获取已发布活动（管理员可查看全部） ----------
@router.get("", response_model=list[ActivityOut])
async def list_activities(
    status_filter: Literal["all", "published", "registration_open"] = "published",
    category: str | None = Query(default=None, max_length=64),
    user: dict | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Activity)
    if status_filter == "all" and not _can_see_all(user):
        stmt = stmt.where(Activity.status.in_(_PUBLIC_STATUSES))
    if status_filter == "published":
        stmt = stmt.where(Activity.status.in_(["published", "registration_open"]))
    elif status_filter == "registration_open":
        stmt = stmt.where(Activity.status == "registration_open")
    if category:
        stmt = stmt.where(Activity.category == category)
    stmt = stmt.order_by(Activity.register_start.desc().nullslast(), Activity.id.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{activity_id}", response_model=ActivityOut)
async def get_activity(
    activity_id: int,
    user: dict | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    a = await db.get(Activity, activity_id)
    if not a or (a.status.value not in _PUBLIC_STATUSES and not _can_see_all(user)):
        raise HTTPException(status_code=404, detail="活动不存在")
    return a


# ---------- 管理：创建 / 修改 / 删除 ----------
@router.post("", response_model=ActivityOut, status_code=status.HTTP_201_CREATED)
async def create_activity(
    req: ActivityCreate,
    request: Request,
    user: dict = Depends(require_role(Role.EDITOR)),
    db: AsyncSession = Depends(get_db),
):
    a = Activity(**req.model_dump(), created_by=int(user["user_id"]))
    db.add(a)
    await db.flush()
    _log(db, int(user["user_id"]), "activity.create", f"activity:{a.id}",
         get_client_ip(request))
    return a


@router.patch("/{activity_id}", response_model=ActivityOut)
async def update_activity(
    activity_id: int,
    req: ActivityUpdate,
    request: Request,
    user: dict = Depends(require_role(Role.EDITOR)),
    db: AsyncSession = Depends(get_db),
):
    a = await db.get(Activity, activity_id)
    if not a:
        raise HTTPException(status_code=404, detail="活动不存在")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(a, k, v)
    a.updated_at = datetime.now()
    _log(db, int(user["user_id"]), "activity.update", f"activity:{activity_id}",
         get_client_ip(request))
    return a


@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_activity(
    activity_id: int,
    request: Request,
    user: dict = Depends(require_role(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    a = await db.get(Activity, activity_id)
    if not a:
        raise HTTPException(status_code=404, detail="活动不存在")
    await db.delete(a)
    _log(db, int(user["user_id"]), "activity.delete", f"activity:{activity_id}",
         get_client_ip(request))
