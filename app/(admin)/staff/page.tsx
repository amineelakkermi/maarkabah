"use client";

import { useState, useEffect } from "react";
import { Plus, Loader2, Edit, Power, PowerOff, KeyRound, Lock } from "lucide-react";
import { Avatar, Badge, Button, Table, Th, Td, type BadgeVariant, Drawer, DrawerHeader, DrawerFooter, useToast, Input, Select, Modal } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { tenantUserService, tenantRoleService, branchService } from "@/lib/api-services";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

// The API returns branch assignments either as a list of ids or a list of
// { id, nameAr, nameEn } objects depending on the endpoint — normalize both.
const extractBranchIds = (details: any): number[] =>
  (details?.branches || details?.branchIds || []).map((b: any) => (typeof b === 'object' ? b.id : b));

// The backend expects Saudi mobile numbers in the form 9665XXXXXXXX.
// Normalize common input formats (+9665..., 009665..., 05..., 5...) to that shape.
const normalizeSaudiPhone = (raw: string): string => {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00966")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = `966${digits.slice(1)}`;
  else if (digits.startsWith("5")) digits = `966${digits}`;
  return digits;
};

const isValidSaudiPhone = (phone: string): boolean => /^9665\d{8}$/.test(phone);

const isProtectedUser = (user: any): boolean =>
  user?.roleName?.startsWith('TenantAdmin') || user?.isEditable === false;

const ROLE_BADGE: Record<string, BadgeVariant> = {
  "Owner": "violet",
  "Manager": "info",
  "Front Desk": "success",
  "Accountant": "warning",
};

const ROLE_BULLET: Record<string, string> = {
  "Owner": "var(--color-mk-violet-500)",
  "Manager": "var(--color-mk-blue-500)",
  "Front Desk": "var(--color-mk-mint-600)",
  "Accountant": "var(--color-mk-warning)",
};

const ROLE_AR: Record<string, string> = {
  "Owner": "المالك",
  "Manager": "مدير",
  "Front Desk": "موظف استقبال",
  "Accountant": "محاسب",
};

