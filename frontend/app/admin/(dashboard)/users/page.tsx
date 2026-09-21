"use client";

/**
 * /admin/users - 人员管理
 *
 * - 所有角色可见自己的信息并可编辑
 * - super_admin 可看到所有人、创建/删除账号、编辑所有人
 */
import { useState, useEffect, useCallback } from "react";
import { Loader2, Trash2, Plus, Pencil, ShieldCheck, Shield, UserPen, X } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  listUsers,
  createUser,
  deleteUser,
  updateUser,
  fetchProfile,
} from "@/lib/api/auth";
import type { AdminUser, AdminRole, UserCreatePayload, UserUpdatePayload } from "@/types/api";

const ROLE_OPTIONS: AdminRole[] = ["super_admin", "admin", "editor"];

export default function UsersPage() {
  const { t } = useI18n();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [myId, setMyId] = useState<number | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 新建表单
  const [createForm, setCreateForm] = useState<UserCreatePayload>({
    username: "",
    email: "",
    password: "",
    role: "editor",
    student_id: "",
    real_name: "",
    phone: "",
  });

  // 编辑表单
  const [editForm, setEditForm] = useState<UserUpdatePayload>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await fetchProfile();
      setMyId(me.id);
      setIsSuperAdmin(me.role === "super_admin");
      if (me.role === "super_admin") {
        const list = await listUsers();
        setUsers(list);
      } else {
        setUsers([me]);
      }
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(u: AdminUser) {
    setEditingId(u.id);
    setEditForm({
      username: u.username,
      real_name: u.real_name,
      student_id: u.student_id,
      phone: u.phone,
      role: u.role as AdminRole,
      is_active: u.is_active,
    });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({});
  }

  async function handleSaveEdit(id: number) {
    setSaving(true);
    setError(null);
    try {
      await updateUser(id, editForm);
      setEditingId(null);
      setEditForm({});
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      await createUser(createForm);
      setCreateForm({
        username: "",
        email: "",
        password: "",
        role: "editor",
        student_id: "",
        real_name: "",
        phone: "",
      });
      setShowCreateForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(t("admin.users.deleteConfirm"))) return;
    setDeletingId(id);
    setError(null);
    try {
      await deleteUser(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeletingId(null);
    }
  }

  function roleBadge(role: string) {
    if (role === "super_admin")
      return (
        <Badge variant="default" className="gap-1">
          <ShieldCheck className="h-3 w-3" />
          {t("admin.users.roles.super_admin")}
        </Badge>
      );
    if (role === "admin")
      return (
        <Badge variant="secondary" className="gap-1">
          <Shield className="h-3 w-3" />
          {t("admin.users.roles.admin")}
        </Badge>
      );
    return (
      <Badge variant="outline" className="gap-1">
        <UserPen className="h-3 w-3" />
        {t("admin.users.roles.editor")}
      </Badge>
    );
  }

  const canEdit = (u: AdminUser) => isSuperAdmin || u.id === myId;
  const canDelete = (u: AdminUser) => isSuperAdmin && u.id !== myId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">
            {t("admin.users.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isSuperAdmin
              ? t("admin.users.subtitleSuper")
              : t("admin.users.subtitle")}
          </p>
        </div>
        {isSuperAdmin && (
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="h-4 w-4" />
            {t("admin.users.create")}
          </Button>
        )}
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-3 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      {/* 新建账号表单 */}
      {showCreateForm && isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.users.formTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label={t("admin.users.displayName")} required>
                <Input
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  placeholder={t("admin.users.displayNamePlaceholder")}
                />
              </FormField>
              <FormField label={t("admin.users.realName")} required>
                <Input
                  value={createForm.real_name}
                  onChange={(e) => setCreateForm({ ...createForm, real_name: e.target.value })}
                  placeholder={t("admin.users.realNamePlaceholder")}
                />
              </FormField>
              <FormField label={t("admin.users.studentId")} required>
                <Input
                  value={createForm.student_id}
                  onChange={(e) => setCreateForm({ ...createForm, student_id: e.target.value })}
                  placeholder={t("admin.users.studentIdPlaceholder")}
                />
              </FormField>
              <FormField label={t("admin.users.phone")} required>
                <Input
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  placeholder={t("admin.users.phonePlaceholder")}
                />
              </FormField>
              <FormField label={t("admin.users.email")} required>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder={t("admin.users.emailPlaceholder")}
                />
              </FormField>
              <FormField label={t("admin.users.password")} required>
                <Input
                  type="text"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder={t("admin.users.passwordPlaceholder")}
                />
              </FormField>
              <FormField label={t("admin.users.role")} required>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as AdminRole })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {t(`admin.users.roles.${r}`)}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleCreate} disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("admin.users.save")}
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                {t("admin.users.cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 用户列表 */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t("admin.users.empty")}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/30">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium text-muted-foreground">{t("admin.users.colDisplayName")}</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">{t("admin.users.colRealName")}</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">{t("admin.users.colStudentId")}</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">{t("admin.users.colPhone")}</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">{t("admin.users.colEmail")}</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">{t("admin.users.colRole")}</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">{t("admin.users.colActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/20 align-top">
                      {editingId === u.id ? (
                        /* 编辑行 */
                        <>
                          <td className="px-4 py-3">
                            <Input
                              value={editForm.username ?? ""}
                              onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                              className="h-8"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              value={editForm.real_name ?? ""}
                              onChange={(e) => setEditForm({ ...editForm, real_name: e.target.value })}
                              className="h-8"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              value={editForm.student_id ?? ""}
                              onChange={(e) => setEditForm({ ...editForm, student_id: e.target.value })}
                              className="h-8"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              value={editForm.phone ?? ""}
                              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                              className="h-8"
                            />
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{u.email}</td>
                          <td className="px-4 py-3">
                            {isSuperAdmin ? (
                              <select
                                value={editForm.role ?? "editor"}
                                onChange={(e) => setEditForm({ ...editForm, role: e.target.value as AdminRole })}
                                className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs"
                              >
                                {ROLE_OPTIONS.map((r) => (
                                  <option key={r} value={r}>
                                    {t(`admin.users.roles.${r}`)}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              roleBadge(u.role)
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                onClick={() => handleSaveEdit(u.id)}
                                disabled={saving}
                              >
                                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                                {t("admin.users.save")}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </>
                      ) : (
                        /* 只读行 */
                        <>
                          <td className="px-4 py-3 font-medium">
                            {u.username}
                            {u.id === myId && (
                              <span className="ml-2 text-xs text-muted-foreground">({t("admin.users.you")})</span>
                            )}
                          </td>
                          <td className="px-4 py-3">{u.real_name}</td>
                          <td className="px-4 py-3 font-mono text-xs">{u.student_id}</td>
                          <td className="px-4 py-3 font-mono text-xs">{u.phone}</td>
                          <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                          <td className="px-4 py-3">{roleBadge(u.role)}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              {canEdit(u) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => startEdit(u)}
                                  aria-label="edit"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              {canDelete(u) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(u.id)}
                                  disabled={deletingId === u.id}
                                  aria-label="delete"
                                >
                                  {deletingId === u.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** 表单字段包装 */
function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}
