"use client";

import { useState, useEffect } from "react";
import * as Types from "@/lib/api-types";
import { Loader2, Zap } from "lucide-react";
import { Button, Input, Select, Toggle, Drawer, DrawerHeader, DrawerFooter, useToast } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { vehicleService } from "@/lib/api-services";
import { T, AR_LABELS, enumOptions, validateStep } from "@/lib/fleet";

interface VehicleFormProps {
  open: boolean;
  onClose: () => void;
  editingVehicleId: number | null;
  saving: boolean;
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  step: number;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  totalSteps: number;
  makes: any[];
  models: any[];
  plateTypes: any[];
  branches: any[];
  insuranceCompanies: any[];
  insuranceTypes: any[];
  vehicleImages: File[];
  vehicleImagePreviews: string[];
  existingImageFileIds: number[];
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (index: number) => void;
  onRemoveExistingImage: (fileId: number) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function VehicleForm({
  open,
  onClose,
  editingVehicleId,
  saving,
  form,
  setForm,
  step,
  setStep,
  totalSteps,
  makes,
  models,
  plateTypes,
  branches,
  insuranceCompanies,
  insuranceTypes,
  vehicleImages,
  vehicleImagePreviews,
  existingImageFileIds,
  onImageChange,
  onRemoveImage,
  onRemoveExistingImage,
  onSubmit,
}: VehicleFormProps) {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const { showToast } = useToast();

  const [featureTypes, setFeatureTypes] = useState<{ id: number; name?: string; nameAr?: string; nameEn?: string }[]>([]);
  const [featureTypesLoading, setFeatureTypesLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function loadFeatureTypes() {
      try {
        setFeatureTypesLoading(true);
        const response = await vehicleService.searchFeatureTypes({ pageNumber: 1, pageSize: 200 });
        const list =
          response?.data?.items ??
          response?.items ??
          (Array.isArray(response?.data) ? response.data : undefined) ??
          (Array.isArray(response) ? response : undefined) ??
          [];
        if (!cancelled) setFeatureTypes(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error("Error loading vehicle feature types:", err);
        if (!cancelled) setFeatureTypes([]);
      } finally {
        if (!cancelled) setFeatureTypesLoading(false);
      }
    }
    loadFeatureTypes();
    return () => { cancelled = true; };
  }, [open]);

  const handleFeatureToggle = (featureId: number, checked: boolean) => {
    setForm((f: any) => {
      const current = Array.isArray(f.featureTypeIds) ? f.featureTypeIds : [];
      const next = checked
        ? [...current, featureId]
        : current.filter((id: any) => id !== featureId);
      return { ...f, featureTypeIds: next };
    });
  };

  const handleNext = () => {
    if (validateStep(form, step, ar, showToast)) {
      setStep((s) => Math.min(s + 1, totalSteps));
    }
  };

  const handlePrevious = () => {
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== "Enter") return;
    const target = e.target as HTMLElement;
    if (target.tagName === "TEXTAREA" || target.tagName === "BUTTON") return;

    e.preventDefault();
    if (step < totalSteps) handleNext();
  };

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="flex flex-col gap-5 justify-between h-full max-w-[560px]">
        <div className="overflow-y-auto">
          <DrawerHeader
            title={editingVehicleId ? T("Edit Vehicle", "تعديل السيارة", ar) : T("Add Vehicle", "إضافة سيارة", ar)}
            onClose={onClose}
            className="mb-0 pb-4 border-b border-mk-ink-100"
          />

