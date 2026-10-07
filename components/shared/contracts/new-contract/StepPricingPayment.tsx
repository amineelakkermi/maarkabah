"use client";

import { Info, Lock, CreditCard, Wallet, Banknote } from "lucide-react";
import { Badge, Select } from "@/components/ui";
import type { Car } from "@/lib/data";
import type { TajeerContractType } from "@/lib/tajeer";
import type { ContractDiscountRate } from "./useContractLookups";
import {
  T, ADD_ONS,
  SYSTEM_DRIVER_FARE_PER_DAY, SYSTEM_DRIVER_FARE_PER_HOUR,
  SYSTEM_VEHICLE_TRANSFER_COST,
} from "./constants";
import type { Pricing } from "./pricing";
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
  extendedCoverageId: number | undefined;
  // Editable rates
  rentDayCost: number; setRentDayCost: (v: number) => void;
  rentHourCost: number; setRentHourCost: (v: number) => void;
  extraKmCost: number; setExtraKmCost: (v: number) => void;
  fullFuelCost: number; setFullFuelCost: (v: number) => void;
  driverFarePerDay: number; setDriverFarePerDay: (v: number) => void;
  driverFarePerHour: number; setDriverFarePerHour: (v: number) => void;
  vehicleTransferCost: number; setVehicleTransferCost: (v: number) => void;
  internationalAuthorizationCost: number; setInternationalAuthorizationCost: (v: number) => void;
  additionalCoverageCost: number; setAdditionalCoverageCost: (v: number) => void;
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
  pricing: Pricing;
};

