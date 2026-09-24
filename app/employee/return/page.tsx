"use client";

import { useState, useEffect, Suspense } from "react";
import {
  Check, AlertTriangle, Tablet,
  Camera, MapPin, X, Search,
  ChevronRight, ChevronLeft, Phone,
  UserCheck, Gauge, Fuel, Smartphone,
  Monitor, Music, Wind, CircleDot, Armchair, KeyRound, TriangleAlert,
  FireExtinguisher, HeartPulse, Wrench, ShieldCheck, Droplet,
} from "lucide-react";
import { Avatar, Badge, Button, Tabs, Input, IconButton, Table, Th, Td, Select, Modal } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { CAR_IMAGES } from "@/lib/data";
import { SketchComponent } from "@/components/employee/SketchComponent";
import { VehicleMapPanel } from "@/components/employee/VehicleMapPanel";
import type { SketchItem } from "@/lib/tajeer";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { contractService, attachmentService } from "@/lib/api-services";
import * as Types from "@/lib/api-types";
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


// ── Readonly Car Carousel ──────────────────────────────────────────
function ReadonlyCarCarousel({ images, ar }: { images: string[]; ar: boolean }) {
  const [index, setIndex] = useState(0);
  const [startX, setStartX] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const PHOTOS = [T("Front", "أمامي", ar), T("Back", "خلفي", ar), T("Driver side", "جهة السائق", ar), T("Passenger side", "جهة الراكب", ar)];
  if (!images || images.length === 0) return <div className="w-full h-[192px] flex items-center justify-center mk-caption text-mk-ink-400 bg-mk-ink-50">No Photo</div>;
  const hs = (x: number) => { setStartX(x); setIsDragging(true); };
  const hm = (x: number) => { if (!isDragging || startX === null) return; const d = startX - x; if (d > 40) { setIndex(p => (p + 1) % 4); setIsDragging(false); setStartX(null); } else if (d < -40) { setIndex(p => (p - 1 + 4) % 4); setIsDragging(false); setStartX(null); } };
  const he = () => { setIsDragging(false); setStartX(null); };
  return (
    <div className="flex flex-col w-full gap-2">
      <div className="w-full rounded-md overflow-hidden relative cursor-grab active:cursor-grabbing" style={{ height: 192 }}
        onTouchStart={e => hs(e.touches[0].clientX)} onTouchMove={e => hm(e.touches[0].clientX)} onTouchEnd={he}
        onMouseDown={e => hs(e.clientX)} onMouseMove={e => { if (isDragging) { e.preventDefault(); hm(e.clientX); } }} onMouseUp={he} onMouseLeave={he}>
        {PHOTOS.map((angle, i) => {
          const src = images[i]; const fl = src?.endsWith("#flipped"); const cs = fl ? src.replace("#flipped", "") : src; return src ? (
            <div key={angle} className="absolute inset-0 w-full h-full transition-opacity duration-300" style={{ opacity: i === index ? 1 : 0, zIndex: i === index ? 10 : 0 }}>
              <img src={cs} alt={angle} className="w-full h-full object-cover pointer-events-none" style={{ transform: fl ? "scaleX(-1)" : "none" }} />
              <span className="absolute bottom-2 start-2 mk-overline px-2 py-1 rounded-sm z-20" style={{ background: "rgba(0,0,0,0.5)", color: "white" }}>{angle}</span>
            </div>
          ) : (
            <div key={angle} className="absolute inset-0 w-full h-full flex flex-col items-center justify-center text-mk-ink-400 transition-opacity duration-300 bg-mk-ink-50" style={{ opacity: i === index ? 1 : 0, zIndex: i === index ? 10 : 0, border: "2px dashed var(--color-mk-ink-300)", borderRadius: "12px" }}>
              <Camera size={28} /><div className="mk-label mt-2">{angle}</div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-center gap-2">
        {PHOTOS.map((_, i) => {
          const src = images[i]; const fl = src?.endsWith("#flipped"); const cs = fl ? src?.replace("#flipped", "") : src; const a = i === index; return (
            <button key={i} type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); setIndex(i); }} className="w-12 h-9 rounded-sm overflow-hidden p-0 border transition-all cursor-pointer shrink-0" style={{ borderColor: a ? "var(--color-mk-blue-500)" : "var(--color-mk-ink-200)", boxShadow: a ? "0 0 0 1px var(--color-mk-blue-500)" : "none", opacity: a ? 1 : 0.65, background: src ? "transparent" : "var(--color-mk-ink-50)" }}>
              {src ? <img src={cs} alt="" className="w-full h-full object-cover" style={{ transform: fl ? "scaleX(-1)" : "none" }} /> : <div className="w-full h-full flex items-center justify-center"><Camera size={12} className="text-mk-ink-400" /></div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Vehicle Condition Panel ────────────────────────────────────────
function VehicleConditionPanel({ ar, carImages, sketchItems, onSketchChange, damageNotes, onDamageNotesChange }: {
  ar: boolean; carImages: string[]; sketchItems: SketchItem[]; onSketchChange: (items: SketchItem[]) => void;
  damageNotes: string; onDamageNotesChange: (v: string) => void;
}) {
  const [view, setView] = useState<"diagram" | "photos">("diagram");
  const hasDamage = sketchItems.length > 0;
  return (
    <div className="rounded-xl p-6 mk-surface">
      <div className="flex items-center gap-3 mb-6">
        <div className="mk-h4 flex-1 text-mk-ink-900">{T("Vehicle Condition", "حالة المركبة", ar)}</div>
        <Tabs
          variant="tonal"
          size="xs"
          value={view}
          onChange={(v) => setView(v as "diagram" | "photos")}
          items={[
            { value: "diagram", label: T("Diagram", "المخطط", ar) },
            { value: "photos", label: T("Photos", "الصور", ar) },
          ]}
        />
      </div>
      {view === "diagram"
        ? <div className="rounded-lg flex items-center justify-center w-full"><SketchComponent value={sketchItems} onChange={onSketchChange} ar={ar} /></div>
        : <ReadonlyCarCarousel images={carImages} ar={ar} />
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
            placeholder={T("Describe the damage and how it differs from the pickup report…", "صف التلفيات والنقاط الغير مطابقة لمحضر التسليم…", ar)}
            rows={3}
            className="w-full px-3 py-2 rounded-md mk-body-sm text-mk-ink-900 border border-mk-danger/30 bg-white outline-none focus:border-mk-danger resize-none"
          />
        </div>
      )}
    </div>
  );
}

// ── Vehicle Condition Summary ───────────────────────────────────────
const INSPECTION_ITEMS = [
  { key: "odometer", icon: Gauge, label: ["Speedometer", "حالة عداد السرعة"], value: ["Working", "يعمل"] },
  { key: "screen", icon: Monitor, label: ["Screen", "حالة الشاشة الداخلية"], value: ["Excellent", "ممتاز"] },
  { key: "radio", icon: Music, label: ["Radio/Stereo", "حالة الراديو/المسجل"], value: ["Excellent", "ممتاز"] },
  { key: "ac", icon: Wind, label: ["A/C", "حالة التكييف"], value: ["Excellent", "ممتاز"] },
  { key: "spareTire", icon: CircleDot, label: ["Spare tire", "حالة العجلة الاحتياطية"], value: ["Excellent", "ممتاز"] },
  { key: "tires", icon: CircleDot, label: ["Tires", "حالة العجلات"], value: ["Excellent", "ممتاز"] },
  { key: "seats", icon: Armchair, label: ["Seats", "المقاعد"], value: ["Clean", "نظيف"] },
  { key: "keys", icon: KeyRound, label: ["Keys", "حالة المفتاح"], value: ["Working", "يعمل"] },
  { key: "triangle", icon: TriangleAlert, label: ["Warning triangle", "توفر المثلث العاكس"], value: ["Present", "موجود"] },
  { key: "extinguisher", icon: FireExtinguisher, label: ["Fire extinguisher", "توفر طفاية الحريق"], value: ["Present", "موجود"] },
  { key: "firstAid", icon: HeartPulse, label: ["First aid kit", "حالة حقيبة الاسعافات الأولية"], value: ["Present", "موجود"] },
  { key: "tireKit", icon: Wrench, label: ["Tire kit", "معدات الكفر الاحتياطية"], value: ["Present", "موجود"] },
] as const;

function VehicleSummaryPanel({ ar, odometer, fuel, endurance, reasons, onReasonsChange, photos, onPhotosChange }: {
  ar: boolean;
  odometer: number;
  fuel: string;
  endurance: number | null;
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
    { icon: Wrench, label: T("Next oil change", "صيانة تغيير الزيت القادمة", ar), value: `5,000 ${T("km", "كم", ar)} · 5W-30` },
  ];

  return (
    <div className="rounded-xl p-6 mk-surface">
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
          {INSPECTION_ITEMS.map(({ key, icon: Icon, label, value }) => {
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
                      <div className="mk-caption text-mk-ink-900 mt-1 truncate">{T(value[0], value[1], ar)}</div>
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
  const [returnOdometer, setReturnOdometer] = useState("");
  const [fuel, setFuel] = useState<Types.FuelLevel | "">("");
  const [manualLateFee, setManualLateFee] = useState("");
  const [extraKmCharge, setExtraKmCharge] = useState("");
  const [fuelDiffCharge, setFuelDiffCharge] = useState("");
  const [damageCharge, setDamageCharge] = useState("");
  const [damageNotes, setDamageNotes] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Record<string, { file: File; preview: string }>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [suggestion, setSuggestion] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [showDispute, setShowDispute] = useState(false);
  const [disputeNotes, setDisputeNotes] = useState("");
  const [disputing, setDisputing] = useState(false);
  const [disputeError, setDisputeError] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [raw, setRaw] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [delivery, setDelivery] = useState<any>(null);
  const [row, setRow] = useState<ReturnRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await contractService.getById(id);
        const c = res?.data ?? res;
        if (cancelled) return;
        if (!c || c.id == null) { setNotFound(true); return; }
        setRaw(c);
        setRow(mapReturnRow(c, ar));

        // Delivery record gives the baseline odometer/fuel (non-blocking —
        // 404 just means no delivery was recorded for this contract).
        contractService.getDelivery(id)
          .then((d) => { if (!cancelled) setDelivery(d?.data ?? d); })
          .catch(() => {});
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
      if (!odometerEntered || !fuelValid) { setSuggestion(null); return; }
      contractService.calculateReturnCharges(id, {
        odometerAtReturn: odometerNum,
        fuelLevelAtReturn: fuel as Types.FuelLevel,
        actualReturnAt: new Date().toISOString(),
      })
        .then((s) => { if (!cancelled) setSuggestion(s?.data ?? s); })
        .catch(() => { if (!cancelled) setSuggestion(null); });
    }, 500);
    return () => { cancelled = true; clearTimeout(t); };
  }, [id, odometerEntered, fuelValid, odometerNum, fuel]);

  if (loading) return (
    <div className="py-24 text-center">
      <div className="mk-body mb-1 text-mk-ink-500">{T("Loading contract…", "جارٍ تحميل العقد…", ar)}</div>
    </div>
  );

  if (notFound || !row || !raw) return (
    <div className="py-24 text-center">
      <div className="mk-display mb-3">📋</div>
      <div className="mk-body mb-2 text-mk-ink-900">{T("Contract not found", "العقد غير موجود", ar)}</div>
      <Link href={basePath} className="mk-body-sm text-mk-blue-500 no-underline">{T("← Back", "→ العودة", ar)}</Link>
    </div>
  );

  if (submitted) {
    return (
      <div className="py-24 text-center">
        <div className="mk-display mb-3">✅</div>
        <div className="mk-h3 mb-2 text-mk-ink-900">{T("Return confirmed", "تم تأكيد الإرجاع", ar)}</div>
        <div className="mk-body-sm mb-6 text-mk-ink-500">{T(`Contract ${row.ref} closed`, `العقد ${row.ref} أُغلق`, ar)}</div>
        <Button variant="primary" onClick={() => router.push(basePath)}>
          {T("Back to active rentals", "العودة للمركبات المؤجرة", ar)}
        </Button>
      </div>
    );
  }

  const contract = toBooking(raw, ar, row);
  const carKey = ["Camry", "Sonata", "Elantra", "Civic", "Sportage", "Patrol", "CX-5", "Land Cruiser", "Tahoe", "ZS"].find(k => contract.car.includes(k)) || "Sonata";
  const carImages = CAR_IMAGES[carKey] || CAR_IMAGES["Sonata"];
  const isLate = row.status === "late";

  const days = Math.max(1, Math.round((new Date(raw.endAt).getTime() - new Date(raw.startAt).getTime()) / 86400000)) || 1;
  const pickupOdometer = Number(delivery?.odometerAtDelivery ?? raw.odometerReading ?? raw.odometerAtDelivery ?? 0);
  const pickupFuel: Types.FuelLevel | null = delivery?.fuelLevelAtDelivery != null ? Number(delivery.fuelLevelAtDelivery) as Types.FuelLevel : (raw.fuelLevel != null ? Number(raw.fuelLevel) as Types.FuelLevel : null);
  const tripKm = odometerEntered ? Math.max(0, odometerNum - pickupOdometer) : null;
  const kmCapNum = raw.unlimitedKm ? null : ((Number(raw.allowedKmPerDay ?? 0) * days) || null);
  const isOverKm = tripKm != null && kmCapNum != null && tripKm > kmCapNum;
  const extraKmCount = isOverKm && tripKm != null && kmCapNum != null ? tripKm - kmCapNum : Number(suggestion?.extraKm ?? 0);

  const noDamage = sketchItems.length === 0;
  const damageCount = new Set([
    ...Object.keys(reasons).filter(k => reasons[k]),
    ...Object.keys(photos),
  ]).size;

  // Suggested amounts from /return/calculate-charges; manual inputs override.
  const lateFeeNum = manualLateFee !== "" ? (parseFloat(manualLateFee) || 0) : Number(suggestion?.lateFeeAmount ?? 0);
  const extraKmNum = extraKmCharge !== "" ? (parseFloat(extraKmCharge) || 0) : Number(suggestion?.extraKmAmount ?? 0);
  const fuelDiffNum = fuelDiffCharge !== "" ? (parseFloat(fuelDiffCharge) || 0) : Number(suggestion?.fuelDifferenceAmount ?? 0);
  const damageNum = damageCharge !== "" ? (parseFloat(damageCharge) || 0) : Number(suggestion?.damageAmount ?? 0);
  const lateHoursNum = Number(suggestion?.lateHours ?? 0);
  const extraCharges = lateFeeNum + extraKmNum + fuelDiffNum + damageNum;
  const finalTotal = contract.amount + extraCharges;

  const canConfirm = odometerEntered && fuelValid && !submitting;

  const handleConfirm = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      // Upload damage photos, then build the per-item condition report.
      const condition: Types.HandoverCondition = {};
      for (const [key, condKey] of Object.entries(CONDITION_KEY_MAP)) {
        const note = reasons[key]?.trim() || null;
        const photo = photos[key];
        let attachmentId: number | null = null;
        if (photo) {
          const up = await attachmentService.upload(photo.file);
          attachmentId = Number(up?.id ?? up?.data?.id ?? up?.attachmentId) || null;
        }
        condition[condKey] = { isOk: !(note || photo), note, attachmentId };
      }

      await contractService.recordReturn(id, {
        odometerAtReturn: odometerNum,
        fuelLevelAtReturn: fuel as Types.FuelLevel,
        sketchInfoAtReturn: sketchItems.map((s) => ({ type: s.type, x: s.x, y: s.y })),
        condition,
        conditionNotes: damageNotes.trim() || null,
        lateFeeAmount: lateFeeNum,
        lateHours: lateHoursNum || undefined,
        extraKmAmount: extraKmNum,
        extraKm: extraKmCount || undefined,
        fuelDifferenceAmount: fuelDiffNum,
        damageAmount: damageNum,
        checklist: {
          customerPresentAtCounter: true,
          odometerRecorded: odometerEntered,
          fuelLevelChecked: fuelValid,
          walkAroundCompleted: true,
          customerConfirmedReturn: true,
        },
      });
      setSubmitted(true);
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
        {/* Back nav */}
        <div className="flex items-center gap-3">
          <Link href={basePath} className="w-9 h-9 rounded-full flex items-center justify-center bg-white shadow-[var(--shadow-card)] text-mk-ink-600 no-underline hover:bg-mk-ink-50 transition-colors">
            {ar ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </Link>
          <span className="mk-body-sm text-mk-ink-500">{T("Back to Active Rentals", "العودة للمركبات المؤجرة", ar)}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Inspection checklist */}
          <div className="rounded-xl p-6 mk-surface">
            <div className="flex items-center gap-3 mb-6">
              <div className="mk-h4 flex-1 text-mk-ink-900">{T(`Return · ${contract.id}`, `استلام إرجاع · ${contract.id}`, ar)}</div>
              <Badge variant={isLate ? "danger" : "success"} dot>{isLate ? T("Overdue", "متأخر", ar) : T("On time", "في الوقت", ar)}</Badge>
            </div>

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
                <img src={carImages[0]} alt={contract.car} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="mk-body text-mk-ink-900">{contract.car}</div>
                <div className="mk-caption text-mk-ink-500">{contract.plate} · {contract.branch}</div>
              </div>
              <IconButton size="md" onClick={() => setShowMap(true)} className="border border-mk-ink-200 text-mk-blue-600 hover:bg-mk-blue-50" title={T("Track on map", "تتبع على الخريطة", ar)}>
                <MapPin size={14} />
              </IconButton>
            </div>

            {/* Inspection steps */}
            <div className="mk-overline uppercase mt-4 mb-2 text-mk-ink-500 mk-tracking-wide">{T("Return inspection", "معاينة الإرجاع", ar)}</div>

            <div className="flex items-center gap-3 px-4 py-3 rounded-md mb-2 bg-mk-mint-600/8 border border-mk-mint-600/30">
              <div className="w-6 h-6 rounded-sm flex items-center justify-center shrink-0 text-white bg-mk-mint-600">
                <Check size={14} />
              </div>
              <UserCheck size={16} className="text-mk-ink-500 shrink-0" />
              <span className="mk-body-sm text-mk-ink-500">{T("Customer present at counter", "العميل حاضر في الكاونتر", ar)}</span>
            </div>

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
                  onChange={e => setReturnOdometer(e.target.value)}
                  placeholder={T("km", "كم", ar)}
                  className="w-[100px] px-2 py-1 rounded-md mk-body-sm text-mk-ink-900 border border-mk-ink-200 bg-white outline-none focus:border-mk-blue-500"
                />
                {odometerEntered && tripKm != null && (
                  <span className="mk-caption" style={{ color: isOverKm ? "var(--color-mk-danger)" : "var(--color-mk-ink-500)" }}>
                    {T(`+${tripKm.toLocaleString()} km this trip`, `+${tripKm.toLocaleString()} كم هذه الرحلة`, ar)}
                    {isOverKm && kmCapNum != null && T(` · ${(tripKm - kmCapNum).toLocaleString()} km over cap`, ` · تجاوز ${(tripKm - kmCapNum).toLocaleString()} كم عن الحد`, ar)}
                  </span>
                )}
              </div>
            </div>

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
            <div className="flex items-center gap-3 px-4 py-3 rounded-md mb-2"
              style={{ background: noDamage ? "rgba(63,182,172,0.08)" : "rgba(226,65,113,0.08)", border: `1px solid ${noDamage ? "rgba(63,182,172,0.30)" : "rgba(226,65,113,0.30)"}` }}>
              <div className="w-6 h-6 rounded-sm flex items-center justify-center shrink-0 text-white"
                style={{ background: noDamage ? "var(--color-mk-mint-600)" : "var(--color-mk-danger)" }}>
                {noDamage ? <Check size={14} /> : <AlertTriangle size={14} />}
              </div>
              <Camera size={16} className="text-mk-ink-500 shrink-0" />
              <span className="mk-body-sm" style={{ color: noDamage ? "var(--color-mk-ink-500)" : "var(--color-mk-danger)" }}>
                {noDamage
                  ? T("Walk-around · no new damage", "معاينة محيطية · لا أضرار جديدة", ar)
                  : T(`Walk-around · ${sketchItems.length} damage mark(s) on diagram`, `معاينة محيطية · ${sketchItems.length} علامة ضرر في المخطط`, ar)}
              </span>
            </div>

            <div className="flex items-center gap-3 px-4 py-3 rounded-md mb-2">
              <div className="w-6 h-6 rounded-sm flex items-center justify-center shrink-0 bg-mk-bg border border-mk-border" />
              <Smartphone size={16} className="text-mk-ink-500 shrink-0" />
              <span className="mk-body-sm text-mk-ink-900">{T("Customer confirms return on screen", "العميل يؤكد وقت الإرجاع", ar)}</span>
            </div>

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

            {submitError && (
              <p className="mk-label text-mk-danger-700 px-4 py-3 rounded-lg bg-mk-danger-100 mt-2">{submitError}</p>
            )}
            <Button variant="primary" className="w-full justify-center mt-4 shadow-[var(--shadow-glow-blue)]" disabled={!canConfirm} onClick={handleConfirm}>
              <Tablet size={16} />{submitting ? T("Processing…", "جارٍ المعالجة…", ar) : T("Pass to customer", "سلّم للعميل", ar)}
            </Button>
            <Button variant="outline" className="w-full justify-center mt-2 text-mk-danger border-mk-danger/30" disabled={submitting} onClick={() => setShowDispute(true)}>
              <AlertTriangle size={15} />{T("Mark disputed", "تسجيل نزاع", ar)}
            </Button>
          </div>

          {/* Right: condition + invoice */}
          <div className="flex flex-col gap-4">
            <VehicleConditionPanel
              ar={ar}
              carImages={carImages}
              sketchItems={sketchItems}
              onSketchChange={setSketchItems}
              damageNotes={damageNotes}
              onDamageNotesChange={setDamageNotes}
            />
            <VehicleSummaryPanel
              ar={ar}
              odometer={odometerEntered ? odometerNum : pickupOdometer}
              fuel={fuelValid ? fuelLabel(fuel, ar) : "—"}
              endurance={raw.enduranceAmount != null ? Number(raw.enduranceAmount) : null}
              reasons={reasons}
              onReasonsChange={setReasons}
              photos={photos}
              onPhotosChange={setPhotos}
            />

            {/* Invoice */}
            <div className="rounded-xl p-6 mk-surface">
              <div className="mk-h4 mb-6 text-mk-ink-900">{T("Final invoice", "الفاتورة النهائية", ar)}</div>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between mk-label"><span className="text-mk-ink-600">{T("Contract amount", "مبلغ العقد", ar)}</span><span className="text-mk-ink-900">{contract.amount.toLocaleString()} {T("SAR", "ر.س", ar)}</span></div>
                {lateFeeNum > 0 && <div className="flex justify-between mk-label"><span className="text-mk-danger">{T("Late fee", "غرامة التأخر", ar)}</span><span className="text-mk-danger">+{lateFeeNum} {T("SAR", "ر.س", ar)}</span></div>}
                {extraKmNum > 0 && <div className="flex justify-between mk-label"><span className="text-mk-danger">{T("Extra km charge", "رسوم الكيلومترات الزائدة", ar)}</span><span className="text-mk-danger">+{extraKmNum} {T("SAR", "ر.س", ar)}</span></div>}
                {fuelDiffNum > 0 && <div className="flex justify-between mk-label"><span className="text-mk-danger">{T("Fuel difference", "فرق الوقود", ar)}</span><span className="text-mk-danger">+{fuelDiffNum} {T("SAR", "ر.س", ar)}</span></div>}
                {damageNum > 0 && <div className="flex justify-between mk-label"><span className="text-mk-danger">{T("Damage charge", "رسوم الأضرار", ar)}</span><span className="text-mk-danger">+{damageNum} {T("SAR", "ر.س", ar)}</span></div>}
                <div className="flex justify-between items-center pt-3 border-t border-mk-ink-100"><span className="mk-h4 text-mk-ink-900">{T("Final total", "الإجمالي النهائي", ar)}</span><span className="mk-h4" style={{ color: extraCharges > 0 ? "var(--color-mk-danger)" : "var(--color-mk-ink-900)" }}>{finalTotal.toLocaleString()} {T("SAR", "ريال", ar)}</span></div>
                <div className="flex justify-between mk-caption text-mk-ink-500">
                  <span>{T(`Captured: ${contract.amount.toLocaleString()} SAR`, `تم حجز: ${contract.amount.toLocaleString()} ريال`, ar)}</span>
                  <span className={`mk-label ${extraCharges > 0 ? "text-mk-danger" : "text-mk-mint-600"}`}>{extraCharges > 0 ? `+${extraCharges} ${T("SAR due", "ريال مستحق", ar)}` : T("No remaining balance", "لا رصيد متبقي", ar)}</span>
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
