import { AuthUser } from "@/contexts/AuthContext";
import { UserProfile, AdminRole } from "@/contexts/UserContext";

/**
 * Maps JWT token claims to the application's UserProfile model
 * This mapper provides a clean separation between the raw JWT data
 * and the application's user model, making it reusable across the app.
 */
export function mapAuthUserToProfile(
  authUser: AuthUser,
  role: AdminRole
): UserProfile {
  // Extract initials from the full name or username
  const displayName = authUser.full_name || authUser.name;
  const initials = displayName
    .split(' ')
    .map(word => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return {
    name: displayName,
    initials,
    phone: "+966 50 123 4567", // Not available in JWT token - to be fetched from API
    branch: "Headquarters", // Not available in JWT token - to be fetched from API
    branchAr: "المقر الرئيسي", // Not available in JWT token - to be fetched from API
    roleLabel: role === "owner" ? "Owner" : "Receptionist",
    roleLabelAr: role === "owner" ? "المالك" : "موظفة استقبال",
    operatorId: authUser.oi_au_id || authUser.sub,
  };
}

/**
 * Extracts the user ID from the AuthUser
 * Prefers oi_au_id (OpenIddict Authorization ID) over sub (subject)
 */
export function getUserId(authUser: AuthUser): string {
  return authUser.oi_au_id || authUser.sub;
}

/**
 * Extracts the display name from the AuthUser
 * Prefers full_name over name
 */
export function getDisplayName(authUser: AuthUser): string {
  return authUser.full_name || authUser.name;
}

/**
 * Checks if the token is expired based on the exp claim
 */
export function isTokenExpired(authUser: AuthUser): boolean {
  const now = Math.floor(Date.now() / 1000);
  return authUser.exp < now;
}

/**
 * Gets the time remaining until token expiration in seconds
 * Returns 0 if token is already expired
 */
export function getTokenTimeRemaining(authUser: AuthUser): number {
  const now = Math.floor(Date.now() / 1000);
  const remaining = authUser.exp - now;
  return Math.max(0, remaining);
}
