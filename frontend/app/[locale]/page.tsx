import { getDictionary } from "@/i18n/dictionary";
import { getAllProjects, getAllEvents } from "@/lib/content";
import { Hero } from "@/components/home/Hero";
import { Announcements } from "@/components/home/Announcements";
import { ProjectsPreview } from "@/components/home/ProjectsPreview";
import { QuickNav } from "@/components/home/QuickNav";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { EventsPreview } from "@/components/home/EventsPreview";

/**
 * 首页 - 社团简介横幅、最新公告、活动预览、项目卡片、快速导航
 */
export default async function HomePage() {
  const dict = await getDictionary();
  const projects = getAllProjects();
  const events = getAllEvents().slice(0, 4);

  return (
    <>
      <Hero />
      <Announcements />

      {/* 活动预览 */}
      <section className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <SectionHeading
          title={dict.home.events.title}
          subtitle={dict.home.events.subtitle}
        />
        <EventsPreview events={events} />
      </section>

      {/* 项目预览 */}
      {/* <ProjectsPreview projects={projects} /> */}

      {/* 快速导航 */}
      <QuickNav />
    </>
  );
}
