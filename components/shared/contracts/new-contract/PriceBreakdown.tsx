"use client";

import type { ReactNode } from "react";
import { Money } from "@/components/ui";
import { T } from "./constants";

// One line in the breakdown: label (+ optional sub-caption) against an amount.
// `discount` renders the amount in mint with a leading −; `muted` greys it out.
export type PriceRow = {
  key: string;
  label: string;
  sub?: string;
  amount: number;
  discount?: boolean;
  muted?: boolean;
};

export type PriceBreakdownProps = {
  ar: boolean;
  /** Rental hero card: daily or hourly rental of the picked vehicle. */
  rental: { name?: string; days: number; dailyRate: number; subtotal: number };
  /** Hourly billing overrides the "days × rate" caption. */
  hourly?: { rate: number; hours: number };
  essential: PriceRow[];
  supplementary: PriceRow[];
  /** One-off contract fees (extra driver, branch transfer, authorization…). */
  fees?: PriceRow[];
  discountAmount?: number;
  discountLabel?: string;
  /** Subtotal before VAT — shown as a separated row when provided. */
  subtotal?: number;
  vatAmount: number;
  vatPct?: number;
  total: number;
  totalLabel?: string;
  /** Extra rows injected between the add-on lines and VAT (advance payment, etc.). */
  children?: ReactNode;
};

export function PriceBreakdown({
  ar, rental, hourly, essential, supplementary, fees = [],
  discountAmount = 0, discountLabel, subtotal,
  vatAmount, vatPct = 15, total, totalLabel, children,
}: PriceBreakdownProps) {
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });

  const row = (r: PriceRow) => (
    <div key={r.key} className="flex items-center justify-between gap-3 py-2">
      <span className="min-w-0">
        <span className={`block mk-label ${r.muted ? "text-mk-ink-400" : "text-mk-ink-700"}`}>{r.label}</span>
        {r.sub && <span className="block mk-overline text-mk-ink-400">{r.sub}</span>}
      </span>
      <Money
        size={14}
        className={`mk-label justify-end shrink-0 ${r.discount ? "text-mk-mint-600" : r.muted ? "text-mk-ink-400" : "text-mk-ink-900"}`}
      >
        {r.discount ? `−${fmt(r.amount)}` : fmt(r.amount)}
      </Money>
    </div>
  );

  const lines = [...essential, ...supplementary, ...fees];

  return (
    <div className="flex flex-col gap-3">
      {/* Rental hero */}
      <div className="rounded-xl bg-mk-ink-50 p-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="mk-label text-mk-ink-900 truncate">
            {rental.name ?? T("Vehicle rental", "إيجار المركبة", ar)}
          </div>
          <div className="mk-caption text-mk-ink-400 mt-0.5">
            {hourly
              ? `${hourly.hours} ${T("hours", "ساعات", ar)} × ${fmt(hourly.rate)} ${T("SAR/hr", "ريال/ساعة", ar)}`
              : `${rental.days} ${T("days", "أيام", ar)} × ${fmt(rental.dailyRate)} ${T("SAR/day", "ريال/يوم", ar)}`}
          </div>
        </div>
        <Money size={14} className="mk-body font-semibold! justify-end shrink-0 text-mk-ink-900">{fmt(rental.subtotal)}</Money>
      </div>

      {/* Sectioned rows */}
      {(lines.length > 0 || children) && (
        <div className="flex flex-col divide-y divide-mk-ink-100">
          {essential.length > 0 && (
            <>
              <div className="mk-overline uppercase pt-1 pb-1 text-mk-ink-400 mk-tracking-wide">
                {T("Essential services", "خدمات أساسية", ar)}
              </div>
              {essential.map(row)}
            </>
          )}
          {supplementary.length > 0 && (
            <>
              <div className="mk-overline uppercase pt-2 pb-1 text-mk-ink-400 mk-tracking-wide">
                {T("Supplementary services", "الخدمات التكميلية", ar)}
              </div>
              {supplementary.map(row)}
            </>
          )}
          {fees.map(row)}
          {children}
        </div>
      )}

      {/* Discount */}
      {discountAmount > 0 && row({ key: "discount", label: T("Discount", "خصم", ar), sub: discountLabel, amount: discountAmount, discount: true })}

      {/* Subtotal before VAT */}
      {subtotal != null && (
        <div className="flex items-center justify-between gap-3 border-t border-mk-ink-100 pt-2.5">
          <span className="mk-label text-mk-ink-900">{T("Subtotal (before VAT)", "المجموع قبل الضريبة", ar)}</span>
          <Money size={14} className="mk-label justify-end shrink-0 text-mk-ink-900">{fmt(subtotal)}</Money>
        </div>
      )}

      {/* VAT */}
      <div className="flex items-center justify-between gap-3">
        <span className="mk-label text-mk-ink-500">{T(`VAT · ${vatPct}%`, `الضريبة · ${vatPct}٪`, ar)}</span>
        <Money size={14} className="mk-label justify-end shrink-0 text-mk-ink-500">{fmt(vatAmount)}</Money>
      </div>

      {/* Total */}
      <div className="flex justify-between items-center px-4 py-4 rounded-xl border-2 border-mk-blue-500/20 bg-mk-blue-50">
        <span className="mk-body text-mk-ink-700">{totalLabel ?? T("Estimated Total", "الإجمالي التقديري", ar)}</span>
        <span className="mk-h3 text-mk-blue-500">{fmt(total)} <span className="mk-label">{T("SAR", "ريال", ar)}</span></span>
      </div>
    </div>
  );
}
