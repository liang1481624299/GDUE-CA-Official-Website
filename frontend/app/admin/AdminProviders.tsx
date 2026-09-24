"use client";

/**
 * Admin i18n Provider：管理员后台多语言
 * - 默认 zh-CN，语言偏好存 localStorage（gdueca-admin-locale）
 * - 4 份字典静态打包进 admin 路由，切换无请求
 * - 通过 useAdminLocale() 在顶栏切换语言
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { I18nProvider } from "@/i18n/provider";
import { SessionHeartbeat } from "@/components/shared/SessionHeartbeat";
import type { Locale } from "@/lib/i18n";
import type { Messages } from "@/i18n/dictionary";
import zhCN from "@/i18n/messages/zh-CN.json";
import zhTW from "@/i18n/messages/zh-TW.json";
import en from "@/i18n/messages/en.json";
import ja from "@/i18n/messages/ja.json";

const DICTS: Record<Locale, Messages> = {
  "zh-CN": zhCN as unknown as Messages,
  "zh-TW": zhTW as unknown as Messages,
  en: en as unknown as Messages,
  ja: ja as unknown as Messages,
};

const STORAGE_KEY = "gdueca-admin-locale";

interface AdminLocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

const AdminLocaleContext = createContext<AdminLocaleContextValue | null>(null);

export function useAdminLocale(): AdminLocaleContextValue {
  const ctx = useContext(AdminLocaleContext);
  if (!ctx) throw new Error("useAdminLocale must be used within AdminProviders");
  return ctx;
}

export function AdminProviders({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("zh-CN");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && saved in DICTS) setLocaleState(saved as Locale);
  }, []);

  function setLocale(l: Locale) {
    window.localStorage.setItem(STORAGE_KEY, l);
    setLocaleState(l);
  }

  return (
    <AdminLocaleContext.Provider value={{ locale, setLocale }}>
      <I18nProvider locale={locale} messages={DICTS[locale]}>
        <SessionHeartbeat />
        {children}
      </I18nProvider>
    </AdminLocaleContext.Provider>
  );
}
