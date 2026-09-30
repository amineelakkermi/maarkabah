"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Car, FileSignature, ClockAlert, Banknote, Gauge,
  Plus, CarFront, ShieldCheck, BarChart3, KeyRound, Undo2,
} from "lucide-react";
import { KpiCard, AlertBanner, Avatar, Spark, Badge, Button, Tabs } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { dashboardService } from "@/lib/api-services";
import { ApiError } from "@/lib/api-client";
import { normalizeOverview, type OverviewData, type ScheduleEntry } from "@/lib/dashboard";
import type { DashboardRevenuePeriod as Period } from "@/lib/api-types";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

const FLEET_META: Record<string, { en: string; ar: string; colorClass: string }> = {
  available:   { en: "Available",       ar: "متاحة",          colorClass: "bg-mk-mint-600" },
  rented:      { en: "Rented out",      ar: "مؤجرة",          colorClass: "bg-mk-blue-500" },
  rentedout:   { en: "Rented out",      ar: "مؤجرة",          colorClass: "bg-mk-blue-500" },
  onrent:      { en: "Rented out",      ar: "مؤجرة",          colorClass: "bg-mk-blue-500" },
  overdue:     { en: "Overdue",         ar: "متأخرة",         colorClass: "bg-mk-danger" },
  maintenance: { en: "Maintenance",     ar: "صيانة",          colorClass: "bg-mk-violet-500" },
  reserved:    { en: "Reserved",        ar: "محجوزة",         colorClass: "bg-mk-warning" },
  inactive:    { en: "Inactive",        ar: "غير نشطة",       colorClass: "bg-mk-ink-300" },
  draft:       { en: "Draft / pending", ar: "مسودة / معلق",   colorClass: "bg-mk-ink-400" },
  pending:     { en: "Draft / pending", ar: "مسودة / معلق",   colorClass: "bg-mk-ink-400" },
};

function fleetMeta(key: string) {
  const k = key.toLowerCase().replace(/[\s_-]/g, "");
  return FLEET_META[k] ?? { en: key, ar: key, colorClass: "bg-mk-ink-400" };
}