          <form
            id="vehicle-form"
            onSubmit={onSubmit}
            onKeyDown={handleKeyDown}
            className="flex flex-col gap-4 mt-5"
          >
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`flex-1 h-2 rounded-full transition-colors ${
                    s <= step ? "bg-mk-blue-500" : "bg-mk-ink-200"
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between mk-caption text-mk-ink-500 mb-2">
              <span className={step === 1 ? "text-mk-blue-500" : ""}>{T("Info", "معلومات", ar)}</span>
              <span className={step === 2 ? "text-mk-blue-500" : ""}>{T("Plate", "اللوحة", ar)}</span>
              <span className={step === 3 ? "text-mk-blue-500" : ""}>{T("Insurance", "التأمين", ar)}</span>
              <span className={step === 4 ? "text-mk-blue-500" : ""}>{T("Status", "الحالة", ar)}</span>
              <span className={step === 5 ? "text-mk-blue-500" : ""}>{T("Photos", "الصور", ar)}</span>
            </div>

            {step === 1 && (
              <>
                <div className="mk-body-sm text-mk-fg-1">{T("Vehicle Info", "معلومات السيارة", ar)}</div>
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label={T("Make *", "الصانع *", ar)}
                    value={form.makeId}
                    onChange={(e) => setForm((f: any) => ({ ...f, makeId: e.target.value, modelId: "" }))}
                  >
                    <option value="">{T("Select make", "اختر الصانع", ar)}</option>
                    {makes.map((m) => (
                      <option key={m.id} value={m.id}>
                        {ar ? m.nameAr || m.name : m.nameEn || m.name}
                      </option>
                    ))}
                  </Select>
                  <Select
                    label={T("Model *", "الموديل *", ar)}
                    value={form.modelId}
                    onChange={(e) => setForm((f: any) => ({ ...f, modelId: e.target.value }))}
                    disabled={!form.makeId}
                  >
                    <option value="">{T("Select model", "اختر الموديل", ar)}</option>
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {ar ? m.nameAr || m.name : m.nameEn || m.name}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label={T("Year *", "سنة الصنع *", ar)}
                    type="number"
                    value={form.year}
                    onChange={(e) => setForm((f: any) => ({ ...f, year: e.target.value }))}
                  />
                  <Input
                    label={T("Color", "اللون", ar)}
                    value={form.color}
                    onChange={(e) => setForm((f: any) => ({ ...f, color: e.target.value }))}
                  />
                  <Input
                    label={T("VIN", "رقم الهيكل", ar)}
                    value={form.vin}
                    onChange={(e) => setForm((f: any) => ({ ...f, vin: e.target.value }))}
                  />
                  <Input
                    label={T("Engine number", "رقم المحرك", ar)}
                    value={form.engineNumber}
                    onChange={(e) => setForm((f: any) => ({ ...f, engineNumber: e.target.value }))}
                  />
                  <Input
                    label={T("Seats", "عدد المقاعد", ar)}
                    type="number"
                    value={form.seats}
                    onChange={(e) => setForm((f: any) => ({ ...f, seats: e.target.value }))}
                  />
                  <Input
                    label={T("Cylinders", "عدد السلندرات", ar)}
                    type="number"
                    value={form.cylinders}
                    onChange={(e) => setForm((f: any) => ({ ...f, cylinders: e.target.value }))}
                  />
                  <Select
                    label={T("Body type *", "نوع الهيكل *", ar)}
                    value={form.bodyType}
                    onChange={(e) => setForm((f: any) => ({ ...f, bodyType: e.target.value }))}
                  >
                    <option value="">{T("Select body type", "اختر نوع الهيكل", ar)}</option>
                    {enumOptions(Types.VehicleBodyType, AR_LABELS)}
                  </Select>
                  <Select
                    label={T("Category *", "الفئة *", ar)}
                    value={form.category}
                    onChange={(e) => setForm((f: any) => ({ ...f, category: e.target.value }))}
                  >
                    <option value="">{T("Select category", "اختر الفئة", ar)}</option>
                    {enumOptions(Types.VehicleCategory, AR_LABELS)}
                  </Select>
                  <Select
                    label={T("Fuel type *", "نوع الوقود *", ar)}
                    value={form.fuelType}
                    onChange={(e) => setForm((f: any) => ({ ...f, fuelType: e.target.value }))}
                  >
                    <option value="">{T("Select fuel type", "اختر نوع الوقود", ar)}</option>
                    {enumOptions(Types.VehicleFuelType, AR_LABELS)}
                  </Select>
                  <Select
                    label={T("Transmission *", "ناقل الحركة *", ar)}
                    value={form.transmissionType}
                    onChange={(e) => setForm((f: any) => ({ ...f, transmissionType: e.target.value }))}
                  >
                    <option value="">{T("Select transmission", "اختر ناقل الحركة", ar)}</option>
                    {enumOptions(Types.VehicleTransmissionType, AR_LABELS)}
                  </Select>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="mk-body-sm text-mk-fg-1 mt-2">{T("Plate & Documents", "اللوحة والوثائق", ar)}</div>
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label={T("Plate type *", "نوع اللوحة *", ar)}
                    value={form.plateTypeId}
                    onChange={(e) => setForm((f: any) => ({ ...f, plateTypeId: e.target.value }))}
                  >
                    <option value="">{T("Select plate type", "اختر نوع اللوحة", ar)}</option>
                    {plateTypes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {ar ? p.nameAr || p.name : p.nameEn || p.name}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label={T("Plate number", "رقم اللوحة", ar)}
                    value={form.plateNumber}
                    onChange={(e) => setForm((f: any) => ({ ...f, plateNumber: e.target.value }))}
                  />
                  <div className="flex flex-col gap-2">
                    <label className="mk-body-sm text-mk-fg-1">
                      {T("Plate letters", "حروف اللوحة", ar)}
                    </label>
                    <div className="flex items-center gap-2" dir="ltr">
                      {(
                        [
                          "plateFirstLetter",
                          "plateSecondLetter",
                          "plateThirdLetter",
                        ] as const
                      ).map((field) => (
                        <input
                          key={field}
                          type="text"
                          inputMode="text"
                          maxLength={1}
                          value={form[field] ?? ""}
                          onChange={(e) =>
                            setForm((f: any) => ({
                              ...f,
                              [field]: e.target.value.slice(-1),
                            }))
                          }
                          className="font-[family-name:var(--font-body)] mk-body-sm h-10 w-full min-w-0 px-0 text-center uppercase border border-mk-ink-200 bg-white rounded-md text-mk-fg-1 transition-[border-color,box-shadow] duration-base ease-standard focus:outline-none focus:border-mk-blue-500 focus:shadow-[var(--shadow-focus)]"
                        />
                      ))}
                    </div>
                  </div>
                  <Input
                    label={T("Registration number", "رقم الاستمارة", ar)}
                    value={form.registrationNumber}
                    onChange={(e) => setForm((f: any) => ({ ...f, registrationNumber: e.target.value }))}
                  />
                  <Input
                    label={T("Registration expiry", "انتهاء الاستمارة", ar)}
                    type="date"
                    value={form.registrationExpiryDate}
                    onChange={(e) => setForm((f: any) => ({ ...f, registrationExpiryDate: e.target.value }))}
                  />
                  <Input
                    label={T("Inspection expiry", "انتهاء الفحص", ar)}
                    type="date"
                    value={form.inspectionExpiryDate}
                    onChange={(e) => setForm((f: any) => ({ ...f, inspectionExpiryDate: e.target.value }))}
                  />
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="mk-body-sm text-mk-fg-1 mt-2">{T("Insurance & Pricing", "التأمين والتسعير", ar)}</div>
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label={T("Branch", "الفرع", ar)}
                    value={form.branchId}
                    onChange={(e) => setForm((f: any) => ({ ...f, branchId: e.target.value }))}
                  >
                    <option value="">{T("Select branch", "اختر الفرع", ar)}</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {ar ? b.nameAr || b.name : b.nameEn || b.name}
                      </option>
                    ))}
                  </Select>
                  <Select
                    label={T("Insurance company", "شركة التأمين", ar)}
                    value={form.insuranceCompanyId}
                    onChange={(e) => setForm((f: any) => ({ ...f, insuranceCompanyId: e.target.value }))}
                  >
                    <option value="">{T("Select company", "اختر الشركة", ar)}</option>
                    {insuranceCompanies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {ar ? c.nameAr || c.name : c.nameEn || c.name}
                      </option>
                    ))}
                  </Select>
                  <Select
                    label={T("Insurance type", "نوع التأمين", ar)}
                    value={form.insuranceTypeId}
                    onChange={(e) => setForm((f: any) => ({ ...f, insuranceTypeId: e.target.value }))}
                  >
                    <option value="">{T("Select type", "اختر النوع", ar)}</option>
                    {insuranceTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {ar ? t.nameAr || t.name : t.nameEn || t.name}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label={T("Policy number", "رقم الوثيقة", ar)}
                    value={form.insurancePolicyNumber}
                    onChange={(e) => setForm((f: any) => ({ ...f, insurancePolicyNumber: e.target.value }))}
                  />
                  <Input
                    label={T("Insurance expiry", "انتهاء التأمين", ar)}
                    type="date"
                    value={form.insuranceExpiryDate}
                    onChange={(e) => setForm((f: any) => ({ ...f, insuranceExpiryDate: e.target.value }))}
                  />
                  <Input
                    label={T("Insurance amount", "قيمة التأمين", ar)}
                    type="number"
                    value={form.insuranceAmount}
                    onChange={(e) => setForm((f: any) => ({ ...f, insuranceAmount: e.target.value }))}
                  />
                  <Input
                    label={T("Daily rate *", "السعر اليومي *", ar)}
                    type="number"
                    value={form.dailyRate}
                    onChange={(e) => setForm((f: any) => ({ ...f, dailyRate: e.target.value }))}
                  />
                  <Input
                    label={T("Extra km rate", "سعر الكيلومتر الإضافي", ar)}
                    type="number"
                    value={form.extraKilometerRate}
                    onChange={(e) => setForm((f: any) => ({ ...f, extraKilometerRate: e.target.value }))}
                  />
                  <Input
                    label={T("Full fuel rate", "سعر تعبئة الوقود", ar)}
                    type="number"
                    value={form.fullFuelRate}
                    onChange={(e) => setForm((f: any) => ({ ...f, fullFuelRate: e.target.value }))}
                  />
                  <Input
                    label={T("Late hour rate", "سعر ساعة التأخير", ar)}
                    type="number"
                    value={form.lateHourRate}
                    onChange={(e) => setForm((f: any) => ({ ...f, lateHourRate: e.target.value }))}
                  />
                </div>
              </>
            )}

            {step === 4 && (
                <>
                <div className="mk-body-sm text-mk-fg-1 mt-2">{T("Status & Condition", "الحالة والحالة الفنية", ar)}</div>
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label={T("Status", "الحالة", ar)}
                    value={form.status}
                    onChange={(e) => setForm((f: any) => ({ ...f, status: e.target.value }))}
                  >
                    {enumOptions(Types.VehicleFleetStatus, AR_LABELS)}
                  </Select>
                  <Select
                    label={T("Listing active", "الإدراج نشط", ar)}
                    value={String(form.isListingActive)}
                    onChange={(e) => setForm((f: any) => ({ ...f, isListingActive: e.target.value === "true" }))}
                  >
                    <option value="true">{T("Yes", "نعم", ar)}</option>
                    <option value="false">{T("No", "لا", ar)}</option>
                  </Select>
                  <Input
                    label={T("Odometer (km)", "عداد المسافات (كم)", ar)}
                    type="number"
                    value={form.odometerReading}
                    onChange={(e) => setForm((f: any) => ({ ...f, odometerReading: e.target.value }))}
                  />
                  <Select
                    label={T("Fuel level", "مستوى الوقود", ar)}
                    value={form.fuelLevel}
                    onChange={(e) => setForm((f: any) => ({ ...f, fuelLevel: e.target.value }))}
                  >
                    {enumOptions(Types.FuelLevel, AR_LABELS)}
                  </Select>
                  <Input
                    label={T("Endurance amount", "مبلغ التحمل", ar)}
                    type="number"
                    value={form.enduranceAmount}
                    onChange={(e) => setForm((f: any) => ({ ...f, enduranceAmount: e.target.value }))}
                  />
                  <Select
                    label={T("Oil type", "نوع الزيت", ar)}
                    value={form.oilType}
                    onChange={(e) => setForm((f: any) => ({ ...f, oilType: e.target.value }))}
                  >
                    {enumOptions(Types.VehicleOilType, AR_LABELS)}
                  </Select>
                  <Input
                    label={T("Last oil change", "آخر تغيير زيت", ar)}
                    type="date"
                    value={form.lastOilChangeDate}
                    onChange={(e) => setForm((f: any) => ({ ...f, lastOilChangeDate: e.target.value }))}
                  />
                  <Input
                    label={T("Oil change distance", "مسافة تغيير الزيت", ar)}
                    type="number"
                    value={form.oilChangeDistance}
                    onChange={(e) => setForm((f: any) => ({ ...f, oilChangeDistance: e.target.value }))}
                  />
                  <Select
                    label={T("AC grade", "حالة التكييف", ar)}
                    value={form.airConditionGrade}
                    onChange={(e) => setForm((f: any) => ({ ...f, airConditionGrade: e.target.value }))}
                  >
                    {enumOptions(Types.ConditionGrade, AR_LABELS)}
                  </Select>
                  <Select
                    label={T("Radio", "الراديو", ar)}
                    value={form.radioStatus}
                    onChange={(e) => setForm((f: any) => ({ ...f, radioStatus: e.target.value }))}
                  >
                    {enumOptions(Types.WorkingStatus, AR_LABELS)}
                  </Select>
                  <Select
                    label={T("Screen", "الشاشة", ar)}
                    value={form.screenStatus}
                    onChange={(e) => setForm((f: any) => ({ ...f, screenStatus: e.target.value }))}
                  >
                    {enumOptions(Types.WorkingStatus, AR_LABELS)}
                  </Select>
                  <Select
                    label={T("Odometer", "العداد", ar)}
                    value={form.odometerStatus}
                    onChange={(e) => setForm((f: any) => ({ ...f, odometerStatus: e.target.value }))}
                  >
                    {enumOptions(Types.WorkingStatus, AR_LABELS)}
                  </Select>
                  <Select
                    label={T("Seat cleanliness", "نظافة المقاعد", ar)}
                    value={form.seatCleanliness}
                    onChange={(e) => setForm((f: any) => ({ ...f, seatCleanliness: e.target.value }))}
                  >
                    {enumOptions(Types.CleanlinessStatus, AR_LABELS)}
                  </Select>
                  <Select
                    label={T("Key", "المفتاح", ar)}
                    value={form.keyStatus}
                    onChange={(e) => setForm((f: any) => ({ ...f, keyStatus: e.target.value }))}
                  >
                    {enumOptions(Types.WorkingStatus, AR_LABELS)}
                  </Select>
                  <Select
                    label={T("Tire condition", "حالة الإطارات", ar)}
                    value={form.tireCondition}
                    onChange={(e) => setForm((f: any) => ({ ...f, tireCondition: e.target.value }))}
                  >
                    {enumOptions(Types.TireCondition, AR_LABELS)}
                  </Select>
                  <Select
                    label={T("Spare tire", "الإطار الاحتياطي", ar)}
                    value={form.spareTireStatus}
                    onChange={(e) => setForm((f: any) => ({ ...f, spareTireStatus: e.target.value }))}
                  >
                    {enumOptions(Types.PresenceStatus, AR_LABELS)}
                  </Select>
                  <Select
                    label={T("Fire extinguisher", "طفاية الحريق", ar)}
                    value={form.fireExtinguisherStatus}
                    onChange={(e) => setForm((f: any) => ({ ...f, fireExtinguisherStatus: e.target.value }))}
                  >
                    {enumOptions(Types.PresenceStatus, AR_LABELS)}
                  </Select>
                  <Select
                    label={T("First aid kit", "علبة الإسعافات", ar)}
                    value={form.firstAidKitStatus}
                    onChange={(e) => setForm((f: any) => ({ ...f, firstAidKitStatus: e.target.value }))}
                  >
                    {enumOptions(Types.PresenceStatus, AR_LABELS)}
                  </Select>
                  <Select
                    label={T("Safety triangle", "مثلث السلامة", ar)}
                    value={form.safetyTriangleStatus}
                    onChange={(e) => setForm((f: any) => ({ ...f, safetyTriangleStatus: e.target.value }))}
                  >
                    {enumOptions(Types.PresenceStatus, AR_LABELS)}
                  </Select>
                  <Select
                    label={T("Tire tools", "أدوات الإطار", ar)}
                    value={form.tireToolsStatus}
                    onChange={(e) => setForm((f: any) => ({ ...f, tireToolsStatus: e.target.value }))}
                  >
                    {enumOptions(Types.PresenceStatus, AR_LABELS)}
                  </Select>
                  <div className="col-span-2 flex flex-col gap-2">
                    <label className="mk-body-sm text-mk-fg-1">{T("Notes", "ملاحظات", ar)}</label>
                    <textarea
                      value={form.tajeerNotes}
                      onChange={(e) => setForm((f: any) => ({ ...f, tajeerNotes: e.target.value }))}
                      className="w-full min-h-[80px] p-3 rounded-md border border-mk-ink-200 bg-white text-mk-fg-1 focus:border-mk-blue-500 focus:shadow-[var(--shadow-focus)] outline-none"
                    />
                  </div>
                </div>
              </>
            )}

            {step === 5 && (
              <>
                <div className="mk-body-sm text-mk-fg-1 mt-2">{T("Vehicle Photos", "صور السيارة", ar)}</div>
                <div className="flex flex-col gap-3">
                  {existingImageFileIds.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <span className="mk-caption text-mk-ink-500">
                        {T("Current photos", "الصور الحالية", ar)}
                      </span>
                      <div className="grid grid-cols-4 gap-2">
                        {existingImageFileIds.map((fileId) => (
                          <div
                            key={fileId}
                            className="relative aspect-square rounded border border-mk-ink-200 overflow-hidden"
                          >
                            <img
                              src={`/api/attachments/${fileId}/download`}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => onRemoveExistingImage(fileId)}
                              className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-mk-danger text-white text-xs"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={onImageChange}
                    className="block w-full text-sm text-mk-ink-600 file:mr-3 file:py-2 file:px-3 file:rounded-sm file:border-0 file:bg-mk-blue-500 file:text-white hover:file:bg-mk-blue-600"
                  />
                  {vehicleImagePreviews.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      {vehicleImagePreviews.map((preview, i) => (
                        <div key={i} className="relative aspect-square rounded border border-mk-ink-200 overflow-hidden">
                          <img src={preview} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => onRemoveImage(i)}
                            className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-mk-danger text-white text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Features & Amenities */}
                  <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-mk-ink-100">
                    <div className="flex items-center gap-2">
                      <Zap size={16} className="text-mk-blue-500" />
                      <div className="mk-body-sm text-mk-fg-1 font-medium">{T("Features & Amenities", "الإدراج والمميزات", ar)}</div>
                    </div>
                    {featureTypesLoading ? (
                      <div className="flex items-center gap-2 text-mk-ink-500 mk-caption">
                        <Loader2 size={14} className="animate-spin" />
                        {T("Loading features...", "جاري تحميل المميزات...", ar)}
                      </div>
                    ) : featureTypes.length === 0 ? (
                      <div className="text-mk-ink-500 mk-caption">{T("No features available", "لا توجد مميزات متاحة", ar)}</div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {featureTypes.map((feature) => {
                          const label = ar ? feature.nameAr || feature.name : feature.nameEn || feature.name || String(feature.id);
                          const checked = (form.featureTypeIds || []).includes(feature.id);
                          return (
                            <Toggle
                              key={feature.id}
                              label={label}
                              checked={checked}
                              onChange={(checked) => handleFeatureToggle(feature.id, checked)}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </form>
        </div>

        <DrawerFooter className="mt-0 pt-4 border-t border-mk-ink-100 justify-stretch">
          <Button variant="outline" onClick={onClose}>
            {T("Cancel", "إلغاء", ar)}
          </Button>
          <div className="flex items-center gap-2 flex-1 justify-end">
            {step > 1 && (
              <Button variant="outline" type="button" onClick={handlePrevious}>
                {T("Previous", "السابق", ar)}
              </Button>
            )}
            {step < totalSteps ? (
              <Button variant="primary" type="button" onClick={handleNext}>
                {T("Next", "التالي", ar)}
              </Button>
            ) : (
              <Button
                variant="primary"
                type="submit"
                form="vehicle-form"
                disabled={saving}
                className="shadow-[var(--shadow-glow-blue)]"
              >
                {saving ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : editingVehicleId ? (
                  T("✓ Update", "✓ تحديث", ar)
                ) : (
                  T("✓ Add", "✓ إضافة", ar)
                )}
              </Button>
            )}
          </div>
        </DrawerFooter>
      </div>
    </Drawer>
  );
}
