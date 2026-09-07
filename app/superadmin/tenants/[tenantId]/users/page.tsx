"use client";

import { useParams } from "next/navigation";
import { SuperAdminStaffRolesPanel } from "@/components/superadmin/SuperAdminStaffRolesPanel";

export default function SuperAdminTenantUsersPage() {
  const { tenantId: tenantIdParam } = useParams<{ tenantId: string }>();
  const tenantId = Number(tenantIdParam);

  if (!tenantId) return null;

  return <SuperAdminStaffRolesPanel tenantId={tenantId} />;
}
