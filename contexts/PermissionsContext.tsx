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
  hasPermission: () => false,
  hasAnyPermission: () => false,
  hasAllPermissions: () => false,
  reload: async () => {},
});

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [tenantContext, setTenantContext] = useState<TenantContextData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    if (isLoggedIn) {
      load();
    } else {
      setPermissions([]);
      setTenantContext(null);
      setIsLoading(false);
      setError(null);
    }
  }, [isLoggedIn]);

  const value = useMemo(() => ({
    permissions,
    tenantContext,
    isLoading,
    error,
    hasPermission: (requirement: PermissionRequirement) => checkPermission(permissions, requirement),
    hasAnyPermission: (...requirements: PermissionRequirement[]) =>
      requirements.some((r) => checkPermission(permissions, r)),
    hasAllPermissions: (...requirements: PermissionRequirement[]) =>
      requirements.every((r) => checkPermission(permissions, r)),
    reload: load,
  }), [permissions, tenantContext, isLoading, error]);

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
