"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button, useToast } from "@/components/ui";
import { RoleDetailsFields, RolePermissionsTree, type PermissionPage } from "@/components/admin/RoleForm";
import { useAdmin } from "@/contexts/AdminContext";
import { tenantRoleService } from "@/lib/api-services";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

/** Full-page "Add role" screen — a dedicated route rather than a drawer, so
 * building out a role's permission tree isn't fighting a fixed-width panel. */
export default function NewRolePage() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const router = useRouter();
  const { showToast } = useToast();

  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [roleActive, setRoleActive] = useState(true);
  const [permissions, setPermissions] = useState<PermissionPage[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [existingNames, setExistingNames] = useState<string[]>([]);
  const [roleError, setRoleError] = useState<"name-required" | "duplicate" | null>(null);
  const [saving, setSaving] = useState(false);

  const hasAnyGrantedPermission = selectedPermissions.length > 0;

  useEffect(() => {
    tenantRoleService.getPermissions()
      .then(setPermissions)
      .catch((error) => console.error("Error loading permissions:", error));
    // Loaded only for the client-side duplicate-name pre-check — the API
    // still stays the source of truth (409 fallback below).
    tenantRoleService.search({})
      .then((res) => setExistingNames((res.items || res.data || []).map((r: { name?: string }) => r.name || "")))
      .catch(() => {});
  }, []);

  const togglePermission = (permissionValue: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionValue)
        ? prev.filter(p => p !== permissionValue)
        : [...prev, permissionValue]
    );
  };

  const togglePagePermissions = (pagePermissions: { value: string }[]) => {
    const allValues = pagePermissions.map(p => p.value);
    const allSelected = allValues.every(v => selectedPermissions.includes(v));
    setSelectedPermissions(prev =>
      allSelected
        ? prev.filter(p => !allValues.includes(p))
        : [...new Set([...prev, ...allValues])]
    );
  };

  async function handleCreate() {
    if (!roleName) {
      setRoleError("name-required");
      showToast(T("Please fill all mandatory fields", "الرجاء تعبئة الحقول الإلزامية", ar));
      return;
    }

    const normalizedName = roleName.trim().toLocaleLowerCase();
    if (existingNames.some((n) => n.trim().toLocaleLowerCase() === normalizedName)) {
      setRoleError("duplicate");
      showToast(T("Role already exists", "الدور موجود بالفعل", ar));
      return;
    }

    try {
      setSaving(true);
      await tenantRoleService.create({
        name: roleName.trim(),
        description: roleDescription.trim(),
        permissions: selectedPermissions,
      });
      showToast(T("🟢 Role created successfully!", "🟢 تم إضافة الدور الجديد بنجاح!", ar));
      router.push("/settings?tab=roles");
    } catch (error) {
      console.error("Error creating role:", error);
      setSaving(false);

      const err = error as {
        status?: number;
        message?: string;
        response?: { code?: string; message?: string; title?: string; error?: string; errors?: Record<string, unknown> };
      };
      const response = err?.response;
      const errorText = [
        response?.code,
        response?.message,
        response?.title,
        response?.error,
        ...(response?.errors ? Object.values(response.errors).flat() : []),
        err?.message,
      ].filter(Boolean).join(" ");

      const isDuplicate =
        err?.status === 409 ||
        /already exists|duplicate|name exists|role.*exists|موجود بالفعل|مكرر/i.test(errorText);

      if (isDuplicate) setRoleError("duplicate");
      showToast(
        isDuplicate
          ? T("Role already exists", "الدور موجود بالفعل", ar)
          : errorText || T("Failed to create role", "فشل إنشاء الدور", ar)
      );
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Back nav */}
      <div className="flex items-center gap-3">
        <Link href="/settings?tab=roles" className="w-9 h-9 rounded-full flex items-center justify-center bg-white shadow-[var(--shadow-card)] text-mk-ink-600 no-underline hover:bg-mk-ink-50 transition-colors">
          {ar ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Link>
        <span className="mk-body-sm text-mk-ink-500">{T("Back to Roles & Permissions", "العودة للأدوار والصلاحيات", ar)}</span>
      </div>

      {/* Page header — title + Save/Cancel, same placement as every other
          create/edit header in the app (Settings → Office Profile, staff
          detail edit mode): title first, actions second, so actions land on
          the header's leading-left in RTL. */}
      <div className="flex items-start justify-between gap-4 px-6 py-5 rounded-card mk-surface">
        <div>
          <div className="mk-h4 text-mk-ink-900">{T("Add role", "إضافة دور", ar)}</div>
          <p className="mk-caption text-mk-ink-500 mt-1">{T("Define a custom role and its access level per module.", "عرّف دور مخصص وصلاحيته في كل موديول.", ar)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/settings?tab=roles">
            <Button variant="outline" size="sm">{T("Cancel", "إلغاء", ar)}</Button>
          </Link>
          <Button variant="primary" size="sm" disabled={saving || !roleName.trim() || !hasAnyGrantedPermission} onClick={handleCreate}>
            {T("Add role", "إضافة دور", ar)}
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
            nameError={roleError}
          />
        </div>
        <div className="lg:col-span-3 rounded-card p-5 mk-surface">
          <RolePermissionsTree
            ar={ar}
            pages={permissions}
            selectedPermissions={selectedPermissions}
            onTogglePermission={togglePermission}
            onTogglePage={togglePagePermissions}
          />
        </div>
      </div>
    </div>
  );
}
