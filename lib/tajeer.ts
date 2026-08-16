// ─────────────────────────────────────────────────────────────────────────────
//  Maarkbh · مركبة — Tajeer API service layer
//  Mock implementation (MOCK_MODE = true) — swap to real API calls in production
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_MODE = true;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// ─── Types ────────────────────────────────────────────────────────────────────

export type TajeerIdType = 1 | 2 | 3 | 4;
// 1 = Saudi, 2 = Iqama (Resident), 3 = Visitor, 4 = GCC

export type TajeerContractType = 1 | 2 | 3 | 4;
// 1 = daily-no-driver, 2 = hourly-no-driver, 3 = daily-with-driver, 4 = hourly-with-driver

export type DamageType = "small-scratch" | "deep-scratch" | "very-deep-scratch" | "bend-in-body";

export interface SketchItem {
  type: DamageType;
  x: number; // 0–893
  y: number; // 0–429
  note?: string; // Custom description note
  photo?: string; // Data URL of an attached photo
}

export interface TajeerRenter {
  idTypeCode: TajeerIdType;
  idNumber: string;
  mobile: string;
  personAddress: string;
  hijriBirthDate?: number;   // yyyymmdd as integer — Saudi only
  birthDate?: string;        // yyyy-mm-dd — non-Saudi
  email?: string;            // required for Visitor/GCC
  passportNumber?: string;   // required for Visitor outside GCC
  nationalityCode?: number;  // required for Visitor/GCC
  driveLicenseNumber?: string;
  licenseExpiryDate?: string;
  idExpiryDate?: string;
  issuePlaceId?: number;
  idCopyNumber?: string;
}

export interface TajeerAuthorizedDriver {
  idTypeCode: TajeerIdType;
  idNumber: string;
  birthDate?: string;
  hijriBirthDate?: number;
  mobile?: string;
  authorizationStartDate?: string;   // yyyy-mm-dd — optional
  authorizationEndDate?: string;     // yyyy-mm-dd — required when authorizedDriver is set
  authorizationTypeCode?: "internal" | "external";
}

export interface TajeerExtraDriver {
  idTypeCode: TajeerIdType;
  idNumber: string;
  personAddress?: string;
  birthDate?: string;
  hijriBirthDate?: number;
}

export interface TajeerVehicleDetails {
  plateNumber: number;   // digits only
  firstChar: string;     // Arabic letter e.g. "ا"
  secondChar: string;
  thirdChar: string;
  plateType: 1 | 3;     // 1 = private, 3 = private transport
  operationCardNumber?: string;
  operationCardExpiryDate?: string; // yyyy-mm-dd
}

export interface TajeerRentStatus {
  ac: number;                  // 1=Excellent, 2=Good, 3=Weak, 4=Not Working
  radioStereo: number;
  screen: number;
  speedometer: number;         // 4=Not Working, 5=Working
  keys: number;
  carSeats: number;            // 6=Clean, 7=Dirty
  tires: number;               // 1=Excellent, 2=Good, 3=Weak
  spareTire: number;
  safetyTriangle: number;      // 8=Available, 9=Not Available
  fireExtinguisher: number;
  firstAidKit: number;
  spareTireTools: number;
  availableFuel: number;       // 1=Full, 2=3/4, 3=Half, 4=1/4, 5=Empty
  odometerReading: number;
  fuelTypeCode: number;        // 1=Petrol, 2=Diesel, 3=Electric, 4=Hybrid
  enduranceAmount: number;     // deductible — CANNOT be changed after save
  oilChangeKmDistance: number;
  oilChangeDate: string;       // yyyy-mm-dd
  oilType: string;
  sketchInfo?: string;         // JSON string of SketchItem[]
  notes?: string;              // max 130 chars
}

export interface TajeerPaymentDetails {
  rentDayCost?: number;        // required for daily contracts; max 50,000
  rentHourCost?: number;       // required for hourly contracts
  extraKmCost: number;
  fullFuelCost: number;
  discount: number;            // 0–100 %
  paid: number;
  paymentMethodCode?: number;  // required if paid > 0
  otherPaymentMethodCode?: number;
  driverFarePerDay?: number;   // required if contractType = 3
  driverFarePerHour?: number;  // required if contractType = 4
  vehicleTransferCost?: number; // required if receiveBranch ≠ returnBranch
  internationalAuthorizationCost?: number;
  extraDriverCost?: number;
  additionalCoverageCost?: number;
  extendedCoverageId?: number;
}

