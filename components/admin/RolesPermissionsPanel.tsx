"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronRight, Loader2, Trash2 } from "lucide-react";
import { Badge, Button, Table, Tr, Th, Td, Toggle, IconButton, Modal, useToast } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { tenantRoleService } from "@/lib/api-services";
import { builtinRoleStyle, CUSTOM_ROLE_STYLE } from "./roleStyles";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

// Static reference of the platform's built-in roles — shown in the "Role
// details" cards so staff can see what each fixed role grants without
// opening it. Custom (API) roles are listed after them.
const BUILTIN_ROLES_REF = [
  {
    slug: "owner", name: "Owner", nameAr: "المالك",
    permsEn: ["Full platform access", "All branches", "Billing & settings", "Add/remove staff"],
    permsAr: ["صلاحية كاملة للمنصة", "جميع الفروع", "الفواتير والإعدادات", "إضافة/حذف الموظفين"],
  },
  {
    slug: "manager", name: "Manager", nameAr: "مدير",
    permsEn: ["Branch operations", "Contracts & returns", "KYC review", "Reports (branch)"],
    permsAr: ["عمليات الفرع", "العقود والإرجاعات", "مراجعة الهوية", "التقارير (الفرع)"],
  },
  {
    slug: "front-desk", name: "Front Desk", nameAr: "موظف استقبال",
    permsEn: ["Create contracts", "KYC verification", "Pickup / return", "Customer search"],
    permsAr: ["إنشاء العقود", "التحقق من الهوية", "التسليم / الإرجاع", "بحث العملاء"],
  },
  {
    slug: "accountant", name: "Accountant", nameAr: "محاسب",
    permsEn: ["Finance · read-only", "Revenue reports", "Refund review", "No contract access"],
    permsAr: ["مالية · قراءة فقط", "تقارير الإيرادات", "مراجعة الاسترداد", "لا صلاحية للعقود"],
  },
];

