"use client";

import { Info, Lock, CreditCard, Banknote, Tag } from "lucide-react";
import { Badge, Input, Money, RiyalSymbol, Select, Tabs } from "@/components/ui";
import type { Car } from "@/lib/data";
import type { TajeerContractType } from "@/lib/tajeer";
import type { ContractAdditionalService, ContractDiscountRate } from "./useContractLookups";
import {
  T, ADD_ONS,
  SYSTEM_DRIVER_FARE_PER_DAY, SYSTEM_DRIVER_FARE_PER_HOUR,
  SYSTEM_VEHICLE_TRANSFER_COST,
} from "./constants";
import type { Pricing } from "./pricing";
import { PriceBreakdown, type PriceRow } from "./PriceBreakdown";
import { PriceInputField, PriceInput } from "./PriceInput";

export type StepPricingPaymentProps = {
  ar: boolean;
  car: Car | undefined;
  contractTypeCode: TajeerContractType;
  days: number;
  totalHours: number;
  addons: Record<string, boolean>;
  unlimitedKm: boolean;
  receiveBranchId: number;
  returnBranchId: number;
  // Editable rates
  rentDayCost: number; setRentDayCost: (v: number) => void;
  rentHourCost: number; setRentHourCost: (v: number) => void;
  extraKmCost: number; setExtraKmCost: (v: number) => void;
  fullFuelCost: number; setFullFuelCost: (v: number) => void;
  driverFarePerDay: number; setDriverFarePerDay: (v: number) => void;
  driverFarePerHour: number; setDriverFarePerHour: (v: number) => void;
  vehicleTransferCost: number; setVehicleTransferCost: (v: number) => void;
  internationalAuthorizationCost: number; setInternationalAuthorizationCost: (v: number) => void;
  allowedKmPerDay: number; setAllowedKmPerDay: (v: number) => void;
  allowedLateHours: number; setAllowedLateHours: (v: number) => void;
  lateFeePerHour: number; setLateFeePerHour: (v: number) => void;
  // Discount — picked from the tenant's named discount-rate catalog; only the
  // percent goes to the backend (discountPercent).
  discountType: "percent" | "amount";
  discountPercent: number;
  discountRates: ContractDiscountRate[];
  discountRateId: number | null;
  onDiscountRateChange: (id: number | null) => void;
  // Payment
  payType: "full" | "advance"; setPayType: (v: "full" | "advance") => void;
  payMethod: string; setPayMethod: (v: string) => void;
  setAdvanceCost: (v: number) => void;
  pricing: Pricing;
  additionalServices: ContractAdditionalService[];
};

