// ─────────────────────────────────────────────────────────────
//  Fleet helpers & constants
// ─────────────────────────────────────────────────────────────

import { CarStatus } from "@/lib/data";
import * as Types from "@/lib/api-types";
import type { SketchItem, DamageType } from "@/lib/tajeer";

export const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

export const formatEnumName = (name: string) =>
  name.replace(/([A-Z])/g, " $1").replace(/^\s/, "").trim();

export const enumOptions = (enumObj: any, labels?: Record<string, string>) =>
  Object.entries(enumObj)
    .filter(([, value]) => typeof value === "number")
    .map(([name, value]) => (
      <option key={value as number} value={value as number}>
        {labels?.[name] || formatEnumName(name)}
      </option>
    ));

export const AR_LABELS: Record<string, string> = {
  Sedan: "سيدان",
  SUV: "SUV",
  Coupe: "كوبيه",
  Hatchback: "هاتشباك",
  Truck: "شاحنة",
  Van: "بضائع",
  Motorcycle: "دراجة نارية",
  Economy: "اقتصادية",
  Compact: "صغيرة",
  Midsize: "متوسطة",
  Fullsize: "كبيرة",
  Luxury: "فاخرة",
  Sports: "رياضية",
  Commercial: "تجارية",
  Petrol: "بنزين",
  Diesel: "ديزل",
  Electric: "كهربائية",
  Hybrid: "هجينة",
  Automatic: "أوتوماتيك",
  Manual: "يدوي",
  Available: "متاح",
  Rented: "مؤجر",
  Maintenance: "صيانة",
  Reserved: "محجوز",
  Inactive: "غير نشط",
  Draft: "مسودة",
  Overdue: "متأخر",
  Full: "ممتلئ",
  ThreeQuarters: "ثلاثة أرباع",
  Half: "نصف",
  Quarter: "ربع",
  Empty: "فارغ",
  Synthetic: "اصطناعي",
  SemiSynthetic: "نصف اصطناعي",
  Mineral: "معدني",
  Other: "آخر",
  Excellent: "ممتاز",
  Good: "جيد",
  Weak: "ضعيف",
  NotWorking: "لا يعمل",
  Working: "يعمل",
  Clean: "نظيف",
  Dirty: "متسخ",
  NotAvailable: "غير متوفر",
};

export const STATUS_BADGE_VARIANT: Record<CarStatus, "success" | "info" | "danger" | "warning" | "violet" | "neutral"> = {
  available: "success",
  rented: "info",
  overdue: "danger",
  maintenance: "warning",
  reserved: "violet",
  inactive: "neutral",
  draft: "neutral",
};

export const TYPE_ICON: Record<string, string> = {
  سيدان: "🚗",
  SUV: "🚙",
  MPV: "🚐",
};

export function emptyVehicleForm() {
  return {
    plateTypeId: "",
    plateNumber: "",
    plateFirstLetter: "",
    plateSecondLetter: "",
    plateThirdLetter: "",
    registrationNumber: "",
    registrationExpiryDate: "",
    inspectionExpiryDate: "",
    serialNumber: "",
    operationCardNumber: "",
    operationCardExpiryDate: "",
    customsNumber: "",
    otherNotes: "",
    makeId: "",
    modelId: "",
    year: "",
    color: "",
    vin: "",
    engineNumber: "",
    payloadKg: "",
    bodyType: "",
    category: "",
    seats: "",
    cylinders: "",
    fuelType: "",
    transmissionType: "",
    branchId: "",
    insuranceCompanyId: "",
    insuranceTypeId: "",
    insurancePolicyNumber: "",
    insuranceExpiryDate: "",
    insuranceAmount: "",
    dailyRate: "",
    extraKilometerRate: "",
    fullFuelRate: "",
    lateHourRate: "",
    isKilometerLimitEnabled: false,
    dailyKilometerLimit: "",
    // Tajeer / Condition
    tajeerNotes: "",
    status: Types.VehicleFleetStatus.Available,
    isListingActive: true,
    odometerReading: "",
    fuelLevel: Types.FuelLevel.Full,
    enduranceAmount: "",
    oilType: Types.VehicleOilType.Synthetic,
    lastOilChangeDate: new Date().toISOString().split("T")[0],
    oilChangeDistance: "",
    airConditionGrade: Types.ConditionGrade.Good,
    radioStatus: Types.WorkingStatus.Working,
    screenStatus: Types.WorkingStatus.Working,
    odometerStatus: Types.WorkingStatus.Working,
    seatCleanliness: Types.CleanlinessStatus.Clean,
    keyStatus: Types.WorkingStatus.Working,
    tireCondition: Types.TireCondition.Good,
    spareTireStatus: Types.PresenceStatus.Available,
    fireExtinguisherStatus: Types.PresenceStatus.Available,
    firstAidKitStatus: Types.PresenceStatus.Available,
    safetyTriangleStatus: Types.PresenceStatus.Available,
    tireToolsStatus: Types.PresenceStatus.Available,
    featureTypeIds: [] as number[],
    sketchItems: [] as SketchItem[],
  };
}

