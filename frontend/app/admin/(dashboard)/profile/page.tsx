"use client";

/**
 * /admin/profile - 个人设置中心
 *
 * 三分组标准化结构：
 *   基础资料（头像 + 个人信息 + 地区）→ 偏好设置（时区 + 主题 + 语言）→ 安全（账户安全 + 登录设备）
 * 页面只做组合，业务逻辑在各卡片组件内。
 */
import { useEffect, useState } from "react";
import { Loader2, UserRound, SlidersHorizontal, ShieldCheck } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { fetchProfile } from "@/lib/api/auth";
import { AvatarCard } from "@/components/profile/AvatarCard";
import { PersonalInfoCard } from "@/components/profile/PersonalInfoCard";
import { PreferenceCard } from "@/components/profile/PreferenceCard";
import { AccountSecurityCard } from "@/components/profile/AccountSecurityCard";
import { LoginSessionsCard } from "@/components/profile/LoginSessionsCard";
import type { AdminUser } from "@/types/api";

export default function ProfilePage() {
  const { t } = useI18n();
  const [profile, setProfile] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile()
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold">{t("admin.profile.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("admin.profile.subtitle")}</p>
      </div>

      {/* 基础资料：头像 + 个人信息 + 地区 */}
      <ProfileGroup icon={UserRound} label={t("admin.profile.groups.basic")}>
        <AvatarCard
          profile={profile}
          onUpdated={(url) => setProfile((p) => (p ? { ...p, avatar_url: url } : p))}
        />
        <PersonalInfoCard
          profile={profile}
          onProfileUpdated={(updated) => setProfile(updated)}
        />
      </ProfileGroup>

      {/* 偏好设置：时区 + 主题 + 语言 */}
      <ProfileGroup icon={SlidersHorizontal} label={t("admin.profile.groups.preferences")}>
        <PreferenceCard profile={profile} />
      </ProfileGroup>

      {/* 安全：账户安全 + 登录设备 */}
      <ProfileGroup icon={ShieldCheck} label={t("admin.profile.groups.security")}>
        <AccountSecurityCard
          currentUsername={profile?.username ?? ""}
          onUsernameUpdated={(name) => {
            setProfile((p) => (p ? { ...p, username: name } : p));
          }}
        />
        <LoginSessionsCard />
      </ProfileGroup>
    </div>
  );
}

/** 分组标题：图标 + 小标题 + 分隔线 */
function ProfileGroup({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof UserRound;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 pt-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-muted shrink-0">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </span>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </h2>
        <div className="h-px flex-1 bg-border" />
      </div>
      {children}
    </section>
  );
}
