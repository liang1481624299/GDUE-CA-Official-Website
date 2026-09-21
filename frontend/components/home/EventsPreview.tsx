"use client";

/**
 * EventsPreview - 首页活动预览卡片
 * 展示近期活动，接收活动数据作为 props
 */
import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, Users, ArrowRight } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ClubEvent } from "@/lib/content";

interface EventsPreviewProps {
  events: ClubEvent[];
}

/** 活动类型对应的颜色 */
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

export function EventsPreview({ events }: EventsPreviewProps) {
  const { locale, t } = useI18n();

  if (events.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {events.map((event, i) => (
        <motion.div
          key={event.slug}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, delay: i * 0.1 }}
        >
          <Card className="h-full hover:shadow-md hover:-translate-y-1 transition-all duration-300">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-lg leading-tight">
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
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
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
  );
}
