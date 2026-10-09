import type { DriverProfile, ClientProfile, Car } from "@/lib/data";
import { mapStatusFromBackend, mapDamagePointsToSketchItems } from "@/lib/fleet";
import { normalizeKycStatus, formatPlate } from "@/lib/formatting";
import { ID_TYPE_CODES } from "./constants";

// Backend sends bodyType/category as numeric enums (api-types.ts
// VehicleBodyType / VehicleCategory). The filter chips on the picker use the
// English canonical names, so map codes → labels here.
const BODY_TYPE_LABELS: Record<number, string> = {
  1: "Sedan", 2: "SUV", 3: "Coupe", 4: "Hatchback", 5: "Truck", 6: "Van", 7: "Motorcycle",
};
const CATEGORY_LABELS: Record<number, string> = {
  1: "Economy", 2: "Compact", 3: "Midsize", 4: "Fullsize", 5: "Luxury", 6: "Sports", 7: "Commercial",
};
export const CAR_TYPE_AR: Record<string, string> = {
  Sedan: "سيدان", SUV: "دفع رباعي", Coupe: "كوبيه", Hatchback: "هاتشباك",
  Truck: "شاحنة", Van: "فان", Motorcycle: "دراجة",
  Economy: "اقتصادية", Compact: "مدمجة", Midsize: "متوسطة", Fullsize: "كبيرة",
  Luxury: "فاخرة", Sports: "رياضية", Commercial: "تجارية",
};

