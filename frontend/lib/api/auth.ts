/**
 * Auth API - 对应后端 app/api/auth.py
 *
 * 管理员登录、当前用户、个人资料、头像上传、改密、忘记密码、安全问题恢复。
 */
import { apiFetch } from "./client";
import type {
  LoginRequest,
  LoginResponse,
  AdminUser,
  ProfileUpdate,
  AvatarUploadOut,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  PasswordResetItem,
  SecurityQuestionOut,
  SecurityAnswerRequest,
  SecurityQuestionUpdate,
  UserCreatePayload,
  UserUpdatePayload,
} from "@/types/api";

/* ---------- 登录 / 当前用户 ---------- */

export function login(payload: LoginRequest) {
  return apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchMe() {
  return apiFetch<AdminUser>("/api/auth/me", { withAuth: true });
}

/* ---------- 个人资料 ---------- */

/** 获取当前用户完整资料 */
export function fetchProfile() {
  return apiFetch<AdminUser>("/api/auth/profile", { withAuth: true });
}

/** 更新个人资料 */
export function updateProfile(payload: ProfileUpdate) {
  return apiFetch<AdminUser>("/api/auth/profile", {
    method: "PUT",
    withAuth: true,
    body: JSON.stringify(payload),
  });
}

/* ---------- 头像上传 ---------- */

/** 上传头像（FormData，不走 apiFetch 的 JSON 逻辑） */
export async function uploadAvatar(file: File): Promise<AvatarUploadOut> {
  const formData = new FormData();
  formData.append("file", file);

  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("gdueca_admin_token")
      : null;

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"}/api/auth/avatar`,
    {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }
  );

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(
      (data as { detail?: string })?.detail ?? "头像上传失败"
    );
  }

  return res.json();
}

/* ---------- 修改密码 ---------- */

export function changePassword(payload: ChangePasswordRequest) {
  return apiFetch<{ ok: boolean }>("/api/auth/change-password", {
    method: "POST",
    withAuth: true,
    body: JSON.stringify(payload),
  });
}

/* ---------- 忘记密码申请 ---------- */

/** 访客提交忘记密码申请（公开接口） */
export function submitForgotPassword(payload: ForgotPasswordRequest) {
  return apiFetch<{ ok: boolean; id: number }>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** 管理员查看忘记密码申请列表 */
export function listPasswordResets(statusFilter?: string) {
  const query = statusFilter ? `?status_filter=${statusFilter}` : "";
  return apiFetch<PasswordResetItem[]>(`/api/auth/password-resets${query}`, {
    withAuth: true,
  });
}

/** 管理员处理忘记密码申请 */
export function handlePasswordReset(
  id: number,
  payload: { status: "handled" | "rejected"; admin_note?: string }
) {
  return apiFetch<PasswordResetItem>(`/api/auth/password-resets/${id}`, {
    method: "PATCH",
    withAuth: true,
    body: JSON.stringify(payload),
  });
}

/* ---------- 安全问题 ---------- */

/** 公开获取安全问题（不含答案） */
export function fetchSecurityQuestion() {
  return apiFetch<SecurityQuestionOut>("/api/auth/security-question");
}

/** 紧急恢复：答对安全问题 → 重置超管密码 */
export function recoverViaSecurityQuestion(payload: SecurityAnswerRequest) {
  return apiFetch<{ ok: boolean; username: string }>("/api/auth/recover", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** 管理员更新安全问题（仅 super_admin） */
export function updateSecurityQuestion(payload: SecurityQuestionUpdate) {
  return apiFetch<SecurityQuestionOut>("/api/auth/security-question", {
    method: "PUT",
    withAuth: true,
    body: JSON.stringify(payload),
  });
}

/* ---------- 用户管理（仅 super_admin） ---------- */

/** 列出所有管理员账号 */
export function listUsers() {
  return apiFetch<AdminUser[]>("/api/auth/users", { withAuth: true });
}

/** 创建管理员账号 */
export function createUser(payload: UserCreatePayload) {
  return apiFetch<AdminUser>("/api/auth/users", {
    method: "POST",
    withAuth: true,
    body: JSON.stringify(payload),
  });
}

/** 删除管理员账号 */
export function deleteUser(id: number) {
  return apiFetch<void>(`/api/auth/users/${id}`, {
    method: "DELETE",
    withAuth: true,
  });
}

/** 更新账号信息（自己可改基础资料，super_admin 额外可改 role/is_active） */
export function updateUser(id: number, payload: UserUpdatePayload) {
  return apiFetch<AdminUser>(`/api/auth/users/${id}`, {
    method: "PUT",
    withAuth: true,
    body: JSON.stringify(payload),
  });
}
