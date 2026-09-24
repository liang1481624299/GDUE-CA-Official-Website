import type { Metadata } from "next";
import Script from "next/script";
import { locales, defaultLocale, localeHtmlLang, type Locale } from "@/lib/i18n";
import { getDictionaryByLocale } from "@/i18n/dictionary";
import { I18nProvider } from "@/i18n/provider";
import { SessionHeartbeat } from "@/components/shared/SessionHeartbeat";
import { NavDesktop } from "@/components/layout/NavDesktop";
import { Footer } from "@/components/layout/Footer";

/** 为每个语言生成静态参数 */
export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

/** 动态 metadata */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionaryByLocale(locale as Locale);
  return {
    title: {
      default: dict.meta.title,
      template: `%s | ${dict.meta.title}`,
    },
    description: dict.meta.description,
    keywords: dict.meta.keywords.split(","),
    openGraph: {
      title: dict.meta.title,
      description: dict.meta.description,
      type: "website",
    },
  };
}

/** schema.org EducationalOrganization JSON-LD */
const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "广东第二师范学院计算机协会",
  alternateName: "GDUE Computer Association",
  url: "https://gdueca.example.edu.cn",
  address: {
    "@type": "PostalAddress",
    addressRegion: "广东省",
    addressLocality: "广州市花都区",
    streetAddress: "工业大道11号",
    addressCountry: "CN",
  },
  parentOrganization: {
    "@type": "CollegeOrUniversity",
    name: "广东第二师范学院",
  },
  description:
    "广东第二师范学院（花都校区）计算机协会 - 学生计算机社团",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeStr } = await params;
  const locale = localeStr as Locale;
  const messages = await getDictionaryByLocale(locale);

  // 同步设置 <html lang>（根 layout 默认 zh-CN，此处按当前 locale 修正）
  if (typeof window === "undefined") {
    // 服务端：通过 setLang 在客户端首次渲染前修正
  }

  return (
    <>
      {/* 设置当前 locale 对应的 html lang（客户端 script 在 hydration 前修正） */}
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.lang=${JSON.stringify(
            localeHtmlLang[locale] || "zh-CN"
          )};`,
        }}
      />
      {/* Umami 网站统计脚本（非 Google Analytics） */}
      {process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID &&
        process.env.NEXT_PUBLIC_UMAMI_SRC && (
          <Script
            async
            src={process.env.NEXT_PUBLIC_UMAMI_SRC}
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
            strategy="afterInteractive"
            fetchPriority="low"
          />
        )}

      {/* schema.org EducationalOrganization 结构化数据 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />

      <I18nProvider locale={locale} messages={messages}>
        <SessionHeartbeat />
        <NavDesktop />
        <main className="flex-1 pt-16">{children}</main>
        <Footer />
      </I18nProvider>
    </>
  );
}
