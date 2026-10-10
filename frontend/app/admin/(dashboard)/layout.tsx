"use client";

/**
 * /admin/(dashboard) 布局：侧边栏 + 顶栏 + 内容区
 * - 客户端组件，挂载时向后端校验登录态（/api/auth/me），禁止匿名访问：
 *   未登录 / 会话失效 → /admin/login；须改初始密码 → /admin/change-password；
 *   普通成员（无后台权限）→ 前台个人资料页
 * - 侧边栏按模块级有效权限（角色默认 + permission_overrides）显隐入口
 *   （仅界面层；接口权限由后端强制校验）
 * - 顶部显示当前用户名 + 退出登录
 * - 侧边栏含概览/活动/审核中心/人员/设置入口
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Bell,
  CalendarDays,
  ClipboardList,
  UserCircle,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
  Megaphone,
  FileText,
  Newspaper,
  UsersRound,
  NotebookPen,
  UserPlus,
  MessageSquare,
  KeyRound,
  Fingerprint,
  BadgeCheck,
  PenLine,
  Tags,
  FileImage,
  Globe,
  ShieldBan,
  ScrollText,
  Eye,
  BarChart3,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/i18n/provider";
import { useAdminLocale } from "@/app/admin/AdminProviders";
import { locales, localeNames, type Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { BanModal } from "@/components/shared/BanModal";
import { fetchMe } from "@/lib/api/auth";
import { fetchOverview } from "@/lib/api/adminStats";
import { ApiError } from "@/lib/api/client";
import { clearLocalSession, isAdminRole, logout, saveSession, type AdminSession } from "@/lib/auth";
import {
  hasPermission,
  type PermissionModule,
  type PermissionOverrides,
} from "@/lib/permissions";
import { cn } from "@/lib/utils";

type NavItem = {
  key: string;
  href: string;
  icon: typeof LayoutDashboard;
  /** 任一列出模块具有 view 权限即可见；缺省 = 恒可见 */
  modules?: PermissionModule[];
};

type NavGroup = {
  /** 分组标题 i18n key；缺省 = 无标题组（置顶概览） */
  labelKey?: string;
  items: NavItem[];
};

/** 侧边栏条目可见性：按有效权限判定 */
function canAccess(
  item: NavItem,
  permCtx: { role: string; overrides: PermissionOverrides | null } | null
): boolean {
  if (!item.modules || item.modules.length === 0) return true;
  if (!permCtx) return false;
  return item.modules.some((m) => hasPermission(permCtx.role, permCtx.overrides, m, "view"));
}

/**
 * 侧边栏 7 分组导航（父标签为不可点击的分组标题）：
 * 站点内容管理 / 博客文档管理 / 文件资源管理 / 账号与登录设置 /
 * 系统安全设置 / 权限管理 / 数据统计
 */
