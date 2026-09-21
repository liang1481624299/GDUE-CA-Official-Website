"use client";

/**
 * Announcements - 首页公告栏
 * 横向展示最新公告条目
 */
import { motion } from "framer-motion";
import { Megaphone } from "lucide-react";
import { useI18n } from "@/i18n/provider";

export function Announcements() {
  const { t } = useI18n();

  const items = [
    { title: t("home.announcements.item1Title"), date: t("home.announcements.item1Date") },
    { title: t("home.announcements.item2Title"), date: t("home.announcements.item2Date") },
    { title: t("home.announcements.item3Title"), date: t("home.announcements.item3Date") },
  ];

  return (
    <section className="border-y border-border bg-muted/30">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <Megaphone className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold hidden sm:inline">
              {t("home.announcements.title")}
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="flex gap-8 animate-[scroll_20s_linear_infinite] hover:[animation-play-state:paused]">
              {[...items, ...items].map((item, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-2 whitespace-nowrap text-sm"
                >
                  <span className="text-muted-foreground text-xs">{item.date}</span>
                  <span className="text-foreground">{item.title}</span>
                  <span className="text-border">|</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
