/**
 * Activity API - 对应后端 app/api/activities.py
 *
 * 活动的列表/创建/更新/删除。
 */
import { apiFetch } from "./client";
import type { Activity, ActivityCreate } from "@/types/api";

export function listActivities() {
  return apiFetch<Activity[]>("/api/activities?status_filter=all");
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
