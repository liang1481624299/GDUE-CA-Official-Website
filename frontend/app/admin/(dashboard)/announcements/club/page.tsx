"use client";

/**
 * /admin/announcements/club - 社团公告管理
 * 页面只做组合；与首页公告共用 AnnouncementsManager，仅 category 不同
 */
import { useI18n } from "@/i18n/provider";
import { AnnouncementsManager } from "@/components/admin/announcements/AnnouncementsManager";

export default function ClubAnnouncementsPage() {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("admin.announcements.clubTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("admin.announcements.clubDesc")}
        </p>
      </div>
      <AnnouncementsManager category="club" />
    </div>
  );
}