export interface TajeerSaveContractRequest {
  renter: TajeerRenter;
  authorizedDriver?: TajeerAuthorizedDriver;
  extraDriver?: TajeerExtraDriver;
  vehicleDetails: TajeerVehicleDetails;
  paymentDetails: TajeerPaymentDetails;
  rentStatus: TajeerRentStatus;
  workingBranchId: number;
  receiveBranchId: number;
  returnBranchId: number;
  rentPolicyId: number;
  contractStartDate: string;   // ISO
  contractEndDate: string;
  contractTypeCode: TajeerContractType;
  allowedKmPerDay?: number;
  allowedKmPerHour?: number;
  allowedLateHours: number;
  unlimitedKm?: boolean;
  operatorId: number;
  extendedCoverageId?: number;
}

export interface TajeerPaymentSummary {
  paid: number;
  remaining: number;
  total: number;
  vatAmount?: number;
}

export interface TajeerSaveContractResponse {
  contractNumber: number;
  token: string;
  issuanceURL: string;
  mainPaymentDetails: TajeerPaymentSummary;
  totalPaymentDetails: TajeerPaymentSummary;
}

export interface TajeerBranch {
  id: number;
  nameAr: string;
  nameEn: string;
  city: string;
  address: string;
}

export interface TajeerRentPolicy {
  id: number;
  nameAr: string;
  nameEn: string;
  description?: string;
}

export interface TajeerExtendedCoverage {
  id: number;
  nameAr: string;
  nameEn: string;
  description?: string;
  maxCostMultiplier?: number; // coverage cost max = dailyRate * this
}

export interface TajeerContract {
  contractNumber: number;
  contractStatusCode: 1 | 2 | 4; // 1=New, 2=Closed, 4=Active
  renter: TajeerRenter;
  vehicleDetails: TajeerVehicleDetails;
  contractStartDate: string;
  contractEndDate: string;
  mainPaymentDetails: TajeerPaymentSummary;
}

// ─── Lookup tables ────────────────────────────────────────────────────────────

export const TAJEER_LOOKUPS = {
  fuelTypes: [
    { code: 1, ar: "بنزين", en: "Petrol" },
    { code: 2, ar: "ديزل", en: "Diesel" },
    { code: 3, ar: "كهربائي", en: "Electric" },
    { code: 4, ar: "هجين", en: "Hybrid" },
  ],
  availableFuelOptions: [
    { code: 1, ar: "ممتلئ", en: "Full" },
    { code: 2, ar: "ثلاثة أرباع", en: "3/4" },
    { code: 3, ar: "نصف", en: "Half" },
    { code: 4, ar: "ربع", en: "1/4" },
    { code: 5, ar: "فارغ", en: "Empty" },
  ],
  acOptions: [
    { code: 1, ar: "ممتاز", en: "Excellent" },
    { code: 2, ar: "جيد", en: "Good" },
    { code: 3, ar: "ضعيف", en: "Weak" },
    { code: 4, ar: "لا يعمل", en: "Not Working" },
  ],
  workingOptions: [
    { code: 5, ar: "يعمل", en: "Working" },
    { code: 4, ar: "لا يعمل", en: "Not Working" },
  ],
  seatsOptions: [
    { code: 6, ar: "نظيف", en: "Clean" },
    { code: 7, ar: "غير نظيف", en: "Dirty" },
  ],
  tiresOptions: [
    { code: 1, ar: "ممتاز", en: "Excellent" },
    { code: 2, ar: "جيد", en: "Good" },
    { code: 3, ar: "ضعيف", en: "Weak" },
  ],
  availableOptions: [
    { code: 8, ar: "موجود", en: "Available" },
    { code: 9, ar: "غير موجود", en: "Not Available" },
  ],
  idTypes: [
    { code: 1, ar: "هوية وطنية", en: "National ID" },
    { code: 2, ar: "مقيم", en: "Iqama" },
    { code: 3, ar: "زائر", en: "Visitor" },
    { code: 4, ar: "خليجي", en: "GCC" },
  ],
  contractTypes: [
    { code: 1, ar: "يومي بدون سائق", en: "Daily - No Driver" },
    { code: 2, ar: "ساعة بدون سائق", en: "Hourly - No Driver" },
    { code: 3, ar: "يومي مع سائق", en: "Daily - With Driver" },
    { code: 4, ar: "ساعة مع سائق", en: "Hourly - With Driver" },
  ],
} as const;

