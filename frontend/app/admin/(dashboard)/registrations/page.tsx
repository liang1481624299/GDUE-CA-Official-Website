"use client";

/**
 * /admin/registrations - 报名审阅
 * 活动报名 + 社团报名 合并列表，支持按类型/活动/状态筛选
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { listActivities } from "@/lib/api/activities";
import {
  listRegistrations,
  setRegistrationStatus,
  exportRegistrationsUrl,
} from "@/lib/api/register";
import type {
  Activity,
  Registration,
  RegistrationStatus,
  RegistrationType,
} from "@/types/api";
import { Download, Check, X, UserCheck } from "lucide-react";

const STATUSES: RegistrationStatus[] = ["pending", "approved", "rejected", "checked_in"];
const TYPES: RegistrationType[] = ["activity", "club"];

function typeLabel(t: RegistrationType, tfn: (k: string) => string) {
  return t === "activity" ? tfn("admin.registrations.typeActivity") : tfn("admin.registrations.typeClub");
}

export default function RegistrationsPage() {
  const { t } = useI18n();
  const search = useSearchParams();
  const [items, setItems] = useState<Registration[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityId, setActivityId] = useState<string>(search.get("activity_id") ?? "");
  const [status, setStatus] = useState<string>(search.get("status") ?? "");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Registration | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const params: {
        activity_id?: number;
        status?: RegistrationStatus;
        registration_type?: RegistrationType;
      } = {};
      if (activityId) params.activity_id = Number(activityId);
      if (status) params.status = status as RegistrationStatus;
      if (typeFilter) params.registration_type = typeFilter as RegistrationType;
      setItems(await listRegistrations(params));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    listActivities().then(setActivities).catch(() => setActivities([]));
  }, []);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId, status, typeFilter]);

  async function changeStatus(id: number, newStatus: RegistrationStatus) {
    try {
      await setRegistrationStatus(id, newStatus);
      await refresh();
      setDetail(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed");
    }
  }

  function exportFile(fmt: "csv" | "xlsx") {
    // club 类型导出：用 registration_type=club
    if (typeFilter === "club") {
      window.open(
        exportRegistrationsUrl({ registrationType: "club", fmt }),
        "_blank"
      );
      return;
    }
    // activity 类型必须指定 activity_id
    if (!activityId) {
      alert(t("register.selectEvent"));
      return;
    }
    window.open(
      exportRegistrationsUrl({ activityId: Number(activityId), fmt }),
      "_blank"
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("admin.registrations.title")}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportFile("csv")}>
            <Download className="h-4 w-4 mr-1" />
            {t("admin.registrations.exportCsv")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportFile("xlsx")}>
            <Download className="h-4 w-4 mr-1" />
            {t("admin.registrations.exportXlsx")}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">{t("admin.registrations.filterType")}</option>
          {TYPES.map((tp) => (
            <option key={tp} value={tp}>{typeLabel(tp, t)}</option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={activityId}
          onChange={(e) => setActivityId(e.target.value)}
          disabled={typeFilter === "club"}
        >
          <option value="">{t("admin.registrations.filterActivity")}</option>
          {activities.map((a) => (
            <option key={a.id} value={a.id}>{a.title}</option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">{t("admin.registrations.filterStatus")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{t(`admin.registrations.statuses.${s}`)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-muted-foreground">{t("common.loading")}</div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t("admin.registrations.empty")}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">类型</th>
                  <th className="px-3 py-2">{t("admin.registrations.colName")}</th>
                  <th className="px-3 py-2">{t("admin.registrations.colStudentId")}</th>
                  <th className="px-3 py-2 hidden md:table-cell">{t("admin.registrations.colCollege")}</th>
                  <th className="px-3 py-2 hidden lg:table-cell">{t("admin.registrations.colMajor")}</th>
                  <th className="px-3 py-2">{t("admin.registrations.colPhone")}</th>
                  <th className="px-3 py-2">{t("admin.registrations.colStatus")}</th>
                  <th className="px-3 py-2 hidden sm:table-cell">{t("admin.registrations.colSubmittedAt")}</th>
                  <th className="px-3 py-2">{t("admin.activities.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        r.registration_type === "club"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-blue-500/10 text-blue-600"
                      }`}>
                        {typeLabel(r.registration_type, t)}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-medium">{r.name}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.student_id}</td>
                    <td className="px-3 py-2 hidden md:table-cell">{r.college}</td>
                    <td className="px-3 py-2 hidden lg:table-cell">{r.major}</td>
                    <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{r.phone_cc} {r.phone_number}</td>
                    <td className="px-3 py-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-secondary">
                        {t(`admin.registrations.statuses.${r.status}`)}
                      </span>
                    </td>
                    <td className="px-3 py-2 hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(r.submitted_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setDetail(r)}>
                          {t("admin.registrations.viewDetail")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{detail?.name}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3">
              <DetailRow label="类型" value={typeLabel(detail.registration_type, t)} />
              <DetailRow label={t("admin.registrations.colStudentId")} value={detail.student_id} />
              <DetailRow label={t("admin.registrations.colCollege")} value={detail.college} />
              <DetailRow label={t("admin.registrations.colMajor")} value={detail.major} />
              <DetailRow label={t("admin.registrations.colPhone")} value={`${detail.phone_cc} ${detail.phone_number}`} />
              <DetailRow label={t("admin.registrations.colEmail")} value={detail.email ?? "—"} />
              <DetailRow label={t("join.form.position")} value={detail.position ?? "—"} />
              <DetailRow label={t("join.form.introduction")} value={detail.introduction ?? "—"} />
              <DetailRow label={t("admin.registrations.colStatus")} value={t(`admin.registrations.statuses.${detail.status}`)} />
              {detail.remark && (
                <DetailRow label={t("admin.registrations.remark")} value={detail.remark} />
              )}
              <DetailRow label={t("admin.registrations.colSubmittedAt")} value={new Date(detail.submitted_at).toLocaleString()} />
              <div className="flex gap-2 pt-3">
                <Button size="sm" onClick={() => changeStatus(detail.id, "approved")} disabled={detail.status === "approved"}>
                  <Check className="h-4 w-4 mr-1" />{t("admin.registrations.approve")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => changeStatus(detail.id, "rejected")} disabled={detail.status === "rejected"}>
                  <X className="h-4 w-4 mr-1" />{t("admin.registrations.reject")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => changeStatus(detail.id, "checked_in")} disabled={detail.status === "checked_in"}>
                  <UserCheck className="h-4 w-4 mr-1" />{t("admin.registrations.checkIn")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right break-all">{value}</span>
    </div>
  );
}
