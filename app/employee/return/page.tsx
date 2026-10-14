"use client";

import { useState, useEffect, Suspense } from "react";
import {
  Check, AlertTriangle,
  Camera, MapPin, X, Search,
  ChevronRight, ChevronLeft, Phone,
  UserCheck, Gauge, Fuel, Smartphone,
  Monitor, Music, Wind, CircleDot, Armchair, KeyRound, TriangleAlert,
  FireExtinguisher, HeartPulse, Wrench, ShieldCheck, Droplet,
} from "lucide-react";
import { Avatar, Badge, Button, Checkbox, Tabs, Input, IconButton, Table, Th, Td, Select, Modal, SuccessDialog } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { SketchComponent } from "@/components/employee/SketchComponent";
import { PhotoSlotsPanel, type PhotoSlotValue } from "@/components/employee/PhotoSlotsPanel";
import { ReadonlyCarCarousel } from "@/components/employee/ReadonlyCarCarousel";
import { VehicleMapPanel } from "@/components/employee/VehicleMapPanel";
import { HANDOVER_ITEM_ICONS } from "@/components/employee/handoverIcons";
import { PlaceBadge } from "@/components/shared/ContractPlace";
import type { SketchItem } from "@/lib/tajeer";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { contractService, attachmentService, vehicleService } from "@/lib/api-services";
import * as Types from "@/lib/api-types";
import { buildVehiclePayload, extractVehicleImageFileIds, mapDamagePointsToSketchItems, mapVehicleToForm } from "@/lib/fleet";
import { normalizeKycStatus, formatPlate } from "@/lib/formatting";
import type { Booking } from "@/lib/data";

const T = (en: string, ar: string, isAr: boolean) => isAr ? ar : en;

const STATUS_MAP: Record<string, { variant: "success" | "warning" | "danger" | "neutral"; labelEn: string; labelAr: string }> = {
  active: { variant: "success", labelEn: "Active", labelAr: "نشط" },
  pending: { variant: "warning", labelEn: "Pending", labelAr: "معلق" },
  late: { variant: "danger", labelEn: "Late", labelAr: "متأخر" },
  completed: { variant: "neutral", labelEn: "Completed", labelAr: "مكتمل" },
};

// ContractStatus: 1=Draft 2=PendingIssuance 3=Active 4=Cancelled 5=Overdue 6=Completed
function statusKey(s: unknown): string {
  switch (Number(s)) {
    case 3: return "active";
    case 4: return "cancelled";
    case 5: return "late";
    case 6: return "completed";
    default: return "pending";
  }
}