/* ── Backend → DriverProfile mapper (customer search/getById results) ──── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapBackendCustomerToDriver(item: any): DriverProfile {
  const idTypeCode = item.identityType ?? item.idType;
  const idType: DriverProfile["idType"] = idTypeCode === 1 ? "Saudi ID" : idTypeCode === 2 ? "Iqama" : idTypeCode === 3 ? "Passport" : idTypeCode === 4 ? "GCC ID" : "Saudi ID";
  return {
    id: String(item.id),
    name: item.fullNameEn || item.name || "",
    nameAr: item.fullNameAr || item.nameAr || "",
    phone: item.phoneNumber || "",
    idType,
    idTypeCode: (idTypeCode as 1 | 2 | 3 | 4) || 1,
    nationalId: item.beneficiaryIdNumber || item.passportNumber || item.visitor?.passportNumber || item.visitor?.idNumber || item.borderNumber || item.visitor?.borderNumber || item.identityCopyNumber || item.visitor?.identityCopyNumber || item.idCopyNumber || "",
    birthDate: item.birthDate || item.national?.birthDate || item.residence?.birthDate || item.visitor?.birthDate || item.gulf?.birthDate,
    hijriBirthDate: item.national?.hijriBirthDate ?? item.residence?.hijriBirthDate,
    email: item.email,
    passportNumber: item.passportNumber || item.visitor?.passportNumber,
    nationality: item.nationality || item.countryNameAr || item.countryNameEn || item.national?.nationality || item.residence?.nationality || item.visitor?.nationality || item.gulf?.nationality,
    nationalityCode: item.countryId ?? item.nationalityCode,
    licenseNumber: item.licenseNumber || item.national?.licenseNumber || item.residence?.licenseNumber || item.visitor?.licenseNumber || item.gulf?.licenseNumber || "",
    licenseExpiryDate: item.licenseExpiryDate || item.national?.licenseExpiryDate || item.residence?.licenseExpiryDate || item.visitor?.licenseExpiryDate || item.gulf?.licenseExpiryDate,
    idExpiryDate: item.idExpiryDate || item.identityExpiryDate || item.national?.identityExpiryDate || item.residence?.identityExpiryDate || item.visitor?.identityExpiryDate || item.gulf?.identityExpiryDate,
    idCopyNumber: item.idCopyNumber || item.identityCopyNumber || item.national?.idCopyNumber || item.residence?.idCopyNumber || item.visitor?.identityCopyNumber || item.gulf?.identityCopyNumber,
    licenseIssuePlace: item.licenseIssuePlace || item.national?.licenseIssuePlace || item.residence?.licenseIssuePlace || item.visitor?.licenseIssuePlace || item.gulf?.licenseIssuePlace,
    borderNumber: item.borderNumber || item.visitor?.borderNumber,
    personAddress: item.address || "",
    bookings: item.contracts || 0,
    status: normalizeKycStatus(item.verificationStatus) as DriverProfile["status"],
    tajeerStatus: item.yakeenStatus === 1 ? "verified" : item.yakeenStatus === 2 ? "pending" : "not_verified",
    lastBooking: null,
    rating: item.rating || 0,
    blacklisted: item.isBlacklisted || false,
    joinDate: (item.joinedAt || item.creationTime) ? new Date(item.joinedAt || item.creationTime).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
  };
}

/* ── Backend → Car mapper (vehicle search/getById results) ───────────── */
// The getById response is nested: { plate, info, insurancePricing,
// tajeerStatus } — flat fields only appear on search-summary items, so read
// nested first with flat fallbacks.
export type VehicleLookupContext = {
  insuranceCompanies?: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  insuranceTypes?: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapBackendVehicleToCar(item: any, lookups?: VehicleLookupContext): Car {
  const asObj = (v: any) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
  const plate = asObj(item.plate ?? item.plateDocs);
  const info = asObj(item.info ?? item.vehicleInfo);
  const pricing = asObj(item.insurancePricing ?? item.pricing);
  const tajeer = asObj(item.tajeerStatus);
  const pick = (...vals: any[]) => vals.find((v) => v !== undefined && v !== null && v !== "");

  const insuranceCompanyId = pick(pricing.insuranceCompanyId, item.insuranceCompanyId);
  const insuranceCompanyName = (() => {
    const direct = pick(item.insuranceCompanyName, item.insuranceCompany, pricing.insuranceCompanyName);
    if (direct) return String(direct);
    if (insuranceCompanyId == null || insuranceCompanyId === "") return "";
    const found = lookups?.insuranceCompanies?.find((c) => Number(c.id) === Number(insuranceCompanyId));
    return found ? String(found.nameAr || found.nameEn || found.name || "") : "";
  })();
  const insuranceTypeId = pick(pricing.insuranceTypeId, item.insuranceTypeId);
  const insuranceTypeName = (() => {
    const direct = pick(item.insuranceTypeName, item.insuranceTypeNameEn);
    if (direct) return String(direct);
    const found = lookups?.insuranceTypes?.find((t) => Number(t.id) === Number(insuranceTypeId));
    return found ? String(found.nameAr || found.nameEn || found.name || "") : "";
  })();
  const insuranceType: Car["insuranceType"] =
    insuranceTypeName
      ? (/شامل|comprehens/i.test(insuranceTypeName) ? "شامل" : "ضد الغير")
      : (item.insuranceType === "ضد الغير" ? "ضد الغير" : "شامل");

  const imageUrls = item.images?.length
    ? item.images
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((img: any) => {
          const fileId = img.fileId ?? img.id ?? img.attachmentId;
          return typeof fileId === "number" && fileId > 0;
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((img: any) => `/api/attachments/${img.fileId ?? img.id ?? img.attachmentId}/download`)
    : undefined;

  const vin = pick(info.vin, item.vin, item.chassisNumber);
  const insuranceExpiry = pick(pricing.insuranceExpiryDate, item.insuranceExpiryDate, item.insuranceExpiry);

  return {
    id: item.id,
    name: `${item.makeName || ""} ${item.modelName || ""} ${pick(info.year, item.year) || ""}`.trim(),
    plate: formatPlate({ ...item, plate }),
    make: item.makeName || "",
    model: item.modelName || "",
    type: BODY_TYPE_LABELS[Number(pick(info.bodyType, item.bodyType))] || "",
    categoryLabel: CATEGORY_LABELS[Number(pick(info.category, item.category))] || "",
    color: pick(info.color, item.color) || "",
    year: Number(pick(info.year, item.year)) || 0,
    status: mapStatusFromBackend(pick(tajeer.status, item.status)),
    customer: item.customerName,
    returnTime: item.returnTime,
    speed: item.speed,
    location: item.location,
    mapX: item.mapX || 0,
    mapY: item.mapY || 0,
    dailyRate: Number(pick(pricing.dailyRate, item.dailyRate)) || 0,
    kmCap: item.kmCap ?? (pick(pricing.isKilometerLimitEnabled, item.isKilometerLimitEnabled) === false
      ? "Unlimited"
      : (Number(pick(pricing.dailyKilometerLimit, item.dailyKilometerLimit)) || 0)),
    utilization: item.utilization || 0,
    plateNumber: Number(pick(plate.plateNumber, item.plateNumber)) || 0,
    plateChar1: pick(plate.plateFirstLetter, item.plateFirstLetter, item.plateChar1) ?? "",
    plateChar2: pick(plate.plateSecondLetter, item.plateSecondLetter, item.plateChar2) ?? "",
    plateChar3: pick(plate.plateThirdLetter, item.plateThirdLetter, item.plateChar3) ?? "",
    chassisNumber: vin === "UNKNOWN" ? "" : (vin || ""),
    fuelTypeCode: (Number(pick(info.fuelType, item.fuelType, item.fuelTypeCode)) || 1) as Car["fuelTypeCode"],
    // Backend field names: extraKilometerRate / fullFuelRate / lateHourRate.
    // Those are the vehicle-owned rates shown/editable on the vehicle page —
    // they win over the contract-side aliases (extraKmCost, …) which may carry
    // a tenant-level default and diverge from the registered rate.
    extraKmCost: Number(pick(pricing.extraKilometerRate, item.extraKilometerRate, item.extraKmCost)) || 0,
    fullFuelCost: Number(pick(pricing.fullFuelRate, item.fullFuelRate, item.fullFuelCost)) || 0,
    lateFeePerHour: Number(pick(pricing.lateHourRate, item.lateHourRate, item.lateFeePerHour)) || 0,
    enduranceAmount: Number(pick(tajeer.enduranceAmount, item.enduranceAmount)) || 0,
    bodyType: String(pick(info.bodyType, item.bodyType) ?? ""),
    seats: Number(pick(info.seats, item.seats)) || 0,
    transmission: item.transmission || "Automatic",
    istamaraNumber: pick(plate.registrationNumber, item.istamaraNumber, item.registrationNumber) ?? "",
    istamaraExpiry: pick(plate.registrationExpiryDate, item.istamaraExpiry, item.registrationExpiryDate) ?? "",
    periodicInspectionExpiry: pick(plate.inspectionExpiryDate, item.periodicInspectionExpiry, item.inspectionExpiryDate) ?? "",
    insuranceCompany: insuranceCompanyName,
    insurancePolicyNumber: pick(pricing.insurancePolicyNumber, item.insurancePolicyNumber) || "",
    insuranceExpiry: /^(0001|2001)-01-01/.test(String(insuranceExpiry ?? "")) ? "" : (insuranceExpiry || ""),
    insuranceType,
    registrationTypeCode: item.registrationTypeCode,
    operationCardNumber: pick(plate.operationCardNumber, item.operationCardNumber),
    operationCardExpiryDate: pick(plate.operationCardExpiryDate, item.operationCardExpiryDate),
    oilChangeDate: pick(item.oilChangeDate, item.nextOilChangeDate),
    oilChangeDistance: Number(pick(tajeer.oilChangeDistance, item.oilChangeDistance)) || undefined,
    insuranceAmount: Number(pick(pricing.insuranceAmount, item.insuranceAmount)) || undefined,
    otherNotes: pick(plate.otherNotes, item.otherNotes),
    imageUrls,
    fuelLevel: Number(pick(tajeer.fuelLevel, item.fuelLevel)) || undefined,
    odometerReading: Number(pick(tajeer.odometerReading, item.odometerReading)) || undefined,
    dailyKilometerLimit: Number(pick(pricing.dailyKilometerLimit, item.dailyKilometerLimit)) || undefined,
    isKilometerLimitEnabled: pick(pricing.isKilometerLimitEnabled, item.isKilometerLimitEnabled),
    isListingActive: pick(tajeer.isListingActive, item.isListingActive),
    branchId: pick(pricing.branchId, item.branchId),
    sketchItems: mapDamagePointsToSketchItems(item.damagePoints),
  };
}

// Bridges the customer-profile data model (ClientProfile, used by the
// customer list / inquiry / detail pages) into the renter model this flow
// expects, so "Create contract" from a customer profile arrives pre-selected.
export function clientToDriverProfile(c: ClientProfile): DriverProfile {
  const outstandingDebt = (c.debts ?? []).reduce((sum, d) => sum + (d.status !== "paid" ? d.amount : 0), 0);
  const openDispute = (c.disputes ?? []).find((d) => d.status === "open");
  return {
    id: c.id,
    name: c.name,
    nameAr: c.nameAr,
    phone: c.phone,
    idType: c.idType as DriverProfile["idType"],
    idTypeCode: ID_TYPE_CODES[c.idType] ?? 1,
    nationalId: c.idNumber,
    licenseNumber: c.licenseNumber,
    licenseExpiryDate: c.licenseExpiryDate,
    idExpiryDate: c.idExpiryDate,
    email: c.email,
    nationality: c.nationality,
    personAddress: c.personAddress ?? "",
    bookings: c.contracts,
    status: c.kycStatus,
    lastBooking: null,
    rating: c.rating,
    blacklisted: c.blacklisted,
    joinDate: c.joinDate,
    debtAmount: outstandingDebt > 0 ? outstandingDebt : undefined,
    debtNote: outstandingDebt > 0 ? (c.debts ?? []).find((d) => d.status !== "paid")?.notes : undefined,
    debtNoteAr: outstandingDebt > 0 ? (c.debts ?? []).find((d) => d.status !== "paid")?.notesAr : undefined,
    circularNote: openDispute?.notes,
    circularNoteAr: openDispute?.notesAr,
  };
}

import type {
  CreateContractRequest,
  ContractPaymentType,
  ContractType,
  FuelLevel,
} from "@/lib/api-types";
import type { ContractAdditionalService } from "./useContractLookups";

export type BuildCreateContractRequestInput = {
  customerId: number;
  vehicle: Car | undefined;
  workingBranchId: number;
  receiveBranchId: number;
  returnBranchId: number;
  contractTypeCode: ContractType;
  pickupDate: Date;
  returnDate: Date;
  rentPolicyId: number;
  cancellationPolicyId: number;
  allowedKmPerDay: number;
  allowedKmPerHour: number;
  unlimitedKm: boolean;
  allowedLateHours: number;
  rentDayCost: number;
  rentHourCost: number;
  extraKmCost: number;
  fullFuelCost: number;
  driverFarePerDay: number;
  driverFarePerHour: number;
  vehicleTransferCost: number;
  addons: Record<string, boolean>;
  additionalServices: ContractAdditionalService[];
  days: number;
  deliveryKm: number;
  pricing: {
    grossSubtotal: number;
    discountAmount: number;
    total: number;
    advanceAmount: number;
    extraDriverFare: number;
  };
  internationalAuthorizationCost: number;
  extendedCoverageId: number | undefined;
  payMethod: "cash" | "pos";
  payType: "full" | "advance";
  odometerReading: number;
  fuelLevel: number;
  enduranceAmount: number;
  notes?: string | null;
  authorizedDriverId: number | null;
  extraDriverId: number | null;
};

export function buildCreateContractRequest(
  input: BuildCreateContractRequestInput
): CreateContractRequest {
  const paidAmount =
    input.payType === "full" ? input.pricing.total : input.pricing.advanceAmount;
  const paymentTypeId: ContractPaymentType = input.payType === "full" ? 1 : 2;
  const paymentMethodId =
    paidAmount > 0 ? (input.payMethod === "cash" ? 1 : 2) : null;

  const discountPercent =
    input.pricing.grossSubtotal > 0
      ? (input.pricing.discountAmount / input.pricing.grossSubtotal) * 100
      : 0;

  const selectedAdditionalServices =
    input.additionalServices.length > 0
      ? input.additionalServices
          .filter((service) => {
            const key = service.key.toLowerCase().replace(/[-\s]+/g, "_");
            return input.addons[key];
          })
          .map((service) => ({
            additionalServiceId: service.id,
            quantity:
              service.billingUnit === 2
                ? input.days
                : service.billingUnit === 3
                  ? input.deliveryKm
                  : 1,
          }))
      : [];

  return {
    customerId: input.customerId,
    vehicleId: input.vehicle?.id ?? 0,
    workingBranchId: input.workingBranchId,
    receiveBranchId: input.receiveBranchId,
    returnBranchId: input.returnBranchId,
    contractType: input.contractTypeCode,
    startAt: input.pickupDate.toISOString(),
    endAt: input.returnDate.toISOString(),
    rentPolicyId: input.rentPolicyId,
    cancellationPolicyId: input.cancellationPolicyId,
    // Tajeer rejects a null allowedKmPerDay when unlimitedKm is false —
    // always send a positive value (entered, vehicle limit, or 200 default).
    allowedKmPerDay: input.unlimitedKm
      ? null
      : (input.allowedKmPerDay > 0 ? input.allowedKmPerDay : (input.vehicle?.dailyKilometerLimit ?? 200)),
    allowedKmPerHour: input.unlimitedKm ? null : (input.allowedKmPerHour > 0 ? input.allowedKmPerHour : 30),
    unlimitedKm: input.unlimitedKm,
    allowedLateHours: input.allowedLateHours,
    rentDayCost: input.rentDayCost,
    rentHourCost: input.rentHourCost,
    extraKmCost: input.extraKmCost,
    fullFuelCost: input.fullFuelCost,
    driverFarePerDay: input.driverFarePerDay,
    driverFarePerHour: input.driverFarePerHour,
    vehicleTransferCost: input.vehicleTransferCost,
    extraDriverCost: input.pricing.extraDriverFare,
    discountPercent,
    paidAmount,
    paymentTypeId,
    paymentMethodId,
    otherPaymentMethodCode: null,
    internationalAuthorizationCost: input.internationalAuthorizationCost,
    extendedCoverageId: input.extendedCoverageId ?? null,
    depositAmount: 0,
    odometerReading: input.vehicle?.odometerReading ?? input.odometerReading,
    fuelLevel: (input.vehicle?.fuelLevel ?? input.fuelLevel ?? 0) as FuelLevel,
    enduranceAmount: input.enduranceAmount,
    notes: input.notes ?? null,
    authorizedDriverId: input.authorizedDriverId,
    extraDriverId: input.extraDriverId,
    additionalServices: selectedAdditionalServices.length > 0 ? selectedAdditionalServices : null,
  };
}
