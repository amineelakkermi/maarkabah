import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, Car,
  ShieldCheck, Ban, Search, Globe,
  Tag, Users, Building, Shield, IdCard,
  Sun, PlusCircle, CalendarCheck,
  KeyRound, Undo2,
  CarFront, UserSearch, User,
} from "lucide-react";
import { Permission, type PermissionRequirement } from "./permissions";

export interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  labelAr: string;
  badge?: number;
  requiredPermission: PermissionRequirement;
}

export interface NavSection {
  title: string;
  titleAr: string;
  items: NavItem[];
}

/**
 * Admin navigation sections.
 * Pages with no corresponding backend permission are hidden by default
 * (requiredPermission left as a TODO / null depending on UX choice).
 * null means "visible to any authenticated tenant user".
 */
export const ADMIN_NAV_SECTIONS: NavSection[] = [
  {
    title: "Operations",
    titleAr: "العمليات",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", labelAr: "الرئيسية", requiredPermission: null },
      // fleet-map, bookings, late-returns have no matching backend permission at this time.
      { href: "/fleet", icon: Car, label: "Fleet", labelAr: "الأسطول", requiredPermission: Permission.Vehicles.View },
    ],
  },
  {
    title: "Customer",
    titleAr: "العملاء",
    items: [
      { href: "/customers", icon: Users, label: "Client List", labelAr: "قائمة العملاء", requiredPermission: Permission.Customers.View },
      { href: "/customers/inquiry", icon: Search, label: "Inquiry", labelAr: "الاستعلام", requiredPermission: Permission.CustomerWarehouse.View },
      { href: "/drivers", icon: IdCard, label: "Drivers", labelAr: "بيانات السائقين", requiredPermission: Permission.Drivers.View },
      { href: "/kyc-queue", icon: ShieldCheck, label: "KYC Queue", labelAr: "مراجعة الهوية", requiredPermission: Permission.Customers.View },
      { href: "/drivers-kyc-queue", icon: ShieldCheck, label: "Driver KYC Queue", labelAr: "مراجعة هوية السائقين", requiredPermission: Permission.Drivers.View },
      { href: "/blacklist", icon: Ban, label: "Blacklist", labelAr: "القائمة السوداء", requiredPermission: Permission.Blacklist.View },
    ],
  },
  {
    title: "Finance",
    titleAr: "المالية",
    items: [
      { href: "/pricing", icon: Tag, label: "Pricing", labelAr: "الأسعار", requiredPermission: Permission.AdditionalServices.View },
      // revenue and refunds have no matching backend permission at this time.
    ],
  },
  {
    title: "System",
    titleAr: "النظام",
    items: [
      { href: "/branches", icon: Building, label: "Branches", labelAr: "الفروع", requiredPermission: Permission.Branches.View },
      { href: "/roles", icon: Shield, label: "Roles", labelAr: "الأدوار", requiredPermission: Permission.Roles.View },
      { href: "/staff", icon: Users, label: "Staff", labelAr: "الفريق", requiredPermission: Permission.Users.View },
      { href: "/admin/customer-warehouse", icon: Globe, label: "Warehouse Admin", labelAr: "إدارة المستودع", requiredPermission: "superadmin" },
    ],
  },
];

/**
 * Employee navigation sections.
 * Core workflow pages (today, new-contract, contracts, pickup, return) do not have
 * dedicated backend permissions in the current catalog, so they are visible to
 * any authenticated employee user.
 */
export const EMPLOYEE_NAV_SECTIONS: NavSection[] = [
  {
    title: "Shift",
    titleAr: "الوردية",
    items: [
      { href: "/employee/today", icon: Sun, label: "Today", labelAr: "اليوم", requiredPermission: null, badge: 5 },
      { href: "/employee/new-contract", icon: PlusCircle, label: "New contract", labelAr: "عقد جديد", requiredPermission: null },
      { href: "/employee/contracts", icon: CalendarCheck, label: "Contracts", labelAr: "العقود", requiredPermission: null, badge: 8 },
    ],
  },
  {
    title: "Operations",
    titleAr: "العمليات",
    items: [
      { href: "/employee/drivers", icon: User, label: "Drivers", labelAr: "بيانات السائقين", requiredPermission: Permission.Drivers.View },
      { href: "/employee/pickup", icon: KeyRound, label: "Pickup handover", labelAr: "تسليم المركبة", requiredPermission: null, badge: 1 },
      { href: "/employee/return", icon: Undo2, label: "Return processing", labelAr: "استلام الإرجاع", requiredPermission: null },
      { href: "/employee/cars", icon: CarFront, label: "Vehicles", labelAr: "المركبات", requiredPermission: Permission.Vehicles.View },
    ],
  },
  {
    title: "Customers",
    titleAr: "العملاء",
    items: [
      { href: "/employee/customer", icon: Users, label: "Customers", labelAr: "قائمة العملاء", requiredPermission: Permission.Customers.View },
      { href: "/employee/customer/inquiry", icon: UserSearch, label: "Customer Inquiry", labelAr: "الاستعلام عن العملاء", requiredPermission: Permission.CustomerWarehouse.View },
    ],
  },
];

export function filterNavSections(
  sections: NavSection[],
  hasAccess: (req: PermissionRequirement) => boolean
): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => hasAccess(item.requiredPermission)),
    }))
    .filter((section) => section.items.length > 0);
}
