"use client";

import { FileText, ShieldAlert, Droplet, type LucideIcon } from "lucide-react";
import { getOilChangeStatus, type Car } from "@/lib/data";
import { oilChangeLabel } from "./OilChangeBadge";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

export type FleetAlertKind = "license" | "inspection" | "oil";

export interface FleetAlert {
  kind: FleetAlertKind;
  tone: "warning" | "danger";
  label: string;
}

const ALERT_ICONS: Record<FleetAlertKind, LucideIcon> = {
  license: FileText,
  inspection: ShieldAlert,
  oil: Droplet,
};

/** Fixed hex literals (not --color-mk-warning/danger) since those tokens
 * shift between light/dark mode — an alert's severity color should read
 * identically in both themes, matching the image-overlay pills. */
export const FLEET_ALERT_COLORS = { warning: "#E2A341", danger: "#E24171" } as const;

/** Worst tone across every alert on a car — null when there's nothing to
 * flag. Used to color the card's own border so the alert is visible even
 * without reading the individual badges. */
export function fleetAlertSeverity(car: Car, ar: boolean): "warning" | "danger" | null {
  const alerts = fleetAlerts(car, ar);
  if (alerts.some((a) => a.tone === "danger")) return "danger";
  if (alerts.length > 0) return "warning";
  return null;
}

/** Every fleet-condition alert that applies to a car — license renewal,
 * expired inspection, oil-change due/overdue — as one flat list, so the
 * grid image overlay and the list "Alerts" column render the exact same
 * set instead of each re-deriving it. */
export function fleetAlerts(car: Car, ar: boolean): FleetAlert[] {
  const alerts: FleetAlert[] = [];
  if (car.id === 4) alerts.push({ kind: "license", tone: "warning", label: T("License Renewal", "تجديد الاستمارة", ar) });
  if (car.id === 6) alerts.push({ kind: "inspection", tone: "danger", label: T("Inspection Expired", "الفحص منتهي", ar) });
  const oilLabel = oilChangeLabel(car, ar);
  if (oilLabel) alerts.push({ kind: "oil", tone: getOilChangeStatus(car).status === "overdue" ? "danger" : "warning", label: oilLabel });
  return alerts;
}

/** Solid filled pills overlaid on the car photo — a light tonal tint reads
 * poorly over a photo of unpredictable brightness, so this uses the full
 * solid color (colored bg + white text/icon) instead, same as a filled
 * Button/Badge. Inline in one row, wrapping if there's more than fits.
 * Fixed hex literals (not --color-mk-warning/danger) since those tokens
 * shift between light/dark mode — the photo itself doesn't, so the pill
 * should read identically in both themes instead of flipping shade. */
export function FleetAlertImageOverlay({ car, ar, corner = "top-start" }: { car: Car; ar: boolean; corner?: "top-start" | "top-end" | "bottom-start" }) {
  const alerts = fleetAlerts(car, ar);
  if (alerts.length === 0) return null;
  const [v, h] = corner.split("-") as ["top" | "bottom", "start" | "end"];
  return (
    <div className={`absolute ${v === "top" ? "top-2" : "bottom-2"} ${h === "start" ? "start-2 justify-start" : "end-2 justify-end"} z-30 flex flex-wrap items-center gap-1`}>
      {alerts.map((a) => {
        const Icon = ALERT_ICONS[a.kind];
        return (
          <span
            key={a.kind}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full mk-overline text-white shadow-sm"
            style={{ background: FLEET_ALERT_COLORS[a.tone] }}
          >
            <Icon size={11} className="shrink-0" />
            {a.label}
          </span>
        );
      })}
    </div>
  );
}

/** Tinted Badge pills, inline in one row — used in the list view's dedicated
 * "Alerts" column and in the new-contract vehicle picker. `showEmpty` draws
 * a placeholder dash when there's nothing to show — wanted in a standalone
 * table column, not when embedded inline among other info. */
export function FleetAlertBadgeList({ car, ar, showEmpty = true }: { car: Car; ar: boolean; showEmpty?: boolean }) {
  const alerts = fleetAlerts(car, ar);
  if (alerts.length === 0) return showEmpty ? <span className="mk-caption text-mk-ink-300">—</span> : null;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {alerts.map((a) => {
        const Icon = ALERT_ICONS[a.kind];
        return (
          <span
            key={a.kind}
            className={`flex items-center gap-1 mk-overline py-1 px-2 leading-none rounded-full shrink-0 ${a.tone === "danger" ? "bg-mk-danger-100 text-mk-danger-700" : "bg-mk-warning-100 text-mk-warning-700"}`}
          >
            <Icon size={11} className="shrink-0" />
            {a.label}
          </span>
        );
      })}
    </div>
  );
}