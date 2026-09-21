"""活动管理接口。"""
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import Role, require_role
from app.db.models import Activity, AuditLog
from app.db.session import get_db
from app.schemas.activity import ActivityCreate, ActivityOut, ActivityUpdate

router = APIRouter(prefix="/api/activities", tags=["activities"])


def _log(db: AsyncSession, uid: int | None, action: str, target: str | None, ip: str | None):
    db.add(AuditLog(user_id=uid, action=action, target=target, ip=ip))


# ---------- 公开：获取已发布活动 ----------
@router.get("", response_model=list[ActivityOut])
async def list_activities(
    status_filter: Literal["all", "published", "registration_open"] = "published",
    category: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Activity)
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
async def get_activity(activity_id: int, db: AsyncSession = Depends(get_db)):
    a = await db.get(Activity, activity_id)
    if not a:
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
         request.client.host if request.client else None)
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
         request.client.host if request.client else None)
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
         request.client.host if request.client else None)
