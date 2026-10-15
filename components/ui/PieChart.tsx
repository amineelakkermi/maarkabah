"use client";

import { useId, useState, type CSSProperties } from "react";

export interface PieChartSlice {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieChartSlice[];
  /** Diameter of the chart in px. */
  size?: number;
  /** 0 = a full pie; > 0 = a donut with that share of the radius cut out (rounded-cap arcs, total in the center). */
  inner?: number;
  formatValue?: (v: number) => string;
  /** Small caption under the total in a donut's center. */
  totalLabel?: string;
  ariaLabel?: string;
  /** Controlled highlight (e.g. synced with a legend next to the chart); omit to let the chart manage hover itself. */
  activeIndex?: number | null;
  onActiveChange?: (i: number | null) => void;
  /** Click / Enter on a slice. */
  onSliceClick?: (i: number) => void;
  /** Fill the largest slice with the brand gradient (mint → blue) instead of its own color. */
  gradientLargest?: boolean;
  /** "rings": concentric activity rings — one rounded-cap ring per category, its arc length = its share of the whole, on dark tracks. Default "pie" (pie / donut). */
  variant?: "pie" | "rings";
  /** Scale to the full width of the container (the chart keeps its proportions) instead of the fixed `size` in px. */
  fill?: boolean;
}

/**
 * Pie / donut chart of how a whole splits across categories.
 *
 * variant="rings" draws concentric activity rings instead (one per category, arc length = share of the whole); the rings draw themselves
 * one after another, outermost first (.mk-ring-draw).
 *
 * Donut look: thick rounded-cap arcs with small gaps, each arc a soft light → base gradient of its color, a faint track and a hairline
 * outer ring behind them, the total (or the hovered slice) in the center with a small caption under it. On mount the whole chart spins in while
 * fading up, each arc fading in after the other. Hover / focus a slice: it thickens, the others dim.
 */
