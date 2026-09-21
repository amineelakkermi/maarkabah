// ─────────────────────────────────────────────────────────────
//  Maarkbh · مركبة — API Types
//  TypeScript types generated from swagger.json
// ─────────────────────────────────────────────────────────────

// ─── Authentication ───────────────────────────────────────────

export interface TokenRequest {
  grant_type: string;
  username: string;
  password: string;
}

export interface RefreshTokenRequest {
  grant_type: string;
  refresh_token: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
}

// ─── Account ───────────────────────────────────────────────────

export interface ChangePasswordRequest {
  currentPassword?: string;
  newPassword?: string;
}

// ─── Customer Identity Types ───────────────────────────────────

export enum IdentityType {
  Saudi = 1,
  Iqama = 2,
  Visitor = 3,
  GCC = 4,
}

export enum VerificationStatus {
  Pending = 1,
  Verified = 2,
  Rejected = 3,
}

export interface NationalIdentityInfo {
  beneficiaryIdNumber?: string;
  birthDate: string;
  email?: string;
  isHijriBirthDate: boolean;
}

export interface ResidenceIdentityInfo {
  beneficiaryIdNumber?: string;
  birthDate: string;
  email?: string;
  isHijriBirthDate: boolean;
}

export interface VisitorIdentityInfo {
  email?: string;
  borderNumber?: string;
  passportNumber?: string;
  licenseNumber?: string;
  licenseExpiryDate: string;
  licenseIssuePlace?: string;
  countryId: number;
  identityCopyNumber?: string;
  identityExpiryDate: string;
}

export interface GulfIdentityInfo {
  beneficiaryIdNumber?: string;
  birthDate: string;
  email?: string;
  isHijriBirthDate: boolean;
}

// ─── Customer ───────────────────────────────────────────────────

export interface CreateCustomerCommand {
  fullNameEn?: string;
  fullNameAr?: string;
  phoneNumber?: string;
  email?: string;
  identityType?: IdentityType;
  address?: string;
  national?: NationalIdentityInfo;
  residence?: ResidenceIdentityInfo;
  visitor?: VisitorIdentityInfo;
  gulf?: GulfIdentityInfo;
  isActive?: boolean;
}

export interface UpdateCustomerRequest {
  fullNameEn?: string;
  fullNameAr?: string;
  phoneNumber?: string;
  identityType?: IdentityType;
  address?: string;
  national?: NationalIdentityInfo;
  residence?: ResidenceIdentityInfo;
  visitor?: VisitorIdentityInfo;
  gulf?: GulfIdentityInfo;
  isActive?: boolean;
}

