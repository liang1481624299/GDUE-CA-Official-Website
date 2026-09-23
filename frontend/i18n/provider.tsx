"use client";

/**
 * 客户端 i18n Provider 与 Hook
 *
 * 纯翻译职责——时区逻辑已完全解耦到 `useEffectiveTimezone()`
 * （frontend/lib/hooks/useEffectiveTimezone.ts），两个组件互不依赖。
 */
import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { Locale } from "@/lib/i18n";
import type { Messages } from "@/i18n/dictionary";
import { useEffectiveTimezone } from "@/lib/hooks/useEffectiveTimezone";

interface I18nContextValue {
  locale: Locale;
  messages: Messages;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function lookup(
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

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: ReactNode;
}) {
  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      messages,
      t: (key, vars) => lookup(messages, key, vars),
    }),
    [locale, messages]
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}

/**
 * useTimezone —— admin 后台兼容钩子
 *
 * 旧版 admin/profile 页面还在使用这个 hook；为遵守「不修改 admin 原有业务代码」
 * 的红线约束，保留导出，内部转发到 useEffectiveTimezone。
 *
 * 返回值字段对齐旧版 TimezoneContext（timezonePref / effectiveTimezone / browserTimezone / ready）。
 * 注意：旧版里 setTimezone 还会同步后端 profile，这里改为仅本地——
 * admin/profile 的 TimezoneSelect 会直接触发 fetchProfile / updateProfile，不需要 setTimezone 桥接。
 */
export function useTimezone() {
  const h = useEffectiveTimezone();
  return {
    /** 旧版语义：null = 自动（auto）/ IANA = 手动。
     *  新版 useEffectiveTimezone.userTz 是 string | null，null 即自动。
     *  为让旧 admin/profile 页面正常工作，这里统一为 "auto" / IANA 字符串。 */
    timezonePref: h.userTz ?? "auto",
    effectiveTimezone: h.tz,
    browserTimezone: h.browserTz,
    ready: h.ready,
    /** 仅为兼容旧签名占位；admin/profile 已改用 fetchProfile/updateProfile */
    setTimezone: (_tz: string) => {
      /* no-op */
    },
  };
}
