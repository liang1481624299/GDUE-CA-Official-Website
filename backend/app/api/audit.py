"""操作日志查询（只读）：audit_logs 分页 + 搜索 + 动作前缀筛选。

审计记录由各业务模块写入（登录/审核/内容变更/媒体/渠道配置等），
本模块仅提供后台检索视图，不提供修改与删除（审计不可篡改）。
"""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import require_permission
from app.db.models import AuditLog, User
from app.db.session import get_db
from app.schemas.common import UTCDatetime
from app.utils.crud import apply_search, paginate

router = APIRouter(prefix="/api/admin/audit-logs", tags=["audit-logs"])


class AuditLogOut(BaseModel):
    """操作日志输出（username 由列表接口回填）。"""
    id: int
    user_id: int | None = None
    username: str | None = None
    action: str
    target: str | None = None
    detail: str | None = None
    ip: str | None = None
    trace_id: str | None = None
    created_at: UTCDatetime


@router.get("")
async def list_audit_logs(
    page: int = 1,
    page_size: int = Query(default=20, le=50),
    action: str | None = None,
    q: str | None = None,
    user: dict = Depends(require_permission("audit_logs", "view")),
    db: AsyncSession = Depends(get_db),
):
    """操作日志分页列表：action 前缀筛选（如 login / activity.）+ 关键词搜索。"""
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
    if action:
        # 前缀匹配：login 命中 login 与 login.oauth 等
        stmt = stmt.where(AuditLog.action.like(f"{action}%"))
    stmt = apply_search(stmt, [AuditLog.action, AuditLog.detail, AuditLog.ip], q)

    result = await paginate(db, stmt, page, min(page_size, 50))
    user_ids = {r.user_id for r in result["items"] if r.user_id}
    names: dict[int, str] = {}
    if user_ids:
        rows = (await db.execute(
            select(User.id, User.username).where(User.id.in_(user_ids))
        )).all()
        names = {uid: uname for uid, uname in rows}
    result["items"] = [
        AuditLogOut(
            id=r.id, user_id=r.user_id, username=names.get(r.user_id),
            action=r.action, target=r.target, detail=r.detail,
            ip=r.ip, trace_id=r.trace_id, created_at=r.created_at,
        ).model_dump(mode="json")
        for r in result["items"]
    ]
    return result
