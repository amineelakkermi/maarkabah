"use client";

import { useEffect, useId, useRef, useState } from "react";
import { smoothPath } from "./Spark";

interface MiniTrendProps {
  data: number[];
  /** Caption per point (same length as `data`) — shown above the value in the hover tooltip. */
  labels?: string[];
  /** Stroke / dot color (a CSS color or var()). */
  color?: string;
  formatValue?: (v: number) => string;
  className?: string;
  width?: number;
  height?: number;
  /** Fill the width the parent gives it (set the width via `className`, e.g. `w-full sm:w-28`) instead of the fixed `width`. */
  fluid?: boolean;
}

const PAD_X = 4;
const PAD_Y = 6;

/** KPI-sized line chart: a smooth curve with a soft area wash, the latest
 *  point marked, and a hover/touch crosshair + tooltip (same tooltip surface as
 *  AreaChart). Time always runs left → right, also in RTL. */
export function MiniTrend({
  data, labels, color = "var(--color-mk-blue-500)", formatValue = (v) => v.toLocaleString("en-US"),
  className = "", width: widthProp = 112, height = 40, fluid = false,
}: MiniTrendProps) {
  const gid = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [measured, setMeasured] = useState(widthProp);
  useEffect(() => {
    if (!fluid || !ref.current) return;
    const node = ref.current;
    const ro = new ResizeObserver(() => setMeasured(Math.round(node.getBoundingClientRect().width) || widthProp));
    ro.observe(node);
    return () => ro.disconnect();
  }, [fluid, widthProp]);
  const width = fluid ? measured : widthProp;
  const min = Math.min(...data), max = Math.max(...data), span = max - min || 1;
  const last = data.length - 1;
  const pts = data.map((v, i) => [
    PAD_X + (i / last) * (width - PAD_X * 2),
    PAD_Y + (1 - (v - min) / span) * (height - PAD_Y * 2),
  ] as [number, number]);
  const line = smoothPath(pts);
  const area = `${line} L${pts[last][0]},${height} L${pts[0][0]},${height} Z`;
  const active = hover ?? last;

  const onMove = (clientX: number) => {
    const node = ref.current;
    if (!node) return;
    const rel = clientX - node.getBoundingClientRect().left;
    const i = Math.round(((rel - PAD_X) / (width - PAD_X * 2)) * last);
    setHover(Math.max(0, Math.min(last, i)));
  };

  return (
    <div
      ref={ref}
      dir="ltr"
      className={`relative shrink-0 select-none touch-pan-y ${className}`}
      style={fluid ? { height } : { width, height }}
      onPointerMove={(e) => onMove(e.clientX)}
      onPointerDown={(e) => onMove(e.clientX)}
      onPointerLeave={() => setHover(null)}
    >
      <svg width={width} height={height} className="absolute inset-0 block overflow-visible" aria-hidden>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.26" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gid})`} className="mk-spark-area" />
        <path d={line} pathLength={1} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="mk-spark-line" />
        {hover != null && (
          <line x1={pts[hover][0]} x2={pts[hover][0]} y1={0} y2={height} stroke={color} strokeOpacity={0.35} strokeDasharray="2 3" />
        )}
        <circle cx={pts[active][0]} cy={pts[active][1]} r={3.5} fill="var(--bg-elevated)" stroke={color} strokeWidth={2} />
      </svg>
      {hover != null && (
        <div
          className="mk-chart-tip pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md px-2.5 py-1.5 mk-panel mk-shadow-menu whitespace-nowrap text-center"
          style={{ left: Math.min(Math.max(pts[hover][0], 36), width - 36), top: pts[hover][1] - 8 }}
        >
          {labels && <div className="mk-overline text-mk-ink-500">{labels[hover]}</div>}
          <div className="mk-kpi-value mk-label text-mk-ink-900">{formatValue(data[hover])}</div>
        </div>
      )}
    </div>
  );
}

/** Captions for a 7-point daily trend: the last 6 weekdays, then "Today". */
export function lastSevenDayLabels(ar: boolean): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    if (i === 6) return ar ? "اليوم" : "Today";
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString(ar ? "ar-SA-u-nu-latn" : "en-US", { weekday: "short" });
  });
}