export const DAMAGE_TYPE_TO_ENUM: Record<DamageType, number> = {
  "small-scratch": Types.VehicleDamageType.SmallScratch,
  "deep-scratch": Types.VehicleDamageType.DeepScratch,
  "very-deep-scratch": Types.VehicleDamageType.VeryDeepScratch,
  "bend-in-body": Types.VehicleDamageType.BendInBody,
};

export const ENUM_TO_DAMAGE_TYPE: Record<number, DamageType> = {
  [Types.VehicleDamageType.SmallScratch]: "small-scratch",
  [Types.VehicleDamageType.DeepScratch]: "deep-scratch",
  [Types.VehicleDamageType.VeryDeepScratch]: "very-deep-scratch",
  [Types.VehicleDamageType.BendInBody]: "bend-in-body",
};

// SketchComponent's canvas coordinate space (see CAR_W/CAR_H in
// components/employee/SketchComponent.tsx) — the backend expects positions
// as a 0–100 percentage instead, so we rescale in both directions.
const SKETCH_CANVAS_W = 2196;
const SKETCH_CANVAS_H = 1003;

export function mapSketchItemsToDamagePoints(items: SketchItem[]) {
  return (items || []).map((item) => ({
    damageType: DAMAGE_TYPE_TO_ENUM[item.type] || Types.VehicleDamageType.SmallScratch,
    positionX: Math.round((item.x / SKETCH_CANVAS_W) * 1000) / 10,
    positionY: Math.round((item.y / SKETCH_CANVAS_H) * 1000) / 10,
    note: item.note || undefined,
  }));
}

export function mapDamagePointsToSketchItems(points: any[]): SketchItem[] {
  return (Array.isArray(points) ? points : []).map((p) => ({
    type: ENUM_TO_DAMAGE_TYPE[p.damageType] || "small-scratch",
    x: ((p.positionX ?? 0) / 100) * SKETCH_CANVAS_W,
    y: ((p.positionY ?? 0) / 100) * SKETCH_CANVAS_H,
    note: p.note || undefined,
  }));
}

const firstDefined = (...values: any[]) => {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
};

const toDateInput = (value: any) =>
  typeof value === "string" && value.length >= 10 ? value.slice(0, 10) : "";

