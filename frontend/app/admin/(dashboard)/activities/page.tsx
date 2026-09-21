"use client";

/**
 * /admin/activities - 活动管理（CRUD）
 * 字段对齐后端 Activity：title/content/category/status/register_start/register_end/max_participants/cover_url
 */
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createActivity,
  deleteActivity,
  listActivities,
  updateActivity,
} from "@/lib/api/activities";
import type { Activity, ActivityStatus } from "@/types/api";
import { Loader2, Plus, Pencil, Trash2, QrCode } from "lucide-react";

const STATUSES: ActivityStatus[] = [
  "draft",
  "published",
  "registration_open",
  "ended",
  "archived",
];

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
        <div className="text-muted-foreground">{t("common.loading")}</div>
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
                      {t(`admin.activities.statuses.${a.status}`) !== `admin.activities.statuses.${a.status}`
                        ? t(`admin.activities.statuses.${a.status}`)
                        : a.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {a.content || "—"} · {a.register_start ? new Date(a.register_start).toLocaleString() : "—"}
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
        <DialogContent className="max-w-lg">
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

function ActivityForm({
  initial,
  onSaved,
}: {
  initial: Activity | null;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [registerStart, setRegisterStart] = useState(
    initial?.register_start ? initial.register_start.slice(0, 16) : ""
  );
  const [registerEnd, setRegisterEnd] = useState(
    initial?.register_end ? initial.register_end.slice(0, 16) : ""
  );
  const [maxParticipants, setMaxParticipants] = useState<string>(
    initial ? String(initial.max_participants) : "0"
  );
  const [status, setStatus] = useState<ActivityStatus>(
    initial?.status ?? "draft"
  );
  const [coverUrl, setCoverUrl] = useState(initial?.cover_url ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title,
        content,
        category: category || undefined,
        register_start: registerStart ? new Date(registerStart).toISOString() : undefined,
        register_end: registerEnd ? new Date(registerEnd).toISOString() : undefined,
        max_participants: Number(maxParticipants) || 0,
        status,
        cover_url: coverUrl || undefined,
      };
      if (initial) {
        await updateActivity(initial.id, payload);
      } else {
        await createActivity(payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">{t("admin.activities.name")}</Label>
        <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="content">{t("admin.activities.description")}</Label>
        <Textarea id="content" rows={3} value={content} onChange={(e) => setContent(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="category">分类</Label>
          <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="如：技术讲座" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxParticipants">{t("admin.activities.capacity")}</Label>
          <Input
            id="maxParticipants"
            type="number"
            min={0}
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="registerStart">报名开始</Label>
          <Input
            id="registerStart"
            type="datetime-local"
            value={registerStart}
            onChange={(e) => setRegisterStart(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="registerEnd">报名截止</Label>
          <Input
            id="registerEnd"
            type="datetime-local"
            value={registerEnd}
            onChange={(e) => setRegisterEnd(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="status">{t("admin.activities.status")}</Label>
          <select
            id="status"
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as ActivityStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="coverUrl">封面 URL</Label>
          <Input id="coverUrl" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="可选" />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={saving} className="w-full">
        {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
        {t("admin.activities.save")}
      </Button>
    </form>
  );
}
