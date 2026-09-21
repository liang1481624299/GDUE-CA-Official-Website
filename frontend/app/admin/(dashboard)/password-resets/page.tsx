"use client";

/**
 * /admin/password-resets - 忘记密码申请审核页
 */
import { useState, useEffect, useCallback } from "react";
import { Loader2, Check, X, Mail, CheckCheck, XCircle, Square, SquareCheck } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  listPasswordResets,
  handlePasswordReset,
  batchHandlePasswordResets,
} from "@/lib/api/auth";
import type { PasswordResetItem } from "@/types/api";

export default function PasswordResetsPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<PasswordResetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [handlingId, setHandlingId] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  // 批量操作：已选中的申请 id（仅 pending 项可选）
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listPasswordResets(filter === "pending" ? "pending" : undefined);
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
    setSelected(new Set());
  }, [load]);

  async function handle(id: number, status: "handled" | "rejected") {
    setHandlingId(id);
    try {
      await handlePasswordReset(id, {
        status,
        admin_note: notes[id] || undefined,
      });
      await load();
    } catch {
      // 忽略
    } finally {
      setHandlingId(null);
    }
  }

  function statusBadge(s: string) {
    if (s === "pending") return <Badge variant="secondary">{t("admin.passwordResets.statuses.pending")}</Badge>;
    if (s === "handled") return <Badge variant="default">{t("admin.passwordResets.statuses.handled")}</Badge>;
    return <Badge variant="destructive">{t("admin.passwordResets.statuses.rejected")}</Badge>;
  }

  // ---------- 批量操作 ----------
  /** 已处理的申请不可再改，不可选中 */
  const isSelectable = (item: PasswordResetItem) => item.status === "pending";

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** 全选 / 取消全选（仅 pending 项） */
  function toggleSelectAll() {
    const selectable = items.filter(isSelectable).map((i) => i.id);
    const allSelected = selectable.length > 0 && selectable.every((id) => selected.has(id));
    setSelected(allSelected ? new Set() : new Set(selectable));
  }

  async function batchAction(status: "handled" | "rejected") {
    if (selected.size === 0) return;
    if (!confirm(t(`admin.passwordResets.batchConfirm.${status}`).replace("{count}", String(selected.size)))) return;
    setBatchLoading(true);
    try {
      await batchHandlePasswordResets([...selected], status);
      setSelected(new Set());
      await load();
    } catch {
      // 忽略
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-display font-bold">{t("admin.passwordResets.title")}</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSelectAll}
            disabled={items.filter(isSelectable).length === 0}
          >
            {items.filter(isSelectable).length > 0 && items.filter(isSelectable).every((i) => selected.has(i.id)) ? (
              <Square className="h-4 w-4 mr-1" />
            ) : (
              <SquareCheck className="h-4 w-4 mr-1" />
            )}
            {t("admin.passwordResets.selectAll")}
          </Button>
          <Button
            variant={filter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("pending")}
          >
            {t("admin.passwordResets.filterPending")}
          </Button>
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            {t("admin.passwordResets.filterAll")}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t("admin.passwordResets.empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className={selected.has(item.id) ? "border-primary/50" : undefined}>
              <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        {isSelectable(item) ? (
                          <button
                            type="button"
                            onClick={() => toggleSelect(item.id)}
                            className="flex items-center justify-center"
                            title={t("admin.passwordResets.selectRow")}
                          >
                            {selected.has(item.id) ? (
                              <SquareCheck className="h-4 w-4 text-primary" />
                            ) : (
                              <Square className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        ) : (
                          <span className="flex items-center justify-center w-4 opacity-30">
                            <Square className="h-4 w-4 text-muted-foreground" />
                          </span>
                        )}
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{item.contact_email}</span>
                      </div>
                      {statusBadge(item.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {item.username_hint && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">{t("admin.passwordResets.colUsername")}：</span>
                        {item.username_hint}
                      </div>
                    )}
                    <div className="text-sm">
                      <span className="text-muted-foreground">{t("admin.passwordResets.colReason")}：</span>
                      {item.reason}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("admin.passwordResets.colCreatedAt")}：{new Date(item.created_at).toLocaleString()}
                    </div>

                    {item.status === "pending" && (
                      <>
                        <Textarea
                          placeholder={t("admin.passwordResets.adminNotePlaceholder")}
                          value={notes[item.id] || ""}
                          onChange={(e) => setNotes({ ...notes, [item.id]: e.target.value })}
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={handlingId === item.id}
                            onClick={() => handle(item.id, "handled")}
                          >
                            {handlingId === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                            {t("admin.passwordResets.markHandled")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={handlingId === item.id}
                            onClick={() => handle(item.id, "rejected")}
                          >
                            <X className="h-4 w-4" />
                            {t("admin.passwordResets.markRejected")}
                          </Button>
                        </div>
                      </>
                    )}

                    {item.admin_note && item.status !== "pending" && (
                      <div className="text-sm border-t border-border pt-2">
                        <span className="text-muted-foreground">{t("admin.passwordResets.adminNote")}：</span>
                        {item.admin_note}
                      </div>
                    )}
                  </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 浮动批量操作栏：有选中项时显示在右下角 */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {t("admin.passwordResets.selected").replace("{count}", String(selected.size))}
          </span>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => batchAction("handled")} disabled={batchLoading}>
              <CheckCheck className="h-4 w-4 mr-1" />
              {t("admin.passwordResets.batchHandled")}
            </Button>
            <Button size="sm" variant="destructive" onClick={() => batchAction("rejected")} disabled={batchLoading}>
              <XCircle className="h-4 w-4 mr-1" />
              {t("admin.passwordResets.batchRejected")}
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