export function mapVehicleToForm(raw: any) {
  const v = raw?.data ?? raw ?? {};
  const asObject = (value: any) =>
    value && typeof value === "object" && !Array.isArray(value) ? value : {};

  const plate = asObject(v.plate ?? v.plateDocs);
  const info = asObject(v.info ?? v.vehicleInfo);
  const pricing = asObject(v.insurancePricing ?? v.pricing);
  const tajeer = asObject(v.tajeerStatus ?? v.status);

  const empty = emptyVehicleForm();

  return {
    ...empty,

    plateTypeId: firstDefined(plate.plateTypeId, v.plateTypeId) ?? "",
    plateNumber: firstDefined(plate.plateNumber, v.plateNumber) ?? "",
    plateFirstLetter: firstDefined(plate.plateFirstLetter, v.plateFirstLetter, v.plateChar1) ?? "",
    plateSecondLetter: firstDefined(plate.plateSecondLetter, v.plateSecondLetter, v.plateChar2) ?? "",
    plateThirdLetter: firstDefined(plate.plateThirdLetter, v.plateThirdLetter, v.plateChar3) ?? "",
    registrationNumber: firstDefined(plate.registrationNumber, v.registrationNumber, v.istamaraNumber) ?? "",
    registrationExpiryDate: toDateInput(
      firstDefined(plate.registrationExpiryDate, v.registrationExpiryDate, v.istamaraExpiry)
    ),
    inspectionExpiryDate: toDateInput(
      firstDefined(plate.inspectionExpiryDate, v.inspectionExpiryDate, v.periodicInspectionExpiry)
    ),
    serialNumber: firstDefined(plate.serialNumber, v.serialNumber) ?? "",
    operationCardNumber: firstDefined(plate.operationCardNumber, v.operationCardNumber) ?? "",
    operationCardExpiryDate: toDateInput(
      firstDefined(plate.operationCardExpiryDate, v.operationCardExpiryDate)
    ),
    customsNumber: firstDefined(plate.customsNumber, v.customsNumber) ?? "",
    otherNotes: firstDefined(plate.otherNotes, v.otherNotes) ?? "",

    makeId: firstDefined(info.makeId, v.makeId) ?? "",
    modelId: firstDefined(info.modelId, v.modelId) ?? "",
    year: firstDefined(info.year, v.year) ?? "",
    color: firstDefined(info.color, v.color) ?? "",
    vin: firstDefined(info.vin, v.vin, v.chassisNumber) ?? "",
    engineNumber: firstDefined(info.engineNumber, v.engineNumber) ?? "",
    payloadKg: firstDefined(info.payloadKg, v.payloadKg) ?? "",
    bodyType: firstDefined(info.bodyType, v.bodyType) ?? "",
    category: firstDefined(info.category, v.category) ?? "",
    seats: firstDefined(info.seats, v.seats) ?? "",
    cylinders: firstDefined(info.cylinders, v.cylinders) ?? "",
    fuelType: firstDefined(info.fuelType, v.fuelType, v.fuelTypeCode) ?? "",
    transmissionType: firstDefined(info.transmissionType, v.transmissionType) ?? "",

    branchId: firstDefined(pricing.branchId, v.branchId) ?? "",
    insuranceCompanyId: firstDefined(pricing.insuranceCompanyId, v.insuranceCompanyId) ?? "",
    insuranceTypeId: firstDefined(pricing.insuranceTypeId, v.insuranceTypeId) ?? "",
    insurancePolicyNumber: firstDefined(pricing.insurancePolicyNumber, v.insurancePolicyNumber) ?? "",
    insuranceExpiryDate: toDateInput(
      firstDefined(pricing.insuranceExpiryDate, v.insuranceExpiryDate, v.insuranceExpiry)
    ),
    insuranceAmount: firstDefined(pricing.insuranceAmount, v.insuranceAmount) ?? "",
    dailyRate: firstDefined(pricing.dailyRate, v.dailyRate) ?? "",
    extraKilometerRate: firstDefined(pricing.extraKilometerRate, v.extraKilometerRate, v.extraKmCost) ?? "",
    fullFuelRate: firstDefined(pricing.fullFuelRate, v.fullFuelRate, v.fullFuelCost) ?? "",
    lateHourRate: firstDefined(pricing.lateHourRate, v.lateHourRate, v.lateFeePerHour) ?? "",
    isKilometerLimitEnabled: firstDefined(
      pricing.isKilometerLimitEnabled,
      v.isKilometerLimitEnabled
    ) ?? false,
    dailyKilometerLimit: firstDefined(pricing.dailyKilometerLimit, v.dailyKilometerLimit) ?? "",

    tajeerNotes: firstDefined(tajeer.notes, v.notes, v.otherNotes) ?? "",
    status: firstDefined(tajeer.status, v.status, v.fleetStatus) ?? empty.status,
    isListingActive: firstDefined(tajeer.isListingActive, v.isListingActive) ?? true,
    odometerReading: firstDefined(tajeer.odometerReading, v.odometerReading) ?? "",
    fuelLevel: firstDefined(tajeer.fuelLevel, v.fuelLevel) ?? empty.fuelLevel,
    enduranceAmount: firstDefined(tajeer.enduranceAmount, v.enduranceAmount) ?? "",
    oilType: firstDefined(tajeer.oilType, v.oilType) ?? empty.oilType,
    lastOilChangeDate:
      toDateInput(firstDefined(tajeer.lastOilChangeDate, v.lastOilChangeDate, v.oilChangeDate)) ||
      empty.lastOilChangeDate,
    oilChangeDistance: firstDefined(tajeer.oilChangeDistance, v.oilChangeDistance) ?? "",
    airConditionGrade:
      firstDefined(tajeer.airConditionGrade, v.airConditionGrade) ?? empty.airConditionGrade,
    radioStatus: firstDefined(tajeer.radioStatus, v.radioStatus) ?? empty.radioStatus,
    screenStatus: firstDefined(tajeer.screenStatus, v.screenStatus) ?? empty.screenStatus,
    odometerStatus: firstDefined(tajeer.odometerStatus, v.odometerStatus) ?? empty.odometerStatus,
    seatCleanliness: firstDefined(tajeer.seatCleanliness, v.seatCleanliness) ?? empty.seatCleanliness,
    keyStatus: firstDefined(tajeer.keyStatus, v.keyStatus) ?? empty.keyStatus,
    tireCondition: firstDefined(tajeer.tireCondition, v.tireCondition) ?? empty.tireCondition,
    spareTireStatus: firstDefined(tajeer.spareTireStatus, v.spareTireStatus) ?? empty.spareTireStatus,
    fireExtinguisherStatus:
      firstDefined(tajeer.fireExtinguisherStatus, v.fireExtinguisherStatus) ??
      empty.fireExtinguisherStatus,
    firstAidKitStatus:
      firstDefined(tajeer.firstAidKitStatus, v.firstAidKitStatus) ?? empty.firstAidKitStatus,
    safetyTriangleStatus:
      firstDefined(tajeer.safetyTriangleStatus, v.safetyTriangleStatus) ?? empty.safetyTriangleStatus,
    tireToolsStatus: firstDefined(tajeer.tireToolsStatus, v.tireToolsStatus) ?? empty.tireToolsStatus,
    featureTypeIds: Array.isArray(v.featureTypeIds) ? v.featureTypeIds : [],
    sketchItems: mapDamagePointsToSketchItems(v.damagePoints),
  };
}

