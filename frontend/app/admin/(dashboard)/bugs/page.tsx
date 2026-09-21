"use client";

/**
 * /admin/bugs - Bug 反馈列表
 * 字段对齐后端 BugReport：receipt_code/content_lang/contact_email/contact_phone/description/extra/resolved/created_at
 * description/extra 按后台显示语言自动翻译（可查看原文）
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listBugReports, setBugResolved, batchUpdateBugs } from "@/lib/api/bugReport";
import { batchTranslate } from "@/lib/api/translations";
import type { BugReport, TranslationResult } from "@/types/api";
import { Check, RotateCcw, Languages, CheckCheck, Square, SquareCheck } from "lucide-react";

// 简易 t 映射：避免对 zh-CN.json status 子键做条件判断
function statusLabel(resolved: boolean, t: (k: string) => string) {
  return resolved ? t("admin.bugs.statuses.resolved") : t("admin.bugs.statuses.open");
}

export default function BugsPage() {
  const { t, locale } = useI18n();
  const search = useSearchParams();
  const [items, setItems] = useState<BugReport[]>([]);
  const [resolvedFilter, setResolvedFilter] = useState<string>(search.get("status") ?? "");
  const [loading, setLoading] = useState(true);
  // 自动翻译：key = b{id}.{field}
  const [trans, setTrans] = useState<Record<string, TranslationResult>>({});
  // 批量操作：已选中的记录 id
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);

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
    setSelected(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedFilter]);

  /** 列表变化或显示语言变化时，自动翻译非当前语言的 description/extra */
  useEffect(() => {
    if (items.length === 0) {
      setTrans({});
      return;
    }
    const batch = [];
    for (const b of items) {
      if (b.content_lang && b.content_lang !== locale) {
        if (b.description) batch.push({ key: `b${b.id}.description`, text: b.description.slice(0, 2000), source_lang: b.content_lang });
        if (b.extra) batch.push({ key: `b${b.id}.extra`, text: b.extra.slice(0, 2000), source_lang: b.content_lang });
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

  /** 取翻译后字段（查看原文时回退原文） */
  function tv(b: BugReport, field: "description" | "extra"): string {
    const res = trans[`b${b.id}.${field}`];
    if (res?.translated) return res.text;
    return (b[field] as string) ?? "";
  }

  async function toggle(b: BugReport) {
    try {
      await setBugResolved(b.id, !b.resolved);
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed");
    }
  }

  // ---------- 批量操作 ----------
  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** 全选 / 取消全选 */
  function toggleSelectAll() {
    const allSelected = items.length > 0 && items.every((b) => selected.has(b.id));
    setSelected(allSelected ? new Set() : new Set(items.map((b) => b.id)));
  }

  async function batchAction(resolved: boolean) {
    if (selected.size === 0) return;
    if (!confirm(t(resolved ? "admin.bugs.batchConfirmResolve" : "admin.bugs.batchConfirmReopen").replace("{count}", String(selected.size)))) return;
    setBatchLoading(true);
    try {
      await batchUpdateBugs([...selected], resolved);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("admin.bugs.title")}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={toggleSelectAll} disabled={items.length === 0}>
            {items.length > 0 && items.every((b) => selected.has(b.id)) ? (
              <Square className="h-4 w-4 mr-1" />
            ) : (
              <SquareCheck className="h-4 w-4 mr-1" />
            )}
            {t("admin.bugs.selectAll")}
          </Button>
          <select
            className="h-8 rounded-md border border-input bg-background px-3 text-sm"
            value={resolvedFilter}
            onChange={(e) => setResolvedFilter(e.target.value)}
          >
            <option value="">{t("admin.bugs.filterStatus")}</option>
            <option value="open">{t("admin.bugs.statuses.open")}</option>
            <option value="resolved">{t("admin.bugs.statuses.resolved")}</option>
          </select>
        </div>
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
          {items.map((b) => {
            const descTr = trans[`b${b.id}.description`]?.translated;
            const shown = tv(b, "description");
            return (
              <Card key={b.id} className={selected.has(b.id) ? "border-primary/50" : undefined}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleSelect(b.id)}
                        className="mt-0.5 flex items-center justify-center shrink-0"
                        title={t("admin.bugs.selectRow")}
                      >
                        {selected.has(b.id) ? (
                          <SquareCheck className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                      <h3 className="font-semibold whitespace-pre-wrap">{shown.slice(0, 80)}</h3>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary whitespace-nowrap">
                      {statusLabel(b.resolved, t)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                    <code className="font-mono">{b.receipt_code}</code>
                    {descTr && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() =>
                          setTrans((prev) => ({
                            ...prev,
                            [`b${b.id}.description`]: { ...prev[`b${b.id}.description`], translated: !prev[`b${b.id}.description`].translated },
                          }))
                        }
                      >
                        <Languages className="h-3 w-3 mr-1" />
                        {trans[`b${b.id}.description`].translated
                          ? t("admin.trans.showOriginal")
                          : t("admin.trans.hideOriginal")}
                      </Button>
                    )}
                  </div>
                  {shown.length > 80 && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{shown}</p>
                  )}
                  {b.extra && (
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap pt-1 border-t border-border/60">
                      {t("admin.bugs.colUrl")}: {tv(b, "extra")}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
                    {b.contact_email && <span>{t("admin.bugs.colContact")}: {b.contact_email}</span>}
                    {b.contact_phone && <span>{t("admin.bugs.colContact")}: {b.contact_phone}</span>}
                    <span>{t("admin.bugs.colCreatedAt")}: {new Date(b.created_at).toLocaleString()}</span>
                    <span className="font-mono">IP: {b.submit_ip ?? "-"}</span>
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
            );
          })}
        </div>
      )}

      {/* 浮动批量操作栏：有选中项时显示在右下角 */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {t("admin.bugs.selected").replace("{count}", String(selected.size))}
          </span>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => batchAction(true)} disabled={batchLoading}>
              <CheckCheck className="h-4 w-4 mr-1" />
              {t("admin.bugs.batchResolve")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => batchAction(false)} disabled={batchLoading}>
              <RotateCcw className="h-4 w-4 mr-1" />
              {t("admin.bugs.batchReopen")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} disabled={batchLoading}>
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
