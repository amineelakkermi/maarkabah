"use client";

import { FileText, Printer, Check, KeyRound } from "lucide-react";
import { Button } from "@/components/ui";
import type { DriverProfile, Car } from "@/lib/data";
import { TAJEER_LOOKUPS, type TajeerRentStatus, type SketchItem, type TajeerIdType, type TajeerContractType } from "@/lib/tajeer";
import { VehicleTypeIcon } from "@/components/employee/VehicleTypeIcon";
import { T } from "./constants";
import type { Pricing } from "./pricing";
import type { ContractAdditionalService, LookupItem } from "./useContractLookups";
import type { ContractStep } from "./StickyFooter";

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
  renterIdentityFields: RenterIdentityField[];
  isRenterDriver: boolean;
  authDriverIdNumber: string;
  authDriverMobile: string;
  authDriverBirthDate: string;
  selectedExtraDriver: DriverProfile | null;
  extraDriverIdNumber: string;
  extraDriverBirthDate: string;
  // Rental & vehicle
  days: number;
  pickupDate: Date;
  returnDate: Date;
  car: Car | undefined;
  rentStatus: Partial<TajeerRentStatus>;
  sketchItems: SketchItem[];
  // Contract settings
  branches: LookupItem[];
  rentPolicies: LookupItem[];
  receiveBranchId: number;
  returnBranchId: number;
  rentPolicyId: number;
  contractTypeCode: TajeerContractType;
  addons: Record<string, boolean>;
  additionalServices: ContractAdditionalService[];
  unlimitedKm: boolean;
  allowedKmPerDay: number;
  allowedKmPerHour: number;
  allowedLateHours: number;
  lateFeePerHour: number;
  // Pricing & payment
  pricing: Pricing;
  fullFuelCost: number;
  discountType: "percent" | "amount";
  discountPercent: number;
  payMethod: string;
};

