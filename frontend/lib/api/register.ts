/**
 * Registration API - 对应后端 app/api/register.py
 *
 * 活动报名与社团报名的提交、列表、状态更新、导出。
 */
import { apiFetch, API_BASE_URL, getToken } from "./client";
import type {
  Registration,
  RegistrationCreate,
  RegistrationStatus,
  RegistrationType,
} from "@/types/api";

/** 活动报名：POST /api/registrations/for/{activityId} */
export function submitRegistration(activityId: number, payload: RegistrationCreate) {
  return apiFetch<Registration>(`/api/registrations/for/${activityId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** 社团报名（意向部门入会）：POST /api/registrations/club */
export function submitClubRegistration(payload: RegistrationCreate) {
  return apiFetch<Registration>("/api/registrations/club", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listRegistrations(params?: {
  activity_id?: number;
  status?: RegistrationStatus;
  registration_type?: RegistrationType;
}) {
  const qs = new URLSearchParams();
  if (params?.activity_id) qs.set("activity_id", String(params.activity_id));
  if (params?.status) qs.set("status", params.status);
  if (params?.registration_type) qs.set("registration_type", params.registration_type);
  const query = qs.toString();
  return apiFetch<Registration[]>(
    `/api/registrations${query ? `?${query}` : ""}`,
    { withAuth: true }
  );
}

/** 后端 PATCH 用 Query 参数传递 status/remark，不是 body */
export function setRegistrationStatus(
  id: number,
  status: RegistrationStatus,
  remark?: string
) {
  const qs = new URLSearchParams();
  qs.set("status", status);
  if (remark !== undefined) qs.set("remark", remark);
  return apiFetch<Registration>(`/api/registrations/${id}?${qs.toString()}`, {
    method: "PATCH",
    withAuth: true,
  });
}

/** 触发文件下载：浏览器直接打开导出 URL（带 token 通过查询参数） */
export function exportRegistrationsUrl(params: {
  activityId?: number;
  registrationType?: RegistrationType;
  fmt: "csv" | "xlsx";
}) {
  const qs = new URLSearchParams();
  if (params.activityId) qs.set("activity_id", String(params.activityId));
  if (params.registrationType) qs.set("registration_type", params.registrationType);
  qs.set("fmt", params.fmt);
  const token = getToken();
  if (token) qs.set("token", token);
  return `${API_BASE_URL}/api/registrations/export?${qs.toString()}`;
}
