/**
 * System Settings API - 对应后端 app/api/system.py
 *
 * 站点设置读写、IP 黑名单管理、网络配置变更历史。
 */
import { apiFetch } from "./client";
import type { NetworkConfigHistory, SystemSettings } from "@/types/api";

export function fetchSystemSettings() {
  // 公开可读，不需要 admin 鉴权（GET /api/system/settings 无鉴权）
  return apiFetch<SystemSettings>("/api/system/settings");
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

/** 网络配置变更历史（最近 5 条） */
export function fetchNetworkConfigHistory() {
  return apiFetch<NetworkConfigHistory[]>(
    "/api/system/network-config/history",
    { withAuth: true }
  );
}
