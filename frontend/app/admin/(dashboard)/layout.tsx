"use client";

/**
 * /admin/(dashboard) 布局：侧边栏 + 顶栏 + 内容区
 * - 客户端组件，挂载时检测登录状态，未登录跳转 /admin/login
 * - 顶部显示当前用户名 + 退出登录
 * - 侧边栏含概览/活动/报名/Bug/设置入口
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  Bug,
  KeyRound,
  UserCircle,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/i18n/provider";
import { useAdminLocale } from "@/app/admin/AdminProviders";
import { locales, localeNames, type Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { getSession, logout, type AdminSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

type NavItem = {
  key: string;
  href: string;
  icon: typeof LayoutDashboard;
  roles?: string[];
};

const navItems: NavItem[] = [
  { key: "admin.dashboard.overview", href: "/admin", icon: LayoutDashboard },
  { key: "admin.dashboard.activities", href: "/admin/activities", icon: CalendarDays },
  { key: "admin.dashboard.registrations", href: "/admin/registrations", icon: ClipboardList },
  { key: "admin.dashboard.bugs", href: "/admin/bugs", icon: Bug },
  { key: "admin.dashboard.passwordResets", href: "/admin/password-resets", icon: KeyRound },
  { key: "admin.dashboard.users", href: "/admin/users", icon: Users },
  { key: "admin.dashboard.settings", href: "/admin/settings", icon: Settings },
];

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [checked, setChecked] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  /** 路由守卫：未登录跳转登录页 */
  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.replace("/admin/login");
      return;
    }
    setSession(s);
    setChecked(true);
  }, [router]);

  /** 退出登录 */
  function handleLogout() {
    logout();
    router.replace("/admin/login");
  }

  /** 菜单项激活判断 */
  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  // 等待登录态校验完成，避免闪烁未授权内容
  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-muted/20">
      {/* 桌面端侧边栏 */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 border-r border-border bg-background">
        <SidebarContent
          t={t}
          session={session}
          isActive={isActive}
          onLogout={handleLogout}
        />
      </aside>

      {/* 移动端抽屉 */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-40 bg-black/50"
              onClick={() => setMobileNavOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-background border-r border-border flex flex-col"
            >
              <SidebarContent
                t={t}
                session={session}
                isActive={isActive}
                onLogout={handleLogout}
                onNavigate={() => setMobileNavOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* 主区域（min-w-0 防止内容过宽把顶栏撑出视口） */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen min-w-0">
        {/* 顶栏 */}
        <header className="h-14 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="font-display font-bold text-sm">
              {t("admin.dashboard.title")}
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <LocaleSelect />
            <Button asChild variant="ghost" size="sm">
              <Link href="/zh-CN" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">{t("admin.login.backToSite")}</span>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">{t("admin.dashboard.logout")}</span>
            </Button>
          </div>
        </header>

        {/* 内容区 */}
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

/** 顶栏语言切换（localStorage 持久化，切换后全后台即时生效） */
function LocaleSelect() {
  const { locale, setLocale } = useAdminLocale();
  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      aria-label="Language"
      className="h-8 rounded-md border border-input bg-background px-1.5 text-xs font-medium"
    >
      {locales.map((l) => (
        <option key={l} value={l}>
          {localeNames[l]}
        </option>
      ))}
    </select>
  );
}

/** 侧边栏内容（桌面与移动复用） */
function SidebarContent({
  t,
  session,
  isActive,
  onLogout,
  onNavigate,
}: {
  t: (k: string) => string;
  session: AdminSession | null;
  isActive: (h: string) => boolean;
  onLogout: () => void;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="h-14 flex items-center justify-between px-4 border-b border-border">
        <span className="font-display font-bold text-sm">
          GDUECA Admin
        </span>
        {onNavigate && (
          <Button variant="ghost" size="icon" onClick={onNavigate} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems
          .filter((item) => !item.roles || (session?.role ? item.roles.includes(session.role) : false))
          .map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              isActive(item.href)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {t(item.key)}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-border">
        <Link
          href="/admin/profile"
          onClick={onNavigate}
          className="flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors hover:bg-muted mb-1"
        >
          <UserCircle className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground">{t("admin.dashboard.welcome")}</div>
            <div className="font-medium text-foreground truncate">
              {session?.username ?? "admin"}
            </div>
          </div>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={onLogout}
          className="w-full justify-start"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {t("admin.dashboard.logout")}
        </Button>
      </div>
    </>
  );
}
