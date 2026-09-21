import { getDictionary } from "@/i18n/dictionary";
import { getAllEvents } from "@/lib/content";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Card, CardContent } from "@/components/ui/card";
import { EventsChart } from "@/components/events/EventsChart";
import { EventsList } from "@/components/events/EventsList";

/**
 * 活动页面 - 过往活动记录、讲座、竞赛、招新活动
 * 包含参与人数统计图表（Recharts）和活动时间线
 */
export default async function EventsPage() {
  const dict = await getDictionary();
  const events = getAllEvents();

  return (
    <>
      <PageHeader title={dict.events.title} subtitle={dict.events.subtitle} />

      <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
        {/* 参与人数统计图表 */}
        <section className="mb-16">
          <SectionHeading
            title={dict.events.chartTitle}
            subtitle={dict.events.chartSubtitle}
          />
          <Card>
            <CardContent className="pt-6">
              <EventsChart events={events} />
            </CardContent>
          </Card>
        </section>

        {/* 活动时间线 */}
        <section>
          <EventsList events={events} />
        </section>
      </div>
    </>
  );
}
