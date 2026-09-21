import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Github, ExternalLink } from "lucide-react";
import { getDictionary, getLocale } from "@/i18n/dictionary";
import { getAllProjects, getProject } from "@/lib/content";
import { locales } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarkdownRenderer } from "@/components/blog/MarkdownRenderer";

/** 为所有项目和语言生成静态参数 */
export async function generateStaticParams() {
  const projects = getAllProjects();
  return locales.flatMap((locale) =>
    projects.map((project) => ({
      locale,
      slug: project.slug,
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
  const project = getProject(slug);
  if (!project) return {};
  return {
    title: project.title,
    description: project.description,
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const dict = await getDictionary();
  const locale = await getLocale();
  const project = getProject(slug);

  if (!project) notFound();

  return (
    <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
      {/* 返回链接 */}
      <Link
        href={`/${locale}/projects`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        {dict.projects.title}
      </Link>

      {/* 项目标题区 */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
          {project.title}
        </h1>
        <p className="text-lg text-muted-foreground mb-4">{project.description}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {project.techStack.map((tech) => (
            <Badge key={tech} variant="accent">{tech}</Badge>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          {project.githubUrl && (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                <Github className="h-4 w-4" />
                {dict.common.viewGithub}
              </a>
            </Button>
          )}
          {project.demoUrl && (
            <Button asChild size="sm" className="gap-2">
              <a href={project.demoUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                {dict.common.viewDemo}
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* 截图画廊 */}
      {project.screenshots.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">{dict.projects.detail.screenshots}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {project.screenshots.map((screenshot, i) => (
              <div
                key={i}
                className="aspect-video rounded-lg overflow-hidden border border-border bg-muted"
              >
                <img
                  src={screenshot}
                  alt={`${project.title} screenshot ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 项目详情与成员信息 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Markdown 内容 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{dict.projects.detail.description}</CardTitle>
            </CardHeader>
            <CardContent>
              <MarkdownRenderer content={project.content} />
            </CardContent>
          </Card>
        </div>

        {/* 侧边栏信息 */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{dict.common.techStack}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {project.techStack.map((tech) => (
                  <Badge key={tech} variant="secondary">{tech}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{dict.common.members}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{project.leader}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
