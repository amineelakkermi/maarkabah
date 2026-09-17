"use client";

import { useState } from "react";
import {
  ChevronDown, CalendarCheck, ShieldCheck, RefreshCcw, Users, Car,
  Wallet, Undo2, BarChart3, UserCog, CreditCard, ScrollText, Shield,
  LayoutDashboard, Settings, LayoutGrid, type LucideIcon,
} from "lucide-react";
import { Input, Toggle, Badge, Checkbox } from "@/components/ui";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

// Shape of one permission group as returned by GET /api/tenant/roles/get-permissions.
export interface PermissionPage {
  page: string;
  permissionItems: { value: string; label: string }[];
}

// One glyph + tint per top-level module — lets the tree be scanned by shape
// and color ("the blue calendar row") instead of reading every label, and
// gives each module a stable visual identity. Module names come from the
// roles API, so the lookup is matched case-insensitively and falls back to a
// rotating tint palette for modules we don't have a dedicated icon for.
const MODULE_ICONS: Record<string, { Icon: LucideIcon; tint: string }> = {
  bookings: { Icon: CalendarCheck, tint: "bg-mk-blue-100 text-mk-blue-700" },
  booking: { Icon: CalendarCheck, tint: "bg-mk-blue-100 text-mk-blue-700" },
  dashboard: { Icon: LayoutDashboard, tint: "bg-mk-blue-100 text-mk-blue-700" },
  contracts: { Icon: ScrollText, tint: "bg-mk-blue-100 text-mk-blue-700" },
  contract: { Icon: ScrollText, tint: "bg-mk-blue-100 text-mk-blue-700" },
  kyc: { Icon: ShieldCheck, tint: "bg-mk-violet-100 text-mk-violet-700" },
  returns: { Icon: RefreshCcw, tint: "bg-mk-success-100 text-mk-success-700" },
  customers: { Icon: Users, tint: "bg-mk-blue-100 text-mk-blue-700" },
  customer: { Icon: Users, tint: "bg-mk-blue-100 text-mk-blue-700" },
  fleet: { Icon: Car, tint: "bg-mk-warning-100 text-mk-warning-700" },
  vehicles: { Icon: Car, tint: "bg-mk-warning-100 text-mk-warning-700" },
  finance: { Icon: Wallet, tint: "bg-mk-success-100 text-mk-success-700" },
  refunds: { Icon: Undo2, tint: "bg-mk-warning-100 text-mk-warning-700" },
  reports: { Icon: BarChart3, tint: "bg-mk-violet-100 text-mk-violet-700" },
  staff: { Icon: UserCog, tint: "bg-mk-danger-100 text-mk-danger-700" },
  users: { Icon: UserCog, tint: "bg-mk-danger-100 text-mk-danger-700" },
  roles: { Icon: Shield, tint: "bg-mk-danger-100 text-mk-danger-700" },
  billing: { Icon: CreditCard, tint: "bg-mk-blue-100 text-mk-blue-700" },
  settings: { Icon: Settings, tint: "bg-mk-ink-100 text-mk-ink-600" },
};

const FALLBACK_TINTS = [
  "bg-mk-blue-100 text-mk-blue-700",
  "bg-mk-violet-100 text-mk-violet-700",
  "bg-mk-success-100 text-mk-success-700",
  "bg-mk-warning-100 text-mk-warning-700",
  "bg-mk-danger-100 text-mk-danger-700",
];

function moduleVisual(page: string, index: number): { Icon: LucideIcon; tint: string } {
  const key = page.trim().toLowerCase();
  const hit =
    MODULE_ICONS[key] ??
    Object.entries(MODULE_ICONS).find(([k]) => key.includes(k))?.[1];
  return hit ?? { Icon: LayoutGrid, tint: FALLBACK_TINTS[index % FALLBACK_TINTS.length] };
}

interface RoleDetailsFieldsProps {
  ar: boolean;
  roleName: string;
  onRoleNameChange: (v: string) => void;
  roleDescription: string;
  onRoleDescriptionChange: (v: string) => void;
  roleActive: boolean;
  /** The roles API (CreateOrUpdateRoleDto) has no isActive field, so the
   * toggle updates local UI state only — it isn't persisted on save. */
  onRoleActiveChange?: (v: boolean) => void;
  nameError?: "name-required" | "duplicate" | null;
  /** Locks every field. */
  disabled?: boolean;
}

/** Left-column identity fields for "Add role" / "Edit role" — name,
 * description, and the active/inactive state (shown both as a status badge
 * and as the toggle that controls it, so the current state reads at a
 * glance before you even touch the control). */
