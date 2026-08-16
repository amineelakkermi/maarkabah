/**
 * Normalize and format phone numbers for display.
 * - Keeps international prefix readable: +966 50 123 4567
 * - Strips redundant whitespace.
 */
export function formatPhone(phone: string | undefined | null): string {
  if (!phone) return "-";

  const cleaned = phone.replace(/\s+/g, " ").trim();
  const digits = cleaned.replace(/\D/g, "");

  if (!digits) return cleaned;

  // If it already starts with +, keep as-is (just normalized spaces).
  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  // Common Saudi mobile format: 05X XXX XXXX -> +966 5X XXX XXXX
  if (digits.startsWith("05") && digits.length === 10) {
    const mobile = digits.slice(1);
    return `+966 ${mobile.slice(0, 2)} ${mobile.slice(2, 6)} ${mobile.slice(6)}`;
  }

  // Already in 966XXXXXXXXX form but missing the plus.
  if (digits.startsWith("966") && digits.length === 12) {
    const national = digits.slice(3);
    return `+966 ${national.slice(0, 2)} ${national.slice(2, 6)} ${national.slice(6)}`;
  }

  // Default: prepend + if it looks like an intl number.
  if (digits.length >= 9 && digits.length <= 14) {
    return `+${digits}`;
  }

  return cleaned;
}

/**
 * Normalize backend verification status values to the frontend status shape.
 * Backend may return numeric enum values (1 = pending, 2 = verified, 3 = rejected)
 * or string variants like "Verified", "Pending", "Rejected".
 */
export function normalizeKycStatus(status: unknown): "verified" | "pending" | "rejected" {
  if (status === 2 || status === "Verified" || status === "verified" || status === "2") return "verified";
  if (status === 3 || status === "Rejected" || status === "rejected" || status === "3") return "rejected";
  return "pending";
}
