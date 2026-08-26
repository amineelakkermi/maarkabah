"use client";

import { useEffect, useMemo, useState } from "react";
import { Select } from "./Select";
import { hijriToGregorianStr, HIJRI_MONTHS } from "@/lib/hijri-utils";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

// Re-export so existing consumers keep working.
export { HIJRI_MONTHS };
export const HIJRI_YEAR_MIN = 1350;

// Approximate the current Hijri year dynamically so the picker always
// includes "this year" (and a small buffer) instead of being hard-coded.
// One Hijri year ≈ 354.36667 days; the epoch anchor is 1 Muharram 1 AH
// ≈ 16 July 622 CE (Julian) ≈ 19 July 622 (proleptic Gregorian).
function currentHijriYear(): number {
  const now = new Date();
  const gregorianDays =
    (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
      Date.UTC(622, 6, 19)) /
    86_400_000;
  return Math.floor(gregorianDays / 354.36667) + 1;
}

export const HIJRI_YEAR_MAX = Math.max(currentHijriYear() + 5, 1450);

export function HijriDatePicker({ value, onChange, ar, showConversion = true }: { value: string; onChange: (v: string) => void; ar: boolean; showConversion?: boolean }) {
  const parse = (v: string) => ({
    y: v.length === 8 ? parseInt(v.slice(0, 4), 10) : undefined,
    m: v.length === 8 ? parseInt(v.slice(4, 6), 10) : undefined,
    d: v.length === 8 ? parseInt(v.slice(6, 8), 10) : undefined,
  });

  const [day, setDay] = useState<number | undefined>(parse(value).d);
  const [month, setMonth] = useState<number | undefined>(parse(value).m);
  const [year, setYear] = useState<number | undefined>(parse(value).y);

  // Keep local selections in sync if the parent resets the field externally
  // (e.g. clearing the whole form after submit), without wiping partial
  // selections on every keystroke elsewhere in the form.
  useEffect(() => {
    if (value === "") {
      setDay(undefined);
      setMonth(undefined);
      setYear(undefined);
    }
  }, [value]);

  const convertedGregorian = useMemo(() => hijriToGregorianStr(value), [value]);

  const compose = (ny?: number, nm?: number, nd?: number) => {
    setYear(ny);
    setMonth(nm);
    setDay(nd);
    if (!ny || !nm || !nd) {
      onChange("");
      return;
    }
    onChange(`${ny}${String(nm).padStart(2, "0")}${String(nd).padStart(2, "0")}`);
  };

  return (
    <div>
      <div className="flex gap-2">
        <Select value={day ?? ""} onChange={(e) => compose(year, month, Number(e.target.value))} className="flex-1">
          <option value="" disabled>{T("Day", "يوم", ar)}</option>
          {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </Select>
        <Select value={month ?? ""} onChange={(e) => compose(year, Number(e.target.value), day)} className="flex-1">
          <option value="" disabled>{T("Month", "شهر", ar)}</option>
          {HIJRI_MONTHS.map((month) => (
            <option key={month.n} value={month.n}>{ar ? month.ar : month.en}</option>
          ))}
        </Select>
        <Select value={year ?? ""} onChange={(e) => compose(Number(e.target.value), month, day)} className="flex-1">
          <option value="" disabled>{T("Year", "سنة", ar)}</option>
          {Array.from({ length: HIJRI_YEAR_MAX - HIJRI_YEAR_MIN + 1 }, (_, i) => HIJRI_YEAR_MAX - i).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </Select>
      </div>
      {showConversion && convertedGregorian && (
        <p className="mt-1 text-xs text-mk-green-400">
          {T("Gregorian", "ميلادي", ar)}: {convertedGregorian}
        </p>
      )}
    </div>
  );
}
