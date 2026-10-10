"""全局异常处理：禁止向前端输出 strict 堆栈，统一走新壳 `{code,msg,data,request_id}`。

- `Exception` 兜底 → 5000（INTERNAL_ERROR）+ i18n key `error.internal`
- `RequestValidationError` → 1001（VALIDATION_FAILED）+ i18n key `error.validation_failed`，data.errors 携带字段级校验错
- `BizException` → 携带的 code / http_status / data，原样输出新壳

FastAPI `HTTPException` 仍由 FastAPI 默认处理器处理（保留 `{detail}` 旧壳），
属于过渡期 `dual` 模式的一部分；后续业务模块切到 `raise BizException` 时逐步迁移。

**关于 request_id 透传**：
Starlette 的 ServerErrorMiddleware 把 user exception_handler 跑在一个 new task
（`anyio.from_thread.BlockingPortal._call_func`）里，与 trace_middleware 的
contextvars 不互通。因此 handler 不能直接读 `trace_id_var`；改读
`request.state.trace_id`（由 trace_middleware 在 `request.state` 上挂载）。
"""
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError

from app.core.bizcode import BizCode
from app.core.responses import BizException, EnvelopeJSONResponse, fail

logger = logging.getLogger("gdueca.error")


def _request_id_from_state(request: Request) -> str | None:
    """从 request.state 读取 trace_middleware 挂载的 trace_id。
    没有时返回 None（不强行占位，避免日志假阳性）。"""
    return getattr(request.state, "trace_id", None)


def _envelope_with_request_id(body: dict, request: Request, http_status: int) -> EnvelopeJSONResponse:
    """构造带 request_id 的 EnvelopeJSONResponse（解决跨 task 的 contextvar 失效）。"""
    rid = _request_id_from_state(request)
    if rid:
        body["request_id"] = rid
    return EnvelopeJSONResponse(content=body, status_code=http_status)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def _validation_handler(request: Request, exc: RequestValidationError):
        body = {"code": BizCode.VALIDATION_FAILED,
                "msg": {"key": "error.validation_failed"},
                "data": {"errors": exc.errors()},
                "request_id": ""}
        return _envelope_with_request_id(body, request, http_status=422)

    @app.exception_handler(BizException)
    async def _biz_exception_handler(request: Request, exc: BizException):
        body = exc.to_envelope()
        return _envelope_with_request_id(body, request, http_status=exc.http_status)

    @app.exception_handler(Exception)
    async def _unhandled_handler(request: Request, exc: Exception):
        rid = _request_id_from_state(request)
        logger.exception(
            "未捕获异常：%s %s trace=%s",
            request.method, request.url.path, rid or "-",
        )
        body = {"code": BizCode.INTERNAL_ERROR,
                "msg": {"key": "error.internal"},
                "data": None,
                "request_id": ""}
        # 兜底响应只含四字段（code/msg/data/request_id），绝不外泄堆栈
        return _envelope_with_request_id(body, request, http_status=500)