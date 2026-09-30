"use client";

/**
 * EventsList - 活动列表（含类型筛选）
 * 通栏筛选条（胶囊按钮，aria-pressed）+ 表格式列表：桌面四列（日期 / 类型 / 活动 / 人数），手机堆叠
 * 客户端按类型筛选；列表同时充当统计图的表格视图
 */
import { useState } from "react";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";
import type { ClubEvent } from "@/lib/content";

interface EventsListProps {
  events: ClubEvent[];
}

/**
 * 取本地化的活动字段：先查 i18n 字典，查不到回退到 markdown 原文。
 * 字典中的活动翻译位于 home.events.items.{slug}.{title|description}，
 * 由各语言 messages/*.json 维护，与 markdown frontmatter 一一对应。
 */
function localizedEventField(
  t: (key: string) => string,
  slug: string,
  field: "title" | "description",
  fallback: string
): string {
  const key = `home.events.items.${slug}.${field}`;
  const translated = t(key);
  // i18n 查不到键时 lookup 会返回 key 本身，此时回退到 markdown 内容
  return translated === key ? fallback : translated;
}

const rowGrid = "md:grid md:grid-cols-[140px_120px_minmax(0,1fr)_120px] md:items-center md:gap-x-6";

export function EventsList({ events }: EventsListProps) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<string>("all");

  const filters = [
    { key: "all", label: t("events.filterAll") },
    { key: "lecture", label: t("events.filterLecture") },
    { key: "competition", label: t("events.filterCompetition") },
    { key: "recruitment", label: t("events.filterRecruitment") },
    { key: "workshop", label: t("events.filterWorkshop") },
  ];

  const filtered = filter === "all" ? events : events.filter((e) => e.type === filter);
  const typeLabel = (type: string) =>
    t(`events.filter${type.charAt(0).toUpperCase()}${type.slice(1)}`);

  return (
    <>
      {/* 通栏筛选条 */}
      <div className="border-b border-border">
        <div className="container mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 py-4 md:h-[72px] md:py-0 flex items-center justify-between gap-4">
          <div role="group" aria-label={t("events.filterAll")} className="flex gap-2 overflow-x-auto -mx-1 px-1">
            {filters.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "h-9 shrink-0 rounded-full border px-3.5 text-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    active
                      ? "border-primary bg-primary font-semibold text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
          <span className="hidden md:inline shrink-0 font-mono text-[13px] text-muted-foreground">
            {t("events.sortByDate")} ↓
          </span>
        </div>
      </div>

      {/* 表格式列表 */}
      <div className="container mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 pt-4 md:pt-8 pb-12 md:pb-[72px]">
        <div role="table" aria-label={t("events.title")} aria-rowcount={filtered.length + 1}>
          <div
            role="row"
            className={cn(
              "hidden h-10 border-b border-border font-mono text-xs text-muted-foreground",
              rowGrid
            )}
          >
            <span role="columnheader">{t("events.dateColumn")}</span>
            <span role="columnheader">{t("events.typeColumn")}</span>
            <span role="columnheader">{t("events.title")}</span>
            <span role="columnheader" className="text-right">{t("common.participants")}</span>
          </div>
          {filtered.map((event) => (
            <div
              key={event.slug}
              role="row"
              className={cn(
                "flex flex-col gap-2 border-b border-border py-5 md:h-[84px] md:py-0",
                rowGrid
              )}
            >
              <div className="flex items-center justify-between md:contents">
                <time
                  role="cell"
                  dateTime={event.date}
                  className="font-mono text-xs md:text-sm text-muted-foreground"
                >
                  {event.date}
                </time>
                <span role="cell">
                  <span className="inline-flex h-6 items-center rounded-full border border-border px-2.5 text-xs">
                    {typeLabel(event.type)}
                  </span>
                </span>
              </div>
              <div role="cell" className="flex min-w-0 flex-col gap-1">
                <span className="text-[17px] font-semibold leading-snug md:truncate">
                  {localizedEventField(t, event.slug, "title", event.title)}
                </span>
                <span className="text-sm text-muted-foreground line-clamp-2 md:line-clamp-none md:truncate">
                  {localizedEventField(t, event.slug, "description", event.description)}
                </span>
              </div>
              <span role="cell" className="font-mono text-xs md:text-base md:text-right tabular-nums text-muted-foreground md:text-foreground">
                {event.participants.toLocaleString("en-US")}
                <span className="md:hidden"> {t("common.peopleJoined")}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
