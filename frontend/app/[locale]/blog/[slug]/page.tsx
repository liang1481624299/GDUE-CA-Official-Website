import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { getDictionary } from "@/i18n/dictionary";
import { getAllBlogPosts, getBlogPost } from "@/lib/content";
import { locales } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { MarkdownRenderer } from "@/components/blog/MarkdownRenderer";

/** 为所有文章和语言生成静态参数 */
export async function generateStaticParams() {
  const posts = getAllBlogPosts();
  return locales.flatMap((locale) =>
    posts.map((post) => ({
      locale,
      slug: post.slug,
    }))
  );
}

/** 生成 metadata */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug, locale } = await params;
  const dict = await getDictionary(locale);
  const post = getBlogPost(slug);

  if (!post) notFound();

  return (
    <article className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
      {/* 返回链接 */}
      <Link
        href={`/${locale}/blog`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        {dict.blog.title}
      </Link>

      {/* 文章头部 */}
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
          {post.title}
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {post.date}
          </span>
          <span className="flex items-center gap-1.5">
            <User className="h-4 w-4" />
            {post.author}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <Badge key={tag} variant="accent">{tag}</Badge>
          ))}
        </div>
      </header>

      {/* 文章正文 */}
      <MarkdownRenderer content={post.content} />
    </article>
  );
}
