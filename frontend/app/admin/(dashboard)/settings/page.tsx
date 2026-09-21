"use client";

/**
 * /admin/settings - 系统设置
 * 字段对齐后端 SystemSettings：site_name/footer/icp_info/ip_blacklist[]/allowed_hosts[]/cors_origins[]
 * IP 黑名单接口用 ?ip=xxx query 参数
 */
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  addIpBlacklist,
  fetchSystemSettings,
  removeIpBlacklist,
  updateSystemSettings,
} from "@/lib/api/system";
import type { SystemSettings } from "@/types/api";
import { Loader2, Plus, Trash2, Check } from "lucide-react";

export default function SettingsPage() {
  const { t } = useI18n();
  const [ipList, setIpList] = useState<string[]>([]);
  const [newIp, setNewIp] = useState("");
  const [corsOrigins, setCorsOrigins] = useState("");
  const [allowedHosts, setAllowedHosts] = useState("");
  const [siteName, setSiteName] = useState("");
  const [footer, setFooter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const s: SystemSettings = await fetchSystemSettings();
      setIpList(s.ip_blacklist ?? []);
      setCorsOrigins((s.cors_origins ?? []).join("\n"));
      setAllowedHosts((s.allowed_hosts ?? []).join("\n"));
      setSiteName(s.site_name ?? "");
      setFooter(s.footer ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  async function addIp() {
    if (!newIp) return;
    try {
      const res = await addIpBlacklist(newIp);
      setIpList(res.blacklist ?? []);
      setNewIp("");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Add failed");
    }
  }

  async function delIp(ip: string) {
    try {
      const res = await removeIpBlacklist(ip);
      setIpList(res.blacklist ?? []);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Remove failed");
    }
  }

  async function saveSettings() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const corsList = corsOrigins.split("\n").map((s) => s.trim()).filter(Boolean);
      const hostsList = allowedHosts.split("\n").map((s) => s.trim()).filter(Boolean);
      await updateSystemSettings({
        site_name: siteName,
        footer: footer || null,
        cors_origins: corsList,
        allowed_hosts: hostsList,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("admin.settings.saveError"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-muted-foreground">{t("common.loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("admin.settings.title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("admin.settings.ipBlacklist")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("admin.settings.ipBlacklistDesc")}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder={t("admin.settings.ipBlacklistPlaceholder")}
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addIp())}
            />
            <Button onClick={addIp}>
              <Plus className="h-4 w-4 mr-1" />
              {t("admin.settings.addIp")}
            </Button>
          </div>
          {ipList.length > 0 && (
            <ul className="space-y-1">
              {ipList.map((ip) => (
                <li key={ip} className="flex items-center justify-between text-sm px-3 py-2 rounded-md bg-muted/50">
                  <span className="font-mono">{ip}</span>
                  <Button size="icon" variant="ghost" onClick={() => delIp(ip)} aria-label="Remove">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">站点信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="siteName">站点名称</Label>
            <Input id="siteName" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="footer">页脚</Label>
            <Textarea id="footer" rows={2} value={footer} onChange={(e) => setFooter(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("admin.settings.domainWhitelist")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("admin.settings.domainWhitelistDesc")}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="corsOrigins">CORS Origins</Label>
            <Textarea
              id="corsOrigins"
              rows={3}
              placeholder={t("admin.settings.domainWhitelistPlaceholder")}
              value={corsOrigins}
              onChange={(e) => setCorsOrigins(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="allowedHosts">Allowed Hosts</Label>
            <Textarea
              id="allowedHosts"
              rows={3}
              placeholder="如：gdue-ca.paperee.guru"
              value={allowedHosts}
              onChange={(e) => setAllowedHosts(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {saved && (
            <p className="text-sm text-emerald-600 flex items-center gap-1">
              <Check className="h-4 w-4" />
              {t("admin.settings.saved")}
            </p>
          )}
          <Button onClick={saveSettings} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {t("admin.activities.save")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
