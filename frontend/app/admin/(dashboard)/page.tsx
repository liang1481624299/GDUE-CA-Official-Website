"use client";

/**
 * /admin 仪表盘首页：展示活动/报名/Bug 概览统计
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, ClipboardList, Bug, Clock } from "lucide-react";
import { listActivities } from "@/lib/api/activities";
import { listRegistrations } from "@/lib/api/register";
import { listBugReports } from "@/lib/api/bugReport";
import type { Activity, Registration, BugReport } from "@/types/api";

export default function AdminDashboardPage() {
  const { t } = useI18n();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listActivities().catch(() => [] as Activity[]),
      listRegistrations().catch(() => [] as Registration[]),
      listBugReports().catch(() => [] as BugReport[]),
    ]).then(([a, r, b]) => {
      setActivities(a);
      setRegistrations(r);
      setBugs(b);
      setLoading(false);
    });
  }, []);

  const pending = registrations.filter((r) => r.status === "pending").length;
  const openBugs = bugs.filter((b) => !b.resolved).length;

  const stats = [
    {
      label: t("admin.dashboard.statsActivities"),
      value: activities.length,
      icon: CalendarDays,
      href: "/admin/activities",
      color: "bg-blue-500/10 text-blue-600",
    },
    {
      label: t("admin.dashboard.statsRegistrations"),
      value: registrations.length,
      icon: ClipboardList,
      href: "/admin/registrations",
      color: "bg-emerald-500/10 text-emerald-600",
    },
    {
      label: t("admin.dashboard.statsPending"),
      value: pending,
      icon: Clock,
      href: "/admin/registrations?status=pending",
      color: "bg-amber-500/10 text-amber-600",
    },
    {
      label: t("admin.dashboard.statsBugs"),
      value: openBugs,
      icon: Bug,
      href: "/admin/bugs?status=open",
      color: "bg-rose-500/10 text-rose-600",
    },
  ];

  if (loading) {
    return (
      <div className="text-muted-foreground">{t("common.loading")}</div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("admin.dashboard.overview")}</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all">
              <CardContent className="p-5">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${s.color} mb-3`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="text-3xl font-bold">{s.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("admin.dashboard.registrations")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {registrations.slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/60 last:border-0">
                <span className="font-medium truncate">{r.name}</span>
                <span className="text-xs text-muted-foreground">{new Date(r.submitted_at).toLocaleDateString()}</span>
              </div>
            ))}
            {registrations.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("admin.registrations.empty")}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("admin.dashboard.bugs")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {bugs.slice(0, 5).map((b) => (
              <div key={b.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/60 last:border-0">
                <span className="font-medium truncate">{b.description.slice(0, 60)}</span>
                <span className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</span>
              </div>
            ))}
            {bugs.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("admin.bugs.empty")}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
