/**
 * 头像卡片：头像预览 + 上传（JPG/PNG/WEBP ≤ 5MB，由后端校验）
 */
"use client";

import { useRef, useState } from "react";
import { Loader2, Upload, User } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { uploadAvatar } from "@/lib/api/auth";
import { API_BASE_URL } from "@/lib/api/client";
import type { AdminUser } from "@/types/api";

export function AvatarCard({
  profile,
  onUpdated,
}: {
  profile: AdminUser | null;
  onUpdated: (avatarUrl: string) => void;
}) {
  const { t } = useI18n();
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg(null);
    try {
      const res = await uploadAvatar(file);
      onUpdated(res.avatar_url);
      setMsg(t("admin.profile.avatarSuccess"));
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("admin.profile.avatarError"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function avatarFullUrl(url: string | null | undefined): string {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${API_BASE_URL}${url}`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("admin.profile.avatar")}</CardTitle>
        <CardDescription>{t("admin.profile.avatarHint")}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-6">
        <div className="relative h-20 w-20 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
          {profile?.avatar_url ? (
            <img src={avatarFullUrl(profile.avatar_url)} alt="avatar" className="h-full w-full object-cover" />
          ) : (
            <User className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("admin.profile.avatarUploading")}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                {t("admin.profile.avatarUpload")}
              </>
            )}
          </Button>
          {msg && <p className="mt-2 text-sm text-muted-foreground">{msg}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
