import type { Metadata } from "next";
import { getDictionary, getLocale } from "@/i18n/dictionary";
import { getAllProjects, getProject, getAllTechStacks, getAllProjectYears } from "@/lib/content";
import { PageHeader } from "@/components/shared/PageHeader";
import { ProjectList } from "@/components/projects/ProjectList";
import { notFound } from "next/navigation";
import { locales } from "@/lib/i18n";

/**
 * 项目展示页 - 项目卡片列表，支持按技术栈筛选
 */
export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const projects = getAllProjects();
  const techStacks = getAllTechStacks();
  const years = getAllProjectYears();

  return (
    <>
      <PageHeader title={dict.projects.title} subtitle={dict.projects.subtitle} />
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <ProjectList projects={projects} techStacks={techStacks} years={years} />
      </div>
    </>
  );
}
