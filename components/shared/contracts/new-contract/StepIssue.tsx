"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { FileText, Printer, Check, KeyRound, Clock, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button, Money, SuccessCard } from "@/components/ui";
import type { DriverProfile, Car } from "@/lib/data";
import { TAJEER_LOOKUPS, type TajeerRentStatus, type SketchItem, type TajeerIdType, type TajeerContractType } from "@/lib/tajeer";
import { T, RENTAL_POLICY_OPTIONS, NEIGHBORING_COUNTRIES, CONDITION_GRADE_LABELS, WORKING_LABELS, PRESENCE_LABELS, ODOR_LABELS, enumLabel } from "./constants";
import type { Pricing } from "./pricing";
import { PriceBreakdown, type PriceRow } from "./PriceBreakdown";
import type { ContractAdditionalService, LookupItem } from "./useContractLookups";
import type { ContractStep } from "./StickyFooter";

function ReviewSection({ title, children, wide }: { title: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <section className="pb-5 border-b border-mk-ink-100 last:border-b-0 last:pb-0">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1 h-4 rounded-full bg-mk-ink-300" />
        <h3 className="mk-label m-0 text-mk-ink-900">{title}</h3>
      </div>
      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-x-4 ${wide ? "gap-y-2" : "gap-y-4"}`}>{children}</div>
    </section>
  );
}

function ReviewField({ label, children, span = 1 }: { label: ReactNode; children: ReactNode; span?: 1 | 3 }) {
  return (
    <div className={`flex flex-col ${span === 3 ? "sm:col-span-3" : ""}`}>
      <span className="mk-overline !font-normal text-mk-ink-400 uppercase">{label}</span>
      <span className="mk-label-muted text-mk-ink-900 mt-1">{children}</span>
    </div>
  );
}

export type RenterIdentityField = {
  key: string; labelEn: string; labelAr: string; required: boolean;
  type: "text" | "date" | "email" | "hijri"; value: string;
};

export type StepIssueProps = {
  ar: boolean;
  // Submission flow
  contractStep: ContractStep;
  tajeerResponse: { contractNumber?: string | number; totalPaymentDetails?: { paid: number; remaining: number; total: number } } | null;
  tajeerError: string;
  otpDigits: string[];
  onOtpDigitsChange: (digits: string[]) => void;
  onOpenPreview: () => void;
  onCancelContract: () => void;
  // Renter & drivers
  selectedCustomer: DriverProfile | null;
  idTypeCode: TajeerIdType;
  contractId?: number | null;
  renterIdentityFields: RenterIdentityField[];
  isRenterDriver: boolean;
  authDriverIdNumber: string;
  authDriverMobile: string;
  authDriverBirthDate: string;
  selectedExtraDriver: DriverProfile | null;
  extraDriverIdNumber: string;
  extraDriverBirthDate: string;
  // Authorization
  authorizationTypeCode: "internal" | "external";
  authorizationCountry: string;
  authorizationStartDate: string;
  authorizationEndDate: string;
  // Rental & vehicle
  days: number;
  totalHours: number;
  pickupDate: Date;
  returnDate: Date;
  car: Car | undefined;
  rentStatus: Partial<TajeerRentStatus>;
  sketchItems: SketchItem[];
  // Contract settings
  branches: LookupItem[];
  rentPolicies: LookupItem[];
  cancellationPolicies: LookupItem[];
  receiveBranchId: number;
  returnBranchId: number;
  rentPolicyId: number;
  cancellationPolicyId: number;
  contractTypeCode: TajeerContractType;
  addons: Record<string, boolean>;
  additionalServices: ContractAdditionalService[];
  unlimitedKm: boolean;
  allowedKmPerDay: number;
  allowedKmPerHour: number;
  allowedLateHours: number;
  lateFeePerHour: number;
  // Rent-policy sub-codes applied silently by the picked policy
  extensionPolicy: string;
  earlyReturnPolicy: string;
  accidentReportPolicy: string;
  fuelReturnPolicy: string;
  breakdownReportPolicy: string;
  // Pricing & payment
  pricing: Pricing;
  rentDayCost: number;
  rentHourCost: number;
  fullFuelCost: number;
  discountType: "percent" | "amount";
  discountPercent: number;
  payMethod: string;
  payType: "full" | "advance";
};

export function StepIssue({
  ar, contractStep, tajeerResponse, tajeerError, otpDigits, onOtpDigitsChange, onOpenPreview, onCancelContract,
  selectedCustomer, idTypeCode, renterIdentityFields, isRenterDriver, authDriverIdNumber, authDriverMobile, authDriverBirthDate,
  selectedExtraDriver, extraDriverIdNumber, extraDriverBirthDate,
  authorizationTypeCode, authorizationCountry, authorizationStartDate, authorizationEndDate,
  days, totalHours, pickupDate, returnDate, car, rentStatus, sketchItems,
  branches, rentPolicies, cancellationPolicies, receiveBranchId, returnBranchId, rentPolicyId, cancellationPolicyId, contractTypeCode, addons, additionalServices,
  unlimitedKm, allowedKmPerDay, allowedKmPerHour, allowedLateHours, lateFeePerHour,
  extensionPolicy, earlyReturnPolicy, accidentReportPolicy, fuelReturnPolicy, breakdownReportPolicy,
  pricing, rentDayCost, rentHourCost, fullFuelCost, discountType, discountPercent, payMethod, payType,
  contractId,
}: StepIssueProps) {
  const router = useRouter();
  const { base, addonPrices, extraDriverFare, transferFare, authorizationFare, discountAmount, subtotal, vat, total, advanceAmount, remaining } = pricing;

  // Add-on lines for the shared breakdown — same key normalization as the picker.
  const serviceByKey = new Map(additionalServices.map((s) => [s.key.toLowerCase().replace(/[-\s]+/g, "_"), s]));
  const addOnLines: PriceRow[] = Object.entries(addons)
    .filter(([k, on]) => on && k !== "driver")
    .map(([k]) => {
      const s = serviceByKey.get(k);
      return {
        key: k,
        label: ar ? (s?.nameAr || s?.nameEn || k) : (s?.nameEn || s?.nameAr || k),
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

  const cancellationPolicy = cancellationPolicies.find((p) => p.id === cancellationPolicyId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[7fr_5fr] items-start gap-5">


      {/* Left: Tajeer submission flow */}
      <div className="flex flex-col gap-5">

        {/* IDLE: detailed review + issue button */}
        {contractStep === "idle" && (
          <div className="mk-surface rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="mk-h4 flex-1 text-mk-ink-900">{T("Review & Issue Contract", "مراجعة وإصدار العقد", ar)}</div>
              <Button variant="outline" size="sm" onClick={onOpenPreview}>
                <FileText size={14} />
                {T("Contract preview", "معاينة العقد", ar)}
              </Button>
            </div>

            <div className="p-3 rounded-lg bg-mk-warning-100 border border-mk-warning/30 mk-caption text-mk-warning-700 mb-6">
              ⚠️ {T("Once issued, contract data cannot be modified. The renter will receive a signature link.", "بعد الإصدار، لا يمكن تعديل بيانات العقد. سيصل للمستأجر رابط التوقيع.", ar)}
            </div>

            {/* Review sections follow the step order (and the contract preview):
                parties → period & terms → vehicle → services → policies.
                Every value uses the same regular weight; the section
                title's accent colour is what separates the groups. */}
            <div className="flex flex-col gap-5 mb-5">

              {/* 1 · Renter */}
              <ReviewSection title={T("Renter (Client)", "المستأجر (العميل)", ar)}>
                <ReviewField label={T("Name", "الاسم", ar)}>{ar ? selectedCustomer?.nameAr : selectedCustomer?.name}</ReviewField>
                <ReviewField label={T("Mobile", "رقم الجوال", ar)}><span dir="ltr">{selectedCustomer?.phone}</span></ReviewField>
                <ReviewField label={T("Beneficiary ID type", "نوع هوية المستفيد", ar)}>
                  {ar
                    ? TAJEER_LOOKUPS.idTypes.find(t => t.code === idTypeCode)?.ar
                    : TAJEER_LOOKUPS.idTypes.find(t => t.code === idTypeCode)?.en}
                </ReviewField>
                {renterIdentityFields.map((f) => (
                  <ReviewField key={f.key} label={<>{T(f.labelEn, f.labelAr, ar)}{f.required && <span className="text-mk-danger"> *</span>}</>} span={f.type === "hijri" ? 3 : 1}>
                    {f.value.trim() || "—"}
                  </ReviewField>
                ))}
              </ReviewSection>

              {/* 2 · Authorization & drivers */}
              <ReviewSection title={T("Authorization & Drivers", "بيانات التفويض والسائقين", ar)}>
                <ReviewField label={T("Authorization start date", "تاريخ بداية التفويض", ar)}>{authorizationStartDate || "—"}</ReviewField>
                <ReviewField label={T("Authorization end date", "تاريخ نهاية التفويض", ar)}>{authorizationEndDate || "—"}</ReviewField>
                <ReviewField label={T("Authorization type", "نوع التفويض", ar)}>
                  {authorizationTypeCode === "external"
                    ? `${T("External", "خارجي", ar)}${authorizationCountry ? ` · ${(() => { const c = NEIGHBORING_COUNTRIES.find((x) => x.code === authorizationCountry); return c ? (ar ? c.ar : c.en) : authorizationCountry; })()}` : ""}`
                    : T("Internal", "داخلي", ar)}
                </ReviewField>
                <ReviewField label={T("Authorized driver", "المفوض بالقيادة", ar)} span={3}>
                  {isRenterDriver ? T("Same as beneficiary", "نفس المستفيد", ar) : (
                    <>
                      {authDriverIdNumber || "—"}
                      {authDriverMobile && ` · ${authDriverMobile}`}
                      {authDriverBirthDate && ` · ${authDriverBirthDate}`}
                    </>
                  )}
                </ReviewField>
                <ReviewField label={T("Extra driver", "السائق الإضافي", ar)} span={3}>
                  {!addons.driver ? T("None", "لا يوجد", ar) : (
                    <>
                      {selectedExtraDriver && `${ar ? selectedExtraDriver.nameAr : selectedExtraDriver.name} · `}
                      {extraDriverIdNumber || "—"}
                      {selectedExtraDriver?.phone && ` · ${selectedExtraDriver.phone}`}
                      {extraDriverBirthDate && ` · ${extraDriverBirthDate}`}
                      {selectedExtraDriver?.licenseNumber && ` · ${T("License", "الرخصة", ar)}: ${selectedExtraDriver.licenseNumber}`}
                      {selectedExtraDriver?.licenseExpiryDate && ` (${T("valid to ", "تنتهي في ", ar)}${selectedExtraDriver.licenseExpiryDate})`}
                    </>
                  )}
                </ReviewField>
              </ReviewSection>

              {/* 3 · Rental period, branches & terms */}
              <ReviewSection title={T("Rental Period & Terms", "فترة التأجير وشروطها", ar)}>
                {(() => {
                  const displayedContractTypeCode = (addons.driver && selectedExtraDriver) ? contractTypeCode : (contractTypeCode === 3 ? 1 : contractTypeCode === 4 ? 2 : contractTypeCode);
                  const contractTypeObj = TAJEER_LOOKUPS.contractTypes.find(t => t.code === displayedContractTypeCode);
                  const fmt = (d: Date) => d.toLocaleString(ar ? "ar-SA-u-nu-latn" : "en-US", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
                  const rentPolicyObj = rentPolicies.find((p) => p.id === rentPolicyId);
                  return (
                    <>
                      <ReviewField label={T("Rental Period", "فترة التأجير", ar)} span={3}>
                        {days === 1 ? T("1 Day", "يوم واحد", ar) : `${days} ${T("Days", "أيام", ar)}`} · {fmt(pickupDate)} {" → "} {fmt(returnDate)}
                      </ReviewField>
                      <ReviewField label={T("Pickup Branch", "فرع الاستلام", ar)}>
                        {ar ? (branches.find(b => b.id === receiveBranchId)?.nameAr || "الفرع الرئيسي") : (branches.find(b => b.id === receiveBranchId)?.nameEn || "Main Branch")}
                      </ReviewField>
                      <ReviewField label={T("Return Branch", "فرع التسليم", ar)}>
                        {ar ? (branches.find(b => b.id === returnBranchId)?.nameAr || "الفرع الرئيسي") : (branches.find(b => b.id === returnBranchId)?.nameEn || "Main Branch")}
                      </ReviewField>
                      <ReviewField label={T("Contract type", "نوع العقد", ar)}>{ar ? contractTypeObj?.ar : contractTypeObj?.en}</ReviewField>
                      <ReviewField label={T("Allowed km", "الكم المسموح", ar)}>
                        {(unlimitedKm || addons.unlimited_km) ? T("Unlimited", "غير محدود", ar) : `${displayedContractTypeCode % 2 === 1 ? allowedKmPerDay : allowedKmPerHour} ${T("km", "كم", ar)}`}
                      </ReviewField>
                      <ReviewField label={T("Late hours grace", "ساعات التأخير", ar)}>{allowedLateHours} {T("hr", "ساعة", ar)}</ReviewField>
                      <ReviewField label={T("Late fee / hour", "سعر ساعة التأخير", ar)}>{lateFeePerHour} {T("SAR", "ريال", ar)}</ReviewField>
                      <ReviewField label={T("Rent policy", "سياسة الإيجار", ar)}>{rentPolicyObj ? (ar ? rentPolicyObj.nameAr : rentPolicyObj.nameEn) : `#${rentPolicyId}`}</ReviewField>
                      <ReviewField label={T("Endurance amount", "مبلغ التحمل", ar)}>{rentStatus.enduranceAmount ?? 0} {T("SAR", "ريال", ar)}</ReviewField>
                    </>
                  );
                })()}
              </ReviewSection>

              {/* 4 · Vehicle */}
              {car && (
                <ReviewSection title={T("Vehicle", "المركبة", ar)}>
                  <ReviewField label={T("Vehicle", "المركبة", ar)}>{car.make} {car.model} ({car.year})</ReviewField>
                  <ReviewField label={T("Plate", "رقم اللوحة", ar)}>{car.plate}</ReviewField>
                  <ReviewField label={T("Registration type", "نوع التسجيل", ar)}>{car.registrationTypeCode === 3 ? T("Private transport", "نقل خاص", ar) : T("Private", "خصوصي", ar)}</ReviewField>
                  <ReviewField label={T("Operation card", "بطاقة التشغيل", ar)}>{car.operationCardNumber || "—"}{car.operationCardExpiryDate ? ` (${T("exp. ", "تنتهي ", ar)}${car.operationCardExpiryDate})` : ""}</ReviewField>
                  <ReviewField label={T("Next oil change due", "موعد تغيير الزيت القادم", ar)}>{rentStatus.nextOilChangeKm ? `${rentStatus.nextOilChangeKm.toLocaleString()} ${T("km", "كم", ar)}` : "—"}</ReviewField>
                  {car.otherNotes && <ReviewField label={T("Other", "أخرى", ar)} span={3}>{car.otherNotes}</ReviewField>}
                </ReviewSection>
              )}

              {/* 5 · Condition at pickup */}
              <ReviewSection title={T("Vehicle Condition at Pickup", "حالة المركبة عند الاستلام", ar)}>
                {[
                  { k: T("Fuel", "الوقود", ar), v: TAJEER_LOOKUPS.availableFuelOptions.find(o => o.code === rentStatus.availableFuel)?.[ar ? "ar" : "en"] ?? "—" },
                  { k: T("Odometer", "العداد الحالي", ar), v: `${(rentStatus.odometerReading ?? 0).toLocaleString()} ${T("km", "كم", ar)}` },
                  { k: T("Oil", "الزيت", ar), v: rentStatus.oilType || "5W-30" },
                  { k: T("A/C", "حالة التكييف", ar), v: TAJEER_LOOKUPS.acOptions.find(o => o.code === rentStatus.ac)?.[ar ? "ar" : "en"] ?? "—" },
                  { k: T("Radio/Stereo", "حالة الراديو/المسجل", ar), v: TAJEER_LOOKUPS.acOptions.find(o => o.code === rentStatus.radioStereo)?.[ar ? "ar" : "en"] ?? "—" },
                  { k: T("Screen", "حالة الشاشة الداخلية", ar), v: TAJEER_LOOKUPS.acOptions.find(o => o.code === rentStatus.screen)?.[ar ? "ar" : "en"] ?? "—" },
                  { k: T("Speedometer", "حالة عداد السرعة", ar), v: TAJEER_LOOKUPS.workingOptions.find(o => o.code === rentStatus.speedometer)?.[ar ? "ar" : "en"] ?? "—" },
                  { k: T("Keys", "حالة المفتاح", ar), v: TAJEER_LOOKUPS.workingOptions.find(o => o.code === rentStatus.keys)?.[ar ? "ar" : "en"] ?? "—" },
                  { k: T("Seats", "المقاعد", ar), v: TAJEER_LOOKUPS.seatsOptions.find(o => o.code === rentStatus.carSeats)?.[ar ? "ar" : "en"] ?? "—" },
                  { k: T("Tires", "حالة العجلات", ar), v: TAJEER_LOOKUPS.tiresOptions.find(o => o.code === rentStatus.tires)?.[ar ? "ar" : "en"] ?? "—" },
                  { k: T("Spare Tire", "حالة العجلة الاحتياطية", ar), v: TAJEER_LOOKUPS.tiresOptions.find(o => o.code === rentStatus.spareTire)?.[ar ? "ar" : "en"] ?? "—" },
                  { k: T("Spare Tire Tools", "معدات الكفر الاحتياطية", ar), v: TAJEER_LOOKUPS.availableOptions.find(o => o.code === rentStatus.spareTireTools)?.[ar ? "ar" : "en"] ?? "—" },
                  { k: T("Safety Triangle", "توفر المثلث العاكس", ar), v: TAJEER_LOOKUPS.availableOptions.find(o => o.code === rentStatus.safetyTriangle)?.[ar ? "ar" : "en"] ?? "—" },
                  { k: T("Fire Extinguisher", "توفر طفاية الحريق", ar), v: TAJEER_LOOKUPS.availableOptions.find(o => o.code === rentStatus.fireExtinguisher)?.[ar ? "ar" : "en"] ?? "—" },
                  { k: T("First Aid Kit", "حالة حقيبة الاسعافات الأولية", ar), v: TAJEER_LOOKUPS.availableOptions.find(o => o.code === rentStatus.firstAidKit)?.[ar ? "ar" : "en"] ?? "—" },
                  // No Tajeer rentStatus code for these four — they come from
                  // the vehicle record (vehicleEquipment in the delivery DTO).
                  { k: T("Windshield", "الزجاج الأمامي", ar), v: enumLabel(CONDITION_GRADE_LABELS, car?.windshieldStatus, ar) },
                  { k: T("Spare key", "المفتاح الاحتياطي", ar), v: enumLabel(PRESENCE_LABELS, car?.spareKeyStatus, ar) },
                  { k: T("Power outlet", "منفذ الكهرباء", ar), v: enumLabel(WORKING_LABELS, car?.powerOutletStatus, ar) },
                  { k: T("Smoking odor", "رائحة التدخين", ar), v: enumLabel(ODOR_LABELS, car?.smokingOdorStatus, ar) },
                  { k: T("Oil change @", "تغيير الزيت عند", ar), v: `${(rentStatus.oilChangeKmDistance ?? 5000).toLocaleString()} ${T("km", "كم", ar)}` },
                  { k: T("Damages marked", "أضرار مسجلة", ar), v: sketchItems.length > 0 ? `${sketchItems.length} ${T("items", "عناصر", ar)}` : T("None", "لا شيء", ar) },
                ].map(({ k, v }) => (
                  <ReviewField key={k} label={k}>{v}</ReviewField>
                ))}
              </ReviewSection>

              {/* 6 · Add-on services */}
              {addOnLines.length > 0 && (
                <ReviewSection title={T("Add-on Services", "الخدمات الإضافية", ar)}>
                  {addOnLines.map((line) => (
                    <ReviewField key={line.key} label={line.label}>
                      {line.amount.toLocaleString()} {T("SAR", "ريال", ar)}
                    </ReviewField>
                  ))}
                </ReviewSection>
              )}

              {/* 7 · Rental policy — the five sub-policies applied silently by the picked policy */}
              <ReviewSection title={T("Rental policy", "سياسة التأجير", ar)} wide>
                <div className="flex flex-wrap gap-2 sm:col-span-3">
                  {[
                    { labelEn: "Contract extension", labelAr: "تمديد العقد", value: extensionPolicy, options: RENTAL_POLICY_OPTIONS.extension },
                    { labelEn: "Early return", labelAr: "التسليم قبل الموعد", value: earlyReturnPolicy, options: RENTAL_POLICY_OPTIONS.earlyReturn },
                    { labelEn: "Accident reporting", labelAr: "الإبلاغ عن حوادث", value: accidentReportPolicy, options: RENTAL_POLICY_OPTIONS.accidentReport },
                    { labelEn: "Fuel return", labelAr: "إعادة الوقود", value: fuelReturnPolicy, options: RENTAL_POLICY_OPTIONS.fuelReturn },
                    { labelEn: "Breakdown reporting", labelAr: "الإبلاغ عن أعطال", value: breakdownReportPolicy, options: RENTAL_POLICY_OPTIONS.breakdownReport },
                  ].map((f) => {
                    const opt = f.options.find((o) => o.key === f.value);
                    return (
                      <span key={f.labelEn} className="mk-overline !font-normal px-2.5 py-1 rounded-pill bg-mk-bg text-mk-ink-600 normal-case tracking-normal">
                        {T(f.labelEn, f.labelAr, ar)}: <span className="!font-semibold">{opt ? (ar ? opt.ar : opt.en) : "—"}</span>
                      </span>
                    );
                  })}
                </div>
              </ReviewSection>

              {/* 8 · Cancellation policy — name of the picked policy (tiers aren't
                     returned by the picker endpoint). */}
              {cancellationPolicy && (
                <ReviewSection title={T("Cancellation policy", "سياسة الإلغاء", ar)} wide>
                  <div className="flex flex-wrap gap-2 sm:col-span-3">
                    <span className="mk-overline !font-normal px-2.5 py-1 rounded-pill bg-mk-bg text-mk-ink-600 normal-case tracking-normal">
                      <span className="!font-semibold">{ar ? cancellationPolicy.nameAr : cancellationPolicy.nameEn}</span>
                    </span>
                  </div>
                </ReviewSection>
              )}

            </div>
            {/* Issue button moved to sticky footer */}
          </div>
        )}

        {/* SAVING */}
        {contractStep === "saving" && (
          <div className="mk-surface rounded-xl p-5 text-center py-16">
            <div className="w-10 h-10 rounded-full border-4 border-mk-blue-500 border-t-transparent animate-spin mx-auto mb-4"></div>
            <div className="mk-h4 mb-2 text-mk-ink-900">{T("Saving contract…", "جاري حفظ العقد…", ar)}</div>
            <p className="mk-label text-mk-ink-500">{T("Issuing contract. Please wait…", "يتم إصدار العقد، يرجى الانتظار…", ar)}</p>
          </div>
        )}

        {/* VERIFICATION & SIGNATURE — merged into one screen */}
        {contractStep === "pending_signature" && tajeerResponse && (
          <div className="mk-surface rounded-xl p-5">
            <div className="text-center mb-5">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center bg-mk-mint-surface text-mk-mint-600">
                {otpDigits.every(d => d !== "") ? <Clock size={26} /> : <ShieldCheck size={26} />}
              </div>
              <div className="mk-h4 mb-1 text-mk-ink-900">
                {otpDigits.every(d => d !== "")
                  ? T("Awaiting renter signature", "بانتظار توقيع المستأجر", ar)
                  : T("Verify renter identity", "التحقق من هوية المستأجر", ar)}
              </div>
              <p className="mk-caption text-mk-ink-500">{T("Contract no.", "رقم العقد", ar)}: <strong dir="ltr" className="font-mono text-mk-ink-900 mk-caption inline-block" style={{ unicodeBidi: "isolate" }}>{tajeerResponse.contractNumber}</strong></p>
            </div>

            {!otpDigits.every(d => d !== "") ? (
              /* Step 1 of this screen: identity verification via Tajeer OTP */
              <div className="rounded-xl p-5 mb-5 bg-mk-blue-surface/40 border border-mk-blue-500/10 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 rounded-full border-4 border-mk-blue-500 border-t-transparent animate-spin mb-3"></div>
                <div className="mk-label text-mk-ink-800 mb-1">
                  {T("Waiting for customer verification...", "بانتظار إتمام التحقق من طرف العميل...", ar)}
                </div>
                <div className="mk-overline text-mk-ink-500 mb-4">
                  {T("An OTP was sent via the Tajeer platform to the registered phone number:", "تم إرسال رمز التحقق (OTP) عبر منصة تأجير إلى رقم الجوال المسجل:", ar)}
                  <div className="font-mono mt-1 text-mk-ink-900 mk-caption">{selectedCustomer?.phone}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onOtpDigitsChange(["1", "2", "3", "4", "5", "6"])}
                  className="px-4 py-2 rounded-pill bg-mk-blue-500 text-white border-0 mk-caption cursor-pointer hover:bg-mk-blue-600 transition-colors shadow-sm"
                >
                  {T("Simulate Customer Approval", "محاكاة موافقة العميل", ar)}
                </button>
              </div>
            ) : (
              <>
                {/* Step 2 of this screen: signature, outside the platform */}
                <div className="rounded-xl p-5 mb-5 bg-mk-blue-surface/40 border border-mk-blue-500/10 flex flex-col items-center justify-center text-center">
                  <div className="w-10 h-10 rounded-full border-4 border-mk-blue-500 border-t-transparent animate-spin mb-3"></div>
                  <div className="mk-label text-mk-ink-800 mb-1">
                    {T("Waiting for the renter to sign outside the platform...", "بانتظار توقيع المستأجر خارج المنصة...", ar)}
                  </div>
                  <div className="mk-overline text-mk-ink-500 mb-4 flex flex-col gap-1 items-center justify-center">
                    <div>{T("A signature link was sent to:", "تم إرسال رابط التوقيع إلى:", ar)}</div>
                    <strong dir="ltr" className="text-mk-ink-900 font-mono mk-caption">{selectedCustomer?.phone}</strong>
                  </div>

                  {/* Check signature button moved to sticky footer */}
                </div>

                <div className="rounded-xl p-3 mk-caption text-mk-warning-700 mb-4 bg-mk-warning-100 border border-mk-warning/30 text-start">
                  ⚠️ {T("Contract will be auto-cancelled after 12 hours if not signed.", "سيتم إلغاء العقد تلقائياً بعد ١٢ ساعة إذا لم يُوقَّع.", ar)}
                </div>
              </>
            )}

            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={onCancelContract} className="border-mk-danger/30 text-mk-danger">
                {T("Cancel contract", "إلغاء العقد", ar)}
              </Button>
            </div>
          </div>
        )}

        {/* ISSUED */}
        {contractStep === "issued" && tajeerResponse && (
          <>
            <SuccessCard
              className="mk-surface rounded-xl p-6"
              title={T("Contract issued successfully!", "تم إبرام العقد بنجاح!", ar)}
              subtitle={<>{T("Contract no.", "رقم العقد", ar)}: <strong dir="ltr" className="font-mono text-mk-ink-900 mk-body inline-block" style={{ unicodeBidi: "isolate" }}>{tajeerResponse.contractNumber}</strong></>}
              description={T("The contract is now active on the system.", "العقد الآن نشط على النظام.", ar)}
              actions={<>
                <Button variant="primary" onClick={onOpenPreview}>
                  <Printer size={14} />
                  {T("Print full contract", "طباعة العقد كامل", ar)}
                </Button>
                <Button variant="outline" onClick={onOpenPreview}>
                  <FileText size={14} />
                  {T("Print summary (QR)", "طباعة الملخص (QR)", ar)}
                </Button>
                <Button variant="outline" onClick={() => contractId ? router.push(`/contracts/${contractId}`) : router.push("/contracts")}>
                  {T("View in contracts list", "عرض في قائمة العقود", ar)}
                </Button>
              </>}
            />
            {/* Next: key handover — mint call-to-action card */}
            <div className="rounded-xl p-6 flex flex-wrap items-stretch gap-4 text-start bg-mk-mint-surface/40 border border-mk-border">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 self-start bg-mk-mint-500 text-white [:root[data-theme=dark]_&]:bg-mk-mint-surface [:root[data-theme=dark]_&]:text-mk-mint-600">
                <KeyRound size={18} />
              </div>
              <div className="flex flex-col gap-1 min-w-0 flex-1 basis-64">
                <strong className="mk-label text-mk-ink-900">{T("Next: hand over keys", "التالي: تسليم المفاتيح", ar)}</strong>
                <p className="mk-label !font-normal text-mk-ink-600 leading-relaxed m-0">
                  {T("Once issued and signed, escort the customer to the slot and complete the in-person key handover.",
                    "بعد الإصدار والتوقيع، رافق العميل إلى الموقف وأكمل تسليم المفاتيح وجهاً لوجه.", ar)}
                </p>
                <p className="mk-caption text-mk-ink-500 m-0">
                  {T("Handover task created — waiting for an operator to be assigned.", "أُنشئت مهمة التسليم — بانتظار تعيين مشغّل.", ar)}
                </p>
              </div>
              <Link href={`/employee/pickup?id=${tajeerResponse.contractNumber}`} className="no-underline shrink-0 ms-auto self-end">
                <Button variant="outline">
                  <KeyRound size={14} />
                  {T("Start handover", "ابدأ التسليم", ar)}
                </Button>
              </Link>
            </div>
          </>
        )}

        {/* ERROR */}
        {contractStep === "error" && (
          <div className="mk-surface rounded-xl p-5 text-center">
            <div className="mk-display-lg mb-3">❌</div>
            <div className="mk-h4 mb-2 text-mk-ink-900">{T("An error occurred", "حدث خطأ", ar)}</div>
            <p className="mk-label text-mk-danger-700 mb-5 px-4 py-3 rounded-lg bg-mk-danger-100">{tajeerError}</p>
            {/* Try again moved to sticky footer */}
          </div>
        )}

        {/* Back button moved to sticky footer */}
      </div>

      {/* Right column: financial breakdown beside the review */}
      <div className="flex flex-col gap-5">
        <div className="mk-surface rounded-xl p-5">
          <div className="mk-h4 mb-4 text-mk-ink-900">{T("Pricing Breakdown", "تفصيل الحساب المالي", ar)}</div>
          <PriceBreakdown
            ar={ar}
            rental={{
              name: car ? `${car.make} ${car.model}` : undefined,
              days,
              dailyRate: rentDayCost || car?.dailyRate || 0,
              subtotal: base,
            }}
            hourly={(contractTypeCode === 2 || contractTypeCode === 4) ? { rate: rentHourCost, hours: totalHours } : undefined}
            essential={addOnLines.filter((line) => { const t = serviceByKey.get(line.key)?.type; return t == null || t === 1; })}
            supplementary={addOnLines.filter((line) => { const t = serviceByKey.get(line.key)?.type; return t != null && t !== 1; })}
            fees={breakdownFees}
            discountAmount={discountAmount}
            discountLabel={discountType === "percent" ? T(`${discountPercent}% off`, `خصم ${discountPercent}٪`, ar) : undefined}
            subtotal={subtotal}
            vatAmount={vat}
            total={total}
            totalLabel={T("Total Contract Value (incl. VAT)", "القيمة الإجمالية للعقد (شامل الضريبة)", ar)}
          >
            {tajeerResponse && (contractStep === "pending_signature" || contractStep === "issued") && tajeerResponse.totalPaymentDetails && (
              <div className="border-t border-dashed border-mk-ink-100 pt-2.5 mt-1 flex flex-col gap-2">
                <div className="flex justify-between">
                  <span className="mk-label text-mk-ink-900">{T("Paid", "المدفوع", ar)}</span>
                  <Money size={14} className="mk-label justify-end text-mk-ink-900">{tajeerResponse.totalPaymentDetails.paid.toLocaleString()}</Money>
                </div>
                <div className="flex justify-between text-mk-ink-500 mk-caption">
                  <span>{T("Remaining", "المتبقي", ar)}</span>
                  <span>{tajeerResponse.totalPaymentDetails.remaining.toLocaleString()} {T("SAR", "ريال", ar)}</span>
                </div>
              </div>
            )}
          </PriceBreakdown>
        </div>

        {/* Payment captured */}
        <div className="rounded-xl p-5 flex items-center gap-3 bg-mk-mint-600/6 border border-mk-mint-600/25">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-mk-mint-600/15">
            <Check size={18} className="text-mk-mint-600" />
          </div>
          <div>
            <div className="mk-body-sm text-mk-mint-600">{T("Payment captured", "تم خصم الدفعة", ar)}</div>
            <div className="mk-caption mt-1 text-mk-mint-600 opacity-70">
              {(tajeerResponse?.totalPaymentDetails?.paid ?? (payType === "advance" ? advanceAmount : total)).toLocaleString()}{" "}
              {payMethod === "cash"
                ? T("SAR via Cash", "ريال نقداً", ar)
                : T("SAR via POS", "ريال عبر نقطة البيع", ar)}
              {(() => {
                const rem = tajeerResponse?.totalPaymentDetails?.remaining ?? (payType === "advance" ? remaining : 0);
                return rem > 0 ? (
                  <span className="block">{T(`Remaining on return: ${rem.toLocaleString()} SAR`, `المتبقي عند الإرجاع: ${rem.toLocaleString()} ريال`, ar)}</span>
                ) : null;
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
