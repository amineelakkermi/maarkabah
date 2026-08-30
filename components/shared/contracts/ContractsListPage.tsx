"use client";


import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Download, Calendar, ChevronRight, ChevronLeft } from "lucide-react";
import { Avatar, Badge, Button, Tabs, Input, Table, Th, Td, IconButton } from "@/components/ui";
import { useDropdownPlacement } from "@/components/ui/useDropdownPlacement";
import { DropdownPortal } from "@/components/ui/DropdownPortal";
import { MONTHS_EN, MONTHS_AR, WEEKDAYS_EN, WEEKDAYS_AR, WEEKEND_INDEXES, pad, buildMonthCells, goMonth } from "@/components/ui/dateGridUtils";
import { BOOKINGS } from "@/lib/data";
import { useAdmin } from "@/contexts/AdminContext";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

type FilterKey = "all" | "pending" | "active" | "late" | "completed" | "cancelled";

const STATUS_MAP: Record<string, { variant: "success" | "warning" | "danger" | "neutral"; labelEn: string; labelAr: string }> = {
  active:    { variant: "success", labelEn: "Active",    labelAr: "نشط"    },
  pending:   { variant: "warning", labelEn: "Pending",   labelAr: "معلق"   },
  late:      { variant: "danger",  labelEn: "Late",      labelAr: "متأخر"  },
  completed: { variant: "neutral", labelEn: "Completed", labelAr: "مكتمل"  },
  cancelled: { variant: "danger",  labelEn: "Cancelled", labelAr: "ملغي"   },
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
  { key: "cancelled", en: "Cancelled", ar: "ملغاة"   },
];

const MONTHS_SHORT_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_SHORT_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

export interface ContractsListPageProps {
  newContractPath: string;
  contractDetailPath: (id: string) => string;
}

function formatShort(value: string, ar: boolean) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return "";
  const months = ar ? MONTHS_SHORT_AR : MONTHS_SHORT_EN;
  return ar ? `${Number(m[3])} ${months[Number(m[2]) - 1]}` : `${months[Number(m[2]) - 1]} ${Number(m[3])}`;
}

function parseISO(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return m ? { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) } : null;
}

/** Date-range trigger — same outline pill as the other toolbar buttons.
 * Opens two calendars side by side (current + next month), sharing one
 * range selection: first click anywhere sets the start, second click sets
 * the end (swapping if picked before the start), with the days between —
 * across both calendars — highlighted as one connected range. */