export function extractVehicleImageFileIds(raw: any): number[] {
  const v = raw?.data ?? raw ?? {};
  const images = v.images ?? v.vehicleImages ?? [];
  return (Array.isArray(images) ? images : [])
    .map((img: any) => img?.fileId ?? img?.id ?? img?.attachmentId)
    .filter((id: any): id is number => typeof id === "number");
}

export const buildVehiclePayload = (form: any, imageFileIds: number[] = []) => ({
  plate: {
    plateTypeId: form.plateTypeId ? Number(form.plateTypeId) : undefined,
    plateNumber: form.plateNumber || undefined,
    plateFirstLetter: form.plateFirstLetter || "",
    plateSecondLetter: form.plateSecondLetter || "",
    plateThirdLetter: form.plateThirdLetter || "",
    registrationNumber: form.registrationNumber || undefined,
    registrationExpiryDate: form.registrationExpiryDate || undefined,
    inspectionExpiryDate: form.inspectionExpiryDate || undefined,
    serialNumber: form.serialNumber || undefined,
    operationCardNumber: form.operationCardNumber || undefined,
    operationCardExpiryDate: form.operationCardExpiryDate || undefined,
    customsNumber: form.customsNumber || undefined,
    otherNotes: form.otherNotes || undefined,
  },
  info: {
    makeId: Number(form.makeId),
    modelId: Number(form.modelId),
    year: Number(form.year),
    color: form.color || "White",
    vin: form.vin || "UNKNOWN",
    engineNumber: form.engineNumber || undefined,
    payloadKg: form.payloadKg ? Number(form.payloadKg) : undefined,
    bodyType: form.bodyType ? Number(form.bodyType) : 1,
    category: form.category ? Number(form.category) : 1,
    seats: form.seats ? Number(form.seats) : undefined,
    cylinders: form.cylinders ? Number(form.cylinders) : undefined,
    fuelType: form.fuelType ? Number(form.fuelType) : 1,
    transmissionType: form.transmissionType ? Number(form.transmissionType) : 1,
  },
  insurancePricing: {
    branchId: form.branchId ? Number(form.branchId) : undefined,
    insuranceCompanyId: form.insuranceCompanyId ? Number(form.insuranceCompanyId) : undefined,
    insuranceTypeId: form.insuranceTypeId ? Number(form.insuranceTypeId) : undefined,
    insurancePolicyNumber: form.insurancePolicyNumber || "POL-0000",
    insuranceExpiryDate: form.insuranceExpiryDate || undefined,
    insuranceAmount: Number(form.insuranceAmount) || 0,
    dailyRate: Number(form.dailyRate) || 0,
    extraKilometerRate: Number(form.extraKilometerRate) || 0,
    fullFuelRate: Number(form.fullFuelRate) || 0,
    lateHourRate: Number(form.lateHourRate) || 0,
    isKilometerLimitEnabled: !!form.isKilometerLimitEnabled,
    dailyKilometerLimit: form.dailyKilometerLimit ? Number(form.dailyKilometerLimit) : undefined,
  },
  // Backend requires these fields to be present (non-nullable collections/object)
  tajeerStatus: {
    status: Number(form.status) || Types.VehicleFleetStatus.Available,
    notes: form.tajeerNotes || "",
    isListingActive: !!form.isListingActive,
    odometerReading: Number(form.odometerReading) || 0,
    fuelLevel:
      form.fuelLevel === "" || form.fuelLevel == null
        ? Types.FuelLevel.Full
        : Number(form.fuelLevel),
    enduranceAmount: Number(form.enduranceAmount) || 0,
    oilType:
      form.oilType === "" || form.oilType == null
        ? Types.VehicleOilType.Synthetic
        : Number(form.oilType),
    lastOilChangeDate: form.lastOilChangeDate || new Date().toISOString().split("T")[0],
    oilChangeDistance: Number(form.oilChangeDistance) || 0,
    airConditionGrade:
      form.airConditionGrade === "" || form.airConditionGrade == null
        ? Types.ConditionGrade.Good
        : Number(form.airConditionGrade),
    radioStatus:
      form.radioStatus === "" || form.radioStatus == null
        ? Types.WorkingStatus.Working
        : Number(form.radioStatus),
    screenStatus:
      form.screenStatus === "" || form.screenStatus == null
        ? Types.WorkingStatus.Working
        : Number(form.screenStatus),
    odometerStatus:
      form.odometerStatus === "" || form.odometerStatus == null
        ? Types.WorkingStatus.Working
        : Number(form.odometerStatus),
    seatCleanliness:
      form.seatCleanliness === "" || form.seatCleanliness == null
        ? Types.CleanlinessStatus.Clean
        : Number(form.seatCleanliness),
    keyStatus:
      form.keyStatus === "" || form.keyStatus == null
        ? Types.WorkingStatus.Working
        : Number(form.keyStatus),
    tireCondition:
      form.tireCondition === "" || form.tireCondition == null
        ? Types.TireCondition.Good
        : Number(form.tireCondition),
    spareTireStatus:
      form.spareTireStatus === "" || form.spareTireStatus == null
        ? Types.PresenceStatus.Available
        : Number(form.spareTireStatus),
    fireExtinguisherStatus:
      form.fireExtinguisherStatus === "" || form.fireExtinguisherStatus == null
        ? Types.PresenceStatus.Available
        : Number(form.fireExtinguisherStatus),
    firstAidKitStatus:
      form.firstAidKitStatus === "" || form.firstAidKitStatus == null
        ? Types.PresenceStatus.Available
        : Number(form.firstAidKitStatus),
    safetyTriangleStatus:
      form.safetyTriangleStatus === "" || form.safetyTriangleStatus == null
        ? Types.PresenceStatus.Available
        : Number(form.safetyTriangleStatus),
    tireToolsStatus:
      form.tireToolsStatus === "" || form.tireToolsStatus == null
        ? Types.PresenceStatus.Available
        : Number(form.tireToolsStatus),
  },
  featureTypeIds: (form.featureTypeIds || []).map((id: any) => Number(id)),
  images: imageFileIds.length
    ? imageFileIds.map((fileId: number, i: number) => ({
        slotCode: i === 0 ? "front" : `view-${i + 1}`,
        fileId,
        isPrimary: i === 0,
        sortOrder: i + 1,
      }))
    : ([] as any[]),
  damagePoints: mapSketchItemsToDamagePoints(form.sketchItems || []),
});

