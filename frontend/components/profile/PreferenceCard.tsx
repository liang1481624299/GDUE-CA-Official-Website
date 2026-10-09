/**
 * 偏好设置卡片：时区 / 主题 / 语言 三项合一
 * 统一的「标签+说明 | 控件」行式布局，与设置中心风格一致
 */
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sun, Moon, Check } from "lucide-react";
import { useI18n, useTimezone } from "@/i18n/provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TimezoneSelect } from "@/components/layout/TimezoneSelect";
import type { AdminUser } from "@/types/api";
import type { Locale } from "@/lib/i18n";
import { locales, localeNames } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";
const THEME_KEY = "gdueca-theme";

/** 单行偏好项：左侧标题+说明，右侧控件 */
function PrefRow({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-border first:pt-0 last:border-0 last:pb-0">
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function PreferenceCard({ profile }: { profile: AdminUser | null }) {
  const { t, locale } = useI18n();
  const { timezonePref, effectiveTimezone } = useTimezone();
  const pathname = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(THEME_KEY) as Theme | null;
      if (stored === "light" || stored === "dark") setTheme(stored);
      else setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    }
  }, []);

  function switchTheme(next: Theme) {
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    window.localStorage.setItem(THEME_KEY, next);
  }

  function switchLocale(target: Locale) {
    if (target === locale) return;
    const segments = pathname.split("/");
    segments[1] = target;
    router.push(segments.join("/"));
  }

  const selectCls = "h-9 rounded-md border border-input bg-background px-2 text-sm";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("admin.profile.preferencesTitle")}</CardTitle>
        <CardDescription>{t("admin.profile.preferencesHint")}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* 时区：选择即保存（登录用户同步后端用户资料） */}
        <PrefRow title={t("admin.profile.timezone")} desc={t("admin.profile.timezoneHint")}>
          <div className="flex flex-col items-start sm:items-end gap-1.5">
            <TimezoneSelect className={cn("w-full sm:w-64", selectCls)} />
            <p className="text-xs text-muted-foreground">
              {t("admin.profile.timezoneCurrent")}：
              {profile?.timezone ? profile.timezone : t("nav.timezoneAuto")}
              {" · "}
              {t("admin.profile.timezoneEffective")}：{effectiveTimezone}
              {timezonePref !== "auto" && ` (${t("admin.profile.timezoneManual")})`}
            </p>
          </div>
        </PrefRow>

        {/* 主题 */}
        <PrefRow title={t("nav.theme")} desc={t("profile.themeHint")}>
          <div className="inline-flex rounded-md border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => switchTheme("light")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors",
                theme === "light" ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Sun className="h-4 w-4" />{t("common.themeLight")}
            </button>
            <button
              type="button"
              onClick={() => switchTheme("dark")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-l border-border",
                theme === "dark" ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Moon className="h-4 w-4" />{t("common.themeDark")}
            </button>
          </div>
        </PrefRow>

        {/* 语言 */}
        <PrefRow title={t("nav.language")} desc={t("profile.languageHint")}>
          <div className="inline-flex flex-wrap items-center gap-1.5">
            {locales.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => switchLocale(loc)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                  loc === locale
                    ? "border-primary bg-secondary text-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {localeNames[loc]}
                {loc === locale && <Check className="h-3 w-3" />}
              </button>
            ))}
          </div>
        </PrefRow>
      </CardContent>
    </Card>
  );
}
