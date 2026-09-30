/**
 * API 客户端公共层
 *
 * 统一处理：
 * - baseURL（浏览器默认同源 /api，由 Next.js rewrites 反代到后端）
 * - JSON 序列化/反序列化
 * - 错误信息提取
 * - 登录态：后端下发 HttpOnly Cookie，前端脚本不接触 token（防 XSS 窃取）
 * - CSRF：写请求自动附加 X-CSRF-Token 头（双重提交令牌）
 *
 * 各 lib/api/* 业务模块基于 apiFetch 实现具体接口调用。
 */

/**
 * 后端 API 基础地址
 *
 * 优先级：NEXT_PUBLIC_API_BASE_URL 环境变量 > 默认值
 * - 客户端（浏览器）：默认空串 = 同源请求 /api/*，由 next.config.ts rewrites 转发到后端，
 *   局域网 IP / 域名访问都无需跨域，Cookie 为第一方 Cookie
 * - 服务端（RSC/SSR）：直连后端 BACKEND_URL（默认 http://127.0.0.1:8000）
 */
// 用 || 而非 ??：.env 中写成空值（VAR=）时视同未设置
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (typeof window !== "undefined"
    ? ""
    : process.env.BACKEND_URL || "http://127.0.0.1:8000");

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

/* ---------- CSRF 令牌 ---------- */

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
let csrfToken: string | null = null;
let csrfPending: Promise<string> | null = null;

/** 登录成功后后端会轮换令牌，由调用方写回 */
export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

/** 获取 CSRF 令牌（内存缓存，首次请求 GET /api/auth/csrf） */
export async function getCsrfToken(forceRefresh = false): Promise<string> {
  if (csrfToken && !forceRefresh) return csrfToken;
  if (!csrfPending) {
    csrfPending = fetch(`${API_BASE_URL}/api/auth/csrf`, { credentials: "include" })
      .then((res) => res.json() as Promise<{ csrf_token: string }>)
      .then((data) => {
        csrfToken = data.csrf_token;
        return csrfToken;
      })
      .finally(() => {
        csrfPending = null;
      });
  }
  return csrfPending;
}

/** 提取 detail 文案：兼容 string 与验证错误数组 */
function extractDetail(data: unknown): string {
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const detail = (data as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      const first = detail[0] as { msg?: string } | undefined;
      if (first?.msg) return first.msg.replace(/^Value error, /, "");
    }
  }
  return "请求失败，请稍后重试";
}

function isCsrfFailure(status: number, data: unknown): boolean {
  return (
    status === 403 &&
    !!data &&
    typeof data === "object" &&
    (data as { code?: unknown }).code === "csrf_failed"
  );
}

/**
 * 发送带登录态（Cookie）与 CSRF 头的请求；CSRF 令牌过期时自动刷新重试一次。
 * FormData 等非 JSON 请求也走这里（不设置 Content-Type）。
 */
export async function secureFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const send = async (refresh: boolean) => {
    const headers = new Headers(init.headers);
    if (UNSAFE_METHODS.has(method)) {
      headers.set("X-CSRF-Token", await getCsrfToken(refresh));
    }
    return fetch(`${API_BASE_URL}${path}`, {
      ...init,
      method,
      headers,
      credentials: "include",
    });
  };

  let res = await send(false);
  if (res.status === 403 && UNSAFE_METHODS.has(method)) {
    const data: unknown = await res.clone().json().catch(() => null);
    if (isCsrfFailure(res.status, data)) res = await send(true);
  }
  return res;
}

/** 核心请求函数（withAuth 保留兼容：登录态 Cookie 总是随请求携带） */
export async function apiFetch<T>(
  path: string,
  options: RequestInit & { withAuth?: boolean } = {}
): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { withAuth: _withAuth, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  let res: Response;
  try {
    res = await secureFetch(path, { ...rest, headers: finalHeaders });
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
