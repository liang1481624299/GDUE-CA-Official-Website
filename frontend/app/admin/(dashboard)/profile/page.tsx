"use client";

/**
 * /admin/profile - 个人资料页
 * 查看/编辑账号信息、上传头像、修改密码入口
 */
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Loader2, Upload, KeyRound, CheckCircle2, User } from "lucide-react";
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
import type { AdminUser } from "@/types/api";
import { API_BASE_URL } from "@/lib/api/client";

export default function ProfilePage() {
  const { t } = useI18n();
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
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile()
      .then((p) => {
        setProfile(p);
        setDisplayName(p.username);
        setRealName(p.real_name);
        setStudentId(p.student_id);
        setPhone(p.phone);
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

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
    </div>
  );
}