export const validateStep = (
  form: any,
  currentStep: number,
  ar: boolean,
  showToast: (msg: string) => void
): boolean => {
  if (currentStep === 1) {
    if (!form.makeId || !form.modelId || !form.year) {
      showToast(T("Please fill make, model and year", "الرجاء تعبئة الصانع والموديل والسنة", ar));
      return false;
    }
    if (!form.bodyType || !form.category || !form.fuelType || !form.transmissionType) {
      showToast(T("Please fill body type, category, fuel and transmission", "الرجاء تعبئة نوع الهيكل والفئة والوقود والناقل", ar));
      return false;
    }
  }
  if (currentStep === 2) {
    if (!form.plateTypeId) {
      showToast(T("Please select plate type", "الرجاء اختيار نوع اللوحة", ar));
      return false;
    }
    if (!form.plateNumber) {
      showToast(T("Please fill plate number", "الرجاء تعبئة رقم اللوحة", ar));
      return false;
    }
    if (!form.plateFirstLetter || !form.plateSecondLetter || !form.plateThirdLetter) {
      showToast(T("Please fill plate letters", "الرجاء تعبئة حروف اللوحة", ar));
      return false;
    }
  }
  if (currentStep === 3) {
    if (!form.branchId) {
      showToast(T("Please select branch", "الرجاء اختيار الفرع", ar));
      return false;
    }
    if (!form.dailyRate) {
      showToast(T("Please fill daily rate", "الرجاء تعبئة السعر اليومي", ar));
      return false;
    }
  }
  if (currentStep === 4) {
    if (!form.odometerReading || !form.lastOilChangeDate) {
      showToast(T("Please fill odometer and last oil change date", "الرجاء تعبئة عداد المسافات وتاريخ آخر تغيير زيت", ar));
      return false;
    }
  }
  return true;
};

