"""通用 Pydantic 类型。

时区约束（Tier-0）：后端一律存储 UTC，API 输出统一为带大写 `Z` 的
ISO-8601 字符串；后端不做任何本地化转换，时间格式化全部由前端完成。
"""
from datetime import datetime, timezone
from typing import Annotated

from pydantic import PlainSerializer


def _utc_z(dt: datetime) -> str:
    """naive 视为 UTC（SQLite 存储无时区标记），统一输出大写 Z 后缀。"""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return (
        dt.astimezone(timezone.utc)
        .isoformat(timespec="seconds")
        .replace("+00:00", "Z")
    )


UTCDatetime = Annotated[datetime, PlainSerializer(_utc_z, return_type=str)]
