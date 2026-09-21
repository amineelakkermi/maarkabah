"use client";

import { useState, useEffect } from "react";
import { AlertOctagon, Clock, Banknote, MessageSquareWarning } from "lucide-react";
import { KpiCard, AlertBanner, Avatar, Badge, Button, Table, Th, Td, type BadgeVariant } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { useRouter } from "next/navigation";
import { lateReturnsService, pricingService } from "@/lib/api-services";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  active: "danger",
  disputed: "warning",
  resolved: "success",
};

function normalizeDisplayStatus(s: unknown): string {
  const v = String(s ?? "").toLowerCase();
  if (v.includes("disput")) return "disputed";
  if (v.includes("resolv") || v.includes("closed") || v.includes("complet")) return "resolved";
  return "active";
}

interface LateReturnRow {
  navId: string;
  ref: string;
  customer: string;
  car: string;
  due: string;
  returned: string;
  lateBy: string;
  calc: string;
  penalty: number;
  status: string;
}

function fmtDateTime(iso: unknown): string {
  const d = iso ? new Date(String(iso)) : null;
  return d && !isNaN(d.getTime())
    ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
    : "";
}

function fmtDuration(minutes: number): string {
  if (!isFinite(minutes) || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(item: any, ar: boolean): LateReturnRow {
  const lateMinutes = Number(item.lateMinutes ?? item.lateByMinutes ?? item.minutesLate ?? 0);
  const lateHours = Number(item.lateHours ?? 0);
  return {
    navId: String(item.contractId ?? item.id ?? ""),
    ref: String(item.contractNumber ?? item.tajeerContractNumber ?? item.contractRef ?? item.id ?? ""),
    customer: (ar ? item.customerNameAr : item.customerNameEn) ?? item.customerName ?? item.customerNameEn ?? item.customerNameAr ?? item.customer?.fullNameEn ?? "",
    car: item.vehicleName ?? [
      (ar ? item.vehicleMakeNameAr : item.vehicleMakeNameEn) ?? item.vehicleMakeNameEn ?? item.vehicleMakeNameAr,
      (ar ? item.vehicleModelNameAr : item.vehicleModelNameEn) ?? item.vehicleModelNameEn ?? item.vehicleModelNameAr,
      item.vehicleYear ?? item.year,
    ].filter(Boolean).join(" "),
    due: fmtDateTime(item.endAt ?? item.dueAt ?? item.expectedReturnAt),
    returned: fmtDateTime(item.actualReturnAt ?? item.returnedAt) || "—",
    lateBy: lateMinutes > 0 ? fmtDuration(lateMinutes) : lateHours > 0 ? fmtDuration(lateHours * 60) : String(item.lateBy ?? "—"),
    calc: String(item.penaltyCalc ?? item.calcDescription ?? item.calc ?? "—"),
    penalty: Number(item.penaltyAmount ?? item.lateFeeAmount ?? item.penalty ?? 0),
    status: normalizeDisplayStatus(item.displayStatus ?? item.status),
  };
}

export default function LateReturnsPage() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const router = useRouter();

  const [rows, setRows] = useState<LateReturnRow[]>([]);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stats, setStats] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [penalty, setPenalty] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await lateReturnsService.search({ pageNumber: 1, pageSize: 50 });
        if (cancelled) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items: any[] = res?.items ?? res?.data?.items ?? res?.data ?? [];
        setRows((Array.isArray(items) ? items : []).map((it) => mapRow(it, ar)));
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    lateReturnsService.getStats()
      .then((s) => { if (!cancelled) setStats(s?.data ?? s); })
      .catch(() => {});
    pricingService.getLateReturnPenalty()
      .then((p) => { if (!cancelled) setPenalty(p?.data ?? p); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [ar]);

  const overdue = stats?.currentlyOverdue ?? stats?.overdueCount ?? rows.filter((r) => r.status === "active").length;
  const openDisputes = stats?.openDisputes ?? stats?.disputesOpen ?? rows.filter((r) => r.status === "disputed").length;
  const avgLate = stats?.avgLatenessMinutes != null ? fmtDuration(Number(stats.avgLatenessMinutes)) : (stats?.avgLateness ?? "—");
  const penaltiesMonth = stats?.penaltiesThisMonth ?? stats?.penaltiesAmountThisMonth ?? "—";
  const penaltiesCount = stats?.penaltiesCount ?? stats?.incidentsThisMonth;

  const graceHours = penalty?.graceHours ?? 1;
  const perHourDivisor = penalty?.perHourDivisor ?? 8;
  const fullDayHours = penalty?.fullDayThresholdHours ?? 4;

  const KPIS = [
    { icon: AlertOctagon, label: T("Currently Overdue", "المتأخرة حالياً", ar), value: String(overdue), sub: T("Auto-charging", "خصم تلقائي", ar), kind: "alert" as const },
    { icon: Clock, label: T("Avg Lateness", "متوسط التأخر", ar), value: String(avgLate), sub: T("this week", "هذا الأسبوع", ar), kind: "default" as const },
    { icon: Banknote, label: T("Penalties This Month", "غرامات هذا الشهر", ar), value: String(penaltiesMonth), sub: penaltiesCount != null ? T(`SAR · ${penaltiesCount} incidents`, `ريال · ${penaltiesCount} حادثة`, ar) : T("SAR", "ريال", ar), kind: "warn" as const },
    { icon: MessageSquareWarning, label: T("Disputes Open", "نزاعات مفتوحة", ar), value: String(openDisputes), sub: "", kind: "violet" as const },
  ];

  const STATUS_LABEL: Record<string, string> = {
    active: T("Active", "نشط", ar),
    disputed: T("Disputed", "متنازع", ar),
    resolved: T("Resolved", "تم الحل", ar),
  };

  return (
    <div>
      {overdue > 0 && (
        <AlertBanner
          title={T(`${overdue} vehicles currently overdue — penalties accruing`, `${overdue} مركبات متأخرة حالياً — الغرامات تتراكم`, ar)}
          sub={T(`Grace period (${graceHours}h) has passed. Daily rate ÷ ${perHourDivisor} per hour. ${fullDayHours}h = full extra day.`, `انتهت فترة السماح (${graceHours} س). السعر اليومي ÷ ${perHourDivisor} لكل ساعة. ${fullDayHours} ساعات = يوم كامل إضافي.`, ar)}
          kind="danger"
        />
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {KPIS.map((k) => (
          <KpiCard key={k.label} icon={k.icon} label={k.label} value={k.value} sub={k.sub} kind={k.kind} />
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden mk-surface">
        <div className="overflow-x-auto">
          <Table className="min-w-[760px]">
            <thead>
              <tr>
                {[
                  T("Contract", "العقد", ar),
                  T("Customer", "العميل", ar),
                  T("Car", "المركبة", ar),
                  T("Due / Returned", "الموعد / الإرجاع", ar),
                  T("Late by", "التأخر", ar),
                  T("Calc", "الاحتساب", ar),
                  T("Penalty", "الغرامة", ar),
                  T("Status", "الحالة", ar),
                  "",
                ].map((h, i) => <Th key={i}>{h}</Th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const variant = STATUS_VARIANT[r.status] ?? "neutral";
                return (
                  <tr
                    key={r.navId}
                    className={`cursor-pointer transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50 ${r.status === "active" ? "bg-mk-danger/[0.03]" : ""}`}
                    onClick={() => r.navId && router.push(`/contracts/${r.navId}`)}
                  >
                    <Td className="font-mono mk-label text-mk-blue-600">{r.ref}</Td>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={r.customer} size="sm" />
                        <div className="mk-body text-mk-ink-900">{r.customer}</div>
                      </div>
                    </Td>
                    <Td className="mk-label text-mk-ink-700">{r.car}</Td>
                    <Td>
                      <div className="mk-label text-mk-ink-900">{r.due}</div>
                      <div className="mk-caption text-mk-ink-500">{r.returned}</div>
                    </Td>
                    <Td><Badge variant={variant} dot>{r.lateBy}</Badge></Td>
                    <Td className="mk-caption text-mk-ink-500">{r.calc}</Td>
                    <Td className="mk-body-sm text-mk-ink-900">
                      {r.penalty > 0 ? `${r.penalty.toLocaleString()} ${T("SAR", "ريال", ar)}` : "—"}
                    </Td>
                    <Td><Badge variant={variant}>{STATUS_LABEL[r.status] ?? r.status}</Badge></Td>
                    <Td>
                      {r.status === "active" ? (
                        <Button variant="primary" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/contracts/${r.navId}`); }}>{T("Resolve", "حل", ar)}</Button>
                      ) : r.status === "disputed" ? (
                        <Button variant="outline" size="sm" className="border-mk-warning text-mk-warning" onClick={(e) => { e.stopPropagation(); router.push(`/contracts/${r.navId}`); }}>
                          {T("Open dispute", "فتح النزاع", ar)}
                        </Button>
                      ) : (
                        <Badge variant="success">{T("Resolved", "تم الحل", ar)}</Badge>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>{/* end overflow-x-auto */}
        {loading && (
          <div className="py-16 text-center">
            <div className="mk-body-sm text-mk-ink-600">{T("Loading…", "جارٍ التحميل…", ar)}</div>
          </div>
        )}
        {!loading && rows.length === 0 && (
          <div className="py-16 text-center">
            <div className="mk-h1 mb-2">📋</div>
            <div className="mk-body-sm text-mk-ink-600">{T("No late returns found", "لا توجد إرجاعات متأخرة", ar)}</div>
          </div>
        )}
      </div>

      {/* Policy card */}
      <div className="rounded-xl p-6 mt-4 mk-surface">
        <div className="mk-h4 mb-4 text-mk-ink-900">{T("Late-return penalty rules", "قواعد غرامة التأخر في الإرجاع", ar)}</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { windowEn: "Grace period", windowAr: "فترة السماح", ruleEn: `${graceHours}h after due time — no charge`, ruleAr: `${graceHours} ساعة بعد الموعد — بدون رسوم`, cls: "text-mk-success" },
            { windowEn: "Per-hour rate", windowAr: "السعر بالساعة", ruleEn: `Daily rate ÷ ${perHourDivisor} per hour`, ruleAr: `السعر اليومي ÷ ${perHourDivisor} لكل ساعة`, cls: "text-mk-blue-500" },
            { windowEn: "Cap at full day", windowAr: "حد اليوم الكامل", ruleEn: `${fullDayHours} hours or more = 1 full extra day`, ruleAr: `${fullDayHours} ساعات أو أكثر = يوم كامل إضافي`, cls: "text-mk-warning" },
          ].map((p) => (
            <div key={p.windowEn} className="p-4 rounded-md bg-mk-ink-50">
              <div className={`mk-label mb-1 ${p.cls}`}>{ar ? p.windowAr : p.windowEn}</div>
              <div className="mk-label text-mk-ink-700">{ar ? p.ruleAr : p.ruleEn}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
