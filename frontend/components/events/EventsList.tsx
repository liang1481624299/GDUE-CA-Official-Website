"use client";

/**
 * EventsList - 活动列表组件（含类型筛选）
 * 接收所有活动数据，客户端按类型筛选
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Users } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ClubEvent } from "@/lib/content";

interface EventsListProps {
  events: ClubEvent[];
}

const typeColors: Record<string, string> = {
  lecture: "bg-blue-500/10 text-blue-600",
  competition: "bg-orange-500/10 text-orange-600",
  recruitment: "bg-green-500/10 text-green-600",
  workshop: "bg-purple-500/10 text-purple-600",
};

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

  return (
    <div>
      {/* 类型筛选 */}
      <div className="flex flex-wrap gap-2 mb-8">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 活动时间线 */}
      <div className="relative">
        <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
        <div className="space-y-4">
          {filtered.map((event, i) => (
            <motion.div
              key={event.slug}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="relative pl-10"
            >
              <div className="absolute left-3 top-4 w-2.5 h-2.5 rounded-full bg-primary -translate-x-1/2 ring-4 ring-background" />
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">
                      {localizedEventField(t, event.slug, "title", event.title)}
                    </h3>
                    <Badge
                      variant="outline"
                      className={`shrink-0 ${typeColors[event.type] || ""}`}
                    >
                      {t(`events.filter${event.type.charAt(0).toUpperCase()}${event.type.slice(1)}`)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    {localizedEventField(t, event.slug, "description", event.description)}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {event.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {event.participants} {t("common.participants")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
