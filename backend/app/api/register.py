"""报名表单：访客提交（活动/社团 两种）+ 管理员审阅 / 导出。"""
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import Role, require_role
from app.db.models import Activity, AuditLog, Registration, RegistrationType
from app.db.session import get_db
from app.schemas.register import (
    RegistrationCreate,
    RegistrationOut,
    RegistrationStatus,
    RegistrationType as RegistrationTypeSchema,
)
from app.utils.export import registrations_to_csv, registrations_to_xlsx

router = APIRouter(prefix="/api/registrations", tags=["registrations"])


def _log(db: AsyncSession, uid: int | None, action: str, target: str | None, ip: str | None):
    db.add(AuditLog(user_id=uid, action=action, target=target, ip=ip))


# ---------- 活动报名（公开，按活动） ----------
@router.post("/for/{activity_id}", response_model=RegistrationOut, status_code=status.HTTP_201_CREATED)
async def submit_for_activity(
    activity_id: int,
    req: RegistrationCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    activity = await db.get(Activity, activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="活动不存在")

    # 状态检查
    if activity.status not in ("published", "registration_open"):
        raise HTTPException(status_code=400, detail="活动当前不接受报名")
    if activity.register_start and datetime.now() < activity.register_start:
        raise HTTPException(status_code=400, detail="报名尚未开始")
    if activity.register_end and datetime.now() > activity.register_end:
        raise HTTPException(status_code=400, detail="报名已截止")

    # 人数上限
    if activity.max_participants > 0:
        count = await db.execute(
            select(func.count()).select_from(Registration).where(
                Registration.activity_id == activity_id,
                Registration.status.in_(["pending", "approved", "checked_in"]),
            )
        )
        if count.scalar() >= activity.max_participants:
            raise HTTPException(status_code=400, detail="报名人数已满")

    reg = Registration(
        registration_type=RegistrationType.ACTIVITY,
        activity_id=activity_id,
        **req.model_dump(),
    )
    db.add(reg)
    await db.flush()
    _log(db, None, "registration.activity.submit", f"activity:{activity_id}",
         request.client.host if request.client else None)
    return reg


# ---------- 社团报名（公开，意向部门入会，无需关联活动） ----------
@router.post("/club", response_model=RegistrationOut, status_code=status.HTTP_201_CREATED)
async def submit_club_registration(
    req: RegistrationCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    if not req.position:
        raise HTTPException(status_code=400, detail="社团报名必须填写意向部门")

    reg = Registration(
        registration_type=RegistrationType.CLUB,
        activity_id=None,
        **req.model_dump(),
    )
    db.add(reg)
    await db.flush()
    _log(db, None, "registration.club.submit", None,
         request.client.host if request.client else None)
    return reg


# ---------- 管理员：列表 + 筛选 ----------
@router.get("", response_model=list[RegistrationOut])
async def list_registrations(
    activity_id: int | None = Query(default=None),
    status_filter: RegistrationStatus | None = Query(default=None, alias="status"),
    type_filter: RegistrationTypeSchema | None = Query(default=None, alias="registration_type"),
    keyword: str | None = None,
    page: int = 1,
    per_page: int = 50,
    user: dict = Depends(require_role(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Registration)
    if activity_id:
        stmt = stmt.where(Registration.activity_id == activity_id)
    if type_filter:
        stmt = stmt.where(Registration.registration_type == type_filter)
    if status_filter:
        stmt = stmt.where(Registration.status == status_filter)
    if keyword:
        kw = f"%{keyword}%"
        from sqlalchemy import or_ as sa_or
        stmt = stmt.where(
            sa_or(
                Registration.name.like(kw),
                Registration.student_id.like(kw),
                Registration.phone_number.like(kw),
            )
        )
    stmt = stmt.order_by(Registration.submitted_at.desc())
    stmt = stmt.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(stmt)
    return result.scalars().all()


# ---------- 管理员：单条更新状态 ----------
@router.patch("/{reg_id}", response_model=RegistrationOut)
async def update_registration_status(
    reg_id: int,
    status: RegistrationStatus | None = Query(default=None),
    remark: str | None = None,
    request: Request = Request,
    user: dict = Depends(require_role(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    reg = await db.get(Registration, reg_id)
    if not reg:
        raise HTTPException(status_code=404, detail="报名记录不存在")
    if status is not None:
        reg.status = status
    if remark is not None:
        reg.remark = remark
    _log(db, int(user["user_id"]), "registration.update", f"reg:{reg_id}",
         request.client.host if request.client else None)
    return reg


# ---------- 管理员：导出（活动报名） ----------
@router.get("/export")
async def export_registrations(
    activity_id: int | None = Query(default=None),
    registration_type: RegistrationTypeSchema | None = Query(default=None),
    fmt: Literal["csv", "xlsx"] = "xlsx",
    user: dict = Depends(require_role(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    # 必须指定 activity_id 或 registration_type=club
    if activity_id:
        activity = await db.get(Activity, activity_id)
        if not activity:
            raise HTTPException(status_code=404, detail="活动不存在")
        stmt = select(Registration).where(Registration.activity_id == activity_id)
        filename = f"registrations-activity-{activity_id}"
    elif registration_type == RegistrationTypeSchema.CLUB:
        stmt = select(Registration).where(Registration.registration_type == RegistrationType.CLUB)
        filename = "registrations-club"
    else:
        raise HTTPException(status_code=400, detail="请指定 activity_id 或 registration_type=club")

    result = await db.execute(stmt)
    rows = result.scalars().all()

    if fmt == "csv":
        csv_bytes = registrations_to_csv(rows)
        from fastapi.responses import StreamingResponse
        return StreamingResponse(
            iter([csv_bytes]),
            media_type="text/csv; charset=utf-8-sig",
            headers={"Content-Disposition": f"attachment; filename={filename}.csv"},
        )
    else:
        xlsx_bytes = registrations_to_xlsx(rows)
        from fastapi.responses import StreamingResponse
        return StreamingResponse(
            iter([xlsx_bytes]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}.xlsx"},
        )
