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
  /** 记住此设备：空闲超时 30 分钟 → 30 天 */
  remember_device?: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: string;
  username: string;
  must_change_password: boolean;
}

/** 登录会话（设备管理） */
export interface LoginSessionInfo {
  id: number;
  device_name: string;
  device_model: string;
  user_agent: string;
  ip: string | null;
  remember_device: boolean;
  revoked: boolean;
  /** 带大写 Z 的 UTC ISO 字符串 */
  revoked_at: string | null;
  login_at: string;
  last_active_at: string;
  expires_at: string;
  /** 是否为当前设备 */
  is_current: boolean;
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
  /** IANA 时区；null = 自动探测浏览器时区 */
  timezone: string | null;
  /** 用户物理位置：国家 */
  country: string | null;
  /** 一级行政区（省/州） */
  region: string | null;
  /** 二级行政区（市/郡）；可为空 */
  locality: string | null;
  created_at: string;
}

export interface ProfileUpdate {
  username?: string;
  real_name?: string;
  phone?: string;
  student_id?: string;
  /** IANA 时区；空字符串 = 恢复自动探测 */
  timezone?: string;
  /** 国家；空字符串 = 清空 */
  country?: string;
  /** 一级行政区（省/州）；空字符串 = 清空 */
  region?: string;
  /** 二级行政区（市/郡）；空字符串 = 清空 */
  locality?: string;
}

export interface AvatarUploadOut {
  avatar_url: string;
}

/** 单个 IP 的访问来源聚合（后台概览） */
export interface IpSourceStat {
  ip: string;
  /** loopback=本机 / internal=内网 / public=公网(地区未知) / invalid=无法解析 */
  region: string;
  total: number;
  admin_actions: number;
  registrations: number;
  bugs: number;
  /** 带大写 Z 的 UTC ISO 字符串 */
  last_seen: string | null;
}

/** 访问来源统计（后台概览） */
export interface AccessStats {
  total_events: number;
  unique_ips: number;
  top_ips: IpSourceStat[];
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

/* ----------------------- 翻译 / 回执查询 ----------------------- */

/** 批量翻译请求项 */
export interface TranslationItem {
  key: string;
  text: string;
  source_lang?: string;
}

/** 单条翻译结果 */
export interface TranslationResult {
  text: string;
  source_lang: string;
  translated: boolean;
}

/** 批量翻译响应 */
export interface BatchTranslateResponse {
  translations: Record<string, TranslationResult>;
}

/** 回执码公开查询结果（不含个人隐私字段） */
export interface ReceiptQueryResult {
  receipt_code: string;
  type: "activity" | "club" | "bug";
  activity_title: string | null;
  status: string;
  submitted_at: string;
  checkin_open: boolean;
  checked_in_at: string | null;
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
  checkin_open: boolean;
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
  receipt_code: string;
  content_lang: string;
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
  submit_ip: string | null;
  checked_in_at: string | null;
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
  receipt_code: string;
  content_lang: string;
  contact_email: string | null;
  contact_phone: string | null;
  description: string;
  extra: string | null;
  resolved: boolean;
  submit_ip: string | null;
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
  club_checkin_open: boolean;
  /** 站点全局回退系统时区（IANA 字符串） */
  system_timezone: string;
  /** 后端服务端口（参考值，实际生效需运维重载 Nginx） */
  network_port: number;
  /** 后端监听 IP（参考值） */
  network_listen_ip: string;
  /** 站点绑定域名列表（参考值） */
  network_domains: string[];
}

/** 网络配置变更历史条目 */
export interface NetworkConfigHistory {
  id: number;
  config_snapshot: {
    network_port: number;
    network_listen_ip: string;
    network_domains: string[];
  };
  change_summary: string | null;
  user_id: number | null;
  ip: string | null;
  /** 带大写 Z 的 UTC ISO 字符串 */
  created_at: string | null;
}
