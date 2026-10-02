"use client";

/**
 * Announcements - 首页公告栏
 * 桌面：标签 + 三栏公告（细线分隔，单行截断）；手机：纵向列表
 * 按日期从新到旧排列
 */
import { useI18n } from "@/i18n/provider";

export function Announcements() {
  const { t } = useI18n();

  const items = [1, 2, 3]
    .map((n) => ({
      title: t(`home.announcements.item${n}Title`),
      date: t(`home.announcements.item${n}Date`),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

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
        <ul className="flex flex-col md:flex-row md:flex-1 md:min-w-0">
          {items.map((item) => (
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
      </div>
    </section>
  );
}