export function StepPricingPayment({
  ar, car, contractTypeCode, days, totalHours, addons, unlimitedKm, receiveBranchId, returnBranchId,
  rentDayCost, setRentDayCost, rentHourCost, setRentHourCost, extraKmCost, setExtraKmCost, fullFuelCost, setFullFuelCost,
  driverFarePerDay, setDriverFarePerDay, driverFarePerHour, setDriverFarePerHour, vehicleTransferCost, setVehicleTransferCost,
  internationalAuthorizationCost, setInternationalAuthorizationCost,
  allowedKmPerDay, setAllowedKmPerDay, allowedLateHours, setAllowedLateHours, lateFeePerHour, setLateFeePerHour,
  discountType, discountPercent, discountRates, discountRateId, onDiscountRateChange, payType, setPayType, payMethod, setPayMethod, setAdvanceCost, pricing, additionalServices,
}: StepPricingPaymentProps) {
  const {
    base, addonPrices, extraDriverFare, transferFare, authorizationFare,
    discountAmount, subtotal, vat, total, advanceAmount, remaining,
  } = pricing;

  // Breakdown add-on lines — same key normalization as the picker step.
  const legacySupplementaryKeys = new Set(["fuel", "return_agent"]);
  const serviceByKey = new Map(additionalServices.map((s) => [s.key.toLowerCase().replace(/[-\s]+/g, "_"), s]));
  const addOnLines = (basic: boolean): PriceRow[] =>
    Object.entries(addons)
      .filter(([k, on]) => on && k !== "driver")
      .filter(([k]) => { const type = serviceByKey.get(k)?.type; return type != null ? (type === 1) === basic : basic === !legacySupplementaryKeys.has(k); })
      .map(([k]) => {
        const s = serviceByKey.get(k);
        const fallback = ADD_ONS.find((a) => a.k === k);
        return {
          key: k,
          label: ar ? (s?.nameAr || fallback?.nameAr || k) : (s?.nameEn || fallback?.nameEn || k),
          sub: s ? (ar
            ? (s.billingUnit === 2 ? "/ يوم" : s.billingUnit === 3 ? "/ كم" : "· مرة واحدة")
            : (s.billingUnit === 2 ? "/ day" : s.billingUnit === 3 ? "/ Km" : "· once")) : undefined,
          amount: addonPrices[k] ?? 0,
        };
      });
  const breakdownFees: PriceRow[] = ([
    extraDriverFare > 0 && { key: "extra_driver", label: T("Extra driver fare", "أجرة السائق الإضافي", ar), amount: extraDriverFare },
    transferFare > 0 && { key: "transfer", label: T("Delivery to another city", "تسليم السيارة إلى مدن أخرى", ar), amount: transferFare },
    authorizationFare > 0 && { key: "authorization", label: T("International authorization", "التفويض الدولي", ar), amount: authorizationFare },
    fullFuelCost > 0 && { key: "fuel", label: T("Full fuel rate (not charged)", "سعر الوقود الممتلئ (غير مفروض)", ar), amount: fullFuelCost, muted: true },
  ] as const).filter((r): r is PriceRow => Boolean(r));
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[7fr_5fr] items-start gap-5">

      {/* Right column (RTL): Pricing details — its own card, editable per contract nature */}
      <div className="flex flex-col gap-5">
        <div className="mk-surface rounded-xl p-5">
          <div className="mk-h4 mb-4 text-mk-ink-900">{T("Pricing Details", "تفاصيل أسعار العقد", ar)}</div>

          {/* Rates registered on the vehicle profile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
            {(contractTypeCode === 1 || contractTypeCode === 3) && (
              <PriceInput
                label={T("Day rate (SAR)", "سعر اليوم", ar)}
                value={rentDayCost || car?.dailyRate || 0}
                defaultValue={car?.dailyRate || 0}
                onChange={setRentDayCost}
                ar={ar}
              />
            )}
            {(contractTypeCode === 2 || contractTypeCode === 4) && (
              <PriceInput
                label={T("Hour rate (SAR)", "سعر الساعة", ar)}
                value={rentHourCost || Math.round((car?.dailyRate || 0) / 8)}
                defaultValue={Math.round((car?.dailyRate || 0) / 8)}
                onChange={setRentHourCost}
                ar={ar}
              />
            )}
            <div>
              <label className="mk-overline mb-2 block text-mk-ink-600">{T("Extra km cost (SAR/km)", "سعر الكم الزائد", ar)}</label>
              <PriceInputField
                value={extraKmCost}
                defaultValue={car?.extraKmCost || 0}
                onChange={setExtraKmCost}
                ar={ar}
              />
              {(unlimitedKm || addons.unlimited_km) && (
                <p className="flex items-center gap-1 mk-caption text-mk-ink-400 mt-1">
                  <Info size={12} className="shrink-0" />
                  {T("Not applied with unlimited km", "لا يُطبَّق مع الكيلومتر المفتوح", ar)}
                </p>
              )}
            </div>

            {contractTypeCode === 4 && driverFarePerHour > 0 && (
              <div className="flex flex-col">
                <span className="mk-overline text-mk-ink-400 uppercase">{T("Total driver fare", "إجمالي أجرة السائق", ar)}</span>
                <span className="mk-label text-mk-blue-600 mt-1">
                  {(driverFarePerHour * days).toLocaleString()} {T("SAR", "ريال", ar)}
                </span>
              </div>
            )}
          </div>

          {/* Additional contract-specific costs — editable per contract nature */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PriceInput
              label={T("Full fuel rate (SAR) — not charged", "سعر الوقود الممتلئ — غير مفروض", ar)}
              value={fullFuelCost}
              defaultValue={car?.fullFuelCost || 0}
              onChange={setFullFuelCost}
              ar={ar}
            />
            {contractTypeCode === 3 && (
              <div>
                <label className="mk-overline mb-2 block text-mk-ink-600">
                  {T("Total driver fare (SAR)", "إجمالي أجرة السائق", ar)}
                </label>
                <PriceInputField
                  value={(driverFarePerDay || SYSTEM_DRIVER_FARE_PER_DAY) * days}
                  defaultValue={SYSTEM_DRIVER_FARE_PER_DAY * days}
                  onChange={(v) => setDriverFarePerDay(Math.round(v / days))}
                  ar={ar}
                />
              </div>
            )}
            {contractTypeCode === 4 && (
              <PriceInput
                label={T("Driver fare / hour (SAR)", "أجرة السائق/ساعة", ar)}
                value={driverFarePerHour || SYSTEM_DRIVER_FARE_PER_HOUR}
                defaultValue={SYSTEM_DRIVER_FARE_PER_HOUR}
                onChange={setDriverFarePerHour}
                ar={ar}
              />
            )}
            {receiveBranchId !== returnBranchId && (
              <PriceInput
                label={T("Delivery to another city (SAR)", "قيمة تسليم السيارة إلى مدن أخرى", ar)}
                value={vehicleTransferCost || SYSTEM_VEHICLE_TRANSFER_COST}
                defaultValue={SYSTEM_VEHICLE_TRANSFER_COST}
                onChange={setVehicleTransferCost}
                ar={ar}
              />
            )}
            <PriceInput
              label={T("International authorization value (SAR)", "قيمة التفويض الدولي", ar)}
              value={internationalAuthorizationCost}
              defaultValue={0}
              onChange={setInternationalAuthorizationCost}
              ar={ar}
            />
          </div>

          {/* Extended coverage — picked from the backend picker; the registered
              cost is snapshotted onto the contract (managed in Pricing settings). */}
          {/* Discount — picked from the tenant's named discount rates
              (managed in Pricing settings); only the percent is sent. */}
          {/* Discount — options registered by the owner in Pricing settings */}
          <div className="pt-6 mt-6 border-t border-mk-ink-100">
            <div className="flex items-center justify-between mb-1">
              <div className="mk-label-muted mk-field-label">{T("Discount", "نسبة الخصم", ar)}</div>
              <span className="flex items-center gap-1 mk-overline text-mk-ink-400">
                <Lock size={11} />{T("Options set in Pricing settings", "الخيارات مُحدَّدة من إعدادات الأسعار", ar)}
              </span>
            </div>
            <Select
              variant="muted"
              value={discountRateId != null ? String(discountRateId) : ""}
              onChange={(e) => onDiscountRateChange(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">{T("No discount", "بدون خصم", ar)}</option>
              {discountRates.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {(ar ? (r.nameAr || r.nameEn) : (r.nameEn || r.nameAr)) || `—`} — %{r.percent}
                </option>
              ))}
            </Select>
            {discountAmount > 0 && (
              <div className="flex items-center gap-2 h-10 px-3 mt-2 rounded-md bg-mk-ink-50 border border-mk-ink-100">
                <Tag size={13} className="text-mk-ink-400" />
                <span className="mk-caption text-mk-ink-400">
                  {T(`${discountPercent}% discount applied — `, `تم تطبيق خصم ${discountPercent}٪ — `, ar)}
                  {T(`${discountAmount.toLocaleString()} SAR off`, `خصم ${discountAmount.toLocaleString()} ريال`, ar)}
                </span>
              </div>
            )}
            {discountRates.length === 0 && (
              <p className="mk-caption text-mk-ink-400 mt-2">
                {T("No discount rates configured in Pricing settings.", "لا توجد نسب خصم مُعرَّفة في إعدادات الأسعار.", ar)}
              </p>
            )}
          </div>

          {/* Km & delay limits */}
          <div className="pt-6 mt-6 border-t border-mk-ink-100">
            <div className="mk-label mb-3 text-mk-ink-900">{T("Km & delay limits", "حدود الكيلومترات والتأخير", ar)}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PriceInput
                label={T("Free km / day", "عدد الكيلومترات المجانية المسموحة باليوم", ar)}
                min={0}
                value={allowedKmPerDay}
                defaultValue={typeof car?.kmCap === "number" ? car.kmCap : 200}
                onChange={setAllowedKmPerDay}
                ar={ar}
              />
              <PriceInput
                label={T("Allowed late hours", "عدد ساعات التأخير المسموحة", ar)}
                min={0}
                value={allowedLateHours}
                defaultValue={1}
                onChange={setAllowedLateHours}
                ar={ar}
              />
              <PriceInput
                label={T("Late fee / hour (SAR)", "سعر ساعة التأخير", ar)}
                min={0}
                value={lateFeePerHour}
                defaultValue={car?.lateFeePerHour || 0}
                onChange={setLateFeePerHour}
                ar={ar}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Left column (RTL): Payment card + Price breakdown card */}
      <div className="flex flex-col gap-5">

        {/* Payment type & method */}
        <div className="mk-surface rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="mk-h4 flex-1 text-mk-ink-900">{T("Payment", "الدفع", ar)}</div>
            <Badge variant="warning" dot>{T("Awaiting capture", "بانتظار الخصم", ar)}</Badge>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <div className="mk-label-muted mb-1 mk-field-label">{T("Payment type", "نوع الدفع", ar)}</div>
              <Tabs
                variant="default"
                rounded="full"
                className="w-full! [&>button]:flex-1"
                value={payType}
                onChange={(v) => setPayType(v as "full" | "advance")}
                items={[
                  { value: "full", label: T("Full payment", "الدفع الكامل", ar) },
                  { value: "advance", label: T("Advance payment", "دفع مقدم", ar) },
                ]}
              />
            </div>

            {/* Advance amount — defaults to 50%, editable */}
            {payType === "advance" && (
              <Input
                label={T("Advance amount", "قيمة الدفع المقدم", ar)}
                variant="muted"
                type="number"
                min={0}
                max={total}
                suffix={<RiyalSymbol size={14} className="text-mk-ink-400" />}
                value={advanceAmount}
                onChange={(e) => setAdvanceCost(Math.min(total, Math.max(0, Number(e.target.value) || 0)))}
                helpText={T(`Remaining ${remaining.toLocaleString()} SAR is collected on return`, `الباقي ${remaining.toLocaleString()} ريال يُحصَّل عند الإرجاع`, ar)}
              />
            )}

            <div>
              <div className="mk-label-muted mb-1 mk-field-label">{T("Payment method", "طريقة الدفع", ar)}</div>
              <Tabs
                variant="default"
                rounded="full"
                className="w-full! [&>button]:flex-1"
                value={payMethod}
                onChange={setPayMethod}
                items={[
                  { value: "cash", label: T("Cash", "نقدي", ar), icon: <Banknote size={14} /> },
                  { value: "pos", label: T("Point of Sale (POS)", "نقطة بيع", ar), icon: <CreditCard size={14} /> },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Price breakdown — same shared component as the live summary on step 1 */}
        <div className="mk-surface rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="mk-h4 text-mk-ink-900 uppercase tracking-wider">{T("Price Breakdown", "تفاصيل الأسعار", ar)}</div>
          </div>
          <PriceBreakdown
            ar={ar}
            rental={{
              name: car ? `${car.make} ${car.model}` : undefined,
              days,
              dailyRate: rentDayCost || car?.dailyRate || 0,
              subtotal: base,
            }}
            hourly={(contractTypeCode === 2 || contractTypeCode === 4) ? { rate: rentHourCost, hours: totalHours } : undefined}
            essential={addOnLines(true)}
            supplementary={addOnLines(false)}
            fees={breakdownFees}
            discountAmount={discountAmount}
            discountLabel={discountType === "percent" ? T(`${discountPercent}% off`, `خصم ${discountPercent}٪`, ar) : undefined}
            subtotal={subtotal}
            vatAmount={vat}
            total={total}
            totalLabel={T("Total", "الإجمالي", ar)}
          >
            {payType === "advance" && (
              <div className="border-t border-dashed border-mk-ink-100 pt-2.5 mt-1 flex flex-col gap-2">
                <div className="flex justify-between">
                  <span className="mk-label text-mk-ink-900">{T("Advance now", "مقدّم الآن", ar)}</span>
                  <Money size={14} className="mk-label justify-end text-mk-ink-900">{advanceAmount.toLocaleString()}</Money>
                </div>
                <div className="flex justify-between text-mk-ink-400 mk-overline">
                  <span>{T("Remaining on return", "الباقي عند الإرجاع", ar)}</span>
                  <span>{remaining.toLocaleString()} {T("SAR", "ريال", ar)}</span>
                </div>
              </div>
            )}
          </PriceBreakdown>
        </div>
      </div>

      {/* Navigation buttons moved to sticky footer */}
    </div>
  );
}