export function RoleDetailsFields({
  ar, roleName, onRoleNameChange, roleDescription, onRoleDescriptionChange,
  roleActive, onRoleActiveChange, nameError, disabled = false,
}: RoleDetailsFieldsProps) {
  return (
    <div className="flex flex-col gap-4">
      <Input
        variant="muted"
        label={<>{T("Role name", "اسم الدور", ar)} <span className="text-mk-danger">*</span></>}
        placeholder={T("e.g. Maintenance Coordinator", "مثال: منسق الصيانة", ar)}
        value={roleName}
        onChange={(e) => onRoleNameChange(e.target.value)}
        disabled={disabled}
      />
      {nameError === "name-required" && (
        <p className="mk-caption text-mk-danger">{T("Role name is required.", "اسم الدور مطلوب.", ar)}</p>
      )}
      {nameError === "duplicate" && (
        <p className="mk-caption text-mk-danger">{T("A role with this name already exists.", "يوجد دور بنفس هذا الاسم بالفعل.", ar)}</p>
      )}

      <Input
        variant="muted"
        label={T("Role description", "وصف الدور", ar)}
        placeholder={T("What this role is for, at a glance", "وصف مختصر لمهمة هذا الدور", ar)}
        value={roleDescription}
        onChange={(e) => onRoleDescriptionChange(e.target.value)}
        disabled={disabled}
      />

      <div className="flex flex-col gap-1.5 pt-1">
        <span className="mk-label-muted mk-field-label">{T("Status", "الحالة", ar)}</span>
        <div className="flex items-center justify-between gap-3">
          <Badge variant={roleActive ? "success" : "neutral"} dot>
            {roleActive ? T("Active", "مفعّل", ar) : T("Inactive", "غير مفعّل", ar)}
          </Badge>
          <Toggle checked={roleActive} onChange={onRoleActiveChange} disabled={disabled || !onRoleActiveChange} />
        </div>
      </div>
    </div>
  );
}

interface RolePermissionsTreeProps {
  ar: boolean;
  pages: PermissionPage[];
  selectedPermissions: string[];
  onTogglePermission: (value: string) => void;
  onTogglePage: (items: { value: string; label: string }[]) => void;
  showNoPermissionsError?: boolean;
}

/** Right-column module-level access-permissions tree — shared between "Add
 * role" and "Edit role" so the two screens can't drift apart visually.
 *
 * The prototype uses per-module access levels (Full Control / Limited / …);
 * the roles API grants permissions as a flat list of values instead, so each
 * row carries a checkbox: the module row toggles all of its items at once
 * (dash = partially granted), and expanding a module — via the chevron, or
 * automatically while its selection is partial, mirroring the prototype's
 * "Limited reveals the item list" rule — reveals one row per item. */
export function RolePermissionsTree({
  ar, pages, selectedPermissions, onTogglePermission, onTogglePage, showNoPermissionsError,
}: RolePermissionsTreeProps) {
  // Modules the user explicitly expanded/collapsed; untouched modules
  // auto-expand only while they carry a partial selection.
  const [openPages, setOpenPages] = useState<Record<string, boolean>>({});

  const isPageFullySelected = (items: { value: string }[]) =>
    items.length > 0 && items.every((p) => selectedPermissions.includes(p.value));
  const isPagePartiallySelected = (items: { value: string }[]) => {
    const count = items.filter((p) => selectedPermissions.includes(p.value)).length;
    return count > 0 && count < items.length;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="mk-h4 text-mk-ink-900">
          {T("Access Permissions", "صلاحيات الوصول", ar)} <span className="text-mk-danger">*</span>
        </div>
        <p className="mk-caption text-mk-ink-500 -mt-1">
          {T(
            "Check a module to grant it in full, or expand it to set each item individually.",
            "حدد الموديول لمنحه بالكامل، أو وسّعه لتظبط كل عنصر فيه لوحده.",
            ar
          )}
        </p>
      </div>
      <div className="rounded-card overflow-hidden border border-mk-ink-100">
        {pages.map((page, index) => {
          const items = page.permissionItems || [];
          const open = openPages[page.page] ?? isPagePartiallySelected(items);
          const mod = moduleVisual(String(page.page ?? ""), index);
          const rows = [
            <div
              key={`mod-${page.page}`}
              className={`flex items-center gap-3 px-5 py-3 border-b border-mk-ink-100 last:border-b-0 ${open ? "bg-mk-ink-50" : "bg-transparent"}`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span aria-hidden className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${mod.tint}`}>
                  <mod.Icon size={14} />
                </span>
                <span className="mk-label truncate text-mk-ink-900">{page.page}</span>
              </div>
              <button
                type="button"
                onClick={() => setOpenPages((prev) => ({ ...prev, [page.page]: !open }))}
                aria-label={T("Expand module", "توسيع الموديول", ar)}
                aria-expanded={open}
                className="shrink-0 text-mk-ink-400 hover:text-mk-ink-600 transition-colors duration-[var(--duration-fast)]"
              >
                <ChevronDown
                  size={15}
                  className={`transition-transform duration-[var(--duration-fast)] ${open ? "" : ar ? "rotate-90" : "-rotate-90"}`}
                />
              </button>
              <Checkbox
                checked={isPageFullySelected(items)}
                indeterminate={isPagePartiallySelected(items)}
                onChange={() => onTogglePage(items)}
                aria-label={`${page.page} — ${T("toggle all", "تحديد الكل", ar)}`}
              />
            </div>,
          ];
          if (open) {
            items.forEach((perm) => {
              rows.push(
                <div
                  key={`perm-${perm.value}`}
                  className="flex items-center gap-3 px-5 py-3 border-b border-mk-ink-100 last:border-b-0 bg-mk-ink-50"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0 ps-7">
                    <span aria-hidden className="w-1 h-1 rounded-full shrink-0 bg-mk-ink-300" />
                    <span className="mk-label truncate text-mk-ink-700">{perm.label}</span>
                  </div>
                  <Checkbox
                    checked={selectedPermissions.includes(perm.value)}
                    onChange={() => onTogglePermission(perm.value)}
                    aria-label={perm.label}
                  />
                </div>
              );
            });
          }
          return rows;
        })}
      </div>
      {showNoPermissionsError && (
        <p className="mk-caption text-mk-danger">{T("Select at least one permission.", "اختر صلاحية واحدة على الأقل.", ar)}</p>
      )}
    </div>
  );
}
