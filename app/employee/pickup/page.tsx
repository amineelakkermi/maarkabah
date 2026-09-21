"use client";

import { useState, useEffect, Suspense } from "react";
import {
  FileText, IdCard, CreditCard, Camera, Fuel, KeyRound, Check, Phone,
  MapPin, Search, ChevronRight, ChevronLeft,
  Gauge, Monitor, Music, Wind, CircleDot, Armchair, TriangleAlert,
  FireExtinguisher, HeartPulse, Wrench, ShieldCheck, Droplet,
} from "lucide-react";
import { Avatar, Badge, Button, Tabs, Input, IconButton, Table, Th, Td, Select } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { CAR_IMAGES } from "@/lib/data";
import { SketchComponent } from "@/components/employee/SketchComponent";
import { VehicleMapPanel } from "@/components/employee/VehicleMapPanel";
import type { SketchItem } from "@/lib/tajeer";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { contractService } from "@/lib/api-services";
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

interface PickupRow {
  navId: string;
  ref: string;
  customer: string;
  phone: string;
  car: string;
  plate: string;
  scheduled: string;
  amount: number;
  kyc: string;
  status: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPickupRow(item: any, ar: boolean): PickupRow {
  const customer = (ar ? item.customerNameAr : item.customerNameEn) ?? item.customerName ?? item.customerNameEn ?? item.customerNameAr ?? item.customer?.fullNameEn ?? "";
  const scheduled = item.startAt ? new Date(item.startAt) : null;
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
    scheduled: scheduled && !isNaN(scheduled.getTime())
      ? scheduled.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + scheduled.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
      : "",
    amount: Number(item.totalAmount ?? item.grandTotal ?? item.total ?? item.paidAmount ?? 0),
    kyc: normalizeKycStatus(item.customerVerificationStatus ?? item.verificationStatus),
    status: statusKey(item.status),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toBooking(item: any, ar: boolean, row: PickupRow): Booking {
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
    type: "pickup",
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

const ALL_OK_CONDITION: Types.HandoverCondition = {
  ac: { isOk: true }, radioStereo: { isOk: true }, screen: { isOk: true },
  speedometer: { isOk: true }, keys: { isOk: true }, carSeats: { isOk: true },
  tires: { isOk: true }, spareTire: { isOk: true }, safetyTriangle: { isOk: true },
  fireExtinguisher: { isOk: true }, firstAidKit: { isOk: true }, spareTireTools: { isOk: true },
};

type TabKey = "all" | "pending" | "active";
const TABS: { key: TabKey; en: string; ar: string }[] = [
  { key: "all", en: "All", ar: "الكل" },
  { key: "pending", en: "Pending", ar: "معلقة" },
  { key: "active", en: "In Progress", ar: "قيد التنفيذ" },
];

// ── Car Carousel ──────────────────────────────────────────────────
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
          const src = images[i]; const fl = src?.endsWith("#flipped"); const cs = fl ? src.replace("#flipped", "") : src; const a = i === index; return (
            <button key={i} type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); setIndex(i); }} className="w-12 h-9 rounded-sm overflow-hidden p-0 border transition-all cursor-pointer shrink-0" style={{ borderColor: a ? "var(--color-mk-blue-500)" : "var(--color-mk-ink-200)", boxShadow: a ? "0 0 0 1px var(--color-mk-blue-500)" : "none", opacity: a ? 1 : 0.65, background: src ? "transparent" : "var(--color-mk-ink-50)" }}>
              {src ? <img src={cs} alt="" className="w-full h-full object-cover" style={{ transform: fl ? "scaleX(-1)" : "none" }} /> : <div className="w-full h-full flex items-center justify-center"><Camera size={12} className="text-mk-ink-400" /></div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Vehicle Condition Panel ───────────────────────────────────────
function VehicleConditionPanel({ ar, sketchItems, onSketchChange }: { ar: boolean; sketchItems: SketchItem[]; onSketchChange: (i: SketchItem[]) => void }) {
  const [view, setView] = useState<"diagram" | "photos">("diagram");
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
        ? <div className="rounded-lg flex items-center justify-center w-full"><SketchComponent value={sketchItems} onChange={onSketchChange} ar={ar} disabled /></div>
        : <ReadonlyCarCarousel images={CAR_IMAGES["Camry"]} ar={ar} />
      }
    </div>
  );
}

