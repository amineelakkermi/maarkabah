"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, ChevronLeft, Trash2, Check, Loader2 } from "lucide-react";
import { Button, Modal, useToast } from "@/components/ui";
import { RoleDetailsFields, RolePermissionsTree, type PermissionPage } from "@/components/admin/RoleForm";
import { useAdmin } from "@/contexts/AdminContext";
import { tenantRoleService } from "@/lib/api-services";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

/** Role detail screen — every role opens the same editable two-column
 * layout used by "Add role", so the two screens can't drift apart. */
export default function RoleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const { showToast } = useToast();

  const roleId = Number(id);
  const invalidId = !id || Number.isNaN(roleId);

  const [loading, setLoading] = useState(!invalidId);
  const [notFound, setNotFound] = useState(invalidId);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [roleActive, setRoleActive] = useState(true);
  const [permissions, setPermissions] = useState<PermissionPage[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [roleError, setRoleError] = useState<"name-required" | "duplicate" | "no-permissions" | null>(null);
  const [saved, setSaved] = useState(false);

  const hasAnyGrantedPermission = selectedPermissions.length > 0;

  useEffect(() => {
    tenantRoleService.getPermissions()
      .then(setPermissions)
      .catch((error) => console.error("Error loading permissions:", error));
  }, []);

  useEffect(() => {
    if (invalidId) return;
    (async () => {
      try {
        const details = await tenantRoleService.getById(roleId);
        const data = details?.data ?? details;
        if (!data || !data.id) {
          setNotFound(true);
          return;
        }
        setRoleName(data.name || "");
        setRoleDescription(data.description || "");
        setRoleActive(data.isActive !== false);
        const perms: (string | { value?: string })[] = data.permissions || [];
        setSelectedPermissions(
          perms.map((p) => (typeof p === "string" ? p : p?.value)).filter((v): v is string => Boolean(v))
        );
      } catch (error) {
        console.error("Error loading role details:", error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [roleId, invalidId]);

  const togglePermission = (permissionValue: string) => {
    setRoleError(null);
    setSelectedPermissions(prev =>
      prev.includes(permissionValue)
        ? prev.filter(p => p !== permissionValue)
        : [...prev, permissionValue]
    );
  };

  const togglePagePermissions = (pagePermissions: { value: string }[]) => {
    setRoleError(null);
    const allValues = pagePermissions.map(p => p.value);
    const allSelected = allValues.every(v => selectedPermissions.includes(v));
    setSelectedPermissions(prev =>
      allSelected
        ? prev.filter(p => !allValues.includes(p))
        : [...new Set([...prev, ...allValues])]
    );
  };

  async function handleSave() {
    if (!roleName || selectedPermissions.length === 0) {
      if (!roleName) setRoleError("name-required");
      if (selectedPermissions.length === 0) setRoleError("no-permissions");
      showToast(T("Please fill all mandatory fields", "الرجاء تعبئة الحقول الإلزامية", ar));
      return;
    }

    try {
      setSaving(true);
      await tenantRoleService.update(roleId, {
        name: roleName,
        description: roleDescription,
        permissions: selectedPermissions,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Error updating role:", error);
      showToast(T("Failed to update role", "فشل تحديث الدور", ar));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await tenantRoleService.delete(roleId);
      showToast(T("Role deleted successfully", "تم حذف الدور بنجاح", ar));
      router.push("/settings?tab=roles");
    } catch (error) {
      console.error("Error deleting role:", error);
      const err = error as { message?: string; response?: { error?: string } };
      const rawMsg: string = err?.message || err?.response?.error || "";
      let msg = ar ? "فشل حذف الدور" : "Failed to delete role";
      if (/assigned to users/i.test(rawMsg)) {
        msg = ar
          ? "لا يمكن حذف دور مُسند إلى مستخدمين"
          : "Cannot delete a role that is assigned to users";
      } else if (rawMsg) {
        msg = rawMsg;
      }
      showToast(msg);
    }
  }

  const backButton = (
    <Link href="/settings?tab=roles" className="w-9 h-9 rounded-full flex items-center justify-center bg-white shadow-[var(--shadow-card)] text-mk-ink-600 no-underline hover:bg-mk-ink-50 transition-colors shrink-0">
      {ar ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
    </Link>
  );

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-mk-blue-500" size={32} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col gap-4">
        {backButton}
        <div className="py-24 text-center">
          <div className="mk-display mb-3">🛡️</div>
          <div className="mk-body text-mk-ink-900">{T("Role not found", "الدور غير موجود", ar)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {saved && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full text-white mk-label shadow-2xl flex items-center gap-2 bg-mk-midnight">
          <Check size={14} /> {T("Role saved", "تم حفظ الدور", ar)}
        </div>
      )}

      {/* Page header — back button + title + Save/Cancel, same placement as
          every other create/edit header in the app: back + title first,
          actions second, so actions land on the header's leading-left in
          RTL. Plain (no mk-surface card) — this is a page title, not
          another panel. */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {backButton}
          <div>
            <div className="mk-h4 text-mk-ink-900">{roleName}</div>
            <p className="mk-caption text-mk-ink-500 mt-1">{T("Edit role", "تعديل الدور", ar)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" className="text-mk-danger hover:bg-mk-danger/6" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={13} /> {T("Delete role", "حذف الدور", ar)}
          </Button>
          <Link href="/settings?tab=roles">
            <Button variant="outline" size="sm">{T("Cancel", "إلغاء", ar)}</Button>
          </Link>
          <Button variant="primary" size="sm" disabled={saving || !roleName.trim() || !hasAnyGrantedPermission} onClick={handleSave}>
            {T("Save changes", "حفظ التغييرات", ar)}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 rounded-card p-5 mk-surface">
          <RoleDetailsFields
            ar={ar}
            roleName={roleName}
            onRoleNameChange={(v) => { setRoleName(v); setRoleError(null); }}
            roleDescription={roleDescription}
            onRoleDescriptionChange={setRoleDescription}
            roleActive={roleActive}
            onRoleActiveChange={setRoleActive}
            nameError={roleError === "name-required" || roleError === "duplicate" ? roleError : null}
          />
        </div>
        <div className="lg:col-span-3 rounded-card p-5 mk-surface">
          <RolePermissionsTree
            ar={ar}
            pages={permissions}
            selectedPermissions={selectedPermissions}
            onTogglePermission={togglePermission}
            onTogglePage={togglePagePermissions}
            showNoPermissionsError={roleError === "no-permissions"}
          />
        </div>
      </div>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title={T("Delete this role?", "حذف هذا الدور؟", ar)} variant="centered" size="sm">
        <div className="p-5">
          <p className="mk-body-sm text-mk-ink-600 mb-5">
            {T("This can't be undone. Staff currently assigned this role will keep it until reassigned.", "الإجراء ده مينفعش يترجع. الموظفين المُسندلهم الدور ده هيفضل معاهم لحد ما يتغير.", ar)}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setConfirmDelete(false)} className="flex-1 justify-center">{T("Cancel", "إلغاء", ar)}</Button>
            <Button variant="danger" onClick={handleDelete} className="flex-1 justify-center">
              {T("Delete role", "حذف الدور", ar)}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
