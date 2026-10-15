"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { smoothPath } from "./Spark";

interface AreaChartPoint {
  label: string;
  value: number;
}

interface AreaChartProps {
  data: AreaChartPoint[];
  color?: string;
  /** Plot height in px (x-axis labels sit below it). */
  height?: number;
  formatValue?: (v: number) => string;
  /** Accessible summary, e.g. "Revenue over the last 7 days". */
  ariaLabel?: string;
  /** Brand gradient (mint → blue) for the line stroke and the area fill under it, instead of the flat `color`. The crosshair, dots and pulse keep `color`. */
  gradient?: boolean;
}

const PAD_T = 14;
const PAD_B = 6;
const PAD_X = 8;

/**
 * Analytics-grade area chart: smooth curve, gradient area, dashed grid,
 * draw-in on mount, a pulsing "latest" point, and a hover/touch crosshair
 * with a tooltip. Sized to its container via ResizeObserver so the SVG is
 * never stretched (points stay round, stroke stays 2px). The SVG is
 * absolutely positioned so its measured pixel width never feeds back into
 * the grid track's min-content size (that would stop the column shrinking
 * and push the page wider than the viewport).
 *
 * Time always runs left → right (the plot and its labels are dir="ltr"),
 * so the Arabic day labels stay under their own points in RTL.
 */
export function AreaChart({
  data,
  color = "var(--color-mk-blue-500)",
  height = 160,
  formatValue = (v) => v.toLocaleString("en-US"),
  ariaLabel,
  gradient = false,
}: AreaChartProps) {
  const gid = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const values = data.map((d) => d.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  // Headroom above the peak and a floor below the trough so the curve
  // never touches the edges.
  const top = max + span * 0.12;
  const bottom = Math.max(0, min - span * 0.35);

  const plotH = height - PAD_T - PAD_B;
  const x = (i: number) => PAD_X + (i / (data.length - 1)) * (width - PAD_X * 2);
  const y = (v: number) => PAD_T + (1 - (v - bottom) / (top - bottom)) * plotH;
  const pts = data.map((d, i) => [x(i), y(d.value)] as [number, number]);

  const line = width ? smoothPath(pts) : "";
  const area = width ? `${line} L${pts[pts.length - 1][0]},${height} L${pts[0][0]},${height} Z` : "";
  const gridYs = [0.25, 0.5, 0.75].map((f) => PAD_T + f * plotH);

  const lastIdx = data.length - 1;
  const active = hover ?? null;

  const onMove = (clientX: number) => {
    const node = wrapRef.current;
    if (!node || !width) return;
    const rel = clientX - node.getBoundingClientRect().left;
    const i = Math.round(((rel - PAD_X) / (width - PAD_X * 2)) * (data.length - 1));
    setHover(Math.max(0, Math.min(lastIdx, i)));
  };

  return (
    <div dir="ltr" className="min-w-0 w-full">
      <div
        ref={wrapRef}
        className="relative w-full min-w-0 select-none touch-pan-y"
        style={{ height }}
        role="img"
        aria-label={ariaLabel}
        onPointerMove={(e) => onMove(e.clientX)}
        onPointerDown={(e) => onMove(e.clientX)}
        onPointerLeave={() => setHover(null)}
      >
        {width > 0 && (
          <svg width={width} height={height} className="absolute inset-0 block overflow-visible">
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={gradient ? "var(--gradient-brand-end)" : color} stopOpacity={gradient ? 0.32 : 0.28} />
                <stop offset="100%" stopColor={gradient ? "var(--gradient-brand-start)" : color} stopOpacity="0" />
              </linearGradient>
              {gradient && (
                <linearGradient id={`${gid}-line`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--gradient-brand-start)" />
                  <stop offset="100%" stopColor="var(--gradient-brand-end)" />
                </linearGradient>
              )}
            </defs>

            {gridYs.map((gy) => (
              <line key={gy} x1={0} x2={width} y1={gy} y2={gy} stroke="var(--color-mk-ink-200)" strokeDasharray="3 5" className="mk-chart-grid" />
            ))}

            <path d={area} fill={`url(#${gid})`} className="mk-spark-area" />
            <path
              d={line}
              pathLength={1}
              fill="none"
              stroke={gradient ? `url(#${gid}-line)` : color}
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mk-spark-line"
            />

            {/* Data nodes — pop in as the line reaches each one (gradient charts) */}
            {gradient && pts.slice(0, -1).map(([x, y], i) => (
              <circle
                key={i} cx={x} cy={y} r={3} fill="var(--bg-elevated)" stroke={color} strokeWidth={1.75}
                className="mk-chart-node" style={{ "--n-i": i / Math.max(1, pts.length - 1) } as CSSProperties}
              />
            ))}

            {/* Crosshair */}
            {active != null && (
              <line
                x1={pts[active][0]} x2={pts[active][0]} y1={PAD_T - 6} y2={height}
                stroke={color} strokeOpacity={0.35} strokeDasharray="2 3"
              />
            )}

            {/* Latest point — pulses until another point is hovered */}
            {active == null && (
              <g className="mk-chart-point">
                <circle cx={pts[lastIdx][0]} cy={pts[lastIdx][1]} r={9} fill={color} className="mk-chart-pulse" />
                <circle cx={pts[lastIdx][0]} cy={pts[lastIdx][1]} r={4.5} fill="var(--bg-elevated)" stroke={color} strokeWidth={2.25} />
              </g>
            )}
            {active != null && (
              <circle cx={pts[active][0]} cy={pts[active][1]} r={5} fill="var(--bg-elevated)" stroke={color} strokeWidth={2.5} className="mk-chart-dot" />
            )}
          </svg>
        )}

        {/* Tooltip */}
        {active != null && width > 0 && (
          <div
            className="mk-chart-tip pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md px-2.5 py-1.5 mk-panel mk-shadow-menu whitespace-nowrap"
            style={{
              left: Math.min(Math.max(pts[active][0], 44), width - 44),
              top: pts[active][1] - 12,
            }}
          >
            <div className="mk-overline text-mk-ink-500">{data[active].label}</div>
            <div className="mk-kpi-value mk-label text-mk-ink-900">{formatValue(data[active].value)}</div>
          </div>
        )}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2 mk-overline text-mk-ink-500" style={{ paddingInline: PAD_X - 4 }}>
        {data.map((d, i) => (
          <span key={d.label} className={`mk-chart-label transition-colors duration-fast ${active === i ? "text-mk-ink-900" : ""}`} style={{ "--label-i": i } as CSSProperties}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

export type { AreaChartProps, AreaChartPoint };
