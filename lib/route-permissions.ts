import { Permission, type PermissionRequirement } from "./permissions";

export interface RoutePermissionRule {
  /** Route pattern, e.g. "/customers/:id" or "/staff". */
  pattern: string;
  /**
   * Permission required to access this route.
   * - `null` means any authenticated user under this layout can access it.
   * - `undefined` is treated the same as missing (deny by default).
   */
  permission: PermissionRequirement;
}

/**
 * Maps application routes to the permission required to view them.
 *
 * Only routes listed here are reachable inside the admin / employee layouts.
 * Everything else is denied by default.
 *
 * Order matters: put exact routes before dynamic ones (e.g. /customers/inquiry
 * must appear before /customers/:id).
 */
export const ROUTE_PERMISSIONS: RoutePermissionRule[] = [
  // ─── Admin / Owner portal ─────────────────────────────────────────────
  { pattern: "/dashboard", permission: null },
  { pattern: "/fleet", permission: Permission.Vehicles.View },

  { pattern: "/customers", permission: Permission.Customers.View },
  { pattern: "/customers/inquiry", permission: Permission.CustomerWarehouse.View },
  { pattern: "/customers/:id", permission: Permission.Customers.View },

  { pattern: "/drivers", permission: Permission.Drivers.View },
  { pattern: "/drivers/:id", permission: Permission.Drivers.View },

  { pattern: "/kyc-queue", permission: Permission.Customers.View },
  { pattern: "/drivers-kyc-queue", permission: Permission.Drivers.View },

  { pattern: "/blacklist", permission: Permission.Blacklist.View },
  { pattern: "/pricing", permission: Permission.AdditionalServices.View },

  { pattern: "/branches", permission: Permission.Branches.View },
  { pattern: "/roles", permission: Permission.Roles.View },
  { pattern: "/staff", permission: Permission.Users.View },

  { pattern: "/admin/customer-warehouse", permission: "superadmin" },

  // ─── Employee portal ────────────────────────────────────────────────
  { pattern: "/employee", permission: null },
  { pattern: "/employee/today", permission: null },
  { pattern: "/employee/new-contract", permission: null },
  { pattern: "/employee/contracts", permission: null },
  { pattern: "/employee/contracts/:id", permission: null },
  { pattern: "/employee/pickup", permission: null },
  { pattern: "/employee/return", permission: null },

  { pattern: "/employee/drivers", permission: Permission.Drivers.View },
  { pattern: "/employee/drivers/:id", permission: Permission.Drivers.View },
  { pattern: "/employee/cars", permission: Permission.Vehicles.View },

  { pattern: "/employee/customer", permission: Permission.Customers.View },
  { pattern: "/employee/customer/inquiry", permission: Permission.CustomerWarehouse.View },
  { pattern: "/employee/customer/:id", permission: Permission.Customers.View },
];

function segmentToRegex(segment: string): string {
  if (segment.startsWith(":")) {
    // Match a single path segment (anything except a slash).
    return "[^/]+";
  }
  // Escape special regex characters in literal segments.
  return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function patternToRegex(pattern: string): RegExp {
  const segments = pattern.split("/").filter(Boolean);
  const regexSource = segments.map(segmentToRegex).join("\\/");
  return new RegExp(`^/${regexSource}$`);
}

/**
 * Returns the permission requirement for a given pathname, or `undefined`
 * if the route is not explicitly mapped.
 */
export function getRequiredPermissionForPathname(
  pathname: string
): PermissionRequirement | undefined {
  for (const rule of ROUTE_PERMISSIONS) {
    const regex = patternToRegex(rule.pattern);
    if (regex.test(pathname)) {
      return rule.permission;
    }
  }
  return undefined;
}
