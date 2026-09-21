"use client";

/**
 * NavDesktop - 桌面端顶部导航栏
 * - 固定 header，三列 grid（左Logo / 中导航居中 / 右操作区）
 * - 滚动时切换背景模糊
 * - 桌面端显示主题切换、语言切换、报名 CTA、管理员入口
 * - 移动端汉堡按钮触发 NavMobile 抽屉（由本组件持有 mobileOpen 状态并下传）
 *
 * 配套组件：NavMobile.tsx（移动端右侧抽屉，由本组件渲染）
 */
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Terminal, ShieldCheck, Menu } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { NavMobile } from "@/components/layout/NavMobile";
import { cn } from "@/lib/utils";

/** 导航项配置（不含「报名」—— 报名在桌面 CTA 与移动抽屉底部） */
const navItems = [
  { key: "nav.home", href: "" },
  { key: "nav.events", href: "/events" },
  { key: "nav.blog", href: "/blog" },
  { key: "nav.projects", href: "/projects" },
  { key: "nav.about", href: "/about" },
  { key: "nav.contact", href: "/contact" },
] as const;

export function NavDesktop() {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  /** 检测滚动状态，添加背景模糊效果 */
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /** 构建带语言前缀的路径 */
  function localePath(href: string) {
    return `/${locale}${href}`;
  }

  /** 判断当前路由是否激活 */
  function isActive(href: string) {
    const fullHref = localePath(href);
    if (href === "") {
      return pathname === `/${locale}`;
    }
    return pathname.startsWith(fullHref);
  }

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-background/80 backdrop-blur-md border-b border-border shadow-sm"
            : "bg-transparent"
        )}
      >
        <nav className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* 三列 grid：左Logo / 中导航（真正居中）/ 右操作区 */}
          <div className="grid h-16 grid-cols-2 md:grid-cols-[1fr_auto_1fr] items-center">
            <Link
              href={localePath("")}
              className="flex items-center gap-2 font-display font-bold text-lg justify-self-start"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Terminal className="h-5 w-5" />
              </span>
              <span className="hidden sm:inline">GDUECA</span>
            </Link>

            {/* 桌面端导航 - 居中 */}
            <div className="hidden md:flex items-center gap-1 justify-self-center">
              {navItems.map((item) => (
                <Link
                  key={item.key}
                  href={localePath(item.href)}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "text-primary bg-secondary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {t(item.key)}
                </Link>
              ))}
            </div>

            {/* 右侧操作区 */}
            <div className="flex items-center gap-1 justify-self-end">
              <div className="hidden md:flex items-center gap-1">
                <ThemeToggle />
                <LanguageSwitcher />
              </div>
              <Button asChild size="sm" className="hidden md:inline-flex">
                <Link href={localePath("/join")}>{t("nav.join")}</Link>
              </Button>
              {/* 管理员入口：仅桌面端可见，移动端在抽屉底部 */}
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="hidden md:inline-flex rounded-full"
                aria-label={t("nav.admin")}
                title={t("nav.admin")}
              >
                <Link href="/admin">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                </Link>
              </Button>
              {/* 移动端汉堡菜单按钮 */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label={t("nav.menu")}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </nav>
      </motion.header>

      {/* 移动端右侧抽屉（状态由桌面端汉堡按钮触发） */}
      <NavMobile open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