// ─── Mock API implementations ─────────────────────────────────────────────────

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export async function tajeerGetBranches(): Promise<TajeerBranch[]> {
  if (MOCK_MODE) {
    await delay(rand(800, 1000));
    return [
      { id: 1, nameAr: "الرياض — العليا", nameEn: "Riyadh — Olaya", city: "Riyadh", address: "طريق الملك فهد، العليا" },
      { id: 2, nameAr: "جدة — التهليا", nameEn: "Jeddah — Tahlia", city: "Jeddah", address: "شارع التهليا، جدة" },
      { id: 3, nameAr: "الدمام — الفيصلية", nameEn: "Dammam — Al-Faisaliyah", city: "Dammam", address: "شارع الأمير محمد بن فهد، الدمام" },
    ];
  }
  // Real implementation:
  // const res = await fetch(`${BASE_URL}/branch/all`, { headers: TAJEER_HEADERS });
  // return res.json();
  throw new Error("Not implemented");
}

export async function tajeerGetRentPolicies(): Promise<TajeerRentPolicy[]> {
  if (MOCK_MODE) {
    await delay(rand(800, 1000));
    return [
      { id: 101, nameAr: "السياسة القياسية", nameEn: "Standard Policy", description: "سياسة التأجير الافتراضية" },
      { id: 102, nameAr: "سياسة الشركات", nameEn: "Corporate Policy", description: "للعملاء المؤسسيين" },
    ];
  }
  throw new Error("Not implemented");
}

export async function tajeerGetExtendedCoverage(): Promise<TajeerExtendedCoverage[]> {
  if (MOCK_MODE) {
    await delay(rand(800, 1000));
    return [
      { id: 201, nameAr: "تغطية أساسية", nameEn: "Basic Coverage", description: "تغطية الحوادث الأساسية", maxCostMultiplier: 1 },
      { id: 202, nameAr: "تغطية شاملة", nameEn: "Comprehensive Coverage", description: "تغطية كاملة بدون تحمل شخصي", maxCostMultiplier: 2 },
      { id: 203, nameAr: "تغطية مميزة", nameEn: "Premium Coverage", description: "تغطية شاملة مع خدمات إضافية", maxCostMultiplier: 2 },
    ];
  }
  throw new Error("Not implemented");
}

export async function tajeerSaveContract(
  data: TajeerSaveContractRequest
): Promise<TajeerSaveContractResponse> {
  if (MOCK_MODE) {
    await delay(rand(1000, 1200));

    const contractNumber = 21000000000000 + rand(100000, 999999);
    const token = uuid();
    const issuanceURL = `https://tajeer.logisti.sa/#/public-contract/${contractNumber}/${token}`;

    const dailyRate = data.paymentDetails.rentDayCost ?? data.paymentDetails.rentHourCost ?? 0;
    const subtotal = dailyRate;
    const vat = Math.round(subtotal * 0.15);
    const total = subtotal + vat;

    return {
      contractNumber,
      token,
      issuanceURL,
      mainPaymentDetails: {
        paid: data.paymentDetails.paid,
        remaining: total - data.paymentDetails.paid,
        total,
        vatAmount: vat,
      },
      totalPaymentDetails: {
        paid: data.paymentDetails.paid,
        remaining: total - data.paymentDetails.paid,
        total,
        vatAmount: vat,
      },
    };
  }
  throw new Error("Not implemented");
}

export async function tajeerGetContract(
  contractNumber: number
): Promise<TajeerContract> {
  if (MOCK_MODE) {
    await delay(rand(800, 1000));
    return {
      contractNumber,
      contractStatusCode: 4, // Active
      renter: {
        idTypeCode: 1,
        idNumber: "1077002211",
        mobile: "966501234567",
        personAddress: "Riyadh",
        hijriBirthDate: 14430109,
      },
      vehicleDetails: {
        plateNumber: 1234,
        firstChar: "ا",
        secondChar: "ب",
        thirdChar: "ج",
        plateType: 1,
      },
      contractStartDate: new Date().toISOString(),
      contractEndDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      mainPaymentDetails: {
        paid: 0,
        remaining: 1500,
        total: 1500,
        vatAmount: 195,
      },
    };
  }
  throw new Error("Not implemented");
}

export async function tajeerCancelContract(contractNumber: number): Promise<void> {
  if (MOCK_MODE) {
    await delay(rand(800, 1000));
    console.log(`[Tajeer Mock] Contract ${contractNumber} cancelled`);
    return;
  }
  throw new Error("Not implemented");
}

export async function tajeerValidateContract(
  data: TajeerSaveContractRequest
): Promise<void> {
  if (MOCK_MODE) {
    await delay(rand(600, 900));
    // No-op in mock mode
    return;
  }
  throw new Error("Not implemented");
}

export async function tajeerGetContractPDF(
  contractNumber: number
): Promise<Blob> {
  if (MOCK_MODE) {
    await delay(rand(800, 1200));
    // Return minimal PDF bytes
    const pdfContent = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF`;
    return new Blob([pdfContent], { type: "application/pdf" });
  }
  throw new Error("Not implemented");
}