export interface CustomerSearchRequest {
  search?: string;
  identityType?: IdentityType;
  verificationStatus?: VerificationStatus;
  isBlacklisted?: boolean;
  isActive?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

export interface CustomerReasonRequest {
  reason?: string;
}

// ─── Branch ────────────────────────────────────────────────────

export interface CreateBranchCommand {
  nameAr?: string;
  nameEn?: string;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
}

export interface UpdateBranchRequest {
  nameAr?: string;
  nameEn?: string;
  isActive?: boolean;
  latitude?: number;
  longitude?: number;
}

export interface BranchSearchRequest {
  search?: string;
  isActive?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

// ─── Country ───────────────────────────────────────────────────

export interface CreateCountryRequest {
  nameAr?: string;
  nameEn?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateCountryRequest {
  nameAr?: string;
  nameEn?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CountrySearchRequest {
  search?: string;
  pageNumber?: number;
  pageSize?: number;
}

// ─── Vehicle Enums ─────────────────────────────────────────────

export enum VehicleFleetStatus {
  Draft = 1,
  Available = 2,
  Rented = 3,
  Overdue = 4,
  Maintenance = 5,
  Reserved = 6,
  Inactive = 7,
}

export enum VehicleFuelType {
  Petrol95 = 1,
  Petrol91 = 2,
  Diesel = 3,
  Electric = 4,
}

export enum VehicleBodyType {
  Sedan = 1,
  SUV = 2,
  Coupe = 3,
  Hatchback = 4,
  Truck = 5,
  Van = 6,
  Motorcycle = 7,
}

export enum VehicleCategory {
  Economy = 1,
  Compact = 2,
  Midsize = 3,
  Fullsize = 4,
  Luxury = 5,
  Sports = 6,
  Commercial = 7,
}

export enum VehicleTransmissionType {
  Automatic = 1,
  Manual = 2,
}

// ─── Vehicle ───────────────────────────────────────────────────

export enum VehicleDamageType {
  SmallScratch = 1,
  DeepScratch = 2,
  VeryDeepScratch = 3,
  BendInBody = 4,
}

export interface VehicleDamagePointDto {
  damageType: VehicleDamageType;
  positionX: number;
  positionY: number;
  note?: string;
  fileId?: number;
}

export interface VehicleImageDto {
  slotCode?: string;
  fileId: number;
  isPrimary: boolean;
  sortOrder: number;
}

export interface PlateDocsRequest {
  plateTypeId?: number;
  plateNumber?: string;
  plateFirstLetter?: string;
  plateSecondLetter?: string;
  plateThirdLetter?: string;
  registrationNumber?: string;
  registrationExpiryDate?: string;
  inspectionExpiryDate?: string;
  serialNumber?: string;
  operationCardNumber?: string;
  operationCardExpiryDate?: string;
  customsNumber?: string;
  otherNotes?: string;
}

export interface VehicleInfoRequest {
  makeId: number;
  modelId: number;
  year: number;
  color?: string;
  vin?: string;
  engineNumber?: string;
  bodyType?: VehicleBodyType;
  category?: VehicleCategory;
  seats?: number;
  cylinders?: number;
  fuelType?: VehicleFuelType;
  transmissionType?: VehicleTransmissionType;
  payloadKg?: number;
}

// Used by airConditionGrade / radioStatus / screenStatus (1–4).
export enum ConditionGrade {
  Excellent = 1,
  Good = 2,
  Weak = 3,
  Broken = 4,
}

export enum WorkingStatus {
  NotWorking = 0,
  Working = 1,
}

export enum CleanlinessStatus {
  Clean = 1,
  Dirty = 2,
}

// Used by tireCondition / spareTireStatus (1–3).
export enum TireCondition {
  Excellent = 1,
  Good = 2,
  Weak = 3,
}

export enum PresenceStatus {
  NotAvailable = 0,
  Available = 1,
}

export enum FuelLevel {
  Full = 0,
  ThreeQuarters = 1,
  Half = 2,
  Quarter = 3,
  Empty = 4,
}

/** @deprecated oilType is free text on the API now (e.g. "5W-30"). Kept for
 * any legacy numeric values still coming back from older vehicles. */
export enum VehicleOilType {
  Synthetic = 1,
  SemiSynthetic = 2,
  Mineral = 3,
  Other = 4,
}

export interface TajeerStatusRequest {
  status: VehicleFleetStatus;
  notes?: string;
  isListingActive: boolean;
  odometerReading: number;
  fuelLevel: FuelLevel;
  enduranceAmount: number;
  /** Free text, e.g. "5W-30". */
  oilType: string;
  lastOilChangeDate: string;
  oilChangeDistance: number;
  airConditionGrade: ConditionGrade;
  radioStatus: ConditionGrade;
  screenStatus: ConditionGrade;
  odometerStatus: WorkingStatus;
  seatCleanliness: CleanlinessStatus;
  keyStatus: WorkingStatus;
  tireCondition: TireCondition;
  spareTireStatus: TireCondition;
  fireExtinguisherStatus: PresenceStatus;
  firstAidKitStatus: PresenceStatus;
  safetyTriangleStatus: PresenceStatus;
  tireToolsStatus: PresenceStatus;
}

export interface InsurancePricingRequest {
  branchId?: number;
  insuranceCompanyId?: number;
  insuranceTypeId?: number;
  insurancePolicyNumber?: string;
  insuranceExpiryDate?: string;
  insuranceAmount?: number;
  dailyRate?: number;
  extraKilometerRate?: number;
  fullFuelRate?: number;
  lateHourRate?: number;
  isKilometerLimitEnabled?: boolean;
  dailyKilometerLimit?: number;
}

export interface VehicleRequest {
  id?: number;
  plate?: PlateDocsRequest;
  info?: VehicleInfoRequest;
  insurancePricing?: InsurancePricingRequest;
  tajeerStatus?: TajeerStatusRequest;
  featureTypeIds?: number[];
  images?: VehicleImageDto[];
  damagePoints?: VehicleDamagePointDto[];
}

export interface VehicleSearchRequest {
  search?: string;
  branchId?: number;
  makeId?: number;
  modelId?: number;
  status?: VehicleFleetStatus;
  pageNumber?: number;
  pageSize?: number;
}

// ─── Admin Tenant ───────────────────────────────────────────────

export interface CreateTenantUserRequest {
  userName?: string;
  email?: string;
  phoneNumber?: string;
  password?: string;
  fullName?: string;
  identityType?: number;
  nationalId?: string;
  identityExpiryDate?: string;
  birthDate?: string;
  roleName?: string;
  branchIds?: number[];
}

export interface UpdateTenantUserRequest {
  userName?: string;
  email?: string;
  phoneNumber?: string;
  fullName?: string;
  identityType?: number;
  nationalId?: string;
  identityExpiryDate?: string;
  birthDate?: string;
  isActive?: boolean;
  roleName?: string;
  branchIds?: number[];
}

// ─── Lookup ─────────────────────────────────────────────────────

export type LookupSectionName =
  | "VehicleMakes"
  | "VehicleModels"
  | "PlateTypes"
  | "InsuranceCompanies"
  | "InsuranceTypes"
  | "VehicleFeatureTypes"
  | "VehicleEnums"
  | "Countries"
  | "Branches"
  | "PersonEnums"
  | "AdditionalServiceEnums"
  | "RentPolicyEnums";

export interface SystemLookupContextRequest {
  sections?: LookupSectionName[];
}

// ─── Generic Search ─────────────────────────────────────────────

export interface VehicleLookupSearchRequest {
  search?: string;
  isActive?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

export interface CreateVehicleLookupRequest {
  nameAr?: string;
  nameEn?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateVehicleLookupRequest {
  nameAr?: string;
  nameEn?: string;
  sortOrder?: number;
  isActive?: boolean;
}

// ─── Customer Warehouse ─────────────────────────────────────────

export interface CustomerWarehouseInquiryRequest {
  search?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface CustomerWarehouseReportRequest {
  identityType?: IdentityType;
  idNumber?: string;
  reason?: string;
  phoneNumber?: string;
  fullNameAr?: string;
  fullNameEn?: string;
}

// ─── Additional Services ───────────────────────────────────────

export enum AdditionalServiceBillingUnit {
  Once = 1,
  PerDay = 2,
  PerKm = 3,
}

export interface AdditionalServiceDto {
  id: number;
  code?: string;
  nameAr?: string;
  nameEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  billingUnit?: AdditionalServiceBillingUnit;
  unitPrice?: number;
  sortOrder?: number;
  iconKey?: string;
  isActive?: boolean;
  isSystem?: boolean;
  isTenantWide?: boolean;
  branchCount?: number;
  branchIds?: number[];
}

export interface CreateAdditionalServiceCommand {
  nameAr?: string;
  nameEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  billingUnit?: AdditionalServiceBillingUnit;
  unitPrice?: number;
  sortOrder?: number;
  iconKey?: string;
  branchIds?: number[];
}

export interface UpdateAdditionalServiceRequest {
  nameAr?: string;
  nameEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  billingUnit?: AdditionalServiceBillingUnit;
  unitPrice?: number;
  sortOrder?: number;
  iconKey?: string;
  isActive?: boolean;
  branchIds?: number[];
}

export interface AdditionalServiceSearchRequest {
  search?: string;
  isActive?: boolean;
  billingUnit?: AdditionalServiceBillingUnit;
  branchId?: number;
  pageNumber?: number;
  pageSize?: number;
}

export interface AdditionalServicePickerRequest {
  branchId?: number;
}

export enum RentPolicySource {
  Tajeer = 1,
  Custom = 2,
}

export interface RentPolicyDto {
  id: number;
  code?: string;
  tajeerId?: number;
  nameAr?: string;
  nameEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  extensionPolicy?: number | null;
  earlyReturnPolicy?: number | null;
  accidentReportPolicy?: number | null;
  fuelReturnPolicy?: number | null;
  breakdownReportPolicy?: number | null;
  sortOrder?: number;
  isActive?: boolean;
  source?: RentPolicySource;
}

export interface RentPolicySearchRequest {
  search?: string;
  isActive?: boolean;
  source?: RentPolicySource;
  pageNumber?: number;
  pageSize?: number;
}

export interface SaveRentPolicyRequest {
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  extensionPolicy: number;
  earlyReturnPolicy: number;
  accidentReportPolicy: number;
  fuelReturnPolicy: number;
  breakdownReportPolicy: number;
  sortOrder?: number;
  isActive: boolean;
}

// ─── Cancellation Policies ───────────────────────────────────────
// Internal Maarkbh catalog (no Tajeer source). Each policy is a ladder of
// refund tiers: "if cancelled at least N hours before start, refund X%".

export interface CancellationPolicyTier {
  hoursBeforeStart: number;
  refundPercent: number;
}

export interface CancellationPolicyDto {
  id: number;
  nameAr?: string;
  nameEn?: string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  /** Seeded DEFAULT policy — cannot be deleted (backend returns 400). */
  isSystem?: boolean;
  tiers?: CancellationPolicyTier[];
}

export interface CancellationPolicySearchRequest {
  search?: string;
  isActive?: boolean | null;
  pageNumber?: number;
  pageSize?: number;
}

export interface SaveCancellationPolicyRequest {
  nameAr: string;
  nameEn: string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  sortOrder?: number;
  isActive: boolean;
  tiers: CancellationPolicyTier[];
}

export interface ExtendedCoverageSearchRequest {
  search?: string;
  isActive?: boolean | null;
  pageNumber?: number;
  pageSize?: number;
}

export interface ExtendedCoveragePickerRequest {}

export interface UpdateExtendedCoverageRequest {
  cost: number;
  sortOrder: number;
  isActive: boolean;
}

export type ContractStatus = 1 | 2 | 3 | 4 | 5 | 6;
export type ContractType = 1 | 2 | 3 | 4;
export type ContractPaymentType = 1 | 2;

export interface ContractAdditionalServiceInput {
  additionalServiceId: number;
  quantity: number;
}

export interface ContractSearchRequest {
  search?: string;
  status?: ContractStatus | null;
  statuses?: ContractStatus[] | null;
  branchId?: number | null;
  customerId?: number | null;
  vehicleId?: number | null;
  from?: string | null;
  to?: string | null;
  pageNumber?: number;
  pageSize?: number;
}

export interface ContractStatusCountsRequest {
  search?: string;
  branchId?: number | null;
  customerId?: number | null;
  vehicleId?: number | null;
  from?: string | null;
  to?: string | null;
}

export interface ContractRequest {
  workingBranchId: number;
  receiveBranchId: number;
  returnBranchId: number;
  contractType: ContractType;
  startAt: string;
  endAt: string;
  rentPolicyId: number;
  cancellationPolicyId: number;
  allowedKmPerDay?: number | null;
  allowedKmPerHour?: number | null;
  unlimitedKm: boolean;
  allowedLateHours: number;
  rentDayCost: number;
  rentHourCost: number;
  extraKmCost: number;
  fullFuelCost: number;
  driverFarePerDay: number;
  driverFarePerHour: number;
  vehicleTransferCost: number;
  extraDriverCost: number;
  discountPercent: number;
  paidAmount: number;
  paymentTypeId: ContractPaymentType;
  paymentMethodId?: number | null;
  otherPaymentMethodCode?: string | null;
  internationalAuthorizationCost: number;
  extendedCoverageId?: number | null;
  depositAmount: number;
  odometerReading: number;
  fuelLevel: FuelLevel;
  enduranceAmount: number;
  notes?: string | null;
  authorizedDriverId?: number | null;
  extraDriverId?: number | null;
  additionalServices?: ContractAdditionalServiceInput[] | null;
}

export interface CreateContractRequest extends ContractRequest {
  customerId: number;
  vehicleId: number;
}

export type UpdateContractRequest = ContractRequest;

export interface ExtendContractRequest {
  newEndAt: string;
}

export interface CancelContractRequest {
  reason?: string | null;
}

export interface ContractActivitySearchRequest {
  action?: number | null;
  pageNumber?: number;
  pageSize?: number;
}

export interface ContractTajeerLogSearchRequest {
  search?: string | null;
  operation?: string | null;
  contractId?: number | null;
  isSuccess?: boolean | null;
  fromUtc?: string | null;
  toUtc?: string | null;
  pageNumber?: number;
  pageSize?: number;
}

// ─── Tenant Settings ───────────────────────────────────────────

export interface TenantOfficeProfileRequest {
  name?: string;
  tagline?: string;
  taxNumber?: string;
  taxRate?: number;
  commercialRegistrationNumber?: string;
  timeZone?: string;
  supportEmail?: string;
  supportAddress?: string;
  supportPhone?: string;
  supportWhatsApp?: string;
}

export interface SmsSenderId {
  id?: string;
  enabled?: boolean;
}

export interface TenantSystemSettingsRequest {
  sessionTimeoutMinutes?: number;
  contractAutoCancelHours?: number;
  lateFeeGraceHours?: number;
  otpResendLimit?: number;
  otpLockoutMinutes?: number;
  otpValidityMinutes?: number;
  smsEnabled?: boolean;
  senderIds?: SmsSenderId[];
  gatewayUrl?: string;
  gatewayKey?: string;
  appId?: string;
  appKey?: string;
  authorization?: string;
}

export interface TajeerVerifyRequest {
  gatewayUrl?: string;
  gatewayKey?: string;
  appId?: string;
  appKey?: string;
  authorization?: string;
}

// ─── Branches · Tajeer ─────────────────────────────────────────

export interface ImportTajeerBranchesRequest {
  tajeerIds?: number[];
}

// ─── Contract Handover (Delivery / Return) ─────────────────────

export interface PendingDeliveriesSearchRequest {
  search?: string;
  branchId?: number | null;
  pageNumber?: number;
  pageSize?: number;
}

export interface PendingReturnsSearchRequest {
  search?: string;
  branchId?: number | null;
  isLate?: boolean | null;
  pageNumber?: number;
  pageSize?: number;
}

export interface HandoverSketchPoint {
  type?: string;
  x?: number;
  y?: number;
}

export interface HandoverConditionItem {
  isOk?: boolean;
  note?: string | null;
  attachmentId?: number | null;
}

export interface HandoverCondition {
  ac?: HandoverConditionItem;
  radioStereo?: HandoverConditionItem;
  screen?: HandoverConditionItem;
  speedometer?: HandoverConditionItem;
  keys?: HandoverConditionItem;
  carSeats?: HandoverConditionItem;
  tires?: HandoverConditionItem;
  spareTire?: HandoverConditionItem;
  safetyTriangle?: HandoverConditionItem;
  fireExtinguisher?: HandoverConditionItem;
  firstAidKit?: HandoverConditionItem;
  spareTireTools?: HandoverConditionItem;
}

export interface DeliveryChecklist {
  contractSigned?: boolean;
  customerIdPhotographed?: boolean;
  securityDepositCollected?: boolean;
  walkAroundInspectionDone?: boolean;
  fuelLevelRecorded?: boolean;
  keysHandedOver?: boolean;
}

export interface RecordDeliveryRequest {
  odometerAtDelivery?: number;
  fuelLevelAtDelivery?: FuelLevel;
  sketchInfoAtDelivery?: HandoverSketchPoint[];
  condition?: HandoverCondition;
  conditionNotes?: string | null;
  checklist?: DeliveryChecklist;
}

export interface ReturnChecklist {
  customerPresentAtCounter?: boolean;
  odometerRecorded?: boolean;
  fuelLevelChecked?: boolean;
  walkAroundCompleted?: boolean;
  customerConfirmedReturn?: boolean;
}

export interface RecordReturnRequest {
  odometerAtReturn?: number;
  fuelLevelAtReturn?: FuelLevel;
  sketchInfoAtReturn?: HandoverSketchPoint[];
  condition?: HandoverCondition;
  conditionNotes?: string | null;
  lateFeeAmount?: number;
  lateHours?: number;
  extraKmAmount?: number;
  extraKm?: number;
  fuelDifferenceAmount?: number;
  damageAmount?: number;
  checklist?: ReturnChecklist;
}

export interface ReturnChargesQuery {
  odometerAtReturn?: number;
  fuelLevelAtReturn?: FuelLevel;
  actualReturnAt?: string;
}

export interface DisputeContractRequest {
  notes?: string;
}

// ─── Contract Tajeer lifecycle ─────────────────────────────────

export interface TajeerClosePaymentRequest {
  odometerReading?: number;
  availableFuel?: number;
  actualEndAt?: string;
  paid?: number;
  discount?: number;
  oilChangeCost?: number;
  sparePartsCost?: number;
  damageCost?: number;
}

export interface TajeerCloseContractRequest {
  mainClosureCode: number;
  closureCode?: number | null;
  actualEndAt?: string;
  odometerReading?: number;
  fuelLevel?: number;
  paid?: number;
  discount?: number;
  oilChangeCost?: number;
  paymentMethodCode?: number;
}

export interface TajeerSuspendContractRequest {
  suspensionCode: number;
  mojEnabled?: boolean;
  odometerReading?: number;
  fuelLevel?: number;
  paid?: number;
  oilChangeCost?: number;
  sparePartsCost?: number;
  damageCost?: number;
  paymentMethodCode?: number;
}

export interface TajeerUpdatePaidRequest {
  newPaidAmount: number;
  paymentMethodCode?: number;
}

export interface TajeerWebhookRequest {
  notificationUrl: string;
  secret: string;
}

// ─── Late Returns ──────────────────────────────────────────────

export interface LateReturnSearchRequest {
  search?: string;
  branchId?: number | null;
  displayStatus?: string | null;
  from?: string | null;
  to?: string | null;
  pageNumber?: number;
  pageSize?: number;
}

// ─── Pricing ───────────────────────────────────────────────────

export interface LateReturnPenaltySettings {
  graceHours?: number;
  perHourDivisor?: number;
  fullDayThresholdHours?: number;
}

export interface DisputePolicyTerm {
  textAr?: string;
  textEn?: string;
}

export interface DisputePolicy {
  disputeWindowHours?: number;
  terms?: DisputePolicyTerm[];
}

export interface DiscountRateSearchRequest {
  search?: string;
  isActive?: boolean | null;
  pageNumber?: number;
  pageSize?: number;
}

export interface SaveDiscountRateRequest {
  nameAr?: string;
  nameEn?: string;
  percent?: number;
  sortOrder?: number;
  isActive?: boolean;
}

// ─── Tajeer API Logs ───────────────────────────────────────────

export interface TajeerApiLogSearchRequest {
  search?: string;
  operation?: string | null;
  contractId?: number | null;
  isSuccess?: boolean | null;
  pageNumber?: number;
  pageSize?: number;
}