interface ReturnRow {
  navId: string;
  ref: string;
  customer: string;
  phone: string;
  car: string;
  plate: string;
  due: string;
  amount: number;
  kyc: string;
  status: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapReturnRow(item: any, ar: boolean): ReturnRow {
  const customer = (ar ? item.customerNameAr : item.customerNameEn) ?? item.customerName ?? item.customerNameEn ?? item.customerNameAr ?? item.customer?.fullNameEn ?? "";
  const due = item.endAt ? new Date(item.endAt) : null;
  return {
    navId: String(item.id),
    ref: String(item.contractNumber ?? item.tajeerContractNumber ?? item.id ?? ""),
    customer,
    phone: item.customerPhone ?? item.customerPhoneNumber ?? item.customer?.phoneNumber ?? "",
    car: item.vehicleName ?? [
      (ar ? item.vehicleMakeNameAr : item.vehicleMakeNameEn) ?? item.vehicleMakeNameEn ?? item.vehicleMakeNameAr,
      (ar ? item.vehicleModelNameAr : item.vehicleModelNameEn) ?? item.vehicleModelNameEn ?? item.vehicleModelNameAr,
      item.vehicleYear ?? item.year,
    ].filter(Boolean).join(" "),
    plate: formatPlate(item.vehicle ?? item) || String(item.vehiclePlateNumber ?? ""),
    due: due && !isNaN(due.getTime())
      ? due.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + due.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
      : "",
    amount: Number(item.totalAmount ?? item.grandTotal ?? item.total ?? item.paidAmount ?? 0),
    kyc: normalizeKycStatus(item.customerVerificationStatus ?? item.verificationStatus),
    status: statusKey(item.status),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toBooking(item: any, ar: boolean, row: ReturnRow): Booking {
  const start = item.startAt ? new Date(item.startAt) : null;
  const end = item.endAt ? new Date(item.endAt) : null;
  return {
    id: row.ref,
    customer: row.customer,
    customerInitials: row.customer.split(" ").filter(Boolean).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
    phone: row.phone,
    car: row.car,
    plate: row.plate,
    date: start && !isNaN(start.getTime()) ? start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "",
    time: start && !isNaN(start.getTime()) ? start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : "",
    dropoff: end && !isNaN(end.getTime()) ? end.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "",
    branch: (ar ? item.workingBranchNameAr : item.workingBranchNameEn) ?? item.workingBranchName ?? item.workingBranchNameEn ?? item.workingBranchNameAr ?? item.branchName ?? "",
    type: "return",
    status: row.status as Booking["status"],
    kyc: row.kyc as Booking["kyc"],
    amount: row.amount,
    flagged: row.status === "late",
  };
}

const FUEL_OPTIONS: { value: Types.FuelLevel; en: string; ar: string }[] = [
  { value: Types.FuelLevel.Full, en: "Full", ar: "ممتلئ" },
  { value: Types.FuelLevel.ThreeQuarters, en: "3/4", ar: "٣/٤" },
  { value: Types.FuelLevel.Half, en: "1/2", ar: "١/٢" },
  { value: Types.FuelLevel.Quarter, en: "1/4", ar: "١/٤" },
  { value: Types.FuelLevel.Empty, en: "Empty", ar: "فارغ" },
];

function fuelLabel(level: Types.FuelLevel | "", ar: boolean): string {
  const opt = FUEL_OPTIONS.find((o) => o.value === level);
  return opt ? (ar ? opt.ar : opt.en) : "—";
}

// Inspection grid key → HandoverCondition field
const CONDITION_KEY_MAP: Record<string, keyof Types.HandoverCondition> = {
  odometer: "speedometer",
  screen: "screen",
  radio: "radioStereo",
  ac: "ac",
  spareTire: "spareTire",
  tires: "tires",
  seats: "carSeats",
  keys: "keys",
  triangle: "safetyTriangle",
  extinguisher: "fireExtinguisher",
  firstAid: "firstAidKit",
  tireKit: "spareTireTools",
};

type TabKey = "all" | "active" | "late";
const TABS: { key: TabKey; en: string; ar: string; color?: string }[] = [
  { key: "all", en: "All", ar: "الكل" },
  { key: "active", en: "Active", ar: "نشطة" },
  { key: "late", en: "Late", ar: "متأخرة", color: "var(--color-mk-danger)" },
];

// ── Vehicle Condition Panel ────────────────────────────────────────
function VehicleConditionPanel({ ar, photos, vehicleTitle, sketchItems, onSketchChange, baselineSketch, damageNotes, onDamageNotesChange, disabled }: {
  ar: boolean; photos: { src: string; label: string }[]; vehicleTitle: string; sketchItems: SketchItem[]; onSketchChange: (items: SketchItem[]) => void;
  baselineSketch: SketchItem[]; damageNotes: string; onDamageNotesChange: (v: string) => void; disabled: boolean;
}) {
  const [view, setView] = useState<"diagram" | "photos">("diagram");
  const hasDamage = sketchItems.length > 0;
  return (
    <div className="rounded-xl p-5 mk-surface">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="mk-h4 text-mk-ink-900">{T("Vehicle Condition", "حالة المركبة", ar)}</div>
        <Tabs
          variant="default"
          rounded="full"
          size="sm"
          value={view}
          onChange={(v) => setView(v as "diagram" | "photos")}
          items={[
            { value: "diagram", label: T("Diagram", "المخطط", ar) },
            { value: "photos", label: T("Photos", "الصور", ar) },
          ]}
        />
      </div>
      {view === "diagram"
        ? <div className="rounded-lg flex items-center justify-center w-full"><SketchComponent value={sketchItems} onChange={onSketchChange} baseline={baselineSketch} ar={ar} disabled={disabled} /></div>
        : <ReadonlyCarCarousel photos={photos} ar={ar} title={vehicleTitle} />
      }
      {view === "diagram" && hasDamage && (
        <div className="mt-3 rounded-lg p-3" style={{ background: "rgba(226,65,113,0.06)", border: "1px solid rgba(226,65,113,0.25)" }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-mk-danger shrink-0" />
            <span className="mk-caption text-mk-danger">{T(`${sketchItems.length} damage mark(s) found · not on pickup report`, `${sketchItems.length} علامة ضرر · غير مسجلة في محضر التسليم`, ar)}</span>
          </div>
          <textarea
            value={damageNotes}
            onChange={e => onDamageNotesChange(e.target.value)}
            disabled={disabled}
            placeholder={T("Describe the damage and how it differs from the pickup report…", "صف التلفيات والنقاط الغير مطابقة لمحضر التسليم…", ar)}
            rows={3}
            className="w-full px-3 py-2 rounded-md mk-body-sm text-mk-ink-900 border border-mk-danger/30 bg-white outline-none focus:border-mk-danger resize-none"
          />
        </div>
      )}
    </div>
  );
}

type ReturnInspectionField = {
  key: string;
  group: "base" | "equipment";
  labelEn: string;
  labelAr: string;
  item?: Types.HandoverInspectionDisplayItem;
};

function ReturnInspectionSelects({ ar, fields, values, onChange, disabled }: {
  ar: boolean;
  fields: ReturnInspectionField[];
  values: Record<string, number>;
  onChange: (values: Record<string, number>) => void;
  disabled: boolean;
}) {
  const optionsFor = (field: ReturnInspectionField) => {
    const current = Number(field.item?.value ?? 0);
    const options = field.key === "smokingOdor" || ["keys", "speedometer", "safetyTriangle", "firstAidKit", "fireExtinguisher", "spareKey", "spareTireTools", "powerOutlet"].includes(field.key) ? [0, 1] : field.key === "tires" || field.key === "spareTire" ? [1, 2, 3] : [1, 2, 3, 4];
    return [...new Set([current, ...options])];
  };
  const labelFor = (field: ReturnInspectionField, value: number) => {
    if (value === Number(field.item?.value)) return ar ? field.item?.valueAr ?? String(value) : field.item?.valueEn ?? String(value);
    if (field.key === "smokingOdor") return value === 0 ? T("None", "لا توجد", ar) : T("Smoking odor", "توجد رائحة", ar);
    if (["keys", "speedometer", "powerOutlet"].includes(field.key)) return value === 1 ? T("Working", "يعمل", ar) : T("Not working", "لا يعمل", ar);
    if (["safetyTriangle", "firstAidKit", "fireExtinguisher", "spareKey", "spareTireTools"].includes(field.key)) return value === 1 ? T("Available", "موجود", ar) : T("Missing", "غير موجود", ar);
    return ({ 1: T("Excellent", "ممتاز", ar), 2: T("Good", "جيد", ar), 3: T("Weak", "ضعيف", ar), 4: T("Broken", "تالف", ar) } as Record<number, string>)[value] ?? String(value);
  };
  return <>{(["base", "equipment"] as const).map((group, index) => <div key={group} className={index ? "mt-4 border-t border-mk-ink-100 pt-4" : "mt-4"}>
    <div className="mb-2 mk-overline uppercase text-mk-ink-500 mk-tracking-wide">{group === "base" ? T("Mandatory inspection", "الفحص الأساسي", ar) : T("Vehicle equipment", "تجهيزات المركبة", ar)}</div>
    <div className="-mx-3 grid grid-cols-1 gap-2 sm:grid-cols-2">{fields.filter((field) => field.group === group).map((field) => {
      const Icon = HANDOVER_ITEM_ICONS[field.key] ?? Check;
      const deliveryValue = Number(field.item?.atDeliveryValue ?? field.item?.value ?? 0);
      const value = values[field.key] ?? Number(field.item?.value ?? 0);
      const changed = value !== deliveryValue;
      return <div key={field.key} className="flex flex-col gap-2 rounded-md px-3 py-2">
        <div className="flex items-center gap-1.5 mk-caption font-medium" style={{ color: changed ? "var(--color-mk-danger)" : "var(--color-mk-ink-900)" }}><Icon size={14} className="shrink-0 text-mk-ink-500" /><span className="truncate">{ar ? field.labelAr : field.labelEn}</span></div>
        <div className="relative">{changed && <span className="absolute -top-2 start-3 z-10 bg-[var(--bg-elevated)] px-1.5 mk-caption leading-none text-mk-ink-500">{T(`At pickup: ${labelFor(field, deliveryValue)}`, `عند التسليم: ${labelFor(field, deliveryValue)}`, ar)}</span>}<Select size="sm" className="!h-9 !px-3" value={String(value)} disabled={disabled} onChange={(event) => onChange({ ...values, [field.key]: Number(event.target.value) })}>{optionsFor(field).map((option) => <option key={option} value={option}>{labelFor(field, option)}</option>)}</Select></div>
      </div>;
    })}</div>
  </div>)}</>;
}

const INSPECTION_ITEMS = [
  { key: "odometer", icon: Gauge, label: ["Speedometer", "حالة عداد السرعة"] },
  { key: "screen", icon: Monitor, label: ["Screen", "حالة الشاشة الداخلية"] },
  { key: "radio", icon: Music, label: ["Radio/Stereo", "حالة الراديو/المسجل"] },
  { key: "ac", icon: Wind, label: ["A/C", "حالة التكييف"] },
  { key: "spareTire", icon: CircleDot, label: ["Spare tire", "حالة العجلة الاحتياطية"] },
  { key: "tires", icon: CircleDot, label: ["Tires", "حالة العجلات"] },
  { key: "seats", icon: Armchair, label: ["Seats", "المقاعد"] },
  { key: "keys", icon: KeyRound, label: ["Keys", "حالة المفتاح"] },
  { key: "triangle", icon: TriangleAlert, label: ["Warning triangle", "توفر المثلث العاكس"] },
  { key: "extinguisher", icon: FireExtinguisher, label: ["Fire extinguisher", "توفر طفاية الحريق"] },
  { key: "firstAid", icon: HeartPulse, label: ["First aid kit", "حالة حقيبة الاسعافات الأولية"] },
  { key: "tireKit", icon: Wrench, label: ["Tire kit", "معدات الكفر الاحتياطية"] },
] as const;

function VehicleSummaryPanel({ ar, odometer, fuel, endurance, deliveryValues, reasons, onReasonsChange, photos, onPhotosChange }: {
  ar: boolean;
  odometer: number;
  fuel: string;
  endurance: number | null;
  deliveryValues: Record<string, string>;
  reasons: Record<string, string>;
  onReasonsChange: (r: Record<string, string>) => void;
  photos: Record<string, { file: File; preview: string }>;
  onPhotosChange: (p: Record<string, { file: File; preview: string }>) => void;
}) {
  const [noteOpen, setNoteOpen] = useState<Record<string, boolean>>({});
  const damageCount = new Set([
    ...Object.keys(reasons).filter(k => reasons[k]),
    ...Object.keys(photos),
  ]).size;

  function omitKey<T>(obj: Record<string, T>, key: string): Record<string, T> {
    return Object.fromEntries(Object.entries(obj).filter(([k]) => k !== key));
  }

  function toggleNote(key: string) {
    setNoteOpen(o => ({ ...o, [key]: !o[key] }));
  }

  function handleItemPhoto(key: string, file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onPhotosChange({ ...photos, [key]: { file, preview: reader.result as string } });
    reader.readAsDataURL(file);
  }

  const INDICATORS = [
    { icon: Gauge, label: T("Current odometer", "عداد الكيلومتر الحالي", ar), value: `${odometer.toLocaleString()} ${T("km", "كم", ar)}` },
    { icon: Droplet, label: T("Current fuel", "الوقود الحالي", ar), value: fuel },
    { icon: ShieldCheck, label: T("Accident deductible", "مبلغ التحمل للحوادث", ar), value: endurance != null ? `${endurance.toLocaleString()} ${T("SAR", "ريال", ar)}` : "—" },
  ];

  return (
    <div className="rounded-xl p-5 mk-surface">
      <div className="mk-h4 text-mk-ink-900 mb-6">{T("Key Inspection Metrics", "المؤشرات الرئيسية للفحص", ar)}</div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {INDICATORS.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 rounded-lg px-4 py-3 bg-mk-ink-50 select-none">
            <div className="w-9 h-9 rounded-md bg-mk-blue-500/10 text-mk-blue-500 flex items-center justify-center shrink-0">
              <Icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="mk-caption text-mk-ink-500 truncate">{label}</div>
              <div className="mk-label text-mk-ink-900 mt-1 truncate">{value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-mk-ink-100">
        <div className="flex items-center gap-2 mb-4">
          <div className="mk-body text-mk-ink-900 flex-1">{T("Inspection Details & Condition at Return", "تفاصيل الفحص والحالة عند الاستلام", ar)}</div>
          {damageCount > 0 && (
            <span className="mk-overline px-2 py-1 rounded-full text-mk-blue-500" style={{ background: "rgba(65,113,226,0.10)" }}>
              {T(`${damageCount} damage report${damageCount > 1 ? "s" : ""}`, `${damageCount} بلاغ ضرر`, ar)}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {INSPECTION_ITEMS.map(({ key, icon: Icon, label }) => {
            const isOpen = noteOpen[key] ?? false;
            const hasNote = Boolean(reasons[key] || photos[key]);
            const photo = photos[key];
            return (
              <div key={key} className="rounded-lg p-3"
                style={{ background: hasNote ? "rgba(65,113,226,0.05)" : "transparent", border: `1px solid ${hasNote ? "rgba(65,113,226,0.20)" : "var(--color-mk-ink-100)"}` }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-md bg-mk-blue-500/10 text-mk-blue-500 flex items-center justify-center shrink-0">
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="mk-overline text-mk-ink-500 truncate">{T(label[0], label[1], ar)}</div>
                      <div className="mk-caption text-mk-ink-900 mt-1 truncate">{deliveryValues[key] ?? "—"}</div>
                    </div>
                  </div>
                  <button type="button" onClick={() => toggleNote(key)}
                    className="w-7 h-7 rounded-sm flex items-center justify-center border-0 cursor-pointer transition-colors shrink-0"
                    style={{ background: hasNote ? "var(--color-mk-blue-500)" : "var(--color-mk-ink-100)", color: hasNote ? "white" : "var(--color-mk-ink-400)" }}
                    title={T("Report damage", "الإبلاغ عن ضرر", ar)}>
                    <AlertTriangle size={14} />
                  </button>
                </div>
                {isOpen && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      value={reasons[key] ?? ""}
                      onChange={e => onReasonsChange({ ...reasons, [key]: e.target.value })}
                      placeholder={T("Describe the damage…", "صف الضرر…", ar)}
                      className="flex-1 min-w-0 px-3 py-2 rounded-md mk-overline text-mk-ink-900 border border-mk-blue-500/30 bg-white outline-none focus:border-mk-blue-500"
                    />
                    {photo ? (
                      <div className="relative shrink-0">
                        <img src={photo.preview} alt="" className="w-8 h-8 rounded-md object-cover border border-mk-blue-500/30" />
                        <button type="button" onClick={() => onPhotosChange(omitKey(photos, key))}
                          className="absolute -top-2 -end-1.5 w-4 h-4 rounded-full flex items-center justify-center border-0 cursor-pointer text-white bg-mk-danger">
                          <X size={9} />
                        </button>
                      </div>
                    ) : (
                      <label className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 cursor-pointer border border-mk-blue-500/30 bg-white text-mk-blue-500">
                        <Camera size={14} />
                        <input type="file" accept="image/*" className="hidden" onChange={e => handleItemPhoto(key, e.target.files?.[0])} />
                      </label>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Detail / return process view ──────────────────────────────────
function ReturnDetailView({ id, ar, basePath }: { id: string; ar: boolean; basePath: string }) {
  const router = useRouter();
  const [showMap, setShowMap] = useState(false);
  const [sketchItems, setSketchItems] = useState<SketchItem[]>([]);
  // Vehicle's registered damage points — shown read-only on the diagram so new
  // return marks can be compared against the same sketch as the vehicle detail.
  const [baselineSketch, setBaselineSketch] = useState<SketchItem[]>([]);
  const [returnOdometer, setReturnOdometer] = useState("");
  const [fuel, setFuel] = useState<Types.FuelLevel | "">("");
  const [manualLateFee, setManualLateFee] = useState("");
  const [extraKmCharge, setExtraKmCharge] = useState("");
  const [fuelDiffCharge, setFuelDiffCharge] = useState("");
  const [damageCharge, setDamageCharge] = useState("");
  const [damageNotes, setDamageNotes] = useState("");
  const [returnPhotos, setReturnPhotos] = useState<Record<string, PhotoSlotValue>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [suggestion, setSuggestion] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [customerPresent, setCustomerPresent] = useState(false);
  const [customerConfirms, setCustomerConfirms] = useState(false);
  const [walkDone, setWalkDone] = useState(false);
  const [fleetStatus, setFleetStatus] = useState<Types.VehicleFleetStatus | "">("");
  const [inspectionValues, setInspectionValues] = useState<Record<string, number>>({});
  const [submitError, setSubmitError] = useState("");
  const [showDispute, setShowDispute] = useState(false);
  const [disputeNotes, setDisputeNotes] = useState("");
  const [disputing, setDisputing] = useState(false);
  const [disputeError, setDisputeError] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [raw, setRaw] = useState<any>(null);
  const [returnForm, setReturnForm] = useState<Types.ReturnFormResponse | null>(null);
  const [row, setRow] = useState<ReturnRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [contractResult, formResult, recordResult] = await Promise.all([
          contractService.getById(id),
          contractService.getReturnForm(id),
          contractService.getReturn(id).catch(() => null),
        ]);
        const c = contractResult?.data ?? contractResult;
        const form: Types.ReturnFormResponse = formResult;
        const record = (recordResult?.data ?? recordResult ?? form.return) as Types.ReturnRecordResponse | null;
        if (cancelled) return;
        if (!c || c.id == null || !form?.contractId) { setNotFound(true); return; }
        const vehicle = form.vehicle;
        const customer = form.customer;
        const merged = {
          ...c,
          contractNumber: form.contractNumber ?? c.contractNumber,
          customerNameAr: customer?.nameAr ?? c.customerNameAr,
          customerNameEn: customer?.nameEn ?? c.customerNameEn,
          customerPhone: customer?.phone ?? c.customerPhone,
          customerVerificationStatus: customer?.verificationStatus ?? c.customerVerificationStatus,
          vehicleId: vehicle?.id ?? c.vehicleId,
          vehiclePlateNumber: vehicle?.plateNumber ?? c.vehiclePlateNumber,
          vehicleMakeNameAr: vehicle?.makeNameAr ?? c.vehicleMakeNameAr,
          vehicleMakeNameEn: vehicle?.makeNameEn ?? c.vehicleMakeNameEn,
          vehicleModelNameAr: vehicle?.modelNameAr ?? c.vehicleModelNameAr,
          vehicleModelNameEn: vehicle?.modelNameEn ?? c.vehicleModelNameEn,
          vehicleYear: vehicle?.year ?? c.vehicleYear,
          workingBranchNameAr: form.branchNameAr ?? c.workingBranchNameAr,
          workingBranchNameEn: form.branchNameEn ?? c.workingBranchNameEn,
          endAt: form.scheduledReturnAt ?? c.endAt,
          totalAmount: form.invoice?.totalAmount ?? c.totalAmount,
        };
        setRaw(merged);
        setReturnForm(form);
        setSubmitted(Boolean(record));
        setFleetStatus(record?.fleetStatusAfterReturn ?? form.suggestedFleetStatus ?? "");
        const inspectionSource = record ?? form;
        setInspectionValues(Object.fromEntries([...Object.entries(inspectionSource.basicInspection ?? {}), ...Object.entries(inspectionSource.vehicleEquipment ?? {})].map(([key, item]) => [key, Number(item?.value ?? 0)])));
        if (record) {
          setReturnOdometer(record.odometerAtReturn != null ? String(record.odometerAtReturn) : "");
          setFuel(record.fuelLevelAtReturn ?? "");
          setDamageNotes(record.conditionNotes ?? "");
          setCustomerPresent(Boolean(record.checklist?.customerPresentAtCounter));
          setCustomerConfirms(Boolean(record.checklist?.customerConfirmedReturn));
          setWalkDone(Boolean(record.checklist?.walkAroundCompleted));
          setReturnPhotos(Object.fromEntries((record.photos ?? []).map((photo) => [photo.label ?? String(photo.attachmentId), { preview: `/api/attachments/${photo.attachmentId}/download` }])));
        }
        setRow(mapReturnRow(merged, ar));
        setBaselineSketch((record?.sketchInfoAtReturn ?? form.sketchInfoAtReturn ?? form.sketchInfoAtDelivery ?? []).map((mark: Types.HandoverSketchPoint) => ({
          type: mark.type as SketchItem["type"],
          x: Number(mark.x ?? 0),
          y: Number(mark.y ?? 0),
          note: mark.note ?? undefined,
        })));
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, ar]);

  const odometerNum = parseFloat(returnOdometer);
  const odometerEntered = returnOdometer.trim() !== "" && !isNaN(odometerNum);
  const fuelValid = fuel !== "";

  // Suggested charges from the backend once odometer + fuel are known.
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      const calculationFuel = fuel !== "" ? fuel : returnForm?.fuelLevelAtDelivery;
      if (submitted || !odometerEntered || calculationFuel == null) { setSuggestion(null); return; }
      contractService.calculateReturnCharges(id, {
        odometerAtReturn: odometerNum,
        fuelLevelAtReturn: calculationFuel as Types.FuelLevel,
        actualReturnAt: new Date().toISOString(),
      })
        .then((s) => { if (!cancelled) setSuggestion(s?.data ?? s); })
        .catch(() => { if (!cancelled) setSuggestion(null); });
    }, 500);
    return () => { cancelled = true; clearTimeout(t); };
  }, [id, odometerEntered, odometerNum, fuel, submitted, returnForm?.fuelLevelAtDelivery]);

  if (loading) return (
    <div className="py-24 text-center">
      <div className="mk-body mb-1 text-mk-ink-500">{T("Loading contract…", "جارٍ تحميل العقد…", ar)}</div>
    </div>
  );

  if (notFound || !row || !raw || !returnForm) return (
    <div className="py-24 text-center">
      <div className="mk-display mb-3">📋</div>
      <div className="mk-body mb-2 text-mk-ink-900">{T("Contract not found", "العقد غير موجود", ar)}</div>
      <Link href={basePath} className="mk-body-sm text-mk-blue-500 no-underline">{T("← Back", "→ العودة", ar)}</Link>
    </div>
  );

  const contract = toBooking(raw, ar, row);
  // Payment snapshot — contract rows carry a nested payment object
  // { paid, remaining, deposit, type/method codes }. For ADVANCE contracts
  // the customer still owes `remaining` at handback — surface it loudly.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paymentInfo: any = raw?.payment ?? {};
  const invoice = returnForm.invoice ?? {};
  const paidAmountNum = Number(invoice.paidAmount ?? paymentInfo.paidAmount ?? paymentInfo.paid ?? raw.paidAmount ?? contract.amount);
  const outstandingBalance = Math.max(0, Number(invoice.remainingAmount ?? paymentInfo.remainingAmount ?? paymentInfo.remaining ?? raw.remainingAmount ?? (contract.amount - paidAmountNum)) || 0);
  const returnPhotoSlots = returnForm.photoSlots ?? [];
  const carImages = Array.from(new Map(
    (returnPhotoSlots.some((slot) => slot.fileId) ? returnPhotoSlots : returnForm.images ?? [])
      .filter((image) => image.fileId)
      .map((image) => [Number(image.fileId), `/api/attachments/${image.fileId}/download`]),
  ).values());
  const conditionPhotos = returnPhotoSlots
    .filter((slot) => slot.fileId)
    .map((slot) => ({ src: `/api/attachments/${slot.fileId}/download`, label: ar ? slot.labelAr ?? slot.label : slot.labelEn ?? slot.label }));
  const isLate = returnForm.isLate ?? row.status === "late";

  const days = Math.max(1, Math.round((new Date(raw.endAt).getTime() - new Date(raw.startAt).getTime()) / 86400000)) || 1;
  const pickupOdometer = Number(returnForm.odometerAtDelivery ?? 0);
  const pickupFuel: Types.FuelLevel | null = returnForm.fuelLevelAtDelivery != null ? Number(returnForm.fuelLevelAtDelivery) as Types.FuelLevel : null;
  const deliveryValue = (item?: Types.HandoverInspectionDisplayItem) => {
    const localized = (ar ? item?.valueAr : item?.valueEn) ?? item?.value ?? "—";
    return String(item?.atDeliveryValue == null || String(item.atDeliveryValue) === String(item.value) ? localized : item.atDeliveryValue);
  };
  const deliveryValues = {
    odometer: deliveryValue(returnForm.basicInspection?.speedometer),
    screen: deliveryValue(returnForm.vehicleEquipment?.screen),
    radio: deliveryValue(returnForm.vehicleEquipment?.radioStereo),
    ac: deliveryValue(returnForm.vehicleEquipment?.ac),
    spareTire: deliveryValue(returnForm.vehicleEquipment?.spareTire),
    tires: deliveryValue(returnForm.basicInspection?.tires),
    seats: deliveryValue(returnForm.vehicleEquipment?.carSeats),
    keys: deliveryValue(returnForm.basicInspection?.keys),
    triangle: deliveryValue(returnForm.basicInspection?.safetyTriangle),
    extinguisher: deliveryValue(returnForm.basicInspection?.fireExtinguisher),
    firstAid: deliveryValue(returnForm.basicInspection?.firstAidKit),
    tireKit: deliveryValue(returnForm.vehicleEquipment?.spareTireTools),
  };
  const inspectionFields: ReturnInspectionField[] = [
    { key: "tires", group: "base", labelEn: "Tire condition", labelAr: "حالة الإطارات", item: returnForm.basicInspection?.tires },
    { key: "windshield", group: "base", labelEn: "Windshield condition", labelAr: "حالة الزجاج الأمامي", item: returnForm.basicInspection?.windshield },
    { key: "keys", group: "base", labelEn: "Keys", labelAr: "المفاتيح", item: returnForm.basicInspection?.keys },
    { key: "safetyTriangle", group: "base", labelEn: "Warning triangle", labelAr: "مثلث التحذير", item: returnForm.basicInspection?.safetyTriangle },
    { key: "firstAidKit", group: "base", labelEn: "First aid kit", labelAr: "حقيبة الإسعافات الأولية", item: returnForm.basicInspection?.firstAidKit },
    { key: "fireExtinguisher", group: "base", labelEn: "Fire extinguisher", labelAr: "طفاية الحريق", item: returnForm.basicInspection?.fireExtinguisher },
    { key: "speedometer", group: "base", labelEn: "Speedometer condition", labelAr: "حالة عداد السرعة", item: returnForm.basicInspection?.speedometer },
    { key: "spareKey", group: "equipment", labelEn: "Spare key", labelAr: "المفتاح الاحتياطي", item: returnForm.vehicleEquipment?.spareKey },
    { key: "spareTire", group: "equipment", labelEn: "Spare tire", labelAr: "الإطار الاحتياطي", item: returnForm.vehicleEquipment?.spareTire },
    { key: "spareTireTools", group: "equipment", labelEn: "Basic vehicle tools", labelAr: "أدوات السيارة الأساسية", item: returnForm.vehicleEquipment?.spareTireTools },
    { key: "carSeats", group: "equipment", labelEn: "Seat condition", labelAr: "حالة المقاعد", item: returnForm.vehicleEquipment?.carSeats },
    { key: "ac", group: "equipment", labelEn: "A/C", labelAr: "التكييف", item: returnForm.vehicleEquipment?.ac },
    { key: "screen", group: "equipment", labelEn: "Screen", labelAr: "الشاشة", item: returnForm.vehicleEquipment?.screen },
    { key: "radioStereo", group: "equipment", labelEn: "Audio system / radio", labelAr: "النظام الصوتي / الراديو", item: returnForm.vehicleEquipment?.radioStereo },
    { key: "powerOutlet", group: "equipment", labelEn: "Power outlet", labelAr: "منفذ الطاقة", item: returnForm.vehicleEquipment?.powerOutlet },
    { key: "smokingOdor", group: "equipment", labelEn: "Smoking odor inside vehicle", labelAr: "رائحة تدخين داخل المركبة", item: returnForm.vehicleEquipment?.smokingOdor },
  ];
  const tripKm = odometerEntered ? Math.max(0, odometerNum - pickupOdometer) : null;
  const kmCapNum = raw.unlimitedKm ? null : ((Number(raw.allowedKmPerDay ?? 0) * days) || null);
  const locallyOverKm = tripKm != null && kmCapNum != null && tripKm > kmCapNum;
  const suggestedExtraKm = Number(suggestion?.extraKm ?? 0);
  const extraKmCount = locallyOverKm && tripKm != null && kmCapNum != null ? tripKm - kmCapNum : suggestedExtraKm;
  const isOverKm = locallyOverKm || suggestedExtraKm > 0 || Number(suggestion?.extraKmAmount ?? 0) > 0;

  const noDamage = sketchItems.length === 0;
  const damageCount = inspectionFields.filter((field) => (inspectionValues[field.key] ?? Number(field.item?.value ?? 0)) !== Number(field.item?.atDeliveryValue ?? field.item?.value ?? 0)).length;

  // Suggested amounts from /return/calculate-charges; manual inputs override.
  const lateFeeNum = manualLateFee !== "" ? (parseFloat(manualLateFee) || 0) : Number(suggestion?.lateFeeAmount ?? 0);
  const extraKmNum = extraKmCharge !== "" ? (parseFloat(extraKmCharge) || 0) : Number(suggestion?.extraKmAmount ?? 0);
  const fuelDiffNum = fuelDiffCharge !== "" ? (parseFloat(fuelDiffCharge) || 0) : Number(suggestion?.fuelDifferenceAmount ?? 0);
  const damageNum = damageCharge !== "" ? (parseFloat(damageCharge) || 0) : Number(suggestion?.damageAmount ?? 0);
  const lateHoursNum = Number(suggestion?.lateHours ?? 0);
  const extraCharges = lateFeeNum + extraKmNum + fuelDiffNum + damageNum;
  const finalTotal = contract.amount + extraCharges;

  const requiredReturnPhotos = Math.min(6, returnPhotoSlots.length);
  const canConfirm = customerPresent && customerConfirms && walkDone && odometerEntered && fuelValid && Object.keys(returnPhotos).length >= requiredReturnPhotos && returnForm.canReturn !== false && !submitting && !submitted;

  const handleConfirm = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      const uploadedPhotos = await Promise.all(Object.entries(returnPhotos).map(async ([label, photo]) => {
        if (!photo.file) throw new Error(T("A return photo must be selected again", "يجب إعادة اختيار إحدى صور الاستلام", ar));
        const uploaded = await attachmentService.upload(photo.file);
        const attachmentId = Number(uploaded?.id ?? uploaded?.data?.id ?? uploaded?.attachmentId ?? uploaded?.data?.fileId ?? uploaded?.fileId);
        if (!attachmentId) throw new Error(T("A return photo could not be uploaded", "تعذر رفع إحدى صور الاستلام", ar));
        return { label, attachmentId };
      }));
      const attachmentByLabel = Object.fromEntries(uploadedPhotos.map((photo) => [photo.label, photo.attachmentId]));
      const baselineValue = (item?: Types.HandoverInspectionDisplayItem) => Number(item?.atDeliveryValue ?? item?.value ?? 0);
      const inspectionItem = (key: string, item?: Types.HandoverInspectionDisplayItem, attachmentId?: number, value?: number): Types.DeliveryInspectionItem => {
        const selectedValue = value ?? inspectionValues[key] ?? Number(item?.value ?? 0);
        return { isOk: selectedValue === baselineValue(item), note: null, ...(attachmentId ? { attachmentId } : {}), value: selectedValue };
      };
      const basicInspection: Types.DeliveryBasicInspection = {
        odometerReading: inspectionItem("odometerReading", returnForm.basicInspection?.odometerReading, attachmentByLabel.odometerFuel, odometerNum),
        fuelLevel: inspectionItem("fuelLevel", returnForm.basicInspection?.fuelLevel, attachmentByLabel.odometerFuel, fuel as Types.FuelLevel),
        tires: inspectionItem("tires", returnForm.basicInspection?.tires),
        windshield: inspectionItem("windshield", returnForm.basicInspection?.windshield),
        bodyDamage: inspectionItem("bodyDamage", returnForm.basicInspection?.bodyDamage, undefined, baselineSketch.length + sketchItems.length),
        keys: inspectionItem("keys", returnForm.basicInspection?.keys),
        safetyTriangle: inspectionItem("safetyTriangle", returnForm.basicInspection?.safetyTriangle, attachmentByLabel.safetyKit),
        firstAidKit: inspectionItem("firstAidKit", returnForm.basicInspection?.firstAidKit, attachmentByLabel.safetyKit),
        fireExtinguisher: inspectionItem("fireExtinguisher", returnForm.basicInspection?.fireExtinguisher, attachmentByLabel.safetyKit),
        speedometer: inspectionItem("speedometer", returnForm.basicInspection?.speedometer),
      };
      const vehicleEquipment: Types.DeliveryVehicleEquipment = {
        spareKey: inspectionItem("spareKey", returnForm.vehicleEquipment?.spareKey),
        spareTire: inspectionItem("spareTire", returnForm.vehicleEquipment?.spareTire, attachmentByLabel.spareTireTools),
        spareTireTools: inspectionItem("spareTireTools", returnForm.vehicleEquipment?.spareTireTools, attachmentByLabel.spareTireTools),
        carSeats: inspectionItem("carSeats", returnForm.vehicleEquipment?.carSeats, attachmentByLabel.interior),
        ac: inspectionItem("ac", returnForm.vehicleEquipment?.ac),
        screen: inspectionItem("screen", returnForm.vehicleEquipment?.screen),
        radioStereo: inspectionItem("radioStereo", returnForm.vehicleEquipment?.radioStereo),
        powerOutlet: inspectionItem("powerOutlet", returnForm.vehicleEquipment?.powerOutlet),
        smokingOdor: inspectionItem("smokingOdor", returnForm.vehicleEquipment?.smokingOdor, attachmentByLabel.interior),
      };

      const finalSketch = [...baselineSketch, ...sketchItems];
      await contractService.recordReturn(id, {
        odometerAtReturn: odometerNum,
        fuelLevelAtReturn: fuel as Types.FuelLevel,
        sketchInfoAtReturn: finalSketch.map((mark) => ({ type: mark.type, x: mark.x, y: mark.y, note: mark.note ?? null })),
        basicInspection,
        vehicleEquipment,
        conditionNotes: damageNotes.trim() || null,
        lateFeeAmount: lateFeeNum,
        lateHours: lateHoursNum || undefined,
        extraKmAmount: extraKmNum,
        extraKm: extraKmCount || undefined,
        fuelDifferenceAmount: fuelDiffNum,
        damageAmount: damageNum,
        checklist: {
          customerPresentAtCounter: customerPresent,
          odometerRecorded: odometerEntered,
          fuelLevelChecked: fuelValid,
          walkAroundCompleted: walkDone,
          customerConfirmedReturn: customerConfirms,
        },
        photos: uploadedPhotos,
        fleetStatusAfterReturn: fleetStatus === "" ? returnForm.suggestedFleetStatus ?? undefined : fleetStatus,
      });
      const vehicleId = returnForm.vehicle?.id;
      if (vehicleId) {
        try {
          const vehicleResult = await vehicleService.getById(vehicleId);
          const vehicleData = vehicleResult?.data ?? vehicleResult;
          const fleetSketch = mapDamagePointsToSketchItems(vehicleData?.damagePoints);
          const signature = (items: SketchItem[]) => items.map((mark) => `${mark.type}:${Math.round(mark.x * 10) / 10}:${Math.round(mark.y * 10) / 10}:${mark.note ?? ""}`).sort().join("|");
          if (signature(fleetSketch) !== signature(finalSketch)) {
            const vehicleForm = mapVehicleToForm(vehicleData);
            vehicleForm.sketchItems = finalSketch;
            const imageFileIds = extractVehicleImageFileIds(vehicleData);
            await vehicleService.update(vehicleId, buildVehiclePayload(vehicleForm, imageFileIds));
          }
        } catch {
          setSubmitError(T("The return was saved, but the Fleet sketch could not be synchronized.", "تم حفظ الإرجاع، ولكن تعذر مزامنة مخطط الأضرار مع الأسطول.", ar));
        }
      }
      setSubmitted(true);
      setShowSuccess(true);
      contractService.getReturn(id).catch(() => null);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispute = async () => {
    if (!disputeNotes.trim()) return;
    setDisputing(true);
    setDisputeError("");
    try {
      await contractService.dispute(id, { notes: disputeNotes.trim() });
      router.push(basePath);
    } catch (err) {
      setDisputeError(err instanceof Error ? err.message : "Unexpected error");
      setDisputing(false);
    }
  };

    return (
      <div className="flex flex-col gap-4">
        <SuccessDialog
          open={showSuccess}
          onClose={() => setShowSuccess(false)}
          tone={sketchItems.length || damageCount ? "violet" : "mint"}
          title={sketchItems.length || damageCount ? T("Return recorded — sent for review", "تم تسجيل الإرجاع وإحالته للمراجعة", ar) : T("Vehicle returned successfully!", "تم استلام المركبة بنجاح!", ar)}
          subtitle={<span className="font-mono">{contract.id}</span>}
          description={sketchItems.length || damageCount ? T("Differences were found. The office will review them before the financial close.", "رُصدت اختلافات، سيراجعها المكتب قبل الإقفال المالي.", ar) : T("No differences found. The contract is closed and the vehicle is back in the fleet.", "لا اختلافات. تم إقفال العقد وعادت المركبة للأسطول.", ar)}
          details={[
            { label: T("Customer", "العميل", ar), value: contract.customer },
            { label: T("Vehicle", "المركبة", ar), value: `${contract.car} · ${contract.plate}` },
            { label: T("Trip distance", "المسافة المقطوعة", ar), value: `${(tripKm ?? 0).toLocaleString()} ${T("km", "كم", ar)}` },
            { label: T("Next vehicle status", "حالة المركبة التالية", ar), value: String(returnForm.suggestedFleetStatus ?? "—") },
          ]}
          actions={<>
            <Link href={basePath} className="no-underline"><Button variant="primary">{T("Back to Active Rentals", "العودة للمركبات المؤجرة", ar)}</Button></Link>
            <Button variant="outline" onClick={() => setShowSuccess(false)}>{T("Stay here", "البقاء هنا", ar)}</Button>
          </>}
        />
        <div className="flex items-center gap-3">
          <Link href={basePath} className="w-9 h-9 rounded-full flex items-center justify-center bg-white shadow-[var(--shadow-card)] text-mk-ink-600 no-underline hover:bg-mk-ink-50 transition-colors">
            {ar ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </Link>
          <span className="mk-body-sm text-mk-ink-500 flex-1">{T("Back to Active Rentals", "العودة للمركبات المؤجرة", ar)}</span>
          <Button variant="primary" size="sm" disabled={!canConfirm} onClick={handleConfirm}>
            <Check size={16} />{submitting ? T("Processing…", "جارٍ المعالجة…", ar) : submitted ? T("Return confirmed", "تم تأكيد الإرجاع", ar) : sketchItems.length || damageCount ? T("Submit for office review", "إحالة للمكتب للمراجعة", ar) : T("Complete return & close contract", "إتمام الإرجاع وإغلاق العقد", ar)}
          </Button>
        </div>

        {(returnForm.blockers?.length ?? 0) > 0 && (
          <div className="rounded-xl border border-mk-danger/20 bg-mk-danger/5 px-5 py-4 text-mk-danger">
            <div className="mk-label">{T("Return is currently blocked", "لا يمكن إتمام الإرجاع حالياً", ar)}</div>
            <ul className="mt-2 list-disc ps-5 mk-caption">{returnForm.blockers!.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Inspection checklist */}
          <div className="rounded-xl p-5 mk-surface">
            <div className="flex items-center gap-3 mb-6">
              <div className="mk-h4 flex-1 text-mk-ink-900">{T(`Return · ${contract.id}`, `استلام إرجاع · ${contract.id}`, ar)}</div>
              <Badge variant={isLate ? "danger" : "success"} dot>{isLate ? T("Overdue", "متأخر", ar) : T("On time", "في الوقت", ar)}</Badge>
            </div>

            {outstandingBalance > 0 && (
              <div className="flex items-center gap-3 rounded-xl px-5 py-4 mb-4" style={{ border: "1px solid rgba(245,158,11,0.25)", background: "rgba(245,158,11,0.08)" }}>
                <div className="w-10 h-10 rounded-md flex items-center justify-center shrink-0" style={{ background: "rgba(245,158,11,0.12)", color: "#B45309" }}>
                  <AlertTriangle size={18} />
                </div>
                <div className="flex-1">
                  <div className="mk-h4 text-mk-ink-900">{T("Balance still owed by the customer", "رصيد متبقٍ على العميل", ar)}</div>
                  <div className="mk-caption mt-1 text-mk-ink-600">
                    {T(
                      `Advance payment — paid ${paidAmountNum.toLocaleString()} of ${contract.amount.toLocaleString()} SAR. Collect ${outstandingBalance.toLocaleString()} SAR now.`,
                      `دفع مقدم — دُفع ${paidAmountNum.toLocaleString()} من ${contract.amount.toLocaleString()} ريال. تحصّل ${outstandingBalance.toLocaleString()} ريال الآن.`,
                      ar
                    )}
                  </div>
                </div>
              </div>
            )}

            {isLate && (
              <div className="flex items-center gap-3 rounded-xl px-5 py-4 mb-4" style={{ border: "1px solid rgba(226,65,113,0.20)", background: "rgba(226,65,113,0.08)" }}>
                <div className="w-10 h-10 rounded-md flex items-center justify-center shrink-0 text-mk-danger" style={{ background: "rgba(226,65,113,0.10)" }}>
                  <AlertTriangle size={18} />
                </div>
                <div className="flex-1">
                  <div className="mk-h4 text-mk-ink-900">{T("Late return penalty in effect", "غرامة التأخر مفعّلة", ar)}</div>
                  <div className="mk-caption mt-1 text-mk-ink-600">{suggestion != null ? T(`${lateHoursNum}h late · +${lateFeeNum} SAR suggested`, `تأخر ${lateHoursNum} س · +${lateFeeNum} ريال مقترح`, ar) : T("Enter odometer + fuel to calculate the penalty", "أدخل العداد والوقود لحساب الغرامة", ar)}</div>
                </div>
              </div>
            )}

            {/* Customer */}
            <div className="flex items-center gap-3 py-3 border-b border-mk-ink-100">
              <Avatar name={contract.customer} size="lg" />
              <div className="flex-1">
                <div className="mk-body text-mk-ink-900">{contract.customer}</div>
                <div className="mk-caption text-mk-ink-500">{contract.phone} · {contract.kyc === "verified" ? T("KYC Verified", "الهوية موثقة", ar) : T("KYC Pending", "الهوية معلقة", ar)}</div>
              </div>
              <a href={`tel:${contract.phone}`} className="w-9 h-9 rounded-full flex items-center justify-center bg-white border border-mk-ink-200 text-mk-ink-600 hover:bg-mk-ink-100 transition-colors"><Phone size={14} /></a>
            </div>

            {/* Car */}
            <div className="flex items-center gap-3 py-3 border-b border-mk-ink-100">
              <div className="w-16 h-11 rounded-md overflow-hidden shrink-0 bg-mk-ink-50">
                {carImages[0] ? <img src={carImages[0]} alt={contract.car} className="w-full h-full object-cover" /> : <Camera size={16} className="m-auto h-full text-mk-ink-400" />}
              </div>
              <div className="flex-1">
                <div className="mk-body text-mk-ink-900">{contract.car}</div>
                <div className="mk-caption text-mk-ink-500">{contract.plate} · {contract.branch}</div>
                <div className="mt-1.5"><PlaceBadge place={{ kind: "branch", name: contract.branch }} ar={ar} /></div>
              </div>
              <IconButton size="md" onClick={() => setShowMap(true)} className="border border-mk-ink-200 text-mk-blue-600 hover:bg-mk-blue-50" title={T("Track on map", "تتبع على الخريطة", ar)}>
                <MapPin size={14} />
              </IconButton>
            </div>

            {/* Inspection steps */}
            <div className="mk-overline uppercase mt-4 mb-2 text-mk-ink-500 mk-tracking-wide">{T("Return inspection", "معاينة الإرجاع", ar)}</div>

            <button type="button" disabled={submitted} onClick={() => setCustomerPresent((value) => !value)} className="flex w-full items-center gap-3 px-4 py-3 rounded-md mb-2 border-0 bg-transparent text-start hover:bg-mk-ink-50 disabled:cursor-default">
              <Checkbox readOnly checked={customerPresent} disabled={submitted} />
              <UserCheck size={16} className="text-mk-ink-500 shrink-0" />
              <span className="mk-body-sm text-mk-ink-900">{T("Customer present at counter", "العميل حاضر في الكاونتر", ar)}</span>
            </button>

            {/* Odometer reading — required entry */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-md mb-2"
              style={{ background: odometerEntered ? "rgba(63,182,172,0.08)" : "transparent", border: odometerEntered ? "1px solid rgba(63,182,172,0.30)" : "none" }}>
              <div className="w-6 h-6 rounded-sm flex items-center justify-center shrink-0 text-white"
                style={{ background: odometerEntered ? "var(--color-mk-mint-600)" : "var(--color-mk-bg)", border: odometerEntered ? "none" : "1px solid var(--color-mk-border)" }}>
                {odometerEntered && <Check size={14} />}
              </div>
              <Gauge size={16} className="text-mk-ink-500 shrink-0" />
              <div className="flex-1 flex items-center gap-2 flex-wrap">
                <span className="mk-body-sm shrink-0" style={{ color: odometerEntered ? "var(--color-mk-ink-500)" : "var(--color-mk-ink-900)" }}>{T("Odometer reading at return", "قراءة العداد عند الإرجاع", ar)}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  required
                  value={returnOdometer}
                  disabled={submitted}
                  onChange={e => setReturnOdometer(e.target.value)}
                  placeholder={T("km", "كم", ar)}
                  className="w-[100px] px-2 py-1 rounded-md mk-body-sm text-mk-ink-900 border border-mk-ink-200 bg-white outline-none focus:border-mk-blue-500"
                />
                {odometerEntered && tripKm != null && (
                  <span className="mk-caption" style={{ color: isOverKm ? "var(--color-mk-danger)" : "var(--color-mk-ink-500)" }}>
                    {T(`+${tripKm.toLocaleString()} km this trip`, `+${tripKm.toLocaleString()} كم هذه الرحلة`, ar)}
                    {isOverKm && extraKmCount > 0 && T(` · ${extraKmCount.toLocaleString()} km over the allowed limit`, ` · تجاوز الحد المسموح بمقدار ${extraKmCount.toLocaleString()} كم`, ar)}
                  </span>
                )}
              </div>
            </div>

            {isOverKm && extraKmCount > 0 && (
              <div className="mb-2 flex items-start gap-3 rounded-lg border border-mk-danger/25 bg-mk-danger/8 px-4 py-3 text-mk-danger">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <div>
                  <div className="mk-label">{T("Allowed mileage exceeded", "تم تجاوز الكيلومترات المسموح بها", ar)}</div>
                  <div className="mt-1 mk-caption">{T(`The customer exceeded the contract allowance by ${extraKmCount.toLocaleString()} km.`, `تجاوز العميل الحد المسموح في العقد بمقدار ${extraKmCount.toLocaleString()} كم.`, ar)}</div>
                </div>
              </div>
            )}

            {/* Fuel level at return — required entry */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-md mb-2"
              style={{ background: fuelValid ? "rgba(63,182,172,0.08)" : "transparent", border: fuelValid ? "1px solid rgba(63,182,172,0.30)" : "none" }}>
              <div className="w-6 h-6 rounded-sm flex items-center justify-center shrink-0 text-white"
                style={{ background: fuelValid ? "var(--color-mk-mint-600)" : "var(--color-mk-bg)", border: fuelValid ? "none" : "1px solid var(--color-mk-border)" }}>
                {fuelValid && <Check size={14} />}
              </div>
              <Fuel size={16} className="text-mk-ink-500 shrink-0" />
              <div className="flex-1 flex items-center gap-2 flex-wrap">
                <span className="mk-body-sm shrink-0" style={{ color: fuelValid ? "var(--color-mk-ink-500)" : "var(--color-mk-ink-900)" }}>{T("Fuel level at return", "مستوى الوقود عند الإرجاع", ar)}</span>
                <Select
                  value={fuel === "" ? "" : String(fuel)}
                  disabled={submitted}
                  onChange={e => setFuel(e.target.value === "" ? "" : (Number(e.target.value) as Types.FuelLevel))}
                  className="w-[130px] py-1 mk-body-sm"
                >
                  <option value="">{T("Select…", "اختر…", ar)}</option>
                  {FUEL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{ar ? o.ar : o.en}</option>
                  ))}
                </Select>
                {pickupFuel != null && (
                  <span className="mk-caption text-mk-ink-500">{T(`pickup: ${fuelLabel(pickupFuel, ar)}`, `عند التسليم: ${fuelLabel(pickupFuel, ar)}`, ar)}</span>
                )}
              </div>
            </div>

            {/* Walk-around damage — reflects the condition diagram */}
            <button type="button" disabled={submitted} onClick={() => setWalkDone((value) => !value)} className="flex w-full items-center gap-3 px-4 py-3 rounded-md mb-2 border-0 bg-transparent text-start hover:bg-mk-ink-50 disabled:cursor-default">
              <Checkbox readOnly checked={walkDone} disabled={submitted} />
              <Camera size={16} className="text-mk-ink-500 shrink-0" />
              <span className={`mk-body-sm ${noDamage ? "text-mk-ink-900" : "text-mk-danger"}`}>
                {noDamage
                  ? T("Walk-around · no new damage", "معاينة محيطية · لا أضرار جديدة", ar)
                  : T(`Walk-around · ${sketchItems.length} damage mark(s) on diagram`, `معاينة محيطية · ${sketchItems.length} علامة ضرر في المخطط`, ar)}
              </span>
            </button>

            <button type="button" disabled={submitted} onClick={() => setCustomerConfirms((value) => !value)} className="flex w-full items-center gap-3 px-4 py-3 rounded-md mb-2 border-0 bg-transparent text-start hover:bg-mk-ink-50 disabled:cursor-default">
              <Checkbox readOnly checked={customerConfirms} disabled={submitted} />
              <Smartphone size={16} className="text-mk-ink-500 shrink-0" />
              <span className="mk-body-sm text-mk-ink-900">{T("Customer confirms return on screen", "العميل يؤكد وقت الإرجاع", ar)}</span>
            </button>

            <ReturnInspectionSelects ar={ar} fields={inspectionFields} values={inspectionValues} onChange={setInspectionValues} disabled={submitted} />

            {/* Extra charges — suggested by the backend, editable on receipt */}
            {(suggestion != null || isLate || isOverKm) && (
              <div className="flex flex-col gap-3 py-3">
                {(isLate || Number(suggestion?.lateFeeAmount ?? 0) > 0) && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="mk-body-sm text-mk-ink-900 shrink-0">{T("Late fee amount", "مبلغ غرامة التأخر", ar)}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={manualLateFee}
                      onChange={e => setManualLateFee(e.target.value)}
                      placeholder={String(Number(suggestion?.lateFeeAmount ?? 0))}
                      className="w-[100px] px-2 py-1 rounded-md mk-body-sm text-mk-danger border border-mk-ink-200 bg-white outline-none focus:border-mk-blue-500"
                    />
                    <span className="mk-caption text-mk-ink-500">{T("SAR", "ر.س", ar)}{lateHoursNum > 0 && T(` · ${lateHoursNum}h late`, ` · تأخر ${lateHoursNum} س`, ar)}</span>
                  </div>
                )}
                {(isOverKm || Number(suggestion?.extraKmAmount ?? 0) > 0) && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="mk-body-sm text-mk-ink-900 shrink-0">{T("Extra km charge", "رسوم الكيلومترات الزائدة", ar)}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={extraKmCharge}
                      onChange={e => setExtraKmCharge(e.target.value)}
                      placeholder={String(Number(suggestion?.extraKmAmount ?? 0))}
                      className="w-[100px] px-2 py-1 rounded-md mk-body-sm text-mk-danger border border-mk-ink-200 bg-white outline-none focus:border-mk-blue-500"
                    />
                    <span className="mk-caption text-mk-ink-500">{T("SAR", "ر.س", ar)}{extraKmCount > 0 && T(` · ${extraKmCount.toLocaleString()} km over`, ` · تجاوز ${extraKmCount.toLocaleString()} كم`, ar)}</span>
                  </div>
                )}
                {pickupFuel != null && fuel !== "" && fuel > pickupFuel && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="mk-body-sm text-mk-ink-900 shrink-0">{T("Fuel difference", "فرق الوقود", ar)}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={fuelDiffCharge}
                      onChange={e => setFuelDiffCharge(e.target.value)}
                      placeholder={String(Number(suggestion?.fuelDifferenceAmount ?? 0))}
                      className="w-[100px] px-2 py-1 rounded-md mk-body-sm text-mk-danger border border-mk-ink-200 bg-white outline-none focus:border-mk-blue-500"
                    />
                    <span className="mk-caption text-mk-ink-500">{T("SAR", "ر.س", ar)}</span>
                  </div>
                )}
                {(!noDamage || damageCount > 0) && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="mk-body-sm text-mk-ink-900 shrink-0">{T("Damage charge", "رسوم الأضرار", ar)}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={damageCharge}
                      onChange={e => setDamageCharge(e.target.value)}
                      placeholder={String(Number(suggestion?.damageAmount ?? 0))}
                      className="w-[100px] px-2 py-1 rounded-md mk-body-sm text-mk-danger border border-mk-ink-200 bg-white outline-none focus:border-mk-blue-500"
                    />
                    <span className="mk-caption text-mk-ink-500">{T("SAR", "ر.س", ar)}</span>
                  </div>
                )}
              </div>
            )}

            {(returnForm.fleetStatusOptions?.length ?? 0) > 0 && (
              <div className="mt-4 border-t border-mk-ink-100 pt-4">
                <Select label={T("Vehicle status after return", "حالة المركبة بعد الاستلام", ar)} value={fleetStatus === "" ? "" : String(fleetStatus)} onChange={(event) => setFleetStatus(Number(event.target.value) as Types.VehicleFleetStatus)} disabled={submitted}>
                  {returnForm.fleetStatusOptions!.map((status) => <option key={status} value={status}>{status === Types.VehicleFleetStatus.Available ? T("Available", "متاحة", ar) : status === Types.VehicleFleetStatus.Maintenance ? T("Maintenance", "صيانة", ar) : status === Types.VehicleFleetStatus.Inactive ? T("Inactive", "غير نشطة", ar) : T(`Status ${status}`, `الحالة ${status}`, ar)}</option>)}
                </Select>
                <div className="mt-1 mk-caption text-mk-ink-500">{T("The suggested status is selected by default.", "تم تحديد الحالة المقترحة افتراضياً.", ar)}</div>
              </div>
            )}

            {submitError && (
              <p className="mk-label text-mk-danger-700 px-4 py-3 rounded-lg bg-mk-danger-100 mt-2">{submitError}</p>
            )}
            <Button variant="outline" className="w-full justify-center mt-2 text-mk-danger border-mk-danger/30" disabled={submitting} onClick={() => setShowDispute(true)}>
              <AlertTriangle size={15} />{T("Mark disputed", "تسجيل نزاع", ar)}
            </Button>
          </div>

          {/* Right: condition + invoice */}
          <div className="flex flex-col gap-4">
            <VehicleConditionPanel
              ar={ar}
              photos={conditionPhotos.length ? conditionPhotos : carImages.map((src, index) => ({ src, label: `${T("Photo", "صورة", ar)} ${index + 1}` }))}
              vehicleTitle={`${contract.car} · ${contract.plate}`}
              sketchItems={sketchItems}
              onSketchChange={setSketchItems}
              baselineSketch={baselineSketch}
              damageNotes={damageNotes}
              onDamageNotesChange={setDamageNotes}
              disabled={submitted}
            />
            <PhotoSlotsPanel
              ar={ar}
              viewerTitle={`${contract.car} · ${contract.plate}`}
              title={T("Return photos", "صور الاستلام", ar)}
              definitions={returnPhotoSlots}
              values={returnPhotos}
              onChange={setReturnPhotos}
              required={requiredReturnPhotos}
              locked={submitted}
            />
            {/* Invoice */}
            <div className="rounded-xl p-5 mk-surface">
              <div className="mk-h4 mb-6 text-mk-ink-900">{T("Final invoice", "الفاتورة النهائية", ar)}</div>
              <div className="flex flex-col gap-3">
                {invoice.baseRent != null && <div className="flex justify-between mk-label"><span className="text-mk-ink-600">{T("Base rent", "الإيجار الأساسي", ar)}</span><span className="text-mk-ink-900">{Number(invoice.baseRent).toLocaleString()} {T("SAR", "ر.س", ar)}</span></div>}
                {invoice.insurance != null && <div className="flex justify-between mk-label"><span className="text-mk-ink-600">{T("Insurance", "التأمين", ar)}</span><span className="text-mk-ink-900">{Number(invoice.insurance).toLocaleString()} {T("SAR", "ر.س", ar)}</span></div>}
                {invoice.vatAmount != null && <div className="flex justify-between mk-label"><span className="text-mk-ink-600">{T("VAT", "ضريبة القيمة المضافة", ar)}</span><span className="text-mk-ink-900">{Number(invoice.vatAmount).toLocaleString()} {T("SAR", "ر.س", ar)}</span></div>}
                <div className="flex justify-between mk-label"><span className="text-mk-ink-600">{T("Contract amount", "مبلغ العقد", ar)}</span><span className="text-mk-ink-900">{contract.amount.toLocaleString()} {T("SAR", "ر.س", ar)}</span></div>
                {lateFeeNum > 0 && <div className="flex justify-between mk-label"><span className="text-mk-danger">{T("Late fee", "غرامة التأخر", ar)}</span><span className="text-mk-danger">+{lateFeeNum} {T("SAR", "ر.س", ar)}</span></div>}
                {extraKmNum > 0 && <div className="flex justify-between mk-label"><span className="text-mk-danger">{T("Extra km charge", "رسوم الكيلومترات الزائدة", ar)}</span><span className="text-mk-danger">+{extraKmNum} {T("SAR", "ر.س", ar)}</span></div>}
                {fuelDiffNum > 0 && <div className="flex justify-between mk-label"><span className="text-mk-danger">{T("Fuel difference", "فرق الوقود", ar)}</span><span className="text-mk-danger">+{fuelDiffNum} {T("SAR", "ر.س", ar)}</span></div>}
                {damageNum > 0 && <div className="flex justify-between mk-label"><span className="text-mk-danger">{T("Damage charge", "رسوم الأضرار", ar)}</span><span className="text-mk-danger">+{damageNum} {T("SAR", "ر.س", ar)}</span></div>}
                {outstandingBalance > 0 && <div className="flex justify-between mk-label"><span style={{ color: "#B45309" }}>{T("Unpaid balance (advance)", "المتبقي من العقد (دفع مقدم)", ar)}</span><span style={{ color: "#B45309" }}>+{outstandingBalance.toLocaleString()} {T("SAR", "ر.س", ar)}</span></div>}
                <div className="flex justify-between items-center pt-3 border-t border-mk-ink-100"><span className="mk-h4 text-mk-ink-900">{T("Final total", "الإجمالي النهائي", ar)}</span><span className="mk-h4" style={{ color: extraCharges > 0 ? "var(--color-mk-danger)" : "var(--color-mk-ink-900)" }}>{finalTotal.toLocaleString()} {T("SAR", "ريال", ar)}</span></div>
                <div className="flex justify-between mk-caption text-mk-ink-500">
                  <span>{T(`Paid: ${paidAmountNum.toLocaleString()} SAR`, `المدفوع: ${paidAmountNum.toLocaleString()} ريال`, ar)}</span>
                  <span className={`mk-label ${outstandingBalance + extraCharges > 0 ? "text-mk-danger" : "text-mk-mint-600"}`}>{outstandingBalance + extraCharges > 0 ? `+${(outstandingBalance + extraCharges).toLocaleString()} ${T("SAR due", "ريال مستحق", ar)}` : T("No remaining balance", "لا رصيد متبقي", ar)}</span>
                </div>

              </div>
            </div>
          </div>
        </div>
        {showMap && <VehicleMapPanel ar={ar} contract={contract} onClose={() => setShowMap(false)} />}

        {showDispute && (
          <Modal
            open={true}
            onClose={() => { if (!disputing) { setShowDispute(false); setDisputeNotes(""); setDisputeError(""); } }}
            variant="centered"
            size="md"
            title={T("Mark contract disputed", "تسجيل نزاع على العقد", ar)}
          >
            <div className="p-6 flex flex-col gap-4">
              <p className="mk-body-sm text-mk-ink-600">
                {T(
                  `Contract ${contract.id} will be flagged as disputed. Penalty collection is paused while the dispute is under review.`,
                  `سيتم وضع العقد ${contract.id} كمتنازع عليه. يتوقف تحصيل الغرامات أثناء مراجعة النزاع.`,
                  ar
                )}
              </p>
              <textarea
                value={disputeNotes}
                onChange={e => setDisputeNotes(e.target.value)}
                placeholder={T("Describe the dispute reason…", "صف سبب النزاع…", ar)}
                rows={3}
                className="w-full px-3 py-2 rounded-md mk-body-sm text-mk-ink-900 border border-mk-ink-200 bg-white outline-none focus:border-mk-blue-500 resize-none"
              />
              {disputeError && (
                <p className="mk-label text-mk-danger-700 px-4 py-3 rounded-lg bg-mk-danger-100">{disputeError}</p>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" disabled={disputing} onClick={() => { setShowDispute(false); setDisputeNotes(""); setDisputeError(""); }}>
                  {T("Back", "رجوع", ar)}
                </Button>
                <Button variant="primary" className="flex-1" disabled={!disputeNotes.trim() || disputing} onClick={handleDispute}>
                  <AlertTriangle size={14} />
                  {disputing ? T("Submitting…", "جارٍ الإرسال…", ar) : T("Confirm dispute", "تأكيد النزاع", ar)}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
}

// ── List / Table view ──────────────────────────────────────────
function ReturnListView({ ar, basePath }: { ar: boolean; basePath: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TabKey>("all");
  const [rows, setRows] = useState<ReturnRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await contractService.searchPendingReturns({
          search: debouncedQuery || undefined,
          pageNumber: 1,
          pageSize: 50,
        });
        if (cancelled) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items: any[] = res?.items ?? res?.data?.items ?? res?.data ?? [];
        setRows((Array.isArray(items) ? items : []).map((it) => mapReturnRow(it, ar)));
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [debouncedQuery, ar]);

  const counts: Record<TabKey, number> = {
    all: rows.length,
    active: rows.filter((b) => b.status === "active").length,
    late: rows.filter((b) => b.status === "late").length,
  };
  const filtered = rows.filter((b) => filter === "all" || b.status === filter);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="min-w-[260px]">
          <Input
            variant="search"
            icon={<Search size={14} />}
            placeholder={T("Search by ref, customer, plate…", "ابحث بالرقم أو الاسم أو اللوحة…", ar)}
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        {/* Filter tabs */}
        <Tabs
          variant="default"
          rounded="full"
          value={filter}
          onChange={(v) => setFilter(v as TabKey)}
          items={TABS.map((t) => ({
            value: t.key,
            label: ar ? t.ar : t.en,
            count: counts[t.key] > 0 ? counts[t.key] : undefined,
          }))}
        />
        <div className="flex-1" />
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden mk-surface">
        <Table>
          <thead>
            <tr>
              {[T("Contract", "العقد", ar), T("Customer", "العميل", ar), T("Vehicle", "المركبة", ar), T("Return Due", "تاريخ الإرجاع", ar), T("Amount", "المبلغ", ar), T("Status", "الحالة", ar), ""].map((h, i) => (
                <Th key={i}>{h}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(b => {
              const sm = STATUS_MAP[b.status] ?? { variant: "neutral" as const, labelEn: b.status, labelAr: b.status };
              const isLate = b.status === "late";
              return (
                <tr key={b.navId}
                  className={`cursor-pointer transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50 ${isLate ? "bg-mk-danger/[0.025]" : ""}`}
                  onClick={() => router.push(`${basePath}?id=${b.navId}`)}
                >
                  <Td>
                    <div className="font-mono mk-label text-mk-blue-600">{b.ref}</div>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={b.customer} size="sm" />
                      <div>
                        <div className="mk-label text-mk-ink-900">{b.customer}</div>
                        <div className="mk-caption text-mk-ink-500">{b.phone}</div>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <div className="mk-label text-mk-ink-900">{b.car}</div>
                    <div className="mk-caption text-mk-ink-500">{b.plate}</div>
                  </Td>
                  <Td className={isLate ? "text-mk-danger mk-label" : "text-mk-ink-700 mk-label"}>{b.due}</Td>
                  <Td>
                    <div className="mk-label text-mk-ink-900">{b.amount.toLocaleString()}</div>
                    <div className="mk-overline text-mk-ink-400">{T("SAR", "ر.س", ar)}</div>
                  </Td>
                  <Td>
                    <Badge variant={sm.variant} dot>{ar ? sm.labelAr : sm.labelEn}</Badge>
                  </Td>
                  <Td onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <IconButton size="sm" variant="ghost" className="bg-mk-ink-50" onClick={e => { e.stopPropagation(); router.push(`${basePath}?id=${b.navId}`); }}>
                        {ar ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                      </IconButton>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        {loading && (
          <div className="py-16 text-center">
            <div className="mk-body-sm text-mk-ink-600">{T("Loading…", "جارٍ التحميل…", ar)}</div>
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center">
            <div className="mk-h1 mb-2">📋</div>
            <div className="mk-body-sm text-mk-ink-600">{T("No active rentals found", "لا توجد مركبات مؤجرة", ar)}</div>
            <div className="mk-label mt-1 text-mk-ink-400">{T("Try adjusting your filters", "جرّب تغيير الفلاتر", ar)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Router ────────────────────────────────────────────────────────
function ReturnProcessContent() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const basePath = pathname?.startsWith("/employee") ? "/employee/return" : "/return";
  const id = searchParams.get("id");
  if (id) return <ReturnDetailView id={id} ar={ar} basePath={basePath} />;
  return <ReturnListView ar={ar} basePath={basePath} />;
}

export default function ReturnProcessPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-mk-ink-500">Loading…</div>}>
      <ReturnProcessContent />
    </Suspense>
  );
}