function fmtMoney(v: number): string {
  return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export default function DashboardPage() {
  const { dir } = useAdmin();
  const { autoApproveCustomers } = usePermissions();
  const ar = dir === "rtl";
  const [activityTab, setActivityTab] = useState("pickups");
  const [period, setPeriod] = useState<Period>("week");
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"forbidden" | "generic" | null>(null);

  useEffect(() => {
    let cancelled = false;
    dashboardService
      .overview({ branchId: null, revenuePeriod: period })
      .then((res) => { if (!cancelled) { setData(normalizeOverview(res)); setError(null); } })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError && err.status === 403 ? "forbidden" : "generic");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [period]);

  const togglePeriod = () => {
    setLoading(true);
    setPeriod((p) => (p === "week" ? "month" : "week"));
  };

  const kpi = (key: string) => data?.kpis.find((k) => k.key === key)?.value ?? 0;
  const delta = (key: string) => {
    const d = data?.kpis.find((k) => k.key === key)?.deltaPct;
    return d == null ? undefined : { dir: (d >= 0 ? "up" : "down") as "up" | "down", value: `${d > 0 ? "+" : ""}${d}%` };
  };

  const KPI_ROW = [
    { icon: Car, label: T("Available Cars", "المركبات المتاحة", ar), value: String(kpi("availableCars")), sub: data ? T(`of ${data.fleetTotal} total`, `من إجمالي ${data.fleetTotal}`, ar) : undefined, kind: "default" as const, delta: delta("availableCars") },
    { icon: FileSignature, label: T("Active Contracts", "العقود النشطة", ar), value: String(kpi("activeContracts")), sub: data ? T(`${data.pickups.length} picking up today`, `${data.pickups.length} تسليم اليوم`, ar) : undefined, kind: "violet" as const },
    { icon: ClockAlert, label: T("Late Returns", "الإرجاع المتأخر", ar), value: String(data?.overdueCount ?? kpi("lateReturns")), sub: data?.overdueRefs.slice(0, 2).join(", ") || undefined, kind: "alert" as const },
    { icon: Banknote, label: T("Today's Revenue", "إيرادات اليوم", ar), value: fmtMoney(kpi("todayRevenue")), sub: T("SAR", "ريال", ar), kind: "mint" as const, delta: delta("todayRevenue") },
    { icon: Gauge, label: T("Fleet Utilization", "استخدام الأسطول", ar), value: `${kpi("fleetUtilization")}%`, sub: undefined, kind: "warn" as const, delta: delta("fleetUtilization") },
  ];

  const QA = [
    { href: "/new-contract", icon: Plus, iconBg: "bg-mk-blue-50", iconColor: "text-mk-blue-500", label: T("Create Contract", "إنشاء عقد", ar), sub: T("3 steps · walk-in or phone", "٣ خطوات · حضوري أو هاتفي", ar) },
    { href: "/fleet", icon: CarFront, iconBg: "bg-mk-violet-100/60", iconColor: "text-mk-violet-500", label: T("Add Car", "إضافة مركبة", ar), sub: T("Draft → Pending review", "مسودة ← قيد المراجعة", ar) },
    // Hidden when the tenant auto-approves customers — nothing ever lands in the queue.
    ...(!autoApproveCustomers ? [{ href: "/kyc-queue", icon: ShieldCheck, iconBg: "bg-mk-mint-100", iconColor: "text-mk-mint-600", label: T(`Review KYC${data?.kycPending ? ` · ${data.kycPending}` : ""}`, `مراجعة الهوية${data?.kycPending ? ` · ${data.kycPending}` : ""}`, ar), sub: data?.kycOverdueSla ? T(`${data.kycOverdueSla} over SLA`, `${data.kycOverdueSla} تجاوزت المهلة`, ar) : undefined }] : []),
    { href: "/revenue", icon: BarChart3, iconBg: "bg-mk-warning-100", iconColor: "text-mk-warning", label: T("Open Reports", "فتح التقارير", ar), sub: T("This month", "هذا الشهر", ar) },
  ];

  const shown: ScheduleEntry[] = activityTab === "pickups"
    ? (data?.pickups ?? [])
    : activityTab === "returns"
      ? (data?.returns ?? [])
      : [...(data?.pickups ?? []), ...(data?.returns ?? [])];

  return (
    <div>
      {/* Alert banner — only when the backend reports overdue contracts */}
      {(data?.overdueCount ?? 0) > 0 && (
        <AlertBanner
          title={T(
            `${data!.overdueCount} contract${data!.overdueCount > 1 ? "s" : ""} overdue${data!.overdueRefs[0] ? ` · ${data!.overdueRefs[0]}` : ""}`,
            `${data!.overdueCount} ${data!.overdueCount > 1 ? "عقود متأخرة" : "عقد متأخر"}${data!.overdueRefs[0] ? ` · ${data!.overdueRefs[0]}` : ""}`,
            ar,
          )}
          sub={data!.overdueBannerNote}
          kind="danger"
          action={
            <Link
              href="/late-returns"
              className="flex items-center gap-1 px-4 py-2 rounded-full mk-body-sm text-white bg-mk-danger shrink-0"
            >
              {T("Resolve", "حل", ar)}
            </Link>
          }
        />
      )}

      {error === "forbidden" && (
        <AlertBanner
          kind="warning"
          title={T("You don't have access to the dashboard overview", "ليس لديك صلاحية عرض لوحة التحكم", ar)}
          sub={T("This endpoint requires the Permissions.Dashboard.ViewOverview permission — ask an admin to grant it to your role.", "هذا المورد يتطلب صلاحية Permissions.Dashboard.ViewOverview — اطلب من المسؤول منحها لدورك.", ar)}
        />
      )}
      {error === "generic" && (
        <AlertBanner
          kind="warning"
          title={T("Couldn't load the dashboard", "تعذّر تحميل لوحة التحكم", ar)}
          sub={T("Check your connection and try again.", "تحقق من الاتصال ثم أعد المحاولة.", ar)}
        />
      )}

      {/* KPI grid */}
      <div className="grid gap-4 mb-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {KPI_ROW.map((k) => (
          <KpiCard key={k.label} icon={k.icon} label={k.label} value={loading ? "—" : k.value} sub={k.sub} kind={k.kind} delta={k.delta} />
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {QA.map(({ href, icon: Icon, iconBg, iconColor, label, sub }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-lg px-4 sm:px-5 py-4 min-w-[200px] flex-1 mk-surface no-underline transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50"
          >
            <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
              <Icon size={18} />
            </div>
            <div>
              <div className="mk-body text-mk-ink-900">{label}</div>
              {sub && <div className="mk-overline text-mk-ink-500">{sub}</div>}
            </div>
          </Link>
        ))}
      </div>

      {/* Two-column grid */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-[2fr_1fr]">
        {/* Today's pickups */}
        <div className="rounded-xl p-4 sm:p-6 mk-surface">
          <div className="flex items-center gap-3 mb-4">
            <div className="mk-h4 flex-1 text-mk-ink-900 tracking-tight">
              {T("Today's pickups & returns", "تسليمات وإرجاعات اليوم", ar)}
            </div>
            <Link
              href="/bookings"
              className="mk-body-sm px-3 py-2 rounded-full bg-white border border-mk-border text-mk-ink-900 no-underline"
            >
              {T("Open all", "فتح الكل", ar)}
            </Link>
          </div>

          {/* Tab strip */}
          <Tabs
            variant="default"
            rounded="full"
            className="mb-4 w-fit"
            value={activityTab}
            onChange={setActivityTab}
            items={[
              { value: "pickups", label: T("Pickups", "التسليمات", ar), count: data?.pickups.length ?? 0 },
              { value: "returns", label: T("Returns", "الإرجاعات", ar), count: data?.returns.length ?? 0 },
              { value: "all", label: T("All activity", "كل النشاطات", ar), count: (data?.pickups.length ?? 0) + (data?.returns.length ?? 0) },
            ]}
          />

          <div className="flex flex-col gap-3">
            {loading ? (
              <div className="py-8 text-center mk-body-sm text-mk-ink-400">{T("Loading…", "جارٍ التحميل…", ar)}</div>
            ) : shown.length === 0 ? (
              <div className="py-8 text-center mk-body-sm text-mk-ink-400">
                {T("Nothing scheduled today.", "لا شيء مجدول اليوم.", ar)}
              </div>
            ) : (
              shown.map((b) => {
                const custName = (ar ? b.customerNameAr || b.customerName : b.customerNameEn || b.customerName) || "—";
                const detail = ar ? b.detailAr || b.detail : b.detailEn || b.detail;
                const note = b.note || [
                  b.unsigned ? T("Unsigned contract", "عقد غير موقّع", ar) : null,
                  b.kycPending ? T("KYC pending", "الهوية قيد المراجعة", ar) : null,
                  b.latenessMinutes ? T(`${b.latenessMinutes} min late`, `متأخر ${b.latenessMinutes} دقيقة`, ar) : null,
                ].filter(Boolean).join(" · ");
                return (
                <div
                  key={b.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg px-4 sm:px-5 py-4 bg-white border border-mk-ink-100 shadow-[var(--shadow-card)] cursor-pointer transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50"
                >
                  <div className="text-center min-w-14">
                    <div className="mk-h4 text-mk-ink-900">{b.time}</div>
                    <div className="mk-overline text-mk-ink-500">{b.ampm}</div>
                  </div>
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${b.kind === "pickup" ? "bg-mk-blue-50 text-mk-blue-500" : "bg-mk-warning/20 text-mk-warning"}`}>
                    {b.kind === "pickup" ? <KeyRound size={15} /> : <Undo2 size={15} />}
                  </div>
                  <Avatar name={custName} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="mk-body text-mk-ink-900">{custName}</div>
                    <div className="mk-caption text-mk-ink-500">
                      {detail}{b.ref ? <> · <span className="mk-label text-mk-blue-600">{b.ref}</span></> : null}
                    </div>
                    {note && <div className={`mk-caption mt-1 ${b.urgent ? "text-mk-danger" : "text-mk-warning"}`}>{note}</div>}
                  </div>
                  {b.urgent && <Badge variant="danger" dot>{T("Overdue", "متأخر", ar)}</Badge>}
                  <Link href={b.contractId != null ? `/contracts/${b.contractId}` : "/contracts"} className="no-underline">
                    <Button variant="outline" size="sm">{T("Open contract", "فتح العقد", ar)}</Button>
                  </Link>
                </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Revenue sparkline */}
          <div className="rounded-xl p-4 sm:p-6 mk-surface">
            <div className="flex items-center gap-3 mb-2">
              <div className="mk-h4 flex-1 text-mk-ink-900 tracking-tight">
                {period === "week" ? T("Revenue · 7 days", "الإيرادات · ٧ أيام", ar) : T("Revenue · 30 days", "الإيرادات · ٣٠ يوم", ar)}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={togglePeriod}
              >
                {period === "week" ? T("Month", "شهر", ar) : T("Week", "أسبوع", ar)}
              </Button>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="mk-h1 leading-none text-mk-ink-900 tracking-tight">
                {loading ? "—" : fmtMoney(data?.revenueTotal ?? 0)}
              </span>
              {data?.revenueDeltaPct != null && (
                <span className={`mk-body-sm ${data.revenueDeltaPct >= 0 ? "text-mk-success" : "text-mk-danger"}`}>
                  {data.revenueDeltaPct > 0 ? "+" : ""}{data.revenueDeltaPct}%
                </span>
              )}
            </div>
            {(data?.revenue.length ?? 0) > 1 && (
              <>
                <Spark data={data!.revenue.map((d) => d.value)} color="var(--color-mk-blue-500)" />
                <div className="flex justify-between mt-2 mk-overline text-mk-ink-500">
                  {(data!.revenue.length <= 10
                    ? data!.revenue
                    : [data!.revenue[0], data!.revenue[data!.revenue.length - 1]]
                  ).map((d, i) => <span key={i}>{d.label}</span>)}
                </div>
              </>
            )}
          </div>

          {/* Fleet status */}
          <div className="rounded-xl p-4 sm:p-6 mk-surface">
            <div className="mk-h4 mb-4 text-mk-ink-900">
              {T("Fleet status", "حالة الأسطول", ar)}
            </div>
            {loading ? (
              <div className="py-4 text-center mk-body-sm text-mk-ink-400">{T("Loading…", "جارٍ التحميل…", ar)}</div>
            ) : (data?.fleet.length ?? 0) === 0 ? (
              <div className="py-4 text-center mk-body-sm text-mk-ink-400">{T("No fleet data", "لا بيانات للأسطول", ar)}</div>
            ) : (
              data!.fleet.map((s) => {
                const meta = fleetMeta(s.key);
                return (
                  <div key={s.key} className="mb-3">
                    <div className="flex justify-between mk-body-sm mb-1">
                      <span className="mk-label text-mk-ink-900">{ar ? meta.ar : meta.en}</span>
                      <span className="text-mk-ink-500">{s.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden bg-mk-ink-100">
                      <div className={`h-full rounded-full ${meta.colorClass}`} style={{ width: `${data!.fleetTotal > 0 ? (s.count / data!.fleetTotal) * 100 : 0}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
