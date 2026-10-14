"use client";

import { Building2, Truck, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui";

const T = (en: string, ar: string, isAr: boolean) => isAr ? ar : en;

export type Place = { kind: "branch" | "delivery" | "agent"; name: string };

const KIND = {
  branch: { variant: "neutral" as const, en: "Branch", ar: "فرع", Icon: Building2 },
  delivery: { variant: "info" as const, en: "Delivered to customer", ar: "توصيل للعميل", Icon: Truck },
  agent: { variant: "violet" as const, en: "Agent pickup", ar: "استلام مندوب", Icon: UserCheck },
};

export function bookingPlaces(booking: { branch: string; pickupPlace?: "branch" | "delivery"; returnPlace?: "branch" | "agent" }, ar: boolean, branchName?: { pickup?: string; return?: string }): { pickup: Place; return: Place } {
  const customerLocation = T("Customer's location", "موقع العميل", ar);
  return {
    pickup: booking.pickupPlace === "delivery" ? { kind: "delivery", name: customerLocation } : { kind: "branch", name: branchName?.pickup ?? booking.branch },
    return: booking.returnPlace === "agent" ? { kind: "agent", name: customerLocation } : { kind: "branch", name: branchName?.return ?? booking.branch },
  };
}

export function PlaceBadge({ place, ar }: { place: Place; ar: boolean }) {
  const kind = KIND[place.kind];
  return <Badge variant={kind.variant} size="sm"><kind.Icon size={12} />{ar ? kind.ar : kind.en}</Badge>;
}

export function LocationValue({ place, ar }: { place: Place; ar: boolean }) {
  return <div className="flex flex-col items-start gap-1.5"><span>{place.name}</span><PlaceBadge place={place} ar={ar} /></div>;
}
