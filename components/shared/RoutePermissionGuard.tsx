"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { usePermissions } from "@/contexts/PermissionsContext";
import { getRoutePermissionRule } from "@/lib/route-permissions";
import { UnauthorizedView } from "./UnauthorizedView";

interface RoutePermissionGuardProps {
  children: ReactNode;
}

export function RoutePermissionGuard({ children }: RoutePermissionGuardProps) {
  const pathname = usePathname();
  const { isLoading, hasPermission, isSuperAdmin } = usePermissions();

  const routeRule = pathname !== null ? getRoutePermissionRule(pathname) : undefined;

  const homeHref = pathname?.startsWith("/employee") ? "/employee/today" : "/dashboard";

  if (isLoading || pathname === null) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-mk-blue-500" size={32} />
      </div>
    );
  }

  // SuperAdmins bypass the route map entirely because they own the whole system.
  if (isSuperAdmin) {
    return children;
  }

  // Route is not explicitly listed in the permission map → deny by default.
  if (routeRule === undefined) {
    return <UnauthorizedView homeHref={homeHref} />;
  }

  // Some routes are reserved for SuperAdmins only.
  if (routeRule.requiresSuperAdmin) {
    return <UnauthorizedView homeHref={homeHref} />;
  }

  // `null` means "visible to any authenticated tenant user".
  if (routeRule.permission !== null && !hasPermission(routeRule.permission)) {
    return <UnauthorizedView homeHref={homeHref} />;
  }

  return children;
}