export function StepPricingPayment({
  ar, car, contractTypeCode, days, totalHours, addons, unlimitedKm, receiveBranchId, returnBranchId, extendedCoverageId,
  rentDayCost, setRentDayCost, rentHourCost, setRentHourCost, extraKmCost, setExtraKmCost, fullFuelCost, setFullFuelCost,
  driverFarePerDay, setDriverFarePerDay, driverFarePerHour, setDriverFarePerHour, vehicleTransferCost, setVehicleTransferCost,
  internationalAuthorizationCost, setInternationalAuthorizationCost, additionalCoverageCost, setAdditionalCoverageCost,
  allowedKmPerDay, setAllowedKmPerDay, allowedLateHours, setAllowedLateHours, lateFeePerHour, setLateFeePerHour,
  discountType, discountPercent, discountRates, discountRateId, onDiscountRateChange, payType, setPayType, payMethod, setPayMethod, pricing,
}: StepPricingPaymentProps) {
  const {
    base, addonPrices, extraDriverFare, transferFare, authorizationFare, coverageFare,
    discountAmount, subtotal, vat, total, advanceAmount, remaining,
  } = pricing;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

      {/* Right column (RTL): Pricing details — its own card, editable per contract nature */}
      <div className="flex flex-col gap-4">
        <div className="mk-surface rounded-xl p-4 sm:p-6">
          <div className="mk-h4 mb-6 text-mk-ink-900">{T("Pricing Details", "تفاصيل أسعار العقد", ar)}</div>

          {/* Rates registered on the vehicle profile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-6 border-b border-mk-ink-100">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6">
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
            {extendedCoverageId && (
              <PriceInput
                label={T("Additional coverage cost (SAR)", "تكلفة التغطية الإضافية", ar)}
                value={additionalCoverageCost || 100}
                defaultValue={100}
                onChange={setAdditionalCoverageCost}
                ar={ar}
                helpText={T(`Max = day rate × 2`, "الحد الأقصى = سعر اليوم × ٢", ar)}
              />
            )}
          </div>

          {/* Discount — picked from the tenant's named discount rates
              (managed in Pricing settings); only the percent is sent. */}
          <div className="pt-6 mt-6 border-t border-mk-ink-100">
            <div className="flex items-center justify-between mb-3">
              <div className="mk-label text-mk-ink-900">{T("Discount", "نسبة الخصم", ar)}</div>
              <span className="flex items-center gap-1 mk-overline text-mk-ink-400">
                <Lock size={11} />{T("Rates managed in Pricing settings", "النسب تُدار من إعدادات الأسعار", ar)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={discountRateId != null ? String(discountRateId) : ""}
                onChange={(e) => onDiscountRateChange(e.target.value ? Number(e.target.value) : null)}
                className="flex-1"
              >
                <option value="">{T("No discount", "بدون خصم", ar)}</option>
                {discountRates.map((r) => (
                  <option key={r.id} value={String(r.id)}>
                    {(ar ? (r.nameAr || r.nameEn) : (r.nameEn || r.nameAr)) || `—`} ({r.percent}%)
                  </option>
                ))}
              </Select>
            </div>
            {discountAmount > 0 && (
              <p className="mk-caption text-mk-blue-500 mt-2">
                {T(`−${discountAmount.toLocaleString()} SAR (${discountPercent}% off)`, `−${discountAmount.toLocaleString()} ريال (خصم ${discountPercent}٪)`, ar)}
              </p>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      <div className="flex flex-col gap-4">

        {/* Payment type & method */}
        <div className="mk-surface rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="mk-h4 flex-1 text-mk-ink-900">{T("Payment", "الدفع", ar)}</div>
            <Badge variant="warning" dot>{T("Awaiting capture", "بانتظار الخصم", ar)}</Badge>
          </div>

          <div className="mk-overline mb-1 text-mk-ink-600">
            {T("Payment type", "نوع الدفع", ar)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {([
              { k: "full", titleEn: "Full payment", titleAr: "الدفع الكامل", descEn: "Total captured now", descAr: "يُخصم الإجمالي كاملاً الآن", Icon: CreditCard },
              { k: "advance", titleEn: "Advance payment", titleAr: "دفع مقدم", descEn: "50% now · rest on return", descAr: "٥٠٪ الآن · الباقي عند الإرجاع", Icon: Wallet },
            ] as const).map((pt) => {
              const on = payType === pt.k;
              return (
                <button key={pt.k} onClick={() => setPayType(pt.k)}
                  className={`mk-option ${on ? "mk-option--on" : "mk-surface"} flex flex-col items-center p-3 rounded-lg text-center`}>
                  <div className={`w-9 h-9 rounded-md mb-2 flex items-center justify-center shrink-0 ${on ? "bg-white" : "bg-mk-blue-50"}`}>
                    <pt.Icon size={16} className="text-mk-blue-500" />
                  </div>
                  <div className={`mk-caption ${on ? "text-mk-blue-500" : "text-mk-ink-900"}`}>{ar ? pt.titleAr : pt.titleEn}</div>
                  <div className="mk-overline mt-1 text-mk-ink-400">{ar ? pt.descAr : pt.descEn}</div>
                </button>
              );
            })}
          </div>

          <div className="mk-caption mb-3 text-mk-ink-600">
            {T("Payment method", "طريقة الدفع", ar)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { k: "cash", l: T("Cash", "نقدي", ar), sub: T("Pay cash at counter", "دفع نقدي عند المكتب", ar), Icon: Banknote },
              { k: "pos", l: T("Point of Sale (POS)", "نقطة بيع", ar), sub: T("Pay via card machine", "دفع عبر جهاز الشبكة", ar), Icon: CreditCard },
            ].map((p) => {
              const on = payMethod === p.k;
              return (
                <button key={p.k} onClick={() => setPayMethod(p.k)}
                  className={`mk-option ${on ? "mk-option--on" : "mk-surface"} flex flex-col items-center p-3 rounded-lg text-center`}>
                  <div className={`w-9 h-9 rounded-md mb-2 flex items-center justify-center shrink-0 ${on ? "bg-white" : "bg-mk-blue-50"}`}>
                    <p.Icon size={16} className="text-mk-blue-500" />
                  </div>
                  <div className={`mk-caption ${on ? "text-mk-blue-500" : "text-mk-ink-900"}`}>{p.l}</div>
                  <div className="mk-overline mt-1 text-mk-ink-400">{p.sub}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Price breakdown */}
        <div className="mk-surface rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="mk-h4 text-mk-ink-900 uppercase tracking-wider">{T("Price Breakdown", "تفاصيل الأسعار", ar)}</div>
          </div>
          <div className="flex flex-col gap-2.5 mk-caption">
            <div className="flex justify-between">
              <span>
                {(contractTypeCode === 2 || contractTypeCode === 4)
                  ? T(`Base rent (${totalHours} hours × ${rentHourCost} SAR)`, `الإيجار الأساسي (${totalHours} ساعات × ${rentHourCost} ريال)`, ar)
                  : T(`Base rent (${days} days × ${rentDayCost || car?.dailyRate || 0} SAR)`, `الإيجار الأساسي (${days} أيام × ${rentDayCost || car?.dailyRate || 0} ريال)`, ar)}
              </span>
              <strong>{base.toLocaleString()} {T("SAR", "ريال", ar)}</strong>
            </div>
            {Object.entries(addons).filter(([k, v]) => v && ADD_ONS.some(a => a.k === k)).map(([k]) => {
              const ao = ADD_ONS.find((a) => a.k === k)!;
              return (
                <div key={k} className="flex justify-between text-mk-ink-600">
                  <span>+ {ar ? ao.nameAr : ao.nameEn}</span>
                  <span>{(addonPrices[k as keyof typeof addonPrices] ?? 0).toLocaleString()} {T("SAR", "ريال", ar)}</span>
                </div>
              );
            })}
            {extraDriverFare > 0 && (
              <div className="flex justify-between text-mk-ink-600">
                <span>+ {T("Extra driver fare", "أجرة السائق الإضافي", ar)}</span>
                <span>{extraDriverFare.toLocaleString()} {T("SAR", "ريال", ar)}</span>
              </div>
            )}
            {transferFare > 0 && (
              <div className="flex justify-between text-mk-ink-600">
                <span>+ {T("Delivery to another city", "تسليم السيارة إلى مدن أخرى", ar)}</span>
                <span>{transferFare.toLocaleString()} {T("SAR", "ريال", ar)}</span>
              </div>
            )}
            {authorizationFare > 0 && (
              <div className="flex justify-between text-mk-ink-600">
                <span>+ {T("International authorization", "التفويض الدولي", ar)}</span>
                <span>{authorizationFare.toLocaleString()} {T("SAR", "ريال", ar)}</span>
              </div>
            )}
            {coverageFare > 0 && (
              <div className="flex justify-between text-mk-ink-600">
                <span>+ {T("Additional coverage", "التغطية الإضافية", ar)}</span>
                <span>{coverageFare.toLocaleString()} {T("SAR", "ريال", ar)}</span>
              </div>
            )}
            {fullFuelCost > 0 && (
              <div className="flex justify-between text-mk-ink-400">
                <span>{T("Full fuel rate (not charged)", "سعر الوقود الممتلئ (غير مفروض)", ar)}</span>
                <span>{fullFuelCost.toLocaleString()} {T("SAR", "ريال", ar)}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="flex justify-between border-t border-mk-ink-100 pt-2.5 mt-1 text-mk-blue-600">
                <span>{discountType === "percent"
                  ? T(`Discount (${discountPercent}%)`, `الخصم (${discountPercent}٪)`, ar)
                  : T("Discount (fixed amount)", "الخصم (مبلغ ثابت)", ar)}</span>
                <span>-{discountAmount.toLocaleString()} {T("SAR", "ريال", ar)}</span>
              </div>
            )}
            <div className={`flex justify-between pt-2.5 mt-1 text-mk-ink-900 mk-label ${discountAmount > 0 ? "" : "border-t border-mk-ink-100"}`}>
              <span>{T("Subtotal (before VAT)", "المجموع قبل الضريبة", ar)}</span>
              <span>{subtotal.toLocaleString()} {T("SAR", "ريال", ar)}</span>
            </div>
            <div className="flex justify-between text-mk-ink-500 mk-overline">
              <span>{T("VAT · 15%", "ضريبة قيمة مضافة · ١٥٪", ar)}</span>
              <span>{vat.toLocaleString()} {T("SAR", "ريال", ar)}</span>
            </div>
            <div className="flex justify-between items-center text-mk-blue-600 border-t border-mk-ink-100 pt-3 mt-1">
              <span className="mk-h4">{T("Total", "الإجمالي", ar)}</span>
              <span className="mk-h4">{total.toLocaleString()} {T("SAR", "ريال", ar)}</span>
            </div>
            {payType === "advance" && (
              <div className="border-t border-dashed border-mk-ink-100 pt-2.5 mt-1 flex flex-col gap-2">
                <div className="flex justify-between">
                  <span className="mk-label text-mk-blue-500">{T("Advance now (50%)", "مقدّم الآن (٥٠٪)", ar)}</span>
                  <strong className="text-mk-blue-500">{advanceAmount.toLocaleString()} {T("SAR", "ريال", ar)}</strong>
                </div>
                <div className="flex justify-between text-mk-ink-400 mk-overline">
                  <span>{T("Remaining on return", "الباقي عند الإرجاع", ar)}</span>
                  <span>{remaining.toLocaleString()} {T("SAR", "ريال", ar)}</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-mk-ink-100">
            <span className="mk-caption text-mk-ink-500 flex-1">+ {T("Refundable security deposit", "تأمين قابل للاسترداد", ar)}</span>
            <strong className="mk-caption text-mk-ink-700">1,500 {T("SAR", "ريال", ar)}</strong>
          </div>
        </div>
      </div>

      {/* Navigation buttons moved to sticky footer */}
    </div>
  );
}
