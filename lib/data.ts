// ─────────────────────────────────────────────────────────────
//  Maarkbh · مركبة — Mock data & type definitions
// ─────────────────────────────────────────────────────────────

export type CarStatus = "available" | "rented" | "overdue" | "maintenance" | "reserved" | "inactive" | "draft";
export type BookingStatus = "confirmed" | "pending" | "late" | "on-time" | "active" | "completed" | "cancelled";
export type KycStatus = "pending" | "verified" | "rejected";
export type RefundStatus = "pending" | "refunded" | "disputed";
export type LateStatus = "active" | "disputed" | "resolved";

// ── Car ────────────────────────────────────────────────────────
export interface Car {
  id: number;
  name: string;
  plate: string; // display plate, e.g. "ABC 1234"
  make: string;
  model: string;
  type: string;
  color: string;
  year: number;
  status: CarStatus;
  customer?: string;
  returnTime?: string;
  speed?: number | null;
  location?: string;
  mapX: number;
  mapY: number;
  dailyRate: number;
  kmCap: number | "Unlimited";
  utilization: number;
  registrationTypeCode?: 1 | 3; // 1 = private, 3 = private transport
  operationCardNumber?: string;
  operationCardExpiryDate?: string;
  oilChangeDate?: string; // next oil-change due date, yyyy-mm-dd
  insuranceAmount?: number;
  otherNotes?: string;

  // ── Tajeer-required vehicle data ──────────────────────────────
  // Plate split — Tajeer needs digits + 3 Arabic letters separately
  // (not the "ABC 1234" display string). Letters must be "ا" not "أ"
  // and "ى" not "ي" per Tajeer V9.3 normalization.
  plateNumber: number;
  plateChar1: string;
  plateChar2: string;
  plateChar3: string;
  chassisNumber: string; // VIN — mandatory for Validate Contract
  fuelTypeCode: 1 | 2 | 3 | 4; // 1=Petrol 2=Diesel 3=Electric 4=Hybrid
  extraKmCost: number; // SAR per km over the allowance — mandatory in Payment Details
  fullFuelCost: number; // SAR — mandatory in Payment Details
  lateFeePerHour: number; // SAR per hour of late return, past the allowed grace period
  enduranceAmount: number; // deductible default; cannot be edited after a contract is saved
  bodyType: string;
  seats: number;
  transmission: "Automatic" | "Manual";
  istamaraNumber: string;
  istamaraExpiry: string;
  periodicInspectionExpiry: string;
  insuranceCompany: string;
  insurancePolicyNumber: string;
  insuranceExpiry: string;
  insuranceType: "شامل" | "ضد الغير";

  // Real attachment image URLs from the backend (optional, overrides mock CAR_IMAGES)
  imageUrls?: string[];
}

// ── Booking ─────────────────────────────────────────────────
export interface Booking {
  id: string;
  customer: string;
  customerInitials: string;
  phone: string;
  car: string;
  plate: string;
  date: string;
  time: string;
  dropoff: string;
  branch: string;
  type: "pickup" | "return";
  status: BookingStatus;
  kyc: KycStatus;
  amount: number;
  flagged?: boolean;
}

// ── KYC ───────────────────────────────────────────────────────
export interface KycEntry {
  id: number;
  name: string;
  phone: string;
  since: string;
  booking: string;
  status: KycStatus;
  sla: boolean;
  docs: string[];
  initials: string;
  avatarGradient?: string;
}

// ── Late Return ───────────────────────────────────────────────
export interface LateReturn {
  ref: string;
  customer: string;
  car: string;
  due: string;
  returned: string;
  lateBy: string;
  calc: string;
  penalty: number;
  status: LateStatus;
}

// ── Blacklist Entry ───────────────────────────────────────────
export interface BlacklistEntry {
  id: string;
  idType: "Saudi ID" | "Iqama" | "Passport";
  office: string;
  reason: string;
  date: string;
  verified: boolean;
}

// ── Refund ────────────────────────────────────────────────────
export interface Refund {
  ref: string;
  customer: string;
  reason: string;
  window: string;
  original: number;
  refundAmount: number;
  status: RefundStatus;
}

// ── Staff Member ──────────────────────────────────────────────
export interface StaffMember {
  name: string;
  role: "Owner" | "Manager" | "Front Desk" | "Accountant";
  branch: string;
  lastActive: string;
  permissions: string;
}

// ── Revenue Day ───────────────────────────────────────────────
export interface RevenueDay {
  day: string;
  value: number;
  prev?: number;
}

// =============================================================
//  Mock data
// =============================================================

