/**
 * Temporary development flags.
 *
 * These flags exist only to unblock UI development while the backend APIs
 * (and their matching permissions) are not yet available. They must be
 * removed as soon as the real permissions are shipped.
 *
 * How to use:
 *   NEXT_PUBLIC_DEV_BYPASS_ROUTE_PERMISSIONS=true
 *
 * What it does:
 *   Allows any authenticated tenant user to access routes that would normally
 *   require a specific permission. This is useful for developing and
 *   validating pages such as /employee/contracts before the backend
 *   provides the `contracts` permission.
 *
 * Reversal:
 *   Unset the environment variable (or set it to anything other than
 *   "true") and delete this file. Routes will then fall back to the normal
 *   permission rules defined in lib/route-permissions.ts.
 */

const BYPASS_ROUTE_PERMISSIONS =
  process.env.NEXT_PUBLIC_DEV_BYPASS_ROUTE_PERMISSIONS === "true";

/**
 * Returns true if route permission checks should be bypassed for the current
 * session. Used by RoutePermissionGuard during UI-only development.
 */
export function shouldBypassRoutePermissions(): boolean {
  return BYPASS_ROUTE_PERMISSIONS;
}
