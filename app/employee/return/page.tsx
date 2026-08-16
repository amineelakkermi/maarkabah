"use client";

import { useState, Suspense } from "react";
import {
  Check, AlertTriangle, Tablet,
  Camera, Image as ImageIcon, MapPin, X, Search,
  ChevronRight, ChevronLeft, Phone,
  UserCheck, Gauge, Fuel, Smartphone,
  Monitor, Music, Wind, CircleDot, Armchair, KeyRound, TriangleAlert,
  FireExtinguisher, HeartPulse, Wrench, ShieldCheck, Droplet,
} from "lucide-react";
import { Avatar, Badge, Button, Tabs, Input, IconButton, Table, Th, Td } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { CAR_IMAGES, BOOKINGS, CARS } from "@/lib/data";
import { SketchComponent } from "@/components/employee/SketchComponent";
import { VehicleMapPanel } from "@/components/employee/VehicleMapPanel";
import type { SketchItem } from "@/lib/tajeer";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

const T = (en: string, ar: string, isAr: boolean) => isAr ? ar : en;

const STATUS_MAP: Record<string, { variant: "success" | "warning" | "danger" | "neutral"; labelEn: string; labelAr: string }> = {
  active: { variant: "success", labelEn: "Active", labelAr: "نشط" },
  pending: { variant: "warning", labelEn: "Pending", labelAr: "معلق" },
  late: { variant: "danger", labelEn: "Late", labelAr: "متأخر" },
  completed: { variant: "neutral", labelEn: "Completed", labelAr: "مكتمل" },
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
function VehicleConditionPanel({ ar, carImages, sketchItems, onSketchChange }: {
  ar: boolean; carImages: string[]; sketchItems: SketchItem[]; onSketchChange: (items: SketchItem[]) => void;
}) {
  const [view, setView] = useState<"diagram" | "photos">("diagram");
  const [damageNotes, setDamageNotes] = useState("");
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
            onChange={e => setDamageNotes(e.target.value)}
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

function VehicleSummaryPanel({ ar, odometer }: { ar: boolean; odometer: number }) {
  const fuelPct = Math.round((7 / 8) * 100);
  const [noteOpen, setNoteOpen] = useState<Record<string, boolean>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Record<string, string>>({});
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
    reader.onload = () => setPhotos(p => ({ ...p, [key]: reader.result as string }));
    reader.readAsDataURL(file);
  }

  const INDICATORS = [
    { icon: Gauge, label: T("Current odometer", "عداد الكيلومتر الحالي", ar), value: `${odometer.toLocaleString()} ${T("km", "كم", ar)}` },
    { icon: Droplet, label: T("Current fuel", "الوقود الحالي", ar), value: `${fuelPct}% ${T("Gasoline", "بنزين", ar)}` },
    { icon: ShieldCheck, label: T("Accident deductible", "مبلغ التحمل للحوادث", ar), value: T("0 SAR", "٠ ريال", ar) },
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
                      onChange={e => setReasons(r => ({ ...r, [key]: e.target.value }))}
                      placeholder={T("Describe the damage…", "صف الضرر…", ar)}
                      className="flex-1 min-w-0 px-3 py-2 rounded-md mk-overline text-mk-ink-900 border border-mk-blue-500/30 bg-white outline-none focus:border-mk-blue-500"
                    />
                    {photo ? (
                      <div className="relative shrink-0">
                        <img src={photo} alt="" className="w-8 h-8 rounded-md object-cover border border-mk-blue-500/30" />
                        <button type="button" onClick={() => setPhotos(p => omitKey(p, key))}
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

// ── Main Content ──────────────────────────────────────────────────
function ReturnProcessContent() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TabKey>("all");
  const [showMap, setShowMap] = useState(false);
  const [sketchItems, setSketchItems] = useState<SketchItem[]>([]);
  const [returnOdometer, setReturnOdometer] = useState("");
  const [manualLateFee, setManualLateFee] = useState("");
  const [extraKmCharge, setExtraKmCharge] = useState("");

  const allReturns = BOOKINGS.filter(b => b.type === "return" && (b.status === "active" || b.status === "late"));
  const counts: Record<TabKey, number> = {
    all: allReturns.length,
    active: allReturns.filter(b => b.status === "active").length,
    late: allReturns.filter(b => b.status === "late").length,
  };

  const filtered = allReturns.filter(b => {
    const matchTab = filter === "all" || b.status === filter;
    const q = query.toLowerCase();
    const matchQ = !query || b.id.toLowerCase().includes(q) || b.customer.toLowerCase().includes(q) || b.phone.includes(query) || b.car.toLowerCase().includes(q) || b.plate.toLowerCase().includes(q);
    return matchTab && matchQ;
  });

  // ── Detail / return process view ──────────────────────────────
  if (id) {
    const contract = BOOKINGS.find(b => b.id === id);
    if (!contract) return (
      <div className="py-24 text-center">
        <div className="mk-display mb-3">📋</div>
        <div className="mk-body mb-2 text-mk-ink-900">{T("Contract not found", "العقد غير موجود", ar)}</div>
        <Link href="/employee/return" className="mk-body-sm text-mk-blue-500 no-underline">{T("← Back", "→ العودة", ar)}</Link>
      </div>
    );
    const carKey = ["Camry", "Sonata", "Elantra", "Civic", "Sportage", "Patrol", "CX-5", "Land Cruiser", "Tahoe", "ZS"].find(k => contract.car.includes(k)) || "Sonata";
    const carImages = CAR_IMAGES[carKey] || CAR_IMAGES["Sonata"];
    const isLate = contract.status === "late";
    const carObj = CARS.find(c => c.plate === contract.plate);
    const subtotal = Math.round(contract.amount / 1.15);
    const vat = contract.amount - subtotal;
    const baseRate = Math.round(subtotal * 0.9);
    const insurance = subtotal - baseRate;

    const pickupOdometer = carObj ? 12450 + carObj.id * 3150 : 47820;
    const odometerNum = parseFloat(returnOdometer);
    const odometerEntered = returnOdometer.trim() !== "" && !isNaN(odometerNum);
    const tripKm = odometerEntered ? Math.max(0, odometerNum - pickupOdometer) : null;
    const kmCapNum = carObj && carObj.kmCap !== "Unlimited" ? Number(carObj.kmCap) : null;
    const isOverKm = tripKm != null && kmCapNum != null && tripKm > kmCapNum;

    const noDamage = sketchItems.length === 0;

    const lateFeePerHour = carObj?.lateFeePerHour ?? 35;
    const lateFeeNum = manualLateFee !== "" ? (parseFloat(manualLateFee) || 0) : (isLate ? lateFeePerHour : 0);
    const extraKmNum = extraKmCharge !== "" ? (parseFloat(extraKmCharge) || 0) : 0;
    const finalTotal = contract.amount + lateFeeNum + extraKmNum;

    return (
      <div className="flex flex-col gap-4">
        {/* Back nav */}
        <div className="flex items-center gap-3">
          <Link href="/employee/return" className="w-9 h-9 rounded-full flex items-center justify-center bg-white shadow-[var(--shadow-card)] text-mk-ink-600 no-underline hover:bg-mk-ink-50 transition-colors">
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
                  <div className="mk-caption mt-1 text-mk-ink-600">{T(`${lateFeePerHour} SAR/hr after 1h grace · +${lateFeeNum} SAR currently`, `${lateFeePerHour} ريال/س بعد ساعة سماح · +${lateFeeNum} ريال حالياً`, ar)}</div>
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

            <div className="flex items-center gap-3 px-4 py-3 rounded-md mb-2 bg-mk-mint-600/8 border border-mk-mint-600/30">
              <div className="w-6 h-6 rounded-sm flex items-center justify-center shrink-0 text-white bg-mk-mint-600">
                <Check size={14} />
              </div>
              <Fuel size={16} className="text-mk-ink-500 shrink-0" />
              <span className="mk-body-sm text-mk-ink-500">{T("Fuel level matches pickup · 7/8", "مستوى الوقود مطابق · ٧/٨", ar)}</span>
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

            {/* Late fee / extra km — entered by employee on receipt */}
            {(isLate || isOverKm) && (
              <div className="flex flex-col gap-3 py-3">
                {isLate && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="mk-body-sm text-mk-ink-900 shrink-0">{T("Late fee amount", "مبلغ غرامة التأخر", ar)}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={manualLateFee}
                      onChange={e => setManualLateFee(e.target.value)}
                      placeholder={String(lateFeePerHour)}
                      className="w-[100px] px-2 py-1 rounded-md mk-body-sm text-mk-danger border border-mk-ink-200 bg-white outline-none focus:border-mk-blue-500"
                    />
                    <span className="mk-caption text-mk-ink-500">{T("SAR", "ر.س", ar)}</span>
                  </div>
                )}
                {isOverKm && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="mk-body-sm text-mk-ink-900 shrink-0">{T("Extra km charge", "رسوم الكيلومترات الزائدة", ar)}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={extraKmCharge}
                      onChange={e => setExtraKmCharge(e.target.value)}
                      placeholder="0"
                      className="w-[100px] px-2 py-1 rounded-md mk-body-sm text-mk-danger border border-mk-ink-200 bg-white outline-none focus:border-mk-blue-500"
                    />
                    <span className="mk-caption text-mk-ink-500">{T("SAR", "ر.س", ar)}</span>
                  </div>
                )}
              </div>
            )}

            <Button variant="primary" className="w-full justify-center mt-4 shadow-[var(--shadow-glow-blue)]">
              <Tablet size={16} />{T("Pass to customer", "سلّم للعميل", ar)}
            </Button>
          </div>

          {/* Right: condition + invoice */}
          <div className="flex flex-col gap-4">
            <VehicleConditionPanel ar={ar} carImages={carImages} sketchItems={sketchItems} onSketchChange={setSketchItems} />
            <VehicleSummaryPanel ar={ar} odometer={odometerEntered ? odometerNum : pickupOdometer} />

            {/* Invoice */}
            <div className="rounded-xl p-6 mk-surface">
              <div className="mk-h4 mb-6 text-mk-ink-900">{T("Final invoice", "الفاتورة النهائية", ar)}</div>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between mk-label"><span className="text-mk-ink-600">{T("Base rental", "الإيجار الأساسي", ar)}</span><span className="text-mk-ink-900">{baseRate.toLocaleString()} {T("SAR", "ر.س", ar)}</span></div>
                <div className="flex justify-between mk-label"><span className="text-mk-ink-600">{T("Insurance", "التأمين", ar)}</span><span className="text-mk-ink-900">{insurance.toLocaleString()} {T("SAR", "ر.س", ar)}</span></div>
                {lateFeeNum > 0 && <div className="flex justify-between mk-label"><span className="text-mk-danger">{T("Late fee", "غرامة التأخر", ar)}</span><span className="text-mk-danger">+{lateFeeNum} {T("SAR", "ر.س", ar)}</span></div>}
                {extraKmNum > 0 && <div className="flex justify-between mk-label"><span className="text-mk-danger">{T("Extra km charge", "رسوم الكيلومترات الزائدة", ar)}</span><span className="text-mk-danger">+{extraKmNum} {T("SAR", "ر.س", ar)}</span></div>}
                <div className="border-t border-dashed border-mk-ink-100 my-1" />
                <div className="flex justify-between mk-label"><span className="text-mk-ink-400">{T("VAT 15%", "ضريبة 15%", ar)}</span><span className="text-mk-ink-400">{vat.toLocaleString()} {T("SAR", "ر.س", ar)}</span></div>
                <div className="flex justify-between items-center pt-3 border-t border-mk-ink-100"><span className="mk-h4 text-mk-ink-900">{T("Final total", "الإجمالي النهائي", ar)}</span><span className="mk-h4" style={{ color: isLate ? "var(--color-mk-danger)" : "var(--color-mk-ink-900)" }}>{finalTotal.toLocaleString()} {T("SAR", "ريال", ar)}</span></div>
                <div className="flex justify-between mk-caption text-mk-ink-500">
                  <span>{T(`Captured: ${contract.amount.toLocaleString()} SAR`, `تم حجز: ${contract.amount.toLocaleString()} ريال`, ar)}</span>
                  <span className={`mk-label ${(lateFeeNum + extraKmNum) > 0 ? "text-mk-danger" : "text-mk-mint-600"}`}>{(lateFeeNum + extraKmNum) > 0 ? `+${lateFeeNum + extraKmNum} ${T("SAR due", "ريال مستحق", ar)}` : T("No remaining balance", "لا رصيد متبقي", ar)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        {showMap && <VehicleMapPanel ar={ar} contract={contract} onClose={() => setShowMap(false)} />}
      </div>
    );
  }

  // ── List / Table view ──────────────────────────────────────────
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
                <tr key={b.id}
                  className={`cursor-pointer transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50 ${isLate ? "bg-mk-danger/[0.025]" : ""}`}
                  onClick={() => router.push(`/employee/return?id=${b.id}`)}
                >
                  <Td>
                    <div className="font-mono mk-label text-mk-blue-600">{b.id}</div>
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
                  <Td className={isLate ? "text-mk-danger mk-label" : "text-mk-ink-700 mk-label"}>{b.dropoff}</Td>
                  <Td>
                    <div className="mk-label text-mk-ink-900">{b.amount.toLocaleString()}</div>
                    <div className="mk-overline text-mk-ink-400">{T("SAR", "ر.س", ar)}</div>
                  </Td>
                  <Td>
                    <Badge variant={sm.variant} dot>{ar ? sm.labelAr : sm.labelEn}</Badge>
                  </Td>
                  <Td onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <IconButton size="sm" variant="ghost" className="bg-mk-ink-50" onClick={e => { e.stopPropagation(); router.push(`/employee/return?id=${b.id}`); }}>
                        {ar ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                      </IconButton>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        {filtered.length === 0 && (
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

export default function ReturnProcessPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-mk-ink-500">Loading…</div>}>
      <ReturnProcessContent />
    </Suspense>
  );
}
