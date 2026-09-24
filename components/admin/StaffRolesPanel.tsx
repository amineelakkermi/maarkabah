"use client";

import { useState, useEffect, useMemo } from "react";
import {
  UserPlus, ChevronRight, User, X, Search, Copy, Check,
  Edit, Power, PowerOff, KeyRound, Lock, Loader2, Eye, EyeOff,
} from "lucide-react";
import {
  Avatar, Badge, Button, Input, Select, IconButton, Drawer, DrawerHeader,
  DrawerFooter, Toggle, Table, Tr, Th, Td, Modal, useToast, type BadgeVariant,
} from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { tenantUserService, tenantRoleService, branchService } from "@/lib/api-services";
import { SaudiPhoneInput, saudiLocalDigits, isSaudiMobileLocal } from "@/components/shared/SaudiPhoneInput";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

// The API returns branch assignments either as a list of ids or a list of
// { id, nameAr, nameEn } objects depending on the endpoint — normalize both.
const extractBranchIds = (details: any): number[] =>
  (details?.branches || details?.branchIds || []).map((b: any) => (typeof b === 'object' ? b.id : b));

// The backend expects Saudi mobile numbers in the form 9665XXXXXXXX.
// Normalize common input formats (+9665..., 009665..., 05..., 5...) to that shape.
// Matches the backend password policy (ASP.NET Identity-style):
// 8+ chars, upper, lower, digit, special char — e.g. "Employee@123".
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const normalizeSaudiPhone = (raw: string): string => {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00966")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = `966${digits.slice(1)}`;
  else if (digits.startsWith("5")) digits = `966${digits}`;
  return digits;
};

const isProtectedUser = (user: any): boolean =>
  user?.roleName?.startsWith('TenantAdmin') || user?.isEditable === false;

const ROLE_BADGE: Record<string, BadgeVariant> = {
  "Owner": "violet",
  "TenantAdmin": "violet",
  "Manager": "info",
  "Front Desk": "success",
  "Accountant": "warning",
};

const ROLE_AR: Record<string, string> = {
  "Owner": "المالك",
  "TenantAdmin": "مدير النظام",
  "Manager": "مدير",
  "Front Desk": "موظف استقبال",
  "Accountant": "محاسب",
};

/** Team directory — rendered as the "Staff" tab in Settings. Role definitions
 * and the "Add role" flow live in the separate `RolesPermissionsPanel`.
 * Users / roles / branches all come from the backend (tenantUserService). */
