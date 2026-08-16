"use client";

import { AlertOctagon, Clock, Banknote, MessageSquareWarning } from "lucide-react";
import { KpiCard, AlertBanner, Avatar, Badge, Button, Table, Th, Td, type BadgeVariant } from "@/components/ui";
import { LATE_RETURNS } from "@/lib/data";
import { useAdmin } from "@/contexts/AdminContext";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  active: "danger",
  disputed: "warning",
  resolved: "success",
};

export default function LateReturnsPage() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const overdue = LATE_RETURNS.filter((r) => r.status === "active").length;

  const KPIS = [
    { icon: AlertOctagon, label: T("Currently Overdue", "المتأخرة حالياً", ar), value: "2", sub: T("Auto-charging", "خصم تلقائي", ar), kind: "alert" as const },
    { icon: Clock, label: T("Avg Lateness", "متوسط التأخر", ar), value: T("1h 38m", "١س ٣٨د", ar), sub: T("this week", "هذا الأسبوع", ar), kind: "default" as const },
    { icon: Banknote, label: T("Penalties This Month", "غرامات هذا الشهر", ar), value: "3,420", sub: T("SAR · 17 incidents", "ريال · ١٧ حادثة", ar), kind: "warn" as const },
    { icon: MessageSquareWarning, label: T("Disputes Open", "نزاعات مفتوحة", ar), value: "1", sub: "MK-2401", kind: "violet" as const },
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
          sub={T("Grace period (1h) has passed. Daily rate ÷ 8 per hour. 4h = full extra day.", "انتهت فترة السماح (ساعة). السعر اليومي ÷ ٨ لكل ساعة. ٤ ساعات = يوم كامل إضافي.", ar)}
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
              {LATE_RETURNS.map((r) => {
                const variant = STATUS_VARIANT[r.status] ?? "neutral";
                return (
                  <tr key={r.ref} className={`cursor-pointer transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50 ${r.status === "active" ? "bg-mk-danger/[0.03]" : ""}`}>
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
                        <Button variant="primary" size="sm">{T("Resolve", "حل", ar)}</Button>
                      ) : r.status === "disputed" ? (
                        <Button variant="outline" size="sm" className="border-mk-warning text-mk-warning">
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
      </div>

      {/* Policy card */}
      <div className="rounded-xl p-6 mt-4 mk-surface">
        <div className="mk-h4 mb-4 text-mk-ink-900">{T("Late-return penalty rules", "قواعد غرامة التأخر في الإرجاع", ar)}</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { windowEn: "Grace period", windowAr: "فترة السماح", ruleEn: "1h after due time — no charge", ruleAr: "ساعة بعد الموعد — بدون رسوم", cls: "text-mk-success" },
            { windowEn: "Per-hour rate", windowAr: "السعر بالساعة", ruleEn: "Daily rate ÷ 8 per hour", ruleAr: "السعر اليومي ÷ ٨ لكل ساعة", cls: "text-mk-blue-500" },
            { windowEn: "Cap at full day", windowAr: "حد اليوم الكامل", ruleEn: "4 hours or more = 1 full extra day", ruleAr: "٤ ساعات أو أكثر = يوم كامل إضافي", cls: "text-mk-warning" },
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
