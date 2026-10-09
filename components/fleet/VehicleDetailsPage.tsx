"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft, ArrowRight, Car, ShieldCheck, ClockAlert, ChevronDown,
  Camera, X, Loader2, AlertCircle, CheckCircle2, Info, Zap,
  ArrowLeftRight, Power, History, Gauge, MapPin,
} from "lucide-react";
import * as Types from "@/lib/api-types";
import {
  Button, Input, Select, SearchableSelect, Toggle, Tabs, Modal,
  Badge, RiyalSymbol, DatePicker, useToast,
} from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { Permission } from "@/lib/permissions";
import { vehicleService } from "@/lib/api-services";
import { describeApiError } from "@/lib/api-error-messages";
import { SketchComponent } from "@/components/employee/SketchComponent";
import type { SketchItem } from "@/lib/tajeer";
import {
  T,
  AR_LABELS,
  enumOptions,
  formatEnumName,
  mapStatusFromBackend,
  STATUS_BADGE_VARIANT,
  calcVehicleCompletion,
  VEHICLE_FIELD_PANEL_MAP,
  type VehicleFieldPanel,
} from "@/lib/fleet";

interface VehicleDetailsPageProps {
  editingVehicleId: number | null;
  saving: boolean;
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  fieldErrors: Record<string, string>;
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
    <div className="flex flex-col gap-1">
      <label className="mk-label-muted uppercase flex items-center gap-1 tracking-wider mk-field-label">
        {label}
        {required && <span className="text-mk-danger mk-overline">*</span>}
      </label>
      {children}
    </div>
  );
}

function FI({ value, onChange, placeholder, type = "text", required, disabled, ar, error, ...rest }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
  required?: boolean; disabled?: boolean; ar?: boolean; error?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "required">) {
  if (type === "date") {
    return (
      <div className="flex flex-col gap-1">
        <DatePicker value={value} onChange={onChange} ar={!!ar} placeholder={placeholder} variant="muted" />
        {error && <p className="mk-caption text-mk-danger">{error}</p>}
      </div>
    );
  }
  return (
    <Input
      type={type}
      value={value}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      variant="muted"
      error={error}
      className="disabled:opacity-50 disabled:cursor-not-allowed"
      onChange={(e) => onChange(e.target.value)}
      {...rest}
    />
  );
}

function FS({ value, onChange, children, required, disabled, error, ...rest }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
  required?: boolean; disabled?: boolean; error?: string;
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange" | "required" | "size">) {
  return (
    <Select
      variant="muted"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      disabled={disabled}
      error={error}
      className="disabled:opacity-50 disabled:cursor-not-allowed"
      {...rest}
    >
      {children}
    </Select>
  );
}

/* Small pill label marking the start of a sub-section within a panel body. */
function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block mk-overline uppercase tracking-wider text-mk-blue-700 bg-mk-blue-50 px-2.5 py-1 rounded-pill mb-3">
      {children}
    </span>
  );
}

/* ── Collapsible form panel — all sections stack in the same column
   so nothing is hidden behind a tab. ──────────────────────────── */
function Panel({
  icon: Icon, title, count, open, onToggle, children,
}: {
  icon: React.ElementType; title: string; count: number; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl mk-surface mk-shadow-10 overflow-hidden">
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
      {open && <div className="px-5 pb-5 pt-5 border-t border-mk-ink-100">{children}</div>}
    </div>
  );
}

