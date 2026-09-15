import type { Car } from "@/lib/data";
import type { TajeerContractType } from "@/lib/tajeer";
import { SYSTEM_VEHICLE_TRANSFER_COST, SYSTEM_COVERAGE_BASE_COST } from "./constants";
import type { ContractAdditionalService } from "./useContractLookups";

const HOUR_MS = 1000 * 60 * 60;
const DAY_MS = HOUR_MS * 24;

/* ── Rental period derived values (dates → durations) ─────────────── */
export function computeRental(pickupDateTime: string, returnDateTime: string) {
  const pickupDate = new Date(pickupDateTime);
  const returnDate = new Date(returnDateTime);
  const rentalMs = Math.max(0, returnDate.getTime() - pickupDate.getTime());
  const rentalWholeDays = Math.floor(rentalMs / DAY_MS);
  const rentalExtraHours = Math.floor((rentalMs % DAY_MS) / HOUR_MS);
  const days = Math.max(1, Math.ceil(rentalMs / DAY_MS));
  const totalHours = Math.max(1, Math.ceil(rentalMs / HOUR_MS));
  const isHourlyRental = returnDate.getTime() - pickupDate.getTime() < DAY_MS;
  return { pickupDate, returnDate, rentalMs, rentalWholeDays, rentalExtraHours, days, totalHours, isHourlyRental };
}

/* ── Contract pricing (base + add-ons + fares → discount → VAT → total) ── */
export type PricingInput = {
  contractTypeCode: TajeerContractType;
  days: number;
  totalHours: number;
  car: Car | undefined;
  rentDayCost: number;
  rentHourCost: number;
  addons: Record<string, boolean>;
  additionalServices: ContractAdditionalService[];
  deliveryKm: number;
  hasExtraDriver: boolean;
  driverFarePerDay: number;
  driverFarePerHour: number;
  receiveBranchId: number;
  returnBranchId: number;
  vehicleTransferCost: number;
  internationalAuthorizationCost: number;
  extendedCoverageId: number | undefined;
  additionalCoverageCost: number;
  fullFuelCost: number;
  discountType: "percent" | "amount";
  discountPercent: number;
  discountFlatAmount: number;
};

export type Pricing = ReturnType<typeof computePricing>;

export function computePricing(p: PricingInput) {
  const base = (p.contractTypeCode === 2 || p.contractTypeCode === 4)
    ? p.rentHourCost * p.totalHours
    : (p.rentDayCost || p.car?.dailyRate || 0) * p.days;
  const addonPrices = Object.fromEntries(p.additionalServices.map((service) => {
    const key = service.key.toLowerCase().replace(/[-\s]+/g, "_");
    const quantity = service.billingUnit === 2 ? p.days : service.billingUnit === 3 ? p.deliveryKm : 1;
    return [key, service.unitPrice * quantity];
  }));

  const addonTotal = Object.entries(p.addons)
    .filter(([key, enabled]) => enabled && key !== "driver")
    .reduce((sum, [key]) => sum + (addonPrices[key] ?? 0), 0);
  const extraDriverFare = p.hasExtraDriver
    ? (p.contractTypeCode === 4 ? p.driverFarePerHour * p.totalHours : p.driverFarePerDay * p.days)
    : 0;
  const transferFare = p.receiveBranchId !== p.returnBranchId ? (p.vehicleTransferCost || SYSTEM_VEHICLE_TRANSFER_COST) : 0;
  // No branch/coverage-style gate exists for this one — it's opt-in per contract
  // (only relevant when the authorization is actually international), so its
  // real registered default is "no fee" until the employee enters one.
  const authorizationFare = p.internationalAuthorizationCost;
  const coverageFare = p.extendedCoverageId ? (p.additionalCoverageCost || SYSTEM_COVERAGE_BASE_COST) : 0;
  const grossSubtotal = base + addonTotal + extraDriverFare + transferFare + authorizationFare + coverageFare + p.fullFuelCost;
  const discountAmount = p.discountType === "percent"
    ? Math.round(grossSubtotal * (p.discountPercent / 100))
    : Math.min(p.discountFlatAmount, grossSubtotal);
  const subtotal = grossSubtotal - discountAmount;
  // Round VAT to 2 decimals, not to the integer — the backend keeps the exact
  // decimal amount (e.g. 2750 × 15% = 412.5 → total 3162.5), and rejecting any
  // paidAmount above it means rounding up here would exceed the backend total.
  const vat = Math.round(subtotal * 0.15 * 100) / 100;
  const total = subtotal + vat;
  const advanceAmount = Math.round(total * 0.5 * 100) / 100;
  const remaining = total - advanceAmount;

  return {
    base, addonPrices, addonTotal, extraDriverFare, transferFare, authorizationFare, coverageFare,
    grossSubtotal, discountAmount, subtotal, vat, total, advanceAmount, remaining,
  };
}