export const CARS: Car[] = [
  { id: 1, name: "Toyota Camry 2024",        plate: "ABC 1234", make: "Toyota",   model: "Camry",       type: "Sedan",   color: "أبيض",  year: 2024, status: "rented",      customer: "Ahmed Al-Otaibi",   returnTime: "Sun 18:00", speed: 64,   location: "King Fahd Road",    mapX: 28, mapY: 42, dailyRate: 360,  kmCap: 250,         utilization: 78, registrationTypeCode: 1, operationCardNumber: "OPC-100234", operationCardExpiryDate: "2026-11-30", oilChangeDate: "2026-09-15", insuranceAmount: 80000,
    plateNumber: 1234, plateChar1: "ا", plateChar2: "ب", plateChar3: "ج", chassisNumber: "JTNBE46K003123451", fuelTypeCode: 1, extraKmCost: 1.5, fullFuelCost: 200, lateFeePerHour: 45, enduranceAmount: 1500, bodyType: "سيدان", seats: 5, transmission: "Automatic", istamaraNumber: "1100234511", istamaraExpiry: "2027-03-10", periodicInspectionExpiry: "2027-01-15", insuranceCompany: "الراجحي تكافل", insurancePolicyNumber: "POL-10023451", insuranceExpiry: "2027-02-01", insuranceType: "شامل" },
  { id: 2, name: "Hyundai Sonata 2023",       plate: "DEF 5678", make: "Hyundai", model: "Sonata",      type: "Sedan",   color: "رمادي", year: 2023, status: "overdue",     customer: "Fahad Al-Qahtani",  returnTime: "Thu 09:30", speed: 0,    location: "Olaya Street",      mapX: 71, mapY: 56, dailyRate: 280,  kmCap: 250,         utilization: 84, registrationTypeCode: 1, operationCardNumber: "OPC-100235", operationCardExpiryDate: "2026-08-12", oilChangeDate: "2026-07-30", insuranceAmount: 60000, otherNotes: "Overdue return — follow up with customer.",
    plateNumber: 5678, plateChar1: "د", plateChar2: "ه", plateChar3: "و", chassisNumber: "KMHL14JA1PA567802", fuelTypeCode: 1, extraKmCost: 1.5, fullFuelCost: 200, lateFeePerHour: 35, enduranceAmount: 1500, bodyType: "سيدان", seats: 5, transmission: "Automatic", istamaraNumber: "1100235678", istamaraExpiry: "2026-12-20", periodicInspectionExpiry: "2026-11-05", insuranceCompany: "ولاء", insurancePolicyNumber: "POL-10023567", insuranceExpiry: "2026-10-18", insuranceType: "شامل" },
  { id: 3, name: "Kia Sportage 2024",         plate: "GHI 9012", make: "Kia",     model: "Sportage",    type: "SUV",     color: "أسود",  year: 2024, status: "rented",      customer: "Layla Al-Harbi",    returnTime: "Mon 11:00", speed: 112,  location: "Tahlia St, Jeddah", mapX: 82, mapY: 22, dailyRate: 420,  kmCap: 200,         utilization: 71, registrationTypeCode: 1, operationCardNumber: "OPC-100236", operationCardExpiryDate: "2027-01-20", oilChangeDate: "2026-10-05", insuranceAmount: 100000,
    plateNumber: 9012, plateChar1: "ز", plateChar2: "ح", plateChar3: "ط", chassisNumber: "KNAPX81CDL9012345", fuelTypeCode: 1, extraKmCost: 2, fullFuelCost: 300, lateFeePerHour: 50, enduranceAmount: 2000, bodyType: "دفع رباعي", seats: 5, transmission: "Automatic", istamaraNumber: "1100239012", istamaraExpiry: "2027-04-02", periodicInspectionExpiry: "2027-02-11", insuranceCompany: "تشير", insurancePolicyNumber: "POL-10023901", insuranceExpiry: "2027-03-05", insuranceType: "شامل" },
  { id: 4, name: "Nissan Patrol 2024",        plate: "JKL 3456", make: "Nissan",  model: "Patrol",      type: "Luxury",  color: "فضي",   year: 2024, status: "available",   customer: undefined,          returnTime: undefined,   speed: null, location: undefined,           mapX: 35, mapY: 18, dailyRate: 950,  kmCap: 200,         utilization: 62, registrationTypeCode: 3, operationCardNumber: "OPC-100237", operationCardExpiryDate: "2026-12-01", oilChangeDate: "2026-11-01", insuranceAmount: 200000,
    plateNumber: 3456, plateChar1: "ى", plateChar2: "ك", plateChar3: "ل", chassisNumber: "JN1TANY62U0034567", fuelTypeCode: 1, extraKmCost: 3, fullFuelCost: 450, lateFeePerHour: 120, enduranceAmount: 3000, bodyType: "دفع رباعي فاخر", seats: 7, transmission: "Automatic", istamaraNumber: "1100234356", istamaraExpiry: "2026-07-30", periodicInspectionExpiry: "2027-01-25", insuranceCompany: "بوبا العربية", insurancePolicyNumber: "POL-10023435", insuranceExpiry: "2026-12-15", insuranceType: "شامل" },
  { id: 5, name: "Mazda CX-5 2023",           plate: "MNO 7890", make: "Mazda",   model: "CX-5",        type: "SUV",     color: "أحمر",  year: 2023, status: "rented",      customer: "Reem Al-Dosari",    returnTime: "Today 10:00",speed: 88,  location: "King Abdulaziz Rd", mapX: 48, mapY: 30, dailyRate: 320,  kmCap: 250,         utilization: 88, registrationTypeCode: 1, operationCardNumber: "OPC-100238", operationCardExpiryDate: "2026-09-25", oilChangeDate: "2026-08-01", insuranceAmount: 90000,
    plateNumber: 7890, plateChar1: "م", plateChar2: "ن", plateChar3: "ه", chassisNumber: "JM3KFBCM0P0789012", fuelTypeCode: 1, extraKmCost: 2, fullFuelCost: 280, lateFeePerHour: 40, enduranceAmount: 2000, bodyType: "دفع رباعي", seats: 5, transmission: "Automatic", istamaraNumber: "1100237890", istamaraExpiry: "2026-11-18", periodicInspectionExpiry: "2026-12-02", insuranceCompany: "مدى للتأمين", insurancePolicyNumber: "POL-10023789", insuranceExpiry: "2026-09-30", insuranceType: "شامل" },
  { id: 6, name: "Hyundai Elantra 2024",      plate: "PQR 1357", make: "Hyundai", model: "Elantra",     type: "Economy", color: "أبيض",  year: 2024, status: "maintenance", customer: undefined,          returnTime: undefined,   speed: null, location: undefined,           mapX: 0,  mapY: 0,  dailyRate: 210,  kmCap: "Unlimited", utilization: 45, registrationTypeCode: 1, operationCardNumber: "OPC-100239", operationCardExpiryDate: "2026-07-28", oilChangeDate: "2026-07-20", insuranceAmount: 50000, otherNotes: "In for scheduled maintenance.",
    plateNumber: 1357, plateChar1: "ص", plateChar2: "ق", plateChar3: "ر", chassisNumber: "KMHD35LE1RU135790", fuelTypeCode: 1, extraKmCost: 1, fullFuelCost: 170, lateFeePerHour: 25, enduranceAmount: 1500, bodyType: "سيدان", seats: 5, transmission: "Automatic", istamaraNumber: "1100231357", istamaraExpiry: "2026-09-05", periodicInspectionExpiry: "2026-07-10", insuranceCompany: "الاتحاد التجاري", insurancePolicyNumber: "POL-10023135", insuranceExpiry: "2026-08-22", insuranceType: "شامل" },
  { id: 7, name: "Toyota Land Cruiser 2024",  plate: "STU 2468", make: "Toyota",  model: "Land Cruiser",type: "Luxury",  color: "أسود",  year: 2024, status: "rented",      customer: "Omar Al-Shehri",    returnTime: "Sat 20:00", speed: 42,   location: "Madinah Road",      mapX: 18, mapY: 68, dailyRate: 1180, kmCap: 200,         utilization: 56, registrationTypeCode: 3, operationCardNumber: "OPC-100240", operationCardExpiryDate: "2027-02-14", oilChangeDate: "2026-10-20", insuranceAmount: 300000,
    plateNumber: 2468, plateChar1: "س", plateChar2: "ت", plateChar3: "ع", chassisNumber: "JTMHV05J004246801", fuelTypeCode: 1, extraKmCost: 3, fullFuelCost: 480, lateFeePerHour: 150, enduranceAmount: 3000, bodyType: "دفع رباعي فاخر", seats: 7, transmission: "Automatic", istamaraNumber: "1100232468", istamaraExpiry: "2027-05-08", periodicInspectionExpiry: "2027-03-19", insuranceCompany: "ميدغلف", insurancePolicyNumber: "POL-10023246", insuranceExpiry: "2027-04-12", insuranceType: "شامل" },
  { id: 8, name: "Chevrolet Tahoe 2023",      plate: "VWX 1098", make: "Chevrolet",model: "Tahoe",      type: "SUV",     color: "رمادي", year: 2023, status: "available",   customer: undefined,          returnTime: undefined,   speed: null, location: undefined,           mapX: 58, mapY: 78, dailyRate: 540,  kmCap: 250,         utilization: 74, registrationTypeCode: 1, operationCardNumber: "OPC-100241", operationCardExpiryDate: "2026-10-09", oilChangeDate: "2026-08-14", insuranceAmount: 120000,
    plateNumber: 1098, plateChar1: "ف", plateChar2: "و", plateChar3: "خ", chassisNumber: "1GNSKCKC5PR109876", fuelTypeCode: 1, extraKmCost: 2.5, fullFuelCost: 350, lateFeePerHour: 70, enduranceAmount: 2500, bodyType: "دفع رباعي", seats: 7, transmission: "Automatic", istamaraNumber: "1100241098", istamaraExpiry: "2026-12-27", periodicInspectionExpiry: "2026-11-11", insuranceCompany: "ساب تكافل", insurancePolicyNumber: "POL-10024109", insuranceExpiry: "2026-11-01", insuranceType: "شامل" },
  { id: 9, name: "MG ZS 2024",                plate: "YZA 5544", make: "MG",      model: "ZS",          type: "Economy", color: "أبيض",  year: 2024, status: "draft",       customer: undefined,          returnTime: undefined,   speed: null, location: undefined,           mapX: 0,  mapY: 0,  dailyRate: 180,  kmCap: "Unlimited", utilization: 0,  registrationTypeCode: 1, operationCardNumber: "OPC-100242", operationCardExpiryDate: "2027-01-30", oilChangeDate: "2026-12-10", insuranceAmount: 40000,
    plateNumber: 5544, plateChar1: "ى", plateChar2: "ظ", plateChar3: "ا", chassisNumber: "LSGGD545XPD055441", fuelTypeCode: 1, extraKmCost: 1, fullFuelCost: 150, lateFeePerHour: 25, enduranceAmount: 1000, bodyType: "هاتشباك", seats: 5, transmission: "Automatic", istamaraNumber: "1100245544", istamaraExpiry: "2027-06-19", periodicInspectionExpiry: "2027-05-02", insuranceCompany: "GIG", insurancePolicyNumber: "POL-10024554", insuranceExpiry: "2027-05-20", insuranceType: "ضد الغير" },
  { id: 10, name: "Honda Civic 2023",         plate: "BCD 3311", make: "Honda",   model: "Civic",       type: "Sedan",   color: "أزرق",  year: 2023, status: "available",   customer: undefined,          returnTime: undefined,   speed: null, location: undefined,           mapX: 0,  mapY: 0,  dailyRate: 230,  kmCap: 250,         utilization: 66, registrationTypeCode: 1, operationCardNumber: "OPC-100243", operationCardExpiryDate: "2026-09-17", oilChangeDate: "2026-08-25", insuranceAmount: 70000,
    plateNumber: 3311, plateChar1: "ب", plateChar2: "ج", plateChar3: "د", chassisNumber: "2HGFC2F5XPH033112", fuelTypeCode: 1, extraKmCost: 1.5, fullFuelCost: 200, lateFeePerHour: 30, enduranceAmount: 1500, bodyType: "سيدان", seats: 5, transmission: "Automatic", istamaraNumber: "1100243311", istamaraExpiry: "2026-10-14", periodicInspectionExpiry: "2026-09-28", insuranceCompany: "Allianz", insurancePolicyNumber: "POL-10024331", insuranceExpiry: "2026-09-08", insuranceType: "شامل" },
];