export function StepIssue({
  ar, contractStep, tajeerResponse, tajeerError, otpDigits, onOtpDigitsChange, onOpenPreview, onCancelContract,
  selectedCustomer, idTypeCode, renterIdentityFields, isRenterDriver, authDriverIdNumber, authDriverMobile, authDriverBirthDate,
  selectedExtraDriver, extraDriverIdNumber, extraDriverBirthDate,
  days, pickupDate, returnDate, car, rentStatus, sketchItems,
  branches, rentPolicies, receiveBranchId, returnBranchId, rentPolicyId, contractTypeCode, addons, additionalServices,
  unlimitedKm, allowedKmPerDay, allowedKmPerHour, allowedLateHours, lateFeePerHour,
  pricing, fullFuelCost, discountType, discountPercent, payMethod,
}: StepIssueProps) {
  const { base, addonPrices, extraDriverFare, transferFare, authorizationFare, coverageFare, discountAmount, subtotal, vat, total } = pricing;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">


      {/* Left: Tajeer submission flow */}
      <div className="flex flex-col gap-4">

        {/* IDLE: detailed review + issue button */}
        {contractStep === "idle" && (
          <div className="mk-surface rounded-xl p-6 ">
            <div className="flex items-center gap-2 mb-6">
              <div className="mk-h4 flex-1 text-mk-ink-900">{T("Review & Issue Contract", "مراجعة وإصدار العقد", ar)}</div>
              <Button variant="tonal" size="sm" onClick={onOpenPreview}>
                <FileText size={14} />
                {T("Contract preview", "معاينة العقد", ar)}
              </Button>
            </div>

            <div className="p-3 rounded-lg bg-mk-warning-100 border border-mk-warning/30 mk-caption text-mk-warning-700 mb-6">
              ⚠️ {T("Once issued, contract data cannot be modified. The renter will receive a signature link.", "بعد الإصدار، لا يمكن تعديل بيانات العقد. سيصل للمستأجر رابط التوقيع.", ar)}
            </div>

            {/* Completed steps recap */}


            <div className="flex flex-col gap-4 mk-label-muted text-mk-ink-700 mb-5">

              {/* ═══ Step 1 info: Customer, Dates & Vehicle ═══ */}

              {/* Renter (Client) + Authorized driver */}
              <div className="flex flex-col gap-3 pb-3 border-b border-mk-ink-100">
                <div className="mk-overline text-mk-ink-400 uppercase">{T("Renter (Client)", "المستأجر (العميل)", ar)}</div>
                <div>
                  <div className="mk-label text-mk-ink-900">{ar ? selectedCustomer?.nameAr : selectedCustomer?.name}</div>
                  <div className="mk-overline text-mk-ink-500">{selectedCustomer?.phone}</div>
                </div>

                {/* ID type — set from the customer's registered record; drives the required field set below */}
                <div className="flex flex-col">
                  <span className="mk-overline text-mk-ink-400 uppercase">
                    {T("Beneficiary ID type", "نوع هوية المستفيد", ar)}
                  </span>
                  <span className="mk-label-muted text-mk-ink-700 mt-1">
                    {ar
                      ? TAJEER_LOOKUPS.idTypes.find(t => t.code === idTypeCode)?.ar
                      : TAJEER_LOOKUPS.idTypes.find(t => t.code === idTypeCode)?.en}
                  </span>
                </div>

                {/* Dynamic renter identity fields — depends on idTypeCode.
                    Display-only here: this is the final review before issuing,
                    so renter data is shown as plain info, matching the rest of the contract details. */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {renterIdentityFields.map((f) => (
                    <div key={f.key} className={`flex flex-col ${f.type === "hijri" ? "col-span-2" : ""}`}>
                      <span className="mk-overline text-mk-ink-400 uppercase">
                        {T(f.labelEn, f.labelAr, ar)}{f.required && <span className="text-mk-danger"> *</span>}
                      </span>
                      <span className="mk-label-muted text-mk-ink-700 mt-1">
                        {f.value.trim() || "—"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Authorized driver — read-only summary; set in the same step as the renter */}
                <div className="flex flex-col pt-3 border-t border-mk-ink-100">
                  <span className="mk-overline text-mk-ink-400 uppercase">{T("Authorized driver", "المفوض", ar)}</span>
                  <span className="mk-label-muted text-mk-ink-700 mt-1">
                    {isRenterDriver ? T("Same as beneficiary", "نفس المستفيد", ar) : (
                      <>
                        {authDriverIdNumber || "—"}
                        {authDriverMobile && ` · ${authDriverMobile}`}
                        {authDriverBirthDate && ` · ${authDriverBirthDate}`}
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Rental period */}
              <div className="pb-3 border-b border-mk-ink-100">
                <div className="mk-overline text-mk-ink-400 uppercase">{T("Rental Period", "فترة التأجير", ar)}</div>
                <div className="mk-label text-mk-ink-900 mt-1">{days} {T("Days", "أيام", ar)}</div>
                <div className="mk-overline text-mk-ink-500">
                  {pickupDate.toLocaleString(ar ? "ar-SA" : "en-US", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  {" → "}
                  {returnDate.toLocaleString(ar ? "ar-SA" : "en-US", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>

              {/* Vehicle details */}
              <div className="p-3 rounded-lg bg-mk-ink-50 flex items-center gap-3">
                <div className="w-12 h-12 rounded overflow-hidden shrink-0 bg-white border border-mk-ink-200 flex items-center justify-center">
                  {car?.imageUrls?.[0] ? (
                    <img src={car.imageUrls[0]} alt={car.model} className="w-full h-full object-cover" />
                  ) : (
                    <VehicleTypeIcon type={car?.type || ""} size={20} className="w-full h-full" />
                  )}
                </div>
                <div>
                  <div className="mk-label text-mk-ink-900">{car?.make} {car?.model} ({car?.year})</div>
                  <div className="mk-overline text-mk-ink-500">
                    {T("Plate: ", "رقم اللوحة: ", ar)} {car?.plate} · {T("Odometer: ", "العداد: ", ar)}{" "}
                    {rentStatus.odometerReading || 0} km
                  </div>
                </div>
              </div>

              {/* Vehicle data — sourced from the vehicle's own file (Fleet), not editable here */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-mk-ink-100">
                <div className="flex flex-col">
                  <span className="mk-overline text-mk-ink-400 uppercase">{T("Registration type", "نوع التسجيل", ar)}</span>
                  <span className="mk-label-muted text-mk-ink-700 mt-1">{car?.registrationTypeCode === 3 ? T("Private transport", "نقل خاص", ar) : T("Private", "خصوصي", ar)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="mk-overline text-mk-ink-400 uppercase">{T("Operation card", "بطاقة التشغيل", ar)}</span>
                  <span className="mk-label-muted text-mk-ink-700 mt-1">{car?.operationCardNumber || "—"}{car?.operationCardExpiryDate ? ` (${T("exp. ", "تنتهي ", ar)}${car.operationCardExpiryDate})` : ""}</span>
                </div>
                <div className="flex flex-col">
                  <span className="mk-overline text-mk-ink-400 uppercase">{T("Next oil change due", "موعد استدعاء الزيت القادم", ar)}</span>
                  <span className="mk-label-muted text-mk-ink-700 mt-1">{rentStatus.oilChangeDate || "—"}</span>
                </div>
                {car?.otherNotes && (
                  <div className="flex flex-col col-span-2">
                    <span className="mk-overline text-mk-ink-400 uppercase">{T("Other", "أخرى", ar)}</span>
                    <span className="mk-label-muted text-mk-ink-700 mt-1">{car.otherNotes}</span>
                  </div>
                )}
              </div>

              {/* Vehicle condition & inspection at pickup */}
              <div className="pb-3 border-b border-mk-ink-100">
                <div className="mk-overline text-mk-ink-400 uppercase mb-2">{T("Inspection & Vehicle Condition at Pickup", "بيانات الفحص وحالة المركبة عند الاستلام", ar)}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
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
                    { k: T("Oil change @", "تغيير الزيت عند", ar), v: `${(rentStatus.oilChangeKmDistance ?? 5000).toLocaleString()} ${T("km", "كم", ar)}` },
                  ].map(({ k, v }) => (
                    <div key={k} className="flex flex-col">
                      <span className="mk-overline text-mk-ink-400 uppercase">{k}</span>
                      <span className="mk-label-muted text-mk-ink-700 mt-1">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ═══ Step 2 info: Add-ons & Handover ═══ */}

              {/* Handover branches */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-mk-ink-100">
                <div className="flex flex-col">
                  <span className="mk-overline text-mk-ink-400 uppercase">{T("Pickup Branch", "فرع الاستلام", ar)}</span>
                  <span className="mk-label-muted text-mk-ink-700 mt-1">
                    {ar ? (branches.find(b => b.id === receiveBranchId)?.nameAr || T("Main Branch", "الفرع الرئيسي", ar)) : (branches.find(b => b.id === receiveBranchId)?.nameEn || "Main Branch")}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="mk-overline text-mk-ink-400 uppercase">{T("Return Branch", "فرع التسليم", ar)}</span>
                  <span className="mk-label-muted text-mk-ink-700 mt-1">
                    {ar ? (branches.find(b => b.id === returnBranchId)?.nameAr || T("Main Branch", "الفرع الرئيسي", ar)) : (branches.find(b => b.id === returnBranchId)?.nameEn || "Main Branch")}
                  </span>
                </div>
              </div>

              {/* Contract specifics & add-ons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Contract Type + Nested Extra Driver (swapped to first/right position) */}
                {(() => {
                  const displayedContractTypeCode = (addons.driver && selectedExtraDriver) ? contractTypeCode : (contractTypeCode === 3 ? 1 : contractTypeCode === 4 ? 2 : contractTypeCode);
                  const contractTypeObj = TAJEER_LOOKUPS.contractTypes.find(t => t.code === displayedContractTypeCode);
                  return (
                    <div className="flex flex-col">
                      <span className="mk-overline text-mk-ink-400 uppercase">{T("Contract type", "نوع العقد", ar)}</span>
                      <span className="mk-label text-mk-ink-900 mt-1">
                        {ar ? contractTypeObj?.ar : contractTypeObj?.en}
                      </span>
                      {addons.driver && selectedExtraDriver && (
                        <div className="mt-2 flex flex-col gap-1 mk-overline text-mk-ink-500">
                          <div className="mk-label text-mk-ink-900 mb-1">{ar ? selectedExtraDriver.nameAr : selectedExtraDriver.name}</div>
                          <div><strong>{T("Phone: ", "رقم الجوال: ", ar)}</strong>{selectedExtraDriver.phone}</div>
                          <div><strong>{T("ID Number: ", "رقم الهوية: ", ar)}</strong>{extraDriverIdNumber}</div>
                          <div className="mt-1 text-mk-blue-600">
                            <strong>{T("License: ", "الرخصة: ", ar)}</strong>{selectedExtraDriver.licenseNumber || "—"}
                            {selectedExtraDriver.licenseExpiryDate && ` (${T("valid to ", "تنتهي في ", ar)}${selectedExtraDriver.licenseExpiryDate})`}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 2. Allowed KM (swapped to second/left position) */}
                {(() => {
                  const displayedContractTypeCode = (addons.driver && selectedExtraDriver) ? contractTypeCode : (contractTypeCode === 3 ? 1 : contractTypeCode === 4 ? 2 : contractTypeCode);
                  return (
                    <div className="flex flex-col">
                      <span className="mk-overline text-mk-ink-400 uppercase">{T("Allowed km", "الكم المسموح", ar)}</span>
                      <span className="mk-label-muted text-mk-ink-700 mt-1">
                        {(unlimitedKm || addons.unlimited_km) ? T("Unlimited", "غير محدود", ar) : `${displayedContractTypeCode % 2 === 1 ? allowedKmPerDay : allowedKmPerHour} ${T("km", "كم", ar)}`}
                      </span>
                    </div>
                  );
                })()}

                {/* 3. Extra driver — only when not already shown nested under Contract type above */}
                {!(addons.driver && selectedExtraDriver) && (
                  <div className="flex flex-col">
                    <span className="mk-overline text-mk-ink-400 uppercase">{T("Extra driver", "سائق إضافي", ar)}</span>
                    <span className="mk-label-muted text-mk-ink-700 mt-1">
                      {!addons.driver ? (
                        T("None", "لا يوجد", ar)
                      ) : (
                        <>
                          {extraDriverIdNumber || "—"}
                          {extraDriverBirthDate && ` · ${extraDriverBirthDate}`}
                        </>
                      )}
                    </span>
                  </div>
                )}

                {/* 4. Other specifics mapped in a loop */}
                {(() => {
                  const rentPolicyObj = rentPolicies.find((p) => p.id === rentPolicyId);
                  return [
                    { k: T("Rent policy", "سياسة الإيجار", ar), v: rentPolicyObj ? (ar ? rentPolicyObj.nameAr : rentPolicyObj.nameEn) : `#${rentPolicyId}` },
                    { k: T("Late hours grace", "ساعات التأخير", ar), v: `${allowedLateHours} ${T("hr", "ساعة", ar)}` },
                    { k: T("Late fee / hour", "سعر ساعة التأخير", ar), v: `${lateFeePerHour} ${T("SAR", "ريال", ar)}` },
                    { k: T("Damages marked", "أضرار مسجلة", ar), v: sketchItems.length > 0 ? `${sketchItems.length} ${T("items", "عناصر", ar)}` : T("None", "لا شيء", ar) },
                    { k: T("Endurance amount", "مبلغ التحمل", ar), v: `${rentStatus.enduranceAmount ?? 0} ${T("SAR", "ريال", ar)}` },
                  ].map(({ k, v }) => (
                    <div key={k} className="flex flex-col">
                      <span className="mk-overline text-mk-ink-400 uppercase">{k}</span>
                      <span className="mk-label-muted text-mk-ink-700 mt-1">{v}</span>
                    </div>
                  ));
                })()}
              </div>

            </div>
            {/* Issue button moved to sticky footer */}
          </div>
        )}

        {/* SAVING */}
        {contractStep === "saving" && (
          <div className="mk-surface rounded-xl p-6 text-center py-16">
            <div className="mk-display-lg animate-spin inline-block mb-4">⟳</div>
            <div className="mk-h4 mb-2 text-mk-ink-900">{T("Saving contract…", "جاري حفظ العقد…", ar)}</div>
            <p className="mk-label text-mk-ink-500">{T("Issuing contract. Please wait…", "يتم إصدار العقد، يرجى الانتظار…", ar)}</p>
          </div>
        )}

        {/* VERIFICATION & SIGNATURE — merged into one screen */}
        {contractStep === "pending_signature" && tajeerResponse && (
          <div className="mk-surface rounded-xl p-6">
            <div className="text-center mb-5">
              <div className="mk-display-lg mb-2">{otpDigits.every(d => d !== "") ? "⏳" : "🪪"}</div>
              <div className="mk-h4 mb-1 text-mk-ink-900">
                {otpDigits.every(d => d !== "")
                  ? T("Awaiting renter signature", "بانتظار توقيع المستأجر", ar)
                  : T("Verify renter identity", "التحقق من هوية المستأجر", ar)}
              </div>
              <p className="mk-caption text-mk-ink-500">{T("Contract no.", "رقم العقد", ar)}: <strong className="font-mono text-mk-blue-500">{tajeerResponse.contractNumber}</strong></p>
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
                  <div className="font-mono mt-1 text-mk-blue-600 mk-caption">{selectedCustomer?.phone}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onOtpDigitsChange(["1", "2", "3", "4", "5", "6"])}
                  className="px-4 py-2 rounded-full bg-mk-blue-500 text-white border-0 mk-caption cursor-pointer hover:bg-mk-blue-600 transition-colors shadow-sm"
                >
                  {T("Simulate Customer Approval", "محاكاة موافقة العميل", ar)}
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4 px-1">
                  <span className="text-mk-mint-600 mk-body">✓</span>
                  <span className="mk-caption text-mk-mint-600">{T("Identity verified via the Tajeer platform", "تم التحقق من الهوية عبر منصة تأجير", ar)}</span>
                </div>

                {/* Step 2 of this screen: signature, outside the platform */}
                <div className="rounded-xl p-5 mb-5 bg-mk-blue-surface/40 border border-mk-blue-500/10 flex flex-col items-center justify-center text-center">
                  <div className="w-10 h-10 rounded-full border-4 border-mk-blue-500 border-t-transparent animate-spin mb-3"></div>
                  <div className="mk-label text-mk-ink-800 mb-1">
                    {T("Waiting for the renter to sign outside the platform...", "بانتظار توقيع المستأجر خارج المنصة...", ar)}
                  </div>
                  <div className="mk-overline text-mk-ink-500 mb-4 flex flex-col gap-1 items-center justify-center">
                    <div>{T("A signature link was sent to:", "تم إرسال رابط التوقيع إلى:", ar)}</div>
                    <strong dir="ltr" className="text-mk-blue-600 font-mono mk-caption">{selectedCustomer?.phone}</strong>
                  </div>

                  {/* Check signature button moved to sticky footer */}
                </div>

                <div className="rounded-xl p-3 mk-caption text-mk-warning-700 mb-4 bg-mk-warning-100 border border-mk-warning/30 text-start">
                  ⚠️ {T("Contract will be auto-cancelled after 12 hours if not signed.", "سيتم إلغاء العقد تلقائياً بعد ١٢ ساعة إذا لم يُوقَّع.", ar)}
                </div>
              </>
            )}

            {/* Payment summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {[
                { k: T("Paid", "المدفوع", ar), v: tajeerResponse.totalPaymentDetails?.paid },
                { k: T("Remaining", "المتبقي", ar), v: tajeerResponse.totalPaymentDetails?.remaining },
                { k: T("Total", "الإجمالي", ar), v: tajeerResponse.totalPaymentDetails?.total },
              ].map(({ k, v }) => (
                <div key={k} className="text-center p-3 rounded-lg bg-mk-ink-50">
                  <div className="mk-overline text-mk-ink-500 mb-1">{k}</div>
                  <div className="mk-body-sm text-mk-ink-900">{(v ?? 0).toLocaleString()} <span className="mk-overline text-mk-ink-400">{T("SAR", "ريال", ar)}</span></div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={onCancelContract} className="border-mk-danger/30 text-mk-danger">
                {T("Cancel contract", "إلغاء العقد", ar)}
              </Button>
            </div>
          </div>
        )}

        {/* ISSUED */}
        {contractStep === "issued" && tajeerResponse && (
          <div className="mk-surface rounded-xl p-6 text-center">
            <div className="mk-display-lg mb-3">✅</div>
            <div className="mk-h4 mb-2 text-mk-ink-900">{T("Contract issued successfully!", "تم إبرام العقد بنجاح!", ar)}</div>
            <p className="mk-label text-mk-ink-500 mb-2">{T("Contract no.", "رقم العقد", ar)}: <strong className="font-mono text-mk-blue-500 mk-body">{tajeerResponse.contractNumber}</strong></p>
            <p className="mk-caption text-mk-ink-400 mb-6">{T("The contract is now active on the system.", "العقد الآن نشط على النظام.", ar)}</p>
            <div className="flex flex-col gap-2">
              <Button variant="primary" className="shadow-[var(--shadow-glow-blue)]">
                <Printer size={14} />
                {T("Print full contract", "طباعة العقد كامل", ar)}
              </Button>
              <Button variant="outline">
                <FileText size={14} />
                {T("Print summary (QR)", "طباعة الملخص (QR)", ar)}
              </Button>
              <Button variant="outline">
                {T("View in contracts list", "عرض في قائمة العقود", ar)}
              </Button>
            </div>
          </div>
        )}

        {/* ERROR */}
        {contractStep === "error" && (
          <div className="mk-surface rounded-xl p-6 text-center">
            <div className="mk-display-lg mb-3">❌</div>
            <div className="mk-h4 mb-2 text-mk-ink-900">{T("An error occurred", "حدث خطأ", ar)}</div>
            <p className="mk-label text-mk-danger-700 mb-5 px-4 py-3 rounded-lg bg-mk-danger-100">{tajeerError}</p>
            {/* Try again moved to sticky footer */}
          </div>
        )}

        {/* Back button moved to sticky footer */}
      </div>

      {/* Delivery actions */}
      <div className="flex flex-col gap-4">
        {/* Financial breakdown — beside the review column */}
        <div className="mk-surface rounded-xl p-6">
          <div className="mk-h4 mb-6 text-mk-ink-900">{T("Pricing Breakdown", "تفصيل الحساب المالي", ar)}</div>
          <div className="flex flex-col gap-2.5 mk-caption">
            <div className="flex justify-between">
              <span>{T(`Base Rent (${days} days)`, `الإيجار الأساسي (${days} أيام)`, ar)}</span>
              <strong>{base.toLocaleString()} {T("SAR", "ريال", ar)}</strong>
            </div>
            {additionalServices.filter((service) => {
              const key = service.key.toLowerCase().replace(/[-\s]+/g, "_");
              return addons[key];
            }).map((service) => {
              const key = service.key.toLowerCase().replace(/[-\s]+/g, "_");
              return (
                <div key={service.id} className="flex justify-between text-mk-ink-600">
                  <span>+ {ar ? service.nameAr : service.nameEn}</span>
                  <span>{(addonPrices[key] ?? 0).toLocaleString()} {T("SAR", "ريال", ar)}</span>
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
              <div className="flex justify-between text-mk-ink-600">
                <span>+ {T("Full fuel cost", "تكلفة الوقود الممتلئ", ar)}</span>
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
              <span>{T("Subtotal", "المجموع الفرعي", ar)}</span>
              <span>{subtotal.toLocaleString()} {T("SAR", "ريال", ar)}</span>
            </div>
            <div className="flex justify-between text-mk-ink-500 mk-overline">
              <span>{T("VAT 15%", "الضريبة ١٥٪", ar)}</span>
              <span>{vat.toLocaleString()} {T("SAR", "ريال", ar)}</span>
            </div>
            <div className="flex justify-between items-center text-mk-blue-600 border-t border-mk-ink-100 pt-3 mt-1">
              <span className="mk-h4">{T("Total Contract Value", "القيمة الإجمالية للعقد", ar)}</span>
              <span className="mk-h4">{total.toLocaleString()} {T("SAR", "ريال", ar)}</span>
            </div>
          </div>
        </div>

        {/* Payment confirmed */}
        <div className="rounded-xl p-5 flex items-center gap-3 bg-mk-mint-600/6 border border-mk-mint-600/25">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-mk-mint-600/15">
            <Check size={18} className="text-mk-mint-600" />
          </div>
          <div>
            <div className="mk-body-sm text-mk-mint-600">{T("Payment captured", "تم خصم الدفعة", ar)}</div>
            <div className="mk-caption mt-1 text-mk-mint-600 opacity-70">
              {total.toLocaleString()}{" "}
              {payMethod === "cash"
                ? T("SAR via Cash", "ريال نقداً", ar)
                : T("SAR via POS · txn ZRT-8842", "ريال عبر نقطة البيع · العملية ZRT-8842", ar)}
            </div>
          </div>
        </div>

        {/* Key handover tip */}
        {contractStep === "issued" && (
          <div className="rounded-xl p-5 bg-mk-midnight text-white">
            <div className="flex items-center gap-2 mb-2">
              <KeyRound size={16} className="text-white/70" />
              <strong className="mk-label">{T("Next: hand over keys", "التالي: تسليم المفاتيح", ar)}</strong>
            </div>
            <p className="mk-label text-white/70 leading-relaxed m-0">
              {T("Once issued and signed, escort the customer to slot B-04 and complete the in-person key handover.",
                "بعد الإصدار والتوقيع، رافق العميل إلى الموقف ب-٠٤ وأكمل تسليم المفاتيح وجهاً لوجه.", ar)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
