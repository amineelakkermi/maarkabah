"use client";

import { useState } from "react";
import { Search, Plus, Download, Filter, Calendar, ChevronRight, ChevronLeft } from "lucide-react";
import { Avatar, Badge, Button, Tabs, Input, Table, Th, Td } from "@/components/ui";
import { BOOKINGS } from "@/lib/data";
import { useAdmin } from "@/contexts/AdminContext";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

type FilterKey = "all" | "pending" | "active" | "late" | "completed";

const STATUS_MAP: Record<string, { variant: "success" | "warning" | "danger" | "neutral"; labelEn: string; labelAr: string }> = {
  active:    { variant: "success", labelEn: "Active",    labelAr: "نشط"    },
  pending:   { variant: "warning", labelEn: "Pending",   labelAr: "معلق"   },
  late:      { variant: "danger",  labelEn: "Late",      labelAr: "متأخر"  },
  completed: { variant: "neutral", labelEn: "Completed", labelAr: "مكتمل"  },
};

const KYC_MAP: Record<string, { variant: "success" | "warning"; labelEn: string; labelAr: string }> = {
  verified: { variant: "success", labelEn: "Verified", labelAr: "موثّق" },
  pending:  { variant: "warning", labelEn: "Pending",  labelAr: "معلق"  },
};

const TABS: { key: FilterKey; en: string; ar: string }[] = [
  { key: "all",       en: "All",       ar: "الكل"    },
  { key: "pending",   en: "Pending",   ar: "معلق"    },
  { key: "active",    en: "Active",    ar: "نشطة"    },
  { key: "late",      en: "Late",      ar: "متأخرة"  },
  { key: "completed", en: "Completed", ar: "مكتملة"  },
];

export default function BookingsPage() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");

  const rows = BOOKINGS.filter((b) => {
    const matchFilter = filter === "all" || b.status === filter;
    const matchQuery  = !query ||
      b.id.toLowerCase().includes(query.toLowerCase()) ||
      b.customer.toLowerCase().includes(query.toLowerCase()) ||
      b.plate.toLowerCase().includes(query.toLowerCase());
    return matchFilter && matchQuery;
  });

  const counts: Record<FilterKey, number> = {
    all:       BOOKINGS.length,
    pending:   BOOKINGS.filter((b) => b.status === "pending").length,
    active:    BOOKINGS.filter((b) => b.status === "active").length,
    late:      BOOKINGS.filter((b) => b.status === "late").length,
    completed: BOOKINGS.filter((b) => b.status === "completed").length,
  };

  return (
    <div>
      {/* Filter tabs */}
      <Tabs
        variant="default"
        rounded="full"
        className="mb-4 w-fit"
        value={filter}
        onChange={(v) => setFilter(v as FilterKey)}
        items={TABS.map((t) => ({
          value: t.key,
          label: ar ? t.ar : t.en,
          count: counts[t.key],
        }))}
      />

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <Input
            variant="search"
            icon={<Search size={14} />}
            placeholder={T("Search ref, customer, plate…", "ابحث برقم العقد، العميل، اللوحة…", ar)}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button variant="outline">
          <Calendar size={13} /> {T("May 1 – May 7", "١ مايو – ٧ مايو", ar)}
        </Button>
        <Button variant="outline">
          <Filter size={13} /> {T("Filters · 2", "المرشحات · ٢", ar)}
        </Button>
        <div className="flex-1" />
        <Button variant="outline">
          <Download size={13} /> {T("Export CSV", "تصدير CSV", ar)}
        </Button>
        <Button variant="primary" className="shadow-[var(--shadow-glow-blue)]">
          <Plus size={14} /> {T("New contract", "عقد جديد", ar)}
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden mk-surface">
        <div className="overflow-x-auto">
        <Table className="min-w-[820px]">
          <thead>
            <tr>
              {[
                T("Contract Ref", "رقم العقد",       ar),
                T("Customer",     "العميل",           ar),
                T("Car · Plate",  "المركبة · اللوحة", ar),
                T("Pickup",       "الاستلام",          ar),
                T("Branch",       "الفرع",             ar),
                T("KYC",          "الهوية",            ar),
                T("Status",       "الحالة",            ar),
                T("Total",        "الإجمالي",          ar),
                "",
              ].map((h, i) => <Th key={i}>{h}</Th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => {
              const sm = STATUS_MAP[b.status] ?? { variant: "neutral" as const, labelEn: b.status, labelAr: b.status };
              const km = KYC_MAP[b.kyc]     ?? { variant: "warning" as const, labelEn: b.kyc,    labelAr: b.kyc    };
              return (
                <tr key={b.id} className={`cursor-pointer transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50 ${b.flagged ? "bg-mk-danger/[0.025]" : ""}`}>
                  <Td>
                    <div className="flex items-center gap-2">
                      {b.flagged && <span className="text-mk-danger mk-label">⚑</span>}
                      <span className="font-mono mk-label text-mk-blue-600">{b.id}</span>
                    </div>
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
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg bg-mk-ink-50">🚗</div>
                      <div>
                        <div className="mk-label text-mk-ink-900">{b.car}</div>
                        <div className="mk-caption font-mono text-mk-ink-500">{b.plate}</div>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <div className="mk-label text-mk-ink-900">{b.date} {b.time}</div>
                    <div className="mk-caption text-mk-ink-500">→ {b.dropoff}</div>
                  </Td>
                  <Td className="mk-caption text-mk-ink-500">{b.branch}</Td>
                  <Td><Badge variant={km.variant} dot>{ar ? km.labelAr : km.labelEn}</Badge></Td>
                  <Td><Badge variant={sm.variant} dot>{ar ? sm.labelAr : sm.labelEn}</Badge></Td>
                  <Td>
                    <span className="mk-label text-mk-ink-900">{b.amount.toLocaleString()}</span>
                    <span className="mk-overline ms-1 text-mk-ink-400">{T("SAR", "ريال", ar)}</span>
                  </Td>
                  <Td>
                    <Button variant="ghost" size="sm" className="bg-mk-blue-50 rounded-full">
                      {T("Open", "فتح", ar)}
                      {ar ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
                    </Button>
                  </Td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="py-16 text-center">
                  <div className="mk-h1 mb-2">📋</div>
                  <div className="mk-body-sm text-mk-ink-600">{T("No contracts found", "لا توجد عقود", ar)}</div>
                  <div className="mk-label mt-1 text-mk-ink-400">{T("Try adjusting your filters", "جرّب تغيير الفلاتر", ar)}</div>
                </td>
              </tr>
            )}
          </tbody>
        </Table>

        </div>{/* end overflow-x-auto */}
        {/* Pagination footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-mk-ink-100">
          <span className="mk-caption text-mk-ink-400">
            {T(`Showing ${rows.length} of ${BOOKINGS.length} contracts`, `عرض ${rows.length} من ${BOOKINGS.length} عقد`, ar)}
          </span>
          <div className="flex gap-1">
            {[1, 2, 3].map((p) => (
              <button key={p} className={`w-7 h-7 rounded-sm mk-caption border-0 cursor-pointer ${
 p === 1 ? "bg-mk-blue-500 text-white" : "bg-mk-ink-50 text-mk-ink-600"
 }`}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