export const BOOKINGS: Booking[] = [
  { id: "MK-2419", customer: "Ahmed Al-Otaibi",   customerInitials: "AO", phone: "+966 50 4192 ••", car: "Toyota Camry · 2024",    plate: "ABC 1234", date: "Today",     time: "14:00", dropoff: "Sun, 18:00",   branch: "Riyadh — Olaya",    type: "pickup", status: "active",    kyc: "verified", amount: 1420, flagged: false },
  { id: "MK-2420", customer: "Fahad Al-Qahtani",  customerInitials: "FQ", phone: "+966 55 8821 ••", car: "Hyundai Sonata · 2023",  plate: "DEF 5678", date: "Today",     time: "09:30", dropoff: "Thu, 09:30",   branch: "Riyadh — Olaya",    type: "return", status: "late",     kyc: "verified", amount: 980,  flagged: false },
  { id: "MK-2421", customer: "Layla Al-Harbi",    customerInitials: "LH", phone: "+966 53 9043 ••", car: "Kia Sportage · 2024",    plate: "GHI 9012", date: "Tomorrow",  time: "11:00", dropoff: "Mon, 11:00",   branch: "Jeddah — Tahlia",   type: "pickup", status: "pending",  kyc: "pending",  amount: 2100, flagged: true  },
  { id: "MK-2422", customer: "Mohammed Al-Saadi", customerInitials: "MS", phone: "+966 56 1124 ••", car: "Nissan Patrol · 2024",   plate: "JKL 3456", date: "Today",     time: "16:30", dropoff: "Sat, 16:30",   branch: "Riyadh — Olaya",    type: "pickup", status: "pending",  kyc: "verified", amount: 3800, flagged: false },
  { id: "MK-2423", customer: "Reem Al-Dosari",    customerInitials: "RD", phone: "+966 50 2298 ••", car: "Mazda CX-5 · 2023",      plate: "MNO 7890", date: "Yesterday", time: "10:00", dropoff: "Today, 10:00", branch: "Riyadh — Olaya",    type: "return", status: "active",   kyc: "verified", amount: 640,  flagged: false },
  { id: "MK-2424", customer: "Khalid Al-Mansour", customerInitials: "KM", phone: "+966 54 5571 ••", car: "Hyundai Elantra · 2024", plate: "PQR 1357", date: "Mon",       time: "08:00", dropoff: "Wed, 18:00",   branch: "Jeddah — Tahlia",   type: "pickup", status: "completed", kyc: "verified", amount: 560,  flagged: false },
  { id: "MK-2425", customer: "Saud Al-Ghamdi",    customerInitials: "SG", phone: "+966 55 1182 ••", car: "Toyota Camry · 2024",    plate: "ABC 1234", date: "Today",     time: "12:00", dropoff: "Fri, 12:00",   branch: "Riyadh — Olaya",    type: "pickup", status: "pending",  kyc: "pending",  amount: 1800, flagged: false },
  { id: "MK-2418", customer: "Omar Al-Shehri",    customerInitials: "OS", phone: "+966 58 3321 ••", car: "Toyota Land Cruiser 2024",plate: "STU 2468", date: "Today",     time: "08:00", dropoff: "Sat, 20:00",   branch: "Riyadh — Olaya",    type: "pickup", status: "active",   kyc: "verified", amount: 4720, flagged: false },
];

