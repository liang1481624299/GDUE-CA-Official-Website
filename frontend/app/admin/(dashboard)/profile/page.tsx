"use client";

/**
 * /admin/profile - 个人资料页
 * 查看/编辑账号信息、上传头像、修改密码入口
 */
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Upload, KeyRound, CheckCircle2, User, Sun, Moon, MapPin, Check } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetchProfile, updateProfile, uploadAvatar } from "@/lib/api/auth";
import { TimezoneSelect } from "@/components/layout/TimezoneSelect";
import { LoginSessionsCard } from "@/components/profile/LoginSessionsCard";
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
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<string | null>(null);

  // 表单字段
  const [displayName, setDisplayName] = useState("");
  const [realName, setRealName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [theme, setTheme] = useState<Theme>("light");
  const [locating, setLocating] = useState(false);
  const [locMsg, setLocMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile()
      .then((p) => {
        setProfile(p);
        setDisplayName(p.username);
        setRealName(p.real_name);
        setStudentId(p.student_id);
        setPhone(p.phone);
        setCountry(p.country ?? "");
        setRegion(p.region ?? "");
      })
      .catch(() => setError("Failed to load profile"))
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

  async function autoLocate() {
    if (!navigator.geolocation) { setLocMsg(t("profile.geolocationUnsupported")); return; }
    setLocating(true); setLocMsg(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const lang = locale === "zh-CN" || locale === "zh-TW" ? "zh" : locale === "ja" ? "ja" : "en";
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=${lang}`);
          const data = await res.json();
          const addr = data.address || {};
          setCountry(addr.country || "");
          setRegion(addr.state || addr.region || addr.city || addr.town || addr.county || "");
          setLocMsg(t("profile.locateSuccess"));
        } catch { setLocMsg(t("profile.locateFailed")); }
        finally { setLocating(false); }
      },
      () => { setLocMsg(t("profile.locateDenied")); setLocating(false); },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updated = await updateProfile({
        username: displayName,
        real_name: realName,
        student_id: studentId,
        phone: phone,
        country: country,
        region: region,
      });
      setProfile(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.profile.saveError"));
    } finally {
      setSaving(false);
    }
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

  /** 构建头像完整 URL */
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
          {/* 头像预览 */}
          <div className="relative h-20 w-20 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
            {profile?.avatar_url ? (
              <img
                src={avatarFullUrl(profile.avatar_url)}
                alt="avatar"
                className="h-full w-full object-cover"
              />
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
            {avatarMsg && (
              <p className="mt-2 text-sm text-muted-foreground">{avatarMsg}</p>
            )}
          </div>
        </CardContent>
      </Card>

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
            {profile?.timezone
              ? `${profile.timezone}`
              : t("nav.timezoneAuto")}
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

      {/* 地区设定 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("profile.location")}</CardTitle>
          <CardDescription>{t("profile.locationHint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={autoLocate} disabled={locating}>
              {locating ? (<><Loader2 className="h-4 w-4 animate-spin" />{t("profile.locating")}</>)
                : (<><MapPin className="h-4 w-4" />{t("profile.autoLocate")}</>)}
            </Button>
            {locMsg && <span className="text-sm text-muted-foreground">{locMsg}</span>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country">{t("profile.country")}</Label>
              <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder={t("profile.countryPlaceholder")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">{t("profile.region")}</Label>
              <Input id="region" value={region} onChange={(e) => setRegion(e.target.value)} placeholder={t("profile.regionPlaceholder")} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t("profile.locationSaveHint")}</p>
        </CardContent>
      </Card>

      {/* 资料编辑 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("admin.profile.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="displayName">{t("admin.profile.displayName")}</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t("admin.profile.displayNamePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="realName">{t("admin.profile.realName")}</Label>
              <Input
                id="realName"
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
                placeholder={t("admin.profile.realNamePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="studentId">{t("admin.profile.studentId")}</Label>
              <Input
                id="studentId"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder={t("admin.profile.studentIdPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t("admin.profile.phone")}</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("admin.profile.phonePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("admin.profile.email")}</Label>
              <Input
                id="email"
                value={profile?.email ?? ""}
                disabled
                className="bg-muted/50 cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">{t("admin.profile.emailReadonly")}</p>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                {error}
              </p>
            )}
            {success && (
              <p className="text-sm text-green-600 bg-green-50 dark:bg-green-950/20 px-3 py-2 rounded-md flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {t("admin.profile.saved")}
              </p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("admin.profile.saving")}
                  </>
                ) : (
                  t("admin.profile.save")
                )}
              </Button>
              <Button asChild variant="outline" type="button">
                <Link href="/admin/change-password">
                  <KeyRound className="h-4 w-4" />
                  {t("admin.profile.changePassword")}
                </Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 登录设备 / 会话管理 */}
      <LoginSessionsCard />
    </div>
  );
}
