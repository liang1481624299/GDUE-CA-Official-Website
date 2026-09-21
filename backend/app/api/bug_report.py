"""Bug 反馈接口：访客提交 + 管理员查看。"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import Role, require_role
from app.db.models import AuditLog, BugReport
from app.db.session import get_db
from app.schemas.bug import BugReportCreate, BugReportOut

router = APIRouter(prefix="/api/bugs", tags=["bugs"])


def _log(db: AsyncSession, uid: int | None, action: str, target: str | None, ip: str | None):
    db.add(AuditLog(user_id=uid, action=action, target=target, ip=ip))


# ---------- 访客提交 ----------
@router.post("", response_model=BugReportOut, status_code=status.HTTP_201_CREATED)
async def submit_bug(
    req: BugReportCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    bug = BugReport(**req.model_dump())
    db.add(bug)
    await db.flush()
    _log(db, None, "bug.submit", f"bug:{bug.id}",
         request.client.host if request.client else None)
    return bug


# ---------- 管理员列表 ----------
@router.get("", response_model=list[BugReportOut])
async def list_bugs(
    keyword: str | None = None,
    resolved: bool | None = None,
    page: int = 1,
    per_page: int = 50,
    user: dict = Depends(require_role(Role.EDITOR)),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(BugReport)
    if keyword:
        kw = f"%{keyword}%"
        stmt = stmt.where(
            or_(
                BugReport.description.like(kw),
                BugReport.contact_email.like(kw),
                BugReport.contact_phone.like(kw),
            )
        )
    if resolved is not None:
        stmt = stmt.where(BugReport.resolved == resolved)
    stmt = stmt.order_by(BugReport.created_at.desc())
    stmt = stmt.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.patch("/{bug_id}")
async def mark_bug_resolved(
    bug_id: int,
    resolved: bool = True,
    user: dict = Depends(require_role(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    bug = await db.get(BugReport, bug_id)
    if not bug:
        raise HTTPException(status_code=404, detail="Bug 不存在")
    bug.resolved = resolved
    return {"ok": True}
