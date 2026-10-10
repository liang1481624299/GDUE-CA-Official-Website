"use client";

/**
 * /[locale]/profile —— 前台个人资料页
 *
 * 使用公开 Navbar/Footer 前台布局，不引用 admin 布局。
 * 登录状态：本地登录展示信息 + 后端接口校验（登录凭据在 HttpOnly Cookie 中）。
 *   - 已登录 → ProfileEditForm（资料编辑 + 时区设置）
 *   - 未登录 → 提示需要登录，跳转 /admin/login
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { Loader2, NotebookPen } from "lucide-react";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { isLogged } from "@/lib/auth";

export default function ProfilePage() {
  const { locale, t } = useI18n();
  const [loggedIn, setLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // 客户端挂载后检查登录态
    setLoggedIn(isLogged());
    setChecking(false);
  }, []);

  if (checking) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="max-w-md mx-auto text-center py-24 space-y-6">
        <h1 className="text-2xl font-bold">{t("admin.profile.title")}</h1>
        <p className="text-muted-foreground">{t("profile.loginRequired")}</p>
        <Link
          href="/admin/login"
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t("profile.goLogin")}
        </Link>
      </div>
    );
  }

  return (
    <div className="py-10">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold">{t("admin.profile.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("admin.profile.subtitle")}</p>
        </div>
        <ProfileEditForm />

        {/* 个人中心：我的 Memo 入口（与 Blog/Document/收藏并列） */}
        <div className="mt-8 rounded-lg border border-border bg-card p-4 flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <NotebookPen className="h-4 w-4" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">{t("profile.tabs.memo")}</div>
            <div className="text-xs text-muted-foreground">
              查看我发布的 Memo、归档、点赞与收藏
            </div>
          </div>
          <Link
            href={`/${locale}/memo/me`}
            className="inline-flex h-8 items-center justify-center rounded-md border border-border px-3 text-xs hover:bg-muted"
          >
            {t("profileMemoTab.viewAll")} →
          </Link>
        </div>
      </div>
    </div>
  );
}
