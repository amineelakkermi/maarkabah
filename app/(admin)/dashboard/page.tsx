"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Car, FileSignature, ClockAlert, Banknote, Gauge,
  Plus, CarFront, ShieldCheck, BarChart3,
} from "lucide-react";
import { KpiCard, AlertBanner, Avatar, Spark, Badge, Button, Tabs } from "@/components/ui";
import { BOOKINGS, REVENUE_WEEK } from "@/lib/data";
import { useAdmin } from "@/contexts/AdminContext";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

const FLEET_STATUS = [
  { label: "Available", labelAr: "متاحة", count: 14, colorClass: "bg-mk-mint-600" },
  { label: "Rented out", labelAr: "مؤجرة", count: 6, colorClass: "bg-mk-blue-500" },
  { label: "Maintenance", labelAr: "صيانة", count: 1, colorClass: "bg-mk-violet-500" },
  { label: "Draft / pending", labelAr: "مسودة / معلق", count: 1, colorClass: "bg-mk-ink-400" },
];

const PICKUPS = BOOKINGS.filter((b) => b.type === "pickup").slice(0, 3);

export default function DashboardPage() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const [activityTab, setActivityTab] = useState("pickups");

  const KPI_ROW = [
    { icon: Car, label: T("Available Cars", "المركبات المتاحة", ar), value: "14", sub: T("of 22 total", "من إجمالي ٢٢", ar), kind: "default" as const, delta: { dir: "up" as const, value: "+2" } },
    { icon: FileSignature, label: T("Active Contracts", "العقود النشطة", ar), value: "6", sub: T("2 picking up today", "٢ تسليم اليوم", ar), kind: "violet" as const },
    { icon: ClockAlert, label: T("Late Returns", "الإرجاع المتأخر", ar), value: "2", sub: "MK-2420, MK-2418", kind: "alert" as const },
    { icon: Banknote, label: T("Today's Revenue", "إيرادات اليوم", ar), value: "4,820", sub: T("SAR · 3 contracts", "ريال · ٣ عقود", ar), kind: "mint" as const, delta: { dir: "up" as const, value: "+18%" } },
    { icon: Gauge, label: T("Fleet Utilization", "استخدام الأسطول", ar), value: "68%", sub: T("7-day avg", "متوسط ٧ أيام", ar), kind: "warn" as const, delta: { dir: "down" as const, value: "-3%" } },
  ];

  const QA = [
    { href: "/bookings", icon: Plus, iconBg: "bg-mk-blue-50", iconColor: "text-mk-blue-500", label: T("Create Contract", "إنشاء عقد", ar), sub: T("3 steps · walk-in or phone", "٣ خطوات · حضوري أو هاتفي", ar) },
    { href: "/fleet", icon: CarFront, iconBg: "bg-mk-violet-100/60", iconColor: "text-mk-violet-500", label: T("Add Car", "إضافة مركبة", ar), sub: T("Draft → Pending review", "مسودة ← قيد المراجعة", ar) },
    { href: "/kyc-queue", icon: ShieldCheck, iconBg: "bg-mk-mint-100", iconColor: "text-mk-mint-600", label: T("Review KYC · 4", "مراجعة الهوية · 4", ar), sub: T("2 over 2h SLA", "٢ تجاوزت مهلة ساعتين", ar) },
    { href: "/revenue", icon: BarChart3, iconBg: "bg-mk-warning-100", iconColor: "text-mk-warning", label: T("Open Reports", "فتح التقارير", ar), sub: T("5 KPIs · this month", "٥ مؤشرات · هذا الشهر", ar) },
  ];

  return (
    <div>
      {/* Alert banner */}
      <AlertBanner
        title={T("2 contracts overdue · MK-2420 returning 2h 14m late", "عقدان متأخران · MK-2420 متأخر ساعتان و١٤ دقيقة", ar)}
        sub={T("Auto-reminder sent. Hourly penalty engaged: 35 SAR/hr after grace.", "تم إرسال تذكير تلقائي. غرامة بالساعة: ٣٥ ريال/ساعة بعد فترة السماح.", ar)}
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

      {/* KPI grid */}
      <div className="grid gap-4 mb-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {KPI_ROW.map((k) => (
          <KpiCard key={k.label} icon={k.icon} label={k.label} value={k.value} sub={k.sub} kind={k.kind} delta={k.delta} />
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {QA.map(({ href, icon: Icon, iconBg, iconColor, label, sub }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-lg px-5 py-4 min-w-[200px] mk-surface no-underline transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50"
          >
            <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
              <Icon size={18} />
            </div>
            <div>
              <div className="mk-body text-mk-ink-900">{label}</div>
              <div className="mk-overline text-mk-ink-500">{sub}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Two-column grid */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-[2fr_1fr]">
        {/* Today's pickups */}
        <div className="rounded-xl p-6 mk-surface">
          <div className="flex items-center gap-3 mb-4">
            <div className="mk-h4 flex-1 text-mk-ink-900 tracking-tight">
              {T("Today's pickups & returns", "تسليمات وإرجاعات اليوم", ar)}
            </div>
            <span className="mk-caption text-mk-ink-500">
              {T("Riyadh — Olaya · last sync 14s ago", "الرياض — العليا · آخر مزامنة قبل ١٤ث", ar)}
            </span>
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
              { value: "pickups", label: T("Pickups · 3", "التسليمات · ٣", ar) },
              { value: "returns", label: T("Returns · 2", "الإرجاعات · ٢", ar) },
              { value: "all", label: T("All activity", "كل النشاطات", ar) },
            ]}
          />

          <div className="flex flex-col gap-3">
            {PICKUPS.map((b) => (
              <div
                key={b.id}
                className="flex flex-wrap items-center gap-3 rounded-lg px-5 py-4 bg-white border border-mk-ink-100 shadow-[var(--shadow-card)] cursor-pointer transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50"
              >
                <div className="text-center min-w-14">
                  <div className="mk-h4 text-mk-ink-900">{b.time}</div>
                  <div className="mk-overline text-mk-ink-500">PM</div>
                </div>
                <Avatar name={b.customer} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="mk-body text-mk-ink-900">{b.customer}</div>
                  <div className="mk-caption text-mk-ink-500">
                    {b.car} · <span className="mk-label text-mk-blue-600">{b.id}</span>
                  </div>
                </div>
                <Badge variant="success" dot>{T("Ready", "جاهز", ar)}</Badge>
                <Button variant="outline" size="sm">{T("Open contract", "فتح العقد", ar)}</Button>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Revenue sparkline */}
          <div className="rounded-xl p-6 mk-surface">
            <div className="flex items-center gap-3 mb-2">
              <div className="mk-h4 flex-1 text-mk-ink-900">
                {T("Revenue · 7 days", "الإيرادات · ٧ أيام", ar)}
              </div>
              <Button variant="outline" size="sm">{T("Month", "شهر", ar)}</Button>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="mk-h1 leading-none text-mk-ink-900 tracking-tight">32,940</span>
              <span className="mk-body-sm text-mk-success">+12.4%</span>
            </div>
            <Spark data={REVENUE_WEEK.map((d) => d.value)} color="var(--color-mk-blue-500)" />
            <div className="flex justify-between mt-2 mk-overline text-mk-ink-500">
              {(ar
                ? ["إث", "ثل", "أر", "خم", "جم", "سب", "أح"]
                : REVENUE_WEEK.map((d) => d.day)
              ).map((d) => <span key={d}>{d}</span>)}
            </div>
          </div>

          {/* Fleet status */}
          <div className="rounded-xl p-6 mk-surface">
            <div className="mk-h4 mb-4 text-mk-ink-900">
              {T("Fleet status", "حالة الأسطول", ar)}
            </div>
            {FLEET_STATUS.map((s) => (
              <div key={s.label} className="mb-3">
                <div className="flex justify-between mk-body-sm mb-1">
                  <span className="mk-label text-mk-ink-900">{ar ? s.labelAr : s.label}</span>
                  <span className="text-mk-ink-500">{s.count}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden bg-mk-ink-100">
                  <div className={`h-full rounded-full ${s.colorClass}`} style={{ width: `${(s.count / 22) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