// ── Vehicle Condition Summary ───────────────────────────────────────
function VehicleSummaryPanel({ ar, odometer, fuel, endurance }: { ar: boolean; odometer: number | null; fuel: string; endurance: number | null }) {
  const INDICATORS = [
    { icon: Gauge, label: T("Current odometer", "عداد الكيلومتر الحالي", ar), value: odometer != null ? `${odometer.toLocaleString()} ${T("km", "كم", ar)}` : "—" },
    { icon: Droplet, label: T("Current fuel", "الوقود الحالي", ar), value: fuel },
    { icon: ShieldCheck, label: T("Accident deductible", "مبلغ التحمل للحوادث", ar), value: endurance != null ? `${endurance.toLocaleString()} ${T("SAR", "ريال", ar)}` : "—" },
    { icon: Wrench, label: T("Next oil change", "صيانة تغيير الزيت القادمة", ar), value: `5,000 ${T("km", "كم", ar)} · 5W-30` },
  ];

  const INSPECTION = [
    { icon: Gauge, label: T("Speedometer", "حالة عداد السرعة", ar), value: T("Working", "يعمل", ar) },
    { icon: Monitor, label: T("Screen", "حالة الشاشة الداخلية", ar), value: T("Excellent", "ممتاز", ar) },
    { icon: Music, label: T("Radio/Stereo", "حالة الراديو/المسجل", ar), value: T("Excellent", "ممتاز", ar) },
    { icon: Wind, label: T("A/C", "حالة التكييف", ar), value: T("Excellent", "ممتاز", ar) },
    { icon: CircleDot, label: T("Spare tire", "حالة العجلة الاحتياطية", ar), value: T("Excellent", "ممتاز", ar) },
    { icon: CircleDot, label: T("Tires", "حالة العجلات", ar), value: T("Excellent", "ممتاز", ar) },
    { icon: Armchair, label: T("Seats", "المقاعد", ar), value: T("Clean", "نظيف", ar) },
    { icon: KeyRound, label: T("Keys", "حالة المفتاح", ar), value: T("Working", "يعمل", ar) },
    { icon: TriangleAlert, label: T("Warning triangle", "توفر المثلث العاكس", ar), value: T("Present", "موجود", ar) },
    { icon: FireExtinguisher, label: T("Fire extinguisher", "توفر طفاية الحريق", ar), value: T("Present", "موجود", ar) },
    { icon: HeartPulse, label: T("First aid kit", "حالة حقيبة الاسعافات الأولية", ar), value: T("Present", "موجود", ar) },
    { icon: Wrench, label: T("Tire kit", "معدات الكفر الاحتياطية", ar), value: T("Present", "موجود", ar) },
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {INSPECTION.map(({ icon: Icon, label, value }, i) => (
            <div key={i} className="flex items-center gap-3 p-3 select-none">
              <div className="w-9 h-9 rounded-md bg-mk-blue-500/10 text-mk-blue-500 flex items-center justify-center shrink-0">
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="mk-caption text-mk-ink-500 truncate">{label}</div>
                <div className="mk-caption text-mk-ink-900 mt-1 truncate">{value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Detail View (separate component — no conditional hooks) ────────
function PickupDetailView({ id, ar }: { id: string; ar: boolean }) {
  const router = useRouter();
  const [checks, setChecks] = useState<Record<string, boolean>>({ contract: true, id: true, deposit: true, inspect: false, fuel: false, keys: false });
  const [sketchItems, setSketchItems] = useState<SketchItem[]>([]);
  const [showMap, setShowMap] = useState(false);
  const [odometer, setOdometer] = useState("");
  const [fuel, setFuel] = useState<Types.FuelLevel | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [raw, setRaw] = useState<any>(null);
  const [row, setRow] = useState<PickupRow | null>(null);
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
        setRow(mapPickupRow(c, ar));
        const odo = c.odometerReading ?? c.odometerAtDelivery;
        if (odo != null) setOdometer(String(odo));
        if (c.fuelLevel != null) setFuel(Number(c.fuelLevel) as Types.FuelLevel);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, ar]);

  const allDone = Object.values(checks).every(Boolean);
  const odometerValid = odometer.trim() !== "" && !isNaN(Number(odometer));
  const fuelValid = fuel !== "";
  const canConfirm = allDone && odometerValid && fuelValid && !submitting;
  const toggle = (k: string) => setChecks(s => ({ ...s, [k]: !s[k] }));

  const handleConfirm = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      await contractService.recordDelivery(id, {
        odometerAtDelivery: Number(odometer),
        fuelLevelAtDelivery: fuel === "" ? undefined : (fuel as Types.FuelLevel),
        sketchInfoAtDelivery: sketchItems.map((s) => ({ type: s.type, x: s.x, y: s.y })),
        condition: ALL_OK_CONDITION,
        conditionNotes: null,
        checklist: {
          contractSigned: checks.contract,
          customerIdPhotographed: checks.id,
          securityDepositCollected: checks.deposit,
          walkAroundInspectionDone: checks.inspect,
          fuelLevelRecorded: checks.fuel,
          keysHandedOver: checks.keys,
        },
      });
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="py-24 text-center">
      <div className="mk-body mb-1 text-mk-ink-500">{T("Loading contract…", "جارٍ تحميل العقد…", ar)}</div>
    </div>
  );

  if (notFound || !row || !raw) return (
    <div className="py-24 text-center">
      <div className="mk-display mb-3">📋</div>
      <div className="mk-body mb-2 text-mk-ink-900">{T("Contract not found", "العقد غير موجود", ar)}</div>
      <Link href="/employee/pickup" className="mk-body-sm text-mk-blue-500 no-underline">{T("← Back", "→ العودة", ar)}</Link>
    </div>
  );

  if (submitted) {
    return (
      <div className="py-24 text-center">
        <div className="mk-display mb-3">✅</div>
        <div className="mk-h3 mb-2 text-mk-ink-900">{T("Handover confirmed", "تم تأكيد التسليم", ar)}</div>
        <div className="mk-body-sm mb-6 text-mk-ink-500">{T(`Contract ${row.ref} · vehicle handed over to ${row.customer}`, `العقد ${row.ref} · تم تسليم المركبة إلى ${row.customer}`, ar)}</div>
        <Button variant="primary" onClick={() => router.push("/employee/pickup")}>
          {T("Back to handovers", "العودة للتسليمات", ar)}
        </Button>
      </div>
    );
  }

  const contract = toBooking(raw, ar, row);
  const deposit = Number(raw.depositAmount ?? 0);
  const carKey = ["Camry", "Sonata", "Elantra", "Civic", "Sportage", "Patrol", "CX-5", "Land Cruiser", "Tahoe", "ZS"].find(k => contract.car.includes(k)) || "Camry";
  const carImages = CAR_IMAGES[carKey] || CAR_IMAGES["Camry"];

  const CHECKLIST = [
    { key: "contract", label: ["Contract signed", "العقد موقَّع"], icon: FileText },
    { key: "id", label: ["Photographed customer's ID", "تصوير هوية العميل"], icon: IdCard },
    { key: "deposit", label: [`Refundable security deposit · ${deposit.toLocaleString()} SAR`, `تأمين قابل للاسترداد · ${deposit.toLocaleString()} ريال`], icon: CreditCard },
    { key: "inspect", label: ["Walk-around inspection done", "معاينة محيطية مكتملة"], icon: Camera },
    { key: "fuel", label: [`Fuel level recorded · ${fuelLabel(fuel, ar)}`, `مستوى الوقود مسجل · ${fuelLabel(fuel, ar)}`], icon: Fuel },
    { key: "keys", label: ["Keys handed over", "تسليم المفاتيح"], icon: KeyRound },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link href="/employee/pickup" className="w-9 h-9 rounded-full flex items-center justify-center bg-white shadow-[var(--shadow-card)] text-mk-ink-600 no-underline hover:bg-mk-ink-50 transition-colors">
          {ar ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Link>
        <span className="mk-body-sm text-mk-ink-500">{T("Back to Handovers", "العودة للقائمة", ar)}</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl p-6 mk-surface">
          <div className="flex items-center gap-3 mb-6">
            <div className="mk-h4 flex-1 text-mk-ink-900">{T(`Handover · ${contract.id}`, `تسليم · ${contract.id}`, ar)}</div>
            <Badge variant="warning" dot>{T("In progress", "قيد التنفيذ", ar)}</Badge>
          </div>
          <div className="flex items-center gap-3 py-3 border-b border-mk-ink-100">
            <Avatar name={contract.customer} size="lg" />
            <div className="flex-1">
              <div className="mk-body text-mk-ink-900">{contract.customer}</div>
              <div className="mk-caption text-mk-ink-500">{contract.phone} · {contract.kyc === "verified" ? T("KYC Verified", "الهوية موثقة", ar) : T("KYC Pending", "الهوية معلقة", ar)}</div>
            </div>
            <a href={`tel:${contract.phone}`} className="w-9 h-9 rounded-full flex items-center justify-center bg-white border border-mk-ink-200 text-mk-ink-600 hover:bg-mk-ink-100 transition-colors"><Phone size={14} /></a>
          </div>
          <div className="flex items-center gap-3 py-3 border-b border-mk-ink-100">
            <div className="w-16 h-11 rounded-md overflow-hidden shrink-0 bg-mk-ink-50">
              <img src={carImages[0]} alt={contract.car} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <div className="mk-body text-mk-ink-900">{contract.car}</div>
              <div className="mk-caption text-mk-ink-500">{contract.plate} · {contract.branch}</div>
            </div>
            <IconButton size="md" onClick={() => setShowMap(true)} className="border border-mk-ink-200 text-mk-blue-600 hover:bg-mk-blue-50">
              <MapPin size={14} />
            </IconButton>
          </div>

          {/* Odometer + fuel — required entries recorded on delivery */}
          <div className="mk-overline uppercase mt-4 mb-2 text-mk-ink-500 mk-tracking-wide">{T("Readings at handover", "القراءات عند التسليم", ar)}</div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-md mb-2"
            style={{ background: odometerValid ? "rgba(63,182,172,0.08)" : "transparent", border: odometerValid ? "1px solid rgba(63,182,172,0.30)" : "none" }}>
            <div className="w-6 h-6 rounded-sm flex items-center justify-center shrink-0 text-white"
              style={{ background: odometerValid ? "var(--color-mk-mint-600)" : "var(--color-mk-bg)", border: odometerValid ? "none" : "1px solid var(--color-mk-border)" }}>
              {odometerValid && <Check size={14} />}
            </div>
            <Gauge size={16} className="text-mk-ink-500 shrink-0" />
            <div className="flex-1 flex items-center gap-2 flex-wrap">
              <span className="mk-body-sm shrink-0" style={{ color: odometerValid ? "var(--color-mk-ink-500)" : "var(--color-mk-ink-900)" }}>{T("Odometer at delivery", "قراءة العداد عند التسليم", ar)}</span>
              <input
                type="number"
                inputMode="numeric"
                required
                value={odometer}
                onChange={e => setOdometer(e.target.value)}
                placeholder={T("km", "كم", ar)}
                className="w-[110px] px-2 py-1 rounded-md mk-body-sm text-mk-ink-900 border border-mk-ink-200 bg-white outline-none focus:border-mk-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-md mb-2"
            style={{ background: fuelValid ? "rgba(63,182,172,0.08)" : "transparent", border: fuelValid ? "1px solid rgba(63,182,172,0.30)" : "none" }}>
            <div className="w-6 h-6 rounded-sm flex items-center justify-center shrink-0 text-white"
              style={{ background: fuelValid ? "var(--color-mk-mint-600)" : "var(--color-mk-bg)", border: fuelValid ? "none" : "1px solid var(--color-mk-border)" }}>
              {fuelValid && <Check size={14} />}
            </div>
            <Fuel size={16} className="text-mk-ink-500 shrink-0" />
            <div className="flex-1 flex items-center gap-2 flex-wrap">
              <span className="mk-body-sm shrink-0" style={{ color: fuelValid ? "var(--color-mk-ink-500)" : "var(--color-mk-ink-900)" }}>{T("Fuel level at delivery", "مستوى الوقود عند التسليم", ar)}</span>
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
            </div>
          </div>

          <div className="mk-overline uppercase mt-4 mb-2 text-mk-ink-500 mk-tracking-wide">{T("Handover checklist", "قائمة التسليم", ar)}</div>
          {CHECKLIST.map(({ key, label, icon: Icon }) => (
            <div key={key} onClick={() => toggle(key)} className="flex items-center gap-3 px-4 py-3 rounded-md mb-2 cursor-pointer hover:bg-mk-ink-100 transition-colors"
              style={{ background: checks[key] ? "rgba(63,182,172,0.08)" : "transparent", border: checks[key] ? "1px solid rgba(63,182,172,0.30)" : "none" }}>
              <div className="w-6 h-6 rounded-sm flex items-center justify-center shrink-0 text-white"
                style={{ background: checks[key] ? "var(--color-mk-mint-600)" : "var(--color-mk-bg)", border: checks[key] ? "none" : "1px solid var(--color-mk-border)" }}>
                {checks[key] && <Check size={14} />}
              </div>
              <Icon size={16} className="text-mk-ink-500 shrink-0" />
              <span className="mk-body-sm" style={{ color: checks[key] ? "var(--color-mk-ink-500)" : "var(--color-mk-ink-900)", fontWeight: "var(--fw-medium)" }}>
                {T(label[0], label[1], ar)}
              </span>
            </div>
          ))}
          {submitError && (
            <p className="mk-label text-mk-danger-700 px-4 py-3 rounded-lg bg-mk-danger-100 mt-3">{submitError}</p>
          )}
          <Button variant="primary" className="w-full justify-center mt-4" disabled={!canConfirm} onClick={handleConfirm}>
            <Check size={16} />{submitting ? T("Confirming…", "جارٍ التأكيد…", ar) : T("Confirm handover", "تأكيد التسليم", ar)}
          </Button>
        </div>
        <div className="flex flex-col gap-4">
          <VehicleConditionPanel ar={ar} sketchItems={sketchItems} onSketchChange={setSketchItems} />
          <VehicleSummaryPanel
            ar={ar}
            odometer={odometerValid ? Number(odometer) : null}
            fuel={fuelValid ? fuelLabel(fuel, ar) : "—"}
            endurance={raw.enduranceAmount != null ? Number(raw.enduranceAmount) : null}
          />
        </div>
      </div>
      {showMap && <VehicleMapPanel ar={ar} contract={contract} onClose={() => setShowMap(false)} />}
    </div>
  );
}

// ── List View ─────────────────────────────────────────────────────
function PickupListView({ ar }: { ar: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TabKey>("all");
  const [rows, setRows] = useState<PickupRow[]>([]);
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
        const res = await contractService.searchPendingDeliveries({
          search: debouncedQuery || undefined,
          pageNumber: 1,
          pageSize: 50,
        });
        if (cancelled) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items: any[] = res?.items ?? res?.data?.items ?? res?.data ?? [];
        setRows((Array.isArray(items) ? items : []).map((it) => mapPickupRow(it, ar)));
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
    pending: rows.filter((b) => b.status === "pending").length,
    active: rows.filter((b) => b.status === "active").length,
  };
  const filtered = rows.filter((b) => filter === "all" || b.status === filter);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="min-w-[260px]">
          <Input variant="search" icon={<Search size={14} />}
            placeholder={T("Search by ref, customer, plate…", "ابحث بالرقم أو الاسم أو اللوحة…", ar)}
            value={query} onChange={e => setQuery(e.target.value)} />
        </div>
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

      <div className="rounded-xl overflow-hidden mk-surface">
        <Table>
          <thead>
            <tr>
              {[T("Contract", "العقد", ar), T("Customer", "العميل", ar), T("Vehicle", "المركبة", ar), T("Scheduled", "التسليم", ar), T("Amount", "المبلغ", ar), T("KYC", "التحقق", ar), T("Status", "الحالة", ar), ""].map((h, i) => (
                <Th key={i}>{h}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(b => {
              const sm = STATUS_MAP[b.status] ?? { variant: "neutral" as const, labelEn: b.status, labelAr: b.status };
              return (
                <tr key={b.navId} className="cursor-pointer transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50" onClick={() => router.push(`/employee/pickup?id=${b.navId}`)}>
                  <Td><div className="font-mono mk-label text-mk-blue-600">{b.ref}</div></Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={b.customer} size="sm" />
                      <div><div className="mk-label text-mk-ink-900">{b.customer}</div><div className="mk-caption text-mk-ink-500">{b.phone}</div></div>
                    </div>
                  </Td>
                  <Td><div className="mk-label text-mk-ink-900">{b.car}</div><div className="mk-caption text-mk-ink-500">{b.plate}</div></Td>
                  <Td className="mk-label text-mk-ink-700">{b.scheduled}</Td>
                  <Td><div className="mk-label text-mk-ink-900">{b.amount.toLocaleString()}</div><div className="mk-overline text-mk-ink-400">{T("SAR", "ر.س", ar)}</div></Td>
                  <Td>
                    <Badge variant={b.kyc === "verified" ? "success" : "warning"}>
                      {b.kyc === "verified" ? T("Verified", "موثّق", ar) : T("Pending", "معلق", ar)}
                    </Badge>
                  </Td>
                  <Td><Badge variant={sm.variant} dot>{ar ? sm.labelAr : sm.labelEn}</Badge></Td>
                  <Td onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <IconButton size="sm" variant="ghost" className="bg-mk-ink-50" onClick={e => { e.stopPropagation(); router.push(`/employee/pickup?id=${b.navId}`); }}>
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
            <div className="mk-body-sm text-mk-ink-600">{T("No handovers found", "لا توجد تسليمات", ar)}</div>
            <div className="mk-label mt-1 text-mk-ink-400">{T("Try adjusting your filters", "جرّب تغيير الفلاتر", ar)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Router ────────────────────────────────────────────────────────
function PickupHandoverContent() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  if (id) return <PickupDetailView id={id} ar={ar} />;
  return <PickupListView ar={ar} />;
}

export default function PickupHandoverPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-mk-ink-500">Loading…</div>}>
      <PickupHandoverContent />
    </Suspense>
  );
}
