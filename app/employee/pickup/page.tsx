"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Armchair, Camera, ChevronLeft, ChevronRight, CircleDot, FireExtinguisher,
  Fuel, Gauge, HeartPulse, KeyRound, MapPin, Monitor, Music, Phone, Plug, Search,
  ShieldCheck, TriangleAlert, Wind, Wrench,
} from "lucide-react";
import { Avatar, Badge, Button, Checkbox, Input, SuccessDialog, Table, Tabs, Td, Th } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { SketchComponent } from "@/components/employee/SketchComponent";
import { VehicleMapPanel } from "@/components/employee/VehicleMapPanel";
import { type Booking } from "@/lib/data";
import { contractService, vehicleService } from "@/lib/api-services";
import * as Types from "@/lib/api-types";
import { extractVehicleImageFileIds, mapDamagePointsToSketchItems } from "@/lib/fleet";
import { formatPlate, normalizeKycStatus } from "@/lib/formatting";
import type { SketchItem } from "@/lib/tajeer";

const T = (en: string, ar: string, isAr: boolean) => isAr ? ar : en;

type TabKey = "all" | "pending" | "active";
const TABS: { key: TabKey; en: string; ar: string }[] = [
  { key: "all", en: "All", ar: "الكل" },
  { key: "pending", en: "Pending", ar: "معلقة" },
  { key: "active", en: "In Progress", ar: "قيد التنفيذ" },
];

const STATUS_MAP: Record<string, { variant: "success" | "warning" | "danger" | "neutral"; en: string; ar: string }> = {
  active: { variant: "success", en: "Active", ar: "نشط" },
  pending: { variant: "warning", en: "Pending", ar: "معلق" },
  late: { variant: "danger", en: "Late", ar: "متأخر" },
  completed: { variant: "neutral", en: "Completed", ar: "مكتمل" },
};


