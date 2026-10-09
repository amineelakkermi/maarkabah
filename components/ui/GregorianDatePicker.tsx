"use client";

import { useEffect, useMemo, useState } from "react";
import { Select } from "./Select";
import { gregorianToHijriStr, formatHijriDisplay } from "@/lib/hijri-utils";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

export const GREGORIAN_MONTHS = [
  { n: 1, ar: "يناير", en: "January" },
  { n: 2, ar: "فبراير", en: "February" },
  { n: 3, ar: "مارس", en: "March" },
  { n: 4, ar: "أبريل", en: "April" },
  { n: 5, ar: "مايو", en: "May" },
  { n: 6, ar: "يونيو", en: "June" },
  { n: 7, ar: "يوليو", en: "July" },
  { n: 8, ar: "أغسطس", en: "August" },
  { n: 9, ar: "سبتمبر", en: "September" },
  { n: 10, ar: "أكتوبر", en: "October" },
  { n: 11, ar: "نوفمبر", en: "November" },
  { n: 12, ar: "ديسمبر", en: "December" },
];

export const GREGORIAN_YEAR_MIN = 1920;

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Gregorian day/month/year select-triplet — visual mirror of HijriDatePicker.
 * Value format is ISO "YYYY-MM-DD"; shows the converted Hijri date underneath.
 */
export function GregorianDatePicker({
  value,
  onChange,
  ar,
  showConversion = true,
  yearMin = GREGORIAN_YEAR_MIN,
  yearMax = new Date().getFullYear() + 10,
}: {
  value: string;
  onChange: (v: string) => void;
  ar: boolean;
  showConversion?: boolean;
  yearMin?: number;
  yearMax?: number;
}) {
  const parse = (v: string) => {
    const parts = v.split("-");
    return {
      y: parts.length === 3 ? parseInt(parts[0], 10) : undefined,
      m: parts.length === 3 ? parseInt(parts[1], 10) : undefined,
      d: parts.length === 3 ? parseInt(parts[2], 10) : undefined,
    };
  };

  const [day, setDay] = useState<number | undefined>(parse(value).d);
  const [month, setMonth] = useState<number | undefined>(parse(value).m);
  const [year, setYear] = useState<number | undefined>(parse(value).y);

  // Keep local selections in sync if the parent resets or auto-fills the
  // field externally (e.g. picking the Hijri date fills this one too).
  useEffect(() => {
    const p = parse(value);
    setDay(p.d);
    setMonth(p.m);
    setYear(p.y);
  }, [value]);

  const convertedHijri = useMemo(() => {
    const hijriStr = gregorianToHijriStr(value);
    return hijriStr ? formatHijriDisplay(hijriStr, ar) : "";
  }, [value, ar]);

  const maxDay = year && month ? daysInMonth(year, month) : 31;

  const compose = (ny?: number, nm?: number, nd?: number) => {
    // Clamp the day to the new month/year's length (e.g. 31 → Feb → 28/29).
    if (ny && nm && nd && nd > daysInMonth(ny, nm)) nd = daysInMonth(ny, nm);
    setYear(ny);
    setMonth(nm);
    setDay(nd);
    if (!ny || !nm || !nd) {
      onChange("");
      return;
    }
    onChange(`${ny}-${String(nm).padStart(2, "0")}-${String(nd).padStart(2, "0")}`);
  };

  return (
    <div>
      <div className="flex gap-2">
        <Select value={day ?? ""} onChange={(e) => compose(year, month, Number(e.target.value))} className="flex-1">
          <option value="" disabled>{T("Day", "يوم", ar)}</option>
          {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </Select>
        <Select value={month ?? ""} onChange={(e) => compose(year, Number(e.target.value), day)} className="flex-1">
          <option value="" disabled>{T("Month", "شهر", ar)}</option>
          {GREGORIAN_MONTHS.map((month) => (
            <option key={month.n} value={month.n}>{ar ? month.ar : month.en}</option>
          ))}
        </Select>
        <Select value={year ?? ""} onChange={(e) => compose(Number(e.target.value), month, day)} className="flex-1">
          <option value="" disabled>{T("Year", "سنة", ar)}</option>
          {Array.from({ length: yearMax - yearMin + 1 }, (_, i) => yearMax - i).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </Select>
      </div>
      {showConversion && convertedHijri && (
        <p className="mt-1 text-xs text-mk-green-400">
          {T("Hijri", "هجري", ar)}: {convertedHijri}
        </p>
      )}
    </div>
  );
}
