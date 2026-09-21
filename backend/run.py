#!/usr/bin/env python3
"""启动脚本：uvicorn run.py:app --host :: --port 8000 同时监听 IPv4+IPv6"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="::",       # IPv6 双栈（同时监听 IPv4）
        port=8000,
        reload=False,
        log_level="info",
    )
