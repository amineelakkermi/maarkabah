"use client";

import type { Dispatch, SetStateAction } from "react";
import { Check, UserPlus, Gauge, CircleDot } from "lucide-react";
import { Badge, RiyalSymbol, Select, Button } from "@/components/ui";
import type { Car, DriverProfile } from "@/lib/data";
import { VehicleTypeIcon } from "@/components/employee/VehicleTypeIcon";
import { T, ADD_ONS, RENTAL_POLICY_OPTIONS } from "./constants";
import type { ContractAdditionalService, ContractCancellationPolicy, ContractRentPolicy, LookupItem } from "./useContractLookups";
import { PersonPicker } from "./PersonPicker";

export type Addons = Record<string, boolean>;

export type StepAddonsProps = {
  ar: boolean;
  car: Car | undefined;
  days: number;
  total: number;
  isHourlyRental: boolean;
  driverFarePerDay: number;
  driverFarePerHour: number;
  // Branches
  branches: LookupItem[];
  receiveBranchId: number; setReceiveBranchId: (v: number) => void;
  returnBranchId: number; setReturnBranchId: (v: number) => void;
  setWorkingBranchId: (v: number) => void;
  // Add-ons
  addons: Addons; setAddons: Dispatch<SetStateAction<Addons>>;
  additionalServices: ContractAdditionalService[];
  setExtraDriverEnabled: (next: boolean) => void;
  // Rental policies
  rentPolicies: ContractRentPolicy[];
  rentPolicyId: number; setRentPolicyId: (v: number) => void;
  cancellationPolicies: ContractCancellationPolicy[];
  cancellationPolicyId: number; setCancellationPolicyId: (v: number) => void;
  extensionPolicy: string; setExtensionPolicy: (v: string) => void;
  earlyReturnPolicy: string; setEarlyReturnPolicy: (v: string) => void;
  accidentReportPolicy: string; setAccidentReportPolicy: (v: string) => void;
  fuelReturnPolicy: string; setFuelReturnPolicy: (v: string) => void;
  breakdownReportPolicy: string; setBreakdownReportPolicy: (v: string) => void;
  // Extra driver picker
  filteredExtraDrivers: DriverProfile[];
  extraDriverQuery: string; setExtraDriverQuery: (v: string) => void;
  selectedExtraDriver: DriverProfile | null;
  handleSelectExtraDriver: (d: DriverProfile) => void;
  clearExtraDriver: () => void;
  setShowExtraDriverAddNew: (v: boolean) => void;
};

