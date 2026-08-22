/**
 * Permission constants and helpers.
 *
 * Source of truth: backend catalog returned by GET /api/tenant/roles/get-permissions
 * and the "permissions" array returned by GET /api/tenant/context.
 */

export const Permission = {
  Tenants: {
    View: "Permissions.Tenants.View",
    Create: "Permissions.Tenants.Create",
    Edit: "Permissions.Tenants.Edit",
    Delete: "Permissions.Tenants.Delete",
  },
  Users: {
    View: "Permissions.Users.View",
    Create: "Permissions.Users.Create",
    Edit: "Permissions.Users.Edit",
    Delete: "Permissions.Users.Delete",
  },
  Roles: {
    View: "Permissions.Roles.View",
    Create: "Permissions.Roles.Create",
    Edit: "Permissions.Roles.Edit",
    Delete: "Permissions.Roles.Delete",
    ViewPermissions: "Permissions.Roles.ViewPermissions",
  },
  Settings: {
    View: "Permissions.Settings.View",
    Edit: "Permissions.Settings.Edit",
  },
  Branches: {
    View: "Permissions.Branches.View",
    Create: "Permissions.Branches.Create",
    Edit: "Permissions.Branches.Edit",
    Delete: "Permissions.Branches.Delete",
  },
  Vehicles: {
    View: "Permissions.Vehicles.View",
    Save: "Permissions.Vehicles.Save",
    Delete: "Permissions.Vehicles.Delete",
  },
  VehicleCatalogs: {
    View: "Permissions.VehicleCatalogs.View",
    Create: "Permissions.VehicleCatalogs.Create",
    Edit: "Permissions.VehicleCatalogs.Edit",
    Delete: "Permissions.VehicleCatalogs.Delete",
  },
  Customers: {
    View: "Permissions.Customers.View",
    Create: "Permissions.Customers.Create",
    Edit: "Permissions.Customers.Edit",
    Delete: "Permissions.Customers.Delete",
  },
  Drivers: {
    View: "Permissions.Drivers.View",
    Create: "Permissions.Drivers.Create",
    Edit: "Permissions.Drivers.Edit",
    Delete: "Permissions.Drivers.Delete",
  },
  Countries: {
    View: "Permissions.Countries.View",
    Create: "Permissions.Countries.Create",
    Edit: "Permissions.Countries.Edit",
    Delete: "Permissions.Countries.Delete",
  },
  CustomerWarehouse: {
    View: "Permissions.CustomerWarehouse.View",
    Import: "Permissions.CustomerWarehouse.Import",
  },
  Blacklist: {
    View: "Permissions.Blacklist.View",
    Report: "Permissions.Blacklist.Report",
  },
  AdditionalServices: {
    View: "Permissions.AdditionalServices.View",
    Create: "Permissions.AdditionalServices.Create",
    Edit: "Permissions.AdditionalServices.Edit",
    Delete: "Permissions.AdditionalServices.Delete",
  },
} as const;

type NestedValues<T> = T extends readonly (infer U)[]
  ? NestedValues<U>
  : T extends object
  ? NestedValues<T[keyof T]>
  : T;

export type PermissionString = NestedValues<typeof Permission>;

export type PermissionRequirement =
  | PermissionString
  | "superadmin"
  | null
  | { any: PermissionRequirement[] }
  | { all: PermissionRequirement[] };

function checkReq(
  permissions: string[] | null | undefined,
  requirement: PermissionRequirement
): boolean {
  if (requirement === null) return true;
  if (typeof requirement === "string") {
    return (permissions ?? []).includes(requirement);
  }
  if ("any" in requirement) {
    return requirement.any.some((r) => checkReq(permissions, r));
  }
  return requirement.all.every((r) => checkReq(permissions, r));
}

export function hasPermission(
  permissions: string[] | null | undefined,
  permission: PermissionString | null
): boolean {
  return checkReq(permissions, permission);
}

export function hasAnyPermission(
  permissions: string[] | null | undefined,
  ...required: PermissionString[]
): boolean {
  return required.some((r) => checkReq(permissions, r));
}

export function hasAllPermissions(
  permissions: string[] | null | undefined,
  ...required: PermissionString[]
): boolean {
  return required.every((r) => checkReq(permissions, r));
}

export function checkPermission(
  permissions: string[] | null | undefined,
  requirement: PermissionRequirement
): boolean {
  return checkReq(permissions, requirement);
}