export const KYC_ENTRIES: KycEntry[] = [
  { id: 1, name: "Layla Al-Harbi",    phone: "+966 53 9043 ••", since: "8 min ago",   booking: "MK-2421", status: "pending",  sla: false, docs: ["Saudi National ID", "Driving License"], initials: "LH" },
  { id: 2, name: "Saud Al-Ghamdi",    phone: "+966 55 1182 ••", since: "42 min ago",  booking: "MK-2425", status: "pending",  sla: false, docs: ["Saudi National ID", "Driving License"], initials: "SG", avatarGradient: "linear-gradient(135deg,#4171E2,#7F43DD)" },
  { id: 3, name: "Hassan Al-Zahrani", phone: "+966 56 7723 ••", since: "2h 14m ago",  booking: "MK-2426", status: "pending",  sla: true,  docs: ["Saudi National ID", "Driving License"], initials: "HZ" },
  { id: 4, name: "Aisha Al-Rashid",   phone: "+966 50 3398 ••", since: "3h 02m ago",  booking: "MK-2427", status: "pending",  sla: true,  docs: ["Iqama", "Driving License"],             initials: "AR", avatarGradient: "linear-gradient(135deg,#ec4899,#7c3aed)" },
  { id: 5, name: "Nora Al-Shammari",  phone: "+966 54 6612 ••", since: "Yesterday",   booking: "MK-2415", status: "verified", sla: false, docs: ["Saudi National ID"],                    initials: "NS", avatarGradient: "linear-gradient(135deg,#059669,#065f46)" },
  { id: 6, name: "Tariq Al-Mutairi",  phone: "+966 58 9901 ••", since: "2 days ago",  booking: "MK-2412", status: "rejected", sla: false, docs: ["Passport"],                              initials: "TM" },
];

export const LATE_RETURNS: LateReturn[] = [
  { ref: "MK-2420", customer: "Fahad Al-Qahtani", car: "Hyundai Sonata",      due: "Thu 09:30",       returned: "—",          lateBy: "2h 14m", calc: "35 × 2 + 15 prorated", penalty: 85,   status: "active"   },
  { ref: "MK-2418", customer: "Omar Al-Shehri",   car: "Toyota Land Cruiser", due: "Fri 12:00",       returned: "—",          lateBy: "5h 02m", calc: "Full extra day",       penalty: 1180, status: "active"   },
  { ref: "MK-2401", customer: "Saleh Al-Bukhari", car: "Kia Sportage",        due: "Apr 28 18:00",    returned: "Apr 28 21:30",lateBy: "3h 30m", calc: "35 × 3 = 105",         penalty: 105,  status: "disputed" },
  { ref: "MK-2398", customer: "Yousef Al-Anezi",  car: "Toyota Camry",        due: "Apr 25 09:00",    returned: "Apr 25 10:42",lateBy: "42m",    calc: "Within grace period",  penalty: 0,    status: "resolved" },
];

export const BLACKLIST: BlacklistEntry[] = [
  { id: "1098••2244", idType: "Iqama",     office: "Al-Jazirah Rentals · Jeddah",    reason: "Damage left undisclosed",       date: "Mar 14, 2026", verified: true  },
  { id: "1077••5512", idType: "Saudi ID",  office: "Najm Auto Lease · Riyadh",       reason: "Multiple late returns (>72h)",  date: "Feb 02, 2026", verified: true  },
  { id: "PA••8893",   idType: "Passport",  office: "Maarkbh Network · Jeddah",       reason: "Disputed payment chargeback",   date: "Jan 21, 2026", verified: false },
  { id: "1099••3312", idType: "Saudi ID",  office: "Gulf Rent · Dammam",             reason: "Vehicle theft — under review",  date: "Dec 10, 2025", verified: true  },
  { id: "IM••6671",   idType: "Iqama",     office: "Maarkbh Network · Riyadh",       reason: "No-show · repeated 3×",         date: "Nov 28, 2025", verified: true  },
];

export const REFUNDS: Refund[] = [
  { ref: "MK-2412", customer: "Nawaf Al-Rashid",  reason: "Customer cancelled",        window: "36h before · 100%",      original: 680,  refundAmount: 680,  status: "pending"  },
  { ref: "MK-2411", customer: "Sara Al-Mutairi",  reason: "Customer cancelled",        window: "6h before · 50%",        original: 420,  refundAmount: 210,  status: "pending"  },
  { ref: "MK-2407", customer: "Bandar Al-Saad",   reason: "Office cancelled (maint.)", window: "Full refund · ops",       original: 950,  refundAmount: 950,  status: "pending"  },
  { ref: "MK-2402", customer: "Nora Al-Dosari",   reason: "Customer cancelled",        window: "3h before · 50%",        original: 560,  refundAmount: 280,  status: "refunded" },
  { ref: "MK-2395", customer: "Faisal Al-Harbi",  reason: "Office cancelled (fleet)",  window: "Full refund · ops",       original: 1260, refundAmount: 1260, status: "refunded" },
];

export const STAFF: StaffMember[] = [
  { name: "Abdullah Al-Otaibi",  role: "Owner",      branch: "All branches",      lastActive: "Just now",    permissions: "Full access" },
  { name: "Mariam Al-Sulaiman",  role: "Manager",    branch: "Riyadh — Olaya",   lastActive: "3 min ago",   permissions: "Branch operations" },
  { name: "Khalid Al-Mansour",   role: "Front Desk", branch: "Riyadh — Olaya",   lastActive: "Active now",  permissions: "Bookings · KYC · Returns" },
  { name: "Salem Al-Ghamdi",     role: "Front Desk", branch: "Riyadh — Olaya",   lastActive: "23 min ago",  permissions: "Bookings · KYC · Returns" },
  { name: "Hessa Al-Shammari",   role: "Accountant", branch: "All branches",      lastActive: "Yesterday",   permissions: "Finance · read-only" },
  { name: "Yara Al-Faraj",       role: "Front Desk", branch: "Jeddah — Tahlia",  lastActive: "1h ago",      permissions: "Bookings · KYC · Returns" },
];

export const REVENUE_WEEK: RevenueDay[] = [
  { day: "Mon", value: 18000 }, { day: "Tue", value: 22000 }, { day: "Wed", value: 19000 },
  { day: "Thu", value: 28000 }, { day: "Fri", value: 25000 }, { day: "Sat", value: 31000 },
  { day: "Sun", value: 33000 },
];

export const REVENUE_28D: number[] = [
  18, 22, 19, 28, 25, 31, 33, 29, 32, 38, 30, 35, 42, 40,
  28, 33, 36, 44, 40, 38, 29, 42, 48, 52, 46, 50, 38, 44,
];

export const REVENUE_BY_CATEGORY = [
  { name: "Luxury",  value: 62400, pct: 44, color: "var(--color-mk-violet-500)" },
  { name: "SUV",     value: 38200, pct: 27, color: "var(--color-mk-blue-500)"   },
  { name: "Sedan",   value: 28800, pct: 20, color: "var(--color-mk-mint-600)"   },
  { name: "Economy", value: 13440, pct: 9,  color: "var(--color-mk-warning)"    },
];

export const KPIS = {
  available:    { value: "14",    delta: "+2",   label: "Available Cars",    icon: "Car",        color: "default" as const },
  rented:       { value: "6",     delta: "",     label: "Active Rentals",    icon: "KeyRound",   color: "violet"  as const },
  late:         { value: "2",     delta: "",     label: "Late Returns",      icon: "ClockAlert", color: "alert"   as const },
  todayRevenue: { value: "4,820", delta: "+18%", label: "Today's Revenue",   icon: "Banknote",   color: "mint"    as const },
  utilization:  { value: "68%",   delta: "-3%",  label: "Fleet Utilization", icon: "Gauge",      color: "warn"    as const },
};

