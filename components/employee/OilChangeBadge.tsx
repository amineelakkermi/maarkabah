"use client";

import { Badge } from "@/components/ui";
import { getOilChangeStatus, type Car } from "@/lib/data";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

/** Shared label text for the oil-change reminder — used by both the Badge
 * version below and the image-overlay version on the fleet grid card, so
 * the wording never drifts between the two renderings. */
export function oilChangeLabel(car: Car, ar: boolean): string | null {
  const { status, remainingKm, remainingDays } = getOilChangeStatus(car);
  if (status === "ok") return null;
  if (status === "overdue") return T("Oil change overdue", "تغيير الزيت متأخر", ar);
  if (remainingKm != null && remainingKm <= 500) return T(`Oil change due in ${remainingKm} km`, `تغيير الزيت مستحق خلال ${remainingKm} كم`, ar);
  return T(`Oil change due in ${remainingDays}d`, `تغيير الزيت مستحق خلال ${remainingDays} يوم`, ar);
}

/** Oil-change reminder badge — shared between the fleet list/settings
 * pages and the new-contract vehicle picker so both surfaces show the
 * same "due soon / overdue" signal computed from getOilChangeStatus. */
export function OilChangeBadge({ car, ar }: { car: Car; ar: boolean }) {
  const { status } = getOilChangeStatus(car);
  const label = oilChangeLabel(car, ar);
  if (!label) return null;
  return (
    <Badge variant={status === "overdue" ? "danger" : "warning"} className="mk-overline py-1 px-2 leading-none shrink-0">
      {label}
    </Badge>
  );
}