export function StaffRolesPanel() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const { showToast } = useToast();

  // ── Data ──────────────────────────────────────────────────────────
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleOptions, setRoleOptions] = useState<any[]>([]);
  const [branchOptions, setBranchOptions] = useState<any[]>([]);

  // ── Toolbar ───────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // ── Drawers / modals ──────────────────────────────────────────────
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setEditDrawerOpen] = useState(false);
  const [isViewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [viewingUser, setViewingUser] = useState<any>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [resetUser, setResetUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [togglingRowId, setTogglingRowId] = useState<number | null>(null);

  // ── Form fields ───────────────────────────────────────────────────
  const [userName, setUserName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [roleName, setRoleName] = useState("");
  const [branchIds, setBranchIds] = useState<number[]>([]);
  const [isActive, setIsActive] = useState(true);
  // Identity fields — required by Tajeer for users who issue contracts.
  const [identityType, setIdentityType] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [identityExpiryDate, setIdentityExpiryDate] = useState("");
  const [birthDate, setBirthDate] = useState("");

  // One-time credentials screen after a successful create.
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // ── Loaders ───────────────────────────────────────────────────────
  const loadUsers = async () => {
    try {
      setLoading(true);
      const [usersResponse, rolesResponse] = await Promise.all([
        tenantUserService.getUsers(1, 100),
        tenantRoleService.search({ pageNumber: 1, pageSize: 100 }),
      ]);

      const rawUsers = usersResponse.items || usersResponse.data || [];
      const rawRoles = rolesResponse.items || rolesResponse.data || [];

      const roleDetails = await Promise.all(
        rawRoles.map((role: any) =>
          tenantRoleService.getById(role.id).catch(() => null)
        )
      );

      const rolePermissionMap = new Map<string, number>();
      roleDetails.forEach((detail: any) => {
        if (!detail) return;
        const displayName = detail.name || detail.data?.name;
        const permissions = detail.permissions || detail.data?.permissions || [];
        if (displayName) {
          rolePermissionMap.set(displayName, permissions.length);
        }
      });

      const transformedUsers = rawUsers.map((item: any) => ({
        id: item.id,
        userName: item.userName || '',
        name: item.fullName || '',
        email: item.email || '',
        phoneNumber: item.phoneNumber || '',
        role: item.roleDisplayName
          || item.role?.displayName
          || item.role?.name
          || (item.roleName ? item.roleName.replace(/_\d+$/, '').replace(/_/g, ' ') : 'Staff'),
        roleName: item.roleName || '',
        branch: item.hasAllBranches
          ? T("All branches", "جميع الفروع", ar)
          : `${item.branchCount ?? 0} ${T("branch(es)", "فرع/فروع", ar)}`,
        lastActive: item.lastActive || item.lastActiveAt || "—",
        permissions: item.roleName?.startsWith('TenantAdmin') || item.isEditable === false
          ? T('All permissions', 'جميع الصلاحيات', ar)
          : (
              item.role?.permissions?.length ??
              item.role?.permissionsCount ??
              item.permissionsCount ??
              item.permissions?.length ??
              rolePermissionMap.get(item.roleDisplayName) ??
              rolePermissionMap.get(item.roleName) ??
              0
            ),
        isActive: item.isActive !== false,
      }));
      setUsers(transformedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRoleOptions = async () => {
    try {
      // Use the tenant roles lookup (assignable role names for this tenant)
      const response = await tenantRoleService.lookup();
      const items = Array.isArray(response) ? response : (response.items || response.data || []);
      setRoleOptions(items.map((r: any) => {
        if (typeof r === 'string') {
          return { name: r, displayName: r.replace(/_\d+$/, '').replace(/_/g, ' ') };
        }
        const identity = r.name || r.identityName || r.roleName || '';
        return {
          name: identity,
          displayName: r.displayName || identity.replace(/_\d+$/, '').replace(/_/g, ' '),
        };
      }));
    } catch (error) {
      console.error('Error loading role options:', error);
    }
  };

  const loadBranchOptions = async () => {
    try {
      const response = await branchService.search({});
      setBranchOptions(response.items || response.data || []);
    } catch (error) {
      console.error('Error loading branch options:', error);
    }
  };

  useEffect(() => {
    loadUsers();
    loadRoleOptions();
    loadBranchOptions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Form helpers ──────────────────────────────────────────────────
  const resetForm = () => {
    setUserName("");
    setFullName("");
    setEmail("");
    setPhoneNumber("");
    setPassword("");
    setRoleName("");
    setBranchIds([]);
    setIsActive(true);
    setIdentityType("");
    setNationalId("");
    setIdentityExpiryDate("");
    setBirthDate("");
    setCreatedCredentials(null);
    setCopied(false);
  };

  const toggleBranch = (id: number) => {
    setBranchIds(prev =>
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  function copyCredentials() {
    if (!createdCredentials) return;
    navigator.clipboard.writeText(`${createdCredentials.username} / ${createdCredentials.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const isFormInvalid = !userName || !fullName || !email || !password || !roleName;
  const isEditInvalid = !userName || !fullName || !email || !roleName;

  // ── Handlers ──────────────────────────────────────────────────────
  const handleEditUser = async (user: any) => {
    setEditingUser(user);
    setUserName(user.userName || "");
    setFullName(user.name || "");
    setEmail(user.email || "");
    setPhoneNumber(saudiLocalDigits(user.phoneNumber));
    setPassword("");
    setRoleName(user.roleName || "");
    setBranchIds(user.branchIds || []);
    setIsActive(user.isActive !== false);
    setEditDrawerOpen(true);

    // The list endpoint doesn't return branchIds, only branch names —
    // fetch full details so the branch checkboxes/isActive/role are accurate.
    try {
      const details = await tenantUserService.getById(user.id);
      setUserName(details.userName || user.userName || "");
      setFullName(details.fullName || user.name || "");
      setRoleName(details.roleName || user.roleName || "");
      setEmail(details.email || user.email || "");
      setPhoneNumber(saudiLocalDigits(details.phoneNumber || user.phoneNumber));
      setBranchIds(extractBranchIds(details));
      setIsActive(details.isActive !== false);
      setIdentityType(details.identityType != null ? String(details.identityType) : "");
      setNationalId(details.nationalId || "");
      setIdentityExpiryDate(details.identityExpiryDate ? String(details.identityExpiryDate).slice(0, 10) : "");
      setBirthDate(details.birthDate ? String(details.birthDate).slice(0, 10) : "");
      setEditingUser((prev: any) => ({ ...prev, ...details }));
    } catch (error) {
      console.error('Error loading user details:', error);
    }
  };

  const handleViewUser = async (user: any) => {
    setViewingUser(user);
    setViewDrawerOpen(true);
    setViewLoading(true);
    try {
      const details = await tenantUserService.getById(user.id);
      setViewingUser({ ...user, ...details, branchIds: extractBranchIds(details) });
    } catch (error) {
      console.error('Error loading user details:', error);
    } finally {
      setViewLoading(false);
    }
  };

  const validatePhone = (): boolean => {
    if (phoneNumber && !isSaudiMobileLocal(phoneNumber)) {
      showToast(T("Enter the 9 digits of a Saudi mobile number starting with 5", "أدخل 9 أرقام لرقم جوال سعودي يبدأ بـ 5", ar), "error");
      return false;
    }
    return true;
  };

  const handleCreateUser = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isFormInvalid) {
      showToast(T("Please fill all mandatory fields", "الرجاء تعبئة الحقول الإلزامية", ar), "error");
      return;
    }
    if (!validatePhone()) return;
    if (!PASSWORD_RULE.test(password)) {
      showToast(T("Password must be 8+ characters with an uppercase, a lowercase, a digit and a special character (e.g. Employee@123)", "كلمة المرور: 8 أحرف على الأقل تتضمن حرفًا كبيرًا وحرفًا صغيرًا ورقمًا ورمزًا خاصًا (مثال: Employee@123)", ar), "error");
      return;
    }

    const normalizedPhone = phoneNumber ? normalizeSaudiPhone(phoneNumber) : "";
    setCreating(true);
    try {
      await tenantUserService.create({
        userName,
        fullName,
        email,
        phoneNumber: normalizedPhone || undefined,
        password,
        identityType: identityType ? Number(identityType) : undefined,
        nationalId: nationalId.trim() || undefined,
        identityExpiryDate: identityExpiryDate || undefined,
        birthDate: birthDate || undefined,
        roleName,
        branchIds,
      });

      await loadUsers();
      // One-time credentials screen — mirrors the "invite" UX while the
      // backend requires the admin to pick the password at creation time.
      setCreatedCredentials({ username: userName, password });
      showToast(T("User created successfully!", "تم إضافة الموظف بنجاح!", ar));
    } catch (error: any) {
      console.error('Error creating user:', error);
      const message = error?.message || T('Failed to create user', 'فشل إنشاء الموظف', ar);
      showToast(message, "error");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateUser = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isEditInvalid) {
      showToast(T("Please fill all mandatory fields", "الرجاء تعبئة الحقول الإلزامية", ar), "error");
      return;
    }
    if (!validatePhone()) return;

    const normalizedPhone = phoneNumber ? normalizeSaudiPhone(phoneNumber) : "";
    setSavingEdit(true);
    try {
      await tenantUserService.update(editingUser.id, {
        userName,
        email,
        phoneNumber: normalizedPhone || undefined,
        fullName,
        identityType: identityType ? Number(identityType) : undefined,
        nationalId: nationalId.trim() || undefined,
        identityExpiryDate: identityExpiryDate || undefined,
        birthDate: birthDate || undefined,
        isActive,
        roleName,
        branchIds,
      });

      await loadUsers();
      setEditDrawerOpen(false);
      setEditingUser(null);
      resetForm();
      showToast(T("User updated successfully!", "تم تحديث الموظف بنجاح!", ar));
    } catch (error: any) {
      console.error('Error updating user:', error);
      const message = error?.message || T('Failed to update user', 'فشل تحديث الموظف', ar);
      showToast(message, "error");
    } finally {
      setSavingEdit(false);
    }
  };

  // Direct activate/deactivate from the table toggle.
  const handleRowToggle = async (user: any) => {
    if (togglingRowId != null) return;
    if (isProtectedUser(user)) {
      showToast(T("Protected users cannot be activated or deactivated", "المستخدمون المحميون لا يمكن تفعيلهم أو تعطيلهم", ar), "error");
      return;
    }
    setTogglingRowId(user.id);
    try {
      if (user.isActive) {
        await tenantUserService.deactivate(user.id);
      } else {
        await tenantUserService.activate(user.id);
      }
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: !user.isActive } : u));
      showToast(user.isActive ? T("User deactivated", "تم تعطيل المستخدم", ar) : T("User activated", "تم تفعيل المستخدم", ar));
    } catch (error: any) {
      console.error('Error toggling user active state:', error);
      const message = error?.message || T('Failed to update user status', 'فشل تحديث حالة المستخدم', ar);
      showToast(message, "error");
    } finally {
      setTogglingRowId(null);
    }
  };

  const handleToggleActive = async () => {
    const user = viewingUser || editingUser;
    if (!user || togglingActive) return;
    if (isProtectedUser(user)) {
      showToast(T("Protected users cannot be activated or deactivated", "المستخدمون المحميون لا يمكن تفعيلهم أو تعطيلهم", ar), "error");
      return;
    }

    setTogglingActive(true);
    try {
      if (user.isActive) {
        await tenantUserService.deactivate(user.id);
        showToast(T("User deactivated", "تم تعطيل المستخدم", ar));
      } else {
        await tenantUserService.activate(user.id);
        showToast(T("User activated", "تم تفعيل المستخدم", ar));
      }
      await loadUsers();
      if (viewingUser) {
        setViewingUser((prev: any) => ({ ...prev, isActive: !prev.isActive }));
      }
    } catch (error: any) {
      console.error('Error toggling user active state:', error);
      const message = error?.message || T('Failed to update user status', 'فشل تحديث حالة المستخدم', ar);
      showToast(message, "error");
    } finally {
      setTogglingActive(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetUser) return;
    if (!PASSWORD_RULE.test(newPassword)) {
      showToast(T("Password must be 8+ characters with an uppercase, a lowercase, a digit and a special character (e.g. Employee@123)", "كلمة المرور: 8 أحرف على الأقل تتضمن حرفًا كبيرًا وحرفًا صغيرًا ورقمًا ورمزًا خاصًا (مثال: Employee@123)", ar), "error");
      return;
    }

    setResetting(true);
    try {
      await tenantUserService.resetPassword(resetUser.id, { newPassword });
      showToast(T("Password reset successfully", "تم إعادة تعيين كلمة المرور بنجاح", ar));
      setResetUser(null);
      setNewPassword("");
    } catch (error: any) {
      console.error('Error resetting password:', error);
      const message = error?.message || T('Failed to reset password', 'فشل إعادة تعيين كلمة المرور', ar);
      showToast(message, "error");
    } finally {
      setResetting(false);
    }
  };

  // ── Filtering ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((p) => {
      const matchesSearch = !q || [
        p.name, p.userName, p.email, p.phoneNumber, p.role, p.roleName, p.branch,
      ].some((v) => String(v ?? "").toLowerCase().includes(q));
      const matchesStatus =
        statusFilter === "all" || (statusFilter === "active" ? p.isActive : !p.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [users, search, statusFilter]);

  const identityFields = (
    <div className="grid grid-cols-2 gap-3">
      <Select
        variant="muted"
        label={T("Identity type", "نوع الهوية", ar)}
        value={identityType}
        onChange={(e) => setIdentityType(e.target.value)}
      >
        <option value="">{T("Select type", "اختر النوع", ar)}</option>
        <option value="1">{T("Saudi ID", "هوية وطنية", ar)}</option>
        <option value="2">{T("Iqama", "إقامة", ar)}</option>
        <option value="3">{T("Passport", "جواز سفر", ar)}</option>
        <option value="4">{T("GCC ID", "هوية خليجية", ar)}</option>
      </Select>
      <Input
        variant="muted"
        className="font-mono"
        dir="ltr"
        label={T("Identity number", "رقم الهوية", ar)}
        placeholder="1xxxxxxxxx"
        value={nationalId}
        onChange={(e) => setNationalId(e.target.value)}
      />
      <Input
        variant="muted"
        type="date"
        label={T("Identity expiry", "انتهاء الهوية", ar)}
        value={identityExpiryDate}
        onChange={(e) => setIdentityExpiryDate(e.target.value)}
      />
      <Input
        variant="muted"
        type="date"
        label={T("Birth date", "تاريخ الميلاد", ar)}
        value={birthDate}
        onChange={(e) => setBirthDate(e.target.value)}
      />
    </div>
  );

  const branchCheckboxes = (idPrefix: string) => (
    <div>
      <div className="mk-body-sm text-mk-fg-1 mb-2">{T("Branches", "الفروع", ar)}</div>
      <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto border border-mk-ink-100 rounded-md p-3">
        {branchOptions.map((b) => (
          <div key={b.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`${idPrefix}-${b.id}`}
              checked={branchIds.includes(b.id)}
              onChange={() => toggleBranch(b.id)}
              className="w-4 h-4"
            />
            <label htmlFor={`${idPrefix}-${b.id}`} className="mk-caption text-mk-ink-700">
              {ar ? (b.nameAr || b.name) : (b.nameEn || b.name)}
            </label>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-3">
        <div className="hidden sm:block flex-1 max-w-[400px]">
          <Input
            variant="search"
            icon={<Search size={14} />}
            placeholder={T("Search name, username, email, or phone…", "ابحث بالاسم أو اسم المستخدم أو البريد أو الجوال…", ar)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            suffix={
              search ? (
                <IconButton size="sm" variant="ghost" onClick={() => setSearch("")}>
                  <X size={13} />
                </IconButton>
              ) : undefined
            }
          />
        </div>
        <IconButton
          size="md"
          className="sm:hidden"
          aria-label={T("Search", "بحث", ar)}
          onClick={() => setMobileSearchOpen((o) => !o)}
        >
          <Search size={16} />
        </IconButton>
        <div className="w-[180px]">
          <Select
            variant="search"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
          >
            <option value="all">{T("All statuses", "جميع الحالات", ar)}</option>
            <option value="active">{T("Active", "نشط", ar)}</option>
            <option value="inactive">{T("Inactive", "غير نشط", ar)}</option>
          </Select>
        </div>
        <div className="flex-1" />
        <Button variant="primary" size="sm" onClick={() => { resetForm(); setDrawerOpen(true); }} className="shadow-[var(--shadow-glow-blue)]">
          <UserPlus size={15} />
          {T("Add employee", "إضافة موظف", ar)}
        </Button>
      </div>

      {mobileSearchOpen && (
        <div className="sm:hidden mb-3">
          <Input
            variant="search"
            icon={<Search size={14} />}
            placeholder={T("Search name, username, email, or phone…", "ابحث بالاسم أو اسم المستخدم أو البريد أو الجوال…", ar)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            suffix={
              search ? (
                <IconButton size="sm" variant="ghost" onClick={() => setSearch("")}>
                  <X size={13} />
                </IconButton>
              ) : undefined
            }
            autoFocus
          />
        </div>
      )}

      {/* Team table */}
      {loading ? (
        <div className="rounded-card overflow-hidden mk-surface flex justify-center py-14">
          <Loader2 className="animate-spin text-mk-blue-500" size={32} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-card overflow-hidden mk-surface flex flex-col items-center justify-center py-14 gap-3 text-mk-ink-400">
          <User size={32} strokeWidth={1.5} />
          <span className="mk-label">{T("No users found", "لا يوجد مستخدمون مطابقون", ar)}</span>
        </div>
      ) : (
        <div className="rounded-card overflow-hidden mk-surface">
          <Table>
            <thead>
              <Tr>
                <Th>{T("Person", "الشخص", ar)}</Th>
                <Th>{T("Role", "الدور", ar)}</Th>
                <Th>{T("Branch", "الفرع", ar)}</Th>
                <Th>{T("Status", "الحالة", ar)}</Th>
                <Th>{T("Active", "التفعيل", ar)}</Th>
                <Th>{T("Last active", "آخر نشاط", ar)}</Th>
                <Th />
              </Tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <Tr
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleViewUser(p)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleViewUser(p); }}
                  className="cursor-pointer transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50"
                >
                  <Td style={{ borderInlineStart: !p.isActive ? "3px solid var(--color-mk-ink-300)" : "none" }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={p.name} size="sm" className={!p.isActive ? "grayscale opacity-50" : ""} />
                      <div className="min-w-0">
                        <div className="mk-body text-mk-ink-900 truncate">{p.name}</div>
                        <div className="font-mono mk-overline text-mk-ink-400">@{p.userName}</div>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <Badge variant={ROLE_BADGE[p.role] ?? "neutral"}>
                      {ar ? (ROLE_AR[p.role] ?? p.role) : p.role}
                    </Badge>
                  </Td>
                  <Td className="mk-label text-mk-ink-700 truncate">{p.branch}</Td>
                  <Td>
                    <Badge variant={p.isActive ? "success" : "neutral"} dot>
                      {p.isActive ? T("Active", "نشط", ar) : T("Inactive", "غير نشط", ar)}
                    </Badge>
                  </Td>
                  <Td onClick={(e) => e.stopPropagation()}>
                    <Toggle
                      size="sm"
                      checked={p.isActive}
                      disabled={togglingRowId === p.id || isProtectedUser(p)}
                      onChange={() => handleRowToggle(p)}
                    />
                  </Td>
                  <Td className="mk-caption text-mk-ink-500 truncate">{p.lastActive}</Td>
                  <Td className="text-end" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1 justify-end">
                      <IconButton
                        size="sm"
                        variant="ghost"
                        aria-label={T("Edit employee", "تعديل الموظف", ar)}
                        onClick={() => handleEditUser(p)}
                      >
                        <Edit size={14} />
                      </IconButton>
                      <ChevronRight size={16} className="text-mk-ink-300 inline-block" />
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      {/* ── DRAWER: Add new employee ───────────────────────── */}
      <Drawer open={isDrawerOpen} onClose={() => { setDrawerOpen(false); resetForm(); }}>
        <div className="flex flex-col justify-between h-full w-full">
          <div>
            <DrawerHeader title={T("Add new employee", "إضافة موظف جديد", ar)} onClose={() => { setDrawerOpen(false); resetForm(); }} className="mb-0 pb-4 border-b border-mk-border" />

            {createdCredentials ? (
              <div className="flex flex-col gap-4 mt-5">
                <div className="flex flex-col items-center text-center gap-2 py-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-mk-mint-100 text-mk-mint-700">
                    <Check size={22} />
                  </div>
                  <div className="mk-h4 text-mk-ink-900">{T("Employee created", "تم إنشاء الموظف", ar)}</div>
                  <p className="mk-caption text-mk-ink-500 max-w-[320px]">
                    {T("Share these credentials with the new hire — the password won't be shown again.", "شارك بيانات الدخول مع الموظف — كلمة المرور لن تظهر مرة أخرى.", ar)}
                  </p>
                </div>

                <div className="rounded-md border border-mk-ink-100 bg-mk-ink-50 p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="mk-caption text-mk-ink-400">{T("Username", "اسم المستخدم", ar)}</span>
                    <span className="font-mono mk-label text-mk-ink-900" dir="ltr">{createdCredentials.username}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="mk-caption text-mk-ink-400">{T("Password", "كلمة المرور", ar)}</span>
                    <span className="font-mono mk-label text-mk-ink-900" dir="ltr">{createdCredentials.password}</span>
                  </div>
                </div>

                <Button variant="outline" onClick={copyCredentials}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? T("Copied!", "تم النسخ!", ar) : T("Copy credentials", "نسخ بيانات الدخول", ar)}
                </Button>
              </div>
            ) : (
            <form onSubmit={handleCreateUser} className="flex flex-col gap-4 mt-5">
              <Input
                variant="muted"
                label={<>{T("Full name", "الاسم الكامل", ar)} <span className="text-mk-danger">*</span></>}
                placeholder={T("e.g. Sara Al-Qahtani", "مثال: سارة القحطاني", ar)}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <Input
                variant="muted"
                className="font-mono"
                dir="ltr"
                label={<>{T("Username", "اسم المستخدم", ar)} <span className="text-mk-danger">*</span></>}
                placeholder="sara.qahtani"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
              <Input
                variant="muted"
                type="email"
                className="font-mono"
                dir="ltr"
                label={<>{T("Email", "البريد الإلكتروني", ar)} <span className="text-mk-danger">*</span></>}
                placeholder="sara.qahtani@maarkbh.sa"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <SaudiPhoneInput
                label={T("Phone number", "رقم الجوال", ar)}
                value={phoneNumber}
                onChange={setPhoneNumber}
              />

              {/* Identity — required by Tajeer for contract-issuing operators */}
              {identityFields}

              <div className="relative">
                <Input
                  variant="muted"
                  className="font-mono"
                  label={<>{T("Password", "كلمة المرور", ar)} <span className="text-mk-danger">*</span></>}
                  type={showPassword ? "text" : "password"}
                  placeholder={T("Enter password", "أدخل كلمة المرور", ar)}
                  helpText={T("8+ chars · uppercase · lowercase · digit · special char (e.g. Employee@123)", "8 أحرف+ · حرف كبير · حرف صغير · رقم · رمز خاص (مثال: Employee@123)", ar)}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute end-3 top-[38px] text-mk-ink-400 hover:text-mk-ink-700"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <Select
                label={T("Role *", "الدور *", ar)}
                variant="muted"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
              >
                <option value="">{T("Select a role", "اختر دورًا", ar)}</option>
                {roleOptions.map((r) => (
                  <option key={r.name || r.identityName} value={r.name || r.identityName}>
                    {r.displayName || r.name}
                  </option>
                ))}
              </Select>

              {branchCheckboxes("branch")}
            </form>
            )}
          </div>

          <DrawerFooter className="mt-4 pt-4 border-t border-mk-border justify-stretch">
            {createdCredentials ? (
              <Button variant="primary" className="flex-1" onClick={() => { setDrawerOpen(false); resetForm(); }}>
                {T("Done", "تم", ar)}
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => { setDrawerOpen(false); resetForm(); }}>
                  {T("Cancel", "إلغاء", ar)}
                </Button>
                <Button
                  variant="primary"
                  disabled={isFormInvalid || creating}
                  onClick={() => handleCreateUser()}
                  className="flex-1"
                >
                  {creating ? <Loader2 size={14} className="animate-spin" /> : null}
                  {creating ? T("Creating…", "جارِ الإنشاء…", ar) : T("Add employee", "إضافة موظف", ar)}
                </Button>
              </>
            )}
          </DrawerFooter>
        </div>
      </Drawer>

      {/* ── DRAWER: Edit employee ──────────────────────────── */}
      <Drawer open={isEditDrawerOpen} onClose={() => setEditDrawerOpen(false)}>
        <div className="flex flex-col justify-between h-full w-full">
          <div>
            <DrawerHeader title={T("Edit employee", "تعديل الموظف", ar)} onClose={() => setEditDrawerOpen(false)} className="mb-0 pb-4 border-b border-mk-border" />

            <form onSubmit={handleUpdateUser} className="flex flex-col gap-4 mt-5">
              <Input
                variant="muted"
                className="font-mono"
                dir="ltr"
                label={<>{T("Username", "اسم المستخدم", ar)} <span className="text-mk-danger">*</span></>}
                placeholder={T("Enter username", "أدخل اسم المستخدم", ar)}
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
              <Input
                variant="muted"
                label={<>{T("Full name", "الاسم الكامل", ar)} <span className="text-mk-danger">*</span></>}
                placeholder={T("Enter full name", "ادخل الاسم الكامل", ar)}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <Input
                variant="muted"
                type="email"
                className="font-mono"
                dir="ltr"
                label={<>{T("Email", "البريد الإلكتروني", ar)} <span className="text-mk-danger">*</span></>}
                placeholder={T("Enter email", "أدخل البريد الالكتروني", ar)}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <SaudiPhoneInput
                label={T("Phone number", "رقم الجوال", ar)}
                value={phoneNumber}
                onChange={setPhoneNumber}
              />

              {/* Identity — required by Tajeer for contract-issuing operators */}
              {identityFields}

              <Select
                label={T("Role *", "الدور *", ar)}
                variant="muted"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
              >
                <option value="">{T("Select a role", "اختر دورًا", ar)}</option>
                {roleOptions.map((r) => (
                  <option key={r.name || r.identityName} value={r.name || r.identityName}>
                    {r.displayName || r.name}
                  </option>
                ))}
              </Select>

              {branchCheckboxes("branch-edit")}

              <div className="flex items-center gap-3 p-4 rounded-lg bg-mk-ink-50">
                <input
                  type="checkbox"
                  id="isActiveEdit"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="isActiveEdit" className="mk-body text-mk-ink-900">
                  {T("Active", "نشط", ar)}
                </label>
              </div>
            </form>
          </div>

          <DrawerFooter className="mt-4 pt-4 border-t border-mk-border justify-stretch">
            <Button variant="outline" onClick={() => setEditDrawerOpen(false)}>
              {T("Cancel", "إلغاء", ar)}
            </Button>
            <Button
              variant="primary"
              disabled={isEditInvalid || savingEdit}
              onClick={() => handleUpdateUser()}
              className="flex-1 shadow-[var(--shadow-glow-blue)]"
            >
              {savingEdit ? <Loader2 size={14} className="animate-spin" /> : null}
              {savingEdit ? T("Saving…", "جارِ الحفظ…", ar) : T("Update", "تحديث", ar)}
            </Button>
          </DrawerFooter>
        </div>
      </Drawer>

      {/* ── DRAWER: Teammate details ───────────────────────── */}
      <Drawer open={isViewDrawerOpen} onClose={() => setViewDrawerOpen(false)}>
        <div className="flex flex-col gap-5 justify-between h-full max-w-[480px]">
          <div>
            <DrawerHeader title={T("Teammate Details", "تفاصيل العضو", ar)} onClose={() => setViewDrawerOpen(false)} className="mb-0 pb-4 border-b border-mk-ink-100" />

            {viewLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-mk-blue-500" size={28} />
              </div>
            ) : viewingUser && (
              <div className="flex flex-col gap-4 mt-5">
                <div className="flex items-center gap-3">
                  <Avatar name={viewingUser.name || viewingUser.fullName} size="md" />
                  <div>
                    <div className="mk-body text-mk-ink-900">{viewingUser.name || viewingUser.fullName}</div>
                    {viewingUser.userName && (
                      <div className="font-mono mk-overline text-mk-ink-400">@{viewingUser.userName}</div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-md bg-mk-ink-50">
                    <div className="mk-caption text-mk-ink-500 mb-1">{T("Role", "الدور", ar)}</div>
                    <div className="mk-label text-mk-ink-900">{viewingUser.roleDisplayName || viewingUser.role}</div>
                  </div>
                  <div className="p-3 rounded-md bg-mk-ink-50">
                    <div className="mk-caption text-mk-ink-500 mb-1">{T("Status", "الحالة", ar)}</div>
                    <Badge variant={viewingUser.isActive ? "success" : "neutral"} dot>
                      {viewingUser.isActive ? T("Active", "نشط", ar) : T("Inactive", "غير نشط", ar)}
                    </Badge>
                  </div>
                </div>

                <div className="p-3 rounded-md bg-mk-ink-50">
                  <div className="mk-caption text-mk-ink-500 mb-1">{T("Branches", "الفروع", ar)}</div>
                  <div className="mk-label text-mk-ink-900">
                    {viewingUser.hasAllBranches
                      ? T("All branches", "جميع الفروع", ar)
                      : (viewingUser.branchIds || []).length > 0
                        ? branchOptions
                            .filter((b) => viewingUser.branchIds.includes(b.id))
                            .map((b) => (ar ? (b.nameAr || b.name) : (b.nameEn || b.name)))
                            .join(', ')
                        : T("No branches assigned", "لا توجد فروع مخصصة", ar)}
                  </div>
                </div>

                {viewingUser.userName && (
                  <div className="p-3 rounded-md bg-mk-ink-50">
                    <div className="mk-caption text-mk-ink-500 mb-1">{T("Username", "اسم المستخدم", ar)}</div>
                    <div className="mk-label text-mk-ink-900" dir="ltr">{viewingUser.userName}</div>
                  </div>
                )}

                {viewingUser.email && (
                  <div className="p-3 rounded-md bg-mk-ink-50">
                    <div className="mk-caption text-mk-ink-500 mb-1">{T("Email", "الإيميل", ar)}</div>
                    <div className="mk-label text-mk-ink-900" dir="ltr">{viewingUser.email}</div>
                  </div>
                )}

                {viewingUser.phoneNumber && (
                  <div className="p-3 rounded-md bg-mk-ink-50">
                    <div className="mk-caption text-mk-ink-500 mb-1">{T("Phone Number", "رقم الهاتف", ar)}</div>
                    <div className="mk-label text-mk-ink-900" dir="ltr">{viewingUser.phoneNumber}</div>
                  </div>
                )}

                {viewingUser.nationalId && (
                  <div className="p-3 rounded-md bg-mk-ink-50">
                    <div className="mk-caption text-mk-ink-500 mb-1">{T("Identity number", "رقم الهوية", ar)}</div>
                    <div className="mk-label text-mk-ink-900" dir="ltr">{viewingUser.nationalId}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DrawerFooter className="mt-0 pt-4 border-t border-mk-ink-100 justify-stretch flex-col gap-3">
            <div className="flex items-center gap-3 w-full">
              <Button variant="outline" className="flex-1" onClick={() => setViewDrawerOpen(false)}>
                {T("Close", "إغلاق", ar)}
              </Button>
              <Button
                variant="primary"
                className="flex-1 shadow-[var(--shadow-glow-blue)]"
                onClick={() => { setViewDrawerOpen(false); handleEditUser(viewingUser); }}
              >
                <Edit size={14} />
                {T("Edit", "تعديل", ar)}
              </Button>
            </div>

            {!isProtectedUser(viewingUser) && (
              <div className="grid grid-cols-2 gap-3 w-full">
                <Button
                  variant="outline"
                  className={viewingUser?.isActive ? "border-mk-danger text-mk-danger hover:bg-mk-danger/5" : "border-mk-mint-600 text-mk-mint-600 hover:bg-mk-mint-50"}
                  onClick={handleToggleActive}
                  disabled={togglingActive}
                >
                  {togglingActive ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : viewingUser?.isActive ? (
                    <><PowerOff size={14} /> {T("Deactivate", "تعطيل", ar)}</>
                  ) : (
                    <><Power size={14} /> {T("Activate", "تفعيل", ar)}</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setResetUser(viewingUser)}
                >
                  <KeyRound size={14} />
                  {T("Reset password", "إعادة تعيين كلمة المرور", ar)}
                </Button>
              </div>
            )}

            {isProtectedUser(viewingUser) && (
              <div className="flex items-center justify-center gap-2 text-mk-ink-400 mk-caption">
                <Lock size={14} />
                {T("Protected user — actions restricted", "مستخدم محمي — الإجراءات مقيدة", ar)}
              </div>
            )}
          </DrawerFooter>
        </div>
      </Drawer>

      {/* ── Reset password modal ───────────────────────────── */}
      <Modal
        open={resetUser !== null}
        onClose={() => setResetUser(null)}
        title={T("Reset password", "إعادة تعيين كلمة المرور", ar)}
        variant="centered"
        size="sm"
      >
        <div className="p-5 flex flex-col gap-4">
          <p className="mk-body-sm text-mk-ink-600">
            {T(
              `Set a new password for ${resetUser?.name ?? resetUser?.userName ?? "this user"}.`,
              `عيّن كلمة مرور جديدة لـ ${resetUser?.name ?? resetUser?.userName ?? "هذا المستخدم"}.`,
              ar
            )}
          </p>
          <div className="relative">
            <Input
              variant="muted"
              className="font-mono"
              label={T("New password", "كلمة المرور الجديدة", ar)}
              type={showNewPassword ? "text" : "password"}
              placeholder={T("e.g. Employee@123", "مثال: Employee@123", ar)}
              helpText={T("8+ chars · uppercase · lowercase · digit · special char", "8 أحرف+ · حرف كبير · حرف صغير · رقم · رمز خاص", ar)}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute end-3 top-[38px] text-mk-ink-400 hover:text-mk-ink-700"
              onClick={() => setShowNewPassword(!showNewPassword)}
              tabIndex={-1}
            >
              {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setResetUser(null)} className="flex-1 justify-center">
              {T("Cancel", "إلغاء", ar)}
            </Button>
            <Button
              variant="primary"
              className="flex-1 justify-center"
              disabled={resetting || newPassword.length === 0}
              onClick={handleResetPassword}
            >
              {resetting ? <Loader2 size={14} className="animate-spin" /> : null}
              {T("Reset", "إعادة تعيين", ar)}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
