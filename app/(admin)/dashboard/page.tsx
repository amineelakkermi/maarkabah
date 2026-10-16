"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Car, FileSignature, ClockAlert, Banknote, Gauge,
  Plus, CarFront, ShieldCheck, BarChart3, KeyRound, Undo2, TrendingUp,
} from "lucide-react";
import { KpiCard, AlertBanner, Avatar, AreaChart, PieChart, Badge, Button, Tabs, Select, useCountUp } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { dashboardService } from "@/lib/api-services";
import { ApiError } from "@/lib/api-client";
import { normalizeOverview, type OverviewData, type ScheduleEntry } from "@/lib/dashboard";
import type { DashboardRevenuePeriod as Period } from "@/lib/api-types";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

// The fleet donut's groups — the same grouping the fleet screen's status tabs
// use; each legend row / slice deep-links to /fleet?status=<filter>.
const FLEET_GROUPS = [
  { filter: "available", label: "Available", labelAr: "متاحة", match: (s: string) => s === "available", colorClass: "bg-mk-mint-600", color: "var(--color-mk-mint-600)" },
  { filter: "rented", label: "Rented out", labelAr: "مؤجرة", match: (s: string) => s === "rented" || s === "reserved", colorClass: "bg-mk-blue-500", color: "var(--color-mk-blue-500)" },
  { filter: "overdue", label: "Overdue", labelAr: "متأخرة", match: (s: string) => s === "overdue", colorClass: "bg-mk-danger", color: "var(--color-mk-danger)" },
  { filter: "attention", label: "Needs attention", labelAr: "تحتاج متابعة", match: (s: string) => s === "maintenance" || s === "inactive" || s === "inspection", colorClass: "bg-mk-violet-500", color: "var(--color-mk-violet-500)" },
  { filter: "draft", label: "Draft", labelAr: "مسودة", match: (s: string) => s === "draft" || s === "pending", colorClass: "bg-mk-navy", color: "var(--color-mk-navy)" },
];

const PERIOD_OPTIONS: { value: Period; en: string; ar: string; titleEn: string; titleAr: string }[] = [
  { value: "week", en: "7 days", ar: "7 أيام", titleEn: "Revenue · 7 days", titleAr: "الإيرادات · 7 أيام" },
  { value: "month", en: "30 days", ar: "30 يوم", titleEn: "Revenue · 30 days", titleAr: "الإيرادات · 30 يوم" },
];