export function PieChart({
  data, size = 200, inner = 0, formatValue = (v) => v.toLocaleString("en-US"), totalLabel, ariaLabel,
  activeIndex, onActiveChange, onSliceClick, gradientLargest = false, variant = "pie", fill = false,
}: PieChartProps) {
  const gid = useId();
  const [localActive, setLocalActive] = useState<number | null>(null);
  const controlled = activeIndex !== undefined;
  const active = controlled ? activeIndex : localActive;
  const setActive = (i: number | null) => { if (!controlled) setLocalActive(i); onActiveChange?.(i); };

  const total = data.reduce((s, d) => s + d.value, 0);
  if (total <= 0) return null;

  const rings = variant === "rings";
  const donut = inner > 0 || rings;
  const largest = gradientLargest ? data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0) : -1;
  const PAD = 14;
  const W = size + PAD * 2;
  const c = W / 2, R = size / 2, r = R * inner;
  const thick = R - r;
  const rm = (R + r) / 2; // arc radius of a donut slice
  const GAP = data.filter((d) => d.value > 0).length > 1 ? (donut ? 0.045 : 0.02) : 0;
  const pt = (ang: number, rad: number) => [c + Math.cos(ang) * rad, c + Math.sin(ang) * rad];

  // Rings layout: outermost ring first, thickness adapts to the number of rings, the middle stays clear for the total.
  const ringUsable = R * 0.62;
  const ringPer = ringUsable / data.length;
  const ringThick = Math.min(ringPer * 0.68, 20);
  const ringR = (i: number) => R - ringThick / 2 - i * ringPer;

  let acc = -Math.PI / 2;
  const slices = data.map((d, i) => {
    if (rings) {
      const rr = ringR(i);
      const share = Math.round((d.value / total) * 100);
      const sweep = Math.max((d.value / total) * Math.PI * 2, (ringThick / rr) * 1.1);
      const a0 = -Math.PI / 2, a1 = Math.min(a0 + sweep, a0 + Math.PI * 2 - 0.001);
      const [x0, y0] = pt(a0, rr), [x1, y1] = pt(a1, rr);
      const path = `M${x0},${y0} A${rr},${rr} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1},${y1}`;
      const mid = (a0 + a1) / 2;
      const [tx, ty] = pt(mid, rr);
      return { path, round: true, mid, tx, ty, share };
    }
    const sweep = (d.value / total) * Math.PI * 2;
    const start = acc; acc += sweep;
    const share = Math.round((d.value / total) * 100);
    let a0 = start + GAP / 2, a1 = start + sweep - GAP / 2;
    const mid = (start + start + sweep) / 2;
    let path: string, round = false;
    if (donut) {
      const cap = thick / 2 / rm; // angle the round cap adds on each end
      round = a1 - a0 > cap * 2 + 0.1;
      if (round) { a0 += cap; a1 -= cap; }
      const [x0, y0] = pt(a0, rm), [x1, y1] = pt(a1, rm);
      path = `M${x0},${y0} A${rm},${rm} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1},${y1}`;
    } else {
      const [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R);
      path = `M${c},${c} L${x0},${y0} A${R},${R} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1},${y1} Z`;
    }
    const [tx, ty] = pt(mid, donut ? rm : R * 0.62);
    return { path, round, mid, tx, ty, share };
  });

  const fillFor = (i: number) => (i === largest ? `url(#${gid}-brand)` : donut ? `url(#${gid}-g${i})` : data[i].color);

  return (
    <div dir="ltr" className="relative mx-auto" style={{ width: fill ? "100%" : W, maxWidth: "100%" }}>
      <svg viewBox={`0 0 ${W} ${W}`} className="block w-full h-auto overflow-visible" role="img" aria-label={ariaLabel}>
        <defs>
          <linearGradient id={`${gid}-brand`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--gradient-brand-start)" />
            <stop offset="100%" stopColor="var(--gradient-brand-end)" />
          </linearGradient>
          {data.map((d, i) => (
            <linearGradient key={i} id={`${gid}-g${i}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={`color-mix(in srgb, ${d.color} 70%, white)`} />
              <stop offset="100%" stopColor={d.color} />
            </linearGradient>
          ))}
        </defs>

        <g className={rings ? undefined : "mk-pie-spin"} style={{ transformOrigin: `${c}px ${c}px` } as CSSProperties}>
          {donut && (
            <>
              {/* hairline outer ring + faint track the arcs sit on */}
              {!rings && <circle cx={c} cy={c} r={R + 9} fill="none" stroke="var(--color-mk-ink-200)" strokeWidth={1} />}
              {rings
                ? data.map((_, i) => <circle key={i} cx={c} cy={c} r={ringR(i)} fill="none" stroke="var(--color-mk-ink-100)" strokeWidth={ringThick} opacity={0.7} className="mk-chart-grid" />)
                : <circle cx={c} cy={c} r={rm} fill="none" stroke="var(--color-mk-ink-100)" strokeWidth={thick} opacity={0.6} />}
            </>
          )}
          {slices.map((sl, i) => {
            const on = active === i;
            const dim = active != null && !on;
            return (
              <g key={i} className={rings ? undefined : "mk-pie-slice"} style={{ "--n-i": i / data.length, "--ring-i": i } as CSSProperties}>
                <path
                  d={sl.path}
                  fill={donut ? "none" : fillFor(i)}
                  stroke={donut ? fillFor(i) : "none"}
                  strokeWidth={donut ? (on ? (rings ? ringThick + 5 : thick + 6) : (rings ? ringThick : thick)) : 0}
                  strokeLinecap={sl.round ? "round" : "butt"}
                  className={`cursor-pointer outline-none ${rings ? "mk-ring-draw" : ""}`}
                  pathLength={rings ? 1 : undefined}
                  tabIndex={0}
                  role="button"
                  aria-label={`${data[i].label}: ${formatValue(data[i].value)} (${sl.share}%)`}
                  onClick={() => onSliceClick?.(i)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSliceClick?.(i); } }}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  onPointerEnter={() => setActive(i)}
                  onPointerLeave={() => setActive(null)}
                  style={{
                    opacity: dim ? 0.3 : 1,
                    transform: !donut && on ? `translate(${Math.cos(sl.mid) * 8}px, ${Math.sin(sl.mid) * 8}px)` : undefined,
                    transition: "stroke-width 180ms var(--ease-standard), opacity 180ms var(--ease-standard), transform 180ms var(--ease-standard)",
                  }}
                />
              </g>
            );
          })}
        </g>
      </svg>

      {donut && (
        // The center shows the total; while a slice is hovered it shows that slice instead (value, share, its own pill).
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-6">
          <span className="mk-kpi-value mk-h1 text-mk-ink-900 leading-none">{formatValue(active != null ? data[active].value : total)}</span>
          {(active != null || totalLabel) && (
            // dir="auto" follows the label's language (Arabic reads right-to-left); the % stays glued to its number via an isolated LTR run.
            <span dir="auto" className="inline-flex items-center gap-1.5 mt-0.5 mk-overline font-normal! text-mk-ink-500 whitespace-nowrap">
              {active != null ? (
                <>
                  <bdi>{data[active].label}</bdi>
                  <bdi dir="ltr">{slices[active].share}%</bdi>
                </>
              ) : totalLabel}
            </span>
          )}
        </div>
      )}

      {!donut && active != null && (
        <div
          className="mk-chart-tip pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md px-2.5 py-1.5 mk-panel mk-shadow-menu whitespace-nowrap"
          style={{ left: `${(slices[active].tx / W) * 100}%`, top: `calc(${(slices[active].ty / W) * 100}% - 10px)` }}
        >
          <div className="flex items-center gap-1.5 mk-overline text-mk-ink-500">
            <span aria-hidden className="w-2 h-2 rounded-full" style={{ background: data[active].color }} />{data[active].label}
          </div>
          <div className="mk-kpi-value mk-label text-mk-ink-900">{formatValue(data[active].value)} <span className="text-mk-ink-500 font-normal ms-1.5"><bdi dir="ltr">{slices[active].share}%</bdi></span></div>
        </div>
      )}
    </div>
  );
}
