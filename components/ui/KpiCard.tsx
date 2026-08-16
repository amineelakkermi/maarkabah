import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";

type KpiKind = "default" | "alert" | "warn" | "mint" | "violet";

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  kind?: KpiKind;
  delta?: { dir: "up" | "down"; value: string };
}

// Tonal treatment — light tinted background + colored icon, same pairing
// used for icon chips everywhere else in the app (Badge, quick-action tiles).
const KIND_BG_CLASS: Record<KpiKind, string> = {
  default: "bg-mk-blue-50",
  alert:   "bg-mk-danger-100",
  warn:    "bg-mk-warning-100",
  mint:    "bg-mk-mint-100",
  violet:  "bg-mk-violet-100",
};

const KIND_ICON_COLOR_CLASS: Record<KpiKind, string> = {
  default: "text-mk-blue-500",
  alert:   "text-mk-danger",
  warn:    "text-mk-warning",
  mint:    "text-mk-mint-600",
  violet:  "text-mk-violet-500",
};

// text-mk-success/text-mk-danger directly on the card's white background
// fail WCAG AA (2.47:1 / 4.01:1) — the -700 pair is the accessible one,
// same darker tier Badge already uses for its success/danger variants.
const DELTA_CLASS = {
  up:   "bg-mk-success/15 text-mk-success-700",
  down: "bg-mk-danger/15  text-mk-danger-700",
};

export function KpiCard({ icon: Icon, label, value, sub, kind = "default", delta }: KpiCardProps) {
  return (
    <div className="rounded-xl p-5 bg-white shadow-[var(--shadow-card)] relative overflow-hidden">
      <div className={`w-9 h-9 rounded-md flex items-center justify-center mb-4 shrink-0 ${KIND_BG_CLASS[kind]}`}>
        <Icon size={18} className={KIND_ICON_COLOR_CLASS[kind]} />
      </div>
      <div className="mk-h1 leading-none mb-2 text-mk-ink-900 tracking-tight">
        {value}
      </div>
      <div className="mk-caption mb-2 text-mk-ink-700">{label}</div>
      {(sub || delta) && (
        <div className="flex items-center gap-2 mk-caption text-mk-ink-500">
          {delta && (
            <span className={`inline-flex items-center gap-1 mk-caption px-2 py-1 rounded-pill ${DELTA_CLASS[delta.dir]}`}>
              {delta.dir === "up" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {delta.value}
            </span>
          )}
          {sub && <span>{sub}</span>}
        </div>
      )}
    </div>
  );
}
