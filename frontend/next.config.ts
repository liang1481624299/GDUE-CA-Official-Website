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

  // 自定义响应头：启用 HTTP/3 Alt-Svc 提示、安全头
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // HTTP/3 服务提示（实际 HTTP/3 由 Cloudflare CDN 层启用）
          {
            key: "Alt-Svc",
            value: 'h3=":443"; ma=86400',
          },
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
