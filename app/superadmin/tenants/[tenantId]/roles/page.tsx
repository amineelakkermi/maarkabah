"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Shield } from "lucide-react";
import { useAdmin } from "@/contexts/AdminContext";
import { adminTenantService } from "@/lib/api-services";
import { Table, Th, Td, useToast } from "@/components/ui";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

interface TenantRole {
  id: number;
  name?: string;
  description?: string;
  permissions?: string[];
}

export default function SuperAdminTenantRolesPage() {
  const { tenantId: tenantIdParam } = useParams<{ tenantId: string }>();
  const tenantId = Number(tenantIdParam);
  const { dir } = useAdmin();
  const { showToast } = useToast();
  const ar = dir === "rtl";

  const [roles, setRoles] = useState<TenantRole[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadRoles() {
    if (!tenantId) return;
    setLoading(true);
    try {
      const response = await adminTenantService.getRoles(tenantId, 1, 100);
      const raw = response?.items ?? response?.data?.items ?? response?.data ?? response ?? [];
      const list = Array.isArray(raw) ? raw : [];
      setRoles(list);
    } catch (err) {
      showToast(err instanceof Error ? err.message : T("Failed to load roles.", "فشل تحميل الأدوار.", ar));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRoles();
  }, [tenantId]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <div className="mk-h4 text-mk-ink-900">
            {T("Tenant roles", "أدوار المستأجر", ar)} #{tenantId}
          </div>
          <div className="mk-label text-mk-ink-500 mt-1">
            {T("Roles defined for this tenant.", "الأدوار المعرفة لهذا المستأجر.", ar)}
          </div>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden mk-surface">
        <Table>
          <thead>
            <tr>
              {[
                T("Name", "الاسم", ar),
                T("Description", "الوصف", ar),
                T("Permissions", "الصلاحيات", ar),
              ].map((h, i) => (
                <Th key={i}>{h}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <Td colSpan={3} className="text-center py-12 text-mk-ink-400">
                  <Loader2 size={32} className="animate-spin mx-auto mb-3" />
                  {T("Loading...", "جاري التحميل...", ar)}
                </Td>
              </tr>
            ) : roles.length === 0 ? (
              <tr>
                <Td colSpan={3} className="text-center py-12 text-mk-ink-400">
                  {T("No roles found.", "لم يتم العثور على أدوار.", ar)}
                </Td>
              </tr>
            ) : (
              roles.map((role) => (
                <tr key={role.id} className="hover:bg-mk-ink-50 transition-colors">
                  <Td className="mk-label text-mk-ink-900">{role.name ?? "—"}</Td>
                  <Td>{role.description ?? "—"}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {(role.permissions ?? []).slice(0, 5).map((p) => (
                        <span
                          key={p}
                          className="px-2 py-0.5 rounded-full bg-mk-blue-50 text-mk-blue-600 mk-caption text-[11px]"
                        >
                          {p}
                        </span>
                      ))}
                      {(role.permissions?.length ?? 0) > 5 && (
                        <span className="px-2 py-0.5 rounded-full bg-mk-ink-100 text-mk-ink-500 mk-caption text-[11px]">
                          +{role.permissions!.length - 5}
                        </span>
                      )}
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
