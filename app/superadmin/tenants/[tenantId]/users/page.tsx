"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Users, Power, PowerOff, KeyRound, RefreshCw, Plus, Search } from "lucide-react";
import { useAdmin } from "@/contexts/AdminContext";
import { adminTenantService } from "@/lib/api-services";
import { Button, Input, Table, Th, Td, Badge, useToast } from "@/components/ui";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

interface TenantUser {
  id: number;
  userName?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  isActive?: boolean;
  roleName?: string;
  roleDisplayName?: string;
  createdAt?: string;
}

function getInitials(name?: string) {
  return (name || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatPhone(value?: string) {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("966") && digits.length === 12) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9)}`;
  }
  return value;
}

function displayRole(roleName?: string, roleDisplayName?: string) {
  if (roleDisplayName) return roleDisplayName;
  if (!roleName) return "—";
  return roleName.replace(/_\d+$/, "").replace(/_/g, " ");
}

export default function SuperAdminTenantUsersPage() {
  const { tenantId: tenantIdParam } = useParams<{ tenantId: string }>();
  const tenantId = Number(tenantIdParam);
  const { dir } = useAdmin();
  const { showToast } = useToast();
  const ar = dir === "rtl";

  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState<Record<number, boolean>>({});

  async function loadUsers() {
    if (!tenantId) return;
    setLoading(true);
    try {
      const response = await adminTenantService.getUsers(tenantId, 1, 100);
      const raw = response?.items ?? response?.data?.items ?? response?.data ?? response ?? [];
      const list = Array.isArray(raw) ? raw : [];
      setUsers(list);
    } catch (err) {
      showToast(err instanceof Error ? err.message : T("Failed to load users.", "فشل تحميل المستخدمين.", ar));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [tenantId]);

  async function toggleActive(user: TenantUser) {
    setRefreshing((prev) => ({ ...prev, [user.id]: true }));
    try {
      if (user.isActive) {
        await adminTenantService.deactivateUser(tenantId, user.id);
        showToast(T("User deactivated.", "تم تعطيل المستخدم.", ar));
      } else {
        await adminTenantService.activateUser(tenantId, user.id);
        showToast(T("User activated.", "تم تفعيل المستخدم.", ar));
      }
      loadUsers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : T("Action failed.", "فشلت العملية.", ar));
    } finally {
      setRefreshing((prev) => ({ ...prev, [user.id]: false }));
    }
  }

  async function resetPassword(user: TenantUser) {
    const newPassword = window.prompt(ar ? "أدخل كلمة المرور الجديدة" : "Enter the new password");
    if (!newPassword) return;
    setRefreshing((prev) => ({ ...prev, [user.id]: true }));
    try {
      await adminTenantService.resetUserPassword(tenantId, user.id, newPassword);
      showToast(T("Password reset.", "تمت إعادة تعيين كلمة المرور.", ar));
    } catch (err) {
      showToast(err instanceof Error ? err.message : T("Password reset failed.", "فشل إعادة تعيين كلمة المرور.", ar));
    } finally {
      setRefreshing((prev) => ({ ...prev, [user.id]: false }));
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.userName, u.fullName, u.email, u.roleName, u.roleDisplayName].some((v) =>
        (v ?? "").toLowerCase().includes(q)
      )
    );
  }, [users, search]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [users]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <div className="mk-h4 text-mk-ink-900">
            {T("Tenant users", "مستخدمي المستأجر", ar)} #{tenantId}
          </div>
          <div className="mk-label text-mk-ink-500 mt-1">
            {T("Manage users for this tenant.", "إدارة مستخدمي هذا المستأجر.", ar)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {T("Refresh", "تحديث", ar)}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl p-4 mk-surface flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-mk-blue-50 flex items-center justify-center text-mk-blue-600">
            <Users size={20} />
          </div>
          <div>
            <div className="mk-h3 text-mk-ink-900">{stats.total}</div>
            <div className="mk-caption text-mk-ink-500">{T("Total users", "إجمالي المستخدمين", ar)}</div>
          </div>
        </div>
        <div className="rounded-xl p-4 mk-surface flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-mk-mint-50 flex items-center justify-center text-mk-mint-600">
            <Power size={20} />
          </div>
          <div>
            <div className="mk-h3 text-mk-ink-900">{stats.active}</div>
            <div className="mk-caption text-mk-ink-500">{T("Active", "نشط", ar)}</div>
          </div>
        </div>
        <div className="rounded-xl p-4 mk-surface flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-mk-danger/10 flex items-center justify-center text-mk-danger">
            <PowerOff size={20} />
          </div>
          <div>
            <div className="mk-h3 text-mk-ink-900">{stats.inactive}</div>
            <div className="mk-caption text-mk-ink-500">{T("Inactive", "معطل", ar)}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
        <div className="max-w-md w-full">
          <Input
            variant="search"
            icon={<Search size={14} />}
            placeholder={T("Search by name, username, email, role...", "البحث بالاسم أو المستخدم أو البريد أو الدور...", ar)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl overflow-hidden mk-surface">
        <Table>
          <thead>
            <tr>
              {[
                T("User", "المستخدم", ar),
                T("Phone", "الهاتف", ar),
                T("Role", "الدور", ar),
                T("Status", "الحالة", ar),
                T("Created", "تاريخ الإنشاء", ar),
                "",
              ].map((h, i) => (
                <Th key={i}>{h}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <Td colSpan={6} className="text-center py-12 text-mk-ink-400">
                  <Loader2 size={32} className="animate-spin mx-auto mb-3" />
                  {T("Loading...", "جاري التحميل...", ar)}
                </Td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <Td colSpan={6} className="text-center py-12 text-mk-ink-400">
                  {T("No users found.", "لم يتم العثور على مستخدمين.", ar)}
                </Td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="hover:bg-mk-ink-50 transition-colors">
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-mk-blue-500 to-mk-violet-500 flex items-center justify-center text-white mk-label shrink-0">
                        {getInitials(u.fullName)}
                      </div>
                      <div className="min-w-0">
                        <div className="mk-label text-mk-ink-900 truncate">{u.fullName || u.userName || "—"}</div>
                        {u.email && <div className="mk-caption text-mk-ink-500 truncate">{u.email}</div>}
                        {u.userName && u.fullName && <div className="mk-caption text-mk-ink-400 font-mono truncate">{u.userName}</div>}
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <span dir="ltr" className="inline-block font-mono mk-caption text-mk-ink-700">
                      {formatPhone(u.phoneNumber)}
                    </span>
                  </Td>
                  <Td>
                    <Badge variant="info" size="sm">
                      {displayRole(u.roleName, u.roleDisplayName)}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge variant={u.isActive ? "success" : "danger"} dot>
                      {u.isActive ? T("Active", "نشط", ar) : T("Inactive", "معطل", ar)}
                    </Badge>
                  </Td>
                  <Td className="mk-caption text-mk-ink-500">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString(ar ? "ar-SA" : "en-US") : "—"}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={refreshing[u.id]}
                        onClick={() => toggleActive(u)}
                        title={u.isActive ? T("Deactivate", "تعطيل", ar) : T("Activate", "تفعيل", ar)}
                      >
                        {u.isActive ? <PowerOff size={16} /> : <Power size={16} />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={refreshing[u.id]}
                        onClick={() => resetPassword(u)}
                        title={T("Reset password", "إعادة تعيين كلمة المرور", ar)}
                      >
                        <KeyRound size={16} />
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
