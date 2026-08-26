"use client";

import { useMemo } from "react";
import { Input } from "./Input";
import { gregorianToHijriStr, formatHijriDisplay } from "@/lib/hijri-utils";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

/**
 * A Gregorian date `<input type="date">` that shows the converted Hijri date
 * underneath automatically.
 */
export function GregorianDateInput({
  label,
  value,
  onChange,
  ar,
  required,
  showConversion = true,
  className,
}: {
  label: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  ar: boolean;
  required?: boolean;
  showConversion?: boolean;
  className?: string;
}) {
  const convertedHijri = useMemo(() => {
    const hijriStr = gregorianToHijriStr(value);
    return hijriStr ? formatHijriDisplay(hijriStr, ar) : "";
  }, [value, ar]);

  return (
    <div>
      <Input
        variant="muted"
        className={className ?? "font-mono"}
        type="date"
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {showConversion && convertedHijri && (
        <p className="mt-1 text-xs text-mk-green-400">
          {T("Hijri", "هجري", ar)}: {convertedHijri}
        </p>
      )}
    </div>
  );
}
