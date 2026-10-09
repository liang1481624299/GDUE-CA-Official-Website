"use client";

/**
 * /admin/activities - 活动管理（CRUD）
 * 页面只做组合；表单在 components/admin/activities/ActivityForm.tsx
 */
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteActivity,
  listActivities,
  updateActivity,
} from "@/lib/api/activities";
import { ActivityForm } from "@/components/admin/activities/ActivityForm";
import { FormattedUserActionTime } from "@/components/shared/FormattedUserActionTime";
import type { Activity } from "@/types/api";
import { Loader2, Plus, Pencil, Trash2, QrCode } from "lucide-react";

export default function ActivitiesPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [open, setOpen] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      setItems(await listActivities());
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(a: Activity) {
    setEditing(a);
    setOpen(true);
  }

  async function handleDelete(id: number) {
    if (!confirm(t("admin.activities.deleteConfirm"))) return;
    try {
      await deleteActivity(id);
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  }

  // 开放 / 关闭现场签到（报名者凭回执码在查询页签到）
  async function toggleCheckin(a: Activity) {
    try {
      await updateActivity(a.id, { checkin_open: !a.checkin_open });
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("admin.activities.title")}</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          {t("admin.activities.create")}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t("admin.activities.empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{a.title}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                      {t(`admin.activities.statuses.${a.status}`)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1 flex items-center gap-1.5">
                    <span className="truncate">{a.content || "—"}</span>
                    <span>·</span>
                    {a.register_start ? (
                      <FormattedUserActionTime utcIso={a.register_start} />
                    ) : (
                      "—"
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {/* 签到开关：开放后报名者可凭回执码签到 */}
                  <Button
                    variant={a.checkin_open ? "default" : "outline"}
                    size="sm"
                    className={a.checkin_open ? "" : "text-muted-foreground"}
                    onClick={() => toggleCheckin(a)}
                    title={a.checkin_open ? t("admin.activities.checkinOpenHint") : t("admin.activities.checkinClosedHint")}
                  >
                    <QrCode className="h-4 w-4 mr-1" />
                    {a.checkin_open
                      ? t("admin.activities.checkinOpen")
                      : t("admin.activities.checkinClosed")}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(a)} aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)} aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("admin.activities.edit") : t("admin.activities.create")}
            </DialogTitle>
          </DialogHeader>
          <ActivityForm
            initial={editing}
            onSaved={() => {
              setOpen(false);
              refresh();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
