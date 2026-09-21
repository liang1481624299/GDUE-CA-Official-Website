"use client";

/**
 * /admin/bugs - Bug 反馈列表
 * 字段对齐后端 BugReport：contact_email/contact_phone/description/extra/resolved/created_at
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listBugReports, setBugResolved } from "@/lib/api/bugReport";
import type { BugReport } from "@/types/api";
import { Check, RotateCcw } from "lucide-react";

// 简易 t 映射：避免对 zh-CN.json status 子键做条件判断
function statusLabel(resolved: boolean, t: (k: string) => string) {
  return resolved ? t("admin.bugs.statuses.resolved") : t("admin.bugs.statuses.open");
}

export default function BugsPage() {
  const { t } = useI18n();
  const search = useSearchParams();
  const [items, setItems] = useState<BugReport[]>([]);
  const [resolvedFilter, setResolvedFilter] = useState<string>(search.get("status") ?? "");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const params: { resolved?: boolean } = {};
      if (resolvedFilter === "open") params.resolved = false;
      else if (resolvedFilter === "resolved") params.resolved = true;
      setItems(await listBugReports(params));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedFilter]);

  async function toggle(b: BugReport) {
    try {
      await setBugResolved(b.id, !b.resolved);
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("admin.bugs.title")}</h1>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={resolvedFilter}
          onChange={(e) => setResolvedFilter(e.target.value)}
        >
          <option value="">{t("admin.bugs.filterStatus")}</option>
          <option value="open">{t("admin.bugs.statuses.open")}</option>
          <option value="resolved">{t("admin.bugs.statuses.resolved")}</option>
        </select>
      </div>

      {loading ? (
        <div className="text-muted-foreground">{t("common.loading")}</div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t("admin.bugs.empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((b) => (
            <Card key={b.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold">{b.description.slice(0, 80) || t("admin.bugs.colTitle")}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary whitespace-nowrap">
                    {statusLabel(b.resolved, t)}
                  </span>
                </div>
                {b.description.length > 80 && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{b.description}</p>
                )}
                {b.extra && (
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap pt-1 border-t border-border/60">
                    {t("admin.bugs.colUrl")}: {b.extra}
                  </p>
                )}
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
                  {b.contact_email && <span>{t("admin.bugs.colContact")}: {b.contact_email}</span>}
                  {b.contact_phone && <span>{t("admin.bugs.colContact")}: {b.contact_phone}</span>}
                  <span>{t("admin.bugs.colCreatedAt")}: {new Date(b.created_at).toLocaleString()}</span>
                </div>
                <div className="pt-2">
                  {b.resolved ? (
                    <Button size="sm" variant="outline" onClick={() => toggle(b)}>
                      <RotateCcw className="h-4 w-4 mr-1" />
                      {t("admin.bugs.reopen")}
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => toggle(b)}>
                      <Check className="h-4 w-4 mr-1" />
                      {t("admin.bugs.markResolved")}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
