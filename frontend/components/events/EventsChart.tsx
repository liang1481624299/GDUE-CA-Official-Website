"use client";

/**
 * EventsChart - 活动参与人数统计图表
 * 使用 Recharts 渲染柱状图，展示各活动参与人数
 */
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ClubEvent } from "@/lib/content";

interface EventsChartProps {
  events: ClubEvent[];
}

export function EventsChart({ events }: EventsChartProps) {
  const data = events.map((e) => ({
    name: e.title.length > 10 ? e.title.slice(0, 8) + "…" : e.title,
    participants: e.participants,
  }));

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "13px",
            }}
            labelStyle={{ color: "hsl(var(--foreground))" }}
          />
          <Bar
            dataKey="participants"
            fill="hsl(var(--primary))"
            radius={[6, 6, 0, 0]}
            name="参与人数"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
