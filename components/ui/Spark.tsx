"use client";

interface SparkProps {
  data: number[];
  color?: string;
  fill?: boolean;
  className?: string;
}

export function Spark({ data, color = "var(--color-mk-blue-500)", fill = true, className = "" }: SparkProps) {
  const W = 200, H = 50, PAD = 4;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - (v - min) / range) * (H - PAD * 2);
    return [x, y] as [number, number];
  });

  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const last = pts[pts.length - 1];
  const first = pts[0];
  const fillD = `${d} L${last[0]},${H} L${first[0]},${H} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`w-full h-13 ${className}`}
      preserveAspectRatio="none"
    >
      {fill && <path d={fillD} fill={color} fillOpacity="0.10" />}
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
