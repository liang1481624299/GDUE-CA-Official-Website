/**
 * API 客户端公共层
 *
 * 统一处理：
 * - baseURL（从环境变量读取，默认 http://localhost:8000）
 * - JSON 序列化/反序列化
 * - 错误信息提取
 * - 管理员鉴权头（自动附加 Authorization: Bearer <token>）
 *
 * 各 lib/api/* 业务模块基于 apiFetch 实现具体接口调用。
 * 公开接口（报名/Bug）不带 token；管理接口由调用方传 withAuth=true。
 */

/**
 * 后端 API 基础地址
 *
 * 优先级：NEXT_PUBLIC_API_BASE_URL 环境变量 > 动态推导
 * - 服务端（RSC/SSR）：回退到 http://localhost:8000（前后端同机）
 * - 客户端（浏览器）：从 window.location 动态推导（协议+主机名+8000端口）
 *   确保其他设备通过局域网 IP / 域名访问时 API 请求也指向同一服务器
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : "http://localhost:8000");

/** 标准化后端错误响应：FastAPI 通常返回 { detail: string | [{msg}] ] } */
export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, detail: unknown, message?: string) {
    super(message ?? (typeof detail === "string" ? detail : "API error"));
    this.status = status;
    this.detail = detail;
  }
}

/** 从 localStorage 取 admin JWT（仅客户端可用） */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("gdueca_admin_token");
}

/** 提取 detail 文案：兼容 string 与验证错误数组 */
function extractDetail(data: unknown): string {
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const detail = (data as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      const first = detail[0] as { msg?: string } | undefined;
      if (first?.msg) return first.msg;
    }
  }
  return "请求失败，请稍后重试";
}

/** 核心请求函数 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit & { withAuth?: boolean } = {}
): Promise<T> {
  const { withAuth = false, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  if (withAuth) {
    const token = getToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
    });
  } catch {
    throw new ApiError(0, null, "网络错误，无法连接到服务器");
  }

  if (!res.ok) {
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      // 非 JSON 响应，忽略
    }
    throw new ApiError(res.status, data, extractDetail(data));
  }

  // 204 或空内容
  if (res.status === 204) return null as T;
  const text = await res.text();
  if (!text) return null as T;
  return JSON.parse(text) as T;
}
