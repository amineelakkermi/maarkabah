import { Gauge, Droplet, CircleDot, KeyRound, TriangleAlert, HeartPulse, FireExtinguisher, Wrench, Armchair, Wind, Monitor, Music, Zap, Car } from "lucide-react";

export const HANDOVER_ITEM_ICONS: Record<string, typeof Gauge> = {
  odometer: Gauge,
  fuel: Droplet,
  tires: CircleDot,
  glass: Car,
  body: TriangleAlert,
  keys: KeyRound,
  triangle: TriangleAlert,
  firstaid: HeartPulse,
  extinguisher: FireExtinguisher,
  spareKey: KeyRound,
  spareTire: CircleDot,
  tools: Wrench,
  seats: Armchair,
  ac: Wind,
  screen: Monitor,
  audio: Music,
  power: Zap,
  smoke: Wind,
};
