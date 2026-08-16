"use client";

import { usePathname, useRouter } from "next/navigation";
import { TopbarShell } from "@/components/shared/TopbarShell";
import { SidebarRoleSwitcher } from "@/components/shared/SidebarShell";
import { useAdmin } from "@/contexts/AdminContext";

const PAGE_META: Record<string, { en: string; ar: string; sub?: string; subAr?: string }> = {
  "/employee/today":        { en: "Today · Shift",     ar: "اهلاً بك خالد",       sub: "Sun, May 24 · Riyadh — Olaya",              subAr: "الأحد، ٢٤ مايو · الرياض — العليا"        },
  "/employee/new-contract": { en: "New contract",      ar: "عقد جديد",             sub: "Walk-in or phone customer",                   subAr: "عميل حضوري أو هاتفي"                      },
  "/employee/contracts":    { en: "Contracts",         ar: "العقود",               sub: "Riyadh — Olaya",                              subAr: "الرياض — العليا"                           },
  "/employee/pickup":       { en: "Pickup handover",   ar: "تسليم المركبة",        sub: "MK-2419 · Ahmed Al-Otaibi",                   subAr: "MK-2419 · أحمد العتيبي"                   },
  "/employee/return":       { en: "Return processing", ar: "استلام الإرجاع",       sub: "MK-2420 · overdue 2h 14m",                    subAr: "MK-2420 · متأخر ساعتان و١٤ دقيقة"         },
  "/employee/customer":     { en: "Customers",         ar: "قائمة العملاء",        sub: "View, search & add customers",                subAr: "عرض وبحث وإضافة عملاء"                    },
  "/employee/customer/inquiry": { en: "Customer Inquiry", ar: "الاستعلام عن العملاء", sub: "Query the shared Dynamics network",         subAr: "الاستعلام من شبكة دينامكس المشتركة"       },
  "/employee/drivers":      { en: "Drivers",           ar: "بيانات السائقين",      sub: "View, search & add drivers",                  subAr: "عرض وبحث وإضافة السائقين"                  },
  "/employee/cars":         { en: "Vehicles",          ar: "المركبات",              sub: "Status, branch transfer & availability",       subAr: "الحالة والتسليم بين الفروع"               },
};

export function EmployeeTopbar() {
  const { dir, isDark, toggleDark, setSidebarOpen } = useAdmin();
  const path = usePathname();
  const router = useRouter();
  const ar = dir === "rtl";
  const isContractDetail = path.startsWith("/employee/contracts/") && path !== "/employee/contracts";
  const contractId = isContractDetail ? path.split("/").pop() : null;
  const isCustomerDetail = path.startsWith("/employee/customer/") && path !== "/employee/customer" && path !== "/employee/customer/inquiry";
  const isDriverDetail = path.startsWith("/employee/drivers/") && path !== "/employee/drivers";
  const driverId = isDriverDetail ? path.split("/").pop() : null;
  const meta = isContractDetail
    ? { en: `Contract ${contractId}`, ar: `عقد ${contractId}`, sub: "Contract details", subAr: "تفاصيل العقد" }
    : isCustomerDetail
    ? { en: "Customer details", ar: "بيانات العميل" }
    : isDriverDetail
    ? { en: `Driver ${driverId}`, ar: `السائق ${driverId}`, sub: "Profile & booking history", subAr: "البيانات والحجوزات" }
    : PAGE_META[path] ?? { en: "Maarkbh", ar: "مركبة" };

  return (
    <TopbarShell
      onOpenSidebar={() => setSidebarOpen(true)}
      isDark={isDark}
      onToggleDark={toggleDark}
      searchPlaceholder={ar ? "ابحث برقم الحجز أو الهاتف…" : "Search ref or phone…"}
      titleBlock={
        <>
          <div className="mk-body-sm mb-1 text-mk-ink-500 hidden sm:block">
            {ar ? "مركبة · موظف الاستقبال" : "Maarkbh · Front desk"}
          </div>
          <h1 className="mk-h2 leading-none text-mk-ink-900 tracking-tight truncate">{ar ? meta.ar : meta.en}</h1>
          {(meta.sub || meta.subAr) && (
            <div className="mk-body-sm mt-1 text-mk-ink-500 hidden sm:block">{ar ? meta.subAr : meta.sub}</div>
          )}
        </>
      }
      trailing={
        <SidebarRoleSwitcher
          ar={ar}
          activeIsFirst={false}
          firstLabelAr="مالك"
          firstLabelEn="Owner"
          secondLabelAr="موظف"
          secondLabelEn="Front desk"
          onSelectOther={() => router.push("/dashboard")}
        />
      }
    />
  );
}
