import { Car } from "lucide-react";

// Tonal colour per vehicle category — same bg-{color}-50/100 + text-{color}
// pairing used across KpiCard, Badge, and option cards (see design-system
// Iconography section). Falls back to blue for unmapped categories.
const TYPE_TONE: Record<string, { bg: string; fg: string }> = {
  Sedan:   { bg: "bg-mk-blue-50",     fg: "text-mk-blue-500" },
  SUV:     { bg: "bg-mk-violet-100",  fg: "text-mk-violet-500" },
  Luxury:  { bg: "bg-mk-warning-100", fg: "text-mk-warning" },
  Economy: { bg: "bg-mk-mint-100",    fg: "text-mk-mint-600" },
};
const DEFAULT_TONE = { bg: "bg-mk-blue-50", fg: "text-mk-blue-500" };

interface VehicleTypeIconProps {
  /** Car.type — "Sedan" | "SUV" | "Luxury" | "Economy" (or unmapped). */
  type?: string;
  /** Icon glyph size in px. */
  size?: number;
  /** Sizes/spacing for the box, e.g. "w-9 h-9". */
  className?: string;
}

// Fallback icon shown in place of a vehicle photo — a tonal Car glyph
// colour-coded by category, replacing the old car.emoji field.
export function VehicleTypeIcon({ type, size = 16, className = "" }: VehicleTypeIconProps) {
  const tone = (type && TYPE_TONE[type]) || DEFAULT_TONE;
  return (
    <div className={`rounded-md flex items-center justify-center shrink-0 ${tone.bg} ${className}`}>
      <Car size={size} className={tone.fg} />
    </div>
  );
}
