import type { NextConfig } from "next";

/**
 * Next.js 配置文件
 * - Turbopack 构建工具（Next.js 16 默认启用）
 * - 图片优化配置
 * - 安全响应头（CSP 由 proxy.ts 按请求生成 nonce 后下发）
 * - /api、/uploads 同源反代到 FastAPI 后端
 */

/** 后端地址（仅服务端使用，不暴露给浏览器） */
const BACKEND_URL = (process.env.BACKEND_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  // 不暴露 X-Powered-By: Next.js（减少指纹信息）
  poweredByHeader: false,

  // 浏览器统一请求同源 /api/*，由 Next.js 转发到后端：
  // 登录 Cookie 为第一方 Cookie（SameSite=Strict 生效），无需开放 CORS
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` },
      { source: "/uploads/:path*", destination: `${BACKEND_URL}/uploads/:path*` },
    ];
  },

  // 旧审核页书签兜底：三类审核已合并至统一审核中心 /admin/review?tab=
  async redirects() {
    return [
      { source: "/admin/registrations", destination: "/admin/review?tab=registrations", permanent: false },
      { source: "/admin/bugs", destination: "/admin/review?tab=bugs", permanent: false },
      { source: "/admin/password-resets", destination: "/admin/review?tab=resets", permanent: false },
    ];
  },

  // 图片优化配置
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "trae-api-cn.mchost.guru",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
    // 允许的图片质量
    qualities: [50, 75, 100],
  },

  // 自定义响应头：安全头
  // 注意：Alt-Svc (HTTP/3) 头不应由 Next.js 应用设置，
  // 应由前端 CDN/Nginx/Caddy 反向代理层在 443 端口上添加。
  // 在 Next.js 层设置 h3=":443" 会导致非 443 端口环境下的远程设备
  // 浏览器尝试通过 443 端口 HTTP/3 加载资源→失败→页面空白。
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // 安全头
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            // 禁止被任何页面嵌入（防点击劫持），与 CSP frame-ancestors 'none' 一致
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), payment=(), usb=()",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },

  // Turbopack 配置（顶层，Next.js 16 不再需要 experimental）
  turbopack: {
    // 根目录别名已在 tsconfig.json 中配置
  },
};

export default nextConfig;