export const mapStatusFromBackend = (status: number): CarStatus => {
  const statusMap: Record<number, CarStatus> = {
    1: "available",
    2: "rented",
    3: "overdue",
    4: "maintenance",
    5: "reserved",
    6: "inactive",
    7: "draft",
  };
  return statusMap[status] || "available";
};

export const STATUS_TABS: { key: "all" | CarStatus; labelEn: string; labelAr: string }[] = [
  { key: "all", labelEn: "All", labelAr: "الكل" },
  { key: "available", labelEn: "Available", labelAr: "متاحة" },
  { key: "rented", labelEn: "Rented", labelAr: "مؤجرة" },
  { key: "overdue", labelEn: "Overdue", labelAr: "متأخر" },
  { key: "maintenance", labelEn: "Maintenance", labelAr: "صيانة" },
  { key: "reserved", labelEn: "Reserved", labelAr: "محجوزة" },
];

export type VehicleFieldPanel = "basic" | "insurance" | "status";

export interface VehicleRequiredField {
  key: string;
  labelEn: string;
  labelAr: string;
  panel: VehicleFieldPanel;
}

export const VEHICLE_REQUIRED_FIELDS: VehicleRequiredField[] = [
  { key: "makeId", labelEn: "Make", labelAr: "الصانع", panel: "basic" },
  { key: "modelId", labelEn: "Model", labelAr: "الموديل", panel: "basic" },
  { key: "year", labelEn: "Year", labelAr: "سنة الصنع", panel: "basic" },
  { key: "bodyType", labelEn: "Body type", labelAr: "نوع الهيكل", panel: "basic" },
  { key: "category", labelEn: "Category", labelAr: "الفئة", panel: "basic" },
  { key: "fuelType", labelEn: "Fuel type", labelAr: "نوع الوقود", panel: "basic" },
  { key: "transmissionType", labelEn: "Transmission", labelAr: "ناقل الحركة", panel: "basic" },
  { key: "seats", labelEn: "Seats", labelAr: "عدد المقاعد", panel: "basic" },
  { key: "plateTypeId", labelEn: "Plate type", labelAr: "نوع اللوحة", panel: "basic" },
  { key: "plateNumber", labelEn: "Plate number", labelAr: "رقم اللوحة", panel: "basic" },
  { key: "plateFirstLetter", labelEn: "Plate 1st letter", labelAr: "الحرف الأول للوحة", panel: "basic" },
  { key: "plateSecondLetter", labelEn: "Plate 2nd letter", labelAr: "الحرف الثاني للوحة", panel: "basic" },
  { key: "plateThirdLetter", labelEn: "Plate 3rd letter", labelAr: "الحرف الثالث للوحة", panel: "basic" },
  { key: "branchId", labelEn: "Branch", labelAr: "الفرع", panel: "insurance" },
  { key: "insuranceCompanyId", labelEn: "Insurance company", labelAr: "شركة التأمين", panel: "insurance" },
  { key: "insuranceTypeId", labelEn: "Insurance type", labelAr: "نوع التأمين", panel: "insurance" },
  { key: "insuranceAmount", labelEn: "Insurance amount", labelAr: "قيمة التأمين", panel: "insurance" },
  { key: "dailyRate", labelEn: "Daily rate", labelAr: "السعر اليومي", panel: "insurance" },
  { key: "odometerReading", labelEn: "Odometer reading", labelAr: "قراءة العداد", panel: "status" },
  { key: "lastOilChangeDate", labelEn: "Last oil change date", labelAr: "تاريخ آخر تغيير زيت", panel: "status" },
];