// ── Status labels ──────────────────────────────────────────────
export const CAR_STATUS_LABEL: Record<CarStatus, string> = {
  available:   "Available",
  rented:      "Rented",
  overdue:     "Overdue",
  maintenance: "Maintenance",
  reserved:    "Reserved",
  inactive:    "Inactive",
  draft:       "Draft",
};

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  confirmed: "Confirmed",
  pending:   "Pending",
  late:      "Late",
  "on-time": "On Time",
  active:    "Active",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const CAR_IMAGES: Record<string, string[]> = {
  "Camry": [
    "/assets/cars/camry_1.png",
    "/assets/cars/camry_1.png#flipped",
    "/assets/cars/camry_2.png",
    "/assets/cars/camry_2.png#flipped"
  ],
  "Sonata": [
    "/assets/cars/sonata_1.png",
    "/assets/cars/sonata_1.png#flipped",
    "/assets/cars/sonata_2.png",
    "/assets/cars/sonata_2.png#flipped"
  ],
  "Elantra": [
    "/assets/cars/elantra_1.png",
    "/assets/cars/elantra_1.png#flipped",
    "/assets/cars/elantra_2.png",
    "/assets/cars/elantra_2.png#flipped"
  ],
  "Civic": [
    "/assets/cars/sedan_front.png",
    "/assets/cars/sedan_right.png",
    "/assets/cars/sedan_left.png",
    "/assets/cars/sedan_back.png"
  ],
  "Sportage": [
    "/assets/cars/sportage_1.png",
    "/assets/cars/sportage_1.png#flipped",
    "/assets/cars/sportage_2.png",
    "/assets/cars/sportage_2.png#flipped"
  ],
  "Patrol": [
    "/assets/cars/patrol_1.png",
    "/assets/cars/patrol_1.png#flipped",
    "/assets/cars/patrol_2.png",
    "/assets/cars/patrol_2.png#flipped"
  ],
  "CX-5": [
    "/assets/cars/cx5_1.png",
    "/assets/cars/cx5_1.png#flipped",
    "/assets/cars/cx5_2.png",
    "/assets/cars/cx5_2.png#flipped"
  ],
  "Land Cruiser": [
    "/assets/cars/suv_front.png",
    "/assets/cars/suv_right.png",
    "/assets/cars/suv_left.png",
    "/assets/cars/suv_back.png"
  ],
  "Tahoe": [
    "/assets/cars/suv_front.png#flipped",
    "/assets/cars/suv_right.png#flipped",
    "/assets/cars/suv_left.png#flipped",
    "/assets/cars/suv_back.png#flipped"
  ],
  "ZS": [
    "/assets/cars/sportage_1.png#flipped",
    "/assets/cars/sportage_1.png",
    "/assets/cars/sportage_2.png#flipped",
    "/assets/cars/sportage_2.png"
  ]
};

// ── Drivers ──────────────────────────────────────────────────
export interface DriverProfile {
  id: string;
  name: string;
  nameAr: string;
  phone: string;
  idType: "Saudi ID" | "Iqama" | "Passport" | "GCC ID";
  idTypeCode: 1 | 2 | 3 | 4;
  nationalId: string;
  birthDate?: string;
  hijriBirthDate?: number;
  email?: string;
  passportNumber?: string;
  nationality?: string;
  nationalityCode?: number;
  licenseNumber: string;
  licenseExpiryDate?: string;
  idExpiryDate?: string;
  idCopyNumber?: string;
  licenseIssuePlace?: string;
  borderNumber?: string;
  personAddress: string;
  bookings: number;
  status: "verified" | "pending" | "new" | "rejected";
  tajeerStatus?: "verified" | "pending" | "not_verified" | "error";
  lastBooking: string | null;
  rating: number | null;
  blacklisted: boolean;
  joinDate: string;
  history?: { id: string; car: string; date: string; status: string; rate: number }[];
  debtAmount?: number;
  debtNote?: string;
  debtNoteAr?: string;
  circularNote?: string;
  circularNoteAr?: string;
}