const navGroups: NavGroup[] = [
  // 无标题组：概览
  {
    items: [
      { key: "admin.dashboard.overview", href: "/admin", icon: LayoutDashboard, modules: ["dashboard"] },
    ],
  },
  {
    labelKey: "admin.navGroup.content",
    items: [
      { key: "admin.dashboard.announcements", href: "/admin/announcements", icon: Megaphone, modules: ["announcements"] },
      { key: "admin.dashboard.homeAnnouncements", href: "/admin/announcements/home", icon: Megaphone, modules: ["announcements"] },
      { key: "admin.dashboard.activities", href: "/admin/activities", icon: CalendarDays, modules: ["activities"] },
      { key: "admin.dashboard.content", href: "/admin/content/club-intro", icon: FileText, modules: ["content"] },
      { key: "admin.dashboard.members", href: "/admin/members", icon: UsersRound, modules: ["members"] },
      { key: "admin.dashboard.recruitment", href: "/admin/recruitment", icon: UserPlus, modules: ["recruitment"] },
      {
        key: "admin.dashboard.review",
        href: "/admin/review",
        icon: ClipboardList,
        modules: ["review.registrations", "review.bugs", "review.resets"],
      },
    ],
  },
  {
    labelKey: "admin.navGroup.blog",
    items: [
      { key: "admin.dashboard.blog", href: "/admin/blog", icon: Newspaper, modules: ["blog"] },
      { key: "admin.dashboard.blogNew", href: "/admin/blog/new", icon: PenLine, modules: ["blog"] },
      { key: "admin.dashboard.blogTags", href: "/admin/blog/tags", icon: Tags, modules: ["blog_tags"] },
      { key: "admin.dashboard.comments", href: "/admin/blog/comments", icon: MessageSquare, modules: ["comments"] },
      // Phase 8: Memo 碎片笔记（统一在「内容」组下）
      { key: "admin.dashboard.memos", href: "/admin/memo", icon: NotebookPen, modules: ["memo"] },
    ],
  },
  {
    labelKey: "admin.navGroup.media",
    items: [
      { key: "admin.dashboard.media", href: "/admin/media", icon: FileImage, modules: ["media"] },
    ],
  },
  {
    labelKey: "admin.navGroup.account",
    items: [
      { key: "admin.dashboard.oauth", href: "/admin/oauth", icon: KeyRound, modules: ["oauth"] },
      { key: "admin.dashboard.sso", href: "/admin/sso", icon: Fingerprint, modules: ["sso"] },
      { key: "admin.dashboard.realname", href: "/admin/realname-review", icon: BadgeCheck, modules: ["realname"] },
    ],
  },
  {
    labelKey: "admin.navGroup.security",
    items: [
      { key: "admin.dashboard.settings", href: "/admin/settings", icon: Settings, modules: ["settings"] },
      { key: "admin.dashboard.securityNetwork", href: "/admin/security/network", icon: Globe, modules: ["security"] },
      { key: "admin.dashboard.securityIpWhitelist", href: "/admin/security/ip-whitelist", icon: ShieldCheck, modules: ["security"] },
      { key: "admin.dashboard.securityIpBlacklist", href: "/admin/security/ip-blacklist", icon: ShieldBan, modules: ["security"] },
    ],
  },
  {
    labelKey: "admin.navGroup.permission",
    items: [
      { key: "admin.dashboard.users", href: "/admin/users", icon: Users, modules: ["users"] },
      { key: "admin.dashboard.auditLogs", href: "/admin/audit-logs", icon: ScrollText, modules: ["audit_logs"] },
    ],
  },
  {
    labelKey: "admin.navGroup.stats",
    items: [
      { key: "admin.stats.visits.title", href: "/admin/stats/visits", icon: Eye, modules: ["stats"] },
      { key: "admin.stats.activities.title", href: "/admin/stats/activities", icon: BarChart3, modules: ["stats"] },
      { key: "admin.stats.recruitment.title", href: "/admin/stats/recruitment", icon: UserPlus, modules: ["stats"] },
    ],
  },
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
  const [permCtx, setPermCtx] = useState<{
    role: string;
    overrides: PermissionOverrides | null;
  } | null>(null);
  const [checked, setChecked] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  /** 路由守卫：以后端校验结果为准（本地缓存可被篡改，不能作为授权依据） */
  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then((me) => {
        if (cancelled) return;
        const s = {
          username: me.username,
          role: me.role,
          realnameVerified: me.realname_verified,
        };
        saveSession(s);
        if (me.must_change_password) {
          router.replace("/admin/change-password");
          return;
        }
        if (!isAdminRole(me.role)) {
          router.replace("/zh-CN/profile");
          return;
        }
        // 实名守卫（Phase 6）：admin/editor 未实名禁止进后台（super_admin 豁免）
        if (
          me.role !== "super_admin" &&
          !me.realname_verified
        ) {
          router.replace("/admin/realname");
          return;
        }
        setSession(s);
        setPermCtx({ role: me.role, overrides: me.permission_overrides ?? null });
        setChecked(true);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) clearLocalSession();
        router.replace("/admin/login");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  /** 退出登录 */
  async function handleLogout() {
    await logout();
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
      <BanModal />
      {/* 桌面端侧边栏 */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 border-r border-border bg-background">
        <SidebarContent
          t={t}
          session={session}
          permCtx={permCtx}
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
                permCtx={permCtx}
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
            <PendingBadge />
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

/** 顶栏待办铃铛：待审报名 + 未关 Bug + 待处理重置，复用 overview 聚合（失败静默，点击直达审核中心） */
function PendingBadge() {
  const { t } = useI18n();
  const [count, setCount] = useState(0);
  useEffect(() => {
    fetchOverview()
      .then((o) => setCount(o.registrations_pending + o.bugs_open + o.resets_pending))
      .catch(() => {});
  }, []);
  return (
    <Button asChild variant="ghost" size="icon" aria-label={t("admin.dashboard.pendingTodos")}>
      <Link href="/admin/review" className="relative">
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    </Button>
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
  permCtx,
  isActive,
  onLogout,
  onNavigate,
}: {
  t: (k: string) => string;
  session: AdminSession | null;
  permCtx: { role: string; overrides: PermissionOverrides | null } | null;
  isActive: (h: string) => boolean;
  onLogout: () => void;
  onNavigate?: () => void;
}) {
  /** 按权限过滤后的分组（空组整组隐藏） */
  const visibleGroups = navGroups
    .map((g) => ({ ...g, items: g.items.filter((it) => canAccess(it, permCtx)) }))
    .filter((g) => g.items.length > 0);

  /** 激活项 = 可见项中与当前路径匹配的最长前缀（父级 href 与子页面区分，如 /admin/blog 与 /admin/blog/new） */
  const activeHref = visibleGroups
    .flatMap((g) => g.items)
    .filter((it) => isActive(it.href))
    .reduce((best, it) => (it.href.length > best.length ? it.href : best), "");

  /** 渲染单个导航项 —— 对齐 shadcn Button ghost 变体完整类名 */
  function renderNavItem(item: NavItem) {
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        className={cn(
          // Button ghost + size-sm 完整类名
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
          // Button ghost 变体悬停
          "hover:bg-accent hover:text-accent-foreground",
          // 侧边栏导航定制：左对齐
          "justify-start w-full px-3 h-8",
          // 激活态 = 选中（与顶栏 primary 按钮同色系）
          item.href === activeHref
            ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
            : "text-muted-foreground"
        )}
      >
        <item.icon className="h-4 w-4" />
        {t(item.key)}
      </Link>
    );
  }

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
      <nav className="flex-1 overflow-y-auto px-3 pb-6">
        {visibleGroups.map((group, gi) => (
          <div key={group.labelKey ?? `group-${gi}`} className="space-y-1">
            {group.labelKey && (
              <div className="px-3 pt-4 pb-1 text-xs font-medium text-muted-foreground/80 select-none">
                {t(group.labelKey)}
              </div>
            )}
            {group.items.map(renderNavItem)}
          </div>
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
