"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { MONTHS_EN, MONTHS_AR, WEEKDAYS_EN, WEEKDAYS_AR, WEEKEND_INDEXES, pad, buildMonthCells, goMonth as shiftMonth } from "./dateGridUtils";
import { YearGrid } from "./YearGrid";
import { useDropdownPlacement } from "./useDropdownPlacement";
import { DropdownPortal } from "./DropdownPortal";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

interface Parsed { y: number; m: number; d: number; h: number; min: number; }

function parseValue(value: string): Parsed | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]), h: Number(match[4]), min: Number(match[5]) };
}

function to12h(h: number) {
  const period: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return { h12, period };
}

function to24h(h12: number, period: "AM" | "PM") {
  if (period === "AM") return h12 === 12 ? 0 : h12;
  return h12 === 12 ? 12 : h12 + 12;
}

function formatDisplay(value: string) {
  const parsed = parseValue(value);
  if (!parsed) return "";
  const { h12, period } = to12h(parsed.h);
  return `${pad(parsed.d)}/${pad(parsed.m)}/${parsed.y} · ${pad(h12)}:${pad(parsed.min)} ${period}`;
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES_60 = Array.from({ length: 60 }, (_, i) => i);

// Compact up/down stepper standing in for the scroll-wheel style native
// pickers use — shows only the current value, no scrollable list, so the
// panel never carries the dead whitespace a fixed-height scroll area leaves
// once you're at the first/last item.
function TimeStepper({ value, items, onSelect }: { value: number; items: number[]; onSelect: (v: number) => void }) {
  function step(delta: number) {
    const idx = items.indexOf(value);
    const nextIdx = (idx + delta + items.length) % items.length;
    onSelect(items[nextIdx]);
  }

  return (
    <div className="flex flex-col items-center gap-1 w-14">
      <button type="button" onClick={() => step(1)} className="w-8 h-6 flex items-center justify-center text-mk-ink-400 hover:text-mk-ink-700 cursor-pointer border-0 bg-transparent">
        <ChevronUp size={14} />
      </button>
      <div className="w-full h-10 rounded-md bg-mk-ink-50 flex items-center justify-center mk-body text-mk-ink-900 font-medium">
        {pad(value)}
      </div>
      <button type="button" onClick={() => step(-1)} className="w-8 h-6 flex items-center justify-center text-mk-ink-400 hover:text-mk-ink-700 cursor-pointer border-0 bg-transparent">
        <ChevronDown size={14} />
      </button>
    </div>
  );
}

// Mirrors Input's variantShapeClasses/variantBorderClasses split.
const variantClasses = {
  default: "bg-white border-mk-ink-200",
  muted: "bg-mk-ink-50 border-mk-ink-100",
} as const;

interface DateTimePickerProps {
  value: string; // "YYYY-MM-DDTHH:mm" or ""
  onChange: (v: string) => void;
  ar: boolean;
  placeholder?: string;
  /** Matches Input's variant — "muted" is the filled-well look used
   * throughout drawers/forms, so this doesn't stand out as a stark white
   * box among the muted Inputs around it. */
  variant?: keyof typeof variantClasses;
  className?: string;
  /** Matches Input/Select's built-in label — renders the mk-label-muted
   * caption above the field for you instead of every call site hand-rolling
   * its own <label> + wrapper div. */
  label?: ReactNode;
  id?: string;
}

export function DateTimePicker({ value, onChange, ar, placeholder, variant = "default", className = "", label, id }: DateTimePickerProps) {
  const pickerId = id ?? (typeof label === "string" ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"days" | "years">("days");
  const rootRef = useRef<HTMLDivElement>(null);
  const parsed = parseValue(value);
  const now = new Date();
  const fallback: Parsed = { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate(), h: now.getHours(), min: now.getMinutes() };
  const active = parsed ?? fallback;
  const [viewY, setViewY] = useState(active.y);
  const [viewM, setViewM] = useState(active.m);
  const panelRef = useRef<HTMLDivElement>(null);
  const { style: panelStyle } = useDropdownPlacement(open, rootRef, panelRef);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      // The panel is portaled to document.body (see DropdownPortal), so
      // it's no longer a DOM descendant of rootRef — without also
      // excluding panelRef here, every click inside the open panel (a day
      // cell, a time stepper) would register as "outside" and close it
      // before its own click handler can run.
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const monthNames = ar ? MONTHS_AR : MONTHS_EN;
  const weekdays = ar ? WEEKDAYS_AR : WEEKDAYS_EN;
  const cells = buildMonthCells(viewY, viewM);
  const { h12, period } = to12h(active.h);
  // RTL flips reading direction, so the chevron pointing toward "back in
  // time" swaps sides too — right-pointing means "previous" in Arabic.
  const PrevIcon = ar ? ChevronRight : ChevronLeft;
  const NextIcon = ar ? ChevronLeft : ChevronRight;

  function nav(delta: number) {
    const next = shiftMonth(viewY, viewM, delta);
    setViewY(next.y);
    setViewM(next.m);
  }

  function commit(next: Partial<Parsed>) {
    const merged = { ...active, ...next };
    onChange(`${merged.y}-${pad(merged.m)}-${pad(merged.d)}T${pad(merged.h)}:${pad(merged.min)}`);
  }

  function pickDay(y: number, m: number, d: number) {
    commit({ y, m, d });
  }

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={pickerId} className="mk-label-muted mk-field-label">
          {label}
        </label>
      )}
      <div className="relative" ref={rootRef}>
      <button
        type="button"
        id={pickerId}
        onClick={() => {
          if (!open) { setMode("days"); setViewY(active.y); setViewM(active.m); }
          setOpen((o) => !o);
        }}
        className={`
          font-body w-full text-start flex items-center gap-2
          rounded-input border text-mk-fg-1 h-10 px-3
          ${variantClasses[variant]}
          transition-[border-color,box-shadow] duration-base ease-standard
          focus:outline-none focus:border-mk-blue-500 focus:shadow-focus
          cursor-pointer mk-body-sm
          ${open ? "border-mk-blue-500 shadow-focus" : ""}
          ${className}
        `}
      >
        <CalendarIcon size={14} className="shrink-0 text-mk-blue-500" />
        <span className={`flex-1 truncate ${value ? "text-mk-ink-900" : "text-mk-ink-400"}`}>
          {value ? formatDisplay(value) : (placeholder ?? T("Select date & time", "اختر التاريخ والوقت", ar))}
        </span>
      </button>

      <DropdownPortal>
      <div ref={panelRef} style={panelStyle} className={`z-[250] w-[320px] rounded-menu mk-surface mk-shadow-menu p-4 mk-menu-motion ${open ? "open" : ""}`}>
        {mode === "years" ? (
          <YearGrid
            viewY={viewY}
            ar={ar}
            selectedYear={active.y}
            currentYear={now.getFullYear()}
            onPageChange={setViewY}
            onPick={(y) => { setViewY(y); setMode("days"); }}
          />
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <button type="button" onClick={() => nav(-1)} className="w-7 h-7 flex items-center justify-center rounded-full text-mk-ink-500 hover:bg-mk-ink-50 cursor-pointer border-0 bg-transparent transition-colors duration-base ease-standard">
                <PrevIcon size={16} />
              </button>
              <button type="button" onClick={() => setMode("years")} className="mk-label text-mk-ink-900 cursor-pointer border-0 bg-transparent hover:text-mk-blue-600 transition-colors duration-base ease-standard px-2.5 py-1 rounded-md hover:bg-mk-ink-50">
                {monthNames[viewM - 1]} {viewY}
              </button>
              <button type="button" onClick={() => nav(1)} className="w-7 h-7 flex items-center justify-center rounded-full text-mk-ink-500 hover:bg-mk-ink-50 cursor-pointer border-0 bg-transparent transition-colors duration-base ease-standard">
                <NextIcon size={16} />
              </button>
            </div>

            <div className="grid grid-cols-7 mb-2">
              {weekdays.map((w, i) => (
                <span key={w} className={`mk-overline text-center py-1 ${WEEKEND_INDEXES.includes(i) ? "text-mk-ink-500" : "text-mk-ink-400"}`}>{w}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1">
              {cells.map((c, i) => {
                const isSelected = active.y === c.y && active.m === c.m && active.d === c.d;
                const isToday = now.getFullYear() === c.y && now.getMonth() + 1 === c.m && now.getDate() === c.d;
                const isWeekend = WEEKEND_INDEXES.includes(i % 7);
                return (
                  <button
                    key={`${c.y}-${c.m}-${c.d}-${i}`}
                    type="button"
                    onClick={() => pickDay(c.y, c.m, c.d)}
                    className={`
                      h-8 w-8 mx-auto flex items-center justify-center rounded-full mk-body-sm cursor-pointer border-0
                      transition-colors duration-base ease-standard
                      ${isSelected ? "bg-mk-blue-500 text-white" : "bg-transparent hover:bg-mk-ink-50"}
                      ${!isSelected && !c.inMonth ? "text-mk-ink-300" : ""}
                      ${!isSelected && c.inMonth && isWeekend ? "text-mk-ink-500" : ""}
                      ${!isSelected && c.inMonth && !isWeekend ? "text-mk-ink-900" : ""}
                      ${isToday && !isSelected ? "shadow-[inset_0_0_0_1px_var(--color-mk-blue-500)]" : ""}
                    `}
                  >
                    {c.d}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-mk-border">
              <TimeStepper items={HOURS_12} value={h12} onSelect={(v) => commit({ h: to24h(v, period) })} />
              <span className="mk-h4 text-mk-ink-400">:</span>
              <TimeStepper items={MINUTES_60} value={active.min} onSelect={(v) => commit({ min: v })} />
              <div className="flex flex-col items-center justify-center gap-1.5 w-12 ms-1">
                <button type="button" onClick={() => commit({ h: to24h(h12, "AM") })} className={`w-10 h-8 rounded-md mk-caption cursor-pointer border-0 transition-colors duration-base ease-standard ${period === "AM" ? "bg-mk-blue-500 text-white" : "bg-transparent text-mk-ink-600 hover:bg-mk-ink-50"}`}>
                  {T("AM", "ص", ar)}
                </button>
                <button type="button" onClick={() => commit({ h: to24h(h12, "PM") })} className={`w-10 h-8 rounded-md mk-caption cursor-pointer border-0 transition-colors duration-base ease-standard ${period === "PM" ? "bg-mk-blue-500 text-white" : "bg-transparent text-mk-ink-600 hover:bg-mk-ink-50"}`}>
                  {T("PM", "م", ar)}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      </DropdownPortal>
      </div>
    </div>
  );
}