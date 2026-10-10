/**
 * Activity API - 对应后端 app/api/activities.py
 *
 * 活动的列表/创建/更新/删除。
 * 前台活动页数据源：listArchivedActivities() + mapActivityToClubEvent()
 * 映射为原有 ClubEvent 形状，列表/统计图展示逻辑保持不变。
 */
import { apiFetch } from "./client";
import type { Activity, ActivityCreate } from "@/types/api";
import type { ClubEvent } from "@/lib/content";

export function listActivities() {
  return apiFetch<Activity[]>("/api/activities?status_filter=all");
}

/** 公开归档列表：含历史已结束活动（草稿/归档不可见），供前台活动页 */
export function listArchivedActivities() {
  return apiFetch<Activity[]>("/api/activities?status_filter=archive");
}

/**
 * 后端活动 → 前台 ClubEvent 形状（与原 markdown 数据源字段一一对应）：
 * type←category、date←start_at 前 10 位（YYYY-MM-DD）、images 保持空数组兼容
 */
export function mapActivityToClubEvent(a: Activity): ClubEvent {
  return {
    slug: a.slug ?? `activity-${a.id}`,
    title: a.title,
    type: (a.category as ClubEvent["type"]) || "workshop",
    date: a.start_at ? a.start_at.slice(0, 10) : a.created_at.slice(0, 10),
    description: a.description,
    participants: a.participants ?? 0,
    images: [],
    content: a.content,
  };
}

/** 前台活动页数据：归档列表映射为 ClubEvent 并按活动日期降序（原 getAllEvents 语义） */
export async function fetchClubEvents(): Promise<ClubEvent[]> {
  const items = await listArchivedActivities();
  return items
    .map(mapActivityToClubEvent)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function createActivity(payload: ActivityCreate) {
  return apiFetch<Activity>("/api/activities", {
    method: "POST",
    withAuth: true,
    body: JSON.stringify(payload),
  });
}

export function updateActivity(
  id: number,
  payload: Partial<ActivityCreate> & { checkin_open?: boolean }
) {
  return apiFetch<Activity>(`/api/activities/${id}`, {
    method: "PATCH",
    withAuth: true,
    body: JSON.stringify(payload),
  });
}

export function deleteActivity(id: number) {
  return apiFetch<void>(`/api/activities/${id}`, {
    method: "DELETE",
    withAuth: true,
  });
}
