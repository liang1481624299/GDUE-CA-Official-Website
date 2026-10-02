"""traceId 中间件：为每个请求分配 traceId、输出访问日志、兜底未捕获异常。

- traceId 来源：可信反向代理传入的 X-Request-ID / X-Trace-Id（格式校验通过才采信），否则新生成
- 响应头 X-Trace-Id 回传；未捕获异常返回 500 JSON 并附带 trace_id，便于用户报障时提供编号
- 访问日志只记录方法与路径，不记录查询参数（可能含手机号 / 学号等个人信息，GB/T 35274 最小化）
"""
import logging
import time
from typing import Awaitable, Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse

from app.core.log import new_trace_id, sanitize_trace_id, trace_id_var
from app.core.middleware import _ip_to_str, _is_trusted_proxy, get_client_ip

TRACE_HEADER = "X-Trace-Id"
_INCOMING_HEADERS = ("x-request-id", "x-trace-id")

access_logger = logging.getLogger("gdueca.access")
error_logger = logging.getLogger("gdueca.error")


def _incoming_trace_id(request: Request) -> str | None:
    """仅采信可信代理传入的 traceId，防止客户端伪造 / 污染日志。"""
    peer = _ip_to_str(request.client.host) if request.client else None
    if not _is_trusted_proxy(peer):
        return None
    for header in _INCOMING_HEADERS:
        value = sanitize_trace_id(request.headers.get(header))
        if value:
            return value
    return None


async def trace_middleware(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    trace_id = _incoming_trace_id(request) or new_trace_id()
    token = trace_id_var.set(trace_id)
    start = time.perf_counter()
    status = 500
    try:
        try:
            response = await call_next(request)
        except Exception:
            error_logger.exception("未捕获异常：%s %s", request.method, request.url.path)
            response = JSONResponse(
                status_code=500,
                content={"detail": "服务器内部错误，请稍后重试", "trace_id": trace_id},
            )
        status = response.status_code
        response.headers[TRACE_HEADER] = trace_id
        return response
    finally:
        duration_ms = round((time.perf_counter() - start) * 1000, 1)
        client_ip = get_client_ip(request)
        path = request.url.path
        # 健康检查降为 DEBUG，避免刷屏
        if path == "/health":
            level = logging.DEBUG
        else:
            level = logging.ERROR if status >= 500 else logging.INFO
        access_logger.log(
            level,
            "%s %s %s %sms ip=%s",
            request.method, path, status, duration_ms, client_ip or "-",
            extra={
                "method": request.method,
                "path": path,
                "status": status,
                "duration_ms": duration_ms,
                "client_ip": client_ip,
            },
        )
        trace_id_var.reset(token)
