"use client";

/**
 * UserMenu —— 导航栏用户头像下拉菜单
 *
 * 交互（Tier-0 修复）：
 *   - hover 头像 → 立即展开下拉
 *   - 鼠标从头像移到下拉内容 → 保持展开（同一 div 容器，hover 区域完整覆盖）
 *   - 鼠标离开整个区域 → 自动收起（100ms 延迟，避免边缘抖动）
 *   - 点击头像 → 切换展开/收起（移动端 / 触屏可用）
 *
 * 实现说明：
 *   不用 Radix DropdownMenu（它为 click 触发设计，受控 hover 时内部 focus
 *   管理和 onOpenChange 会和 hover state 打架导致闪烁）。
 *   改用原生 div + 受控 open + 绝对定位下拉面板，trigger 和 content 在
 *   同一个 div 内，鼠标从头像移到面板不会离开容器，hover 稳定不闪。
 *
 * 权限动态渲染（从后端 role 字段读取，不硬写）：
 *   - 游客：下拉只有「登录」，不展示后台入口
 *   - 已登录 super_admin / admin / editor：显示「个人设置」+「后台」+「退出登录」
 *   - 已登录非管理员（本项目暂不会出现，留作扩展）：显示「个人设置」+「退出登录」，不展示后台
 *
 * 双重防护：前端只隐藏入口；后端接口仍保留原有权限校验，
 *           防止手动输入 URL 越权。
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { fetchProfile } from "@/lib/api/auth";
import { API_BASE_URL } from "@/lib/api/client";
import type { AdminUser } from "@/types/api";
import { User, LayoutDashboard, LogOut, Loader2, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";

const TOKEN_KEY = "gdueca_admin_token";

/** 项目内全部管理员角色；登录后这些角色可见后台入口 */
const ADMIN_ROLES = new Set(["super_admin", "admin", "editor"]);

function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem(TOKEN_KEY));
}

/** 把用户名字符串取首字母（多字时取前两个） */
function getInitials(name: string): string {
  if (!name) return "?";
  const trimmed = name.trim();
  if (/[\u4e00-\u9fa5]/.test(trimmed)) return trimmed.slice(0, 2);
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

/** 根据用户名生成一个稳定的 HSL 色相（避免头像背景清一色） */
function hashHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % 360;
}

/** 把可能是相对路径的 avatar_url 补全为完整 URL */
function avatarFullUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const base = API_BASE_URL.replace(/\/+$/, "");
  return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
}

export function UserMenu() {
  const { locale, t } = useI18n();
  const [loggedIn, setLoggedIn] = useState(false);
  const [profile, setProfile] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false);

  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    const logged = isLoggedIn();
    setLoggedIn(logged);
    if (logged) {
      setLoading(true);
      fetchProfile()
        .then((p) => setProfile(p))
        .catch(() => { /* token 过期或网络错误，保持 null */ })
        .finally(() => setLoading(false));
    } else {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
  }, []);

  // Escape 关闭（与其他伸缩菜单一致的键盘交互）
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const cancelClose = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), 100);
  };

  const handleLogout = () => {
    window.localStorage.removeItem(TOKEN_KEY);
    window.location.href = `/admin/login`;
  };

  // 点击菜单项后关闭下拉
  const handleItemClick = () => setOpen(false);

  const showBackend = loggedIn && Boolean(profile?.role) && ADMIN_ROLES.has(profile!.role);

  const avatarUrl = !imgError ? avatarFullUrl(profile?.avatar_url) : "";
  const hasImg = Boolean(avatarUrl);
  const name = profile?.username ?? "";
  const initials = getInitials(name || "U");
  const hue = hashHue(name || "guest");

  return (
    <div
      className="relative inline-flex"
      // 整个容器（头像 + 下拉面板）统一管理 hover，鼠标在两者之间移动不会触发关闭
      onMouseEnter={() => { cancelClose(); setOpen(true); }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full overflow-hidden ring-2 ring-transparent hover:ring-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all cursor-pointer"
        aria-label={loggedIn ? t("nav.accountMenu") : t("nav.admin")}
        title={loggedIn ? (name || t("nav.accountMenu")) : t("nav.admin")}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {loading ? (
          <span className="inline-flex h-full w-full items-center justify-center bg-secondary">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          </span>
        ) : hasImg ? (
          <img
            src={avatarUrl}
            alt={name || "avatar"}
            className="h-full w-full object-cover bg-secondary"
            onError={() => setImgError(true)}
          />
        ) : (
          <span
            className="inline-flex h-full w-full items-center justify-center text-xs font-semibold text-white select-none"
            style={{ backgroundColor: `hsl(${hue} 65% 45%)` }}
          >
            {initials}
          </span>
        )}
      </button>

      <div
        role="menu"
        className={cn(
          "absolute right-0 top-full mt-1 z-50 min-w-[14rem] w-56 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md origin-top",
          "transition-[opacity,transform] motion-reduce:transition-none",
          open
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
        )}
      >
          {loggedIn && profile ? (
            <>
              <div className="px-2 py-1.5 flex flex-col gap-0.5">
                <span className="text-sm font-medium leading-tight">{profile.username}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {profile.email}
                </span>
              </div>
              <div className="-mx-1 my-1 h-px bg-muted" />
              <Link
                href={`/${locale}/profile`}
                onClick={handleItemClick}
                role="menuitem"
                className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0"
              >
                <User className="h-4 w-4" />
                {t("nav.personalSettings")}
              </Link>
              {showBackend && (
                <Link
                  href="/admin"
                  onClick={handleItemClick}
                  role="menuitem"
                  className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {t("nav.backend")}
                </Link>
              )}
              <div className="-mx-1 my-1 h-px bg-muted" />
              <button
                type="button"
                onClick={() => { handleItemClick(); handleLogout(); }}
                role="menuitem"
                className="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors text-destructive hover:bg-destructive/10 hover:text-destructive [&_svg]:size-4 [&_svg]:shrink-0"
              >
                <LogOut className="h-4 w-4" />
                {t("nav.logout")}
              </button>
            </>
          ) : (
            <>
              <div className="px-2 py-1.5 text-sm font-semibold">{t("nav.guest")}</div>
              <div className="-mx-1 my-1 h-px bg-muted" />
              <Link
                href="/admin/login"
                onClick={handleItemClick}
                role="menuitem"
                className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0"
              >
                <LogIn className="h-4 w-4" />
                {t("nav.login")}
              </Link>
            </>
          )}
      </div>
    </div>
  );
}