export const MOCK_DRIVERS: DriverProfile[] = [
  {
    id: "D-1001",
    name: "Khaled Al-Ahmadi",
    nameAr: "خالد الأحمدي",
    phone: "+966 50 447 1928",
    idType: "Saudi ID",
    idTypeCode: 1,
    nationalId: "1077384422",
    hijriBirthDate: 14091230,
    nationality: "سعودي",
    nationalityCode: 682,
    licenseNumber: "LIC-88291",
    licenseExpiryDate: "2029-05-18",
    idExpiryDate: "2031-10-12",
    idCopyNumber: "1",
    personAddress: "الرياض، العليا",
    bookings: 4,
    status: "verified",
    tajeerStatus: "verified",
    lastBooking: "MK-2421",
    rating: 4.8,
    blacklisted: false,
    joinDate: "2025-01-14",
    history: [
      { id: "MK-2410", car: "Toyota Camry 2024", date: "2025-05-02", status: "completed", rate: 360 },
      { id: "MK-2392", car: "Hyundai Elantra 2024", date: "2025-04-10", status: "completed", rate: 210 },
    ],
  },
  {
    id: "D-1002",
    name: "Layla Al-Harbi",
    nameAr: "ليلى الحربي",
    phone: "+966 55 881 2344",
    idType: "Saudi ID",
    idTypeCode: 1,
    nationalId: "2033889917",
    hijriBirthDate: 14150518,
    nationality: "سعودي",
    nationalityCode: 682,
    licenseNumber: "LIC-99014",
    licenseExpiryDate: "2030-08-25",
    idExpiryDate: "2032-04-09",
    idCopyNumber: "1",
    personAddress: "جدة، الروضة",
    bookings: 2,
    status: "verified",
    tajeerStatus: "verified",
    lastBooking: "MK-2418",
    rating: 4.5,
    blacklisted: false,
    joinDate: "2025-04-18",
    history: [
      { id: "MK-2421", car: "Kia Sportage 2024", date: "2025-05-08", status: "pending", rate: 420 },
    ],
  },
  {
    id: "D-1003",
    name: "Mohammed Al-Otaibi",
    nameAr: "محمد العتيبي",
    phone: "+966 56 220 0112",
    idType: "Saudi ID",
    idTypeCode: 1,
    nationalId: "1088334441",
    hijriBirthDate: 14050812,
    nationality: "سعودي",
    nationalityCode: 682,
    licenseNumber: "LIC-11203",
    licenseExpiryDate: "2028-12-05",
    idExpiryDate: "2030-11-14",
    idCopyNumber: "2",
    personAddress: "الرياض، السويدي",
    bookings: 7,
    status: "verified",
    tajeerStatus: "verified",
    lastBooking: "MK-2409",
    rating: 4.9,
    blacklisted: false,
    joinDate: "2024-06-22",
    history: [
      { id: "MK-2419", car: "Toyota Camry 2024", date: "2025-05-07", status: "active", rate: 360 },
      { id: "MK-2381", car: "Nissan Patrol 2024", date: "2025-03-12", status: "completed", rate: 950 },
    ],
    debtAmount: 450,
    debtNote: "Unpaid late-return fee from contract MK-2381, referred to collections.",
    debtNoteAr: "رسوم تأخير غير مسددة من عقد MK-2381، تم تحويلها للتحصيل.",
  },
  {
    id: "D-1004",
    name: "George Smith",
    nameAr: "جورج سميث",
    phone: "+44 7700 900077",
    idType: "Passport",
    idTypeCode: 3,
    nationalId: "PA889304",
    birthDate: "1990-04-25",
    email: "george@example.com",
    passportNumber: "PA889304",
    nationality: "بريطاني",
    nationalityCode: 840,
    licenseNumber: "LIC-44081",
    licenseExpiryDate: "2028-10-12",
    idExpiryDate: "2027-05-30",
    idCopyNumber: "1",
    licenseIssuePlace: "London",
    borderNumber: "BRD-2205931",
    personAddress: "الدمام، الحزام الذهبي",
    bookings: 1,
    status: "verified",
    tajeerStatus: "verified",
    lastBooking: "MK-2415",
    rating: 5.0,
    blacklisted: false,
    joinDate: "2025-03-10",
    history: [
      { id: "MK-2415", car: "Kia Sportage 2024", date: "2025-04-25", status: "completed", rate: 420 },
    ],
  },
  {
    id: "D-1005",
    name: "Fahad Al-Dosari",
    nameAr: "فهد الدوسري",
    phone: "+966 50 339 0881",
    idType: "Saudi ID",
    idTypeCode: 1,
    nationalId: "1099112233",
    hijriBirthDate: 14121102,
    nationality: "سعودي",
    nationalityCode: 682,
    licenseNumber: "LIC-55092",
    licenseExpiryDate: "2030-01-15",
    idExpiryDate: "2032-06-20",
    idCopyNumber: "1",
    personAddress: "الخبر، العقربية",
    bookings: 0,
    status: "new",
    tajeerStatus: "not_verified",
    lastBooking: null,
    rating: null,
    blacklisted: false,
    joinDate: "2025-05-30",
    history: [],
  },
  {
    id: "D-1006",
    name: "Amir Khan",
    nameAr: "أمير خان",
    phone: "+966 54 664 1002",
    idType: "Iqama",
    idTypeCode: 2,
    nationalId: "2011773402",
    birthDate: "1988-11-05",
    nationality: "باكستاني",
    nationalityCode: 586,
    licenseNumber: "LIC-77402",
    licenseExpiryDate: "2028-09-10",
    idExpiryDate: "2027-12-14",
    idCopyNumber: "3",
    personAddress: "الرياض، البطحاء",
    bookings: 3,
    status: "verified",
    tajeerStatus: "verified",
    lastBooking: "MK-2411",
    rating: 4.7,
    blacklisted: false,
    joinDate: "2024-11-05",
    history: [
      { id: "MK-2411", car: "MG ZS 2024", date: "2025-04-20", status: "completed", rate: 180 },
    ],
    circularNote: "Flagged by Ministry of Interior circular — Iqama renewal pending, re-check before handover.",
    circularNoteAr: "مُدرج ضمن تعميم وزارة الداخلية — تجديد الإقامة قيد الإجراء، يُرجى إعادة التحقق قبل التسليم.",
  },
  {
    id: "D-1007",
    name: "Tariq Al-Mutairi",
    nameAr: "طارق المطيري",
    phone: "+966 58 990 1122",
    idType: "GCC ID",
    idTypeCode: 4,
    nationalId: "GCC388930",
    birthDate: "1992-07-15",
    email: "tariq@gulf.com",
    nationality: "كويتي",
    nationalityCode: 414,
    licenseNumber: "LIC-77402",
    licenseExpiryDate: "2029-01-20",
    idExpiryDate: "2028-11-05",
    idCopyNumber: "1",
    licenseIssuePlace: "Kuwait City",
    personAddress: "الكويت، السالمية",
    bookings: 1,
    status: "rejected",
    tajeerStatus: "error",
    lastBooking: "MK-2412",
    rating: 3.2,
    blacklisted: true,
    joinDate: "2025-03-14",
    history: [
      { id: "MK-2412", car: "MG ZS 2024", date: "2025-04-01", status: "cancelled", rate: 180 },
    ],
  },
];

// ── Clients (customer portal) ───────────────────────────────
export interface ClientContract {
  id: string;
  car: string;
  date: string;
  status: "active" | "pending" | "completed" | "expired" | "cancelled";
  rate: number;
}

export interface ClientDispute {
  id: string;
  type: string;
  typeAr: string;
  date: string;
  amount?: number;
  status: "open" | "resolved";
  statusAr: string;
  notes: string;
  notesAr: string;
  office: string;
  officeAr: string;
}

export interface ClientDebt {
  id: string;
  type: string;
  typeAr: string;
  date: string;
  dueDate?: string;
  amount: number;
  status: "unpaid" | "overdue" | "paid";
  statusAr: string;
  contractRef?: string;
  notes: string;
  notesAr: string;
  office: string;
  officeAr: string;
}

// External identity + financial record as returned by a Dynamics network query —
// a customer may have debts/disputes logged against them by other rental offices
// even if they've never rented from Maarkbh before.
export interface DynamicsLookupRecord {
  idNumber: string;
  name: string;
  nameAr: string;
  phone: string;
  idType: string;
  idExpiryDate?: string;
  nationality?: string;
  licenseNumber?: string;
  blacklisted: boolean;
  debts: ClientDebt[];
  disputes: ClientDispute[];
}

export interface ClientProfile {
  id: string;
  name: string;
  nameAr: string;
  phone: string;
  email?: string;
  idType: string;
  idNumber: string;
  idExpiryDate?: string;
  birthDate?: string;
  hijriBirthDate?: number;
  nationality?: string;
  nationalityCode?: number;
  personAddress?: string;
  idCopyNumber?: string;
  licenseIssuePlace?: string;
  borderNumber?: string;
  licenseNumber: string;
  licenseExpiryDate?: string;
  contracts: number;
  rating: number;
  kycStatus: "verified" | "pending" | "rejected";
  yakeenStatus?: "verified" | "pending" | "not_verified" | "error";
  tajeerStatus?: "verified" | "pending" | "not_verified" | "error";
  blacklisted: boolean;
  joinDate: string;
  history: ClientContract[];
  disputes?: ClientDispute[];
  debts?: ClientDebt[];
}

