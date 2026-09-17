import { Crown, Briefcase, Headset, Calculator, Sparkles, type LucideIcon } from "lucide-react";
import type { BadgeVariant } from "@/components/ui";

export interface RoleStyle {
  variant: BadgeVariant;
  Icon: LucideIcon;
}

// One identity per built-in role — reused everywhere a role's name is shown
// as a badge (the roles table, the role-details cards, a role's own detail
// page) so "Manager" always reads as the same blue briefcase no matter
// where it appears, instead of every role sharing one gray pill.
const BUILTIN_ROLE_STYLES: Record<string, RoleStyle> = {
  owner: { variant: "violet", Icon: Crown },
  manager: { variant: "info", Icon: Briefcase },
  "front-desk": { variant: "success", Icon: Headset },
  accountant: { variant: "warning", Icon: Calculator },
};

// Custom (office-created) roles don't have a fixed identity, so they all
// share one deliberately distinct treatment — a filled pill (the one
// variant no built-in role uses) with a "custom-made" glyph — so a glance
// at the table tells built-in and custom roles apart even before reading
// the "Type" column.
export const CUSTOM_ROLE_STYLE: RoleStyle = { variant: "solid", Icon: Sparkles };

export function builtinRoleStyle(slug: string): RoleStyle {
  return BUILTIN_ROLE_STYLES[slug] ?? CUSTOM_ROLE_STYLE;
}
