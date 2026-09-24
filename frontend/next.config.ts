import type { NextConfig } from "next";

/**
 * Next.js 配置文件
 * - Turbopack 构建工具（Next.js 16 默认启用）
 * - 图片优化配置
 * - HTTP/3 与安全响应头
 * - Priority Hints 相关配置
 */
const nextConfig: NextConfig = {
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
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
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
