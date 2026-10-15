"use client";

import { useRef, type CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useCountUp } from "./useCountUp";
import { MiniTrend } from "./MiniTrend";

type KpiKind = "default" | "alert" | "warn" | "mint" | "violet" | "neutral";

interface KpiCardProps {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  kind?: KpiKind;
  delta?: { dir: "up" | "down"; value: string };
  /** Optional mini trend line (oldest → newest) drawn in the kind's color. */
  trend?: number[];
  /** Per-point captions for `trend` (same length) — hover the line for its caption + value. */
  trendLabels?: string[];
  /** Formats a point's value in the tooltip (default: grouped integer). */
  trendFormat?: (v: number) => string;
  /** Optional 0–100 fill bar — for ratio metrics like utilisation. */
  progress?: number;
  /** "plain" = the neutral panel surface instead of the kind's tinted one (dark mode); the kind still colors the chip, delta and bar. */
  surface?: "tonal" | "plain";
  /** "sm" = compact stat tile (smaller value, tighter padding) for the
   *  count rows above lists — customers, drivers, branches. */
  size?: "md" | "sm";
}

// Flat, fully tonal card — every layer comes from the SAME color family so
// the surface and everything inside it read as one piece (the value
// itself stays neutral ink-900 in both themes so numbers read first):
//   surface  → -surface   (card background, no shadow)
//   edge     → -500 @32%  (hairline inset edge)
//   chip     → -100       (icon chip, delta pill, progress track)
//   hover    → edge deepens + 2px lift — see .mk-kpi in globals.css;
//              the tone color reaches it as a CSS var
//   accents  → -500       (watermark icon, trend line, progress fill)
// All kinds sit at the same tint depth, so a mixed row stays harmonious.
// "neutral" (ink) is the 6th tone — for a row that already uses all five
// colors, so no two cards in one row share a surface.
// Every token is already an rgba wash / light pastel in dark mode.
const TONE: Record<KpiKind, {
  surface: string; chip: string; icon: string; fill: string; stroke: string;
}> = {
  default: { surface: "bg-mk-blue-surface",    chip: "bg-mk-blue-100",    icon: "text-mk-blue-500",    fill: "bg-mk-blue-500",    stroke: "var(--color-mk-blue-500)" },
  alert:   { surface: "bg-mk-danger-surface",  chip: "bg-mk-danger-100",  icon: "text-mk-danger",      fill: "bg-mk-danger",      stroke: "var(--color-mk-danger)" },
  warn:    { surface: "bg-mk-warning-surface", chip: "bg-mk-warning-100", icon: "text-mk-warning-600", fill: "bg-mk-warning",     stroke: "var(--color-mk-warning)" },
  mint:    { surface: "bg-mk-mint-surface",    chip: "bg-mk-mint-100",    icon: "text-mk-mint-700",    fill: "bg-mk-mint-600",    stroke: "var(--color-mk-mint-600)" },
  violet:  { surface: "bg-mk-violet-surface",  chip: "bg-mk-violet-100",  icon: "text-mk-violet-500",  fill: "bg-mk-violet-500",  stroke: "var(--color-mk-violet-500)" },
  neutral: { surface: "bg-mk-ink-100",         chip: "bg-mk-ink-200",     icon: "text-mk-ink-700",     fill: "bg-mk-ink-700",     stroke: "var(--color-mk-ink-600)" },
};

// Delta pill carries the up/down meaning in both its tint and text: a decrease is always red (danger), an
// increase green (success) — whatever the card's own kind color is.
const DELTA_TEXT = {
  up:   "bg-mk-success-100 text-mk-success-700",
  down: "bg-mk-danger-100 text-mk-danger-700",
};

export function KpiCard({ icon: Icon, label, value, sub, kind = "default", delta, trend, trendLabels, trendFormat, progress, surface = "tonal", size = "md" }: KpiCardProps) {
  const sm = size === "sm";
  const t = TONE[kind];
  const pct = progress == null ? null : Math.max(0, Math.min(100, progress));
  const vars = { "--kpi-tone": t.stroke } as CSSProperties;
  const valueRef = useRef<HTMLDivElement>(null);
  const shown = useCountUp(value, { ref: valueRef });

  const foot = (sub || delta) && (
    <div className={`mk-kpi-foot relative flex ${pct != null ? "min-w-0 flex-row flex-wrap items-center gap-x-2 gap-y-1" : `flex-col items-start gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-1 mt-auto ${sm ? "pt-2" : "pt-3"}`} mk-caption text-mk-ink-600`}>
      {delta && (
        <span className={`mk-kpi-delta inline-flex items-center gap-1 mk-caption px-2 py-0.5 rounded-pill ${DELTA_TEXT[delta.dir]}`}>
          {delta.dir === "up" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {delta.value}
        </span>
      )}
      {sub && <span className="text-[11px] sm:text-xs whitespace-nowrap">{sub}</span>}
    </div>
  );

  return (
    <div style={vars} className={`mk-kpi flex flex-col h-full rounded-xl overflow-hidden ${surface === "plain" ? "bg-[var(--bg-elevated)]" : t.surface} ${sm ? "px-4 py-3.5" : "p-5"}`}>
      {/* Header — chip + label share one row so the value below is the
          first thing the eye lands on. */}
      <div className={`relative flex items-center gap-2 ${sm ? "mb-2" : "mb-3"}`}>
        {Icon ? (
          <div className={`mk-kpi-chip ${t.chip} rounded-md flex items-center justify-center shrink-0 ${sm ? "w-8 h-8" : "w-10 h-10"}`}>
            <Icon size={sm ? 16 : 20} strokeWidth={1.75} className={t.icon} />
          </div>
        ) : (
          <span aria-hidden className={`w-2 h-2 rounded-full shrink-0 ${t.fill}`} />
        )}
        <div className={`mk-kpi-label ${sm ? "mk-caption" : "mk-label"} font-medium text-mk-ink-700 min-w-0 truncate`}>{label}</div>
      </div>

      {/* Value and (when there is one) the trend line share a row from `sm` up — the line sits level with the big number, at the opposite end. On phones the cards are too narrow for both, so the line stacks under the number. */}
      <div className="relative flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div ref={valueRef} className={`mk-kpi-value ${sm ? "mk-h2" : "mk-h1"} leading-none tracking-tight text-mk-ink-900`}>
            {shown}
          </div>
          {pct != null && foot}
        </div>
        {trend && trend.length > 1 && (
          <MiniTrend data={trend} labels={trendLabels} color={t.stroke} formatValue={trendFormat} fluid className="w-full sm:w-28" />
        )}
      </div>

      {pct != null && (
        <div className={`mt-auto ${sm ? "pt-3" : "pt-4"}`}>
        <div
          className={`mk-kpi-track ${t.chip} relative w-full h-1.5 rounded-pill overflow-hidden`}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        >
          <div className={`mk-kpi-fill mk-grow-x h-full rounded-pill ${t.fill}`} style={{ width: `${pct}%` }} />
        </div>
        </div>
      )}
      {pct == null && foot}
    </div>
  );
}
