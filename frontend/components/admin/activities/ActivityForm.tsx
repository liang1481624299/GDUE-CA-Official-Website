"use client";

/**
 * 活动创建/编辑表单（供 /admin/activities 的 Dialog 使用）
 *
 * 规范校验：名称/描述/分类/报名起止必填，人数上限为 ≥0 整数，截止须晚于开始。
 */
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createActivity,
  updateActivity,
} from "@/lib/api/activities";
import type { Activity, ActivityStatus } from "@/types/api";

const STATUSES: ActivityStatus[] = [
  "draft",
  "published",
  "registration_open",
  "ended",
  "archived",
];

export function ActivityForm({
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
  // Phase 3：活动开始/结束时间（发布活动时双必填）
  const [startAt, setStartAt] = useState(
    initial?.start_at ? initial.start_at.slice(0, 16) : ""
  );
  const [endAt, setEndAt] = useState(
    initial?.end_at ? initial.end_at.slice(0, 16) : ""
  );
  const [maxParticipants, setMaxParticipants] = useState<string>(
    initial ? String(initial.max_participants) : "0"
  );
  const [status, setStatus] = useState<ActivityStatus>(
    initial?.status ?? "draft"
  );
  const [coverUrl, setCoverUrl] = useState(initial?.cover_url ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = t("admin.activities.fieldRequired");
    if (!content.trim()) next.content = t("admin.activities.fieldRequired");
    if (!category.trim()) next.category = t("admin.activities.fieldRequired");
    if (!registerStart) next.registerStart = t("admin.activities.fieldRequired");
    if (!registerEnd) next.registerEnd = t("admin.activities.fieldRequired");
    // Phase 3：活动开始/结束时间双必填
    if (!startAt) next.startAt = t("admin.activities.fieldRequired");
    if (!endAt) next.endAt = t("admin.activities.fieldRequired");
    const cap = Number(maxParticipants);
    if (
      maxParticipants === "" ||
      !Number.isInteger(cap) ||
      cap < 0
    ) {
      next.maxParticipants = t("admin.activities.capacityInvalid");
    }
    if (registerStart && registerEnd) {
      const s = new Date(registerStart).getTime();
      const e = new Date(registerEnd).getTime();
      if (e <= s) next.registerEnd = t("admin.activities.dateOrder");
    }
    // Phase 3：活动时间顺序校验
    if (startAt && endAt) {
      const s = new Date(startAt).getTime();
      const e = new Date(endAt).getTime();
      if (e <= s) next.endAt = t("admin.activities.dateOrder");
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        content: content.trim(),
        category: category.trim(),
        register_start: new Date(registerStart).toISOString(),
        register_end: new Date(registerEnd).toISOString(),
        // Phase 3：活动开始/结束时间
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
        max_participants: Number(maxParticipants) || 0,
        status,
        cover_url: coverUrl.trim() || undefined,
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
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        {fieldErrors.title && <p className="text-xs text-destructive">{fieldErrors.title}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="content">{t("admin.activities.description")}</Label>
        <Textarea id="content" rows={3} value={content} onChange={(e) => setContent(e.target.value)} />
        {fieldErrors.content && <p className="text-xs text-destructive">{fieldErrors.content}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="category">{t("admin.activities.category")}</Label>
          <Input
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder={t("admin.activities.categoryPlaceholder")}
          />
          {fieldErrors.category && <p className="text-xs text-destructive">{fieldErrors.category}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxParticipants">{t("admin.activities.capacity")}</Label>
          <Input
            id="maxParticipants"
            type="number"
            min={0}
            step={1}
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(e.target.value)}
          />
          {fieldErrors.maxParticipants && (
            <p className="text-xs text-destructive">{fieldErrors.maxParticipants}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="registerStart">{t("admin.activities.registerStart")}</Label>
          <Input
            id="registerStart"
            type="datetime-local"
            value={registerStart}
            onChange={(e) => setRegisterStart(e.target.value)}
          />
          {fieldErrors.registerStart && (
            <p className="text-xs text-destructive">{fieldErrors.registerStart}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="registerEnd">{t("admin.activities.registerEnd")}</Label>
          <Input
            id="registerEnd"
            type="datetime-local"
            value={registerEnd}
            onChange={(e) => setRegisterEnd(e.target.value)}
          />
          {fieldErrors.registerEnd && (
            <p className="text-xs text-destructive">{fieldErrors.registerEnd}</p>
          )}
        </div>
      </div>
      {/* Phase 3：活动开始/结束时间（发布活动时双必填） */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="startAt">{t("admin.activities.startAt")}</Label>
          <Input
            id="startAt"
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
          />
          {fieldErrors.startAt && (
            <p className="text-xs text-destructive">{fieldErrors.startAt}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="endAt">{t("admin.activities.endAt")}</Label>
          <Input
            id="endAt"
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
          />
          {fieldErrors.endAt && (
            <p className="text-xs text-destructive">{fieldErrors.endAt}</p>
          )}
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
              <option key={s} value={s}>
                {t(`admin.activities.statuses.${s}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="coverUrl">{t("admin.activities.coverUrl")}</Label>
          <Input
            id="coverUrl"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            placeholder={t("admin.activities.coverUrlPlaceholder")}
          />
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
