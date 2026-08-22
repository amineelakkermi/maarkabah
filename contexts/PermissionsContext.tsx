"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { tenantContextService } from "@/lib/api-services";
import { useAuth } from "./AuthContext";
import { checkPermission, type PermissionRequirement } from "@/lib/permissions";

interface TenantContextData {
  tenantId?: number;
  name?: string;
  subdomain?: string;
  settings?: Record<string, any>;
  branding?: Record<string, any>;
  features?: Array<{ featureCode: string; isEnabled: boolean }>;
  workflows?: Record<string, any>;
}

interface PermissionsContextValue {
  permissions: string[];
  tenantContext: TenantContextData | null;
  isLoading: boolean;
  error: string | null;
  isSuperAdmin: boolean;
  hasPermission: (requirement: PermissionRequirement) => boolean;
  hasAnyPermission: (...requirements: PermissionRequirement[]) => boolean;
  hasAllPermissions: (...requirements: PermissionRequirement[]) => boolean;
  reload: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextValue>({
  permissions: [],
  tenantContext: null,
  isLoading: true,
  error: null,
  isSuperAdmin: false,
  hasPermission: () => false,
  hasAnyPermission: () => false,
  hasAllPermissions: () => false,
  reload: async () => {},
});

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn, decodedToken } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [tenantContext, setTenantContext] = useState<TenantContextData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // SuperAdmins have no tenant claim and should bypass permission checks entirely.
  const isSuperAdmin = useMemo(
    () => !!(decodedToken && !(decodedToken.tenant_id ?? decodedToken.tenantId)),
    [decodedToken]
  );

  const load = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await tenantContextService.getContext();
      setTenantContext(data ?? null);
      setPermissions(Array.isArray(data?.permissions) ? data.permissions : []);
    } catch (err) {
      console.error("Failed to load tenant context / permissions:", err);
      setError(err instanceof Error ? err.message : "Failed to load permissions");
      setPermissions([]);
      setTenantContext(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      setPermissions([]);
      setTenantContext(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // SuperAdmins have no tenant, so /api/tenant/context does not apply.
    // They bypass permission checks entirely.
    if (isSuperAdmin) {
      setPermissions([]);
      setTenantContext(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    load();
  }, [isLoggedIn, isSuperAdmin]);

  const value = useMemo(() => {
    const hasPermission = (requirement: PermissionRequirement) =>
      isSuperAdmin || checkPermission(permissions, requirement);

    return {
      permissions,
      tenantContext,
      isLoading,
      error,
      isSuperAdmin,
      hasPermission,
      hasAnyPermission: (...requirements: PermissionRequirement[]) =>
        requirements.some((r) => hasPermission(r)),
      hasAllPermissions: (...requirements: PermissionRequirement[]) =>
        requirements.every((r) => hasPermission(r)),
      reload: load,
    };
  }, [permissions, tenantContext, isLoading, error, isSuperAdmin]);

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
