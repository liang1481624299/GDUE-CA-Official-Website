"use client";

/**
 * /admin/login - 账号登录页（管理员 / 普通成员共用）
 * 表单提交 POST /api/auth/login，登录凭据由后端写入 HttpOnly Cookie
 * - 如返回 must_change_password=true，跳转 /admin/change-password
 * - 管理员进入 /admin；普通成员进入前台个人资料页（无后台权限）
 * - 登录选项：记住此设备（减少验证频率）；不在浏览器保存任何密码，
 *   如需记住密码请使用浏览器自带的密码管理器
 * - 底部含「忘记密码」和「账号恢复」入口
 */
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck, ArrowLeft } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { login } from "@/lib/api/auth";
import { getSession, isAdminRole, saveSession } from "@/lib/auth";

/** 登录后的落地页：管理员 → 后台；普通成员 → 前台个人资料 */
function homeFor(role: string | undefined) {
  return isAdminRole(role) ? "/admin" : "/zh-CN/profile";
}

export default function AdminLoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 登录选项
  const [rememberDevice, setRememberDevice] = useState(false);

  /** 已登录用户直接进入对应首页（会话失效时目标页会再跳回登录页） */
  useEffect(() => {
    const session = getSession();
    if (session) router.replace(homeFor(session.role));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    setError(null);
    try {
      const res = await login({ username, password, remember_device: rememberDevice });
      saveSession({ username: res.username, role: res.role }, res.csrf_token);
      // 初始 / 被重置的密码 → 强制改密
      router.replace(res.must_change_password ? "/admin/change-password" : homeFor(res.role));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("admin.login.error");
      setError(msg);
    } finally {
      setPassword("");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-background to-muted/30">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl">
          <CardHeader className="text-center space-y-2">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground mx-auto">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl">{t("admin.login.title")}</CardTitle>
            <CardDescription>{t("admin.login.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="username">{t("admin.login.username")}</Label>
                <Input
                  id="username"
                  autoComplete="username"
                  placeholder={t("admin.login.usernamePlaceholder")}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("admin.login.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder={t("admin.login.passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                  {error}
                </p>
              )}

              {/* 登录选项 */}
              <div className="space-y-2.5 pt-1">
                <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="size-4 rounded accent-primary cursor-pointer"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                  />
                  {t("admin.login.rememberDevice")}
                </label>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("admin.login.submitting")}
                  </>
                ) : (
                  t("admin.login.submit")
                )}
              </Button>
            </form>

            {/* 忘记密码 + 账号恢复 */}
            <div className="mt-4 flex items-center justify-between text-sm">
              <Link
                href="/admin/forgot-password"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                {t("admin.login.forgotPassword")}
              </Link>
              <Link
                href="/admin/recover"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                {t("admin.recover.title")}
              </Link>
            </div>

            <div className="mt-4 text-center">
              <Button asChild variant="ghost" size="sm">
                <Link href="/zh-CN">
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  {t("admin.login.backToSite")}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
