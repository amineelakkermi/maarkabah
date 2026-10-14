"use client";

import { useState, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { IconButton } from "./IconButton";

type SuccessTone = "mint" | "blue" | "violet";

interface SuccessDetail {
  label: ReactNode;
  value: ReactNode;
}

interface SuccessCardProps {
  /** Icon drawn inside the badge — defaults to the animated check. */
  icon?: ReactNode;
  tone?: SuccessTone;
  title: ReactNode;
  /** One line under the title (e.g. contract number, plate). */
  subtitle?: ReactNode;
  description?: ReactNode;
  /** Key facts shown as a compact list that rises in after the title. */
  details?: SuccessDetail[];
  /** Buttons row. */
  actions?: ReactNode;
  /** "Next step" hint rendered under the actions. */
  next?: ReactNode;
  className?: string;
}

const TONES: Record<SuccessTone, { badge: string; dots: string[] }> = {
  mint: {
    badge: "bg-mk-mint-surface text-mk-mint-600",
    dots: ["var(--color-mk-mint-500)", "var(--color-mk-blue-500)", "var(--color-mk-violet-500)"],
  },
  blue: {
    badge: "bg-mk-blue-100 text-mk-blue-600",
    dots: ["var(--color-mk-blue-500)", "var(--color-mk-mint-500)", "var(--color-mk-violet-500)"],
  },
  violet: {
    badge: "bg-mk-violet-100 text-mk-violet-600",
    dots: ["var(--color-mk-violet-500)", "var(--color-mk-blue-500)", "var(--color-mk-mint-500)"],
  },
};

const PIECES = 44;

/** Full-screen confetti rain over the current page; unmounts itself once it has fallen. */
function ScreenConfetti({ colors }: { colors: string[] }) {
  const [mounted, setMounted] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    setMounted(true);
    const t = setTimeout(() => setDone(true), 3600);
    return () => clearTimeout(t);
  }, []);
  if (!mounted || done) return null;
  return createPortal(
    <div className="mk-succ-screen" aria-hidden="true">
      {Array.from({ length: PIECES }, (_, i) => (
        <span
          key={i}
          className="mk-succ-piece"
          style={{
            insetInlineStart: `${(i * 97) % 100}%`,
            background: colors[i % colors.length],
            "--dx": `${((i * 37) % 160) - 80}px`,
            "--r": `${(i % 2 ? 1 : -1) * (360 + ((i * 53) % 360))}deg`,
            "--dl": `${(i * 41) % 700}ms`,
            "--du": `${2000 + ((i * 67) % 1200)}ms`,
          } as React.CSSProperties}
        />
      ))}
    </div>,
    document.body,
  );
}

/** Animated confirmation: confetti rains over the whole screen, the thin check draws itself (click it to replay), then content rises in order. */
function SuccessCard({ icon, tone = "mint", title, subtitle, description, details, actions, next, className = "" }: SuccessCardProps) {
  const [burst, setBurst] = useState(0);
  const t = TONES[tone];
  let order = 0;
  const rise = () => ({ "--rd": `${300 + 70 * order++}ms` }) as React.CSSProperties;

  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <ScreenConfetti key={burst} colors={t.dots} />
      <button
        key={`b${burst}`}
        type="button"
        onClick={() => setBurst((b) => b + 1)}
        aria-label="Replay"
        className={`mk-succ-badge w-14 h-14 mb-4 rounded-full flex items-center justify-center border-0 ${t.badge}`}
      >
        <span className="mk-succ-ring" aria-hidden="true" />
        {icon ?? (
          <svg className="mk-success-check" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle className="c1" cx="12" cy="12" r="9.5" pathLength="1" />
            <path className="c2" d="M8 12.4l2.8 2.8L16.2 9.6" pathLength="1" />
          </svg>
        )}
      </button>

      <div className="mk-succ-rise mk-h4 mb-1 text-mk-ink-900" style={rise()}>{title}</div>
      {subtitle && <div className="mk-succ-rise mk-label text-mk-ink-500 mb-1" style={rise()}>{subtitle}</div>}
      {description && <p className="mk-succ-rise mk-caption text-mk-ink-400 m-0 mb-4" style={rise()}>{description}</p>}

      {details && details.length > 0 && (
        <div className="mk-succ-rise w-full max-w-sm rounded-lg border border-mk-border bg-mk-bg-muted px-4 py-1 mb-5 text-start" style={rise()}>
          {details.map((d, i) => (
            <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-mk-border last:border-b-0 mk-caption">
              <span className="text-mk-ink-500">{d.label}</span>
              <strong className="text-mk-ink-900 text-end">{d.value}</strong>
            </div>
          ))}
        </div>
      )}

      {actions && <div className="mk-succ-rise flex flex-wrap items-center justify-center gap-2" style={rise()}>{actions}</div>}
      {next && <div className="mk-succ-rise w-full mt-5" style={rise()}>{next}</div>}
    </div>
  );
}

interface SuccessDialogProps extends Omit<SuccessCardProps, "className"> {
  open: boolean;
  onClose: () => void;
}

/** SuccessCard in a small centered dialog with no header bar — just a close button in the corner (Esc / backdrop closes). */
function SuccessDialog({ open, onClose, ...card }: SuccessDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-[fi_0.2s_ease-out]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md max-h-[92vh] overflow-y-auto mk-scrollbar mk-surface rounded-2xl shadow-xl border border-mk-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-3 end-3">
          <IconButton size="sm" onClick={onClose} aria-label="Close"><X size={16} /></IconButton>
        </div>
        <SuccessCard {...card} className="px-6 py-10" />
      </div>
    </div>
  );
}

export { SuccessCard, SuccessDialog };
export type { SuccessCardProps, SuccessDialogProps, SuccessDetail, SuccessTone };