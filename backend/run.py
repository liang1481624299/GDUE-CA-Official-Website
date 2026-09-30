#!/usr/bin/env python3
"""启动脚本：默认仅监听本机回环（浏览器经前端同源 /api 反代访问后端）。

需要其他机器直连后端时设置 HOST，例如 HOST=:: 监听 IPv4+IPv6 双栈。
"""
import os

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=os.environ.get("HOST", "127.0.0.1"),
        port=int(os.environ.get("PORT", "8000")),
        reload=False,
        log_level="info",
    )
