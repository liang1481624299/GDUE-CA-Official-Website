/**
 * 国际化配置
 * 定义支持的语言列表、默认语言、语言显示名称
 */

export const locales = ["zh-CN", "zh-TW", "en", "ja"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "zh-CN";

/** 语言显示名称（用于语言切换下拉） */
export const localeNames: Record<Locale, string> = {
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  en: "English",
  ja: "日本語",
};

/** 语言对应的 HTML lang 属性简写 */
export const localeHtmlLang: Record<Locale, string> = {
  "zh-CN": "zh-CN",
  "zh-TW": "zh-TW",
  en: "en",
  ja: "ja",
};

/** 判断字符串是否为支持的语言 */
export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
