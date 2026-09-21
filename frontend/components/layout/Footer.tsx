"use client";

/**
 * Footer - 页脚组件
 * 包含社团简介、快速链接、联系方式与版权信息
 */
import Link from "next/link";
import { Terminal, Github, Mail, MapPin } from "lucide-react";
import { useI18n } from "@/i18n/provider";

/** 页脚导航链接 */
const footerLinks = [
  { key: "nav.home", href: "" },
  { key: "nav.about", href: "/about" },
  { key: "nav.projects", href: "/projects" },
  { key: "nav.events", href: "/events" },
  { key: "nav.blog", href: "/blog" },
  { key: "nav.join", href: "/join" },
  { key: "nav.contact", href: "/contact" },
] as const;

export function Footer() {
  const { locale, t } = useI18n();

  function localePath(href: string) {
    return `/${locale}${href}`;
  }

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* 社团简介 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-display font-bold text-lg">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Terminal className="h-4 w-4" />
              </span>
              GDUECA
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("footer.description")}
            </p>
          </div>

          {/* 快速链接 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t("footer.quickLinks")}
            </h3>
            <ul className="grid grid-cols-2 gap-2">
              {footerLinks.map((item) => (
                <li key={item.key}>
                  <Link
                    href={localePath(item.href)}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {t(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 联系方式 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t("footer.connect")}
            </h3>
            <div className="space-y-2">
              <a
                href="mailto:gdueca@feishu.millennium.dpdns.org"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Mail className="h-4 w-4" />
                gdueca@feishu.millennium.dpdns.org
              </a>
              <a
                href="https://github.com/GDUE-Computer-Association"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Github className="h-4 w-4" />
                github.com/GDUE-Computer-Association
              </a>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{t("contact.address")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 版权信息 */}
        <div className="mt-10 pt-6 border-t border-border flex flex-col items-center gap-2">
          <p className="text-xs text-muted-foreground">
            {t("footer.copyright")}
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Link
              href={localePath("/terms")}
              className="hover:text-primary transition-colors"
            >
              {t("footer.terms")}
            </Link>
            <span className="text-border">|</span>
            <Link
              href={localePath("/privacy")}
              className="hover:text-primary transition-colors"
            >
              {t("footer.privacy")}
            </Link>
            <span className="text-border">|</span>
            <Link
              href={localePath("/disclaimer")}
              className="hover:text-primary transition-colors"
            >
              {t("footer.disclaimer")}
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("footer.madeWith")}
          </p>
        </div>
      </div>
    </footer>
  );
}
