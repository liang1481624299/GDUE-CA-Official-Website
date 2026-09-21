"use client";

/**
 * QuickNav - 首页快速导航入口
 * 4 个图标卡片：项目、活动、招新、博客
 */
import Link from "next/link";
import { motion } from "framer-motion";
import { FolderGit2, Calendar, UserPlus, BookOpen } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Card, CardContent } from "@/components/ui/card";

export function QuickNav() {
  const { locale, t } = useI18n();

  const items = [
    {
      icon: FolderGit2,
      title: t("home.quickNav.projectsTitle"),
      desc: t("home.quickNav.projectsDesc"),
      href: "/projects",
      color: "bg-blue-500/10 text-blue-600",
    },
    {
      icon: Calendar,
      title: t("home.quickNav.eventsTitle"),
      desc: t("home.quickNav.eventsDesc"),
      href: "/events",
      color: "bg-cyan-500/10 text-cyan-600",
    },
    {
      icon: UserPlus,
      title: t("home.quickNav.joinTitle"),
      desc: t("home.quickNav.joinDesc"),
      href: "/join",
      color: "bg-indigo-500/10 text-indigo-600",
    },
    {
      icon: BookOpen,
      title: t("home.quickNav.blogTitle"),
      desc: t("home.quickNav.blogDesc"),
      href: "/blog",
      color: "bg-sky-500/10 text-sky-600",
    },
  ];

  return (
    <section className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          {t("home.quickNav.title")}
        </h2>
        <p className="mt-2 text-muted-foreground">{t("home.quickNav.subtitle")}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: i * 0.1 }}
          >
            <Link href={`/${locale}${item.href}`}>
              <Card className="h-full hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
                <CardContent className="p-6">
                  <div
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-lg ${item.color} mb-4`}
                  >
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
