"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft, ArrowRight, Car, ShieldCheck, ClockAlert, ChevronDown,
  Camera, X, Loader2, AlertCircle, CheckCircle2, Info, Zap,
} from "lucide-react";
import * as Types from "@/lib/api-types";
import { Button, Input, Select, Toggle, Tabs } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { vehicleService } from "@/lib/api-services";
import { SketchComponent } from "@/components/employee/SketchComponent";
import type { SketchItem } from "@/lib/tajeer";
import {
  T,
  AR_LABELS,
  enumOptions,
  calcVehicleCompletion,
  VEHICLE_FIELD_PANEL_MAP,
  type VehicleFieldPanel,
} from "@/lib/fleet";

interface VehicleDetailsPageProps {
  editingVehicleId: number | null;
  saving: boolean;
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
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
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

/* ── Shared field primitives ──────────────────────────────────── */
function FL({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="mk-overline text-mk-ink-500 uppercase flex items-center gap-1 tracking-wider">
        {label}
        {required && <span className="text-mk-danger mk-overline">*</span>}
      </label>
      {children}
    </div>
  );
}

function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block mk-overline uppercase tracking-wider text-mk-blue-600 bg-mk-blue-50 px-2.5 py-1 rounded-full mb-3">
      {children}
    </span>
  );
}

