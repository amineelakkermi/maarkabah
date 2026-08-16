"use client";

import { useState } from "react";
import {
  Search, Plus, ChevronRight, ChevronLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, Badge, Tabs, Input, Button, Table, Th, Td } from "@/components/ui";
import { BOOKINGS } from "@/lib/data";
import { useAdmin } from "@/contexts/AdminContext";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

type FilterStatus = "all" | "active" | "pending" | "late" | "completed";

const STATUS_MAP: Record<string, { variant: "success" | "warning" | "danger" | "neutral"; labelEn: string; labelAr: string }> = {
  active:    { variant: "success", labelEn: "Active",    labelAr: "نشط"    },
  pending:   { variant: "warning", labelEn: "Pending",   labelAr: "معلق"   },
  late:      { variant: "danger",  labelEn: "Late",      labelAr: "متأخر"  },
  completed: { variant: "neutral", labelEn: "Completed", labelAr: "مكتمل"  },
};

const TABS: { key: FilterStatus; en: string; ar: string; color?: string }[] = [
  { key: "all",       en: "All",       ar: "الكل"    },
  { key: "active",    en: "Active",    ar: "نشطة"    },
  { key: "pending",   en: "Pending",   ar: "معلقة"   },
  { key: "late",      en: "Late",      ar: "متأخرة", color: "var(--color-mk-danger)" },
  { key: "completed", en: "Completed", ar: "مكتملة"  },
];

export default function ContractsPage() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const router = useRouter();
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [query, setQuery] = useState("");

  const contracts = BOOKINGS.filter((b) => {
    const matchesFilter = filter === "all" || b.status === filter;
    const matchesQuery =
      !query ||
      b.id.toLowerCase().includes(query.toLowerCase()) ||
      b.customer.toLowerCase().includes(query.toLowerCase()) ||
      b.phone.includes(query);
    return matchesFilter && matchesQuery;
  });

  const counts: Record<FilterStatus, number> = {
    all:       BOOKINGS.length,
    active:    BOOKINGS.filter((b) => b.status === "active").length,
    pending:   BOOKINGS.filter((b) => b.status === "pending").length,
    late:      BOOKINGS.filter((b) => b.status === "late").length,
    completed: BOOKINGS.filter((b) => b.status === "completed").length,
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="min-w-[260px]">
          <Input
            variant="search"
            icon={<Search size={14} />}
            placeholder={T("Search by ref, name, or phone…", "ابحث بالرقم أو الاسم أو الهاتف…", ar)}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Status tabs */}
        <Tabs
          variant="default"
          rounded="full"
          value={filter}
          onChange={(v) => setFilter(v as FilterStatus)}
          items={TABS.map((t) => ({
            value: t.key,
            label: ar ? t.ar : t.en,
            count: counts[t.key] > 0 ? counts[t.key] : undefined,
          }))}
        />

        <div className="flex-1" />

        <Button variant="primary" className="shadow-[var(--shadow-glow-blue)]" onClick={() => router.push("/employee/new-contract")}>
          <Plus size={14} />
          {T("New contract", "عقد جديد", ar)}
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden mk-surface">
        <Table>
          <thead>
            <tr>
              {[
                T("Contract", "العقد", ar),
                T("Customer", "العميل", ar),
                T("Vehicle", "المركبة", ar),
                T("Pickup", "التسليم", ar),
                T("Return", "الإرجاع", ar),
                T("Amount", "المبلغ", ar),
                T("Status", "الحالة", ar),
                "",
              ].map((h, i) => <Th key={i}>{h}</Th>)}
            </tr>
          </thead>
          <tbody>
            {contracts.map((b) => {
              const sm = STATUS_MAP[b.status] ?? { variant: "neutral" as const, labelEn: b.status, labelAr: b.status };
              return (
                <tr
                  key={b.id}
                  onClick={() => router.push(`/employee/contracts/${b.id}`)}
                  className={`cursor-pointer transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50 ${b.status === "late" ? "bg-mk-danger/[0.025]" : ""}`}
                >
                  <Td>
                    <div className="font-mono mk-label text-mk-blue-600">{b.id}</div>
                    {b.flagged && (
                      <div className="mk-overline mt-1 text-mk-danger">
                        ⚑ {T("Flagged", "مُبلَّغ", ar)}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={b.customer} size="sm" />
                      <div>
                        <div className="mk-label text-mk-ink-900">{b.customer}</div>
                        <div className="mk-caption text-mk-ink-500">{b.phone}</div>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <div className="mk-label text-mk-ink-900">{b.car}</div>
                    <div className="mk-caption text-mk-ink-500">{b.plate}</div>
                  </Td>
                  <Td className="mk-label text-mk-ink-700">{b.date} {b.time}</Td>
                  <Td className="mk-label text-mk-ink-700">{b.dropoff}</Td>
                  <Td>
                    <div className="mk-label text-mk-ink-900">{b.amount.toLocaleString()}</div>
                    <div className="mk-overline text-mk-ink-400">{T("SAR", "ر.س", ar)}</div>
                  </Td>
                  <Td><Badge variant={sm.variant} dot>{ar ? sm.labelAr : sm.labelEn}</Badge></Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      {b.status === "pending" && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); router.push(`/employee/pickup?id=${b.id}`); }}
                        >
                          {T("Hand over", "تسليم", ar)}
                        </Button>
                      )}
                      {(b.status === "active" || b.status === "late") && (
                        <Button
                          variant={b.status === "late" ? "danger" : "primary"}
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); router.push(`/employee/return?id=${b.id}`); }}
                        >
                          {T("Return", "إرجاع", ar)}
                        </Button>
                      )}
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-mk-ink-50 text-mk-ink-600">
                        {ar ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                      </div>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>

        {contracts.length === 0 && (
          <div className="py-16 text-center">
            <div className="mk-h1 mb-2">📋</div>
            <div className="mk-body-sm text-mk-ink-600">{T("No contracts found", "لا توجد عقود", ar)}</div>
            <div className="mk-label mt-1 text-mk-ink-400">{T("Try adjusting your filters", "جرّب تغيير الفلاتر", ar)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