export const CLIENTS: ClientProfile[] = [
  { id: "C-01", name: "Khaled Al-Ahmadi",  nameAr: "خالد الأحمدي",   phone: "+966 50 447 1928", email: "khaled.ahmadi@example.com", idType: "Saudi ID", idNumber: "1077••4922", idExpiryDate: "2031-10-12", hijriBirthDate: 14091230, nationality: "سعودي", nationalityCode: 682, personAddress: "الرياض، العليا", idCopyNumber: "1", licenseNumber: "LIC-88291", licenseExpiryDate: "2029-05-18", contracts: 4,  rating: 4.8, kycStatus: "verified", yakeenStatus: "verified", tajeerStatus: "verified", blacklisted: false, joinDate: "2025-01-14", history: [
    { id: "MK-2410", car: "Toyota Camry 2024",    date: "2025-05-02", status: "completed", rate: 360 },
    { id: "MK-2392", car: "Hyundai Elantra 2024", date: "2025-04-10", status: "completed", rate: 210 },
    { id: "MK-2350", car: "Toyota Camry 2024",    date: "2025-02-18", status: "expired",   rate: 360 },
    { id: "MK-2298", car: "Kia Sportage 2024",    date: "2024-12-05", status: "expired",   rate: 420 },
  ], disputes: [
    { id: "DISP-095", type: "Car Scratch", typeAr: "خدوش بالهيكل", date: "2025-02-20", amount: 300, status: "resolved", statusAr: "تمت تسويته", notes: "Settled via insurance coverage.", notesAr: "تمت التسوية عن طريق تغطية التأمين.", office: "Maarkbh", officeAr: "مركبة" }
  ], debts: [
    { id: "DEBT-041", type: "Traffic fine", typeAr: "مخالفة مرورية", date: "2025-05-03", dueDate: "2025-05-17", amount: 150, status: "paid", statusAr: "مسدد", contractRef: "MK-2410", notes: "Speeding fine settled on return.", notesAr: "تم سداد مخالفة السرعة عند الإرجاع.", office: "Maarkbh", officeAr: "مركبة" }
  ] },
  { id: "C-02", name: "Ahmed Al-Otaibi",   nameAr: "أحمد العتيبي",   phone: "+966 50 419 2244", email: "ahmed.otaibi@example.com", idType: "Saudi ID", idNumber: "1098••1199", idExpiryDate: "2030-02-06", hijriBirthDate: 14050310, nationality: "سعودي", nationalityCode: 682, personAddress: "الرياض، الملقا", idCopyNumber: "2", licenseNumber: "LIC-11203", licenseExpiryDate: "2028-12-05", contracts: 12, rating: 4.9, kycStatus: "verified", yakeenStatus: "verified", tajeerStatus: "verified", blacklisted: false, joinDate: "2024-06-22", history: [
    { id: "MK-2419", car: "Toyota Camry 2024",   date: "2025-05-07", status: "active",    rate: 360 },
    { id: "MK-2381", car: "Nissan Patrol 2024",  date: "2025-03-12", status: "completed", rate: 950 },
    { id: "MK-2340", car: "Hyundai Sonata 2024", date: "2025-01-22", status: "expired",   rate: 260 },
    { id: "MK-2287", car: "Toyota Camry 2024",   date: "2024-11-30", status: "expired",   rate: 360 },
    { id: "MK-2201", car: "Nissan Patrol 2024",  date: "2024-09-08", status: "expired",   rate: 950 },
    { id: "MK-2144", car: "Kia Sportage 2024",   date: "2024-07-01", status: "cancelled", rate: 420 },
  ], debts: [
    { id: "DEBT-052", type: "Late return fee", typeAr: "رسوم تأخير إرجاع", date: "2025-05-10", dueDate: "2025-05-24", amount: 90, status: "unpaid", statusAr: "غير مسدد", contractRef: "MK-2419", notes: "2 hours late return, fee pending collection.", notesAr: "تأخير ساعتين عن موعد الإرجاع، الرسوم بانتظار التحصيل.", office: "Maarkbh", officeAr: "مركبة" },
    { id: "DEBT-048", type: "Unpaid rental balance", typeAr: "رصيد إيجار غير مسدد", date: "2025-02-11", dueDate: "2025-02-25", amount: 320, status: "overdue", statusAr: "متأخر السداد", notes: "Outstanding balance flagged by another office via the Dynamics network.", notesAr: "رصيد مستحق مسجل من مكتب آخر عبر شبكة دينامكس.", office: "Al Fahd Rent a Car — Jeddah", officeAr: "الفهد لتأجير السيارات - جدة" }
  ] },
  { id: "C-03", name: "Layla Al-Harbi",    nameAr: "ليلى الحربي",    phone: "+966 53 904 3311", email: "layla.harbi@example.com", idType: "Saudi ID", idNumber: "1054••8822", idExpiryDate: "2032-04-09", hijriBirthDate: 14150518, nationality: "سعودي", nationalityCode: 682, personAddress: "جدة، الروضة", idCopyNumber: "1", licenseNumber: "LIC-99014", licenseExpiryDate: "2030-08-25", contracts: 2,  rating: 4.5, kycStatus: "pending",  yakeenStatus: "pending", tajeerStatus: "pending", blacklisted: false, joinDate: "2025-04-18", history: [
    { id: "MK-2421", car: "Kia Sportage 2024", date: "2025-05-08", status: "pending", rate: 420 },
  ] },
  { id: "C-04", name: "Mohammed Al-Saadi", nameAr: "محمد الصاعدي",   phone: "+966 56 112 4477", email: "mohammed.saadi@example.com", idType: "Iqama",    idNumber: "2284••7712", idExpiryDate: "2027-08-19", birthDate: "1987-02-11", nationality: "مصري", nationalityCode: 818, personAddress: "الرياض، السويدي", idCopyNumber: "1", licenseNumber: "LIC-55421", licenseExpiryDate: "2028-06-30", contracts: 8,  rating: 4.7, kycStatus: "verified", yakeenStatus: "verified", tajeerStatus: "verified", blacklisted: false, joinDate: "2024-09-08", history: [
    { id: "MK-2422", car: "Nissan Patrol 2024",   date: "2025-05-07", status: "pending",   rate: 950 },
    { id: "MK-2360", car: "Toyota Camry 2024",    date: "2025-03-01", status: "expired",   rate: 360 },
    { id: "MK-2311", car: "Hyundai Elantra 2024", date: "2025-01-14", status: "expired",   rate: 210 },
    { id: "MK-2255", car: "Nissan Patrol 2024",   date: "2024-10-20", status: "expired",   rate: 950 },
  ], disputes: [
    { id: "DISP-088", type: "Vehicle damage claim", typeAr: "مطالبة تلف مركبة", date: "2024-08-02", amount: 600, status: "open", statusAr: "نشط", notes: "Open damage claim logged by another office via the Dynamics network — not previously visible to Maarkbh.", notesAr: "مطالبة تلف مفتوحة سجّلها مكتب آخر عبر شبكة دينامكس - لم تكن ظاهرة لمركبة سابقاً.", office: "Dynamic Cars — Riyadh Malaz", officeAr: "دينامك كارز - الرياض الملز" }
  ] },
  { id: "C-05", name: "Fahad Al-Dosari",   nameAr: "فهد الدوسري",    phone: "+966 50 339 0881", idType: "Saudi ID", idNumber: "1099••2233", idExpiryDate: "2032-06-20", hijriBirthDate: 14121102, nationality: "سعودي", nationalityCode: 682, personAddress: "الخبر، العقربية", idCopyNumber: "1", licenseNumber: "LIC-55092", licenseExpiryDate: "2030-01-15", contracts: 0,  rating: 0,   kycStatus: "pending",  yakeenStatus: "not_verified", tajeerStatus: "not_verified", blacklisted: false, joinDate: "2025-05-30", history: [] },
  { id: "C-06", name: "Noura Al-Shammari", nameAr: "نورة الشمري",    phone: "+966 54 664 1002", idType: "Saudi ID", idNumber: "2011••3402", idExpiryDate: "2032-08-11", hijriBirthDate: 14160410, nationality: "سعودي", nationalityCode: 682, personAddress: "الدمام، الريان", idCopyNumber: "2", licenseNumber: "LIC-77402", licenseExpiryDate: "2030-05-02", contracts: 3,  rating: 4.7, kycStatus: "verified", yakeenStatus: "verified", tajeerStatus: "verified", blacklisted: false, joinDate: "2024-11-05", history: [
    { id: "MK-2411", car: "MG ZS 2024", date: "2025-04-20", status: "completed", rate: 180 },
  ] },
  { id: "C-07", name: "Tariq Al-Mutairi",  nameAr: "طارق المطيري",   phone: "+966 58 990 1122", idType: "Passport", idNumber: "PA••88930",  idExpiryDate: "2028-11-05", birthDate: "1992-07-15", nationality: "كويتي", nationalityCode: 414, personAddress: "الكويت، السالمية", idCopyNumber: "1", licenseIssuePlace: "Kuwait City", borderNumber: "BRD-3391204", licenseNumber: "LIC-77402", licenseExpiryDate: "2029-01-20", contracts: 1,  rating: 3.2, kycStatus: "rejected", yakeenStatus: "error", tajeerStatus: "error", blacklisted: true,  joinDate: "2025-03-14", history: [
    { id: "MK-2412", car: "MG ZS 2024", date: "2025-04-01", status: "cancelled", rate: 180 },
  ], disputes: [
    { id: "DISP-102", type: "Late Return Dispute", typeAr: "نزاع حول تأخير تسليم", date: "2025-04-05", amount: 450, status: "open", statusAr: "نشط", notes: "Refused to pay for 4 hours of late return fees.", notesAr: "رفض دفع رسوم التأخير لمدة ٤ ساعات.", office: "Maarkbh", officeAr: "مركبة" },
    { id: "DISP-101", type: "Traffic Fine unpaid", typeAr: "مخالفة مرورية غير مدفوعة", date: "2025-04-02", amount: 150, status: "open", statusAr: "نشط", notes: "Speeding ticket in Riyadh, Olaya branch.", notesAr: "مخالفة سرعة زائدة في الرياض - فرع العليا.", office: "Maarkbh", officeAr: "مركبة" },
    { id: "DISP-076", type: "Unreturned vehicle report", typeAr: "بلاغ عدم إرجاع مركبة", date: "2024-11-19", amount: 2100, status: "open", statusAr: "نشط", notes: "Vehicle reported unreturned for 9 days; case referred to authorities.", notesAr: "بلاغ بعدم إرجاع المركبة لمدة ٩ أيام؛ تمت إحالة الحالة للجهات المختصة.", office: "Al Salam Rentals — Khobar", officeAr: "السلام لتأجير السيارات - الخبر" }
  ], debts: [
    { id: "DEBT-030", type: "Late return fee", typeAr: "رسوم تأخير إرجاع", date: "2025-04-01", dueDate: "2025-04-15", amount: 450, status: "overdue", statusAr: "متأخر السداد", contractRef: "MK-2412", notes: "Unpaid since return, sent to collections.", notesAr: "غير مسدد منذ الإرجاع، تم تحويله للتحصيل.", office: "Maarkbh", officeAr: "مركبة" },
    { id: "DEBT-029", type: "Traffic fine", typeAr: "مخالفة مرورية", date: "2025-04-02", dueDate: "2025-04-16", amount: 150, status: "overdue", statusAr: "متأخر السداد", contractRef: "MK-2412", notes: "Speeding fine passed to renter, unpaid.", notesAr: "مخالفة سرعة محوّلة للمستأجر، غير مسددة.", office: "Maarkbh", officeAr: "مركبة" },
    { id: "DEBT-018", type: "Vehicle damage cost", typeAr: "تكلفة أضرار مركبة", date: "2024-11-28", dueDate: "2024-12-12", amount: 2100, status: "overdue", statusAr: "متأخر السداد", notes: "Full vehicle recovery + damage cost, never settled.", notesAr: "تكلفة استرجاع المركبة والأضرار كاملة، لم تُسدد.", office: "Al Salam Rentals — Khobar", officeAr: "السلام لتأجير السيارات - الخبر" }
  ] },
];

