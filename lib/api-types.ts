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
  Available = 1,
  Rented = 2,
  Overdue = 3,
  Maintenance = 4,
  Reserved = 5,
  Inactive = 6,
  Draft = 7,
}

export enum VehicleFuelType {
  Petrol = 1,
  Diesel = 2,
  Electric = 3,
  Hybrid = 4,
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

export enum ConditionGrade {
  Excellent = 1,
  Good = 2,
  Weak = 3,
}

export enum WorkingStatus {
  NotWorking = 0,
  Working = 1,
}

export enum CleanlinessStatus {
  Clean = 1,
  Dirty = 2,
}

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
  oilType: VehicleOilType;
  lastOilChangeDate: string;
  oilChangeDistance: number;
  airConditionGrade: ConditionGrade;
  radioStatus: WorkingStatus;
  screenStatus: WorkingStatus;
  odometerStatus: WorkingStatus;
  seatCleanliness: CleanlinessStatus;
  keyStatus: WorkingStatus;
  tireCondition: TireCondition;
  spareTireStatus: PresenceStatus;
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
  roleName?: string;
  branchIds?: number[];
}

export interface UpdateTenantUserRequest {
  userName?: string;
  email?: string;
  phoneNumber?: string;
  fullName?: string;
  isActive?: boolean;
  roleName?: string;
  branchIds?: number[];
}

// ─── Lookup ─────────────────────────────────────────────────────

export interface LookupSection {
  // Add lookup section fields
  [key: string]: any;
}

export interface SystemLookupContextRequest {
  sections?: LookupSection[];
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
