"use client";

/**
 * 客户端 i18n Provider 与 Hook
 * 通过 React Context 向客户端组件提供翻译函数和当前语言
 */
import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import type { Locale } from "@/lib/i18n";
import type { Messages } from "@/i18n/dictionary";

type MessagesType = Messages;

interface I18nContextValue {
  locale: Locale;
  messages: MessagesType;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * 嵌套键查找函数（客户端版本）
 */
function lookup(
  messages: MessagesType,
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

/**
 * I18n Provider 组件
 * 在根 layout 中包裹，向所有客户端组件提供翻译
 */
export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: MessagesType;
  children: ReactNode;
}) {
  const value: I18nContextValue = {
    locale,
    messages,
    t: (key, vars) => lookup(messages, key, vars),
  };
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * useI18n Hook
 * 在客户端组件中获取翻译函数和当前语言
 */
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