// ── Dynamics network lookup — customers who have never rented from Maarkbh
// but appear in the shared industry registry with debts/disputes logged by
// other offices. Used by the Customer Inquiry screen to surface risk before
// a first-time walk-in is registered.
export const DYNAMICS_LOOKUP: DynamicsLookupRecord[] = [
  {
    idNumber: "1082••5510", name: "Bandar Al-Qahtani", nameAr: "بندر القحطاني", phone: "+966 55 201 8834",
    idType: "Saudi ID", idExpiryDate: "2029-09-02", nationality: "سعودي", licenseNumber: "LIC-40218",
    blacklisted: true,
    debts: [
      { id: "DEBT-DX-11", type: "Unpaid rental balance", typeAr: "رصيد إيجار غير مسدد", date: "2025-01-15", dueDate: "2025-01-29", amount: 1250, status: "overdue", statusAr: "متأخر السداد", notes: "Rented and never returned the vehicle; balance referred to collections.", notesAr: "استأجر ولم يُرجع المركبة؛ تم تحويل الرصيد للتحصيل.", office: "RentSyst Arabia — Riyadh", officeAr: "رنت سيست العربية - الرياض" },
    ],
    disputes: [
      { id: "DISP-DX-07", type: "Vehicle theft report", typeAr: "بلاغ سرقة مركبة", date: "2025-01-20", status: "open", statusAr: "نشط", notes: "Formal police report filed after vehicle was not returned.", notesAr: "تم تقديم بلاغ رسمي للشرطة بعد عدم إرجاع المركبة.", office: "RentSyst Arabia — Riyadh", officeAr: "رنت سيست العربية - الرياض" },
    ],
  },
  {
    idNumber: "1091••2246", name: "Rakan Al-Zahrani", nameAr: "راكان الزهراني", phone: "+966 50 774 3390",
    idType: "Saudi ID", idExpiryDate: "2030-11-20", nationality: "سعودي", licenseNumber: "LIC-63590",
    blacklisted: false,
    debts: [
      { id: "DEBT-DX-04", type: "Traffic fine", typeAr: "مخالفة مرورية", date: "2025-03-08", dueDate: "2025-03-22", amount: 200, status: "unpaid", statusAr: "غير مسدد", notes: "Unpaid speeding fine from a prior rental.", notesAr: "مخالفة سرعة غير مسددة من إيجار سابق.", office: "Booqable KSA — Dammam", officeAr: "بوكابل السعودية - الدمام" },
    ],
    disputes: [],
  },
];


