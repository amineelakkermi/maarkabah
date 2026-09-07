"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Eye, EyeOff, Loader2, Power, PowerOff, KeyRound, RefreshCw, Search, X } from "lucide-react";
import { useAdmin } from "@/contexts/AdminContext";
import { adminTenantService } from "@/lib/api-services";
import { Avatar, Badge, Button, Drawer, DrawerFooter, DrawerHeader, Input, Modal, Table, Td, Th, useToast } from "@/components/ui";

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
  isEditable?: boolean;
  hasAllBranches?: boolean;
  branchCount?: number;
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

function userPrimaryLabel(user: TenantUser) {
  const email = user.email?.trim().toLowerCase();
  const fullName = user.fullName?.trim();
  const userName = user.userName?.trim();
  if (fullName && fullName.toLowerCase() !== email) return fullName;
  if (userName && userName.toLowerCase() !== email) return userName;
  return user.email || "—";
}

function formatCreatedAt(value: string | undefined, ar: boolean) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(ar ? "en-GB" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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
  const [viewingUser, setViewingUser] = useState<TenantUser | null>(null);
  const [resetUser, setResetUser] = useState<TenantUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
      setViewingUser((current) => current?.id === user.id ? { ...current, isActive: !user.isActive } : current);
      loadUsers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : T("Action failed.", "فشلت العملية.", ar));
    } finally {
      setRefreshing((prev) => ({ ...prev, [user.id]: false }));
    }
  }

  function closeResetPassword() {
    setResetUser(null);
    setNewPassword("");
    setShowPassword(false);
  }

  async function resetPassword() {
    if (!resetUser || !newPassword.trim()) return;
    setRefreshing((prev) => ({ ...prev, [resetUser.id]: true }));
    try {
      await adminTenantService.resetUserPassword(tenantId, resetUser.id, newPassword);
      showToast(T("Password reset.", "تمت إعادة تعيين كلمة المرور.", ar));
      closeResetPassword();
    } catch (err) {
      showToast(err instanceof Error ? err.message : T("Password reset failed.", "فشل إعادة تعيين كلمة المرور.", ar));
    } finally {
      setRefreshing((prev) => ({ ...prev, [resetUser.id]: false }));
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

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="mk-h4 flex-1 text-mk-ink-900">
          {T("Tenant users", "مستخدمي المستأجر", ar)} #{tenantId}
        </div>
        <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {T("Refresh", "تحديث", ar)}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="w-full sm:max-w-md">
          <Input
            variant="search"
            icon={<Search size={14} />}
            placeholder={T("Search by name, email, username or role...", "البحث بالاسم أو البريد أو اسم المستخدم أو الدور...", ar)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            suffix={search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="flex items-center justify-center border-0 bg-transparent text-mk-ink-400 hover:text-mk-ink-700 cursor-pointer"
                aria-label={T("Clear search", "مسح البحث", ar)}
              >
                <X size={14} />
              </button>
            ) : undefined}
          />
        </div>
        {search && (
          <div className="mk-caption text-mk-ink-500">
            {filtered.length} {T("result(s)", "نتيجة", ar)}
          </div>
        )}
      </div>

      <div className="rounded-xl overflow-x-auto mk-surface">
        <Table>
          <thead>
            <tr>
              <Th>{T("Person", "الشخص", ar)}</Th>
              <Th>{T("Role", "الدور", ar)}</Th>
              <Th>{T("Status", "الحالة", ar)}</Th>
              <Th>{T("Created", "تاريخ الإنشاء", ar)}</Th>
              <Th><span className="sr-only">{T("Actions", "الإجراءات", ar)}</span></Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <Td colSpan={5} className="text-center py-12">
                  <Loader2 className="animate-spin text-mk-blue-500 mx-auto" size={32} />
                </Td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <Td colSpan={5} className="text-center py-12 mk-label text-mk-ink-400">
                  {search ? T("No users match your search", "لا يوجد مستخدمون يطابقون البحث", ar) : T("No users found", "لم يتم العثور على مستخدمين", ar)}
                </Td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => setViewingUser(u)}
                  className="cursor-pointer transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50"
                >
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={u.fullName || u.userName || "User"} size="sm" />
                      <div className="mk-body text-mk-ink-900">{u.fullName || "—"}</div>
                    </div>
                  </Td>
                  <Td>
                    <Badge variant="info">{u.roleDisplayName || "—"}</Badge>
                  </Td>
                  <Td>
                    <Badge variant={u.isActive ? "success" : "danger"} dot>
                      {u.isActive ? T("Active", "نشط", ar) : T("Inactive", "غير نشط", ar)}
                    </Badge>
                  </Td>
                  <Td className="mk-caption text-mk-ink-500 whitespace-nowrap">{formatCreatedAt(u.createdAt, ar)}</Td>
                  <Td onClick={(event) => event.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={refreshing[u.id]}
                        onClick={() => void toggleActive(u)}
                        className={u.isActive ? "border-mk-danger text-mk-danger hover:bg-mk-danger/5" : "border-mk-mint-600 text-mk-mint-600 hover:bg-mk-mint-50"}
                      >
                        {refreshing[u.id] ? <Loader2 size={14} className="animate-spin" /> : u.isActive ? <PowerOff size={14} /> : <Power size={14} />}
                        {u.isActive ? T("Deactivate", "تعطيل", ar) : T("Reactivate", "إعادة تفعيل", ar)}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setResetUser(u); setNewPassword(""); setShowPassword(false); }}
                      >
                        <KeyRound size={14} />
                        {T("Reset password", "إعادة تعيين كلمة المرور", ar)}
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      <Drawer open={!!viewingUser} onClose={() => setViewingUser(null)}>
        <div className="flex flex-col gap-5 justify-between h-full max-w-[480px]">
          <div>
            <DrawerHeader
              title={T("Teammate Details", "تفاصيل العضو", ar)}
              onClose={() => setViewingUser(null)}
              className="mb-0 pb-4 border-b border-mk-ink-100"
            />

            {viewingUser && (
              <div className="flex flex-col gap-4 mt-5">
                <div className="flex items-center gap-3">
                  <Avatar name={viewingUser.fullName || viewingUser.userName || "User"} size="md" />
                  <div className="mk-body text-mk-ink-900">{viewingUser.fullName || "—"}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-md bg-mk-ink-50">
                    <div className="mk-caption text-mk-ink-500 mb-1">{T("Role", "الدور", ar)}</div>
                    <div className="mk-label text-mk-ink-900">{viewingUser.roleDisplayName || "—"}</div>
                  </div>
                  <div className="p-3 rounded-md bg-mk-ink-50">
                    <div className="mk-caption text-mk-ink-500 mb-1">{T("Status", "الحالة", ar)}</div>
                    <Badge variant={viewingUser.isActive ? "success" : "danger"} dot>
                      {viewingUser.isActive ? T("Active", "نشط", ar) : T("Inactive", "غير نشط", ar)}
                    </Badge>
                  </div>
                </div>

                <div className="p-3 rounded-md bg-mk-ink-50">
                  <div className="mk-caption text-mk-ink-500 mb-1">{T("Branches", "الفروع", ar)}</div>
                  <div className="mk-label text-mk-ink-900">
                    {viewingUser.hasAllBranches
                      ? T("All branches", "جميع الفروع", ar)
                      : `${viewingUser.branchCount ?? 0} ${T("branch(es)", "فرع/فروع", ar)}`}
                  </div>
                </div>

                <div className="p-3 rounded-md bg-mk-ink-50">
                  <div className="mk-caption text-mk-ink-500 mb-1">{T("Username", "اسم المستخدم", ar)}</div>
                  <div className="mk-label text-mk-ink-900 break-all">{viewingUser.userName || "—"}</div>
                </div>

                <div className="p-3 rounded-md bg-mk-ink-50">
                  <div className="mk-caption text-mk-ink-500 mb-1">{T("Email", "الإيميل", ar)}</div>
                  <div className="mk-label text-mk-ink-900 break-all">{viewingUser.email || "—"}</div>
                </div>

                <div className="p-3 rounded-md bg-mk-ink-50">
                  <div className="mk-caption text-mk-ink-500 mb-1">{T("Phone Number", "رقم الهاتف", ar)}</div>
                  <div className="mk-label text-mk-ink-900" dir="ltr">{formatPhone(viewingUser.phoneNumber)}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-md bg-mk-ink-50">
                    <div className="mk-caption text-mk-ink-500 mb-1">{T("Created", "تاريخ الإنشاء", ar)}</div>
                    <div className="mk-label text-mk-ink-900">{formatCreatedAt(viewingUser.createdAt, ar)}</div>
                  </div>
                  <div className="p-3 rounded-md bg-mk-ink-50">
                    <div className="mk-caption text-mk-ink-500 mb-1">{T("Editable", "قابل للتعديل", ar)}</div>
                    <div className="mk-label text-mk-ink-900">{viewingUser.isEditable ? T("Yes", "نعم", ar) : T("No", "لا", ar)}</div>
                  </div>
                </div>

                <div className="p-3 rounded-md bg-mk-ink-50">
                  <div className="mk-caption text-mk-ink-500 mb-1">{T("Role name", "اسم الدور", ar)}</div>
                  <div className="mk-label text-mk-ink-900 break-all">{viewingUser.roleName || "—"}</div>
                </div>

                <div className="p-3 rounded-md bg-mk-ink-50">
                  <div className="mk-caption text-mk-ink-500 mb-1">ID</div>
                  <div className="mk-label text-mk-ink-900">{viewingUser.id}</div>
                </div>
              </div>
            )}
          </div>

          <DrawerFooter className="mt-0 pt-4 border-t border-mk-ink-100 justify-stretch flex-col gap-3">
            <Button variant="outline" className="w-full" onClick={() => setViewingUser(null)}>
              {T("Close", "إغلاق", ar)}
            </Button>
            {viewingUser && (
              <div className="grid grid-cols-2 gap-3 w-full">
                <Button
                  variant="outline"
                  className={viewingUser.isActive ? "border-mk-danger text-mk-danger hover:bg-mk-danger/5" : "border-mk-mint-600 text-mk-mint-600 hover:bg-mk-mint-50"}
                  onClick={() => void toggleActive(viewingUser)}
                  disabled={refreshing[viewingUser.id]}
                >
                  {refreshing[viewingUser.id] ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : viewingUser.isActive ? (
                    <><PowerOff size={14} /> {T("Deactivate", "تعطيل", ar)}</>
                  ) : (
                    <><Power size={14} /> {T("Activate", "تفعيل", ar)}</>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setResetUser(viewingUser)}>
                  <KeyRound size={14} />
                  {T("Reset password", "إعادة تعيين كلمة المرور", ar)}
                </Button>
              </div>
            )}
          </DrawerFooter>
        </div>
      </Drawer>

      <Modal
        open={!!resetUser}
        onClose={closeResetPassword}
        variant="centered"
        size="sm"
        title={T("Reset password", "إعادة تعيين كلمة المرور", ar)}
      >
        <form onSubmit={(event) => { event.preventDefault(); void resetPassword(); }} className="flex flex-col gap-4 p-6">
          <p className="mk-body-sm text-mk-ink-700">
            {T("Set a new password for", "تعيين كلمة مرور جديدة لـ", ar)}
            <span className="font-semibold text-mk-ink-900 ms-1">{resetUser ? userPrimaryLabel(resetUser) : ""}</span>
          </p>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              label={T("New password", "كلمة المرور الجديدة", ar)}
              placeholder={T("Enter the new password", "أدخل كلمة المرور الجديدة", ar)}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              autoFocus
            />
            <button
              type="button"
              className="absolute end-3 top-[38px] text-mk-ink-400 hover:text-mk-ink-700 bg-transparent border-0 cursor-pointer"
              onClick={() => setShowPassword((visible) => !visible)}
              tabIndex={-1}
              aria-label={showPassword ? T("Hide password", "إخفاء كلمة المرور", ar) : T("Show password", "إظهار كلمة المرور", ar)}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={closeResetPassword} disabled={!!resetUser && refreshing[resetUser.id]}>
              {T("Cancel", "إلغاء", ar)}
            </Button>
            <Button type="submit" variant="primary" className="flex-1" disabled={!newPassword.trim() || (!!resetUser && refreshing[resetUser.id])}>
              {!!resetUser && refreshing[resetUser.id] ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
              {T("Reset", "تعيين", ar)}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