export const VEHICLE_FIELD_PANEL_MAP: Record<string, VehicleFieldPanel> = {
  makeId: "basic", modelId: "basic", year: "basic", color: "basic", vin: "basic", engineNumber: "basic",
  bodyType: "basic", category: "basic", seats: "basic", cylinders: "basic", fuelType: "basic", transmissionType: "basic",
  plateTypeId: "basic", plateNumber: "basic", plateFirstLetter: "basic", plateSecondLetter: "basic", plateThirdLetter: "basic",
  registrationNumber: "basic", registrationExpiryDate: "basic", inspectionExpiryDate: "basic", serialNumber: "basic",
  branchId: "insurance", insuranceCompanyId: "insurance", insuranceTypeId: "insurance", insurancePolicyNumber: "insurance",
  insuranceExpiryDate: "insurance", insuranceAmount: "insurance", dailyRate: "insurance", extraKilometerRate: "insurance",
  fullFuelRate: "insurance", lateHourRate: "insurance", isKilometerLimitEnabled: "insurance", dailyKilometerLimit: "insurance",
  status: "status", isListingActive: "status", odometerReading: "status", fuelLevel: "status", enduranceAmount: "status",
  oilType: "status", lastOilChangeDate: "status", oilChangeDistance: "status", airConditionGrade: "status",
  radioStatus: "status", screenStatus: "status", odometerStatus: "status", seatCleanliness: "status", keyStatus: "status",
  tireCondition: "status", spareTireStatus: "status", fireExtinguisherStatus: "status", firstAidKitStatus: "status",
  safetyTriangleStatus: "status", tireToolsStatus: "status", tajeerNotes: "status",
};

export function getMissingVehicleFields(form: any): VehicleRequiredField[] {
  return VEHICLE_REQUIRED_FIELDS.filter((f) => {
    const v = form?.[f.key];
    return v === undefined || v === null || v === "";
  });
}

export function calcVehicleCompletion(form: any, photoCount: number) {
  const missing = getMissingVehicleFields(form);
  const total = VEHICLE_REQUIRED_FIELDS.length + 1; // +1 for photos
  const done = VEHICLE_REQUIRED_FIELDS.length - missing.length + (photoCount >= 4 ? 1 : 0);
  return { pct: Math.round((done / total) * 100), missing };
}

export const STATS = [
  { labelEn: "Available", labelAr: "متاحة", key: "available", cls: "text-mk-mint-600" },
  { labelEn: "Rented", labelAr: "مؤجرة", key: "rented", cls: "text-mk-blue-500" },
  { labelEn: "Overdue", labelAr: "متأخر", key: "overdue", cls: "text-mk-danger" },
  { labelEn: "Maintenance", labelAr: "صيانة", key: "maintenance", cls: "text-mk-warning" },
  { labelEn: "Reserved", labelAr: "محجوزة", key: "reserved", cls: "text-mk-blue-600" },
  { labelEn: "Inactive", labelAr: "معطلة", key: "inactive", cls: "text-mk-ink-400" },
];