/* ── Completion bar ───────────────────────────────────────────── */
function CompletionBar({ pct, missing, ar }: { pct: number; missing: { labelEn: string; labelAr: string }[]; ar: boolean }) {
  const [open, setOpen] = useState(false);
  const col =
    pct === 100 ? "var(--color-mk-mint-600)" : pct >= 70 ? "var(--color-mk-blue-500)" : pct >= 40 ? "var(--color-mk-warning)" : "var(--color-mk-danger)";
  return (
    <div className="rounded-md p-3 mk-surface mk-shadow-8">
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

/* Fleet status pill picker — same fill colors as the status Badge. */
const STATUS_PILL_ACTIVE: Record<string, string> = {
  success: "bg-mk-success-100 text-mk-success-700",
  info: "bg-mk-blue-50 text-mk-blue-700",
  warning: "bg-mk-warning-100 text-mk-warning-700",
  danger: "bg-mk-danger-100 text-mk-danger-700",
  violet: "bg-mk-violet-100 text-mk-violet-700",
  neutral: "bg-mk-ink-100 text-mk-ink-700",
};

const FLEET_STATUSES = (Object.entries(Types.VehicleFleetStatus)
  .filter(([, v]) => typeof v === "number") as [string, number][])
  .map(([name, value]) => ({
    name,
    value,
    variant: STATUS_BADGE_VARIANT[mapStatusFromBackend(value)] ?? "neutral",
  }));

/* ── Main details page ────────────────────────────────────────── */
export function VehicleDetailsPage({
  editingVehicleId,
  saving,
  form,
  setForm,
  fieldErrors,
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
  const { showToast } = useToast();
  // Every vehicle mutation (save, status, activate/deactivate, transfer) is
  // gated on Vehicles.Save — viewers get a read-only form instead of a 403.
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission(Permission.Vehicles.Save);

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

  // ── Vehicle lifecycle (transfer / activate / deactivate) ──────
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferBranchId, setTransferBranchId] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferError, setTransferError] = useState("");
  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [transfers, setTransfers] = useState<any[] | null>(null);

  const statusNum = Number(form.status);
  // Rented (3) / Overdue (4) are contract-owned — the backend rejects
  // lifecycle changes for them (Vehicle.StatusLockedByContract).
  const statusLockedByContract = statusNum === 3 || statusNum === 4;

  const refreshTransfers = async () => {
    if (!editingVehicleId) return;
    try {
      const res = await vehicleService.searchTransfers(editingVehicleId, { pageNumber: 1, pageSize: 20 });
      const items = res?.items ?? res?.data?.items ?? res?.data ?? [];
      setTransfers(Array.isArray(items) ? items : []);
    } catch {
      setTransfers([]);
    }
  };

  useEffect(() => {
    if (editingVehicleId) refreshTransfers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingVehicleId]);

  const handleLifecycle = async (action: "activate" | "deactivate") => {
    if (!editingVehicleId) return;
    setLifecycleBusy(true);
    try {
      if (action === "activate") {
        await vehicleService.activate(editingVehicleId);
        setForm((f: any) => ({ ...f, status: String(Types.VehicleFleetStatus.Available), isListingActive: true }));
      } else {
        await vehicleService.deactivate(editingVehicleId);
        setForm((f: any) => ({ ...f, status: String(Types.VehicleFleetStatus.Inactive), isListingActive: false }));
      }
      showToast(action === "activate"
        ? T("✅ Vehicle activated — it's now available for rent", "✅ تم تفعيل المركبة — أصبحت متاحة للإيجار", ar)
        : T("⛔ Vehicle deactivated — it's now inactive", "⛔ تم إيقاف المركبة — أصبحت غير نشطة", ar));
    } catch (err) {
      showToast(
        describeApiError(err, ar, action === "activate"
          ? T("Failed to activate vehicle", "فشل تفعيل المركبة", ar)
          : T("Failed to deactivate vehicle", "فشل إيقاف المركبة", ar)),
        "error",
      );
    } finally {
      setLifecycleBusy(false);
    }
  };

  const handleTransfer = async () => {
    const target = Number(transferBranchId);
    if (!editingVehicleId || !target) return;
    setTransferBusy(true);
    setTransferError("");
    try {
      await vehicleService.transfer(editingVehicleId, { targetBranchId: target, notes: transferNotes.trim() || undefined });
      const branchName = branches.find((b) => String(b.id) === transferBranchId);
      const label = branchName ? (ar ? branchName.nameAr || branchName.name : branchName.nameEn || branchName.name) : "";
      setForm((f: any) => ({ ...f, branchId: String(target) }));
      setShowTransfer(false);
      setTransferBranchId("");
      setTransferNotes("");
      showToast(T(` Vehicle transferred${label ? ` to ${label}` : ""}`, ` تم نقل المركبة${label ? ` إلى ${label}` : ""}`, ar));
      refreshTransfers();
    } catch (err) {
      const msg = describeApiError(err, ar, T("Failed to transfer vehicle", "فشل نقل المركبة", ar));
      setTransferError(msg);
      showToast(msg, "error");
    } finally {
      setTransferBusy(false);
    }
  };

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

  /* ── Header identity — resolved from the lookup lists ──────── */
  const lookupName = (list: any[], id: any) => {
    const item = list.find((x) => String(x.id) === String(id));
    return item ? (ar ? item.nameAr || item.name : item.nameEn || item.name) : "";
  };
  const makeName = lookupName(makes, form.makeId);
  const modelName = lookupName(models, form.modelId);
  const vehicleName = [makeName, modelName].filter(Boolean).join(" ");
  const title = editingVehicleId
    ? (vehicleName ? `${vehicleName}${form.year ? ` · ${form.year}` : ""}` : T("Edit Vehicle", "تعديل السيارة", ar))
    : T("Add Vehicle", "إضافة سيارة", ar);

  const statusKey = Types.VehicleFleetStatus[statusNum] as string | undefined;
  const statusVariant = STATUS_BADGE_VARIANT[mapStatusFromBackend(statusNum)] ?? "neutral";
  const plateText = [
    [form.plateFirstLetter, form.plateSecondLetter, form.plateThirdLetter].filter(Boolean).join(" "),
    form.plateNumber,
  ].filter(Boolean).join(" ");
  const categoryKey = Types.VehicleCategory[Number(form.category)] as string | undefined;
  const subtitle = [
    plateText,
    categoryKey ? T(formatEnumName(categoryKey), AR_LABELS[categoryKey] ?? categoryKey, ar) : "",
  ].filter(Boolean).join(" · ");

  const branchName = lookupName(branches, form.branchId);

  return (
    <div>
      {/* ── Header + Actions (top) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center border border-mk-ink-200 bg-white cursor-pointer text-mk-ink-600 hover:bg-mk-ink-50 transition-colors shrink-0"
          >
            {ar ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="mk-h4 text-mk-ink-900">{title}</h2>
              {editingVehicleId && statusKey && (
                <Badge variant={statusVariant} dot>
                  {T(formatEnumName(statusKey), AR_LABELS[statusKey] ?? statusKey, ar)}
                </Badge>
              )}
            </div>
            {subtitle && <p className="mk-caption text-mk-ink-500">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          <Button variant="outline" onClick={onBack} className="flex-1 sm:flex-initial">
            <X size={14} />{canEdit ? T("Cancel", "إلغاء", ar) : T("Back", "رجوع", ar)}
          </Button>
          {canEdit && (
          <Button
            variant="primary"
            type="submit"
            form="vehicle-details-form"
            disabled={saving}
            className="flex-1 sm:flex-initial shadow-[var(--shadow-glow-blue)]"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={14} />
            ) : editingVehicleId ? (
              T("Save changes", "حفظ التغييرات", ar)
            ) : (
              T("Add vehicle", "إضافة مركبة", ar)
            )}
          </Button>
          )}
        </div>
      </div>

      {/* ── Completion bar ── */}
      <div className="mb-4">
        <CompletionBar pct={pct} missing={missing} ar={ar} />
      </div>

      {/* Read-only mode: a single disabled fieldset turns every native control
          (selects, inputs, toggles, pills, upload, transfer…) inert without
          touching each field. SketchComponent is div-based, so it gets
          `disabled` explicitly. */}
      <fieldset disabled={!canEdit} className="contents">
      {/* ── Fleet status — quick access at the top of the page ── */}
      <div className="rounded-xl p-4 sm:px-5 mb-4 mk-surface mk-shadow-10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mk-label-muted uppercase tracking-wider mk-field-label me-2">
            {T("Fleet status", "حالة الأسطول", ar)}
          </span>
          {FLEET_STATUSES.map(({ name, value, variant }) => {
            const isActive = statusNum === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setForm((f: any) => ({ ...f, status: String(value) }))}
                className={`flex items-center gap-2 px-3 py-2 rounded-pill mk-caption border cursor-pointer transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${
                  isActive
                    ? `${STATUS_PILL_ACTIVE[variant]} border-transparent`
                    : "bg-transparent text-mk-ink-400 border-mk-ink-100"
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: isActive ? "currentColor" : "var(--color-mk-ink-300)" }}
                />
                {T(formatEnumName(name), AR_LABELS[name] ?? name, ar)}
              </button>
            );
          })}
          {editingVehicleId && (
            <div className="flex items-center gap-2 ms-auto">
              {statusLockedByContract ? (
                <p className="mk-caption flex items-center gap-1.5 text-mk-ink-500">
                  <Info size={13} className="shrink-0" />
                  {T("Status is managed by the active contract", "الحالة مرتبطة بالعقد النشط", ar)}
                </p>
              ) : (
                <>
                  {statusNum !== Types.VehicleFleetStatus.Available && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={lifecycleBusy}
                      onClick={() => handleLifecycle("activate")}
                    >
                      <Power size={13} />{T("Activate", "تفعيل", ar)}
                    </Button>
                  )}
                  {statusNum !== Types.VehicleFleetStatus.Inactive && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={lifecycleBusy}
                      onClick={() => handleLifecycle("deactivate")}
                    >
                      <Power size={13} />{T("Deactivate", "إيقاف", ar)}
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <form id="vehicle-details-form" onSubmit={onSubmit}>
        {/* ── Responsive grid: 1 col on mobile/tablet, 2 cols on large screens ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* ══ LEFT (right column in RTL): stacked info panels ═════ */}
          <div className="flex flex-col gap-4">

            {/* Panel 1 — plate + docs + vehicle info */}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FL label={T("Plate type", "نوع اللوحة", ar)} required>
                      <FS
                        value={form.plateTypeId}
                        onChange={(v) => setForm((f: any) => ({ ...f, plateTypeId: v }))}
                        error={fieldErrors.plateTypeId}
                        required
                      >
                        <option value="">{T("Select plate type", "اختر نوع اللوحة", ar)}</option>
                        {plateTypes.map((p) => (
                          <option key={p.id} value={p.id}>
                            {ar ? p.nameAr || p.name : p.nameEn || p.name}
                          </option>
                        ))}
                      </FS>
                    </FL>
                    <FL label={T("Plate number", "رقم اللوحة", ar)} required>
                      <FI
                        value={form.plateNumber}
                        onChange={(v) => {
                          const digits = v.replace(/\D/g, "").slice(0, 4);
                          setForm((f: any) => ({ ...f, plateNumber: digits }));
                        }}
                        placeholder="1234"
                        error={fieldErrors.plateNumber}
                        required
                      />
                    </FL>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-3">
                    {([
                      { field: "plateFirstLetter", en: "1st Char", ar2: "الحرف الأول" },
                      { field: "plateSecondLetter", en: "2nd Char", ar2: "الحرف الثاني" },
                      { field: "plateThirdLetter", en: "3rd Char", ar2: "الحرف الثالث" },
                    ] as const).map(({ field, en, ar2 }) => (
                      <FL key={field} label={T(en, ar2, ar)} required>
                        <input
                          type="text"
                          inputMode="text"
                          maxLength={1}
                          value={form[field] ?? ""}
                          onChange={(e) => {
                            const ch = e.target.value.slice(-1);
                            if (ch && /\d/.test(ch)) return;
                            setForm((f: any) => ({ ...f, [field]: ch }));
                          }}
                          className="font-[family-name:var(--font-body)] mk-body-sm h-10 w-full min-w-0 px-0 text-center uppercase border border-mk-ink-100 bg-mk-ink-50 rounded-md text-mk-fg-1 transition-[border-color,box-shadow] duration-base ease-standard focus:outline-none focus:border-mk-blue-500 focus:shadow-[var(--shadow-focus)]"
                        />
                      </FL>
                    ))}
                  </div>
                </div>

                {/* Docs */}
                <div className="pt-4 border-t border-mk-ink-100">
                  <SectionBadge>{T("Registration Documents", "وثائق التسجيل", ar)}</SectionBadge>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <FL label={T("Registration number", "رقم الاستمارة", ar)}>
                        <FI
                          value={form.registrationNumber}
                          onChange={(v) => setForm((f: any) => ({ ...f, registrationNumber: v }))}
                          inputMode="numeric"
                          dir="ltr"
                          placeholder="XXXXXXXXXX"
                        />
                      </FL>
                    </div>
                    <FL label={T("Registration expiry", "انتهاء الاستمارة", ar)}>
                      <FI
                        type="date"
                        ar={ar}
                        value={form.registrationExpiryDate}
                        onChange={(v) => setForm((f: any) => ({ ...f, registrationExpiryDate: v }))}
                      />
                    </FL>
                    <FL label={T("Inspection expiry", "انتهاء الفحص الدوري", ar)}>
                      <FI
                        type="date"
                        ar={ar}
                        value={form.inspectionExpiryDate}
                        onChange={(v) => setForm((f: any) => ({ ...f, inspectionExpiryDate: v }))}
                      />
                    </FL>
                    <FL label={T("Serial number", "الرقم التسلسلي", ar)}>
                      <FI
                        value={form.serialNumber}
                        onChange={(v) => setForm((f: any) => ({ ...f, serialNumber: v }))}
                        inputMode="numeric"
                        dir="ltr"
                      />
                    </FL>
                    <FL label={T("Operation card number", "رقم بطاقة التشغيل", ar)}>
                      <FI
                        value={form.operationCardNumber}
                        onChange={(v) => setForm((f: any) => ({ ...f, operationCardNumber: v }))}
                        inputMode="numeric"
                        dir="ltr"
                      />
                    </FL>
                    <FL label={T("Operation card expiry", "تاريخ انتهاء بطاقة التشغيل", ar)}>
                      <FI
                        type="date"
                        ar={ar}
                        value={form.operationCardExpiryDate}
                        onChange={(v) => setForm((f: any) => ({ ...f, operationCardExpiryDate: v }))}
                      />
                    </FL>
                    <FL label={T("Customs number (optional)", "رقم الجمارك (اختياري)", ar)}>
                      <FI
                        value={form.customsNumber}
                        onChange={(v) => setForm((f: any) => ({ ...f, customsNumber: v }))}
                        inputMode="numeric"
                        dir="ltr"
                        placeholder="—"
                      />
                    </FL>
                    <div className="sm:col-span-2">
                      <FL label={T("Other notes", "أخرى", ar)}>
                        <textarea
                          value={form.otherNotes}
                          onChange={(e) => setForm((f: any) => ({ ...f, otherNotes: e.target.value }))}
                          rows={2}
                          className="w-full px-3 py-3 rounded-md mk-body-sm text-mk-ink-900 bg-mk-ink-50 border border-mk-ink-100 outline-none resize-none transition-all placeholder:text-mk-ink-300 focus:border-mk-blue-500 focus:shadow-[var(--shadow-focus)] [font-family:inherit]"
                        />
                      </FL>
                    </div>
                  </div>
                </div>

                {/* Vehicle details */}
                <div className="pt-4 border-t border-mk-ink-100">
                  <SectionBadge>{T("Vehicle Details", "بيانات المركبة", ar)}</SectionBadge>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FL label={T("Make", "الصانع", ar)} required>
                      <SearchableSelect
                        variant="muted"
                        error={fieldErrors.makeId}
                        value={String(form.makeId ?? "")}
                        onChange={(v) => setForm((f: any) => ({ ...f, makeId: v, modelId: "" }))}
                        options={makes.map((m) => ({ value: String(m.id), label: ar ? m.nameAr || m.name : m.nameEn || m.name }))}
                        placeholder={T("Select make", "اختر الصانع", ar)}
                        searchPlaceholder={T("Search make…", "ابحث عن الصانع…", ar)}
                        emptyText={T("No results found", "لا توجد نتائج", ar)}
                      />
                    </FL>
                    <FL label={T("Model", "الموديل", ar)} required>
                      <SearchableSelect
                        variant="muted"
                        error={fieldErrors.modelId}
                        value={String(form.modelId ?? "")}
                        onChange={(v) => setForm((f: any) => ({ ...f, modelId: v }))}
                        disabled={!form.makeId}
                        options={models.map((m) => ({ value: String(m.id), label: ar ? m.nameAr || m.name : m.nameEn || m.name }))}
                        placeholder={T("Select model", "اختر الموديل", ar)}
                        searchPlaceholder={T("Search model…", "ابحث عن الموديل…", ar)}
                        emptyText={T("No results found", "لا توجد نتائج", ar)}
                      />
                    </FL>
                    <FL label={T("Year", "سنة الصنع", ar)} required>
                      <FI
                        type="number"
                        value={form.year}
                        onChange={(v) => setForm((f: any) => ({ ...f, year: v }))}
                        error={fieldErrors.year}
                        required
                      />
                    </FL>
                    <FL label={T("Color", "اللون", ar)}>
                      <FI
                        value={form.color}
                        onChange={(v) => setForm((f: any) => ({ ...f, color: v }))}
                        placeholder={T("White", "أبيض", ar)}
                      />
                    </FL>
                    <div className="sm:col-span-2">
                      <FL label={T("Chassis / VIN", "رقم الشاسيه (VIN)", ar)}>
                        <FI
                          value={form.vin}
                          onChange={(v) => setForm((f: any) => ({ ...f, vin: v }))}
                          dir="ltr"
                        />
                      </FL>
                    </div>
                    <FL label={T("Seats", "عدد المقاعد", ar)} required>
                      <FI
                        type="number"
                        value={form.seats}
                        onChange={(v) => setForm((f: any) => ({ ...f, seats: v }))}
                        error={fieldErrors.seats}
                        required
                      />
                    </FL>
                    <FL label={T("Body type", "نوع الهيكل", ar)} required>
                      <FS
                        value={form.bodyType}
                        onChange={(v) => setForm((f: any) => ({ ...f, bodyType: v }))}
                        error={fieldErrors.bodyType}
                        required
                      >
                        <option value="">{T("Select body type", "اختر نوع الهيكل", ar)}</option>
                        {enumOptions(Types.VehicleBodyType, AR_LABELS)}
                      </FS>
                    </FL>
                    <FL label={T("Category", "الفئة", ar)} required>
                      <FS
                        value={form.category}
                        onChange={(v) => setForm((f: any) => ({ ...f, category: v }))}
                        error={fieldErrors.category}
                        required
                      >
                        <option value="">{T("Select category", "اختر الفئة", ar)}</option>
                        {enumOptions(Types.VehicleCategory, AR_LABELS)}
                      </FS>
                    </FL>
                    <FL label={T("Fuel type", "نوع الوقود", ar)} required>
                      <FS
                        value={form.fuelType}
                        onChange={(v) => setForm((f: any) => ({ ...f, fuelType: v }))}
                        error={fieldErrors.fuelType}
                        required
                      >
                        <option value="">{T("Select fuel type", "اختر نوع الوقود", ar)}</option>
                        {enumOptions(Types.VehicleFuelType, AR_LABELS)}
                      </FS>
                    </FL>
                    <FL label={T("Transmission", "ناقل الحركة", ar)} required>
                      <FS
                        value={form.transmissionType}
                        onChange={(v) => setForm((f: any) => ({ ...f, transmissionType: v }))}
                        error={fieldErrors.transmissionType}
                        required
                      >
                        <option value="">{T("Select transmission", "اختر ناقل الحركة", ar)}</option>
                        {enumOptions(Types.VehicleTransmissionType, AR_LABELS)}
                      </FS>
                    </FL>
                  </div>
                </div>
              </div>
            </Panel>

            {/* Panel 2 — Insurance & Pricing */}
            <Panel
              icon={ShieldCheck}
              title={T("Insurance & Pricing", "التأمين والتسعير", ar)}
              count={missingByPanel("insurance")}
              open={openPanels.insurance}
              onToggle={() => togglePanel("insurance")}
            >
              <div className="flex flex-col gap-5">
                {/* Insurance */}
                <div>
                  <SectionBadge>{T("Insurance", "التأمين", ar)}</SectionBadge>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <FL label={T("Insurance company", "شركة التأمين", ar)} required>
                        <FS
                          value={form.insuranceCompanyId}
                          onChange={(v) => setForm((f: any) => ({ ...f, insuranceCompanyId: v }))}
                          required
                        >
                          <option value="">{T("Select company", "اختر الشركة", ar)}</option>
                          {insuranceCompanies.map((c) => (
                            <option key={c.id} value={c.id}>
                              {ar ? c.nameAr || c.name : c.nameEn || c.name}
                            </option>
                          ))}
                        </FS>
                      </FL>
                    </div>
                    <div className="sm:col-span-2">
                      <FL label={T("Policy number", "رقم الوثيقة", ar)}>
                        <FI
                          value={form.insurancePolicyNumber}
                          onChange={(v) => setForm((f: any) => ({ ...f, insurancePolicyNumber: v }))}
                          placeholder="POL-XXXXXXXX"
                          dir="ltr"
                        />
                      </FL>
                    </div>
                    <FL label={T("Expiry date", "تاريخ الانتهاء", ar)}>
                      <FI
                        type="date"
                        ar={ar}
                        value={form.insuranceExpiryDate}
                        onChange={(v) => setForm((f: any) => ({ ...f, insuranceExpiryDate: v }))}
                      />
                    </FL>
                    <FL label={T("Insurance type", "نوع التأمين", ar)} required>
                      <FS
                        value={form.insuranceTypeId}
                        onChange={(v) => setForm((f: any) => ({ ...f, insuranceTypeId: v }))}
                        required
                      >
                        <option value="">{T("Select type", "اختر النوع", ar)}</option>
                        {insuranceTypes.map((t) => (
                          <option key={t.id} value={t.id}>
                            {ar ? t.nameAr || t.name : t.nameEn || t.name}
                          </option>
                        ))}
                      </FS>
                    </FL>
                    <FL label={T("Insurance amount (SAR)", "مبلغ التأمين (ريال)", ar)} required>
                      <FI
                        type="number"
                        inputMode="decimal"
                        min="0"
                        dir="ltr"
                        value={form.insuranceAmount}
                        onChange={(v) => setForm((f: any) => ({ ...f, insuranceAmount: v }))}
                        required
                      />
                    </FL>
                  </div>
                </div>

                {/* Pricing & Limits */}
                <div className="pt-4 border-t border-mk-ink-100">
                  <SectionBadge>{T("Pricing & Limits", "التسعير والحدود", ar)}</SectionBadge>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FL label={T("Daily rate (SAR)", "السعر اليومي (ريال)", ar)} required>
                      <FI
                        type="number"
                        inputMode="decimal"
                        min="0"
                        dir="ltr"
                        value={form.dailyRate}
                        onChange={(v) => setForm((f: any) => ({ ...f, dailyRate: v }))}
                        required
                      />
                    </FL>
                    <FL label={T("Late fee / hour (SAR)", "سعر ساعة التأخير (ريال)", ar)}>
                      <FI
                        type="number"
                        inputMode="decimal"
                        min="0"
                        dir="ltr"
                        value={form.lateHourRate}
                        onChange={(v) => setForm((f: any) => ({ ...f, lateHourRate: v }))}
                      />
                    </FL>
                    <FL label={T("Extra km (SAR)", "كيلومتر زائد (ريال)", ar)}>
                      <FI
                        type="number"
                        inputMode="decimal"
                        step="any"
                        min="0"
                        dir="ltr"
                        value={form.extraKilometerRate}
                        onChange={(v) => setForm((f: any) => ({ ...f, extraKilometerRate: v }))}
                      />
                    </FL>
                    <FL label={T("Full fuel (SAR)", "وقود كامل (ريال)", ar)}>
                      <FI
                        type="number"
                        inputMode="decimal"
                        min="0"
                        dir="ltr"
                        value={form.fullFuelRate}
                        onChange={(v) => setForm((f: any) => ({ ...f, fullFuelRate: v }))}
                      />
                    </FL>
                    <FL label={T("Deductible (SAR)", "مبلغ التحمل (ريال)", ar)}>
                      <FI
                        type="number"
                        inputMode="decimal"
                        min="0"
                        dir="ltr"
                        value={form.enduranceAmount}
                        onChange={(v) => setForm((f: any) => ({ ...f, enduranceAmount: v }))}
                      />
                    </FL>
                    <div className="sm:col-span-2 flex items-center justify-between py-2">
                      <span className="mk-caption text-mk-ink-700">{T("Enable daily km limit", "تفعيل حد الكيلومتر اليومي", ar)}</span>
                      <Toggle
                        checked={!!form.isKilometerLimitEnabled}
                        onChange={(v) => setForm((f: any) => ({ ...f, isKilometerLimitEnabled: v }))}
                      />
                    </div>
                    {form.isKilometerLimitEnabled && (
                      <FL label={T("Daily km limit", "حد الكيلومتر اليومي", ar)}>
                        <FI
                          type="number"
                          inputMode="numeric"
                          min="0"
                          dir="ltr"
                          value={form.dailyKilometerLimit}
                          onChange={(v) => setForm((f: any) => ({ ...f, dailyKilometerLimit: v }))}
                        />
                      </FL>
                    )}
                    {/* Branch — reassignment goes through the Transfer API when editing */}
                    <div className="sm:col-span-2">
                      <div className="flex items-end gap-2">
                        <div className="flex-1 min-w-0">
                          <FL label={T("Branch", "الفرع", ar)} required>
                            <FS
                              value={form.branchId}
                              onChange={(v) => setForm((f: any) => ({ ...f, branchId: v }))}
                              disabled={!!editingVehicleId}
                            >
                              <option value="">{T("Select branch", "اختر الفرع", ar)}</option>
                              {branches.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {ar ? b.nameAr || b.name : b.nameEn || b.name}
                                </option>
                              ))}
                            </FS>
                          </FL>
                        </div>
                        {editingVehicleId && (
                          <Button
                            type="button"
                            variant="outline"
                            className="shrink-0"
                            disabled={statusLockedByContract || lifecycleBusy}
                            onClick={() => { setTransferError(""); setShowTransfer(true); }}
                          >
                            <ArrowLeftRight size={14} />{T("Transfer", "نقل", ar)}
                          </Button>
                        )}
                      </div>
                      {editingVehicleId && (
                        <p className="mk-caption text-mk-ink-400 mt-1">
                          {T("Branch changes go through Transfer", "تغيير الفرع يتم عبر عملية النقل", ar)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Panel>

            {/* Panel 3 — Status & Condition */}
            <Panel
              icon={ClockAlert}
              title={T("Status & Condition", "الحالة والحالة الفنية", ar)}
              count={missingByPanel("status")}
              open={openPanels.status}
              onToggle={() => togglePanel("status")}
            >
              <div className="flex flex-col gap-5">
                {/* Transfer history */}
                {editingVehicleId && transfers && transfers.length > 0 && (
                  <div>
                    <div className="mk-overline uppercase mb-2 text-mk-ink-400 tracking-wider flex items-center gap-1.5">
                      <History size={12} />{T("Transfer history", "سجل النقل", ar)}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {transfers.slice(0, 5).map((t: any, i: number) => (
                        <div key={t.id ?? i} className="flex items-center gap-2 mk-caption text-mk-ink-600">
                          <span className="flex-1 truncate">
                            {(ar ? t.fromBranchNameAr : t.fromBranchNameEn) ?? t.fromBranchName ?? "—"}
                            {" → "}
                            {(ar ? t.toBranchNameAr : t.toBranchNameEn) ?? t.toBranchName ?? "—"}
                          </span>
                          <span className="text-mk-ink-400 font-mono shrink-0">
                            {String(t.occurredAtUtc ?? t.createdAtUtc ?? "").slice(0, 10)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Maintenance */}
                <div className="pt-4 border-t border-mk-ink-100">
                  <SectionBadge>{T("Maintenance", "الصيانة", ar)}</SectionBadge>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FL label={T("Odometer (km)", "عداد المسافات (كم)", ar)} required>
                      <FI
                        type="number"
                        value={form.odometerReading}
                        onChange={(v) => setForm((f: any) => ({ ...f, odometerReading: v }))}
                        required
                      />
                    </FL>
                    <FL label={T("Fuel level", "مستوى الوقود", ar)}>
                      <FS
                        value={form.fuelLevel}
                        onChange={(v) => setForm((f: any) => ({ ...f, fuelLevel: v }))}
                      >
                        {enumOptions(Types.FuelLevel, AR_LABELS)}
                      </FS>
                    </FL>
                    <FL label={T("Oil type", "نوع الزيت", ar)} required>
                      <FI
                        value={form.oilType ?? ""}
                        onChange={(v) => setForm((f: any) => ({ ...f, oilType: v }))}
                        placeholder="5W-30"
                        required
                      />
                    </FL>
                    <FL label={T("Oil change date", "موعد تغيير زيت", ar)} required>
                      <FI
                        type="date"
                        ar={ar}
                        value={form.lastOilChangeDate}
                        onChange={(v) => setForm((f: any) => ({ ...f, lastOilChangeDate: v }))}
                        required
                      />
                    </FL>
                    <FL label={T("Oil change interval (km)", "فترة تغيير الزيت (كم)", ar)}>
                      <FI
                        type="number"
                        value={form.oilChangeDistance}
                        onChange={(v) => setForm((f: any) => ({ ...f, oilChangeDistance: v }))}
                      />
                    </FL>
                    <FL label={T("Next oil change at (km)", "موعد تغيير الزيت القادم (كم)", ar)}>
                      <FI
                        type="number"
                        value={form.odometerReading && form.oilChangeDistance ? String(Number(form.odometerReading) + Number(form.oilChangeDistance)) : ""}
                        disabled
                        placeholder="—"
                        onChange={() => {}}
                      />
                    </FL>
                  </div>
                </div>

                {/* Condition checklist */}
                <div className="pt-4 border-t border-mk-ink-100">
                  <SectionBadge>{T("Vehicle Condition", "فحص حالة المركبة", ar)}</SectionBadge>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FL label={T("A/C grade", "حالة التكييف", ar)}>
                      <FS value={form.airConditionGrade} onChange={(v) => setForm((f: any) => ({ ...f, airConditionGrade: v }))}>
                        {enumOptions(Types.ConditionGrade, AR_LABELS)}
                      </FS>
                    </FL>
                    <FL label={T("Radio", "الراديو", ar)}>
                      <FS value={form.radioStatus} onChange={(v) => setForm((f: any) => ({ ...f, radioStatus: v }))}>
                        {enumOptions(Types.ConditionGrade, AR_LABELS)}
                      </FS>
                    </FL>
                    <FL label={T("Screen", "الشاشة", ar)}>
                      <FS value={form.screenStatus} onChange={(v) => setForm((f: any) => ({ ...f, screenStatus: v }))}>
                        {enumOptions(Types.ConditionGrade, AR_LABELS)}
                      </FS>
                    </FL>
                    <FL label={T("Odometer", "العداد", ar)}>
                      <FS value={form.odometerStatus} onChange={(v) => setForm((f: any) => ({ ...f, odometerStatus: v }))}>
                        {enumOptions(Types.WorkingStatus, AR_LABELS)}
                      </FS>
                    </FL>
                    <FL label={T("Seat cleanliness", "نظافة المقاعد", ar)}>
                      <FS value={form.seatCleanliness} onChange={(v) => setForm((f: any) => ({ ...f, seatCleanliness: v }))}>
                        {enumOptions(Types.CleanlinessStatus, AR_LABELS)}
                      </FS>
                    </FL>
                    <FL label={T("Key", "المفتاح", ar)}>
                      <FS value={form.keyStatus} onChange={(v) => setForm((f: any) => ({ ...f, keyStatus: v }))}>
                        {enumOptions(Types.WorkingStatus, AR_LABELS)}
                      </FS>
                    </FL>
                    <FL label={T("Tire condition", "حالة الإطارات", ar)}>
                      <FS value={form.tireCondition} onChange={(v) => setForm((f: any) => ({ ...f, tireCondition: v }))}>
                        {enumOptions(Types.TireCondition, AR_LABELS)}
                      </FS>
                    </FL>
                    <FL label={T("Spare tire", "الإطار الاحتياطي", ar)}>
                      <FS value={form.spareTireStatus} onChange={(v) => setForm((f: any) => ({ ...f, spareTireStatus: v }))}>
                        {enumOptions(Types.TireCondition, AR_LABELS)}
                      </FS>
                    </FL>
                    <FL label={T("Fire extinguisher", "طفاية الحريق", ar)}>
                      <FS value={form.fireExtinguisherStatus} onChange={(v) => setForm((f: any) => ({ ...f, fireExtinguisherStatus: v }))}>
                        {enumOptions(Types.PresenceStatus, AR_LABELS)}
                      </FS>
                    </FL>
                    <FL label={T("First aid kit", "علبة الإسعافات", ar)}>
                      <FS value={form.firstAidKitStatus} onChange={(v) => setForm((f: any) => ({ ...f, firstAidKitStatus: v }))}>
                        {enumOptions(Types.PresenceStatus, AR_LABELS)}
                      </FS>
                    </FL>
                    <FL label={T("Safety triangle", "مثلث السلامة", ar)}>
                      <FS value={form.safetyTriangleStatus} onChange={(v) => setForm((f: any) => ({ ...f, safetyTriangleStatus: v }))}>
                        {enumOptions(Types.PresenceStatus, AR_LABELS)}
                      </FS>
                    </FL>
                    <FL label={T("Tire tools", "أدوات الإطار", ar)}>
                      <FS value={form.tireToolsStatus} onChange={(v) => setForm((f: any) => ({ ...f, tireToolsStatus: v }))}>
                        {enumOptions(Types.PresenceStatus, AR_LABELS)}
                      </FS>
                    </FL>
                  </div>
                  <div className="mt-3">
                    <FL label={T("Notes", "ملاحظات", ar)}>
                      <textarea
                        value={form.tajeerNotes}
                        onChange={(e) => setForm((f: any) => ({ ...f, tajeerNotes: e.target.value }))}
                        rows={2}
                        className="w-full px-3 py-3 rounded-md mk-body-sm text-mk-ink-900 bg-mk-ink-50 border border-mk-ink-100 outline-none resize-none transition-all placeholder:text-mk-ink-300 focus:border-mk-blue-500 focus:shadow-[var(--shadow-focus)] [font-family:inherit]"
                      />
                    </FL>
                  </div>
                </div>
              </div>
            </Panel>
          </div>

          {/* ══ RIGHT: media + listing ═════════════════════════════ */}
          <div className="flex flex-col gap-4">

            {/* Photos / Diagram card */}
            <div className="rounded-xl p-4 mk-surface mk-shadow-10">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="mk-label text-mk-ink-900">{T("Vehicle Condition", "حالة المركبة", ar)}</div>
                <div className="flex items-center gap-2">
                  <Tabs
                    variant="default"
                    rounded="full"
                    size="sm"
                    className="shrink-0"
                    value={photoView}
                    onChange={(v) => setPhotoView(v as "photos" | "diagram")}
                    items={[
                      { value: "photos", label: T("Photos", "الصور", ar), icon: <Camera size={12} /> },
                      {
                        value: "diagram",
                        label: T("Diagram", "المخطط", ar),
                        icon: (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                            <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                          </svg>
                        ),
                      },
                    ]}
                  />
                  {photoView === "photos" && (
                    <span
                      className="mk-overline"
                      style={{ color: photoCount >= 4 ? "var(--color-mk-mint-600)" : "var(--color-mk-warning)" }}
                    >
                      {photoCount} {T("photos", "صور", ar)}
                    </span>
                  )}
                  {photoView === "diagram" && sketchItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setForm((f: any) => ({ ...f, sketchItems: [] }))}
                      className="mk-overline text-mk-danger border-none bg-transparent cursor-pointer"
                    >
                      {T("Clear all", "مسح الكل", ar)}
                    </button>
                  )}
                </div>
              </div>

              {photoView === "diagram" ? (
                <div>
                  <p className="mk-overline text-mk-ink-400 mb-2">
                    {T("Click on car to add damage point", "اضغط على السيارة لإضافة نقطة ضرر", ar)}
                  </p>
                  <div className="rounded-md">
                    <SketchComponent
                      value={sketchItems}
                      onChange={(items) => setForm((f: any) => ({ ...f, sketchItems: items }))}
                      disabled={!canEdit}
                      ar={ar}
                    />
                  </div>
                  {sketchItems.length > 0 && (
                    <p className="mt-1 mk-overline text-mk-ink-500">
                      {sketchItems.length} {T("point(s) recorded", "نقطة مسجلة", ar)}
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
                          <div key={fileId} className="relative group aspect-[4/3] rounded-md border border-mk-ink-100 overflow-hidden">
                            <img src={`/api/attachments/${fileId}/download`} alt="" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => onRemoveExistingImage(fileId)}
                              className="absolute top-1 end-1 w-5 h-5 flex items-center justify-center rounded-full bg-mk-danger text-white border-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
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
                        <div key={i} className="relative group aspect-[4/3] rounded-md border border-mk-ink-100 overflow-hidden">
                          <img src={preview} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => onRemoveImage(i)}
                            className="absolute top-1 end-1 w-5 h-5 flex items-center justify-center rounded-full bg-mk-danger text-white border-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
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

            {/* Quick stats — real form data only */}
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  icon: RiyalSymbol,
                  label: T("Daily", "يومي", ar),
                  value: form.dailyRate || "—",
                  color: "var(--color-mk-blue-500)",
                  bg: "var(--color-mk-blue-50)",
                },
                {
                  icon: MapPin,
                  label: T("Branch", "الفرع", ar),
                  value: branchName || "—",
                  color: "var(--color-mk-mint-600)",
                  bg: "var(--color-mk-mint-100)",
                },
                {
                  icon: Gauge,
                  label: T("Odometer", "العداد", ar),
                  value: form.odometerReading ? Number(form.odometerReading).toLocaleString("en-US") : "—",
                  color: "var(--color-mk-danger)",
                  bg: "var(--color-mk-danger-100)",
                },
              ].map(({ icon: Icon, label, value, color, bg }) => (
                <div
                  key={label}
                  className="relative flex flex-col items-center gap-1 p-4 rounded-md"
                  style={{ background: bg }}
                >
                  <Icon size={18} style={{ color }} />
                  <span className="mk-h4 text-mk-ink-900 mt-1 max-w-full truncate">{value}</span>
                  <span className="mk-overline text-mk-ink-500 text-center">{label}</span>
                </div>
              ))}
            </div>

            {/* Listing & Features */}
            <div className="rounded-xl p-4 mk-surface mk-shadow-10">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 bg-mk-blue-50">
                  <Zap size={16} className="text-mk-blue-700" />
                </div>
                <div className="mk-h4 text-mk-ink-900">{T("Listing & Features", "الإدراج والمميزات", ar)}</div>
              </div>
              <div className="flex flex-col gap-0">
                <div className="flex items-center justify-between py-2 border-b border-mk-ink-50">
                  <span className="mk-caption text-mk-ink-700">{T("Listing active", "الإدراج نشط", ar)}</span>
                  <Toggle
                    checked={!!form.isListingActive}
                    onChange={(v) => setForm((f: any) => ({ ...f, isListingActive: v }))}
                  />
                </div>
                {featureTypesLoading ? (
                  <div className="flex items-center gap-2 py-2 text-mk-ink-500 mk-caption">
                    <Loader2 size={14} className="animate-spin" />
                    {T("Loading features...", "جاري تحميل المميزات...", ar)}
                  </div>
                ) : featureTypes.length === 0 ? (
                  <div className="py-2 text-mk-ink-500 mk-caption">{T("No features available", "لا توجد مميزات متاحة", ar)}</div>
                ) : (
                  featureTypes.map((feature) => {
                    const label = ar ? feature.nameAr || feature.name : feature.nameEn || feature.name || String(feature.id);
                    const checked = (form.featureTypeIds || []).includes(feature.id);
                    return (
                      <div key={feature.id} className="flex items-center justify-between py-2 border-b border-mk-ink-50 last:border-0">
                        <span className="mk-caption text-mk-ink-700">{label}</span>
                        <Toggle
                          checked={checked}
                          onChange={(checked) => handleFeatureToggle(feature.id, checked)}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
      </fieldset>

      {/* Transfer vehicle to another branch */}
      {showTransfer && (
        <Modal
          open={true}
          onClose={() => { if (!transferBusy) { setShowTransfer(false); setTransferError(""); } }}
          variant="centered"
          size="md"
          title={T("Transfer vehicle to branch", "نقل المركبة إلى فرع", ar)}
        >
          <div className="p-6 flex flex-col gap-4">
            <Select
              label={T("Target branch *", "الفرع المستهدف *", ar)}
              value={transferBranchId}
              onChange={(e) => setTransferBranchId(e.target.value)}
            >
              <option value="">{T("Select branch", "اختر الفرع", ar)}</option>
              {branches
                .filter((b) => String(b.id) !== String(form.branchId))
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {ar ? b.nameAr || b.name : b.nameEn || b.name}
                  </option>
                ))}
            </Select>
            <div className="flex flex-col gap-2">
              <label className="mk-overline text-mk-ink-500 uppercase tracking-wider">
                {T("Notes", "ملاحظات", ar)}
              </label>
              <textarea
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg mk-body-sm text-mk-ink-900 border border-mk-ink-200 bg-white outline-none focus:border-mk-blue-500 resize-none"
              />
            </div>
            {transferError && (
              <p className="mk-label text-mk-danger-700 px-4 py-3 rounded-lg bg-mk-danger-100">{transferError}</p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" disabled={transferBusy}
                onClick={() => { setShowTransfer(false); setTransferError(""); }}>
                {T("Back", "رجوع", ar)}
              </Button>
              <Button variant="primary" className="flex-1" disabled={transferBusy || !transferBranchId} onClick={handleTransfer}>
                <ArrowLeftRight size={14} />{transferBusy ? T("Transferring…", "جارٍ النقل…", ar) : T("Transfer", "نقل", ar)}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