export function RolesPermissionsPanel() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const router = useRouter();

  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [deleteRoleTarget, setDeleteRoleTarget] = useState<any>(null);
  const { showToast } = useToast();

  const loadRoles = async () => {
    try {
      setLoading(true);
      const response = await tenantRoleService.search({});
      const transformedRoles = (response.items || response.data || []).map((item: any) => ({
        id: item.id,
        name: item.name || '',
        description: item.description || '',
        active: item.isActive !== false,
        permissions: item.permissions || [],
        permissionsCount: item.permissions?.length || 0,
      }));
      setRoles(transformedRoles);
    } catch (error) {
      console.error('Error loading roles:', error);
      showToast(T('Failed to load roles', 'فشل تحميل الأدوار', ar));
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const response = await tenantRoleService.getPermissions();
      setPermissions(response);
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  };

  // Load roles and the permissions catalog from the API. Deferred to a
  // microtask so the synchronous `setLoading` inside the loaders doesn't
  // run inside the effect body.
  useEffect(() => {
    void Promise.resolve().then(() => {
      loadRoles();
      loadPermissions();
    });
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await tenantRoleService.delete(id);
      loadRoles();
      showToast(T("Role deleted successfully", "تم حذف الدور بنجاح", ar));
    } catch (error: any) {
      console.error('Error deleting role:', error);
      const rawMsg: string = error?.message || error?.response?.error || '';
      let msg = ar ? 'فشل حذف الدور' : 'Failed to delete role';
      if (/assigned to users/i.test(rawMsg)) {
        msg = ar
          ? 'لا يمكن حذف دور مُسند إلى مستخدمين'
          : 'Cannot delete a role that is assigned to users';
      } else if (rawMsg) {
        msg = rawMsg;
      }
      showToast(msg);
    }
  };

  // Resolve a stored permission value ("Contracts.View", …) to its display
  // label using the permissions catalog loaded from the API.
  const permissionLabel = (value: string) => {
    for (const page of permissions) {
      const hit = page.permissionItems?.find((p: any) => p.value === value);
      if (hit) return hit.label;
    }
    return value;
  };

  const rolePermissionValues = (role: any): string[] =>
    (role.permissions || [])
      .map((p: any) => (typeof p === "string" ? p : p?.value))
      .filter(Boolean);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="mk-h4 text-mk-ink-900">{T("Role permissions", "صلاحيات الأدوار", ar)}</div>
        <Button variant="primary" size="sm" onClick={() => router.push("/roles/new")}>
          <Plus size={13} /> {T("Add role", "إضافة دور", ar)}
        </Button>
      </div>

      <div className="rounded-card overflow-hidden mk-surface">
        <Table>
          <thead>
            <Tr>
              <Th>{T("Role", "الدور", ar)}</Th>
              <Th>{T("Description", "الوصف", ar)}</Th>
              <Th>{T("Type", "النوع", ar)}</Th>
              <Th>{T("Status", "الحالة", ar)}</Th>
              <Th>{T("Active", "التفعيل", ar)}</Th>
              <Th />
            </Tr>
          </thead>
          <tbody>
            {loading ? (
              <Tr>
                <Td colSpan={6} className="text-center py-12">
                  <Loader2 className="animate-spin text-mk-blue-500 mx-auto" size={32} />
                </Td>
              </Tr>
            ) : roles.length === 0 ? (
              <Tr>
                <Td colSpan={6} className="text-center py-12 mk-label text-mk-ink-400">
                  {T("No roles found", "لم يتم العثور على أدوار", ar)}
                </Td>
              </Tr>
            ) : (
              roles.map((role) => (
                <Tr
                  key={role.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/roles/${role.id}`)}
                  onKeyDown={(e) => { if (e.key === "Enter") router.push(`/roles/${role.id}`); }}
                  className="cursor-pointer transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50"
                >
                  <Td>
                    <Badge variant={CUSTOM_ROLE_STYLE.variant}>
                      <CUSTOM_ROLE_STYLE.Icon size={12} /> {role.name}
                    </Badge>
                  </Td>
                  <Td className="mk-caption text-mk-ink-500 truncate max-w-[320px]">{role.description}</Td>
                  <Td>
                    <Badge variant="info">
                      {T("Custom", "مخصص", ar)}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge variant={role.active ? "success" : "neutral"} dot>
                      {role.active ? T("Active", "مفعّل", ar) : T("Inactive", "غير مفعّل", ar)}
                    </Badge>
                  </Td>
                  <Td onClick={(e) => e.stopPropagation()}>
                    {/* Display-only: the roles API (CreateOrUpdateRoleDto)
                        has no isActive field, so activation can't be toggled
                        from here — the switch just mirrors the Status badge. */}
                    <Toggle size="sm" checked={role.active} disabled />
                  </Td>
                  <Td className="text-end" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1 justify-end">
                      <IconButton
                        size="sm"
                        variant="ghost"
                        className="text-mk-danger hover:text-mk-danger hover:bg-mk-danger-100"
                        aria-label={T("Delete role", "حذف الدور", ar)}
                        onClick={() => setDeleteRoleTarget(role)}
                      >
                        <Trash2 size={14} />
                      </IconButton>
                      <ChevronRight size={16} className="text-mk-ink-300 inline-block" />
                    </div>
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {/* Role details — a quick-reference breakdown of what each role
          currently grants, separate from the table above (which is for
          finding and opening a role) so scanning "what can a Manager do"
          doesn't require opening every row. */}
      <div className="mt-6">
        <div className="mk-label-muted mk-field-label mb-3">{T("Role details", "تفاصيل الأدوار", ar)}</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {BUILTIN_ROLES_REF.map((ref) => {
            const style = builtinRoleStyle(ref.slug);
            return (
              <div key={ref.slug} className="p-4 rounded-md mk-surface">
                <div className="flex items-center gap-1.5 flex-wrap mb-3">
                  <Badge variant={style.variant}>
                    <style.Icon size={12} /> {ar ? ref.nameAr : ref.name}
                  </Badge>
                </div>
                <ul className="flex flex-col gap-1">
                  {(ar ? ref.permsAr : ref.permsEn).map((perm) => (
                    <li key={perm} className="flex items-center gap-2 mk-caption text-mk-ink-700">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-mk-ink-400" />
                      {perm}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        
        </div>
      </div>

      {/* ── Confirm delete role modal ── */}
      <Modal
        open={deleteRoleTarget !== null}
        onClose={() => setDeleteRoleTarget(null)}
        title={T("Delete this role?", "حذف هذا الدور؟", ar)}
        variant="centered"
        size="sm"
      >
        <div className="p-5">
          <p className="mk-body-sm text-mk-ink-600 mb-5">
            {T(
              "This can't be undone. Staff currently assigned this role will keep it until reassigned.",
              "لا يمكن التراجع عن هذا الإجراء. الموظفون المُسند إليهم هذا الدور سيحتفظون به حتى إعادة تعيينهم.",
              ar
            )}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setDeleteRoleTarget(null)} className="flex-1 justify-center">
              {T("Cancel", "إلغاء", ar)}
            </Button>
            <Button
              variant="danger"
              className="flex-1 justify-center"
              onClick={async () => {
                if (deleteRoleTarget) {
                  await handleDelete(deleteRoleTarget.id);
                }
                setDeleteRoleTarget(null);
              }}
            >
              {T("Delete role", "حذف الدور", ar)}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
