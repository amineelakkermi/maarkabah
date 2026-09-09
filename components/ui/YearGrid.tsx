"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

const YEARS_PER_PAGE = 12;

interface YearGridProps {
  /** Year currently centered in the grid (defaults the page). */
  viewY: number;
  ar: boolean;
  selectedYear?: number;
  currentYear: number;
  onPick: (y: number) => void;
  onPageChange: (y: number) => void;
}

// Shared "flip to years" grid for DatePicker/DateTimePicker — tapping the
// month/year label swaps the day grid for this 12-year page so far-off
// dates (an old istamara expiry, a birth year) don't need dozens of clicks
// through the month arrows.
export function YearGrid({ viewY, ar, selectedYear, currentYear, onPick, onPageChange }: YearGridProps) {
  const pageStart = viewY - (viewY % YEARS_PER_PAGE) + (viewY % YEARS_PER_PAGE < 0 ? -YEARS_PER_PAGE : 0);
  const years = Array.from({ length: YEARS_PER_PAGE }, (_, i) => pageStart + i);
  // RTL flips reading direction, so the chevron pointing toward "further back
  // in time" swaps sides too — right-pointing means "previous" in Arabic.
  const PrevIcon = ar ? ChevronRight : ChevronLeft;
  const NextIcon = ar ? ChevronLeft : ChevronRight;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={() => onPageChange(pageStart - YEARS_PER_PAGE)} className="w-7 h-7 flex items-center justify-center rounded-full text-mk-ink-500 hover:bg-mk-ink-50 cursor-pointer border-0 bg-transparent transition-colors duration-base ease-standard">
          <PrevIcon size={16} />
        </button>
        <span className="mk-label text-mk-ink-900">{years[0]} – {years[years.length - 1]}</span>
        <button type="button" onClick={() => onPageChange(pageStart + YEARS_PER_PAGE)} className="w-7 h-7 flex items-center justify-center rounded-full text-mk-ink-500 hover:bg-mk-ink-50 cursor-pointer border-0 bg-transparent transition-colors duration-base ease-standard">
          <NextIcon size={16} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {years.map((y) => {
          const isSelected = y === selectedYear;
          const isCurrent = y === currentYear;
          return (
            <button
              key={y}
              type="button"
              onClick={() => onPick(y)}
              className={`
                h-9 rounded-md mk-body-sm cursor-pointer border-0
                transition-colors duration-base ease-standard
                ${isSelected ? "bg-mk-blue-500 text-white" : "bg-transparent text-mk-ink-900 hover:bg-mk-ink-50"}
                ${isCurrent && !isSelected ? "shadow-[inset_0_0_0_1px_var(--color-mk-blue-500)]" : ""}
              `}
            >
              {y}
            </button>
          );
        })}
      </div>
    </div>
  );
}