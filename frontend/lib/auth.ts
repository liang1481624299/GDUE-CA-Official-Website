/**
 * 管理员前端鉴权工具
 *
 * - 登录成功后把 JWT 存入 localStorage
 * - 提供 isLogged / logout / requireAuth 等便捷方法
 * - 与 lib/api.ts 的 withAuth 配合：apiFetch 自动读取 token 并附加 Authorization 头
 */

const TOKEN_KEY = "gdueca_admin_token";
const USER_KEY = "gdueca_admin_user";

export interface AdminSession {
  token: string;
  username: string;
  role: string;
}

/** 写入登录会话（登录成功后调用） */
export function saveSession(session: AdminSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, session.token);
  window.localStorage.setItem(USER_KEY, JSON.stringify({
    username: session.username,
    role: session.role,
  }));
}

/** 读取当前会话（仅客户端） */
export function getSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  const token = window.localStorage.getItem(TOKEN_KEY);
  const userStr = window.localStorage.getItem(USER_KEY);
  if (!token || !userStr) return null;
  try {
    const user = JSON.parse(userStr) as { username: string; role: string };
    return { token, username: user.username, role: user.role };
  } catch {
    return null;
  }
}

/** 是否已登录 */
export function isLogged(): boolean {
  return !!getSession();
}

/** 退出登录：清除本地存储 */
export function logout() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

/**
 * 客户端路由守卫：在 admin 页面 useEffect 中调用
 * 返回 true 表示通过；false 表示未登录，调用方应跳转 /admin/login
 */
export function requireAuth(redirectTo = "/admin/login"): boolean {
  if (!isLogged()) {
    if (typeof window !== "undefined") {
      window.location.href = redirectTo;
    }
    return false;
  }
  return true;
}
