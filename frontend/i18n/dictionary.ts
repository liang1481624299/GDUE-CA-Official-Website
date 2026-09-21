/**
 * 服务端字典加载器
 * 通过 next/headers 读取当前 URL，从中解析 locale 前缀
 * 动态加载对应语言的翻译
 */
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { isLocale, defaultLocale } from "@/lib/i18n";

/** 翻译消息类型（从 zh-CN.json 推断） */
export type Messages = typeof import("@/i18n/messages/zh-CN.json");

/** 字典加载器映射 */
const dictionaries = {
  "zh-CN": () =>
    import("@/i18n/messages/zh-CN.json").then((m) => m.default),
  "zh-TW": () =>
    import("@/i18n/messages/zh-TW.json").then((m) => m.default),
  en: () => import("@/i18n/messages/en.json").then((m) => m.default),
  ja: () => import("@/i18n/messages/ja.json").then((m) => m.default),
} as const;

/**
 * 从当前请求的 URL 路径中解析 locale 前缀
 * 例如：/zh-CN/about -> "zh-CN"，/en -> "en"
 * 未匹配则返回 defaultLocale
 */
export async function getLocale(): Promise<Locale> {
  const headerList = await headers();
  // Next.js 中可以通过 x-path 或自定义 header 获取当前路径
  // 但更稳定的方式是从 referer 或其他方式获取
  // 此处优先使用 x-path（Next.js 内部 header），fallback 到 defaultLocale
  const path =
    headerList.get("x-path") ??
    headerList.get("x-current-path") ??
    headerList.get("referer") ??
    "";
  // 从路径中提取 locale 前缀
  const match = path.match(/\/(zh-CN|zh-TW|en|ja)(?:\/|$)/);
  const loc = match?.[1] ?? defaultLocale;
  if (!isLocale(loc)) return defaultLocale;
  return loc;
}

/**
 * 获取当前语言的翻译字典
 * 通过解析当前请求路径推断 locale
 */
export async function getDictionary(): Promise<Messages> {
  const currentLocale = await getLocale();
  return dictionaries[currentLocale]();
}

/**
 * 根据指定 locale 获取翻译字典
 */
export async function getDictionaryByLocale(
  loc: Locale
): Promise<Messages> {
  return dictionaries[loc]();
}

/**
 * 嵌套键查找函数
 * t(dict, "nav.home") -> dict.nav.home
 */
export function t(
  messages: Messages,
  key: string,
  vars?: Record<string, string | number>
): string {
  const parts = key.split(".");
  let result: unknown = messages;
  for (const part of parts) {
    if (result && typeof result === "object" && part in result) {
      result = (result as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  if (typeof result !== "string") return key;
  if (vars) {
    return result.replace(/\{(\w+)\}/g, (_, name: string) =>
      String(vars[name] ?? `{${name}}`)
    );
  }
  return result;
}