function DateRangeButton({ ar, from, to, onChange }: { ar: boolean; from: string; to: string; onChange: (from: string, to: string) => void }) {
  const [open, setOpen] = useState(false);
  const [hoverDay, setHoverDay] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { style: panelStyle } = useDropdownPlacement(open, rootRef, panelRef);
  const today = new Date();
  const parsedFrom = parseISO(from);
  const [viewY, setViewY] = useState(parsedFrom?.y ?? today.getFullYear());
  const [viewM, setViewM] = useState(parsedFrom?.m ?? today.getMonth() + 1);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const monthNames = ar ? MONTHS_AR : MONTHS_EN;
  const weekdays = ar ? WEEKDAYS_AR : WEEKDAYS_EN;
  const PrevIcon = ar ? ChevronRight : ChevronLeft;
  const NextIcon = ar ? ChevronLeft : ChevronRight;
  const nextMonth = goMonth(viewY, viewM, 1);

  function nav(delta: number) {
    const n = goMonth(viewY, viewM, delta);
    setViewY(n.y);
    setViewM(n.m);
  }

  function iso(c: { y: number; m: number; d: number }) {
    return `${c.y}-${pad(c.m)}-${pad(c.d)}`;
  }

  function pick(d: string) {
    if (!from || (from && to)) {
      onChange(d, "");
    } else {
      if (d < from) onChange(d, from);
      else onChange(from, d);
      setOpen(false);
    }
  }

  const rangeEnd = to || hoverDay;
  const [lo, hi] = rangeEnd && from ? (from < rangeEnd ? [from, rangeEnd] : [rangeEnd, from]) : [from, from];
  const label = from && to ? `${formatShort(from, ar)} – ${formatShort(to, ar)}`
    : from ? `${formatShort(from, ar)} – …`
      : T("Select dates", "اختر التواريخ", ar);

  function renderMonth(y: number, m: number) {
    const cells = buildMonthCells(y, m);
    return (
      <div className="flex-1">
        <div className="mk-label text-mk-ink-900 text-center mb-3">{monthNames[m - 1]} {y}</div>
        <div className="grid grid-cols-7 mb-2">
          {weekdays.map((w, i) => (
            <span key={w} className={`mk-overline text-center py-1 ${WEEKEND_INDEXES.includes(i) ? "text-mk-ink-500" : "text-mk-ink-400"}`}>{w}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((c, i) => {
            const d = iso(c);
            const isStart = d === from;
            const isEnd = d === to;
            const isEdge = isStart || isEnd;
            const inRange = !!lo && !!hi && lo !== hi && d > lo && d < hi;
            const isRowStart = i % 7 === 0;
            const isRowEnd = i % 7 === 6;
            const isToday = today.getFullYear() === c.y && today.getMonth() + 1 === c.m && today.getDate() === c.d;
            return (
              <div
                key={`${d}-${i}`}
                className="relative"
                style={{
                  background: (inRange || isEdge) && lo !== hi ? "var(--color-mk-blue-surface)" : undefined,
                  borderStartStartRadius: isRowStart || d === lo ? 9999 : 0,
                  borderEndStartRadius: isRowStart || d === lo ? 9999 : 0,
                  borderStartEndRadius: isRowEnd || d === hi ? 9999 : 0,
                  borderEndEndRadius: isRowEnd || d === hi ? 9999 : 0,
                }}
                onMouseEnter={() => { if (from && !to) setHoverDay(d); }}
              >
                <button
                  type="button"
                  onClick={() => pick(d)}
                  className={`
                    h-8 w-8 mx-auto flex items-center justify-center rounded-full mk-body-sm cursor-pointer border-0 relative z-10
                    transition-colors duration-base ease-standard
                    ${isEdge ? "bg-mk-blue-500 text-white" : "bg-transparent hover:bg-mk-ink-50"}
                    ${!isEdge && !c.inMonth ? "text-mk-ink-300" : ""}
                    ${!isEdge && c.inMonth && WEEKEND_INDEXES.includes(i % 7) ? "text-mk-ink-500" : ""}
                    ${!isEdge && c.inMonth && !WEEKEND_INDEXES.includes(i % 7) ? "text-mk-ink-900" : ""}
                    ${isToday && !isEdge ? "shadow-[inset_0_0_0_1px_var(--color-mk-blue-500)]" : ""}
                  `}
                >
                  {c.d}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={rootRef}>
      <Button variant="secondary" size="md" className="mk-surface" onClick={() => setOpen(o => !o)}>
        <Calendar size={13} /> {label}
      </Button>
      <DropdownPortal>
        {open && (
          <>
            <div
              className="fixed inset-0 z-[5]"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div ref={panelRef} style={panelStyle} className="z-10 w-[560px] rounded-xl mk-surface mk-shadow-menu p-4">

          <div className="flex items-center justify-between mb-1">
            <button type="button" onClick={() => nav(-1)} className="w-7 h-7 flex items-center justify-center rounded-full text-mk-ink-500 hover:bg-mk-ink-50 cursor-pointer border-0 bg-transparent transition-colors duration-base ease-standard">
              <PrevIcon size={16} />
            </button>
            <button type="button" onClick={() => nav(1)} className="w-7 h-7 flex items-center justify-center rounded-full text-mk-ink-500 hover:bg-mk-ink-50 cursor-pointer border-0 bg-transparent transition-colors duration-base ease-standard">
              <NextIcon size={16} />
            </button>
          </div>
          <div className="flex items-start gap-6" onMouseLeave={() => setHoverDay(null)}>
            {renderMonth(viewY, viewM)}
            {renderMonth(nextMonth.y, nextMonth.m)}
          </div>

          {from && (
            <button
              type="button"
              onClick={() => onChange("", "")}
              className="mt-3 w-full text-center mk-caption text-mk-ink-500 hover:text-mk-danger cursor-pointer border-0 bg-transparent"
            >
              {T("Clear", "مسح", ar)}
            </button>
          )}
            </div>
          </>
        )}
      </DropdownPortal>
    </div>
  );
}

export default function ContractsListPage({ newContractPath, contractDetailPath }: ContractsListPageProps) {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("2026-05-01");
  const [dateTo, setDateTo] = useState("2026-05-07");

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
    cancelled: BOOKINGS.filter((b) => b.status === "cancelled").length,
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-3">
        {/* Search — full field from sm up; collapses to a trigger icon on
            mobile so the date-range/export/new-contract actions don't get
            squeezed off the row. */}
        <div className="hidden sm:block flex-1 max-w-[400px]">
          <Input
            variant="search"
            icon={<Search size={14} />}
            placeholder={T("Search ref, customer, plate…", "ابحث برقم العقد، العميل، اللوحة…", ar)}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <IconButton
          size="md"
          className="sm:hidden"
          aria-label={T("Search", "بحث", ar)}
          onClick={() => setMobileSearchOpen((o) => !o)}
        >
          <Search size={16} />
        </IconButton>
        <DateRangeButton ar={ar} from={dateFrom} to={dateTo} onChange={(f, t) => { setDateFrom(f); setDateTo(t); }} />
        <div className="flex-1" />
        <div className="hidden md:block">
          <Button variant="outline" size="md">
            <Download size={13} /> {T("Export CSV", "تصدير CSV", ar)}
          </Button>
        </div>
        <Button variant="primary" size="md" className="shadow-[var(--shadow-glow-blue)]" onClick={() => router.push(newContractPath)}>
          <Plus size={14} /> {T("New contract", "عقد جديد", ar)}
        </Button>
      </div>

      {/* Search field's mobile-only expanded row, toggled by the trigger above */}
      {mobileSearchOpen && (
        <div className="sm:hidden mb-3">
          <Input
            variant="search"
            icon={<Search size={14} />}
            placeholder={T("Search ref, customer, plate…", "ابحث برقم العقد، العميل، اللوحة…", ar)}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
      )}

      {/* Status filter — its own row, separate from the primary actions above,
          and horizontally scrollable so it never wraps onto a second line. */}
      <div className="mb-5 overflow-x-auto mk-scrollbar-none">
        <Tabs
          variant="default"
          rounded="full"
          className="mk-view-toggle--reversed flex-nowrap! w-max"
          value={filter}
          onChange={(v) => setFilter(v as FilterKey)}
          items={TABS.map((t) => ({
            value: t.key,
            label: ar ? t.ar : t.en,
            count: counts[t.key] > 0 ? counts[t.key] : undefined,
          }))}
        />
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden mk-surface">
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
                <tr
                  key={b.id}
                  onClick={() => router.push(contractDetailPath(b.id))}
                  className={`cursor-pointer transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50 ${b.flagged ? "bg-mk-danger/[0.025]" : ""}`}
                >
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
                    <div className="mk-label text-mk-ink-900">{b.car}</div>
                    <div className="mk-caption font-mono text-mk-ink-500">{b.plate}</div>
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
