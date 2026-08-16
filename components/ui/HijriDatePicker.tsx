"use client";

import { useEffect, useState } from "react";
import { Select } from "./Select";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

// Value is an 8-digit string "YYYYMMDD" (Hijri), matching DriverProfile.hijriBirthDate.
export const HIJRI_MONTHS = [
  { n: 1, ar: "محرم", en: "Muharram" },
  { n: 2, ar: "صفر", en: "Safar" },
  { n: 3, ar: "ربيع الأول", en: "Rabi' al-awwal" },
  { n: 4, ar: "ربيع الآخر", en: "Rabi' al-thani" },
  { n: 5, ar: "جمادى الأولى", en: "Jumada al-awwal" },
  { n: 6, ar: "جمادى الآخرة", en: "Jumada al-thani" },
  { n: 7, ar: "رجب", en: "Rajab" },
  { n: 8, ar: "شعبان", en: "Sha'ban" },
  { n: 9, ar: "رمضان", en: "Ramadan" },
  { n: 10, ar: "شوال", en: "Shawwal" },
  { n: 11, ar: "ذو القعدة", en: "Dhu al-Qi'dah" },
  { n: 12, ar: "ذو الحجة", en: "Dhu al-Hijjah" },
];
export const HIJRI_YEAR_MIN = 1350;
export const HIJRI_YEAR_MAX = 1447;

export function HijriDatePicker({ value, onChange, ar }: { value: string; onChange: (v: string) => void; ar: boolean }) {
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
  );
}
