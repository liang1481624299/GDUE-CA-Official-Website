"use client";

/**
 * PersonalInfoCard —— 统一个人信息编辑卡片
 *
 * 将基础资料（用户名、真实姓名、学号、手机号、邮箱）和地区选择
 * 整合到同一个表单中，通过单个"确定"按钮一次性提交。
 *
 * 用于 /profile 和 /admin/profile 两个页面，保持一致体验。
 */
import { useEffect, useState } from "react";
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
import { LocationSelect, REGIONS_HIERARCHY } from "@/components/profile/LocationSelect";
import { updateProfile } from "@/lib/api/auth";
import type { AdminUser } from "@/types/api";
import { CheckCircle2, Loader2 } from "lucide-react";

interface Props {
  profile: AdminUser | null;
  onProfileUpdated: (updated: AdminUser) => void;
}

export function PersonalInfoCard({ profile, onProfileUpdated }: Props) {
  const { t } = useI18n();

  const [displayName, setDisplayName] = useState("");
  const [realName, setRealName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [locality, setLocality] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 从 profile 初始化
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.username);
      setRealName(profile.real_name);
      setStudentId(profile.student_id);
      setPhone(profile.phone);
      setCountry(profile.country ?? "");
      setRegion(profile.region ?? "");
      setLocality(profile.locality ?? "");
    }
  }, [profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      // 地点验证
      const regions = REGIONS_HIERARCHY[country];
      if (!country || (regions && Object.keys(regions).length > 0 && !region)) {
        setError(t("profile.locationRequired"));
        setSaving(false);
        return;
      }
      const localities = regions && region ? regions[region] : [];
      if (localities && localities.length > 0 && !locality) {
        setError(t("profile.localityRequired"));
        setSaving(false);
        return;
      }
      const updated = await updateProfile({
        username: displayName,
        real_name: realName,
        student_id: studentId,
        phone: phone,
        country: country,
        region: region,
        locality: locality,
      });
      onProfileUpdated(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.profile.saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("profile.personalInfo")}</CardTitle>
        <CardDescription>{t("profile.personalInfoHint")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-5" noValidate>
          {/* 基础资料 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pi-displayName">{t("admin.profile.displayName")}</Label>
              <Input
                id="pi-displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t("admin.profile.displayNamePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pi-realName">{t("admin.profile.realName")}</Label>
              <Input
                id="pi-realName"
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
                placeholder={t("admin.profile.realNamePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pi-studentId">{t("admin.profile.studentId")}</Label>
              <Input
                id="pi-studentId"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder={t("admin.profile.studentIdPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pi-phone">{t("admin.profile.phone")}</Label>
              <Input
                id="pi-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("admin.profile.phonePlaceholder")}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="pi-email">{t("admin.profile.email")}</Label>
              <Input
                id="pi-email"
                value={profile?.email ?? ""}
                disabled
                className="bg-muted/50 cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">{t("admin.profile.emailReadonly")}</p>
            </div>
          </div>

          {/* 分隔线 */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">{t("profile.location")}</h4>
            <LocationSelect
              country={country}
              region={region}
              locality={locality}
              onCountryChange={setCountry}
              onRegionChange={setRegion}
              onLocalityChange={setLocality}
            />
          </div>

          {/* 反馈 + 提交 */}
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

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("admin.profile.saving")}
                </>
              ) : (
                t("common.confirm")
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
