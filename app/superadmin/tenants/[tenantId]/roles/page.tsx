"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAdmin } from "@/contexts/AdminContext";
import { adminTenantService } from "@/lib/api-services";
import { Badge, Table, Th, Td, useToast } from "@/components/ui";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

function displayRole(name?: string, description?: string) {
  if (description) return description;
  if (!name) return "—";
  return name.replace(/_\d+$/, "").replace(/_/g, " ");
}

interface TenantRole {
  id: number;
  name?: string;
  description?: string;
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

      <div className="rounded-xl overflow-x-auto mk-surface">
        <Table>
          <thead>
            <tr>
              {[
                T("Name", "الاسم", ar),
                T("Description", "الوصف", ar),
              ].map((h, i) => (
                <Th key={i}>{h}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <Td colSpan={2} className="text-center py-12 text-mk-ink-400">
                  <Loader2 size={32} className="animate-spin mx-auto mb-3" />
                  {T("Loading...", "جاري التحميل...", ar)}
                </Td>
              </tr>
            ) : roles.length === 0 ? (
              <tr>
                <Td colSpan={2} className="text-center py-12 text-mk-ink-400">
                  {T("No roles found.", "لم يتم العثور على أدوار.", ar)}
                </Td>
              </tr>
            ) : (
              roles.map((role) => (
                <tr key={role.id} className="hover:bg-mk-ink-50 transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)]">
                  <Td>
                    <Badge variant="info">{displayRole(role.name)}</Badge>
                  </Td>
                  <Td className="mk-body text-mk-ink-700">{role.description || displayRole(role.name)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
