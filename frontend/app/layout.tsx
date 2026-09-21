import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "@/app/globals.css";

/**
 * 根 layout：所有路由（含 / 和 /admin）共享
 * 负责 <html><body>、字体变量、防 FOUC 主题脚本、全局 CSS
 * 各子 layout（[locale] / admin）负责具体的 Provider 与框架
 */
const displayFont = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const monoFont = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "广东第二师范学院计算机协会",
    template: "%s | 广东第二师范学院计算机协会",
  },
  description: "广东第二师范学院（花都校区）计算机协会官方网站",
};

/** 防 FOUC 主题初始化脚本：在 hydration 前根据 localStorage/系统偏好设置主题 */
function ThemeInitScript() {
  return (
    <Script
      id="gdueca-theme-init"
      strategy="beforeInteractive"
      suppressHydrationWarning
    >
      {`(function(){try{var s=localStorage.getItem('gdueca-theme');var t=s||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`}
    </Script>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="zh-CN"
      className={`${displayFont.variable} ${monoFont.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeInitScript />
        <link rel="preconnect" href="https://fonts.googleapis.com" fetchPriority="high" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" fetchPriority="low" />
      </head>
      <body className="min-h-full flex flex-col bg-background">
        {children}
      </body>
    </html>
  );
}