export default function StaffPage() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleOptions, setRoleOptions] = useState<any[]>([]);
  const [branchOptions, setBranchOptions] = useState<any[]>([]);
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
  const { showToast } = useToast();

  const [userName, setUserName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [roleName, setRoleName] = useState("");
  const [branchIds, setBranchIds] = useState<number[]>([]);
  const [isActive, setIsActive] = useState(true);

  // Load users from API
  useEffect(() => {
    loadUsers();
    loadRoleOptions();
    loadBranchOptions();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await tenantUserService.getUsers(1, 100);
      console.log('Users API response:', response);

      const rawUsers = response.items || response.data || [];

      const transformedUsers = rawUsers.map((item: any) => ({
        id: item.id,
        name: item.fullName || '',
        email: item.email || '',
        role: item.roleDisplayName || item.roleName || 'Staff',
        roleName: item.roleName || '',
        branch: item.hasAllBranches
          ? T("All branches", "جميع الفروع", ar)
          : `${item.branchCount ?? 0} ${T("branch(es)", "فرع/فروع", ar)}`,
        permissions: item.roleName?.startsWith('TenantAdmin') || item.isEditable === false
          ? 'All permissions'
          : (item.permissionsCount || 0),
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
      console.log('Role options API response:', response);
      const items = Array.isArray(response) ? response : (response.items || response.data || []);
      setRoleOptions(items.map((r: any) =>
        typeof r === 'string' ? { name: r, displayName: r } : r
      ));
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

  const resetForm = () => {
    setUserName("");
    setFullName("");
    setEmail("");
    setPhoneNumber("");
    setPassword("");
    setRoleName("");
    setBranchIds([]);
    setIsActive(true);
  };

  const toggleBranch = (id: number) => {
    setBranchIds(prev =>
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  const handleEditUser = async (user: any) => {
    setEditingUser(user);
    setUserName(user.userName || "");
    setFullName(user.name || "");
    setEmail(user.email || "");
    setPhoneNumber(user.phoneNumber || "");
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
      setPhoneNumber(details.phoneNumber || user.phoneNumber || "");
      setBranchIds(extractBranchIds(details));
      setIsActive(details.isActive !== false);
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !fullName || !email || !password || !roleName) {
      showToast(T("Please fill all mandatory fields", "الرجاء تعبئة الحقول الإلزامية", ar), "error");
      return;
    }

    const normalizedPhone = phoneNumber ? normalizeSaudiPhone(phoneNumber) : "";
    if (normalizedPhone && !isValidSaudiPhone(normalizedPhone)) {
      showToast(T("Phone number must be a Saudi mobile number in the form 9665XXXXXXXX", "يجب أن يكون رقم الهاتف رقم جوال سعودي بصيغة 9665XXXXXXXX", ar), "error");
      return;
    }

    try {
      await tenantUserService.create({
        userName,
        fullName,
        email,
        phoneNumber: normalizedPhone || undefined,
        password,
        roleName,
        branchIds,
      });

      await loadUsers();
      setDrawerOpen(false);
      resetForm();
      showToast(T("User created successfully!", "تم إضافة الموظف بنجاح!", ar));
    } catch (error: any) {
      console.error('Error creating user:', error);
      const message = error?.message || T('Failed to create user', 'فشل إنشاء الموظف', ar);
      showToast(message, "error");
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !fullName || !email || !roleName) {
      showToast(T("Please fill all mandatory fields", "الرجاء تعبئة الحقول الإلزامية", ar), "error");
      return;
    }

    const normalizedPhone = phoneNumber ? normalizeSaudiPhone(phoneNumber) : "";
    if (normalizedPhone && !isValidSaudiPhone(normalizedPhone)) {
      showToast(T("Phone number must be a Saudi mobile number in the form 9665XXXXXXXX", "يجب أن يكون رقم الهاتف رقم جوال سعودي بصيغة 9665XXXXXXXX", ar), "error");
      return;
    }

    try {
      await tenantUserService.update(editingUser.id, {
        userName,
        email,
        phoneNumber: normalizedPhone || undefined,
        fullName,
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
    if (newPassword.length < 8 || !/\d/.test(newPassword)) {
      showToast(T("Password must be at least 8 characters and include a digit", "يجب أن تكون كلمة المرور 8 أحرف على الأقل وتحتوي على رقم", ar), "error");
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

  const ROLES_REF = [
    {
      role: "Owner", roleAr: "المالك",
      permsEn: ["Full platform access", "All branches", "Billing & settings", "Add/remove staff"],
      permsAr: ["صلاحية كاملة للمنصة", "جميع الفروع", "الفواتير والإعدادات", "إضافة/حذف الموظفين"],
    },
    {
      role: "Manager", roleAr: "مدير",
      permsEn: ["Branch operations", "Contracts & returns", "KYC review", "Reports (branch)"],
      permsAr: ["عمليات الفرع", "العقود والإرجاعات", "مراجعة الهوية", "التقارير (الفرع)"],
    },
    {
      role: "Front Desk", roleAr: "موظف استقبال",
      permsEn: ["Create contracts", "KYC verification", "Pickup / return", "Customer search"],
      permsAr: ["إنشاء العقود", "التحقق من الهوية", "التسليم / الإرجاع", "بحث العملاء"],
    },
    {
      role: "Accountant", roleAr: "محاسب",
      permsEn: ["Finance · read-only", "Revenue reports", "Refund review", "No contract access"],
      permsAr: ["مالية · قراءة فقط", "تقارير الإيرادات", "مراجعة الاسترداد", "لا صلاحية للعقود"],
    },
  ];

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center gap-3 mb-5">
        <div className="mk-h4 flex-1 text-mk-ink-900">
          {T("Team", "الفريق", ar)}
        </div>
        <Button
          variant="primary"
          className="shadow-[var(--shadow-glow-blue)]"
          onClick={() => { resetForm(); setDrawerOpen(true); }}
        >
          <Plus size={14} />
          {T("Invite teammate", "دعوة عضو", ar)}
        </Button>
      </div>

      {/* Staff table */}
      <div className="rounded-xl overflow-hidden mk-surface">
        <Table>
          <thead>
            <tr>
              {[
                T("Person", "الشخص", ar),
                T("Role", "الدور", ar),
                T("Branch", "الفرع", ar),
                T("Status", "الحالة", ar),
                T("Permissions", "الصلاحيات", ar),
                "",
              ].map((h, i) => <Th key={i}>{h}</Th>)}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-12">
                  <Loader2 className="animate-spin text-mk-blue-500 mx-auto" size={32} />
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 mk-label text-mk-ink-400">
                  {T("No staff members found", "لم يتم العثور على أعضاء الفريق", ar)}
                </td>
              </tr>
            ) : (
              users.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => handleViewUser(p)}
                  className="cursor-pointer transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50"
                >
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={p.name} size="sm" />
                      <div className="mk-body text-mk-ink-900">{p.name}</div>
                    </div>
                  </Td>
                  <Td>
                    <Badge variant={ROLE_BADGE[p.role] ?? "neutral"}>
                      {ar ? (ROLE_AR[p.role] ?? p.role) : p.role}
                    </Badge>
                  </Td>
                  <Td className="mk-label text-mk-ink-700">{p.branch}</Td>
                  <Td>
                    <Badge variant={p.isActive ? "success" : "danger"} dot>
                      {p.isActive ? T("Active", "نشط", ar) : T("Inactive", "غير نشط", ar)}
                    </Badge>
                  </Td>
                  <Td className="mk-caption text-mk-ink-500">{typeof p.permissions === 'number' ? `${p.permissions} permissions` : p.permissions}</Td>
                  <Td>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleEditUser(p); }}
                    >
                      <Edit size={14} />
                    </Button>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {/* Roles reference */}
      <div className="rounded-xl p-6 mt-4 mk-surface">
        <div className="mk-h4 mb-4 text-mk-ink-900">
          {T("Role permissions", "صلاحيات الأدوار", ar)}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {ROLES_REF.map((r) => {
            const bullet = ROLE_BULLET[r.role] ?? "var(--color-mk-ink-400)";
            return (
              <div key={r.role} className="p-4 rounded-md bg-mk-ink-50">
                <Badge variant={ROLE_BADGE[r.role] ?? "neutral"} className="mb-3">
                  {ar ? r.roleAr : r.role}
                </Badge>
                <ul className="flex flex-col gap-1">
                  {(ar ? r.permsAr : r.permsEn).map((perm) => (
                    <li key={perm} className="flex items-center gap-2 mk-caption text-mk-ink-700">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: bullet }} />
                      {perm}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* View Drawer */}
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
                  <div className="mk-body text-mk-ink-900">{viewingUser.name || viewingUser.fullName}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-md bg-mk-ink-50">
                    <div className="mk-caption text-mk-ink-500 mb-1">{T("Role", "الدور", ar)}</div>
                    <div className="mk-label text-mk-ink-900">{viewingUser.roleDisplayName || viewingUser.role}</div>
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
                    <div className="mk-label text-mk-ink-900">{viewingUser.userName}</div>
                  </div>
                )}

                {viewingUser.email && (
                  <div className="p-3 rounded-md bg-mk-ink-50">
                    <div className="mk-caption text-mk-ink-500 mb-1">{T("Email", "الإيميل", ar)}</div>
                    <div className="mk-label text-mk-ink-900">{viewingUser.email}</div>
                  </div>
                )}

                {viewingUser.phoneNumber && (
                  <div className="p-3 rounded-md bg-mk-ink-50">
                    <div className="mk-caption text-mk-ink-500 mb-1">{T("Phone Number", "رقم الهاتف", ar)}</div>
                    <div className="mk-label text-mk-ink-900">{viewingUser.phoneNumber}</div>
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

      {/* Reset Password Modal */}
      <Modal
        open={!!resetUser}
        onClose={() => { setResetUser(null); setNewPassword(""); }}
        variant="centered"
        size="sm"
        title={T("Reset password", "إعادة تعيين كلمة المرور", ar)}
      >
        <div className="flex flex-col gap-4 p-6">
          <p className="mk-body-sm text-mk-ink-700">
            {T("Set a new password for", "تعيين كلمة مرور جديدة لـ", ar)}
            <span className="font-semibold text-mk-ink-900 ms-1">{resetUser?.name || resetUser?.fullName}</span>
          </p>
          <Input
            type="password"
            label={T("New password", "كلمة المرور الجديدة", ar)}
            placeholder={T("At least 8 characters with a digit", "8 أحرف على الأقل مع رقم", ar)}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <div className="flex items-center gap-3 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => { setResetUser(null); setNewPassword(""); }} disabled={resetting}>
              {T("Cancel", "إلغاء", ar)}
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleResetPassword} disabled={resetting}>
              {resetting ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
              {T("Reset", "تعيين", ar)}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Drawer */}
      <Drawer open={isDrawerOpen} onClose={() => setDrawerOpen(false)}>
        <div className="flex flex-col gap-5 justify-between h-full max-w-[480px]">
          <div>
            <DrawerHeader title={T("Invite Teammate", "دعوة عضو جديد", ar)} onClose={() => setDrawerOpen(false)} className="mb-0 pb-4 border-b border-mk-ink-100" />

            <form onSubmit={handleCreateUser} className="flex flex-col gap-4 mt-5">
              <Input
                label={T("Username *", "اسم المستخدم *", ar)}
                placeholder={T("Enter username", "أدخل اسم المستخدم", ar)}
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
              <Input
                label={T("Full Name *", "الاسم الكامل *", ar)}
                placeholder={T("Enter full name", "أدخل الاسم الكامل", ar)}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <Input
                label={T("Email *", "البريد الإلكتروني *", ar)}
                type="email"
                placeholder={T("Enter email", "أدخل البريد الالكتروني", ar)}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                label={T("Phone Number", "رقم الهاتف", ar)}
                type="tel"
                placeholder="e.g. 9665XXXXXXXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <Input
                label={T("Password *", "كلمة المرور *", ar)}
                type="password"
                placeholder={T("Enter password", "أدخل كلمة المرور", ar)}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Select
                label={T("Role *", "الدور *", ar)}
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

              <div>
                <div className="mk-body-sm text-mk-fg-1 mb-2">{T("Branches", "الفروع", ar)}</div>
                <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto border border-mk-ink-100 rounded-md p-3">
                  {branchOptions.map((b) => (
                    <div key={b.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`branch-${b.id}`}
                        checked={branchIds.includes(b.id)}
                        onChange={() => toggleBranch(b.id)}
                        className="w-4 h-4"
                      />
                      <label htmlFor={`branch-${b.id}`} className="mk-caption text-mk-ink-700">
                        {ar ? (b.nameAr || b.name) : (b.nameEn || b.name)}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </form>
          </div>

          <DrawerFooter className="mt-0 pt-4 border-t border-mk-ink-100 justify-stretch">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              {T("Cancel", "إلغاء", ar)}
            </Button>
            <Button variant="primary" onClick={handleCreateUser} className="flex-1 shadow-[var(--shadow-glow-blue)]">
              {T("✓ Invite", "✓ دعوة", ar)}
            </Button>
          </DrawerFooter>
        </div>
      </Drawer>

      {/* Edit Drawer */}
      <Drawer open={isEditDrawerOpen} onClose={() => setEditDrawerOpen(false)}>
        <div className="flex flex-col gap-5 justify-between h-full max-w-[480px]">
          <div>
            <DrawerHeader title={T("Edit Teammate", "تعديل العضو", ar)} onClose={() => setEditDrawerOpen(false)} className="mb-0 pb-4 border-b border-mk-ink-100" />

            <form onSubmit={handleUpdateUser} className="flex flex-col gap-4 mt-5">
              <Input
                label={T("Username *", "اسم المستخدم *", ar)}
                placeholder={T("Enter username", "أدخل اسم المستخدم", ar)}
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
              <Input
                label={T("Full Name *", "الاسم الكامل *", ar)}
                placeholder={T("Enter full name", "ادخل الاسم الكامل", ar)}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <Input
                label={T("Email *", "البريد الإلكتروني *", ar)}
                type="email"
                placeholder={T("Enter email", "أدخل البريد الالكتروني", ar)}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                label={T("Phone Number", "رقم الهاتف", ar)}
                type="tel"
                placeholder="e.g. 9665XXXXXXXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <Select
                label={T("Role *", "الدور *", ar)}
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

              <div>
                <div className="mk-body-sm text-mk-fg-1 mb-2">{T("Branches", "الفروع", ar)}</div>
                <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto border border-mk-ink-100 rounded-md p-3">
                  {branchOptions.map((b) => (
                    <div key={b.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`branch-edit-${b.id}`}
                        checked={branchIds.includes(b.id)}
                        onChange={() => toggleBranch(b.id)}
                        className="w-4 h-4"
                      />
                      <label htmlFor={`branch-edit-${b.id}`} className="mk-caption text-mk-ink-700">
                        {ar ? (b.nameAr || b.name) : (b.nameEn || b.name)}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

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

          <DrawerFooter className="mt-0 pt-4 border-t border-mk-ink-100 justify-stretch">
            <Button variant="outline" onClick={() => setEditDrawerOpen(false)}>
              {T("Cancel", "إلغاء", ar)}
            </Button>
            <Button variant="primary" onClick={handleUpdateUser} className="flex-1 shadow-[var(--shadow-glow-blue)]">
              {T("✓ Update", "✓ تحديث", ar)}
            </Button>
          </DrawerFooter>
        </div>
      </Drawer>
    </div>
  );
}
