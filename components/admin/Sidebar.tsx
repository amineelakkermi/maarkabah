"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { useAdmin } from "@/contexts/AdminContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { SidebarShell, SidebarNavLink, SidebarUserCard } from "@/components/shared/SidebarShell";
import { customerService, customerEvents, driverService, driverEvents } from "@/lib/api-services";
import { VerificationStatus } from "@/lib/api-types";
import { ADMIN_NAV_SECTIONS, filterNavSections } from "@/lib/navigation-config";
import { Permission } from "@/lib/permissions";

export function Sidebar() {
  const path = usePathname();
  const { dir, toggleDir, sidebarOpen, setSidebarOpen, sidebarCollapsed, logout } = useAdmin();
  const { permissions, hasPermission, isSuperAdmin } = usePermissions();
  const ar = dir === "rtl";

  const [kycCount, setKycCount] = useState(0);
  const [driverKycCount, setDriverKycCount] = useState(0);

  const visibleSections = useMemo(() => {
    const sections = filterNavSections(ADMIN_NAV_SECTIONS, (req) => hasPermission(req));

    // Attach live badges to the filtered KYC links.
    return sections.map((section) => ({
      ...section,
      items: section.items.map((item) => {
        if (item.href === "/kyc-queue") return { ...item, badge: kycCount || undefined };
        if (item.href === "/drivers-kyc-queue") return { ...item, badge: driverKycCount || undefined };
        return item;
      }),
    }));
  }, [permissions, kycCount, driverKycCount, hasPermission]);

  useEffect(() => {
    if (isSuperAdmin || !hasPermission(Permission.Customers.View)) {
      setKycCount(0);
      return;
    }

    const loadKycCount = async () => {
      try {
        const response = await customerService.search({
          verificationStatus: VerificationStatus.Pending,
          pageNumber: 1,
          pageSize: 1000,
        });
        const rawItems = response?.items ?? response?.data?.items ?? response?.data ?? response ?? [];
        const items = Array.isArray(rawItems) ? rawItems : [];
        const pending = items.filter((item: any) =>
          !(item.isBlacklisted === true || item.blacklisted === true)
        ).length;
        setKycCount(pending);
      } catch (err) {
        console.error("Error loading KYC queue count:", err);
        setKycCount(0);
      }
    };

    loadKycCount();
    const unsubscribe = customerEvents.onReload(loadKycCount);
    return () => unsubscribe();
  }, [hasPermission, isSuperAdmin]);

  useEffect(() => {
    if (isSuperAdmin || !hasPermission(Permission.Drivers.View)) {
      setDriverKycCount(0);
      return;
    }

    const loadDriverKycCount = async () => {
      try {
        const response = await driverService.search({
          verificationStatus: VerificationStatus.Pending,
          pageNumber: 1,
          pageSize: 1000,
        });
        const rawItems = response?.items ?? response?.data?.items ?? response?.data ?? response ?? [];
        const items = Array.isArray(rawItems) ? rawItems : [];
        const pending = items.filter((item: any) =>
          !(item.isBlacklisted === true || item.blacklisted === true)
        ).length;
        setDriverKycCount(pending);
      } catch (err) {
        console.error("Error loading driver KYC queue count:", err);
        setDriverKycCount(0);
      }
    };

    loadDriverKycCount();
    const unsubscribe = driverEvents.onReload(loadDriverKycCount);
    return () => unsubscribe();
  }, [hasPermission, isSuperAdmin]);

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
            initials={{ ar: "عم", en: "AO" }}
            gradient="linear-gradient(135deg, var(--color-mk-violet-500), var(--color-mk-blue-500))"
            name="Abdullah Al-Otaibi"
            nameAr="عبدالله العتيبي"
            sub="Olaya Branch · عر/EN"
            subAr="Olaya Branch · عر/EN"
            onToggleDir={toggleDir}
            onLogout={logout}
            collapsed={sidebarCollapsed}
          />
        </div>
      }
    >
      {visibleSections.map((section) => (
        <div key={section.title}>
          <div className={`px-4 pb-2 pt-5 mk-overline text-mk-ink-500 ${sidebarCollapsed ? "lg:hidden" : ""}`}>
            {ar ? section.titleAr : section.title}
          </div>
          {section.items.map((item) => {
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
                badge={item.badge}
                onClick={handleNavClick}
                collapsed={sidebarCollapsed}
              />
            );
          })}
        </div>
      ))}
    </SidebarShell>
  );
}
