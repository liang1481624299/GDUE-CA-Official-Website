"use client";

/**
 * PageHeader - 页面顶部标题区组件
 * 用于内页的标题与副标题展示，带渐变背景
 */
import { motion } from "framer-motion";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <header className="relative overflow-hidden border-b border-border bg-gradient-to-b from-secondary/50 to-background">
      <div className="grid-pattern absolute inset-0 opacity-50" />
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-4 text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
        </motion.div>
      </div>
    </header>
  );
}
