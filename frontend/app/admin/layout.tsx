import type { Metadata } from "next";
import { getDictionaryByLocale } from "@/i18n/dictionary";
import { I18nProvider } from "@/i18n/provider";

/**
 * /admin 路由布局
 * - 独立于 [locale]，固定使用 zh-CN 文案（管理员后台语言可后续扩展）
 * - 共用根 layout 提供的 <html><body> 与主题脚本
 * - robots noindex，避免后台被搜索引擎收录
 */
export const metadata: Metadata = {
  title: {
    default: "管理员后台 | 广东第二师范学院计算机协会",
    template: "%s | 管理员后台",
  },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getDictionaryByLocale("zh-CN");
  return (
    <I18nProvider locale="zh-CN" messages={messages}>
      {children}
    </I18nProvider>
  );
}