export function StepAddons({
  ar, car, days, total, isHourlyRental, driverFarePerDay, driverFarePerHour,
  branches, receiveBranchId, setReceiveBranchId, returnBranchId, setReturnBranchId, setWorkingBranchId,
  addons, setAddons, additionalServices, setExtraDriverEnabled,
  rentPolicies, rentPolicyId, setRentPolicyId, cancellationPolicies, cancellationPolicyId, setCancellationPolicyId,
  extensionPolicy, setExtensionPolicy, earlyReturnPolicy, setEarlyReturnPolicy,
  accidentReportPolicy, setAccidentReportPolicy, fuelReturnPolicy, setFuelReturnPolicy,
  breakdownReportPolicy, setBreakdownReportPolicy,
  filteredExtraDrivers, extraDriverQuery, setExtraDriverQuery, selectedExtraDriver,
  handleSelectExtraDriver, clearExtraDriver, setShowExtraDriverAddNew,
}: StepAddonsProps) {
  const resolvedAdditionalServices = additionalServices.map((service) => {
    const key = service.key.toLowerCase().replace(/[-\s]+/g, "_");
    const fallback = ADD_ONS.find((addon) => addon.k === key);
    const perDay = service.billingUnit === 2;
    return {
      ...service,
      k: key,
      Icon: fallback?.Icon ?? CircleDot,
      nameAr: service.nameAr || fallback?.nameAr || key,
      nameEn: service.nameEn || fallback?.nameEn || key,
      descAr: service.descriptionAr || fallback?.descAr || "",
      descEn: service.descriptionEn || fallback?.descEn || "",
      price: service.unitPrice,
      unit: service.billingUnit === 2 ? "/ day" : service.billingUnit === 3 ? "/ Km" : "· once",
      unitAr: service.billingUnit === 2 ? "/ يوم" : service.billingUnit === 3 ? "/ كم" : "· مرة واحدة",
      perDay,
    };
  });
  const unlimitedKmService = resolvedAdditionalServices.find((service) => service.k === "unlimited_km");
  const otherServiceKeys = new Set(["fuel", "return_agent"]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 items-start gap-4">

      {/* ── COLUMN 1: HANDOVER METHODS & BRANCHES ── */}
      <div className="flex flex-col gap-4">

        {/* Vehicle, handover branches & km/delay limits — merged */}
        <div className="mk-surface rounded-xl p-6">
          <div className="mk-h4 mb-6 text-mk-ink-900">{T("Vehicle & Handover", "معلومات السيارة والتسليم", ar)}</div>

          {/* Selected vehicle */}
          {car && (
            <div className="flex items-center gap-3 pb-6 border-b border-mk-ink-100">
              <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-mk-ink-50 flex items-center justify-center text-[24px]">
                {(() => {
                  const images = car.imageUrls;
                  if (images && images.length > 0) {
                    return (
                      <img
                        src={images[0]}
                        alt={car.model}
                        className="w-full h-full object-cover"
                      />
                    );
                  }
                  return <VehicleTypeIcon type={car.type} size={22} className="w-full h-full" />;
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="mk-overline uppercase text-mk-ink-400 mk-tracking-wide">{T("Selected vehicle", "المركبة المختارة", ar)}</div>
                <div className="mk-body text-mk-ink-900 truncate">{car.make} {car.model} · {car.year}</div>
                <div className="mk-caption text-mk-ink-500">{car.plate} · {car.location || T("Riyadh — Olaya", "الرياض — العليا", ar)}</div>
              </div>
              <div className="text-end shrink-0">
                <div className="flex items-center gap-1 justify-end">
                  <RiyalSymbol size={14} className="text-mk-ink-900" />
                  <span className="mk-body-sm text-mk-ink-900">{car.dailyRate}</span>
                  <span className="mk-overline text-mk-ink-400">{T("/d", "/يوم", ar)}</span>
                </div>
                <div className="mk-overline text-mk-ink-400">{days} {T("days · ", "أيام · ", ar)}{(car.dailyRate * days).toLocaleString()} {T("SAR", "ريال", ar)}</div>
              </div>
            </div>
          )}

          {/* Handover branches */}
          <div className="pt-6">
            <div className="mk-label text-mk-ink-900">{T("Handover Branches", "فروع الاستلام والتسليم", ar)}</div>
            <p className="mk-caption mt-1 mb-3 text-mk-ink-500">
              {T("Set from the selected vehicle's current branch — change only for an inter-branch handover.", "محددة تلقائياً حسب فرع المركبة المختارة — غيّرها فقط في حال التسليم بين الفروع.", ar)}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="mk-overline mb-2 block text-mk-ink-600">{T("Pickup Branch", "فرع الاستلام", ar)}</label>
                <Select
                  value={receiveBranchId}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setReceiveBranchId(val);
                    setWorkingBranchId(val);
                  }}
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {ar ? b.nameAr : b.nameEn}
                    </option>
                  ))}
                </Select>
                <button
                  type="button"
                  onClick={() => setAddons((s) => ({ ...s, delivery: !s.delivery }))}
                  className={`mt-2 flex items-center gap-2 w-full px-3 py-2 rounded-md mk-overline border cursor-pointer transition-all ${addons.delivery ? "bg-mk-blue-500/10 border-mk-blue-500/30 text-mk-blue-600" : "bg-white border-mk-ink-200 text-mk-ink-600"}`}
                >
                  <span className={`w-4 h-4 rounded-xs border border-transparent flex items-center justify-center shrink-0 ${addons.delivery ? "bg-mk-blue-500" : "bg-mk-ink-100"}`}>
                    {addons.delivery && <Check size={10} className="text-white" />}
                  </span>
                  {T("Deliver by agent (add-on)", "تسليم عبر مندوب (خدمة إضافية)", ar)}
                </button>
              </div>

              <div>
                <label className="mk-overline mb-2 block text-mk-ink-600">{T("Return Branch", "فرع التسليم", ar)}</label>
                <Select
                  value={returnBranchId}
                  onChange={(e) => setReturnBranchId(Number(e.target.value))}
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {ar ? b.nameAr : b.nameEn}
                    </option>
                  ))}
                </Select>
                <button
                  type="button"
                  onClick={() => setAddons((s) => ({ ...s, return_agent: !s.return_agent }))}
                  className={`mt-2 flex items-center gap-2 w-full px-3 py-2 rounded-md mk-overline border cursor-pointer transition-all ${addons.return_agent ? "bg-mk-blue-500/10 border-mk-blue-500/30 text-mk-blue-600" : "bg-white border-mk-ink-200 text-mk-ink-600"}`}
                >
                  <span className={`w-4 h-4 rounded-xs border border-transparent flex items-center justify-center shrink-0 ${addons.return_agent ? "bg-mk-blue-500" : "bg-mk-ink-100"}`}>
                    {addons.return_agent && <Check size={10} className="text-white" />}
                  </span>
                  {T("Pickup by agent (add-on)", "استلام عبر مندوب (خدمة إضافية)", ar)}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Rental policy — office-selectable, auto-reflected on the contract */}
        <div className="mk-surface rounded-xl p-6">
          <div className="mk-h4 mb-6 text-mk-ink-900">{T("Rental policy", "سياسة التأجير", ar)}</div>

          {/* Comprehensive insurance — mandatory, included on every contract */}
          {ADD_ONS.filter(a => a.k === "insurance_comprehensive").map((a) => (
            <div key={a.k} className="flex items-center gap-3 p-3 mb-4 rounded-lg bg-mk-blue-500/8 border border-mk-blue-500/20">
              <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 bg-mk-blue-50">
                <a.Icon size={16} className="text-mk-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="mk-label text-mk-ink-900">{ar ? a.nameAr : a.nameEn}</span>
                  <span className="mk-overline px-2 py-1 rounded-full bg-mk-blue-500/10 text-mk-blue-500 shrink-0">
                    {T("Included on every contract", "مُدرج في كل عقد", ar)}
                  </span>
                </div>
                <div className="mk-caption mt-1 text-mk-ink-500">
                  {T(
                    "Fully refunded after the vehicle is returned, with no dispute — as long as there's no damage or violation on the vehicle.",
                    "يُسترد المبلغ بالكامل بعد إرجاع المركبة دون أي نزاع، بشرط عدم وجود ضرر أو مخالفة على المركبة.",
                    ar
                  )}
                </div>
              </div>
              <div className="text-end shrink-0">
                <div className="mk-label text-mk-blue-500">{a.price} {T("SAR", "ريال", ar)}</div>
                <div className="mk-overline text-mk-ink-400">{ar ? a.unitAr : a.unit}</div>
              </div>
            </div>
          ))}

          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="mk-overline mb-2 block text-mk-ink-600">{T("Rental policy", "سياسة التأجير", ar)}</label>
                <Select value={rentPolicyId} onChange={(e) => {
                  const policy = rentPolicies.find((item) => item.id === Number(e.target.value));
                  if (!policy) return;
                  setRentPolicyId(policy.id);
                  if (policy.extensionPolicy) setExtensionPolicy(RENTAL_POLICY_OPTIONS.extension[policy.extensionPolicy - 1]?.key ?? extensionPolicy);
                  if (policy.earlyReturnPolicy) setEarlyReturnPolicy(RENTAL_POLICY_OPTIONS.earlyReturn[policy.earlyReturnPolicy - 1]?.key ?? earlyReturnPolicy);
                  if (policy.accidentReportPolicy) setAccidentReportPolicy(RENTAL_POLICY_OPTIONS.accidentReport[policy.accidentReportPolicy - 1]?.key ?? accidentReportPolicy);
                  if (policy.fuelReturnPolicy) setFuelReturnPolicy(RENTAL_POLICY_OPTIONS.fuelReturn[policy.fuelReturnPolicy - 1]?.key ?? fuelReturnPolicy);
                  if (policy.breakdownReportPolicy) setBreakdownReportPolicy(RENTAL_POLICY_OPTIONS.breakdownReport[policy.breakdownReportPolicy - 1]?.key ?? breakdownReportPolicy);
                }}>
                  {rentPolicies.map((policy) => (
                    <option key={policy.id} value={policy.id}>{ar ? policy.nameAr : policy.nameEn}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mk-overline mb-2 block text-mk-ink-600">{T("Cancellation policy", "سياسة الإلغاء", ar)}</label>
                <Select value={cancellationPolicyId} onChange={(e) => setCancellationPolicyId(Number(e.target.value))}>
                  {cancellationPolicies.map((policy) => (
                    <option key={policy.id} value={policy.id}>{ar ? policy.nameAr : policy.nameEn}</option>
                  ))}
                </Select>
              </div>
            </div>
            {[ 
              { labelEn: "Contract extension mechanism", labelAr: "آلية تمديد العقد", value: extensionPolicy, onChange: setExtensionPolicy, options: RENTAL_POLICY_OPTIONS.extension },
              { labelEn: "Early return policy", labelAr: "سياسة تسليم السيارة قبل الموعد", value: earlyReturnPolicy, onChange: setEarlyReturnPolicy, options: RENTAL_POLICY_OPTIONS.earlyReturn },
              { labelEn: "Accident reporting policy", labelAr: "سياسة الإبلاغ عن حوادث", value: accidentReportPolicy, onChange: setAccidentReportPolicy, options: RENTAL_POLICY_OPTIONS.accidentReport },
              { labelEn: "Fuel return policy", labelAr: "سياسة إعادة الوقود", value: fuelReturnPolicy, onChange: setFuelReturnPolicy, options: RENTAL_POLICY_OPTIONS.fuelReturn },
              { labelEn: "Breakdown reporting policy", labelAr: "سياسة آلية الإبلاغ عن أعطال", value: breakdownReportPolicy, onChange: setBreakdownReportPolicy, options: RENTAL_POLICY_OPTIONS.breakdownReport },
            ].map((f) => (
              <div key={f.labelEn}>
                <label className="mk-overline mb-2 block text-mk-ink-600">{T(f.labelEn, f.labelAr, ar)}</label>
                <Select value={f.value} onChange={(e) => f.onChange(e.target.value)}>
                  {f.options.map((o) => (
                    <option key={o.key} value={o.key}>{ar ? o.ar : o.en}</option>
                  ))}
                </Select>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ RIGHT COLUMN: Add-ons + Live Summary + Nav ════════════════════════ */}
      <div className="flex flex-col gap-4 sticky top-[18px]">

        {/* 1. ADDITIONAL SERVICES / ADD-ONS CARD */}
        <div className="mk-surface rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="mk-h4 flex-1 text-mk-ink-900">{T("Add-ons", "الخدمات الإضافية", ar)}</div>
            <span className="mk-caption text-mk-ink-400">{T("Optional", "اختياري", ar)}</span>
          </div>
          <div className="flex flex-col gap-2">

            {/* ── Essential services ── */}
            <div className="mk-overline uppercase mb-1 text-mk-ink-400 mk-tracking-wide">
              {T("Essential services", "خدمات أساسية", ar)}
            </div>

            {/* ── Extra driver ── */}
            <div className="flex flex-col gap-2 w-full">
              <button
                type="button"
                onClick={() => setExtraDriverEnabled(!addons.driver)}
                className={`mk-option ${addons.driver ? "mk-option--on" : ""} flex items-center gap-3 p-3 rounded-lg text-start w-full cursor-pointer border-0`}
              >
                <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 bg-mk-blue-50">
                  <UserPlus size={16} className="text-mk-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="mk-label text-mk-ink-900">{T("Extra driver", "سائق إضافي", ar)}</div>
                  <div className="mk-caption text-mk-ink-400">{T("A second driver authorized on the contract", "سائق ثانٍ مفوّض على العقد", ar)}</div>
                </div>
                <div className="text-end shrink-0">
                  <div className={`mk-label ${addons.driver ? "text-mk-blue-500" : "text-mk-ink-900"}`}>
                    {isHourlyRental ? (driverFarePerHour || 10) : (driverFarePerDay || 45)} {T("SAR", "ريال", ar)}
                  </div>
                  <div className="mk-overline text-mk-ink-400">{isHourlyRental ? T("/ hour", "/ ساعة", ar) : T("/ day", "/ يوم", ar)}</div>
                </div>
                <div className={`w-5 h-5 rounded-xs flex items-center justify-center shrink-0 ${addons.driver ? "bg-mk-blue-500 border-0" : "bg-white border border-mk-ink-200"}`}>
                  {addons.driver && <Check size={11} className="text-white" />}
                </div>
              </button>

              {addons.driver && (
                <PersonPicker
                  ar={ar}
                  label={T("Select from drivers list:", "اختر من قائمة السائقين:", ar)}
                  placeholder={T("Search by name, phone, or ID…", "بحث بالاسم، الهاتف، أو الهوية…", ar)}
                  items={filteredExtraDrivers}
                  query={extraDriverQuery}
                  onQuery={setExtraDriverQuery}
                  selected={selectedExtraDriver}
                  onSelect={handleSelectExtraDriver}
                  onClear={clearExtraDriver}
                  showRating
                  action={(
                    <Button type="button" variant="tonal" size="sm" onClick={() => setShowExtraDriverAddNew(true)}>
                      <UserPlus size={14} />
                      {T("Add new driver", "إضافة سائق جديد", ar)}
                    </Button>
                  )}
                />
              )}
            </div>

            {resolvedAdditionalServices.filter((a) => a.k !== "unlimited_km" && a.k !== "driver" && !otherServiceKeys.has(a.k)).map((a) => {
              const on = addons[a.k as keyof typeof addons];
              return (
                <div key={a.k} className="flex flex-col gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => setAddons((s) => ({ ...s, [a.k]: !s[a.k as keyof typeof s] }))}
                    className={`mk-option ${on ? "mk-option--on" : ""} flex items-center gap-3 p-3 rounded-lg text-start w-full cursor-pointer border-0`}
                  >
                    <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 bg-mk-blue-50">
                      <a.Icon size={16} className="text-mk-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="mk-label text-mk-ink-900">{ar ? a.nameAr : a.nameEn}</div>
                      <div className="mk-caption text-mk-ink-400">{ar ? a.descAr : a.descEn}</div>
                    </div>
                    <div className="text-end shrink-0">
                      <div className={`mk-label ${on ? "text-mk-blue-500" : "text-mk-ink-900"}`}>{a.price} {T("SAR", "ريال", ar)}</div>
                      <div className="mk-overline text-mk-ink-400">{ar ? a.unitAr : a.unit}</div>
                    </div>
                    <div className={`w-5 h-5 rounded-xs flex items-center justify-center shrink-0 ${on ? "bg-mk-blue-500 border-0" : "bg-white border border-mk-ink-200"}`}>
                      {on && <Check size={11} className="text-white" />}
                    </div>
                  </button>
                </div>
              );
            })}

            {/* Unlimited km toggle */}
            {(() => {
              const a = unlimitedKmService;
              if (!a) return null;
              const on = addons.unlimited_km;
              return (
                <div>
                  <button
                    type="button"
                    onClick={() => setAddons((s) => ({ ...s, unlimited_km: !s.unlimited_km }))}
                    className={`mk-option ${on ? "mk-option--on" : ""} flex items-center gap-3 p-3 rounded-lg text-start w-full border-0`}
                  >
                    <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 bg-mk-blue-50">
                      <Gauge size={16} className="text-mk-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="mk-label text-mk-ink-900">{ar ? a.nameAr : a.nameEn}</div>
                      <div className="mk-caption text-mk-ink-400">{ar ? a.descAr : a.descEn}</div>
                    </div>
                    <div className="text-end shrink-0">
                      <div className={`mk-label ${on ? "text-mk-blue-500" : "text-mk-ink-900"}`}>{a.price} {T("SAR", "ريال", ar)}</div>
                      <div className="mk-overline text-mk-ink-400">{ar ? a.unitAr : a.unit}</div>
                    </div>
                    <div className={`w-5 h-5 rounded-xs flex items-center justify-center shrink-0 ${on ? "bg-mk-blue-500 border-0" : "bg-white border border-mk-ink-200"}`}>
                      {on && <Check size={11} className="text-white" />}
                    </div>
                  </button>
                </div>
              );
            })()}

            {/* ── Other services ── */}
            <div className="mk-overline uppercase mt-3 mb-1 text-mk-ink-400 mk-tracking-wide">
              {T("Other services", "خدمات أخرى", ar)}
            </div>
            {resolvedAdditionalServices.filter((a) => otherServiceKeys.has(a.k)).map((a) => {
              const on = addons[a.k as keyof typeof addons];
              return (
                <div key={a.k} className="flex flex-col gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => setAddons((s) => ({ ...s, [a.k]: !s[a.k as keyof typeof s] }))}
                    className={`mk-option ${on ? "mk-option--on" : ""} flex items-center gap-3 p-3 rounded-lg text-start w-full cursor-pointer border-0`}
                  >
                    <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 bg-mk-blue-50">
                      <a.Icon size={16} className="text-mk-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="mk-label text-mk-ink-900">{ar ? a.nameAr : a.nameEn}</div>
                      <div className="mk-caption text-mk-ink-400">{ar ? a.descAr : a.descEn}</div>
                    </div>
                    <div className="text-end shrink-0">
                      <div className={`mk-label ${on ? "text-mk-blue-500" : "text-mk-ink-900"}`}>{a.price} {T("SAR", "ريال", ar)}</div>
                      <div className="mk-overline text-mk-ink-400">{ar ? a.unitAr : a.unit}</div>
                    </div>
                    <div className={`w-5 h-5 rounded-xs flex items-center justify-center shrink-0 ${on ? "bg-mk-blue-500 border-0" : "bg-white border border-mk-ink-200"}`}>
                      {on && <Check size={11} className="text-white" />}
                    </div>
                  </button>
                </div>
              );
            })}

          </div>
        </div>

        {/* 2. LIVE SUMMARY CARD — compact total only */}
        <div className="mk-surface rounded-xl p-5">
          <div className="flex items-center gap-2 mb-6">
            <div className="mk-h4 flex-1 text-mk-ink-900">{T("Live summary", "ملخص مباشر", ar)}</div>
            <Badge variant="warning" dot>MK-2428</Badge>
          </div>
          <div className="flex justify-between items-center px-4 py-4 rounded-xl border-2 border-mk-blue-500/20 bg-mk-blue-50">
            <span className="mk-body text-mk-ink-700">{T("Estimated Total", "الإجمالي التقديري", ar)}</span>
            <span className="mk-h3 text-mk-blue-500">{total.toLocaleString()} <span className="mk-label">{T("SAR", "ريال", ar)}</span></span>
          </div>
          <p className="mk-overline text-mk-ink-400 mt-2 text-center">{T("Full price breakdown is confirmed at the payment step", "تفاصيل الأسعار كاملة في خطوة الدفع", ar)}</p>
        </div>

        {/* Navigation buttons moved to sticky footer */}
      </div>
    </div>
  );
}
