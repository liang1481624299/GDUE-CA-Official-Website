"use client";

/**
 * /admin/profile - 管理员个人资料页
 *
 * 结构：标题 → 头像 → 统一个人信息卡片 → 时区 → 主题 → 语言 → 账户安全 → 登录设备
 * 基础资料+地区整合到 PersonalInfoCard 单表单提交。
 */
import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Upload, User, Sun, Moon, Check } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetchProfile, uploadAvatar } from "@/lib/api/auth";
import { TimezoneSelect } from "@/components/layout/TimezoneSelect";
import { LoginSessionsCard } from "@/components/profile/LoginSessionsCard";
import { AccountSecurityCard } from "@/components/profile/AccountSecurityCard";
import { PersonalInfoCard } from "@/components/profile/PersonalInfoCard";
import { useTimezone } from "@/i18n/provider";
import type { AdminUser } from "@/types/api";
import type { Locale } from "@/lib/i18n";
import { locales, localeNames } from "@/lib/i18n";
import { API_BASE_URL } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";
const THEME_KEY = "gdueca-theme";

export default function ProfilePage() {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const { timezonePref, effectiveTimezone } = useTimezone();
  const [profile, setProfile] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>("light");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile()
      .then((p) => setProfile(p))
      .catch(() => setLoading(false))
      .finally(() => setLoading(false));
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

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setAvatarMsg(null);
    try {
      const res = await uploadAvatar(file);
      setProfile((p) => (p ? { ...p, avatar_url: res.avatar_url } : p));
      setAvatarMsg(t("admin.profile.avatarSuccess"));
    } catch (err) {
      setAvatarMsg(err instanceof Error ? err.message : t("admin.profile.avatarError"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function avatarFullUrl(url: string | null | undefined): string {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${API_BASE_URL}${url}`;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">{t("admin.profile.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("admin.profile.subtitle")}</p>
      </div>

      {/* 头像区 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("admin.profile.avatar")}</CardTitle>
          <CardDescription>{t("admin.profile.avatarHint")}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <div className="relative h-20 w-20 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
            {profile?.avatar_url ? (
              <img src={avatarFullUrl(profile.avatar_url)} alt="avatar" className="h-full w-full object-cover" />
            ) : (
              <User className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("admin.profile.avatarUploading")}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  {t("admin.profile.avatarUpload")}
                </>
              )}
            </Button>
            {avatarMsg && <p className="mt-2 text-sm text-muted-foreground">{avatarMsg}</p>}
          </div>
        </CardContent>
      </Card>

      {/* 统一个人信息卡片（基础资料 + 地区，单按钮提交） */}
      <PersonalInfoCard
        profile={profile}
        onProfileUpdated={(updated) => setProfile(updated)}
      />

      {/* 时区设置：选择即保存（登录用户同步后端用户资料） */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("admin.profile.timezone")}</CardTitle>
          <CardDescription>{t("admin.profile.timezoneHint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="max-w-xs">
            <TimezoneSelect className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm" />
          </div>
          <p className="text-xs text-muted-foreground">
            {t("admin.profile.timezoneCurrent")}：
            {profile?.timezone ? `${profile.timezone}` : t("nav.timezoneAuto")}
            {" · "}
            {t("admin.profile.timezoneEffective")}：{effectiveTimezone}
            {timezonePref !== "auto" && ` (${t("admin.profile.timezoneManual")})`}
          </p>
        </CardContent>
      </Card>

      {/* 主题设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("nav.theme")}</CardTitle>
          <CardDescription>{t("profile.themeHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 max-w-xs">
            <button type="button" onClick={() => switchTheme("light")}
              className={cn("flex items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors",
                theme === "light" ? "border-primary bg-secondary text-primary" : "border-border text-muted-foreground hover:bg-muted")}>
              <Sun className="h-4 w-4" />{t("common.themeLight")}
            </button>
            <button type="button" onClick={() => switchTheme("dark")}
              className={cn("flex items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors",
                theme === "dark" ? "border-primary bg-secondary text-primary" : "border-border text-muted-foreground hover:bg-muted")}>
              <Moon className="h-4 w-4" />{t("common.themeDark")}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 语言设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("nav.language")}</CardTitle>
          <CardDescription>{t("profile.languageHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            {locales.map((loc) => (
              <button key={loc} type="button" onClick={() => switchLocale(loc)}
                className={cn("flex items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors",
                  loc === locale ? "border-primary bg-secondary text-primary" : "border-border text-muted-foreground hover:bg-muted")}>
                {localeNames[loc]}
                {loc === locale && <Check className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 修改账户信息（用户名 + 密码） */}
      <AccountSecurityCard
        currentUsername={profile?.username ?? ""}
        onUsernameUpdated={(name) => {
          setProfile((p) => (p ? { ...p, username: name } : p));
        }}
      />

      {/* 登录设备 / 会话管理 */}
      <LoginSessionsCard />
    </div>
  );
}
