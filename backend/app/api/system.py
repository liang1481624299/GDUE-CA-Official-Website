"""系统配置接口：站点信息、IP 黑名单、域名白名单。"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import Role, require_role
from app.db.models import AuditLog, SystemSetting
from app.db.session import get_db
from app.schemas.system import SystemSettingOut, SystemSettingUpdate

router = APIRouter(prefix="/api/system", tags=["system"])


def _log(db: AsyncSession, uid: int | None, action: str, detail: str | None, ip: str | None):
    db.add(AuditLog(user_id=uid, action=action, detail=detail, ip=ip))


async def _get_or_create_settings(db: AsyncSession) -> SystemSetting:
    rec = await db.get(SystemSetting, 1)
    if not rec:
        rec = SystemSetting(id=1)
        db.add(rec)
        await db.flush()
    return rec


# ---------- 读取（公开可读站点基本信息；安全配置需管理员） ----------
@router.get("/settings", response_model=SystemSettingOut)
async def get_settings(db: AsyncSession = Depends(get_db)):
    return await _get_or_create_settings(db)


# ---------- 修改（需 admin） ----------
@router.put("/settings", response_model=SystemSettingOut)
async def update_settings(
    req: SystemSettingUpdate,
    request: Request,
    user: dict = Depends(require_role(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    rec = await _get_or_create_settings(db)
    for k, v in req.model_dump(exclude_unset=True).items():
        if v is not None:
            setattr(rec, k, v)
    _log(db, int(user["user_id"]), "system.settings.update",
         f"changed: {list(req.model_dump(exclude_unset=True).keys())}",
         request.client.host if request.client else None)
    return rec


# ---------- IP 黑名单快速操作 ----------
@router.post("/ip-blacklist")
async def add_ip_to_blacklist(
    ip: str,
    request: Request,
    user: dict = Depends(require_role(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    rec = await _get_or_create_settings(db)
    if ip not in rec.ip_blacklist:
        rec.ip_blacklist = [*rec.ip_blacklist, ip]
        _log(db, int(user["user_id"]), "ip.blacklist.add", ip,
             request.client.host if request.client else None)
    return {"blacklist": rec.ip_blacklist}


@router.delete("/ip-blacklist")
async def remove_ip_from_blacklist(
    ip: str,
    request: Request,
    user: dict = Depends(require_role(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    rec = await _get_or_create_settings(db)
    rec.ip_blacklist = [x for x in rec.ip_blacklist if x != ip]
    _log(db, int(user["user_id"]), "ip.blacklist.remove", ip,
         request.client.host if request.client else None)
    return {"blacklist": rec.ip_blacklist}
