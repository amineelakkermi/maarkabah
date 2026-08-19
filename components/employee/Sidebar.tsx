"use client";

import { usePathname } from "next/navigation";
import {
  Sun, PlusCircle, CalendarCheck,
  User, KeyRound, Undo2, CarFront,
  Users, UserSearch,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAdmin } from "@/contexts/AdminContext";
import { SidebarShell, SidebarNavLink, SidebarUserCard } from "@/components/shared/SidebarShell";

interface NavSection {
  title: string;
  titleAr: string;
  items: {
    href: string;
    icon: LucideIcon;
    label: string;
    labelAr: string;
    badge?: number;
  }[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Shift",
    titleAr: "الوردية",
    items: [
      { href: "/employee/today", icon: Sun, label: "Today", labelAr: "اليوم", badge: 5 },
      { href: "/employee/new-contract", icon: PlusCircle, label: "New contract", labelAr: "عقد جديد" },
      { href: "/employee/contracts", icon: CalendarCheck, label: "Contracts", labelAr: "العقود", badge: 8 },
    ],
  },
  {
    title: "Operations",
    titleAr: "العمليات",
    items: [
      { href: "/employee/drivers", icon: User, label: "Drivers", labelAr: "بيانات السائقين" },
      { href: "/employee/pickup", icon: KeyRound, label: "Pickup handover", labelAr: "تسليم المركبة" },
      { href: "/employee/return", icon: Undo2, label: "Return processing", labelAr: "استلام الإرجاع", badge: 1 },
      { href: "/employee/cars", icon: CarFront, label: "Vehicles", labelAr: "المركبات" },
    ],
  },
  {
    title: "Customers",
    titleAr: "العملاء",
    items: [
      { href: "/employee/customer", icon: Users, label: "Customers", labelAr: "قائمة العملاء" },
      { href: "/employee/customer/inquiry", icon: UserSearch, label: "Customer Inquiry", labelAr: "الاستعلام عن العملاء" },
    ],
  },
];

const allLinks = NAV_SECTIONS.flatMap((s) => s.items);

export function EmployeeSidebar() {
  const path = usePathname();
  const { dir, toggleDir, sidebarOpen, setSidebarOpen, sidebarCollapsed, logout } = useAdmin();
  const ar = dir === "rtl";

  const handleNavClick = () => setSidebarOpen(false);

  const bestMatch = allLinks
    .filter((navItem) => path === navItem.href || path?.startsWith(navItem.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <SidebarShell
      dir={dir}
      sidebarOpen={sidebarOpen}
      onCloseSidebar={() => setSidebarOpen(false)}
      brandAr="مركبة"
      brandEn="Maarkbh"
      footer={
        <div className="rounded-lg p-4 flex flex-col gap-3 bg-mk-blue-50">
          <SidebarUserCard
            ar={ar}
            initials={{ ar: "خم", en: "KM" }}
            gradient="linear-gradient(135deg, var(--color-mk-blue-500), var(--color-mk-mint-600))"
            name="Khalid Al-Mansour"
            nameAr="خالد المنصور"
            sub="Front desk · Olaya · عر/EN"
            subAr="موظف استقبال · العليا · عر/EN"
            onToggleDir={toggleDir}
            onLogout={logout}
            collapsed={sidebarCollapsed}
          />
        </div>
      }
    >
      {NAV_SECTIONS.map((section) => (
        <div key={section.title}>
          <div className={`px-4 pb-2 pt-1 mk-overline text-mk-ink-500 ${sidebarCollapsed ? "lg:hidden" : ""}`}>
            {ar ? section.titleAr : section.title}
          </div>
          {section.items.map((item) => (
            <SidebarNavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              labelAr={item.labelAr}
              ar={ar}
              dir={dir}
              active={bestMatch?.href === item.href}
              badge={item.badge}
              onClick={handleNavClick}
              collapsed={sidebarCollapsed}
            />
          ))}
        </div>
      ))}
    </SidebarShell>
  );
}
