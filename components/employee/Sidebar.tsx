"use client";

import { usePathname } from "next/navigation";
import {
  Sun, PlusCircle, KeyRound, Undo2,
  CalendarCheck, Users, CarFront, User, UserSearch,
} from "lucide-react";
import { useAdmin } from "@/contexts/AdminContext";
import { SidebarShell, SidebarNavLink, SidebarUserCard } from "@/components/shared/SidebarShell";

const NAV_ITEMS = [
  { href: "/employee/today", icon: Sun, label: "Today", labelAr: "اليوم", badge: 5 },
  { href: "/employee/new-contract", icon: PlusCircle, label: "New contract", labelAr: "عقد جديد" },
  { href: "/employee/contracts", icon: CalendarCheck, label: "Contracts", labelAr: "العقود", badge: 8 },
  { href: "/employee/drivers", icon: User, label: "Drivers", labelAr: "بيانات السائقين" },
  { href: "/employee/pickup", icon: KeyRound, label: "Pickup handover", labelAr: "تسليم المركبة" },
  { href: "/employee/return", icon: Undo2, label: "Return processing", labelAr: "استلام الإرجاع", badge: 1 },
  { href: "/employee/customer", icon: Users, label: "Customers", labelAr: "قائمة العملاء" },
  { href: "/employee/customer/inquiry", icon: UserSearch, label: "Customer Inquiry", labelAr: "الاستعلام عن العملاء" },
  { href: "/employee/cars", icon: CarFront, label: "Vehicles", labelAr: "المركبات" },
];

export function EmployeeSidebar() {
  const path = usePathname();
  const { dir, toggleDir, sidebarOpen, setSidebarOpen, sidebarCollapsed, logout } = useAdmin();
  const ar = dir === "rtl";

  const handleNavClick = () => setSidebarOpen(false);

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
      <div className={`px-4 pb-2 pt-1 mk-overline text-mk-ink-500 ${sidebarCollapsed ? "lg:hidden" : ""}`}>{ar ? "الوردية" : "Shift"}</div>
      {NAV_ITEMS.map((item) => {
        const bestMatch = NAV_ITEMS
          .filter((navItem) => path === navItem.href || path?.startsWith(navItem.href + "/"))
          .sort((a, b) => b.href.length - a.href.length)[0];
        const active = bestMatch?.href === item.href;
        return (
          <SidebarNavLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            labelAr={item.labelAr}
            ar={ar}
            dir={dir}
            active={active}
            badge={item.badge}
            onClick={handleNavClick}
            collapsed={sidebarCollapsed}
          />
        );
      })}
    </SidebarShell>
  );
}
