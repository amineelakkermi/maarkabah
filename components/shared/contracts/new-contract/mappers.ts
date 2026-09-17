import type { DriverProfile, ClientProfile, Car } from "@/lib/data";
import { mapStatusFromBackend } from "@/lib/fleet";
import { normalizeKycStatus, formatPlate } from "@/lib/formatting";
import { ID_TYPE_CODES } from "./constants";

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapBackendVehicleToCar(item: any): Car {
  console.log("[DEBUG] Vehicle raw:", { id: item.id, plate: item.plateNumber, status: item.status, tajeerStatus: item.tajeerStatus, branchId: item.branchId, currentBranchId: item.currentBranchId });
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

  return {
    id: item.id,
    name: `${item.makeName || ""} ${item.modelName || ""} ${item.year || ""}`.trim(),
    plate: formatPlate(item),
    make: item.makeName || "",
    model: item.modelName || "",
    type: item.bodyType || "",
    color: item.color || "",
    year: item.year || 0,
    status: mapStatusFromBackend(item.status),
    customer: item.customerName,
    returnTime: item.returnTime,
    speed: item.speed,
    location: item.location,
    mapX: item.mapX || 0,
    mapY: item.mapY || 0,
    dailyRate: item.dailyRate || 0,
    kmCap: item.kmCap ?? 0,
    utilization: item.utilization || 0,
    plateNumber: item.plateNumber || 0,
    plateChar1: item.plateFirstLetter ?? item.plateChar1 ?? "",
    plateChar2: item.plateSecondLetter ?? item.plateChar2 ?? "",
    plateChar3: item.plateThirdLetter ?? item.plateChar3 ?? "",
    chassisNumber: item.chassisNumber || "",
    fuelTypeCode: item.fuelTypeCode || 1,
    extraKmCost: item.extraKmCost || 0,
    fullFuelCost: item.fullFuelCost || 0,
    lateFeePerHour: item.lateFeePerHour || 0,
    enduranceAmount: item.enduranceAmount || 0,
    bodyType: item.bodyType || "",
    seats: item.seats || 0,
    transmission: item.transmission || "Automatic",
    istamaraNumber: item.istamaraNumber || "",
    istamaraExpiry: item.istamaraExpiry || "",
    periodicInspectionExpiry: item.periodicInspectionExpiry || "",
    insuranceCompany: item.insuranceCompany || "",
    insurancePolicyNumber: item.insurancePolicyNumber || "",
    insuranceExpiry: item.insuranceExpiry || "",
    insuranceType: item.insuranceType || "شامل",
    registrationTypeCode: item.registrationTypeCode,
    operationCardNumber: item.operationCardNumber,
    operationCardExpiryDate: item.operationCardExpiryDate,
    oilChangeDate: item.oilChangeDate,
    insuranceAmount: item.insuranceAmount,
    otherNotes: item.otherNotes,
    imageUrls,
    fuelLevel: item.fuelLevel,
    odometerReading: item.odometerReading,
    dailyKilometerLimit: item.dailyKilometerLimit,
    isKilometerLimitEnabled: item.isKilometerLimitEnabled,
    isListingActive: item.isListingActive,
    branchId: item.branchId,
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
    allowedKmPerDay: input.unlimitedKm
      ? null
      : (input.vehicle?.isKilometerLimitEnabled === false
          ? null
          : (input.allowedKmPerDay > 0 ? input.allowedKmPerDay : (input.vehicle?.dailyKilometerLimit ?? 200))),
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
