"""全局中间件：IP 黑名单拦截、Host 域名白名单校验。"""
import ipaddress
from typing import Awaitable, Callable

from fastapi import Request, Response

# 内存缓存，避免每个请求都查数据库（生产可换 Redis）
_ip_blacklist_cache: set[str] = set()
_host_whitelist_cache: set[str] = set()
_cache_ts: float = 0
_CACHE_TTL = 30  # 秒


def _ip_to_str(raw: str) -> str | None:
    """把 X-Forwarded-For / direct IP 转成规范字符串；非法返回 None"""
    if not raw:
        return None
    # X-Forwarded-For 可能是 "client, proxy1, proxy2"，取最左侧
    client = raw.split(",")[0].strip()
    # 去掉 IPv6 端口包裹
    if client.startswith("[") and "]" in client:
        client = client[1:client.index("]")]
    try:
        ipaddress.ip_address(client)
        return client
    except ValueError:
        return None


def _ip_hit_rule(ip: str, rule: str) -> bool:
    """判断 ip 是否命中黑名单/白名单的一条规则（支持 CIDR 与单 IP）"""
    try:
        if "/" in rule:
            net = ipaddress.ip_network(rule, strict=False)
            return ipaddress.ip_address(ip) in net
        return ipaddress.ip_address(ip) == ipaddress.ip_address(rule)
    except ValueError:
        return False


async def ip_blacklist_middleware(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    """
    拦截黑名单 IP。黑名单从数据库 system_settings.ip_blacklist 读取，
    30 秒缓存一次。命中则直接返回 403，不进入路由层。
    """
    global _ip_blacklist_cache, _host_whitelist_cache, _cache_ts

    # 跳过健康检查
    if request.url.path == "/health":
        return await call_next(request)

    # 刷新缓存
    import time
    now = time.time()
    if now - _cache_ts > _CACHE_TTL:
        try:
            from app.db.session import async_session
            from sqlalchemy import select
            from app.db.models import SystemSetting
            async with async_session() as s:
                result = await s.execute(select(SystemSetting.key))
                # 简化：直接查单条 system_settings 记录
                rec = await s.get(SystemSetting, 1)
                _ip_blacklist_cache = set(rec.ip_blacklist or []) if rec else set()
                _host_whitelist_cache = set(rec.allowed_hosts or []) if rec else set()
                _cache_ts = now
        except Exception:
            pass

    # IP 检查
    real_ip = request.client.host if request.client else None
    xff = request.headers.get("x-forwarded-for")
    ip = _ip_to_str(xff) or real_ip
    if ip and any(_ip_hit_rule(ip, r) for r in _ip_blacklist_cache):
        return Response(status_code=403, content="你的 IP 已被列入黑名单")

    # Host 检查
    host = request.headers.get("host", "").split(":")[0]
    if _host_whitelist_cache and host not in _host_whitelist_cache:
        return Response(status_code=403, content="域名不在白名单内")

    return await call_next(request)
