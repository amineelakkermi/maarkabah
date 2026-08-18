"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, Map, CalendarDays, Car,
  ShieldCheck, ClockAlert, Ban, Search, Globe,
  BarChart3, Undo2, Tag, Users, Building, Shield,
} from "lucide-react";
import { useAdmin } from "@/contexts/AdminContext";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarShell, SidebarNavLink, SidebarUserCard } from "@/components/shared/SidebarShell";
import { customerService, customerEvents } from "@/lib/api-services";
import { VerificationStatus } from "@/lib/api-types";

export function Sidebar() {
  const path = usePathname();
  const { dir, toggleDir, role, sidebarOpen, setSidebarOpen, sidebarCollapsed, logout } = useAdmin();
  const { decodedToken } = useAuth();
  const ar = dir === "rtl";
  const [kycCount, setKycCount] = useState(0);

  // SuperAdmin has no tenant claim; tenant users (owner or frontdesk) do.
  const hasTenant = !!(decodedToken?.tenant_id ?? decodedToken?.tenantId);
  const isSuperAdmin = !hasTenant;

  const FRONTDESK_ROUTES = new Set(["/dashboard", "/bookings", "/fleet", "/kyc-queue", "/late-returns", "/branches", "/roles", "/customers/inquiry"]);
  const handleNavClick = () => setSidebarOpen(false);

  useEffect(() => {
    const loadKycCount = async () => {
      try {
        const response = await customerService.search({
          verificationStatus: VerificationStatus.Pending,
          pageNumber: 1,
          pageSize: 1000,
        });
        const items = response?.items ?? response?.data?.items ?? response?.data ?? response ?? [];
        const total =
          response?.totalCount ??
          response?.data?.totalCount ??
          response?.total ??
          response?.data?.total ??
          (Array.isArray(items) ? items.length : 0);
        setKycCount(total);
      } catch (err) {
        console.error("Error loading KYC queue count:", err);
        setKycCount(0);
      }
    };

    loadKycCount();
    const unsubscribe = customerEvents.onReload(loadKycCount);
    return () => unsubscribe();
  }, []);

  // Routes that should only appear for SuperAdmin (no tenant claim)
  const SUPERADMIN_ROUTES = new Set(["/admin/customer-warehouse"]);

  const NAV_SECTIONS = [
    {
      title: "Operations",
      titleAr: "العمليات",
      items: [
        { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", labelAr: "الرئيسية" },
        { href: "/fleet-map", icon: Map, label: "Fleet Map", labelAr: "خريطة الأسطول" },
        { href: "/bookings", icon: CalendarDays, label: "Contracts", labelAr: "العقود" },
        { href: "/fleet", icon: Car, label: "Fleet", labelAr: "الأسطول" },
      ],
    },
    {
      title: "Customer",
      titleAr: "العملاء",
      items: [
        { href: "/customers", icon: Users, label: "Client List", labelAr: "قائمة العملاء" },
        { href: "/customers/inquiry", icon: Search, label: "Inquiry", labelAr: "الاستعلام" },
        { href: "/kyc-queue", icon: ShieldCheck, label: "KYC Queue", labelAr: "مراجعة الهوية", badge: kycCount || undefined },
        { href: "/late-returns", icon: ClockAlert, label: "Late Returns", labelAr: "الإرجاع المتأخر", badge: 2 },
        { href: "/blacklist", icon: Ban, label: "Blacklist", labelAr: "القائمة السوداء" },
      ],
    },
    {
      title: "Finance",
      titleAr: "المالية",
      items: [
        { href: "/revenue", icon: BarChart3, label: "Revenue", labelAr: "الإيرادات" },
        { href: "/refunds", icon: Undo2, label: "Refunds", labelAr: "المستردات" },
        { href: "/pricing", icon: Tag, label: "Pricing", labelAr: "الأسعار" },
      ],
    },
    {
      title: "System",
      titleAr: "النظام",
      items: [
        { href: "/branches", icon: Building, label: "Branches", labelAr: "الفروع" },
        { href: "/roles", icon: Shield, label: "Roles", labelAr: "الأدوار" },
        { href: "/staff", icon: Users, label: "Staff", labelAr: "الفريق" },
        { href: "/admin/customer-warehouse", icon: Globe, label: "Warehouse Admin", labelAr: "إدارة المستودع" },
      ],
    },
  ];

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
      {NAV_SECTIONS.map((section) => {
        let visibleItems = role === "owner"
          ? section.items
          : section.items.filter((item) => FRONTDESK_ROUTES.has(item.href));
        visibleItems = visibleItems.filter((item) => !SUPERADMIN_ROUTES.has(item.href) || isSuperAdmin);
        if (visibleItems.length === 0) return null;
        return (
          <div key={section.title}>
            <div className={`px-4 pb-2 pt-5 mk-overline text-mk-ink-500 ${sidebarCollapsed ? "lg:hidden" : ""}`}>{ar ? section.titleAr : section.title}</div>
            {visibleItems.map((item) => {
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
        );
      })}
    </SidebarShell>
  );
}
