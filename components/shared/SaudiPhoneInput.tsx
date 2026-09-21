"use client";

import { ReactNode } from "react";

// ─────────────────────────────────────────────────────────────
//  SaudiPhoneInput — Saudi mobile field with a fixed "+966"
//  prefix. The user only types the 9 local digits starting
//  with 5 (e.g. +966 5XXXXXXXX); state holds just those digits.
// ─────────────────────────────────────────────────────────────

/** 9 local digits starting with 5 → valid Saudi mobile. */
export const isSaudiMobileLocal = (digits: string): boolean => /^5\d{8}$/.test(digits);

/** Extract the 9 local digits from a stored value ("+966 50 123 4567",
 * "9665XXXXXXXX", "05XXXXXXXX") for pre-filling the field. */
export function saudiLocalDigits(stored: string | null | undefined): string {
  const digits = (stored ?? "").replace(/\D/g, "");
  if (digits.startsWith("00966")) return digits.slice(5, 14);
  if (digits.startsWith("966")) return digits.slice(3, 12);
  if (digits.startsWith("0")) return digits.slice(1, 10);
  return digits.slice(0, 9);
}

interface SaudiPhoneInputProps {
  label?: ReactNode;
  value: string;
  onChange: (digits: string) => void;
  helpText?: string;
  error?: string;
  disabled?: boolean;
}

export function SaudiPhoneInput({ label, value, onChange, helpText, error, disabled }: SaudiPhoneInputProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && <label className="mk-body-sm text-mk-fg-1">{label}</label>}
      <div
        dir="ltr"
        className={`
          flex items-center h-10 rounded-md border bg-mk-ink-50
          transition-[border-color,box-shadow] duration-base ease-standard
          focus-within:border-mk-blue-500 focus-within:shadow-[var(--shadow-focus)]
          ${error ? "border-mk-danger" : "border-mk-ink-100"}
          ${disabled ? "opacity-60" : ""}
        `}
      >
        <span className="shrink-0 px-3 font-mono mk-body-sm text-mk-ink-500 select-none border-e border-mk-ink-100">
          +966
        </span>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          dir="ltr"
          disabled={disabled}
          className="flex-1 min-w-0 bg-transparent border-0 outline-none font-mono mk-body-sm px-3 text-mk-fg-1 placeholder:text-mk-ink-400 disabled:cursor-not-allowed"
          placeholder="5XXXXXXXX"
          maxLength={9}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 9))}
        />
      </div>
      {error && <p className="mk-caption text-mk-danger">{error}</p>}
      {helpText && !error && <p className="mk-caption text-mk-fg-3">{helpText}</p>}
    </div>
  );
}