function fmtMoney(v: number): string {
  return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/** Revenue x-axis labels: ISO dates → weekday names for the week view, day numbers for the month view. */
function fmtRevLabel(label: string, period: Period, ar: boolean): string {
  const d = new Date(label);
  if (isNaN(d.getTime())) return label;
  return period === "week"
    ? d.toLocaleDateString(ar ? "ar-SA-u-nu-latn" : "en-US", { weekday: "short" })
    : String(d.getDate());
}

export default function DashboardPage() {
  const { dir } = useAdmin();
  const { autoApproveCustomers } = usePermissions();
  const ar = dir === "rtl";
  const router = useRouter();
  const [activityTab, setActivityTab] = useState("pickups");
  const [period, setPeriod] = useState<Period>("week");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [fleetActive, setFleetActive] = useState<number | null>(null);
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"forbidden" | "generic" | null>(null);
  const revenueRef = useRef<HTMLSpanElement>(null);
  const revenueTotal = useCountUp(fmtMoney(data?.revenueTotal ?? 0), { ref: revenueRef });

  useEffect(() => {
    let cancelled = false;
    dashboardService
      .overview({ branchId: selectedBranch === "all" ? null : Number(selectedBranch), revenuePeriod: period })
      .then((res) => { if (!cancelled) { setData(normalizeOverview(res)); setError(null); } })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError && err.status === 403 ? "forbidden" : "generic");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [period, selectedBranch]);

  const kpi = (key: string) => data?.kpis.find((k) => k.key === key)?.value ?? 0;
  const avg = (key: string) => data?.kpis.find((k) => k.key === key)?.average7d;
  const delta = (key: string) => {
    const d = data?.kpis.find((k) => k.key === key)?.deltaPct;
    return d == null ? undefined : { dir: (d >= 0 ? "up" : "down") as "up" | "down", value: `${d > 0 ? "+" : ""}${d}%` };
  };
  const avgSub = (key: string) => {
    const a = avg(key);
    return a != null ? T(`7-day avg: ${a}`, `${a} · المتوسط الأسبوعي`, ar) : undefined;
  };

  const KPI_ROW = [
    { icon: Car, label: T("Available Cars", "المركبات المتاحة", ar), value: String(kpi("availableCars")), sub: avgSub("availableCars") ?? (data ? T(`of ${data.fleetTotal} total`, `من إجمالي ${data.fleetTotal}`, ar) : undefined), kind: "default" as const, delta: delta("availableCars") },
    { icon: FileSignature, label: T("Active Contracts", "العقود النشطة", ar), value: String(kpi("activeContracts")), sub: avgSub("activeContracts") ?? (data ? T(`${data.pickups.length} picking up today`, `${data.pickups.length} تسليم اليوم`, ar) : undefined), kind: "violet" as const, delta: delta("activeContracts") },
    { icon: ClockAlert, label: T("Late Returns", "الإرجاع المتأخر", ar), value: String(data?.overdueCount ?? kpi("lateReturns")), sub: avgSub("lateReturns") ?? (data?.overdueRefs.slice(0, 2).join(", ") || undefined), kind: "alert" as const, delta: delta("lateReturns") },
    { icon: Banknote, label: T("Today's Revenue", "إيرادات اليوم", ar), value: fmtMoney(kpi("todayRevenue")), sub: avgSub("todayRevenue") ?? T("SAR", "ريال", ar), kind: "mint" as const, delta: delta("todayRevenue") },
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

  const revenueOption = PERIOD_OPTIONS.find((o) => o.value === period)!;

  // Fleet donut groups — empty groups are left out; largest first → outermost ring.
  const FLEET_STATUS = FLEET_GROUPS
    .map((g) => ({ ...g, count: (data?.fleet ?? []).filter((s) => g.match(s.key)).reduce((sum, s) => sum + s.count, 0) }))
    .filter((g) => g.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <div>
      {/* Alert banner — only when the backend reports overdue contracts */}
      {(data?.overdueCount ?? 0) > 0 && (
        <div className="mk-enter" style={{ "--o": 0 } as CSSProperties}>
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
        </div>
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
      <div className="mk-seq grid gap-4 mb-6 grid-cols-2 lg:grid-cols-4" style={{ "--seq-start": 1 } as CSSProperties}>
        {KPI_ROW.map((k) => (
          <KpiCard key={k.label} icon={k.icon} label={k.label} value={loading ? "—" : k.value} sub={k.sub} kind={k.kind} delta={k.delta} />
        ))}
      </div>

   

      {/* Two-column grid */}
      <div className="mk-seq grid gap-4 grid-cols-1 lg:grid-cols-[2fr_1fr]" style={{ "--seq-start": 9 } as CSSProperties}>
        {/* Today's pickups */}
        <div className="min-w-0 rounded-xl p-5 mk-panel">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div className="mk-h4 text-mk-ink-900 flex-1 min-w-0">
              {T("Today's pickups & returns", "تسليمات وإرجاعات اليوم", ar)}
            </div>
            {(data?.branches.length ?? 0) > 0 && (
              <div className="w-fit shrink-0">
                <Select
                  size="sm"
                  fitWidth
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  aria-label={T("Filter by branch", "فلترة حسب الفرع", ar)}
                >
                  <option value="all">{T("All branches", "جميع الفروع", ar)}</option>
                  {data!.branches.map((b) => (
                    <option key={b.id} value={String(b.id)}>
                      {ar ? b.nameAr || b.nameEn : b.nameEn || b.nameAr}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>

          {/* Tab strip */}
          <div className="mb-4">
            <Tabs
              variant="default"
              rounded="full"
              value={activityTab}
              onChange={setActivityTab}
              items={[
                { value: "pickups", label: T("Pickups", "التسليمات", ar), count: data?.pickups.length ?? 0 },
                { value: "returns", label: T("Returns", "الإرجاعات", ar), count: data?.returns.length ?? 0 },
                { value: "all", label: T("All activity", "كل النشاطات", ar), count: (data?.pickups.length ?? 0) + (data?.returns.length ?? 0) },
              ]}
            />
          </div>

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
                  className={`${b.urgent ? "mk-row-urgent" : "mk-row mk-row-blue-hover"} flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg p-3.5 sm:px-4 sm:py-3 cursor-pointer`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="text-center shrink-0 min-w-12">
                      <div className="mk-h4 text-mk-ink-900 leading-tight">{b.time}</div>
                      <div className="mk-overline text-mk-ink-500">{b.ampm}</div>
                    </div>
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${b.kind === "pickup" ? "bg-mk-blue-50 text-mk-blue-500" : "bg-mk-warning/20 text-mk-warning"}`}>
                      {b.kind === "pickup" ? <KeyRound size={15} /> : <Undo2 size={15} />}
                    </div>
                    <Avatar name={custName} size="md" className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="mk-body text-mk-ink-900 truncate font-medium">{custName}</div>
                      <div className="mk-caption text-mk-ink-500 truncate">
                        {detail}{b.ref ? <> · <span className="mk-label text-mk-blue-600 font-mono">{b.ref}</span></> : null}
                      </div>
                      {note && <div className={`mk-caption mt-1 ${b.urgent ? "text-mk-danger" : "text-mk-warning"}`}>{note}</div>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-mk-ink-200/60">
                    {b.urgent && <Badge variant="danger" dot>{T("Overdue", "متأخر", ar)}</Badge>}
                    <Link href={b.contractId != null ? `/contracts/${b.contractId}` : "/contracts"} className="no-underline">
                      <Button variant="outline" size="sm">{T("Open contract", "فتح العقد", ar)}</Button>
                    </Link>
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="min-w-0 flex flex-col gap-4">
          {/* Revenue chart */}
          <div className="rounded-xl p-5 mk-panel">
            <div className="flex items-center gap-3 mb-2">
              <div className="mk-h4 flex-1 text-mk-ink-900">
                {T(revenueOption.titleEn, revenueOption.titleAr, ar)}
              </div>
              <div className="w-fit shrink-0">
                <Select
                  size="sm"
                  fitWidth
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as Period)}
                  aria-label={T("Revenue period", "فترة الإيرادات", ar)}
                >
                  {PERIOD_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{ar ? o.ar : o.en}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span ref={revenueRef} className="mk-kpi-value mk-h1 leading-none text-mk-ink-900 tracking-tight">{loading ? "—" : revenueTotal}</span>
              {data?.revenueDeltaPct != null && (
                <span className={`mk-pill-pop inline-flex items-center gap-1 mk-caption font-medium px-2 py-0.5 rounded-full ${data.revenueDeltaPct >= 0 ? "bg-mk-success-100 text-mk-success-700" : "bg-mk-danger-100 text-mk-danger-700"}`}>
                  <TrendingUp size={12} className={data.revenueDeltaPct < 0 ? "rotate-180" : undefined} />
                  {data.revenueDeltaPct > 0 ? "+" : ""}{data.revenueDeltaPct}%
                </span>
              )}
            </div>
            {(data?.revenue.length ?? 0) > 1 && (
              <AreaChart
                key={period}
                data={data!.revenue.map((d) => ({ label: fmtRevLabel(d.label, period, ar), value: d.value }))}
                color="var(--color-mk-blue-500)"
                gradient
                height={120}
                formatValue={(v) => `${v.toLocaleString("en-US")} ${T("SAR", "ريال", ar)}`}
                ariaLabel={T(revenueOption.titleEn, revenueOption.titleAr, ar)}
              />
            )}
          </div>

          {/* Fleet utilization — share of the fleet out on contracts */}
          <KpiCard
            icon={Gauge}
            kind="default"
            surface="plain"
            label={T("Fleet Utilization", "استخدام الأسطول", ar)}
            value={loading ? "—" : `${kpi("fleetUtilization")}%`}
            sub={avg("fleetUtilization") != null ? T(`7-day avg: ${avg("fleetUtilization")}%`, `${avg("fleetUtilization")}% · المتوسط الأسبوعي`, ar) : undefined}
            delta={delta("fleetUtilization")}
            progress={kpi("fleetUtilization")}
          />

          {/* Fleet status — donut (total in the center) + interactive legend:
              hover a row (or a slice) to highlight it on both; click to open
              the filtered fleet screen. */}
          <div className="@container rounded-xl p-5 mk-panel">
            <div className="mk-h4 mb-2 text-mk-ink-900">
              {T("Fleet status", "حالة الأسطول", ar)}
            </div>
            {loading ? (
              <div className="py-8 text-center mk-body-sm text-mk-ink-400">{T("Loading…", "جارٍ التحميل…", ar)}</div>
            ) : FLEET_STATUS.length === 0 ? (
              <div className="py-8 text-center mk-body-sm text-mk-ink-400">{T("No fleet data", "لا بيانات للأسطول", ar)}</div>
            ) : (
              <div className="flex flex-col items-center gap-4 @xl:flex-row @xl:justify-between @xl:gap-3">
                <div className="shrink-0 max-w-full">
                  <PieChart
                    data={FLEET_STATUS.map((s) => ({ label: ar ? s.labelAr : s.label, value: s.count, color: s.color }))}
                    size={270}
                    variant="rings"
                    gradientLargest
                    onSliceClick={(i) => router.push(`/fleet?status=${FLEET_STATUS[i].filter}`)}
                    totalLabel={T("vehicles", "مركبة", ar)}
                    activeIndex={fleetActive}
                    onActiveChange={setFleetActive}
                    ariaLabel={T("Fleet split across availability, rented, maintenance and draft", "توزيع الأسطول: متاحة، مؤجرة، صيانة، مسودة", ar)}
                  />
                </div>
                {/* Legend — largest group's dot carries the same brand gradient as its ring */}
                <div className="flex flex-col gap-0.5 w-full @xl:w-auto @xl:shrink-0">
                  {FLEET_STATUS.map((s, i) => {
                    const total = FLEET_STATUS.reduce((sum, x) => sum + x.count, 0);
                    const biggest = i === 0; // sorted desc — the first group is the largest
                    return (
                      <Link
                        key={s.filter}
                        href={`/fleet?status=${s.filter}`}
                        onPointerEnter={() => setFleetActive(i)}
                        onPointerLeave={() => setFleetActive(null)}
                        onFocus={() => setFleetActive(i)}
                        onBlur={() => setFleetActive(null)}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg no-underline transition-colors ${fleetActive === i ? "bg-mk-blue-surface" : ""}`}
                      >
                        <span aria-hidden className={`w-2.5 h-2.5 rounded-full shrink-0 ${biggest ? "" : s.colorClass}`} style={biggest ? { background: "var(--gradient-brand-diagonal)" } : undefined} />
                        <span className="mk-caption text-mk-ink-700 whitespace-nowrap">{ar ? s.labelAr : s.label}</span>
                        <span className="mk-kpi-value mk-label text-mk-ink-900">{s.count}</span>
                        <span className="mk-overline text-mk-ink-500">{Math.round((s.count / total) * 100)}%</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
