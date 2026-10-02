import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { locales, defaultLocale, isLocale } from "@/lib/i18n";

/**
 * Proxy（原 middleware）
 * 1. 内容安全策略（CSP）：每个请求生成随机 nonce，只允许带 nonce 的脚本执行，
 *    即使页面被注入 <script> / 事件处理器也无法运行（XSS 纵深防御）
 * 2. 国际化路由：检测请求路径是否包含语言前缀，若无则根据浏览器偏好重定向（admin 后台除外）
 */

/** 允许额外连接 / 加载脚本的外部来源（后端跨域部署地址、Umami 统计） */
function externalOrigins(): string[] {
  const origins: string[] = [];
  for (const url of [process.env.NEXT_PUBLIC_API_BASE_URL, process.env.NEXT_PUBLIC_UMAMI_SRC]) {
    if (!url) continue;
    try {
      origins.push(new URL(url).origin);
    } catch {
      /* 非法 URL 忽略 */
    }
  }
  return origins;
}

function buildCsp(nonce: string, isHttps: boolean): string {
  const isDev = process.env.NODE_ENV === "development";
  const extra = externalOrigins().join(" ");
  return [
    "default-src 'self'",
    // strict-dynamic：由带 nonce 的脚本动态加载的脚本同样可信，其余一律拒绝
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // 组件库（Radix / framer-motion）通过 style 属性写动画样式，需允许内联样式
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    // nominatim：个人资料页「自动定位」的逆地理编码（用户主动点击触发）
    `connect-src 'self' https://nominatim.openstreetmap.org${extra ? ` ${extra}` : ""}${isDev ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // 仅 HTTPS 访问时升级子资源；局域网 HTTP 访问不能加，否则资源全部加载失败
    ...(isHttps ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

/** 若路径缺少语言前缀，返回应重定向到的 URL；否则返回 null */
function localeRedirect(request: NextRequest): URL | null {
  const { pathname } = request.nextUrl;

  // admin 后台不走 locale 前缀
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;

  // 检查路径是否已包含语言前缀
  const pathnameHasLocale = locales.some(
    (loc) => pathname.startsWith(`/${loc}/`) || pathname === `/${loc}`
  );
  if (pathnameHasLocale) return null;

  // 从 Cookie 获取用户语言偏好
  const cookieLocale = request.cookies.get("locale")?.value;
  let detectedLocale: string = defaultLocale;
  if (cookieLocale && isLocale(cookieLocale)) {
    detectedLocale = cookieLocale;
  } else {
    // 从 Accept-Language 头检测浏览器语言偏好
    const acceptLang = request.headers.get("accept-language");
    if (acceptLang) {
      const langs = acceptLang
        .split(",")
        .map((l) => l.trim().split(";")[0].toLowerCase());
      for (const l of langs) {
        if (l.startsWith("zh")) {
          detectedLocale = l.includes("tw") || l.includes("hk") ? "zh-TW" : "zh-CN";
          break;
        }
        if (l.startsWith("ja")) {
          detectedLocale = "ja";
          break;
        }
        if (l.startsWith("en")) {
          detectedLocale = "en";
          break;
        }
      }
    }
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${detectedLocale}${pathname}`;
  return url;
}

export function proxy(request: NextRequest) {
  const redirectUrl = localeRedirect(request);
  if (redirectUrl) return NextResponse.redirect(redirectUrl);

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  const isHttps = (forwardedProto ?? request.nextUrl.protocol.replace(":", "")) === "https";
  const csp = buildCsp(nonce, isHttps);

  // 通过请求头把 nonce 传给渲染层：Next.js 自动为框架脚本加 nonce，布局中手写脚本读 x-nonce
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // 匹配所有页面路径，排除后端反代（api / uploads）、静态资源、图片优化、特殊文件与预取请求
  matcher: [
    {
      source:
        "/((?!api|uploads|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.png$|.*\\.svg$|.*\\.ico$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