function CarPhotos({ images, ar }: { images: string[]; ar: boolean }) {
  const [index, setIndex] = useState(0);
  const baseLabels = [T("Front", "أمامي", ar), T("Back", "خلفي", ar), T("Driver side", "جهة السائق", ar), T("Passenger side", "جهة الراكب", ar)];
  const labels = Array.from({ length: Math.max(4, images.length) }, (_, index) => baseLabels[index] ?? `${T("Photo", "صورة", ar)} ${index + 1}`);
  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-52 overflow-hidden rounded-lg bg-mk-ink-50">
        {labels.map((label, i) => {
          const source = images[i];
          const flipped = source?.endsWith("#flipped");
          const src = flipped ? source.replace("#flipped", "") : source;
          return (
            <div key={label} className="absolute inset-0 transition-opacity duration-300" style={{ opacity: index === i ? 1 : 0, zIndex: index === i ? 1 : 0 }}>
              {src ? <img src={src} alt={label} className="h-full w-full object-cover" style={{ transform: flipped ? "scaleX(-1)" : undefined }} /> : (
                <div className="flex h-full flex-col items-center justify-center gap-2 border-2 border-dashed border-mk-ink-200 text-mk-ink-400"><Camera size={28} /><span className="mk-caption">{label}</span></div>
              )}
              <span className="absolute bottom-2 start-2 rounded-sm bg-black/50 px-2 py-1 text-white mk-overline">{label}</span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {labels.map((label, i) => <button key={label} type="button" onClick={() => setIndex(i)} className={`h-9 w-12 overflow-hidden rounded-sm border ${index === i ? "border-mk-blue-500 ring-1 ring-mk-blue-500" : "border-mk-ink-200 opacity-60"}`}>
          {images[i] ? <img src={images[i].replace("#flipped", "")} alt="" className="h-full w-full object-cover" /> : <Camera size={12} className="m-auto text-mk-ink-400" />}
        </button>)}
      </div>
    </div>
  );
}

function PickupDetailView({ id, ar }: { id: string; ar: boolean }) {
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [showMap, setShowMap] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [conditionView, setConditionView] = useState<"diagram" | "photos">("diagram");
  const [contract, setContract] = useState<Booking>({
    id: "",
    customer: "",
    customerInitials: "",
    phone: "",
    car: "",
    plate: "",
    date: "",
    time: "",
    dropoff: "",
    branch: "",
    type: "pickup",
    status: "pending",
    kyc: "pending",
    amount: 0,
    flagged: false,
  });
  const [deliveryForm, setDeliveryForm] = useState<Types.DeliveryFormResponse | null>(null);
  const [vehicle, setVehicle] = useState<any>(null);
  const [vehicleSketch, setVehicleSketch] = useState<SketchItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const contractResponse = await contractService.getById(id);
        const raw = contractResponse?.data ?? contractResponse;
        if (!raw?.id) throw new Error(T("Contract not found", "العقد غير موجود", ar));
        const customer = (ar ? raw.customerNameAr : raw.customerNameEn) ?? raw.customerNameAr ?? raw.customerNameEn ?? "";
        const start = raw.startAt ? new Date(raw.startAt) : null;
        const mapped: Booking = {
          id: String(raw.contractNumber ?? raw.id),
          customer,
          customerInitials: customer.slice(0, 2),
          phone: raw.customerPhone ?? "",
          car: [ar ? raw.vehicleMakeNameAr : raw.vehicleMakeNameEn, ar ? raw.vehicleModelNameAr : raw.vehicleModelNameEn, raw.vehicleYear].filter(Boolean).join(" "),
          plate: formatPlate(raw.vehicle ?? raw) || String(raw.vehiclePlateNumber ?? ""),
          date: start && !isNaN(start.getTime()) ? start.toLocaleDateString() : "",
          time: start && !isNaN(start.getTime()) ? start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
          dropoff: raw.endAt ? new Date(raw.endAt).toLocaleDateString() : "",
          branch: (ar ? raw.workingBranchNameAr : raw.workingBranchNameEn) ?? raw.workingBranchNameAr ?? raw.workingBranchNameEn ?? "",
          type: "pickup",
          status: Number(raw.status) === 3 ? "active" : "pending",
          kyc: normalizeKycStatus(raw.customerVerificationStatus),
          amount: Number(raw.totalAmount ?? 0),
          flagged: Boolean(raw.isFlagged),
        };
        if (!cancelled) setContract(mapped);
        const [formResult, recordResult, vehicleResult] = await Promise.all([
          contractService.getDeliveryForm(id).catch(() => null),
          contractService.getDelivery(id).catch(() => null),
          raw.vehicleId ? vehicleService.getById(raw.vehicleId).catch(() => null) : Promise.resolve(null),
        ]);
        const form = formResult ? formResult.data ?? formResult : null;
        const record = recordResult?.data ?? recordResult;
        const vehicleData = vehicleResult?.data ?? vehicleResult;
        if (!cancelled) {
          setDeliveryForm(form);
          setVehicle(vehicleData);
          setVehicleSketch(vehicleData ? mapDamagePointsToSketchItems(vehicleData.damagePoints) : null);
          setConfirmed(Boolean(record));
          if (!form) {
            setError(T("The delivery form is unavailable. Vehicle details are shown, but handover cannot be confirmed.", "نموذج التسليم غير متاح. تم عرض بيانات المركبة، ولكن لا يمكن تأكيد التسليم.", ar));
          } else {
            const formCustomer = (ar ? form.customer?.nameAr : form.customer?.nameEn) ?? form.customer?.nameAr ?? form.customer?.nameEn;
            const formVehicle = form.vehicle;
            setContract((current) => ({
              ...current,
              id: String(form.contractNumber ?? current.id),
              customer: formCustomer ?? current.customer,
              customerInitials: (formCustomer ?? current.customer).slice(0, 2),
              phone: form.customer?.phone ?? current.phone,
              car: formVehicle ? [ar ? formVehicle.makeNameAr : formVehicle.makeNameEn, ar ? formVehicle.modelNameAr : formVehicle.modelNameEn, formVehicle.year].filter(Boolean).join(" ") : current.car,
              plate: formVehicle ? [formVehicle.plateNumber, formVehicle.plateLetters].filter(Boolean).join(" ") : current.plate,
              branch: (ar ? form.branchNameAr : form.branchNameEn) ?? form.branchNameAr ?? form.branchNameEn ?? current.branch,
              kyc: normalizeKycStatus(form.customer?.verificationStatus ?? current.kyc),
            }));
            const initialChecks = [...Object.entries(form.basicInspection ?? {}), ...Object.entries(form.vehicleEquipment ?? {})]
              .reduce<Record<string, boolean>>((result, [key, inspection]) => {
                result[key] = inspection?.isOk === true;
                return result;
              }, {});
            setChecks(initialChecks);
          }
        }
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : T("Unable to load handover", "تعذر تحميل التسليم", ar));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, ar]);

  const odometer = Number(deliveryForm?.odometerReading ?? vehicle?.odometerReading ?? 0);
  const fuelLevel = Number(deliveryForm?.fuelLevel ?? vehicle?.fuelLevel ?? Types.FuelLevel.Empty);
  const basicInspection = deliveryForm?.basicInspection ?? {};
  const vehicleEquipment = deliveryForm?.vehicleEquipment ?? {};
  const displayValue = (inspection?: Types.HandoverInspectionDisplayItem) => {
    const value = (ar ? inspection?.valueAr : inspection?.valueEn) ?? inspection?.value ?? "—";
    return inspection?.note ? `${value} · ${inspection.note}` : String(value);
  };
  const formImageIds = [...(deliveryForm?.images ?? [])]
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((image) => image.fileId);
  const imageIds = formImageIds.length ? formImageIds : extractVehicleImageFileIds(vehicle);
  const carImages = Array.from(new Set(imageIds)).map((fileId) => `/api/attachments/${fileId}/download`);
  const deliveryFormSketch: SketchItem[] = (deliveryForm?.sketchInfoAtDelivery ?? []).map((mark) => ({
    type: mark.type as SketchItem["type"],
    x: Number(mark.x ?? 0),
    y: Number(mark.y ?? 0),
    note: mark.note ?? undefined,
  }));
  const sketchItems = vehicleSketch ?? deliveryFormSketch;

  const baseItems = [
    { key: "odometerReading", icon: Gauge, label: T("Odometer reading", "قراءة عداد الكيلومترات", ar), value: displayValue(basicInspection.odometerReading) },
    { key: "fuelLevel", icon: Fuel, label: T("Fuel level", "مستوى الوقود", ar), value: displayValue(basicInspection.fuelLevel) },
    { key: "tires", icon: CircleDot, label: T("Tire condition", "حالة الإطارات", ar), value: displayValue(basicInspection.tires) },
    { key: "windshield", icon: Wind, label: T("Windshield condition", "حالة الزجاج الأمامي", ar), value: displayValue(basicInspection.windshield) },
    { key: "bodyDamage", icon: ShieldCheck, label: T("Body and damage condition", "حالة الهيكل والأضرار", ar), value: displayValue(basicInspection.bodyDamage) },
    { key: "keys", icon: KeyRound, label: T("Keys", "المفاتيح", ar), value: displayValue(basicInspection.keys) },
    { key: "safetyTriangle", icon: TriangleAlert, label: T("Warning triangle", "مثلث التحذير", ar), value: displayValue(basicInspection.safetyTriangle) },
    { key: "firstAidKit", icon: HeartPulse, label: T("First aid kit", "حقيبة الإسعافات الأولية", ar), value: displayValue(basicInspection.firstAidKit) },
    { key: "fireExtinguisher", icon: FireExtinguisher, label: T("Fire extinguisher", "طفاية الحريق", ar), value: displayValue(basicInspection.fireExtinguisher) },
    { key: "speedometer", icon: Gauge, label: T("Speedometer condition", "حالة عداد السرعة", ar), value: displayValue(basicInspection.speedometer) },
  ];
  const equipment = [
    { key: "spareKey", icon: KeyRound, label: T("Spare key", "المفتاح الاحتياطي", ar), value: displayValue(vehicleEquipment.spareKey) },
    { key: "spareTire", icon: CircleDot, label: T("Spare tire", "الإطار الاحتياطي", ar), value: displayValue(vehicleEquipment.spareTire) },
    { key: "spareTireTools", icon: Wrench, label: T("Essential vehicle tools", "أدوات السيارة الأساسية", ar), value: displayValue(vehicleEquipment.spareTireTools) },
    { key: "carSeats", icon: Armchair, label: T("Seat condition", "حالة المقاعد", ar), value: displayValue(vehicleEquipment.carSeats) },
    { key: "ac", icon: Wind, label: T("Air conditioning", "التكييف", ar), value: displayValue(vehicleEquipment.ac) },
    { key: "screen", icon: Monitor, label: T("Screen", "الشاشة", ar), value: displayValue(vehicleEquipment.screen) },
    { key: "radioStereo", icon: Music, label: T("Audio system / Radio", "النظام الصوتي / الراديو", ar), value: displayValue(vehicleEquipment.radioStereo) },
    { key: "powerOutlet", icon: Plug, label: T("Power outlet", "منفذ الطاقة", ar), value: displayValue(vehicleEquipment.powerOutlet) },
    { key: "smokingOdor", icon: Wind, label: T("Smoking odor inside vehicle", "رائحة تدخين داخل المركبة", ar), value: displayValue(vehicleEquipment.smokingOdor) },
  ];
  const allItems = [...baseItems, ...equipment];
  const allDone = allItems.every((item) => checks[item.key]);
  const toggleGroup = (items: typeof allItems) => {
    if (confirmed) return;
    const done = items.every((item) => checks[item.key]);
    setChecks((current) => ({ ...current, ...Object.fromEntries(items.map((item) => [item.key, !done])) }));
  };
  const item = (key: string, inspection?: Types.HandoverInspectionDisplayItem, value?: number): Types.DeliveryInspectionItem => ({
    isOk: Boolean(checks[key]),
    note: inspection?.note ?? null,
    ...(inspection?.attachmentId ? { attachmentId: inspection.attachmentId } : {}),
    value: value ?? (inspection?.value != null ? Number(inspection.value) : null),
  });
  const handleConfirm = async () => {
    setSubmitting(true);
    setError("");
    try {
      await contractService.recordDelivery(id, {
        sketchInfoAtDelivery: sketchItems.map((mark) => ({
          type: mark.type,
          x: mark.x,
          y: mark.y,
          note: mark.note || null,
        })),
        basicInspection: {
          odometerReading: item("odometerReading", basicInspection.odometerReading, odometer),
          fuelLevel: item("fuelLevel", basicInspection.fuelLevel, fuelLevel),
          tires: item("tires", basicInspection.tires),
          windshield: item("windshield", basicInspection.windshield),
          bodyDamage: item("bodyDamage", basicInspection.bodyDamage),
          keys: item("keys", basicInspection.keys),
          safetyTriangle: item("safetyTriangle", basicInspection.safetyTriangle),
          firstAidKit: item("firstAidKit", basicInspection.firstAidKit),
          fireExtinguisher: item("fireExtinguisher", basicInspection.fireExtinguisher),
          speedometer: item("speedometer", basicInspection.speedometer),
        },
        vehicleEquipment: {
          spareKey: item("spareKey", vehicleEquipment.spareKey),
          spareTire: item("spareTire", vehicleEquipment.spareTire),
          spareTireTools: item("spareTireTools", vehicleEquipment.spareTireTools),
          carSeats: item("carSeats", vehicleEquipment.carSeats),
          ac: item("ac", vehicleEquipment.ac),
          screen: item("screen", vehicleEquipment.screen),
          radioStereo: item("radioStereo", vehicleEquipment.radioStereo),
          powerOutlet: item("powerOutlet", vehicleEquipment.powerOutlet),
          smokingOdor: item("smokingOdor", vehicleEquipment.smokingOdor),
        },
        conditionNotes: deliveryForm?.conditionNotes ?? null,
        photos: Array.from(new Map(
          (deliveryForm?.images ?? [])
            .filter((photo) => photo.fileId > 0)
            .map((photo) => [photo.fileId, { label: photo.label ?? photo.source ?? "vehicle", attachmentId: photo.fileId }]),
        ).values()),
      });
      const savedRecord = await contractService.getDelivery(id);
      if (!(savedRecord?.data ?? savedRecord)) throw new Error(T("The handover was not persisted", "لم يتم حفظ حالة التسليم", ar));
      setConfirmed(true);
      setShowSuccess(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : T("Handover failed", "فشل تأكيد التسليم", ar));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link href="/pickup" className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-mk-ink-600 shadow-[var(--shadow-card)] no-underline">{ar ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}</Link>
        <span className="flex-1 mk-body-sm text-mk-ink-500">{T("Back to Handovers", "العودة للقائمة", ar)}</span>
        <Button variant="primary" size="sm" disabled={!deliveryForm || !allDone || confirmed || submitting || loading} onClick={handleConfirm}><KeyRound size={16} />{submitting ? T("Confirming…", "جارٍ التأكيد…", ar) : confirmed ? T("Handover confirmed", "تم تأكيد التسليم", ar) : T("Confirm handover", "تأكيد التسليم", ar)}</Button>
      </div>

      <SuccessDialog
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        tone="mint"
        title={T("Handover confirmed!", "تم تسليم المركبة بنجاح!", ar)}
        subtitle={<span className="font-mono">{contract.id}</span>}
        description={T("The vehicle condition was recorded and the rental is now in progress.", "تم تثبيت حالة المركبة وبدأت فترة الإيجار.", ar)}
        details={[
          { label: T("Customer", "العميل", ar), value: contract.customer },
          { label: T("Vehicle", "المركبة", ar), value: `${contract.car} · ${contract.plate}` },
          { label: T("Odometer", "العداد", ar), value: `${odometer.toLocaleString()} ${T("km", "كم", ar)}` },
          { label: T("Photos recorded", "الصور المسجّلة", ar), value: carImages.length },
        ]}
        actions={<>
          <Link href="/pickup" className="no-underline"><Button variant="primary">{T("Back to Handovers", "العودة للقائمة", ar)}</Button></Link>
          <Button variant="outline" onClick={() => setShowSuccess(false)}>{T("View handover", "عرض التسليم", ar)}</Button>
        </>}
      />
      {error && <div className="rounded-xl border border-mk-danger/20 bg-mk-danger/5 p-4 mk-caption text-mk-danger">{error}</div>}
      {loading && <div className="rounded-xl p-8 text-center mk-surface mk-body-sm text-mk-ink-500">{T("Loading handover…", "جارٍ تحميل التسليم…", ar)}</div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl p-5 mk-surface">
          <div className="mb-6 flex items-center gap-3"><h2 className="flex-1 mk-h4 text-mk-ink-900">{T(`Handover · ${contract.id}`, `تسليم · ${contract.id}`, ar)}</h2><Badge variant={confirmed ? "success" : "warning"} dot>{confirmed ? T("Completed", "مكتمل", ar) : T("In progress", "قيد التنفيذ", ar)}</Badge></div>
          <div className="flex items-center gap-3 border-b border-mk-ink-100 py-3"><Avatar name={contract.customer} size="lg" /><div className="min-w-0 flex-1"><div className="mk-body text-mk-ink-900">{contract.customer}</div><div dir="ltr" className="mk-caption text-mk-ink-500">{contract.phone} · {T("KYC Verified", "الهوية موثقة", ar)}</div></div><a href={`tel:${contract.phone}`} className="flex h-9 w-9 items-center justify-center rounded-full border border-mk-ink-200 text-mk-ink-600"><Phone size={14} /></a></div>
          <div className="flex items-center gap-3 border-b border-mk-ink-100 py-3"><div className="h-11 w-16 shrink-0 overflow-hidden rounded-md bg-mk-ink-50">{carImages[0] && <img src={carImages[0]} alt={contract.car} className="h-full w-full object-cover" />}</div><div className="min-w-0 flex-1"><div className="mk-body text-mk-ink-900">{contract.car}</div><div className="mk-caption text-mk-ink-500">{contract.plate} · {contract.branch}</div></div><button type="button" onClick={() => setShowMap(true)} className="flex h-9 w-9 items-center justify-center rounded-full border border-mk-ink-200 bg-white text-mk-ink-600"><MapPin size={14} /></button></div>

          {([[T("Mandatory inspection", "الفحص الأساسي", ar), baseItems], [T("Vehicle equipment", "تجهيزات المركبة", ar), equipment]] as const).map(([title, items], index) => {
            const done = items.filter((item) => checks[item.key]).length;
            return <div key={title} className={index ? "mt-4 border-t border-mk-ink-100 pt-4" : "mt-4"}><button type="button" disabled={confirmed} onClick={() => toggleGroup([...items])} className="mb-3 flex w-full items-center gap-2.5 bg-transparent text-start disabled:cursor-default"><Checkbox readOnly checked={done === items.length} /><span className="flex-1 mk-label text-mk-ink-900">{title}</span><span className="mk-caption tabular-nums text-mk-ink-500">{done}/{items.length}</span></button><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{items.map(({ key, icon: Icon, label, value }) => <button key={key} type="button" disabled={confirmed} onClick={() => setChecks((current) => ({ ...current, [key]: !current[key] }))} className="flex min-w-0 items-start gap-2 rounded-md bg-transparent px-3 py-2 text-start hover:bg-mk-ink-50 disabled:cursor-default disabled:hover:bg-transparent"><Checkbox readOnly checked={Boolean(checks[key])} className="mt-px" /><div className="min-w-0 flex-1"><div className="flex items-center gap-1.5 mk-caption font-medium text-mk-ink-900"><Icon size={14} className="shrink-0 text-mk-ink-500" /><span className="truncate">{label}</span></div><div className="mt-1 truncate ps-5 mk-caption text-mk-ink-500">{value}</div></div></button>)}</div></div>;
          })}
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-xl p-5 mk-surface"><div className="mb-5 flex items-center gap-3"><h2 className="flex-1 mk-h4 text-mk-ink-900">{T("Vehicle Condition", "حالة المركبة", ar)}</h2><Tabs variant="tonal" size="xs" value={conditionView} onChange={(value) => setConditionView(value as "diagram" | "photos")} items={[{ value: "diagram", label: T("Diagram", "المخطط", ar) }, { value: "photos", label: T("Photos", "الصور", ar) }]} /></div>{conditionView === "diagram" ? <div className="flex w-full items-center justify-center rounded-lg"><SketchComponent value={sketchItems} onChange={() => {}} ar={ar} disabled /></div> : <CarPhotos images={carImages} ar={ar} />}</div>
          <div className="rounded-xl p-5 mk-surface"><div className="mb-4 flex items-center justify-between"><h2 className="mk-h4 text-mk-ink-900">{T("Vehicle photos", "صور المركبة", ar)}</h2><Badge variant="neutral">{carImages.length}/4</Badge></div><CarPhotos images={carImages} ar={ar} /><p className="mt-4 mk-caption text-mk-ink-500">{T("Photos come from the vehicle file.", "الصور من ملف المركبة.", ar)}</p></div>
        </div>
      </div>
      {showMap && <VehicleMapPanel ar={ar} contract={contract} onClose={() => setShowMap(false)} />}
    </div>
  );
}

function PickupListView({ ar }: { ar: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TabKey>("all");
  const [pickups, setPickups] = useState<(Booking & { contractId: number | string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const response = await contractService.searchPendingDeliveries({
          search: query,
          pageNumber: 1,
          pageSize: 50,
        });
        const items = Array.isArray(response?.items) ? response.items : Array.isArray(response) ? response : [];
        const mapped: (Booking & { contractId: number | string })[] = items.map((raw: any) => {
          const customer = (ar ? raw.customerNameAr : raw.customerNameEn) ?? raw.customerNameAr ?? raw.customerNameEn ?? "";
          const start = raw.startAt ? new Date(raw.startAt) : null;
          return {
            contractId: raw.id,
            id: String(raw.contractNumber ?? raw.id),
            customer,
            customerInitials: customer.slice(0, 2),
            phone: raw.customerPhone ?? "",
            car: [ar ? raw.vehicleMakeNameAr : raw.vehicleMakeNameEn, ar ? raw.vehicleModelNameAr : raw.vehicleModelNameEn, raw.vehicleYear].filter(Boolean).join(" "),
            plate: formatPlate(raw.vehicle ?? raw) || String(raw.vehiclePlateNumber ?? ""),
            date: start && !isNaN(start.getTime()) ? start.toLocaleDateString() : "",
            time: start && !isNaN(start.getTime()) ? start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
            dropoff: raw.endAt ? new Date(raw.endAt).toLocaleDateString() : "",
            branch: (ar ? raw.workingBranchNameAr : raw.workingBranchNameEn) ?? raw.workingBranchNameAr ?? raw.workingBranchNameEn ?? "",
            type: "pickup" as const,
            status: Number(raw.status) === 3 ? "active" : "pending",
            kyc: normalizeKycStatus(raw.customerVerificationStatus),
            amount: Number(raw.totalAmount ?? 0),
            flagged: Boolean(raw.isFlagged),
          };
        });
        if (!cancelled) setPickups(mapped);
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : T("Unable to load pickups", "تعذر تحميل قائمة التسليم", ar));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [query, ar]);

  const filtered = pickups.filter((item) => (filter === "all" || item.status === filter) && (!query || `${item.id} ${item.customer} ${item.car} ${item.plate}`.toLowerCase().includes(query.toLowerCase())));
  const counts = { all: pickups.length, pending: pickups.filter((item) => item.status === "pending").length, active: pickups.filter((item) => item.status === "active").length };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Tabs variant="default" rounded="full" value={filter} onChange={(value) => setFilter(value as TabKey)} items={TABS.map((tab) => ({ value: tab.key, label: ar ? tab.ar : tab.en, count: counts[tab.key] || undefined }))} />
        <div className="min-w-[200px] flex-1 sm:max-w-[400px]">
          <Input variant="search" icon={<Search size={14} />} placeholder={T("Search by ref, customer, plate…", "ابحث بالرقم أو الاسم أو اللوحة…", ar)} value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
      </div>
      {error && <div className="rounded-xl border border-mk-danger/20 bg-mk-danger/5 p-4 mk-caption text-mk-danger">{error}</div>}
      {loading && <div className="rounded-xl p-8 text-center mk-surface mk-body-sm text-mk-ink-500">{T("Loading pickups…", "جارٍ تحميل قائمة التسليم…", ar)}</div>}
      {!loading && pickups.length === 0 && !error && <div className="rounded-xl p-8 text-center mk-surface mk-body-sm text-mk-ink-500">{T("No pending deliveries", "لا توجد تسليمات معلقة", ar)}</div>}
      {!loading && pickups.length > 0 && (
        <div className="overflow-hidden rounded-xl mk-surface">
          <Table>
            <thead><tr>{[T("Contract", "العقد", ar), T("Customer", "العميل", ar), T("Vehicle", "المركبة", ar), T("Scheduled", "التسليم", ar), T("Amount", "المبلغ", ar), T("Status", "الحالة", ar), ""].map((heading) => <Th key={heading}>{heading}</Th>)}</tr></thead>
            <tbody>
              {filtered.map((item) => {
                const status = STATUS_MAP[item.status] ?? STATUS_MAP.pending;
                return (
                  <tr key={item.id} onClick={() => router.push(`/pickup?id=${item.contractId}`)} className="cursor-pointer hover:bg-mk-ink-50">
                    <Td><span className="font-mono mk-label text-mk-blue-600">{item.id}</span></Td>
                    <Td><div className="flex items-center gap-3"><Avatar name={item.customer} size="sm" /><div><div className="mk-label text-mk-ink-900">{item.customer}</div><div dir="ltr" className="mk-caption text-mk-ink-500">{item.phone}</div></div></div></Td>
                    <Td><div className="mk-label text-mk-ink-900">{item.car}</div><div className="mk-caption text-mk-ink-500">{item.plate}</div></Td>
                    <Td>{item.date} {item.time}</Td>
                    <Td>{item.amount.toLocaleString()} <span className="mk-overline text-mk-ink-400">{T("SAR", "ر.س", ar)}</span></Td>
                    <Td><Badge variant={status.variant} dot>{ar ? status.ar : status.en}</Badge></Td>
                    <Td>{ar ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}

function PickupContent() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const id = useSearchParams().get("id");
  return id ? <PickupDetailView id={id} ar={ar} /> : <PickupListView ar={ar} />;
}

export default function PickupHandoverPage() {
  return <Suspense fallback={<div className="p-6 text-center text-mk-ink-500">Loading…</div>}><PickupContent /></Suspense>;
}