/* ── Collapsible panel ────────────────────────────────────────── */
function Panel({
  icon: Icon, title, count, open, onToggle, children,
}: {
  icon: React.ElementType; title: string; count: number; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg mk-surface mk-shadow-8 overflow-hidden border border-mk-ink-100">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-5 py-4 border-0 bg-transparent cursor-pointer text-start"
      >
        <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 bg-mk-blue-50">
          <Icon size={16} className="text-mk-blue-500" />
        </div>
        <div className="mk-h4 text-mk-ink-900 flex-1 truncate">{title}</div>
        {count > 0 && (
          <span className="w-5 h-5 rounded-full flex items-center justify-center mk-overline text-white bg-mk-danger shrink-0">
            {count}
          </span>
        )}
        <ChevronDown size={14} className={`text-mk-ink-400 transition-transform duration-200 shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-5 pb-5 pt-1 border-t border-mk-ink-100">{children}</div>}
    </div>
  );
}

/* ── Completion bar ───────────────────────────────────────────── */
function CompletionBar({ pct, missing, ar }: { pct: number; missing: { labelEn: string; labelAr: string }[]; ar: boolean }) {
  const [open, setOpen] = useState(false);
  const col =
    pct === 100 ? "var(--color-mk-mint-600)" : pct >= 70 ? "var(--color-mk-blue-500)" : pct >= 40 ? "var(--color-mk-warning)" : "var(--color-mk-danger)";
  return (
    <div className="rounded-md p-3 mk-surface mk-shadow-8 border border-mk-ink-100">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="mk-caption text-mk-ink-900">{T("Profile Completion", "اكتمال ملف المركبة", ar)}</span>
            <span className="mk-caption" style={{ color: col }}>{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-mk-ink-100 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: col }} />
          </div>
        </div>
        {pct === 100 ? (
          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-mk-mint-100">
            <CheckCircle2 size={14} className="text-mk-mint-600" />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="w-7 h-7 rounded-full flex items-center justify-center border-none cursor-pointer shrink-0 transition-colors bg-mk-danger-100"
          >
            <AlertCircle size={14} className="text-mk-danger" />
          </button>
        )}
      </div>
      {pct < 100 && (
        <p className="mk-overline text-mk-ink-400 cursor-pointer" onClick={() => setOpen((o) => !o)}>
          {missing.length} {T("required fields missing", "حقول مطلوبة ناقصة", ar)} — {open ? T("hide", "إخفاء", ar) : T("show", "عرض", ar)}
        </p>
      )}
      {open && missing.length > 0 && (
        <div className="mt-2 pt-2 border-t border-mk-ink-100 grid grid-cols-1 sm:grid-cols-2 gap-1">
          {missing.map((f) => (
            <div key={f.labelEn} className="flex items-center gap-1 mk-overline text-mk-danger">
              <div className="w-1 h-1 rounded-full bg-mk-danger shrink-0" />
              {ar ? f.labelAr : f.labelEn}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main details page ────────────────────────────────────────── */
export function VehicleDetailsPage({
  editingVehicleId,
  saving,
  form,
  setForm,
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
  onBack,
  onSubmit,
}: VehicleDetailsPageProps) {
  const { dir } = useAdmin();
  const ar = dir === "rtl";

  const [openPanels, setOpenPanels] = useState<Record<VehicleFieldPanel, boolean>>({
    basic: true,
    insurance: true,
    status: true,
  });
  const togglePanel = (id: VehicleFieldPanel) => setOpenPanels((p) => ({ ...p, [id]: !p[id] }));

  const [photoView, setPhotoView] = useState<"photos" | "diagram">("photos");
  const sketchItems: SketchItem[] = form.sketchItems || [];

  const [featureTypes, setFeatureTypes] = useState<{ id: number; name?: string; nameAr?: string; nameEn?: string }[]>([]);
  const [featureTypesLoading, setFeatureTypesLoading] = useState(false);

  useEffect(() => {
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
  }, []);

  const handleFeatureToggle = (featureId: number, checked: boolean) => {
    setForm((f: any) => {
      const current = Array.isArray(f.featureTypeIds) ? f.featureTypeIds : [];
      const next = checked
        ? [...current, featureId]
        : current.filter((id: any) => id !== featureId);
      return { ...f, featureTypeIds: next };
    });
  };

  const photoCount = existingImageFileIds.length + vehicleImages.length;
  const { pct, missing } = calcVehicleCompletion(form, photoCount);
  const missingByPanel = (panel: VehicleFieldPanel) =>
    missing.filter((f) => VEHICLE_FIELD_PANEL_MAP[f.key] === panel).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center border border-mk-ink-200 bg-white cursor-pointer text-mk-ink-600 hover:bg-mk-ink-50 transition-colors shrink-0"
        >
          {ar ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="mk-h4 text-mk-ink-900">
            {editingVehicleId ? T("Edit Vehicle", "تعديل السيارة", ar) : T("Add Vehicle", "إضافة سيارة", ar)}
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={onBack}>
            {T("Cancel", "إلغاء", ar)}
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="vehicle-details-form"
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
        </div>
      </div>

      {/* Completion */}
      <div className="mb-4">
        <CompletionBar pct={pct} missing={missing} ar={ar} />
      </div>

      <form id="vehicle-details-form" onSubmit={onSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* ── LEFT: info panels ─────────────────────────────── */}
          <div className="flex flex-col gap-4">
            {/* Basic Vehicle Information */}
            <Panel
              icon={Car}
              title={T("Basic Vehicle Information", "معلومات المركبة الأساسية", ar)}
              count={missingByPanel("basic")}
              open={openPanels.basic}
              onToggle={() => togglePanel("basic")}
            >
              <div className="flex flex-col gap-5">
                {/* Plate */}
                <div>
                  <SectionBadge>{T("License Plate", "اللوحة", ar)}</SectionBadge>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      label={T("Plate number *", "رقم اللوحة *", ar)}
                      value={form.plateNumber}
                      onChange={(e) => setForm((f: any) => ({ ...f, plateNumber: e.target.value }))}
                    />
                  </div>
                  <div className="mt-3">
                    <label className="mk-overline text-mk-ink-500 uppercase tracking-wider mb-2 block">
                      {T("Plate letters *", "حروف اللوحة *", ar)}
                    </label>
                    <div className="flex items-center gap-2" dir="ltr">
                      {(["plateFirstLetter", "plateSecondLetter", "plateThirdLetter"] as const).map((field) => (
                        <input
                          key={field}
                          type="text"
                          inputMode="text"
                          maxLength={1}
                          value={form[field] ?? ""}
                          onChange={(e) =>
                            setForm((f: any) => ({ ...f, [field]: e.target.value.slice(-1) }))
                          }
                          className="font-[family-name:var(--font-body)] mk-body-sm h-10 w-full min-w-0 px-0 text-center uppercase border border-mk-ink-200 bg-white rounded-md text-mk-fg-1 transition-[border-color,box-shadow] duration-base ease-standard focus:outline-none focus:border-mk-blue-500 focus:shadow-[var(--shadow-focus)]"
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Docs */}
                <div className="pt-4 border-t border-mk-ink-100">
                  <SectionBadge>{T("Registration Documents", "وثائق التسجيل", ar)}</SectionBadge>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label={T("Registration number", "رقم الاستمارة", ar)}
                      value={form.registrationNumber}
                      onChange={(e) => setForm((f: any) => ({ ...f, registrationNumber: e.target.value }))}
                    />
                    <Input
                      label={T("Serial number", "الرقم التسلسلي", ar)}
                      value={form.serialNumber}
                      onChange={(e) => setForm((f: any) => ({ ...f, serialNumber: e.target.value }))}
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
                    <Input
                      label={T("Operation card number", "رقم بطاقة التشغيل", ar)}
                      value={form.operationCardNumber}
                      onChange={(e) => setForm((f: any) => ({ ...f, operationCardNumber: e.target.value }))}
                    />
                    <Input
                      label={T("Operation card expiry", "انتهاء بطاقة التشغيل", ar)}
                      type="date"
                      value={form.operationCardExpiryDate}
                      onChange={(e) => setForm((f: any) => ({ ...f, operationCardExpiryDate: e.target.value }))}
                    />
                    <Input
                      label={T("Customs number (optional)", "رقم الجمارك (اختياري)", ar)}
                      value={form.customsNumber}
                      onChange={(e) => setForm((f: any) => ({ ...f, customsNumber: e.target.value }))}
                    />
                    <div className="col-span-2 flex flex-col gap-2">
                      <label className="mk-overline text-mk-ink-500 uppercase tracking-wider">{T("Other notes", "أخرى", ar)}</label>
                      <textarea
                        value={form.otherNotes}
                        onChange={(e) => setForm((f: any) => ({ ...f, otherNotes: e.target.value }))}
                        rows={2}
                        className="w-full px-3 py-3 rounded-md mk-body-sm text-mk-ink-900 bg-white border border-mk-ink-100 outline-none resize-none transition-all placeholder:text-mk-ink-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Vehicle details */}
                <div className="pt-4 border-t border-mk-ink-100">
                  <SectionBadge>{T("Vehicle Details", "بيانات المركبة", ar)}</SectionBadge>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      label={T("Seats *", "عدد المقاعد *", ar)}
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
                    <Input
                      label={T("Payload (kg)", "الحمولة (كغ)", ar)}
                      type="number"
                      value={form.payloadKg}
                      onChange={(e) => setForm((f: any) => ({ ...f, payloadKg: e.target.value }))}
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
                </div>
              </div>
            </Panel>

            {/* Insurance & Pricing */}
            <Panel
              icon={ShieldCheck}
              title={T("Insurance & Pricing", "التأمين والتسعير", ar)}
              count={missingByPanel("insurance")}
              open={openPanels.insurance}
              onToggle={() => togglePanel("insurance")}
            >
              <div className="flex flex-col gap-5">
                <div>
                  <SectionBadge>{T("Insurance", "التأمين", ar)}</SectionBadge>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Select
                      label={T("Branch *", "الفرع *", ar)}
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
                      label={T("Insurance company *", "شركة التأمين *", ar)}
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
                      label={T("Insurance type *", "نوع التأمين *", ar)}
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
                      label={T("Insurance amount *", "قيمة التأمين *", ar)}
                      type="number"
                      value={form.insuranceAmount}
                      onChange={(e) => setForm((f: any) => ({ ...f, insuranceAmount: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-mk-ink-100">
                  <SectionBadge>{T("Pricing & Limits", "التسعير والحدود", ar)}</SectionBadge>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label={T("Daily rate *", "السعر اليومي *", ar)}
                      type="number"
                      value={form.dailyRate}
                      onChange={(e) => setForm((f: any) => ({ ...f, dailyRate: e.target.value }))}
                    />
                    <Input
                      label={T("Late hour rate", "سعر ساعة التأخير", ar)}
                      type="number"
                      value={form.lateHourRate}
                      onChange={(e) => setForm((f: any) => ({ ...f, lateHourRate: e.target.value }))}
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
                    <div className="col-span-2 flex items-center justify-between py-2">
                      <span className="mk-caption text-mk-ink-700">{T("Enable daily km limit", "تفعيل حد الكيلومتر اليومي", ar)}</span>
                      <Toggle
                        checked={!!form.isKilometerLimitEnabled}
                        onChange={(v) => setForm((f: any) => ({ ...f, isKilometerLimitEnabled: v }))}
                      />
                    </div>
                    {form.isKilometerLimitEnabled && (
                      <Input
                        label={T("Daily km limit", "حد الكيلومتر اليومي", ar)}
                        type="number"
                        value={form.dailyKilometerLimit}
                        onChange={(e) => setForm((f: any) => ({ ...f, dailyKilometerLimit: e.target.value }))}
                      />
                    )}
                  </div>
                </div>
              </div>
            </Panel>

            {/* Status & Condition */}
            <Panel
              icon={ClockAlert}
              title={T("Status & Condition", "الحالة والحالة الفنية", ar)}
              count={missingByPanel("status")}
              open={openPanels.status}
              onToggle={() => togglePanel("status")}
            >
              <div className="flex flex-col gap-5">
                <div>
                  <FL label={T("Fleet status", "حالة الأسطول", ar)}>
                    <Select
                      value={form.status}
                      onChange={(e) => setForm((f: any) => ({ ...f, status: e.target.value }))}
                    >
                      {enumOptions(Types.VehicleFleetStatus, AR_LABELS)}
                    </Select>
                  </FL>
                  <div className="flex items-center justify-between py-3 mt-2">
                    <span className="mk-caption text-mk-ink-700">{T("Listing active", "الإدراج نشط", ar)}</span>
                    <Toggle
                      checked={!!form.isListingActive}
                      onChange={(v) => setForm((f: any) => ({ ...f, isListingActive: v }))}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-mk-ink-100">
                  <SectionBadge>{T("Maintenance", "الصيانة", ar)}</SectionBadge>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label={T("Odometer (km) *", "عداد المسافات (كم) *", ar)}
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
                      label={T("Last oil change *", "آخر تغيير زيت *", ar)}
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
                  </div>
                </div>

                <div className="pt-4 border-t border-mk-ink-100">
                  <SectionBadge>{T("Vehicle Condition", "فحص حالة المركبة", ar)}</SectionBadge>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Select
                      label={T("A/C grade", "حالة التكييف", ar)}
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
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    <label className="mk-overline text-mk-ink-500 uppercase tracking-wider">{T("Notes", "ملاحظات", ar)}</label>
                    <textarea
                      value={form.tajeerNotes}
                      onChange={(e) => setForm((f: any) => ({ ...f, tajeerNotes: e.target.value }))}
                      className="w-full min-h-[80px] p-3 rounded-md border border-mk-ink-200 bg-white text-mk-fg-1 focus:border-mk-blue-500 focus:shadow-[var(--shadow-focus)] outline-none"
                    />
                  </div>
                </div>
              </div>
            </Panel>
          </div>

          {/* ── RIGHT: photos ──────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <div className="rounded-lg p-4 mk-surface mk-shadow-8 border border-mk-ink-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 bg-mk-blue-50">
                  <Camera size={16} className="text-mk-blue-500" />
                </div>
                <div className="mk-h4 text-mk-ink-900 flex-1">{T("Vehicle Photos", "صور السيارة", ar)}</div>
                {photoView === "photos" && (
                  <span
                    className="mk-overline"
                    style={{ color: photoCount >= 4 ? "var(--color-mk-mint-600)" : "var(--color-mk-warning)" }}
                  >
                    {photoCount} {T("photos", "صور", ar)}
                  </span>
                )}
              </div>

              <Tabs
                variant="tonal"
                size="xs"
                value={photoView}
                onChange={(v) => setPhotoView(v as "photos" | "diagram")}
                items={[
                  { value: "photos", label: T("Photos", "الصور", ar) },
                  { value: "diagram", label: T("Diagram", "المخطط", ar) },
                ]}
                className="mb-4"
              />

              {photoView === "diagram" ? (
                <div className="flex flex-col gap-3">
                  <div className="rounded-lg flex items-center justify-center w-full">
                    <SketchComponent
                      value={sketchItems}
                      onChange={(items) => setForm((f: any) => ({ ...f, sketchItems: items }))}
                      ar={ar}
                    />
                  </div>
                  {sketchItems.length > 0 && (
                    <p className="mk-caption text-mk-ink-500">
                      {T(`${sketchItems.length} damage mark(s) on diagram`, `${sketchItems.length} علامة ضرر على المخطط`, ar)}
                    </p>
                  )}
                </div>
              ) : (
              <div className="flex flex-col gap-3">
                {existingImageFileIds.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="mk-caption text-mk-ink-500">{T("Current photos", "الصور الحالية", ar)}</span>
                    <div className="grid grid-cols-3 gap-2">
                      {existingImageFileIds.map((fileId) => (
                        <div key={fileId} className="relative aspect-square rounded-md border border-mk-ink-200 overflow-hidden">
                          <img src={`/api/attachments/${fileId}/download`} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => onRemoveExistingImage(fileId)}
                            className="absolute top-1 end-1 w-5 h-5 flex items-center justify-center rounded-full bg-mk-danger text-white border-0 cursor-pointer"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <label className="flex flex-col items-center justify-center gap-2 py-8 rounded-md border-1.5 border-dashed border-mk-ink-200 bg-mk-ink-50 cursor-pointer hover:bg-mk-ink-100/60 transition-colors text-mk-ink-400">
                  <Camera size={20} />
                  <span className="mk-caption">{T("Click to upload photos", "اضغط لرفع الصور", ar)}</span>
                  <input type="file" accept="image/*" multiple onChange={onImageChange} className="hidden" />
                </label>

                {vehicleImagePreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {vehicleImagePreviews.map((preview, i) => (
                      <div key={i} className="relative aspect-square rounded-md border border-mk-ink-200 overflow-hidden">
                        <img src={preview} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => onRemoveImage(i)}
                          className="absolute top-1 end-1 w-5 h-5 flex items-center justify-center rounded-full bg-mk-danger text-white border-0 cursor-pointer"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {photoCount < 4 && (
                  <p className="flex items-center gap-1 mk-caption text-mk-ink-400">
                    <Info size={12} className="shrink-0" />
                    {T("At least 4 photos recommended", "يُفضّل رفع ٤ صور على الأقل", ar)}
                  </p>
                )}
              </div>
              )}
            </div>

            {/* Features & Amenities */}
            <div className="rounded-lg p-4 mk-surface mk-shadow-8 border border-mk-ink-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 bg-mk-blue-50">
                  <Zap size={16} className="text-mk-blue-500" />
                </div>
                <div className="mk-h4 text-mk-ink-900 flex-1">{T("Features & Amenities", "الإدراج والمميزات", ar)}</div>
              </div>
              {featureTypesLoading ? (
                <div className="flex items-center gap-2 text-mk-ink-500 mk-caption">
                  <Loader2 size={14} className="animate-spin" />
                  {T("Loading features...", "جاري تحميل المميزات...", ar)}
                </div>
              ) : featureTypes.length === 0 ? (
                <div className="text-mk-ink-500 mk-caption">{T("No features available", "لا توجد مميزات متاحة", ar)}</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {featureTypes.map((feature) => {
                    const label = ar ? feature.nameAr || feature.name : feature.nameEn || feature.name || String(feature.id);
                    const checked = (form.featureTypeIds || []).includes(feature.id);
                    return (
                      <div key={feature.id} className="flex items-center justify-between py-2 border-b border-mk-ink-100 last:border-0">
                        <span className="mk-body-sm text-mk-ink-700">{label}</span>
                        <Toggle
                          checked={checked}
                          onChange={(checked) => handleFeatureToggle(feature.id, checked)}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
