"use client";

import { usePathname, useRouter } from "next/navigation";
import { TopbarShell } from "@/components/shared/TopbarShell";
import { SidebarRoleSwitcher } from "@/components/shared/SidebarShell";
import { useAdmin } from "@/contexts/AdminContext";

const PAGE_META: Record<string, { en: string; ar: string; crumbEn?: string; crumbAr?: string }> = {
  "/dashboard":    { en: "Dashboard",          ar: "الرئيسية",           crumbEn: "Home",     crumbAr: "الرئيسية" },
  "/fleet-map":    { en: "Fleet Map",           ar: "خريطة الأسطول",     crumbEn: "Map",      crumbAr: "الخريطة"  },
  "/bookings":     { en: "Contracts",           ar: "العقود",             crumbEn: "Contracts",crumbAr: "العقود"   },
  "/fleet":        { en: "Fleet Management",    ar: "إدارة الأسطول",     crumbEn: "Fleet",    crumbAr: "الأسطول"  },
  "/drivers":      { en: "Drivers",             ar: "بيانات السائقين",   crumbEn: "Customer", crumbAr: "العملاء"  },
  "/kyc-queue":    { en: "KYC Queue",           ar: "مراجعة الهوية",     crumbEn: "Customer", crumbAr: "العملاء"  },
  "/drivers-kyc-queue": { en: "Driver KYC Queue", ar: "مراجعة هوية السائقين", crumbEn: "Customer", crumbAr: "العملاء" },
  "/late-returns": { en: "Late Returns",        ar: "الإرجاع المتأخر",   crumbEn: "Customer", crumbAr: "العملاء"  },
  "/blacklist":    { en: "Blacklist",           ar: "القائمة السوداء",   crumbEn: "Customer", crumbAr: "العملاء"  },
  "/revenue":      { en: "Revenue",             ar: "الإيرادات",          crumbEn: "Finance",  crumbAr: "المالية"  },
  "/refunds":      { en: "Refunds",             ar: "المستردات",          crumbEn: "Finance",  crumbAr: "المالية"  },
  "/pricing":      { en: "Pricing & Policies",  ar: "الأسعار والسياسات", crumbEn: "Finance",  crumbAr: "المالية"  },
  "/staff":        { en: "Staff & Roles",       ar: "الفريق والأدوار",   crumbEn: "System",   crumbAr: "النظام"   },
};

export function Topbar() {
  const { isDark, toggleDark, dir, setSidebarOpen } = useAdmin();
  const path = usePathname();
  const router = useRouter();
  const ar = dir === "rtl";
  const meta = PAGE_META[path] ?? { en: "Maarkbh", ar: "مركبة" };

  return (
    <TopbarShell
      onOpenSidebar={() => setSidebarOpen(true)}
      isDark={isDark}
      onToggleDark={toggleDark}
      searchPlaceholder={ar ? "ابحث عن عقد، مركبة، عميل…" : "Search contract, car, customer…"}
      titleBlock={
        <>
          {meta.crumbEn && (
            <div className="mk-body-sm mb-1 text-mk-ink-500 hidden sm:block">{ar ? meta.crumbAr : meta.crumbEn}</div>
          )}
          <h1 className="mk-h2 leading-none text-mk-ink-900 tracking-tight truncate">{ar ? meta.ar : meta.en}</h1>
        </>
      }
      trailing={
        <SidebarRoleSwitcher
          ar={ar}
          activeIsFirst
          firstLabelAr="مالك"
          firstLabelEn="Owner"
          secondLabelAr="موظف"
          secondLabelEn="Front desk"
          onSelectOther={() => router.push("/employee/today")}
        />
      }
    />
  );
}
