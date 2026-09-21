import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { locales, defaultLocale, isLocale } from "@/lib/i18n";

/**
 * Proxy（原 middleware）- 国际化路由
 * 检测请求路径是否包含语言前缀，若无则根据浏览器偏好重定向到对应语言
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 检查路径是否已包含语言前缀
  const pathnameHasLocale = locales.some(
    (loc) =>
      pathname.startsWith(`/${loc}/`) || pathname === `/${loc}`
  );

  if (pathnameHasLocale) return;

  // 从 Cookie 获取用户语言偏好
  const cookieLocale = request.cookies.get("locale")?.value;
  if (cookieLocale && isLocale(cookieLocale)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${cookieLocale}${pathname}`;
    return NextResponse.redirect(url);
  }

  // 从 Accept-Language 头检测浏览器语言偏好
  const acceptLang = request.headers.get("accept-language");
  let detectedLocale: string = defaultLocale;
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

  const url = request.nextUrl.clone();
  url.pathname = `/${detectedLocale}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // 匹配所有路径，排除 API、admin 后台、静态文件、图片优化、特殊文件
  // admin 不走 locale 前缀，需排除避免被重定向到 /[locale]/admin
  matcher: [
    "/((?!api|admin|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.png$|.*\\.svg$|.*\\.ico$).*)",
  ],
};
