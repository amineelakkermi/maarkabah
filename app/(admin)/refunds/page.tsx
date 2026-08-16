"use client";

import { Hourglass, CheckCircle, Undo2 } from "lucide-react";
import { KpiCard, Badge, Button, Table, Th, Td, type BadgeVariant } from "@/components/ui";
import { REFUNDS } from "@/lib/data";
import { useAdmin } from "@/contexts/AdminContext";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

const STATUS_MAP: Record<string, { variant: BadgeVariant; labelEn: string; labelAr: string }> = {
  pending: { variant: "warning", labelEn: "Pending", labelAr: "معلق" },
  refunded: { variant: "success", labelEn: "Refunded", labelAr: "مسترد" },
  disputed: { variant: "danger", labelEn: "Disputed", labelAr: "متنازع" },
};

const CANCEL_ROWS = [
  { windowEn: "24h+ before pickup", windowAr: "قبل ٢٤س+ من التسليم", refundEn: "100%", refundAr: "١٠٠٪", cls: "text-mk-mint-600" },
  { windowEn: "2 – 24h before", windowAr: "قبل ٢ – ٢٤ ساعة", refundEn: "50%", refundAr: "٥٠٪", cls: "text-mk-warning" },
  { windowEn: "Under 2h", windowAr: "أقل من ساعتين", refundEn: "No refund", refundAr: "لا استرداد", cls: "text-mk-danger" },
];

export default function RefundsPage() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";

  const KPIS = [
    { icon: Hourglass, label: T("Pending Refunds", "المستردات المعلقة", ar), value: "3", sub: T("1,840 SAR", "١٬٨٤٠ ريال", ar), kind: "warn" as const },
    { icon: CheckCircle, label: T("Refunded · MTD", "تم استرداده · هذا الشهر", ar), value: "14", sub: T("6,420 SAR", "٦٬٤٢٠ ريال", ar), kind: "mint" as const },
    { icon: Undo2, label: T("Avg Processing", "متوسط المعالجة", ar), value: T("1.4 d", "١٫٤ يوم", ar), sub: T("Moyasar gateway", "بوابة مُيسّر", ar), kind: "default" as const },
  ];

  return (
    <div>
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {KPIS.map((k) => (
          <KpiCard key={k.label} icon={k.icon} label={k.label} value={k.value} sub={k.sub} kind={k.kind} />
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden mk-surface">
        <Table>
          <thead>
            <tr>
              {[
                T("Ref", "رقم العقد", ar),
                T("Customer", "العميل", ar),
                T("Reason", "السبب", ar),
                T("Refund window", "نافذة الاسترداد", ar),
                T("Original", "الأصلي", ar),
                T("Refund", "الاسترداد", ar),
                T("Status", "الحالة", ar),
                "",
              ].map((h, i) => <Th key={i}>{h}</Th>)}
            </tr>
          </thead>
          <tbody>
            {REFUNDS.map((r) => {
              const ss = STATUS_MAP[r.status] ?? { variant: "neutral" as const, labelEn: r.status, labelAr: r.status };
              return (
                <tr key={r.ref} className="cursor-pointer transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50">
                  <Td className="font-mono mk-label text-mk-blue-600">{r.ref}</Td>
                  <Td className="mk-label text-mk-ink-900">{r.customer}</Td>
                  <Td className="mk-label text-mk-ink-700">{r.reason}</Td>
                  <Td className="mk-caption text-mk-ink-500">{r.window}</Td>
                  <Td className="mk-label text-mk-ink-500">
                    {r.original.toLocaleString()} {T("SAR", "ريال", ar)}
                  </Td>
                  <Td className="mk-body-sm text-mk-ink-900">
                    {r.refundAmount.toLocaleString()} {T("SAR", "ريال", ar)}
                  </Td>
                  <Td><Badge variant={ss.variant} dot>{ar ? ss.labelAr : ss.labelEn}</Badge></Td>
                  <Td>
                    {r.status === "pending" ? (
                      <Button variant="primary" size="sm">{T("Process", "تنفيذ", ar)}</Button>
                    ) : (
                      <Button variant="outline" size="sm">{T("Receipt", "الإيصال", ar)}</Button>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>

      {/* Cancellation policy */}
      <div className="rounded-xl p-6 mt-4 mk-surface">
        <div className="mk-h4 mb-4 text-mk-ink-900">
          {T("Cancellation refund policy", "سياسة استرداد الإلغاء", ar)}
        </div>
        <div className="flex flex-col gap-3">
          {CANCEL_ROWS.map((p) => (
            <div key={p.windowEn} className="flex items-center justify-between px-4 py-3 rounded-md bg-mk-ink-50">
              <span className="mk-label text-mk-ink-900">{ar ? p.windowAr : p.windowEn}</span>
              <span className={`mk-body-sm ${p.cls}`}>{ar ? p.refundAr : p.refundEn}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
