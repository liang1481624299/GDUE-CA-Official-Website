/**
 * 后端 API 实体类型定义
 *
 * 与后端 app/schemas/* 中的 Pydantic 模型一一对应。
 * 各 lib/api/* 模块从此处导入类型，避免类型散落在多个文件。
 */

/* ----------------------- Auth ----------------------- */

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: string;
  username: string;
  must_change_password: boolean;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  must_change_password: boolean;
  student_id: string;
  real_name: string;
  phone: string;
  avatar_url: string | null;
  created_at: string;
}

export interface ProfileUpdate {
  username?: string;
  real_name?: string;
  phone?: string;
  student_id?: string;
}

export interface AvatarUploadOut {
  avatar_url: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

export interface ForgotPasswordRequest {
  contact_email: string;
  username_hint?: string;
  reason: string;
}

export interface PasswordResetItem {
  id: number;
  contact_email: string;
  username_hint: string | null;
  reason: string;
  status: string;
  admin_note: string | null;
  handled_at: string | null;
  created_at: string;
}

export interface SecurityQuestionOut {
  question: string;
}

export interface SecurityAnswerRequest {
  answer: string;
  new_password: string;
}

export interface SecurityQuestionUpdate {
  question: string;
  answer: string;
}

/** 创建管理员账号（仅 super_admin） */
export interface UserCreatePayload {
  username: string;
  email: string;
  password: string;
  role: "super_admin" | "admin" | "editor";
  student_id: string;
  real_name: string;
  phone: string;
}

export type AdminRole = "super_admin" | "admin" | "editor";

/** 更新账号信息：自己可改基础资料，super_admin 额外可改 role/is_active */
export interface UserUpdatePayload {
  username?: string;
  real_name?: string;
  student_id?: string;
  phone?: string;
  role?: AdminRole;
  is_active?: boolean;
}

/* ----------------------- Activity ----------------------- */

export type ActivityStatus =
  | "draft"
  | "published"
  | "registration_open"
  | "ended"
  | "archived";

export interface Activity {
  id: number;
  title: string;
  content: string;
  category: string | null;
  status: ActivityStatus;
  register_start: string | null;
  register_end: string | null;
  max_participants: number;
  cover_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityCreate {
  title: string;
  content: string;
  category?: string;
  status?: ActivityStatus;
  register_start?: string;
  register_end?: string;
  max_participants?: number;
  cover_url?: string;
}

/* ----------------------- Registration ----------------------- */

export type RegistrationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "checked_in";

export type RegistrationType = "activity" | "club";

export interface Registration {
  id: number;
  registration_type: RegistrationType;
  activity_id: number | null;
  name: string;
  student_id: string;
  college: string;
  major: string;
  phone_cc: string;
  phone_number: string;
  email: string | null;
  position: string | null;
  introduction: string | null;
  status: RegistrationStatus;
  remark: string | null;
  submitted_at: string;
}

export interface RegistrationCreate {
  name: string;
  student_id: string;
  college: string;
  major: string;
  phone_cc: string;
  phone_number: string;
  email?: string;
  position?: string;
  introduction?: string;
}

/* ----------------------- Bug Report ----------------------- */

export interface BugReport {
  id: number;
  contact_email: string | null;
  contact_phone: string | null;
  description: string;
  extra: string | null;
  resolved: boolean;
  created_at: string;
}

export interface BugReportCreate {
  contact_email?: string;
  contact_phone?: string;
  description: string;
  extra?: string;
}

/* ----------------------- System Settings ----------------------- */

export interface SystemSettings {
  site_name: string;
  footer: string | null;
  icp_info: string | null;
  ip_blacklist: string[];
  allowed_hosts: string[];
  cors_origins: string[];
}
