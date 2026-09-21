"use client";

/**
 * Hero - 首页横幅区
 * 包含社团名称、口号、描述、CTA 按钮和统计数据
 * 使用 Framer Motion 入场动画
 */
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Code2, Users, Calendar, Trophy } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";

export function Hero() {
  const { locale, t } = useI18n();

  const stats = [
    { icon: Users, label: t("home.hero.stat1"), value: "36" },
    { icon: Code2, label: t("home.hero.stat2"), value: "7" },
    { icon: Calendar, label: t("home.hero.stat3"), value: "14" },
    { icon: Trophy, label: t("home.hero.stat4"), value: "2008" },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/5">
      {/* 网格背景纹理 */}
      <div className="grid-pattern absolute inset-0 opacity-40" />
      {/* 装饰渐变光晕 */}
      <div className="absolute top-1/4 -right-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-0 -left-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-28 relative">
        <div className="text-center max-w-3xl mx-auto">
          {/* 徽章 */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-sm font-medium text-secondary-foreground mb-6"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t("home.hero.badge")}
          </motion.div>

          {/* 标题 */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight"
          >
            <span className="gradient-text">{t("home.hero.title")}</span>
          </motion.h1>

          {/* 副标题 */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 text-xl md:text-2xl text-muted-foreground font-display"
          >
            {t("home.hero.subtitle")}
          </motion.p>

          {/* 描述 */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-6 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            {t("home.hero.description")}
          </motion.p>

          {/* CTA 按钮 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-4"
          >
            <Button asChild size="lg" className="gap-2">
              <Link href={`/${locale}/join`}>
                {t("home.hero.cta1")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={`/${locale}/about`}>{t("home.hero.cta2")}</Link>
            </Button>
          </motion.div>
        </div>

        {/* 统计数据 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-3xl mx-auto"
        >
          {stats.map((stat, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card/50 backdrop-blur-sm p-4"
            >
              <stat.icon className="h-5 w-5 text-primary" />
              <span className="text-2xl md:text-3xl font-bold font-display">
                {stat.value}
              </span>
              <span className="text-xs md:text-sm text-muted-foreground text-center">
                {stat.label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
