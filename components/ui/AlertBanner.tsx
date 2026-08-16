"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle, Clock, Info, X } from "lucide-react";
import type { ReactNode } from "react";

type AlertKind = "danger" | "warning" | "success" | "info";

interface AlertBannerProps {
  title: string;
  sub?: string;
  kind?: AlertKind;
  action?: ReactNode;
  /** Show a close (×) trigger that hides the banner. Defaults to true. */
  dismissible?: boolean;
}

// Icon colors use each kind's -700 tier, not the raw semantic color — the
// raw warning/danger/success hues fail WCAG non-text contrast (~2.2–4.0:1)
// against the icon well's near-white tint; the -700 tier clears 9:1+.
const KIND: Record<AlertKind, { wrap: string; icon: string; iconBg: string; Icon: typeof AlertTriangle }> = {
  danger:  { wrap: "border-mk-danger/20",   icon: "text-mk-danger-700",   iconBg: "bg-mk-danger/10",   Icon: AlertTriangle },
  warning: { wrap: "border-mk-warning/25",  icon: "text-mk-warning-700",  iconBg: "bg-mk-warning/12",  Icon: Clock         },
  success: { wrap: "border-mk-success/25",  icon: "text-mk-success-700",  iconBg: "bg-mk-success/10",  Icon: CheckCircle   },
  info:    { wrap: "border-mk-blue-500/20", icon: "text-mk-blue-700",     iconBg: "bg-mk-blue-500/10", Icon: Info          },
};

export function AlertBanner({ title, sub, kind = "danger", action, dismissible = true }: AlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const k = KIND[kind];
  return (
    <div className={`flex items-center gap-3 rounded-lg px-5 py-4 mb-5 bg-white shadow-[var(--shadow-card)] border ${k.wrap}`}>
      <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${k.iconBg} ${k.icon}`}>
        <k.Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="mk-h4 text-mk-ink-900">{title}</div>
        {sub && <div className="mk-caption mt-1 text-mk-ink-600">{sub}</div>}
      </div>
      {action}
      {dismissible && (
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-0 bg-transparent text-mk-ink-400 hover:text-mk-ink-700 hover:bg-mk-ink-50 cursor-pointer transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
