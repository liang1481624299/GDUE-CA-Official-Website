"use client";

/**
 * /admin/password-resets - 忘记密码申请审核页
 */
import { useState, useEffect, useCallback } from "react";
import { Loader2, Check, X, Mail } from "lucide-react";
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
} from "@/lib/api/auth";
import type { PasswordResetItem } from "@/types/api";

export default function PasswordResetsPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<PasswordResetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [handlingId, setHandlingId] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-display font-bold">{t("admin.passwordResets.title")}</h1>
        <div className="flex gap-2">
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
            <Card key={item.id}>
              <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
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
    </div>
  );
}
