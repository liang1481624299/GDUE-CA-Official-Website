"""全局异常处理：禁止向前端输出报错堆栈，统一返回 500 JSON + traceId。

FastAPI 默认对未捕获异常返回纯文本 500，会泄露内部细节。此处注册
exception_handler(Exception) 返回结构化 JSON，堆栈仅写入日志（带 traceId）。
HTTPException / RequestValidationError 仍由 FastAPI 默认处理器处理，
保留其标准错误格式（detail / 字段校验错误数组）。
"""
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.log import current_trace_id

logger = logging.getLogger("gdueca.error")


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def _validation_handler(request: Request, exc: RequestValidationError):
        # 校验错误：保留 FastAPI 默认结构，但统一加 trace_id
        trace = current_trace_id()
        return JSONResponse(
            status_code=422,
            content={"detail": exc.errors(), "trace_id": trace},
            headers={"X-Trace-Id": trace} if trace != "-" else {},
        )

    @app.exception_handler(Exception)
    async def _unhandled_handler(request: Request, exc: Exception):
        trace = current_trace_id()
        logger.exception(
            "未捕获异常：%s %s trace=%s",
            request.method, request.url.path, trace,
        )
        return JSONResponse(
            status_code=500,
            content={"error": "internal", "detail": "服务器内部错误，请稍后重试",
                     "trace_id": trace if trace != "-" else None},
            headers={"X-Trace-Id": trace} if trace != "-" else {},
        )
