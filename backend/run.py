#!/usr/bin/env python3
"""启动脚本：默认仅监听本机回环（浏览器经前端同源 /api 反代访问后端）。

监听地址 / 端口读取 .env 或环境变量 HOST / PORT，例如 HOST=:: 监听 IPv4+IPv6 双栈。
"""
import uvicorn

from app.core.config import get_settings

if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=False,
        log_level="info",
    )
