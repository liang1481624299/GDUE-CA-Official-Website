/**
 * System Settings API - 对应后端 app/api/system.py
 *
 * 站点设置读写、IP 黑名单管理。
 */
import { apiFetch } from "./client";
import type { SystemSettings } from "@/types/api";

export function fetchSystemSettings() {
  return apiFetch<SystemSettings>("/api/system/settings", { withAuth: true });
}

export function updateSystemSettings(payload: Partial<SystemSettings>) {
  return apiFetch<SystemSettings>("/api/system/settings", {
    method: "PUT",
    withAuth: true,
    body: JSON.stringify(payload),
  });
}

/** 后端 IP 黑名单接口用 QUERY 参数 ?ip=xxx */
export function addIpBlacklist(ip: string) {
  return apiFetch<{ blacklist: string[] }>(
    `/api/system/ip-blacklist?ip=${encodeURIComponent(ip)}`,
    {
      method: "POST",
      withAuth: true,
    }
  );
}

export function removeIpBlacklist(ip: string) {
  return apiFetch<{ blacklist: string[] }>(
    `/api/system/ip-blacklist?ip=${encodeURIComponent(ip)}`,
    {
      method: "DELETE",
      withAuth: true,
    }
  );
}
