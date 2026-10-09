"""活动管理接口。"""
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.middleware import get_client_ip
from app.core.permissions import require_permission
from app.core.security import Role, get_optional_user, require_role, role_at_least
from app.db.models import (
    Activity,
    ActivityStatistics,
    ActivityStatus,
    AuditLog,
    Registration,
    RegistrationStatus,
    RegistrationType,
)
from app.db.session import get_db
from app.schemas.activity import ActivityCreate, ActivityOut, ActivityUpdate
from app.schemas.activity_stats import ActivityStatisticsOut
from app.schemas.register import RegistrationOut
from app.utils.crud import paginate
from app.utils.export import to_csv, to_xlsx

router = APIRouter(prefix="/api/activities", tags=["activities"])
admin_router = APIRouter(prefix="/api/admin/activities", tags=["activities-admin"])


def _log(db: AsyncSession, uid: int | None, action: str, target: str | None, ip: str | None):
    db.add(AuditLog(user_id=uid, action=action, target=target, ip=ip))


# 访客 / 普通成员可见的活动状态（草稿、归档仅后台可见）
_PUBLIC_STATUSES = ["published", "registration_open", "ended"]


def _can_see_all(user: dict | None) -> bool:
    return bool(user) and role_at_least(Role.EDITOR, Role(user["role"]))


# ---------- 状态自动识别 ----------
# 1. 预报名：now < register_start
# 2. 报名中：register_start ≤ now ≤ register_end
# 3. 即将进行：register_end < now < start_at
# 4. 进行中：start_at ≤ now ≤ end_at
# 5. 已结束：now > end_at
def _compute_runtime_status(a: Activity, now_naive: datetime) -> ActivityStatus | None:
    """根据当前时间计算活动运行时状态。

    返回 None 表示无法自动识别（关键字段时间缺失），保留数据库原状态。
    """
    # 已归档活动不做自动调整
    if a.status == ActivityStatus.ARCHIVED:
        return None
    # 草稿不自动晋升为已发布
    if a.status == ActivityStatus.DRAFT:
        return None
    if not a.end_at:
        return None
    if now_naive > a.end_at:
        return ActivityStatus.ENDED
    if a.start_at and now_naive >= a.start_at:
        # 活动已开始
        return ActivityStatus.PUBLISHED  # 进行中归为 published（兼容现有枚举）
    if a.register_end and now_naive > a.register_end:
        return ActivityStatus.PUBLISHED  # 报名结束但活动未开始 → 仍属 published
    if a.register_start and now_naive < a.register_start:
        return ActivityStatus.PUBLISHED  # 预报名阶段
    if a.register_start and a.register_end and a.register_start <= now_naive <= a.register_end:
        return ActivityStatus.REGISTRATION_OPEN
    return None


async def _refresh_status(a: Activity, db: AsyncSession) -> bool:
    """根据当前时间刷新活动状态；若状态改变则更新数据库。返回是否更新。"""
    now_naive = datetime.now(timezone.utc).replace(tzinfo=None)
    new_status = _compute_runtime_status(a, now_naive)
    if new_status is not None and new_status != a.status:
        a.status = new_status
        a.updated_at = datetime.now(timezone.utc)
        return True
    return False


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
    items = result.scalars().all()
    # 自动状态刷新（数据库可能有多条过期活动）
    changed = False
    for a in items:
        if await _refresh_status(a, db):
            changed = True
    if changed:
        await db.commit()
    return items


