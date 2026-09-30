"""全局中间件：可信代理 IP 解析、IP 黑名单拦截、Host 域名白名单、安全响应头。"""
import ipaddress
import time
from functools import lru_cache
from typing import Awaitable, Callable

from fastapi import Request, Response

from app.core.config import get_settings

# 内存缓存，避免每个请求都查数据库（生产可换 Redis）
_ip_blacklist_cache: set[str] = set()
_host_whitelist_cache: set[str] = set()
_cache_ts: float = 0
_CACHE_TTL = 30  # 秒


def _ip_to_str(raw: str) -> str | None:
    """把单个地址字符串规范化；非法返回 None"""
    if not raw:
        return None
    client = raw.strip()
    # 去掉 IPv6 端口包裹 [::1]:1234
    if client.startswith("[") and "]" in client:
        client = client[1:client.index("]")]
    try:
        return _normalize_ip(str(ipaddress.ip_address(client)))
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


def _normalize_ip(ip: str) -> str:
    """规范化 IP：IPv4-mapped IPv6（::ffff:a.b.c.d）转为点分 IPv4，其余保持原样。"""
    try:
        obj = ipaddress.ip_address(ip)
        if isinstance(obj, ipaddress.IPv6Address) and obj.ipv4_mapped:
            return str(obj.ipv4_mapped)
        return str(obj)
    except ValueError:
        return ip


@lru_cache
def _networks(spec: str) -> tuple[ipaddress.IPv4Network | ipaddress.IPv6Network, ...]:
    nets = []
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            nets.append(ipaddress.ip_network(part, strict=False))
        except ValueError:
            continue
    return tuple(nets)


def ip_in_networks(ip: str | None, spec: str) -> bool:
    """ip 是否落在逗号分隔的 CIDR 列表内。"""
    if not ip:
        return False
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False
    return any(addr.version == n.version and addr in n for n in _networks(spec))


def _is_trusted_proxy(ip: str | None) -> bool:
    return ip_in_networks(ip, get_settings().TRUSTED_PROXIES)


def get_client_ip(request: Request) -> str | None:
    """
    获取真实客户端 IP，用于访问控制 / 表单留痕 / 审计。

    只有直连方是可信代理时才采信 X-Forwarded-For / X-Real-IP，
    并从 XFF 右侧向左取第一个非可信代理地址，防止客户端伪造 XFF 冒充内网。
    """
    peer = _ip_to_str(request.client.host) if request.client else None
    if not _is_trusted_proxy(peer):
        return peer

    xff = request.headers.get("x-forwarded-for", "")
    hops = [ip for ip in (_ip_to_str(p) for p in xff.split(",")) if ip]
    for ip in reversed(hops):
        if not _is_trusted_proxy(ip):
            return ip
    real_ip = _ip_to_str(request.headers.get("x-real-ip", ""))
    if real_ip:
        return real_ip
    return hops[0] if hops else peer


def get_request_host(request: Request) -> str:
    """请求的原始 Host（可信代理转发时取 X-Forwarded-Host）；不含端口。"""
    peer = _ip_to_str(request.client.host) if request.client else None
    host = ""
    if _is_trusted_proxy(peer):
        host = request.headers.get("x-forwarded-host", "").split(",")[0].strip()
    host = host or request.headers.get("host", "")
    if host.startswith("["):
        return host[1:host.index("]")] if "]" in host else host
    return host.rsplit(":", 1)[0] if host.count(":") == 1 else host


def is_https(request: Request) -> bool:
    """请求是否经 HTTPS 到达（可信代理转发时看 X-Forwarded-Proto）。"""
    peer = _ip_to_str(request.client.host) if request.client else None
    if _is_trusted_proxy(peer):
        proto = request.headers.get("x-forwarded-proto", "").split(",")[0].strip().lower()
        if proto:
            return proto == "https"
    return request.url.scheme == "https"


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
    now = time.time()
    if now - _cache_ts > _CACHE_TTL:
        try:
            from app.db.models import SystemSetting
            from app.db.session import async_session
            async with async_session() as s:
                rec = await s.get(SystemSetting, 1)
                _ip_blacklist_cache = set(rec.ip_blacklist or []) if rec else set()
                _host_whitelist_cache = set(rec.allowed_hosts or []) if rec else set()
                _cache_ts = now
        except Exception:
            pass

    # IP 检查
    ip = get_client_ip(request)
    if ip and any(_ip_hit_rule(ip, r) for r in _ip_blacklist_cache):
        return Response(status_code=403, content="你的 IP 已被列入黑名单",
                        media_type="text/plain; charset=utf-8")

    # Host 检查
    host = get_request_host(request)
    if _host_whitelist_cache and host not in _host_whitelist_cache:
        return Response(status_code=403, content="域名不在白名单内",
                        media_type="text/plain; charset=utf-8")

    return await call_next(request)


# ---------- 安全响应头 ----------
# API 只返回 JSON / 文件，不需要执行任何脚本：最严格 CSP
_API_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
# 头像等静态上传文件：只允许作为图片展示，禁止被当成页面执行脚本
_UPLOAD_CSP = "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox"
# Swagger / ReDoc 页面需要从 CDN 加载脚本，仅在 ENABLE_API_DOCS 时存在
_DOCS_PATHS = ("/docs", "/redoc", "/openapi.json")


async def security_headers_middleware(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    response = await call_next(request)
    path = request.url.path
    headers = response.headers
    headers.setdefault("X-Content-Type-Options", "nosniff")
    headers.setdefault("X-Frame-Options", "DENY")
    headers.setdefault("Referrer-Policy", "no-referrer")
    headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
    headers.setdefault("Cross-Origin-Resource-Policy", "same-site")
    headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    if path.startswith("/uploads/"):
        headers.setdefault("Content-Security-Policy", _UPLOAD_CSP)
    elif not path.startswith(_DOCS_PATHS):
        headers.setdefault("Content-Security-Policy", _API_CSP)
    # 带登录态的接口响应禁止缓存（防止共享设备 / 代理缓存泄露个人信息）
    if path.startswith("/api/"):
        headers.setdefault("Cache-Control", "no-store")
    if is_https(request):
        headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return response
