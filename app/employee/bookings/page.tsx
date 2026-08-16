"use client";

import { Search, Plus } from "lucide-react";
import { Avatar, Badge, Button, Input, Table, Th, Td } from "@/components/ui";
import { BOOKINGS } from "@/lib/data";
import { useAdmin } from "@/contexts/AdminContext";

const T = (en: string, ar: string, isAr: boolean) => isAr ? ar : en;

const STATUS_MAP: Record<string, { variant: "success" | "warning" | "danger" | "neutral"; label: [string, string] }> = {
  active:    { variant: "success", label: ["Active","نشط"]      },
  pending:   { variant: "warning", label: ["Pending","معلق"]     },
  late:      { variant: "danger",  label: ["Late","متأخر"]       },
  completed: { variant: "neutral", label: ["Completed","مكتمل"]  },
};

export default function EmpBookingsPage() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const rows = BOOKINGS.filter((b) => b.branch.includes("Olaya") || b.branch.includes("Riyadh"));

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="min-w-[280px]">
          <Input variant="search" icon={<Search size={14} />} placeholder={T("Search ref or phone…","ابحث برقم الحجز أو الهاتف…",ar)} />
        </div>
        {[T("Today","اليوم",ar), T("This week","هذا الأسبوع",ar)].map((l) => (
          <Button key={l} variant="outline" size="sm">{l}</Button>
        ))}
        <div className="flex-1" />
        <Button variant="primary">
          <Plus size={14} />
          {T("Walk-in booking","حجز حضوري",ar)}
        </Button>
      </div>

      <div className="rounded-xl overflow-hidden mk-surface">
        <Table>
          <thead>
            <tr>
              {[
                T("Ref","المرجع",ar), T("Customer","العميل",ar), T("Car","المركبة",ar),
                T("Pickup","التسليم",ar), T("Status","الحالة",ar), "",
              ].map((h) => <Th key={h}>{h}</Th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => {
              const sm = STATUS_MAP[b.status] ?? { variant: "neutral" as const, label: [b.status, b.status] };
              return (
                <tr key={b.id} className="cursor-pointer transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50" style={{ background: b.status === "late" ? "rgba(226,65,113,0.03)" : "transparent" }}>
                  <Td className="font-mono mk-label text-mk-blue-600">{b.id}</Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={b.customer} size="sm" />
                      <div>
                        <div className="mk-body text-mk-ink-900">{b.customer}</div>
                        <div className="mk-caption text-mk-ink-500">{b.phone}</div>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <div className="mk-body text-mk-ink-900">{b.car}</div>
                    <div className="mk-caption text-mk-ink-500">{b.plate}</div>
                  </Td>
                  <Td className="mk-body-sm text-mk-ink-700">{b.date} {b.time}</Td>
                  <Td>
                    <Badge variant={sm.variant} dot>{T(sm.label[0], sm.label[1], ar)}</Badge>
                  </Td>
                  <Td>
                    <Button variant="primary" size="sm">
                      {b.status === "active"
                        ? T("Process return","معالجة إرجاع",ar)
                        : b.status === "pending"
                        ? T("Hand over","تسليم",ar)
                        : T("Open","فتح",ar)}
                    </Button>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