@router.get("/{activity_id}", response_model=ActivityOut)
async def get_activity(
    activity_id: int,
    user: dict | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    a = await db.get(Activity, activity_id)
    if not a or (a.status.value not in _PUBLIC_STATUSES and not _can_see_all(user)):
        raise HTTPException(status_code=404, detail="活动不存在")
    if await _refresh_status(a, db):
        await db.commit()
    return a


# ---------- 管理：创建 / 修改 / 删除 ----------
@router.post("", response_model=ActivityOut, status_code=status.HTTP_201_CREATED)
async def create_activity(
    req: ActivityCreate,
    request: Request,
    user: dict = Depends(require_permission("activities", "manage")),
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
    user: dict = Depends(require_permission("activities", "manage")),
    db: AsyncSession = Depends(get_db),
):
    a = await db.get(Activity, activity_id)
    if not a:
        raise HTTPException(status_code=404, detail="活动不存在")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(a, k, v)
    a.updated_at = datetime.now(timezone.utc)
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


# ==================== Phase 3 扩展：统计 + 导出 + finalize ====================

# ---------- 管理：报名明细（分页+筛选） ----------
@admin_router.get("/{activity_id}/registrations", response_model=dict)
async def admin_list_activity_registrations(
    activity_id: int,
    status_filter: Literal["pending", "approved", "rejected", "checked_in"] | None = Query(default=None),
    q: str | None = Query(default=None, max_length=64),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    user: dict = Depends(require_permission("activities", "view")),
    db: AsyncSession = Depends(get_db),
):
    from app.utils.crud import apply_eq, apply_search
    a = await db.get(Activity, activity_id)
    if not a:
        raise HTTPException(status_code=404, detail="活动不存在")
    stmt = select(Registration).where(
        Registration.activity_id == activity_id,
        Registration.registration_type == RegistrationType.ACTIVITY,
    )
    if status_filter:
        stmt = apply_eq(stmt, Registration.status, RegistrationStatus(status_filter))
    stmt = apply_search(stmt, [Registration.name, Registration.student_id, Registration.college], q)
    stmt = stmt.order_by(Registration.submitted_at.desc())
    return await paginate(db, stmt, page, page_size, out_model=RegistrationOut)


# ---------- 管理：finalize — 已结束活动生成统计快照 ----------
@admin_router.post("/{activity_id}/finalize", response_model=ActivityStatisticsOut)
async def admin_finalize_activity(
    activity_id: int,
    request: Request,
    user: dict = Depends(require_permission("activities", "manage")),
    db: AsyncSession = Depends(get_db),
):
    """已结束活动生成/刷新报名统计快照。

    - 必须是 status=ended 的活动（或 end_at < now，会自动先转 ended）
    - 统计 total/pending/approved/rejected/checked_in
    - 已存在则覆盖更新，不重复创建
    """
    a = await db.get(Activity, activity_id)
    if not a:
        raise HTTPException(status_code=404, detail="活动不存在")
    # 强制刷新状态
    if await _refresh_status(a, db):
        await db.flush()
    if a.status != ActivityStatus.ENDED:
        raise HTTPException(status_code=400, detail="活动尚未结束，无法生成统计快照")

    # 计算各项数量
    base_filter = [
        Registration.activity_id == activity_id,
        Registration.registration_type == RegistrationType.ACTIVITY,
    ]
    total = (await db.execute(
        select(func.count()).select_from(Registration).where(*base_filter)
    )).scalar_one()
    pending = (await db.execute(
        select(func.count()).select_from(Registration).where(*base_filter, Registration.status == RegistrationStatus.PENDING)
    )).scalar_one()
    approved = (await db.execute(
        select(func.count()).select_from(Registration).where(*base_filter, Registration.status == RegistrationStatus.APPROVED)
    )).scalar_one()
    rejected = (await db.execute(
        select(func.count()).select_from(Registration).where(*base_filter, Registration.status == RegistrationStatus.REJECTED)
    )).scalar_one()
    checked_in = (await db.execute(
        select(func.count()).select_from(Registration).where(*base_filter, Registration.status == RegistrationStatus.CHECKED_IN)
    )).scalar_one()

    existing = (
        await db.execute(select(ActivityStatistics).where(ActivityStatistics.activity_id == activity_id))
    ).scalar_one_or_none()
    if existing:
        existing.total = total
        existing.pending = pending
        existing.approved = approved
        existing.rejected = rejected
        existing.checked_in = checked_in
        existing.generated_at = datetime.now(timezone.utc)
        stat = existing
    else:
        stat = ActivityStatistics(
            activity_id=activity_id,
            total=total,
            pending=pending,
            approved=approved,
            rejected=rejected,
            checked_in=checked_in,
        )
        db.add(stat)
    _log(db, int(user["user_id"]), "activity.finalize", f"activity:{activity_id}",
         get_client_ip(request))
    await db.commit()
    await db.refresh(stat)
    return stat


# ---------- 管理：读取统计快照 ----------
@admin_router.get("/{activity_id}/statistics", response_model=ActivityStatisticsOut)
async def admin_get_activity_statistics(
    activity_id: int,
    user: dict = Depends(require_permission("activities", "view")),
    db: AsyncSession = Depends(get_db),
):
    a = await db.get(Activity, activity_id)
    if not a:
        raise HTTPException(status_code=404, detail="活动不存在")
    stat = (
        await db.execute(select(ActivityStatistics).where(ActivityStatistics.activity_id == activity_id))
    ).scalar_one_or_none()
    if not stat:
        raise HTTPException(status_code=404, detail="暂无统计快照，请先 finalize")
    return stat


# ---------- 管理：导出活动报名明细 CSV/XLSX ----------
@admin_router.get("/{activity_id}/export")
async def admin_export_activity_registrations(
    activity_id: int,
    format: Literal["csv", "xlsx"] = Query(default="csv"),
    status_filter: Literal["pending", "approved", "rejected", "checked_in"] | None = Query(default=None),
    user: dict = Depends(require_permission("activities", "view")),
    db: AsyncSession = Depends(get_db),
):
    a = await db.get(Activity, activity_id)
    if not a:
        raise HTTPException(status_code=404, detail="活动不存在")
    stmt = select(Registration).where(
        Registration.activity_id == activity_id,
        Registration.registration_type == RegistrationType.ACTIVITY,
    )
    if status_filter:
        stmt = stmt.where(Registration.status == RegistrationStatus(status_filter))
    stmt = stmt.order_by(Registration.submitted_at.desc())
    rows = (await db.execute(stmt)).scalars().all()

    headers = [
        ("姓名", "name"),
        ("学号", "student_id"),
        ("学院", "college"),
        ("专业", "major"),
        ("区号", "phone_cc"),
        ("手机号", "phone_number"),
        ("邮箱", "email"),
        ("状态", "status"),
        ("备注", "remark"),
        ("签到时间", "checked_in_at"),
        ("提交时间", "submitted_at"),
        ("提交IP", "submit_ip"),
    ]
    if format == "xlsx":
        data = to_xlsx(rows, headers, text_columns={"student_id", "phone_number"},
                       sheet_title=f"活动报名_{activity_id}")
        return Response(content=data, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        headers={"Content-Disposition": f'attachment; filename="activity_{activity_id}_registrations.xlsx"'})
    data = to_csv(rows, headers, free_text_keys={"name", "college", "major", "email", "remark"})
    return Response(content=data, media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="activity_{activity_id}_registrations.csv"'})
