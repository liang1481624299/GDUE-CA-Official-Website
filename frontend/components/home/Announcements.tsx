"use client";

/**
 * Announcements - 首页公告栏
 * 桌面：标签 + 三栏公告（细线分隔，单行截断）；手机：纵向列表
 * 数据源：CMS 主页公告（category=home）前 3 条；加载中/失败/为空时回退到 i18n 内置公告
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { listPublicAnnouncements } from "@/lib/api/announcements";
import { FormattedUserActionTime } from "@/components/shared/FormattedUserActionTime";
import type { Announcement } from "@/types/api";

/** 外链新窗口打开，站内链接走 next/link；无链接时直接渲染内容 */
function AnnouncementLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

export function Announcements() {
  const { t } = useI18n();
  const [cmsItems, setCmsItems] = useState<Announcement[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listPublicAnnouncements("home")
      .then((list) => {
        if (!cancelled) setCmsItems(list.slice(0, 3));
      })
      .catch(() => {
        if (!cancelled) setCmsItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fallbackItems = [1, 2, 3]
    .map((n) => ({
      title: t(`home.announcements.item${n}Title`),
      date: t(`home.announcements.item${n}Date`),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const items = cmsItems && cmsItems.length > 0 ? cmsItems : null;

  return (
    <section
      aria-labelledby="announcements-title"
      className="border-b border-border bg-card"
    >
      <div className="container mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 py-7 md:py-0 md:h-[88px] flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
        <div className="flex items-baseline justify-between md:w-[120px] md:shrink-0 md:flex-col md:gap-0.5">
          <h2 id="announcements-title" className="text-[15px] md:text-sm font-semibold tracking-normal">
            {t("home.announcements.title")}
          </h2>
          <span aria-hidden="true" className="font-mono text-[11px] text-muted-foreground">
            NOTICE
          </span>
        </div>
        {items ? (
          <ul className="flex flex-col md:flex-row md:flex-1 md:min-w-0">
            {items.map((a) => (
              <li
                key={a.id}
                className="flex min-w-0 flex-col gap-1 py-4 first:pt-0 md:py-0 md:flex-1 md:pl-6 border-b last:border-b-0 md:border-b-0 md:border-l border-border"
              >
                <FormattedUserActionTime
                  utcIso={a.start_at ?? a.created_at}
                  className="font-mono text-xs text-muted-foreground self-start"
                />
                {a.link ? (
                  <AnnouncementLink href={a.link} className="block min-w-0">
                    <span
                      className="text-[15px] md:text-sm leading-normal md:truncate block"
                      title={a.title}
                    >
                      {a.title}
                    </span>
                  </AnnouncementLink>
                ) : (
                  <span
                    className="text-[15px] md:text-sm leading-normal md:truncate"
                    title={a.title}
                  >
                    {a.title}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <ul className="flex flex-col md:flex-row md:flex-1 md:min-w-0">
            {fallbackItems.map((item) => (
              <li
                key={item.date + item.title}
                className="flex min-w-0 flex-col gap-1 py-4 first:pt-0 md:py-0 md:flex-1 md:pl-6 border-b last:border-b-0 md:border-b-0 md:border-l border-border"
              >
                <time dateTime={item.date} className="font-mono text-xs text-muted-foreground">
                  {item.date}
                </time>
                <span className="text-[15px] md:text-sm leading-normal md:truncate" title={item.title}>
                  {item.title}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
