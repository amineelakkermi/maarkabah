"use client";

import { usePathname } from "next/navigation";
import { TopbarShell, TopbarKicker } from "@/components/shared/TopbarShell";
import { useAdmin } from "@/contexts/AdminContext";

const PAGE_META: Record<string, { en: string; ar: string; crumbEn?: string; crumbAr?: string }> = {
  "/dashboard":    { en: "Dashboard",          ar: "الرئيسية",           crumbEn: "Home",     crumbAr: "الرئيسية" },
  "/fleet-map":    { en: "Fleet Map",           ar: "خريطة الأسطول",     crumbEn: "Map",      crumbAr: "الخريطة"  },
  "/fleet":        { en: "Fleet Management",    ar: "إدارة الأسطول",     crumbEn: "Fleet",    crumbAr: "الأسطول"  },
  "/contracts":    { en: "Contracts",           ar: "العقود",             crumbEn: "Operations", crumbAr: "العمليات" },
  "/new-contract": { en: "New contract",        ar: "عقد جديد",           crumbEn: "Operations", crumbAr: "العمليات" },
  "/pickup":       { en: "Pickup handover",     ar: "تسليم المركبة",      crumbEn: "Operations", crumbAr: "العمليات" },
  "/return":       { en: "Return processing",   ar: "استلام الإرجاع",     crumbEn: "Operations", crumbAr: "العمليات" },
  "/customers":    { en: "Customers",           ar: "قائمة العملاء",     crumbEn: "Customer", crumbAr: "العملاء"  },
  "/customers/inquiry": { en: "Customer Verification", ar: "التحقق من العملاء", crumbEn: "Customer", crumbAr: "العملاء" },
  "/drivers":      { en: "Drivers",             ar: "بيانات السائقين",   crumbEn: "Customer", crumbAr: "العملاء"  },
  "/kyc-queue":    { en: "KYC Queue",           ar: "مراجعة الهوية",     crumbEn: "Customer", crumbAr: "العملاء"  },
  "/drivers-kyc-queue": { en: "Driver KYC Queue", ar: "مراجعة هوية السائقين", crumbEn: "Customer", crumbAr: "العملاء" },
  "/late-returns": { en: "Late Returns",        ar: "الإرجاع المتأخر",   crumbEn: "Customer", crumbAr: "العملاء"  },
  "/disputes":     { en: "Return Disputes",     ar: "محاضر النزاع",       crumbEn: "Customer", crumbAr: "العملاء"  },
  "/blacklist":    { en: "High risk",           ar: "عالي المخاطر",       crumbEn: "Customer", crumbAr: "العملاء"  },
  "/revenue":      { en: "Revenue",             ar: "الإيرادات",          crumbEn: "Finance",  crumbAr: "المالية"  },
  "/closing":      { en: "Financial close",     ar: "الإغلاق المالي",     crumbEn: "Finance",  crumbAr: "المالية"  },
  "/refunds":      { en: "Refunds",             ar: "المستردات",          crumbEn: "Finance",  crumbAr: "المالية"  },
  "/pricing":      { en: "Policies & Pricing",  ar: "السياسات والأسعار", crumbEn: "Finance",  crumbAr: "المالية"  },
  "/staff":        { en: "Staff & Roles",       ar: "الفريق والأدوار",   crumbEn: "System",   crumbAr: "النظام"   },
  "/settings":     { en: "Settings",            ar: "الإعدادات",          crumbEn: "System",   crumbAr: "النظام"   },
  "/notifications": { en: "Notifications & Alerts", ar: "الإشعارات والتنبيهات", crumbEn: "System", crumbAr: "النظام" },
};

export function Topbar() {
  const { isDark, toggleDark, dir, setSidebarOpen, currentUser } = useAdmin();
  const path = usePathname();
  const ar = dir === "rtl";

  const isContractDetail = path.startsWith("/contracts/") && path !== "/contracts";
  const contractId = isContractDetail ? path.split("/").pop() : null;
  const isDisputeDetail = path.startsWith("/disputes/");
  const disputeId = isDisputeDetail ? decodeURIComponent(path.split("/").pop() ?? "") : null;

  // The dashboard greets the signed-in user by first name.
  const firstName = (currentUser?.name ?? "").split(" ")[0];
  const meta = isContractDetail
    ? { en: `Contract ${contractId}`, ar: `عقد ${contractId}`, crumbEn: "Contracts", crumbAr: "العقود" }
    : isDisputeDetail
    ? { en: `Dispute ${disputeId}`, ar: `محضر نزاع ${disputeId}`, crumbEn: "Return Disputes", crumbAr: "محاضر النزاع" }
    : path === "/dashboard" && firstName
    ? { ...PAGE_META[path], en: `Welcome, ${firstName}`, ar: `أهلاً بك ${firstName}` }
    : PAGE_META[path] ?? { en: "Maarkbh", ar: "مركبة" };

  return (
    <TopbarShell
      onOpenSidebar={() => setSidebarOpen(true)}
      isDark={isDark}
      onToggleDark={toggleDark}
      searchPlaceholder={ar ? "ابحث عن عقد، مركبة، عميل…" : "Search contract, car, customer…"}
      titleBlock={
        <>
          <TopbarKicker>{meta.crumbEn ? (ar ? meta.crumbAr : meta.crumbEn) : null}</TopbarKicker>
          <h1 className="mk-h2 leading-none text-mk-ink-900 tracking-tight">{ar ? meta.ar : meta.en}</h1>
        </>
      }
    />
  );
}
