"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { tenantContextService, tenantSettingsService } from "@/lib/api-services";
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
  integrations?: {
    tajeerFeatureEnabled?: boolean;
    tajeerConfigured?: boolean;
    tajeerVerified?: boolean;
    tajeerEnabled?: boolean;
  };
}

interface PermissionsContextValue {
  permissions: string[];
  tenantContext: TenantContextData | null;
  /** Tenant system settings — when true, new records skip the KYC queue
   * entirely, so review-queue links should be hidden. */
  autoApproveCustomers: boolean;
  autoApproveDrivers: boolean;
  /** ElmTajeer license AND verified credentials — gates all Tajeer UI. */
  tajeerEnabled: boolean;
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
  autoApproveCustomers: false,
  autoApproveDrivers: false,
  tajeerEnabled: false,
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
  const [autoApproveCustomers, setAutoApproveCustomers] = useState(false);
  const [autoApproveDrivers, setAutoApproveDrivers] = useState(false);
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
      const perms = Array.isArray(data?.permissions) ? data.permissions : [];
      setPermissions(perms);

      // Auto-approve flags: prefer the tenant-context settings blob; fall
      // back to GET /tenant/settings. The settings endpoint requires
      // Settings.View, so employees without it get a 403 — swallowed, flags
      // stay false and the KYC links remain visible (safe default).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sys: any = data?.settings?.system ?? data?.settings ?? data?.system ?? null;
      let ac = sys?.autoApproveCustomers;
      let ad = sys?.autoApproveDrivers;
      if (ac == null || ad == null) {
        try {
          const res = await tenantSettingsService.getSettings();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const s: any = res?.data?.system ?? res?.system ?? res?.data ?? res ?? {};
          ac = ac ?? s.autoApproveCustomers;
          ad = ad ?? s.autoApproveDrivers;
        } catch {
          // Non-fatal: defaults keep the KYC links visible.
        }
      }
      setAutoApproveCustomers(Boolean(ac));
      setAutoApproveDrivers(Boolean(ad));
    } catch (err) {
      console.error("Failed to load tenant context / permissions:", err);
      setError(err instanceof Error ? err.message : "Failed to load permissions");
      setPermissions([]);
      setTenantContext(null);
      setAutoApproveCustomers(false);
      setAutoApproveDrivers(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      setPermissions([]);
      setTenantContext(null);
      setAutoApproveCustomers(false);
      setAutoApproveDrivers(false);
      setIsLoading(false);
      setError(null);
      return;
    }

    // SuperAdmins have no tenant, so /api/tenant/context does not apply.
    // They bypass permission checks entirely.
    if (isSuperAdmin) {
      setPermissions([]);
      setTenantContext(null);
      setAutoApproveCustomers(false);
      setAutoApproveDrivers(false);
      setIsLoading(false);
      setError(null);
      return;
    }

    load();
  }, [isLoggedIn, isSuperAdmin]);

  const value = useMemo(() => {
    const hasPermission = (requirement: PermissionRequirement) =>
      isSuperAdmin || checkPermission(permissions, requirement);

    // Tajeer issuance needs BOTH the ElmTajeer license AND verified
    // credentials (integrations.tajeerVerified = IsActive). When the
    // backend sends the composite flag we trust it; otherwise we combine
    // license + verification. No integrations block → license only
    // (matches the previous features-only behaviour).
    const integrations = tenantContext?.integrations;
    const elmTajeerLicensed = !tenantContext?.features?.some(
      (f) => f.featureCode === "ElmTajeer" && f.isEnabled === false
    );
    const tajeerEnabled =
      integrations?.tajeerEnabled ??
      (elmTajeerLicensed && (integrations?.tajeerVerified ?? elmTajeerLicensed));

    return {
      permissions,
      tenantContext,
      autoApproveCustomers,
      autoApproveDrivers,
      tajeerEnabled,
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
  }, [permissions, tenantContext, autoApproveCustomers, autoApproveDrivers, isLoading, error, isSuperAdmin]);

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
