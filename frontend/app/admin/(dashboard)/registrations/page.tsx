"use client";

/**
 * /admin/registrations - 报名审阅
 * 活动报名 + 社团报名 合并列表，支持按类型/活动/状态筛选
 */
import { useEffect, useState, type ReactNode } from "react";
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
  batchSetRegistrationStatus,
  exportRegistrationsUrl,
} from "@/lib/api/register";
import { batchTranslate } from "@/lib/api/translations";
import type {
  Activity,
  Registration,
  RegistrationStatus,
  RegistrationType,
  TranslationResult,
} from "@/types/api";
import { Download, Check, X, Languages, CheckCheck, XCircle, Square, SquareCheck } from "lucide-react";

const STATUSES: RegistrationStatus[] = ["pending", "approved", "rejected", "checked_in"];
const TYPES: RegistrationType[] = ["activity", "club"];

function typeLabel(t: RegistrationType, tfn: (k: string) => string) {
  return t === "activity" ? tfn("admin.registrations.typeActivity") : tfn("admin.registrations.typeClub");
}

export default function RegistrationsPage() {
  const { t, locale } = useI18n();
  const search = useSearchParams();
  const [items, setItems] = useState<Registration[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityId, setActivityId] = useState<string>(search.get("activity_id") ?? "");
  const [status, setStatus] = useState<string>(search.get("status") ?? "");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Registration | null>(null);
  // 自动翻译：key = r{id}.{field}
  const [trans, setTrans] = useState<Record<string, TranslationResult>>({});
  const [showOriginal, setShowOriginal] = useState(false);
  // 批量操作：已选中的记录 id（已签到记录不可选，审核结果不可改）
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);

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
    setSelected(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId, status, typeFilter]);

  /** 列表变化或显示语言变化时，自动把非当前语言的文本批量翻译 */
  useEffect(() => {
    if (items.length === 0) {
      setTrans({});
      return;
    }
    const batch = [];
    for (const r of items) {
      if (r.content_lang && r.content_lang !== locale) {
        if (r.introduction) batch.push({ key: `r${r.id}.introduction`, text: r.introduction.slice(0, 2000), source_lang: r.content_lang });
        if (r.college) batch.push({ key: `r${r.id}.college`, text: r.college, source_lang: r.content_lang });
        if (r.major) batch.push({ key: `r${r.id}.major`, text: r.major, source_lang: r.content_lang });
        if (r.position) batch.push({ key: `r${r.id}.position`, text: r.position, source_lang: r.content_lang });
      }
    }
    if (batch.length === 0) {
      setTrans({});
      return;
    }
    let cancelled = false;
    batchTranslate(batch, locale)
      .then((d) => { if (!cancelled) setTrans(d.translations); })
      .catch(() => { if (!cancelled) setTrans({}); });
    return () => { cancelled = true; };
  }, [items, locale]);

  /** 取翻译后的字段值（查看原文时返回原文） */
  function tv(r: Registration, field: "introduction" | "college" | "major" | "position"): string {
    if (!showOriginal) {
      const res = trans[`r${r.id}.${field}`];
      if (res?.translated) return res.text;
    }
    return (r[field] as string | null) ?? "—";
  }

  const hasTranslation = (r: Registration) =>
    Boolean(trans[`r${r.id}.introduction`]?.translated ||
      trans[`r${r.id}.college`]?.translated ||
      trans[`r${r.id}.major`]?.translated ||
      trans[`r${r.id}.position`]?.translated);

  async function changeStatus(id: number, newStatus: RegistrationStatus) {
    try {
      await setRegistrationStatus(id, newStatus);
      await refresh();
      setDetail(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed");
    }
  }

  // ---------- 批量操作 ----------
  /** 已签到记录的审核结果不可再改，不可选中 */
  const isSelectable = (r: Registration) => r.status !== "checked_in";

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** 全选 / 取消全选（跳过已签到） */
  function toggleSelectAll() {
    const selectable = items.filter(isSelectable).map((r) => r.id);
    const allSelected = selectable.length > 0 && selectable.every((id) => selected.has(id));
    setSelected(allSelected ? new Set() : new Set(selectable));
  }

  async function batchAction(newStatus: "approved" | "rejected") {
    if (selected.size === 0) return;
    if (!confirm(t(`admin.registrations.batchConfirm.${newStatus}`).replace("{count}", String(selected.size)))) return;
    setBatchLoading(true);
    try {
      const res = await batchSetRegistrationStatus([...selected], newStatus);
      if (res.skipped.length > 0) {
        alert(t("admin.registrations.batchSkipped").replace("{count}", String(res.skipped.length)));
      }
      setSelected(new Set());
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Batch update failed");
    } finally {
      setBatchLoading(false);
    }
  }

  /** Ctrl+A / Cmd+A 全选（输入框聚焦时不拦截） */
  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && (e.key === "a" || e.key === "A")) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement)?.isContentEditable) return;
        e.preventDefault();
        toggleSelectAll();
      }
    }
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, selected]);

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
          <Button variant="outline" size="sm" onClick={toggleSelectAll} disabled={items.filter(isSelectable).length === 0}>
            {items.filter(isSelectable).length > 0 && items.filter(isSelectable).every((r) => selected.has(r.id)) ? (
              <Square className="h-4 w-4 mr-1" />
            ) : (
              <SquareCheck className="h-4 w-4 mr-1" />
            )}
            {t("admin.registrations.selectAll")}
          </Button>
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
                  <th className="px-3 py-2 w-10">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="flex items-center justify-center text-muted-foreground hover:text-foreground"
                      title={t("admin.registrations.selectAll")}
                    >
                      {(() => {
                        const selectable = items.filter(isSelectable).map((r) => r.id);
                        const allSelected = selectable.length > 0 && selectable.every((id) => selected.has(id));
                        const someSelected = selectable.some((id) => selected.has(id));
                        return allSelected ? (
                          <SquareCheck className="h-4 w-4 text-primary" />
                        ) : someSelected ? (
                          <Square className="h-4 w-4 text-primary fill-primary/40" />
                        ) : (
                          <Square className="h-4 w-4" />
                        );
                      })()}
                    </button>
                  </th>
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
                  <tr key={r.id} className={`border-t border-border hover:bg-muted/30 ${selected.has(r.id) ? "bg-primary/5" : ""}`}>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => toggleSelect(r.id)}
                        disabled={!isSelectable(r)}
                        className="flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                        title={isSelectable(r) ? t("admin.registrations.selectRow") : t("admin.registrations.checkedInLock")}
                      >
                        {selected.has(r.id) ? (
                          <SquareCheck className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        r.registration_type === "club"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-blue-500/10 text-blue-600"
                      }`}>
                        {typeLabel(r.registration_type, t)}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {r.name}
                      <div className="font-mono text-[10px] text-muted-foreground mt-0.5">{r.receipt_code}</div>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{r.student_id}</td>
                    <td className="px-3 py-2 hidden md:table-cell">{tv(r, "college")}</td>
                    <td className="px-3 py-2 hidden lg:table-cell">{tv(r, "major")}</td>
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
              <div className="flex items-center gap-2 flex-wrap">
                <code className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                  {detail.receipt_code}
                </code>
                {hasTranslation(detail) && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowOriginal(!showOriginal)}>
                    <Languages className="h-3.5 w-3.5 mr-1" />
                    {showOriginal ? t("admin.trans.hideOriginal") : t("admin.trans.showOriginal")}
                  </Button>
                )}
              </div>
              <DetailRow label="类型" value={typeLabel(detail.registration_type, t)} />
              <DetailRow label={t("admin.registrations.colStudentId")} value={detail.student_id} />
              <DetailRow label={t("admin.registrations.colCollege")} value={tv(detail, "college")} />
              <DetailRow label={t("admin.registrations.colMajor")} value={tv(detail, "major")} />
              <DetailRow label={t("admin.registrations.colPhone")} value={`${detail.phone_cc} ${detail.phone_number}`} />
              <DetailRow label={t("admin.registrations.colEmail")} value={detail.email ?? "—"} />
              <DetailRow label={t("join.form.position")} value={tv(detail, "position")} />
              <div className="space-y-1">
                <DetailRow label={t("join.form.introduction")} value={tv(detail, "introduction")} />
                {trans[`r${detail.id}.introduction`]?.translated && !showOriginal && (
                  <p className="text-xs text-muted-foreground border-l-2 border-border pl-2 whitespace-pre-wrap ml-auto max-w-[70%]">
                    {detail.introduction}
                  </p>
                )}
              </div>
              <DetailRow label={t("admin.registrations.colStatus")} value={t(`admin.registrations.statuses.${detail.status}`)} />
              {detail.checked_in_at && (
                <DetailRow
                  label={t("admin.registrations.checkedInAt")}
                  value={new Date(detail.checked_in_at).toLocaleString()}
                />
              )}
              {detail.remark && (
                <DetailRow label={t("admin.registrations.remark")} value={detail.remark} />
              )}
              <DetailRow label={t("admin.registrations.colSubmittedAt")} value={new Date(detail.submitted_at).toLocaleString()} />
              <DetailRow label={t("admin.registrations.submitIp")} value={<code className="text-xs">{detail.submit_ip ?? "-"}</code>} />
              {/* 审核只提供 通过/拒绝；签到由报名者凭回执码在查询页完成 */}
              <div className="flex gap-2 pt-3">
                <Button
                  size="sm"
                  onClick={() => changeStatus(detail.id, "approved")}
                  disabled={detail.status === "approved" || detail.status === "checked_in"}
                >
                  <Check className="h-4 w-4 mr-1" />{t("admin.registrations.approve")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => changeStatus(detail.id, "rejected")}
                  disabled={detail.status === "rejected" || detail.status === "checked_in"}
                >
                  <X className="h-4 w-4 mr-1" />{t("admin.registrations.reject")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 浮动批量操作栏：有选中项时显示在右下角 */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {t("admin.registrations.selected").replace("{count}", String(selected.size))}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => batchAction("approved")}
              disabled={batchLoading}
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              {t("admin.registrations.batchApprove")}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => batchAction("rejected")}
              disabled={batchLoading}
            >
              <XCircle className="h-4 w-4 mr-1" />
              {t("admin.registrations.batchReject")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelected(new Set())}
              disabled={batchLoading}
            >
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right break-all">{value}</span>
    </div>
  );
}
