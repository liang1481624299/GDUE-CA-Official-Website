/**
 * AuditLogs API - 对应后端 app/api/audit.py
 *
 * 操作日志只读查询：分页 + action 前缀筛选 + 关键词搜索。
 */
import { apiFetch } from "./client";
import type { AuditLogInfo, Paginated } from "@/types/api";

/** 管理：操作日志分页列表 */
export function adminListAuditLogs(
  params: {
    action?: string;
    q?: string;
    page?: number;
    page_size?: number;
  } = {}
) {
  const qs = new URLSearchParams();
  if (params.action) qs.set("action", params.action);
  if (params.q) qs.set("q", params.q);
  if (params.page) qs.set("page", String(params.page));
  if (params.page_size) qs.set("page_size", String(params.page_size));
  const query = qs.toString();
  return apiFetch<Paginated<AuditLogInfo>>(
    `/api/admin/audit-logs${query ? `?${query}` : ""}`
  );
}
