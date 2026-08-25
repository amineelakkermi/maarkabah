"use client";

import { usePathname } from "next/navigation";
import { TopbarShell } from "@/components/shared/TopbarShell";
import { useAdmin } from "@/contexts/AdminContext";

const PAGE_META: Record<string, { en: string; ar: string; crumbEn?: string; crumbAr?: string }> = {
  "/superadmin": { en: "SuperAdmin Dashboard", ar: "لوحة المشرف العام", crumbEn: "Platform", crumbAr: "الإدارة العامة" },
  "/superadmin/tenants": { en: "Tenants", ar: "المستأجرين", crumbEn: "Platform", crumbAr: "الإدارة العامة" },
  "/superadmin/customer-warehouse": { en: "Customer Warehouse", ar: "مستودع العملاء", crumbEn: "Platform", crumbAr: "الإدارة العامة" },
};

export function SuperAdminTopbar() {
  const { isDark, toggleDark, dir, setSidebarOpen } = useAdmin();
  const path = usePathname();
  const ar = dir === "rtl";
  const meta = PAGE_META[path] ?? { en: "SuperAdmin", ar: "المشرف العام" };

  return (
    <TopbarShell
      onOpenSidebar={() => setSidebarOpen(true)}
      isDark={isDark}
      onToggleDark={toggleDark}
      searchPlaceholder={ar ? "بحث..." : "Search..."}
      titleBlock={
        <>
          {meta.crumbEn && (
            <div className="mk-body-sm mb-1 text-mk-ink-500 hidden sm:block">{ar ? meta.crumbAr : meta.crumbEn}</div>
          )}
          <h1 className="mk-h2 leading-none text-mk-ink-900 tracking-tight truncate">{ar ? meta.ar : meta.en}</h1>
        </>
      }
    />
  );
}
