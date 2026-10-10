import { getAllEvents } from "@/lib/content";
import { fetchClubEvents } from "@/lib/api/activities";
import { Hero } from "@/components/home/Hero";
import { Announcements } from "@/components/home/Announcements";
import { EventsPreview } from "@/components/home/EventsPreview";
import { QuickNav } from "@/components/home/QuickNav";
import { JoinCTA } from "@/components/home/JoinCTA";
import { DirectionalTransition } from "@/components/shared/DirectionalTransition";

/**
 * 首页 - 横幅（简介 + 数据格）、最新公告、近期活动（便当格）、快速导航、加入社团
 * 项目预览（components/home/ProjectsPreview）暂未在首页展示
 *
 * 近期活动数据源：活动 CMS（ISR 60s）；后端不可用时回退本地 markdown
 */
export const revalidate = 60;

export default async function HomePage() {
  const events = await fetchClubEvents()
    .then((list) => list.slice(0, 4))
    .catch(() => getAllEvents().slice(0, 4));

  return (
    <DirectionalTransition>
      <Hero />
      <Announcements />
      <EventsPreview events={events} />
      <QuickNav />
      <JoinCTA />
    </DirectionalTransition>
  );
}
