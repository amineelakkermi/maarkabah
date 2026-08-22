"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useAdmin } from "@/contexts/AdminContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { SidebarShell, SidebarNavLink, SidebarUserCard } from "@/components/shared/SidebarShell";
import { EMPLOYEE_NAV_SECTIONS, filterNavSections } from "@/lib/navigation-config";

export function EmployeeSidebar() {
  const path = usePathname();
  const { dir, toggleDir, sidebarOpen, setSidebarOpen, sidebarCollapsed, logout } = useAdmin();
  const { hasPermission } = usePermissions();
  const ar = dir === "rtl";

  const visibleSections = useMemo(
    () => filterNavSections(EMPLOYEE_NAV_SECTIONS, (req) => hasPermission(req)),
    [hasPermission]
  );

  const allLinks = useMemo(
    () => visibleSections.flatMap((s) => s.items),
    [visibleSections]
  );

  const bestMatch = allLinks
    .filter((navItem) => path === navItem.href || path?.startsWith(navItem.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0];

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
      {visibleSections.map((section) => (
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
