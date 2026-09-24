"use client";

/**
 * /admin/login - 管理员 Web 登录页
 * 表单提交 POST /api/auth/login，成功后写入 localStorage 并跳转 /admin
 * - 如返回 must_change_password=true，跳转 /admin/change-password
 * - 登录选项：保存账号密码 / 自动登录 / 记住此设备（减少验证频率）
 * - 底部含「忘记密码」和「账号恢复」入口
 */
import { useState, useEffect, useRef } from "react";
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
import {
  saveSession,
  isLogged,
  saveCreds,
  getSavedCreds,
  clearCreds,
  isAutoLogin,
  setAutoLogin,
} from "@/lib/auth";

export default function AdminLoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 登录选项
  const [savePassword, setSavePassword] = useState(false);
  const [autoLogin, setAutoLogin] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const autoSubmitted = useRef(false);

  async function doLogin(
    u: string,
    p: string,
    remember: boolean,
    keepCreds: boolean,
    keepAuto: boolean
  ) {
    setLoading(true);
    setError(null);
    try {
      const res = await login({ username: u, password: p, remember_device: remember });
      saveSession({
        token: res.access_token,
        username: res.username,
        role: res.role,
      });
      // 按勾选保存/清除凭据与自动登录标记
      if (keepCreds) saveCreds({ username: u, password: p });
      else clearCreds();
      setAutoLogin(keepAuto && keepCreds);
      // 默认密码 → 强制改密
      if (res.must_change_password) {
        router.replace("/admin/change-password");
      } else {
        router.replace("/admin");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("admin.login.error");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  /** 已登录用户直接进入仪表盘；未登录则预填凭据 + 自动登录 */
  useEffect(() => {
    if (isLogged()) {
      router.replace("/admin");
      return;
    }
    const creds = getSavedCreds();
    if (creds) {
      setUsername(creds.username);
      setPassword(creds.password);
      setSavePassword(true);
    }
    if (isAutoLogin()) {
      setAutoLogin(true);
      if (creds && !autoSubmitted.current) {
        autoSubmitted.current = true;
        void doLogin(creds.username, creds.password, false, true, true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) return;
    await doLogin(username, password, rememberDevice, savePassword, autoLogin);
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
                    checked={savePassword}
                    onChange={(e) => {
                      setSavePassword(e.target.checked);
                      if (!e.target.checked) setAutoLogin(false);
                    }}
                  />
                  {t("admin.login.savePassword")}
                </label>
                <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="size-4 rounded accent-primary cursor-pointer"
                    checked={autoLogin}
                    disabled={!savePassword}
                    onChange={(e) => {
                      setAutoLogin(e.target.checked);
                      if (e.target.checked) setSavePassword(true);
                    }}
                  />
                  {t("admin.login.autoLogin")}
                </label>
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
