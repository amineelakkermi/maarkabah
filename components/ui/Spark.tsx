"use client";

import { useId } from "react";

interface SparkProps {
  data: number[];
  color?: string;
  fill?: boolean;
  className?: string;
  /** Line draws itself in and the area fades up under it (default on;
   *  skipped under prefers-reduced-motion via .mk-spark-* in globals.css). */
  animate?: boolean;
  /** Brand gradient (--gradient-brand, mint → blue) on the line and its area wash instead of the flat `color`. */
  gradient?: boolean;
}

// Catmull-Rom → cubic Bézier, so the line is a smooth curve through every
// point instead of hard corners.
function smoothPath(pts: [number, number][]) {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

export { smoothPath };

export function Spark({ data, color = "var(--color-mk-blue-500)", fill = true, className = "", animate = true, gradient = false }: SparkProps) {
  const gid = useId();
  const W = 200, H = 50, PAD = 4;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - (v - min) / range) * (H - PAD * 2);
    return [x, y] as [number, number];
  });

  const d = smoothPath(pts);
  const last = pts[pts.length - 1];
  const first = pts[0];
  const fillD = `${d} L${last[0]},${H} L${first[0]},${H} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`w-full h-13 ${className}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={gradient ? "var(--gradient-brand-end)" : color} stopOpacity={gradient ? 0.28 : 0.22} />
          <stop offset="100%" stopColor={gradient ? "var(--gradient-brand-start)" : color} stopOpacity="0" />
        </linearGradient>
        {gradient && (
          <linearGradient id={`${gid}-line`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--gradient-brand-start)" />
            <stop offset="100%" stopColor="var(--gradient-brand-end)" />
          </linearGradient>
        )}
      </defs>
      {fill && <path d={fillD} fill={`url(#${gid})`} className={animate ? "mk-spark-area" : undefined} />}
      <path
        d={d}
        pathLength={1}
        fill="none"
        stroke={gradient ? `url(#${gid}-line)` : color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={animate ? "mk-spark-line" : undefined}
      />
    </svg>
  );
}
