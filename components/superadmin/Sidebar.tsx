"use client";

import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, Globe, Shield } from "lucide-react";
import { useAdmin } from "@/contexts/AdminContext";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarShell, SidebarNavLink, SidebarUserCard } from "@/components/shared/SidebarShell";

const NAV_ITEMS = [
  { href: "/superadmin", icon: LayoutDashboard, label: "Dashboard", labelAr: "الرئيسية" },
  { href: "/superadmin/tenants", icon: Building2, label: "Tenants", labelAr: "المستأجرين" },
  { href: "/superadmin/customer-warehouse", icon: Globe, label: "Warehouse Admin", labelAr: "إدارة المستودع" },
];

export function SuperAdminSidebar() {
  const path = usePathname();
  const { dir, toggleDir, sidebarOpen, setSidebarOpen, sidebarCollapsed, logout, currentUser } = useAdmin();
  const { decodedToken } = useAuth();
  const ar = dir === "rtl";

  const displayName = currentUser?.name ?? decodedToken?.full_name ?? "SuperAdmin";
  const initials = currentUser?.initials ?? displayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() ?? "SA";

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
            initials={{ ar: initials, en: initials }}
            gradient="linear-gradient(135deg, var(--color-mk-violet-500), var(--color-mk-blue-500))"
            name={displayName}
            nameAr={displayName}
            sub="SuperAdmin · عر/EN"
            subAr="مشرف عام · عر/EN"
            onToggleDir={toggleDir}
            onLogout={logout}
            collapsed={sidebarCollapsed}
          />
        </div>
      }
    >
      <div className="px-4 pb-2 pt-5 mk-overline text-mk-ink-500">
        {ar ? "الإدارة العامة" : "Platform"}
      </div>
      {NAV_ITEMS.map((item) => {
        const active = path === item.href || path.startsWith(item.href + "/");
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
            onClick={handleNavClick}
            collapsed={sidebarCollapsed}
          />
        );
      })}
    </SidebarShell>
  );
}
