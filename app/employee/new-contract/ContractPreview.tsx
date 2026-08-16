"use client";
import Image from "next/image";
import { SketchComponent } from "@/components/employee/SketchComponent";
import type { SketchItem } from "@/lib/tajeer";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Branch   { id: number; nameAr: string; nameEn: string }
interface Customer { name: string; nameAr: string; phone: string }
interface Car {
  make: string; model: string; year: number; plate: string; type: string; color: string;
  chassisNumber: string; fuelTypeCode: number;
  istamaraNumber: string; istamaraExpiry: string; periodicInspectionExpiry: string;
  insuranceCompany: string; insurancePolicyNumber: string; insuranceExpiry: string; insuranceType: string;
}
interface RentStatus {
  availableFuel?: number; odometerReading?: number; oilType?: string;
  ac?: number; radioStereo?: number; screen?: number; speedometer?: number;
  keys?: number; carSeats?: number; tires?: number; spareTire?: number;
  spareTireTools?: number; safetyTriangle?: number; fireExtinguisher?: number;
  firstAidKit?: number; oilChangeKmDistance?: number; enduranceAmount?: number;
  oilChangeDate?: string;
}
interface LOOKUP { readonly code: number; readonly ar: string; readonly en: string }
interface TAJEER_LOOKUPS_TYPE {
  readonly idTypes: readonly LOOKUP[];
  readonly fuelTypes: readonly LOOKUP[];
  readonly availableFuelOptions: readonly LOOKUP[];
  readonly acOptions: readonly LOOKUP[];
  readonly workingOptions: readonly LOOKUP[];
  readonly seatsOptions: readonly LOOKUP[];
  readonly tiresOptions: readonly LOOKUP[];
  readonly availableOptions: readonly LOOKUP[];
  readonly contractTypes: readonly LOOKUP[];
}

interface Props {
  ar: boolean;
  selectedCustomer: Customer;
  car: Car;
  idTypeCode: number;
  newIdNumber: string;
  renterIdExpiry: string;
  renterLicenseNumber: string;
  renterLicenseExpiry: string;
  renterBirthDate: string;
  renterHijriBirth: string;
  renterIdCopyNumber: string;
  renterAddress: string;
  renterNationalityCode: string;
  renterEmail: string;
  renterPassport?: string;
  renterLicenseIssuePlace?: string;
  renterBorderNumber?: string;
  contractTypeCode: number;
  contractStartDate: string;
  contractEndDate: string;
  days: number;
  rentDayCost: number;
  rentHourCost: number;
  extraKmCost: number;
  allowedKmPerDay: number;
  allowedKmPerHour: number;
  allowedLateHours: number;
  lateFeePerHour: number;
  unlimitedKm: boolean;
  base: number;
  subtotal: number;
  vat: number;
  total: number;
  advanceAmount: number;
  remaining: number;
  payType: string;
  addons: Record<string, boolean>;
  addonPrices: Record<string, number>;
  ADD_ONS: { k: string; nameAr: string; nameEn: string }[];
  rentStatus: RentStatus;
  sketchItems: SketchItem[];
  receiveBranchId: number;
  returnBranchId: number;
  workingBranchId: number;
  branches: Branch[];
  tajeerResponse: { contractNumber?: string | number; totalPaymentDetails?: { paid: number; remaining: number; total: number } } | null;
  contractStep: string;
  signed: boolean;
  rentPolicies?: { id: number; name?: string; nameAr?: string; nameEn?: string }[];
  rentPolicyId?: number;
  TAJEER_LOOKUPS: TAJEER_LOOKUPS_TYPE;

  // Authorized driver ("المفوض") — shown when the renter isn't the driver
  isRenterDriver: boolean;
  authDriverIdType?: number;
  authDriverIdNumber?: string;
  authDriverBirthDate?: string;
  authDriverMobile?: string;
  authDriverAddress?: string;
  authorizationStartDate?: string;
  authorizationEndDate?: string;
  authorizationTypeCode?: "internal" | "external";
  authorizationCountry?: string;

  // Extra driver
  selectedExtraDriver?: { name: string; nameAr: string; phone: string; licenseNumber?: string; licenseExpiryDate?: string; birthDate?: string } | null;
  extraDriverIdType?: number;
  extraDriverIdNumber?: string;
  extraDriverAddress?: string;
  extraDriverBirthDate?: string;
  extraDriverHijriBirth?: string;

  // Billing & Discounts
  discountPercent?: number;
  discountAmount?: number;
  payMethod?: string;
  otherPayMethod?: string;
  employeeId?: string;

  // Vehicle data
  registrationTypeCode?: 1 | 3;
  operationCardNumber?: string;
  operationCardExpiry?: string;
  vehicleOtherNotes?: string;

  // Insurance
  insuranceAmount?: number;

  // Financial
  internationalAuthorizationCost?: number;
  driverFarePerDay?: number;
  driverFarePerHour?: number;
  vehicleTransferCost?: number;
  fullFuelCost?: number;

  // Rental policy (already-resolved bilingual text per selection)
  rentalPolicyText?: {
    extension: { ar: string; en: string };
    earlyReturn: { ar: string; en: string };
    accidentReport: { ar: string; en: string };
    fuelReturn: { ar: string; en: string };
    breakdownReport: { ar: string; en: string };
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const T = (en: string, ar: string, isAr: boolean) => isAr ? ar : en;

const lookup = (arr: readonly LOOKUP[], code?: number, isAr = false) => {
  if (!code && code !== 0) return "—";
  const item = arr.find(o => o.code === code);
  return item ? (isAr ? item.ar : item.en) : "—";
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const SectionHeader = ({ ar: arLabel, en: enLabel }: { ar: string; en: string }) => (
  <div style={{
    background: "#1a2233", color: "#fff", padding: "6px 12px",
    display: "flex", justifyContent: "space-between", alignItems: "center",
    fontSize: 11, fontWeight: 700, marginBottom: 0,
  }}>
    <span style={{ direction: "rtl" }}>{arLabel}</span>
    <span style={{ direction: "ltr" }}>{enLabel}</span>
  </div>
);

const FieldGrid = ({ children, cols = 4 }: { children: React.ReactNode; cols?: number }) => (
  <div style={{
    display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gap: "0", border: "1px solid #ccc", borderTop: "none",
  }}>
    {children}
  </div>
);

const Field = ({
  label, labelAr, value, wide = false, span = 1
}: { label: string; labelAr: string; value?: string | number; wide?: boolean; span?: number }) => (
  <div style={{
    borderRight: "1px solid #ccc", borderBottom: "1px solid #ccc",
    padding: "5px 8px", gridColumn: span > 1 ? `span ${span}` : undefined,
  }}>
    <div style={{ fontSize: 9, color: "#666", display: "flex", justifyContent: "space-between" }}>
      <span style={{ direction: "rtl" }}>{labelAr}</span>
      <span style={{ direction: "ltr" }}>{label}</span>
    </div>
    <div style={{ fontSize: 11, fontWeight: 600, color: "#111", marginTop: 2, minHeight: 14 }}>
      {value ?? "—"}
    </div>
  </div>
);

const SigLine = ({ label, labelAr }: { label: string; labelAr: string }) => (
  <div style={{ padding: "8px 10px", borderRight: "1px solid #ccc", borderBottom: "1px solid #ccc" }}>
    <div style={{ fontSize: 9, color: "#666", display: "flex", justifyContent: "space-between", marginBottom: 28 }}>
      <span style={{ direction: "rtl" }}>{labelAr}</span>
      <span style={{ direction: "ltr" }}>{label}</span>
    </div>
    <div style={{ borderBottom: "1px dashed #999", height: 1 }} />
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ContractPreview({
  ar,
  selectedCustomer, car, idTypeCode, newIdNumber,
  renterIdExpiry, renterLicenseNumber, renterLicenseExpiry,
  renterBirthDate, renterHijriBirth, renterIdCopyNumber, renterAddress, renterNationalityCode,
  contractTypeCode, contractStartDate, contractEndDate, days,
  rentDayCost, rentHourCost, extraKmCost,
  allowedKmPerDay, allowedKmPerHour, allowedLateHours, lateFeePerHour, unlimitedKm,
  base, subtotal, vat, total, advanceAmount, remaining, payType,
  addons, addonPrices, ADD_ONS,
  rentStatus, sketchItems,
  receiveBranchId, returnBranchId, workingBranchId, branches,
  tajeerResponse, contractStep, signed,
  rentPolicies, rentPolicyId,
  TAJEER_LOOKUPS,
  isRenterDriver, authDriverIdType, authDriverIdNumber, authDriverBirthDate, authDriverMobile, authDriverAddress,
  authorizationStartDate, authorizationEndDate, authorizationTypeCode, authorizationCountry,
  selectedExtraDriver, extraDriverIdType, extraDriverIdNumber, extraDriverAddress, extraDriverBirthDate, extraDriverHijriBirth,
  discountPercent, discountAmount, payMethod, otherPayMethod, employeeId,
  registrationTypeCode, operationCardNumber, operationCardExpiry, vehicleOtherNotes,
  insuranceAmount,
  internationalAuthorizationCost, driverFarePerDay, driverFarePerHour, vehicleTransferCost,
  fullFuelCost,
  rentalPolicyText,
  renterEmail, renterPassport, renterLicenseIssuePlace, renterBorderNumber,
}: Props) {

  const contractNumber = tajeerResponse?.contractNumber ?? "—";
  const isDaily = contractTypeCode === 1 || contractTypeCode === 3;
  const receiveB = branches.find(b => b.id === receiveBranchId);
  const returnB  = branches.find(b => b.id === returnBranchId);
  const workingB = branches.find(b => b.id === workingBranchId);
  const contractTypeName = ar
    ? TAJEER_LOOKUPS.contractTypes.find(t => t.code === contractTypeCode)?.ar
    : TAJEER_LOOKUPS.contractTypes.find(t => t.code === contractTypeCode)?.en;

  const rentPolicyName = (() => {
    if (!rentPolicies || !rentPolicyId) return rentPolicyId ? `#${rentPolicyId}` : "—";
    const p = rentPolicies.find(r => r.id === rentPolicyId);
    if (!p) return `#${rentPolicyId}`;
    return ar ? (p.nameAr ?? p.name ?? `#${rentPolicyId}`) : (p.nameEn ?? p.name ?? `#${rentPolicyId}`);
  })();

  const contractStatus = contractStep === "issued" ? T("Closed · مغلق", "مغلق", ar) : T("New", "جديد", ar);

  const plateFull = car.plate;

  // Fuel / tech condition helpers
  const fuelLabel = lookup(TAJEER_LOOKUPS.availableFuelOptions, rentStatus.availableFuel, ar);
  const acLabel   = lookup(TAJEER_LOOKUPS.acOptions, rentStatus.ac, ar);
  const radioLabel = lookup(TAJEER_LOOKUPS.acOptions, rentStatus.radioStereo, ar);
  const screenLabel = lookup(TAJEER_LOOKUPS.acOptions, rentStatus.screen, ar);
  const speedoLabel = lookup(TAJEER_LOOKUPS.workingOptions, rentStatus.speedometer, ar);
  const keysLabel   = lookup(TAJEER_LOOKUPS.workingOptions, rentStatus.keys, ar);
  const seatsLabel  = lookup(TAJEER_LOOKUPS.seatsOptions, rentStatus.carSeats, ar);
  const tiresLabel  = lookup(TAJEER_LOOKUPS.tiresOptions, rentStatus.tires, ar);
  const spareLabel  = lookup(TAJEER_LOOKUPS.tiresOptions, rentStatus.spareTire, ar);
  const spareToolsLabel = lookup(TAJEER_LOOKUPS.availableOptions, rentStatus.spareTireTools, ar);
  const triangleLabel   = lookup(TAJEER_LOOKUPS.availableOptions, rentStatus.safetyTriangle, ar);
  const fireLabel       = lookup(TAJEER_LOOKUPS.availableOptions, rentStatus.fireExtinguisher, ar);
  const firstAidLabel   = lookup(TAJEER_LOOKUPS.availableOptions, rentStatus.firstAidKit, ar);

  const pageStyle: React.CSSProperties = {
    background: "#fff", color: "#111", fontFamily: "'Segoe UI', Arial, sans-serif",
    fontSize: 11, direction: "rtl", maxWidth: 794,
    borderBottom: "3px solid #1a2233", marginBottom: 24,
  };

  const pageBreak: React.CSSProperties = {
    pageBreakBefore: "always", borderTop: "3px solid #1a2233", paddingTop: 12, marginTop: 24,
  };

  const addonTotal = Object.entries(addons)
    .filter(([k, v]) => v && ADD_ONS.some(a => a.k === k))
    .reduce((s, [k]) => s + (addonPrices[k] ?? 0), 0);

  return (
    <div style={{ background: "#f3f4f6", padding: 16, borderRadius: 8 }}>

      {/* ── PAGE 1 ──────────────────────────────────────────────────── */}
      <div style={pageStyle}>

        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 16px", borderBottom: "2px solid #1a2233",
        }}>
          {/* Logo */}
          <Image src="/assets/logo-full.png" alt="Maarkbh" width={120} height={55} style={{ objectFit: "contain" }} />

          {/* Title */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#1a2233", lineHeight: 1.4 }}>عقد تأجير سيارة</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2233", direction: "ltr" }}>Car Lease Contract</div>
            <div style={{
              marginTop: 4, background: "#3EC8BE", color: "#fff",
              padding: "2px 12px", borderRadius: 4, fontSize: 10, fontWeight: 600,
              display: "inline-block",
            }}>
              (1)
            </div>
          </div>

          {/* Contract No. */}
          <div style={{ textAlign: "center", direction: "ltr" }}>
            <div style={{ fontSize: 9, color: "#888" }}>Contract No. / رقم العقد</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#4B72E6", fontFamily: "monospace", letterSpacing: 1 }}>
              {contractNumber}
            </div>
            <div style={{ fontSize: 9, color: "#888", marginTop: 4 }}>
              بموجب قرار مجلس الوزراء رقم (41)
            </div>
          </div>
        </div>

        {/* ── Section 1: Contract Information ── */}
        <div style={{ margin: "10px 10px 0" }}>
          <SectionHeader ar="بيانات العقد - ١" en="1- Contract Information:" />
          <FieldGrid cols={4}>
            <Field label="Contract Number" labelAr="رقم العقد" value={contractNumber} />
            <Field label="Contract Location" labelAr="مكان إبرام العقد"
              value={ar ? (workingB?.nameAr ?? "—") : (workingB?.nameEn ?? "—")} />
            <Field label="Start Date/Time" labelAr="تاريخ ووقت بداية العقد" value={contractStartDate || "—"} />
            <Field label="End Date/Time" labelAr="تاريخ ووقت نهاية العقد" value={contractEndDate || "—"} />
            <Field label="Contract Type" labelAr="نوع العقد" value={contractTypeName} />
            <Field label="Contract Status" labelAr="حالة العقد" value={contractStatus} />
            <Field label="Data Entry (Employee)" labelAr="مدخل البيانات (ID الموظف)" value={employeeId || "EMP-102"} />
            <Field label="Extension Number" labelAr="رقم التمديد" value="—" />
          </FieldGrid>
        </div>

        {/* ── Section 2: Lessor Information ── */}
        <div style={{ margin: "10px 10px 0" }}>
          <SectionHeader ar="بيانات المؤجر (الطرف الأول) - ٢" en="2- Lessor Information: (First Party)" />
          <FieldGrid cols={4}>
            <Field label="Name" labelAr="الاسم" value="مركبة — Maarkbh" span={2} />
            <Field label="Phone/Mobile" labelAr="الهاتف/الجوال" value="+966 XX XXX XXXX" />
            <Field label="License Category" labelAr="فئة الترخيص" value="B" />
            <Field label="License No." labelAr="رقم الترخيص" value="—" />
            <Field label="E-mail" labelAr="البريد الإلكتروني" value="info@maarkbh.com" />
            <Field label="CR No." labelAr="السجل التجاري" value="—" />
            <Field label="VAT Reg. No." labelAr="الرقم الضريبي" value="—" />
            <Field label="Address" labelAr="العنوان"
              value={ar ? (workingB?.nameAr ?? "الرياض") : (workingB?.nameEn ?? "Riyadh")} span={2} />
          </FieldGrid>
        </div>

        {/* ── Section 3: Lessee Information ── */}
        <div style={{ margin: "10px 10px 0" }}>
          <SectionHeader ar="بيانات المستأجر (الطرف الثاني) - ٣" en="3- Lessee Information: (Second Party)" />
          <FieldGrid cols={4}>
            <Field label="Name" labelAr="الاسم"
              value={`${selectedCustomer.nameAr}  /  ${selectedCustomer.name}`} span={2} />
            <Field label="ID Type" labelAr="نوع الهوية"
              value={ar
                ? TAJEER_LOOKUPS.idTypes.find(t => t.code === idTypeCode)?.ar
                : TAJEER_LOOKUPS.idTypes.find(t => t.code === idTypeCode)?.en} />
            <Field label="ID No." labelAr="رقم الهوية" value={newIdNumber} />
            <Field label="Version No." labelAr="رقم نسخة الهوية" value={renterIdCopyNumber || "—"} />
            <Field label="ID Expire Date" labelAr="انتهاء الهوية" value={renterIdExpiry || "—"} />
            <Field label="Date of Birth" labelAr="تاريخ الميلاد"
              value={renterBirthDate || renterHijriBirth || "—"} />
            <Field label="Nationality" labelAr="الجنسية"
              value={renterNationalityCode ? `${renterNationalityCode}` : "Saudi Arabia"} />
            <Field label="Mobile No." labelAr="رقم الجوال" value={selectedCustomer.phone} />
            <Field label="License No." labelAr="رقم الرخصة" value={renterLicenseNumber || "—"} />
            <Field label="License Expiry" labelAr="انتهاء الرخصة" value={renterLicenseExpiry || "—"} />
            <Field label="License Type" labelAr="نوع الرخصة" value="Private / خصوصي" />
            <Field label="Address" labelAr="العنوان" value={renterAddress || "Riyadh"} />
            <Field label="E-mail" labelAr="البريد الإلكتروني" value={renterEmail || "—"} span={2} />
            {idTypeCode === 3 && (
              <>
                <Field label="Passport No." labelAr="رقم الجواز" value={renterPassport || "—"} />
                <Field label="Border No." labelAr="رقم الحدود" value={renterBorderNumber || "—"} />
              </>
            )}
            {(idTypeCode === 3 || idTypeCode === 4) && (
              <Field label="License Issue Place" labelAr="مكان إصدار الرخصة" value={renterLicenseIssuePlace || "—"} />
            )}
          </FieldGrid>
          {/* Signature row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: "1px solid #ccc", borderTop: "none" }}>
            <SigLine label="Lessee Signature" labelAr="توقيع المستأجر" />
            <div style={{ padding: "8px 10px", borderBottom: "1px solid #ccc" }}>
              <div style={{ fontSize: 9, color: "#666", marginBottom: 6 }}>ملاحظات / Notes</div>
              <div style={{ minHeight: 28 }} />
            </div>
          </div>
        </div>

        {/* ── Section 4a: Authorized Driver ("المفوض") ── */}
        {!isRenterDriver && (
          <div style={{ margin: "10px 10px 0" }}>
            <SectionHeader ar="بيانات السائق المفوض (التأجير مع سائق)" en="Authorized Driver Information:" />
            <FieldGrid cols={4}>
              <Field label="ID Type" labelAr="نوع الهوية (مواطن/مقيم)"
                value={ar
                  ? TAJEER_LOOKUPS.idTypes.find(t => t.code === authDriverIdType)?.ar
                  : TAJEER_LOOKUPS.idTypes.find(t => t.code === authDriverIdType)?.en} />
              <Field label="ID No." labelAr="رقم الهوية" value={authDriverIdNumber || "—"} />
              <Field label="Date of Birth" labelAr="تاريخ الميلاد (هجري/ميلادي)" value={authDriverBirthDate || "—"} />
              <Field label="Mobile No." labelAr="رقم الجوال" value={authDriverMobile || "—"} />
              <Field label="Address" labelAr="العنوان" value={authDriverAddress || "الرياض"} />
              <Field label="Authorization Start" labelAr="بداية التفويض" value={authorizationStartDate || "—"} />
              <Field label="Authorization End (Auto 6 mo)" labelAr="نهاية التفويض (تلقائي ٦ شهور)" value={authorizationEndDate || "—"} />
              <Field label="Authorization Type" labelAr="نوع التفويض"
                value={authorizationTypeCode === "external" ? T("External / خارجي", "خارجي", ar) : T("Internal / داخلي", "داخلي", ar)} />
              {authorizationTypeCode === "external" && (
                <Field label="Country Code / Countries" labelAr="رمز الدولة (التفويض الخارجي)" value={authorizationCountry || "—"} span={2} />
              )}
            </FieldGrid>
          </div>
        )}

        {/* ── Section 4b: Extra Driver ── */}
        <div style={{ margin: "10px 10px 0" }}>
          <SectionHeader ar="بيانات السائق الإضافي" en="Additional Driver Information:" />
          <FieldGrid cols={4}>
            <Field label="Name" labelAr="الاسم"
              value={addons.driver && selectedExtraDriver ? `${selectedExtraDriver.nameAr} / ${selectedExtraDriver.name}` : "—"} span={2} />
            <Field label="ID Type" labelAr="نوع الهوية"
              value={addons.driver
                ? (ar ? TAJEER_LOOKUPS.idTypes.find(t => t.code === extraDriverIdType)?.ar : TAJEER_LOOKUPS.idTypes.find(t => t.code === extraDriverIdType)?.en)
                : "—"} />
            <Field label="ID No." labelAr="رقم الهوية" value={addons.driver ? (extraDriverIdNumber || "—") : "—"} />
            <Field label="Date of Birth" labelAr="تاريخ الميلاد (هجري/ميلادي)"
              value={addons.driver ? (extraDriverBirthDate || extraDriverHijriBirth || selectedExtraDriver?.birthDate || "—") : "—"} />
            <Field label="License No." labelAr="رقم الرخصة" value={addons.driver ? (selectedExtraDriver?.licenseNumber || "—") : "—"} />
            <Field label="License Expiry" labelAr="انتهاء الرخصة" value={addons.driver ? (selectedExtraDriver?.licenseExpiryDate || "—") : "—"} />
            <Field label="Mobile No." labelAr="رقم الجوال" value={addons.driver ? (selectedExtraDriver?.phone || "—") : "—"} />
            <Field label="Address" labelAr="العنوان" value={addons.driver ? (extraDriverAddress || "—") : "—"} span={2} />
          </FieldGrid>
        </div>

        {/* ── Section 4c: Additional Services ── */}
        <div style={{ margin: "10px 10px 0" }}>
          <SectionHeader ar="الخدمات الاضافية" en="Additional Services" />
          <FieldGrid cols={5}>
            <Field label="Child seat (SAR)" labelAr="مقعد اطفال (الكم)"
              value={(addons.child ? (addonPrices.child ?? 0) : 0).toFixed(1)} />
            <Field label="Internet (SAR)" labelAr="الانترنت (الكم)"
              value={(addons.internet ? (addonPrices.internet ?? 0) : 0).toFixed(1)} />
            <Field label="Car delivery (SAR)" labelAr="قيمة توصيل السيارة (الكم)"
              value={(addons.delivery ? (addonPrices.delivery ?? 0) : 0).toFixed(1)} />
            <Field label="Navigation system (SAR)" labelAr="نظام الملاحة (الكم)"
              value={(addons.navigation ? (addonPrices.navigation ?? 0) : 0).toFixed(1)} />
            <Field label="Disability assistance (SAR)" labelAr="وسائل خاصة لذوي الإعاقة (الكم)"
              value={(addons.special_needs ? (addonPrices.special_needs ?? 0) : 0).toFixed(1)} />
          </FieldGrid>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: "1px solid #ccc", borderTop: "none" }}>
            <div style={{ padding: "8px 10px", borderRight: "1px solid #ccc", borderBottom: "1px solid #ccc" }}>
              <div style={{ fontSize: 9, color: "#666", display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ direction: "rtl" }}>قيمة تفويض سائق إضافي</span>
                <span style={{ direction: "ltr" }}>Additional Driver Authorization</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#111" }}>
                {(0).toFixed(1)} SAR
              </div>
            </div>
            <SigLine label="Lessee signature" labelAr="توقيع المستأجر" />
          </div>
        </div>

        {/* ── Section 5: Car Info ── */}
        <div style={{ margin: "10px 10px 12px" }}>
          <SectionHeader ar="بيانات المركبة - ٥" en="5- Car Information" />
          <FieldGrid cols={4}>
            <Field label="Name (Model)" labelAr="الموديل" value={`${car.make} ${car.model}`} />
            <Field label="Manufacture Year" labelAr="سنة الصنع" value={String(car.year)} />
            <Field label="Color" labelAr="اللون" value={car.color || "—"} />
            <Field label="Plate No. & Letters" labelAr="رقم اللوحة والأحرف" value={`${plateFull} (حرف 1 · حرف 2 · حرف 3)`} />
            <Field label="Plate Type (Reg. Code)" labelAr="نوع اللوحة (رمز نوع التسجيل)"
              value={registrationTypeCode === 3 ? T("Private transport / نقل خاص", "نقل خاص", ar) : T("Private / خصوصي", "خصوصي", ar)} />
            <Field label="Car Type" labelAr="نوع السيارة" value={car.type || "—"} />
            <Field label="Chassis No. (VIN)" labelAr="رقم الشاسيه (VIN)" value={car.chassisNumber || "—"} />
            <Field label="Fuel Type" labelAr="نوع الوقود" value={lookup(TAJEER_LOOKUPS.fuelTypes, car.fuelTypeCode, ar)} />
            <Field label="Istamara No." labelAr="رقم الاستمارة" value={car.istamaraNumber || "—"} />
            <Field label="Istamara Expiry" labelAr="انتهاء الاستمارة" value={car.istamaraExpiry || "—"} />
            <Field label="Periodic Inspection Expiry" labelAr="انتهاء الفحص الدوري" value={car.periodicInspectionExpiry || "—"} />
            <Field label="Operation Card No." labelAr="رقم بطاقة التشغيل" value={operationCardNumber || "—"} />
            <Field label="Operation Card Expiry" labelAr="تاريخ انتهاء بطاقة التشغيل" value={operationCardExpiry || "—"} />
            <Field label="Insurance Company" labelAr="شركة التأمين" value={car.insuranceCompany || "—"} />
            <Field label="Insurance Policy No." labelAr="رقم وثيقة التأمين" value={car.insurancePolicyNumber || "—"} />
            <Field label="Insurance Expiry" labelAr="انتهاء التأمين" value={car.insuranceExpiry || "—"} />
            <Field label="Insurance Type" labelAr="نوع التأمين"
              value={car.insuranceType === "شامل" ? T("Comprehensive / شامل", "شامل", ar) : T("Third Party / ضد الغير", "ضد الغير", ar)} />
            <Field label="Insurance Amount" labelAr="مبلغ التأمين" value={`${(insuranceAmount ?? 0).toLocaleString()} SAR`} />
            <Field label="Endurance Amount (Fixed)" labelAr="مبلغ التحمل (ثابت لا يتغير)"
              value={`${rentStatus.enduranceAmount ?? 0} SAR`} />
            <Field label="Next Oil Change" labelAr="موعد استدعاء الزيت القادم"
              value={rentStatus.oilChangeDate || "—"} />
            <Field label="Other" labelAr="أخرى" value={vehicleOtherNotes || "—"} span={2} />
          </FieldGrid>
        </div>

      </div>{/* end page 1 */}


      {/* ── PAGE 2 ──────────────────────────────────────────────────── */}
      <div style={{ ...pageStyle, ...pageBreak }}>

        {/* Mini header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "8px 16px", borderBottom: "1px solid #ccc", marginBottom: 8,
        }}>
          <Image src="/assets/logo-symbol-v2.png" alt="Maarkbh" width={28} height={28} style={{ objectFit: "contain" }} />
          <div style={{ fontSize: 12, fontWeight: 700, color: "#1a2233" }}>
            عقد تأجير سيارة &nbsp;/&nbsp; Car Lease Contract &nbsp;
            <span style={{ background: "#3EC8BE", color: "#fff", padding: "1px 8px", borderRadius: 3, fontSize: 10 }}>(2)</span>
          </div>
          <div style={{ fontSize: 10, color: "#4B72E6", fontFamily: "monospace" }}>{contractNumber}</div>
        </div>

        {/* ── Section 6: Lease Info ── */}
        <div style={{ margin: "0 10px 10px" }}>
          <SectionHeader ar="خصائص ومعلومات الإيجار - ٦" en="6- Lease Information:" />
          <FieldGrid cols={4}>
            <Field label="Rental Type Code" labelAr="رمز نوع التأجير" value={contractTypeName} />
            <Field label="Lease Term (days)" labelAr="مدة الإيجار" value={`${days} ${isDaily ? "أيام" : "ساعات"}`} />
            <Field label="Daily Rent Rate" labelAr="تعرفة التأجير اليومي" value={`${rentDayCost} SAR`} />
            <Field label="Hourly Rent Rate" labelAr="تعرفة التأجير بالساعة" value={`${rentHourCost} SAR`} />
            <Field label="Allowed KM / Day" labelAr="عدد الكيلو المسموح باليوم" value={unlimitedKm ? T("Unlimited", "غير محدود", ar) : `${allowedKmPerDay} km`} />
            <Field label="Allowed KM / Hour" labelAr="عدد الكيلو المسموح بالساعة" value={unlimitedKm ? T("Unlimited", "غير محدود", ar) : `${allowedKmPerHour} km`} />
            <Field label="Unlimited KM (Optional)" labelAr="كيلومتر مفتوح" value={unlimitedKm ? T("Yes / نعم", "نعم", ar) : T("No / لا", "لا", ar)} />
            <Field label="Extra KM Cost" labelAr="تكلفة الكيلومتر الزائد" value={`${extraKmCost} SAR/km`} />
            <Field label="Delay Hours Allowed" labelAr="ساعات التأخير المسموحة" value={`${allowedLateHours} hr`} />
            <Field label="Delay Fare/Hour" labelAr="أجرة التأخير/ساعة" value={`${lateFeePerHour} SAR/hr`} />
            <Field label="Pickup Location Code" labelAr="رمز موقع الاستلام" value={ar ? (receiveB?.nameAr ?? "—") : (receiveB?.nameEn ?? "—")} />
            <Field label="Return Location Code" labelAr="رمز موقع التسليم" value={ar ? (returnB?.nameAr ?? "—") : (returnB?.nameEn ?? "—")} />
            <Field label="Issue Branch Code" labelAr="رمز الفرع المبرم للعقد" value={ar ? (workingB?.nameAr ?? "—") : (workingB?.nameEn ?? "—")} />
            <Field label="Rent Policy Code" labelAr="رمز السياسة" value={rentPolicyName} />
            <Field label="Additional Coverage Code/Cost" labelAr="رمز التغطية الإضافية (باليوم)"
              value={addons.insurance ? `${addonPrices.insurance ?? 50} SAR/day` : T("None", "غير مختارة", ar)} span={2} />
          </FieldGrid>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr", border: "1px solid #ccc",
            borderTop: "none", padding: "4px 8px",
          }}>
            <SigLine label="Lessee Signature" labelAr="توقيع المستأجر" />
          </div>
        </div>

        {/* ── Section 7: Car Receipt (Handover) ── */}
        <div style={{ margin: "0 10px 10px" }}>
          <SectionHeader ar="بيانات استلام السيارة - ٧" en="7- Car Receipt Information:" />
          <FieldGrid cols={3}>
            <Field label="Exit Location" labelAr="موقع الخروج"
              value={ar ? (receiveB?.nameAr ?? "—") : (receiveB?.nameEn ?? "—")} />
            <Field label="Fuel at Handover" labelAr="الوقود عند الاستلام" value={fuelLabel} />
            <Field label="Odometer at Exit" labelAr="العداد عند الخروج"
              value={`${(rentStatus.odometerReading ?? 0).toLocaleString()} km`} />
          </FieldGrid>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: "1px solid #ccc", borderTop: "none" }}>
            <SigLine label="Lessee Signature" labelAr="توقيع المستأجر" />
            <SigLine label="Lessor Signature" labelAr="توقيع المؤجر" />
          </div>
        </div>

        {/* ── Section 8: Car Return ── */}
        <div style={{ margin: "0 10px 10px" }}>
          <SectionHeader ar="بيانات تسليم السيارة - ٨" en="8- Car Return Information:" />
          <FieldGrid cols={3}>
            <Field label="Return Location" labelAr="موقع الوصول"
              value={ar ? (returnB?.nameAr ?? "—") : (returnB?.nameEn ?? "—")} />
            <Field label="Fuel at Return" labelAr="الوقود عند التسليم" value="—" />
            <Field label="Odometer at Return" labelAr="العداد عند الدخول" value="—" />
          </FieldGrid>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: "1px solid #ccc", borderTop: "none" }}>
            <SigLine label="Lessee Signature" labelAr="توقيع المستأجر" />
            <SigLine label="Lessor Signature" labelAr="توقيع المؤجر" />
          </div>
        </div>

        {/* ── Section 9: Leasing Policy ── */}
        <div style={{ margin: "0 10px 12px" }}>
          <SectionHeader ar="سياسة الإيجار - ٩" en="9- Leasing Policy" />
          <div style={{ border: "1px solid #ccc", borderTop: "none", padding: "8px 12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 10 }}>
              <div>
                <strong>Fuel Return Policy / سياسة إعادة الوقود:</strong>
                <p style={{ margin: "2px 0 0", color: "#444" }}>
                  {rentalPolicyText ? (ar ? rentalPolicyText.fuelReturn.ar : rentalPolicyText.fuelReturn.en) : "—"}
                </p>
              </div>
              <div>
                <strong>Contract Extension / آلية تمديد العقد:</strong>
                <p style={{ margin: "2px 0 0", color: "#444" }}>
                  {rentalPolicyText ? (ar ? rentalPolicyText.extension.ar : rentalPolicyText.extension.en) : "—"}
                </p>
              </div>
              <div>
                <strong>Early Return Policy / سياسة الإرجاع المبكر:</strong>
                <p style={{ margin: "2px 0 0", color: "#444" }}>
                  {rentalPolicyText ? (ar ? rentalPolicyText.earlyReturn.ar : rentalPolicyText.earlyReturn.en) : "—"}
                </p>
              </div>
              <div>
                <strong>Accident Reporting / سياسة الإبلاغ عن حوادث:</strong>
                <p style={{ margin: "2px 0 0", color: "#444" }}>
                  {rentalPolicyText ? (ar ? rentalPolicyText.accidentReport.ar : rentalPolicyText.accidentReport.en) : "—"}
                </p>
              </div>
              <div>
                <strong>Breakdown Reporting / سياسة الإبلاغ عن أعطال:</strong>
                <p style={{ margin: "2px 0 0", color: "#444" }}>
                  {rentalPolicyText ? (ar ? rentalPolicyText.breakdownReport.ar : rentalPolicyText.breakdownReport.en) : "—"}
                </p>
              </div>
            </div>
            <div style={{ marginTop: 8, borderTop: "1px dashed #ccc", paddingTop: 6 }}>
              <SigLine label="Lessee Signature" labelAr="توقيع المستأجر" />
            </div>
          </div>
        </div>

      </div>{/* end page 2 */}


      {/* ── PAGE 3 ──────────────────────────────────────────────────── */}
      <div style={{ ...pageStyle, ...pageBreak }}>

        {/* Mini header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "8px 16px", borderBottom: "1px solid #ccc", marginBottom: 8,
        }}>
          <Image src="/assets/logo-symbol-v2.png" alt="Maarkbh" width={28} height={28} style={{ objectFit: "contain" }} />
          <div style={{ fontSize: 12, fontWeight: 700, color: "#1a2233" }}>
            عقد تأجير سيارة &nbsp;/&nbsp; Car Lease Contract &nbsp;
            <span style={{ background: "#3EC8BE", color: "#fff", padding: "1px 8px", borderRadius: 3, fontSize: 10 }}>(3)</span>
          </div>
          <div style={{ fontSize: 10, color: "#4B72E6", fontFamily: "monospace" }}>{contractNumber}</div>
        </div>

        {/* ── Section 10: Technical Condition ── */}
        <div style={{ margin: "0 10px 10px" }}>
          <SectionHeader ar="الحالة الفنية للسيارة - ١٠" en="10- Car Technical Condition:" />
          <div style={{ border: "1px solid #ccc", borderTop: "none" }}>
            {/* Table header */}
            <div style={{
              display: "grid", gridTemplateColumns: "2fr 1fr 1fr",
              borderBottom: "1px solid #ccc", background: "#f8f9fb",
            }}>
              <div style={{ padding: "5px 8px", fontSize: 10, fontWeight: 700, borderRight: "1px solid #ccc" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ direction: "rtl" }}>العناصر</span>
                  <span style={{ direction: "ltr" }}>Elements</span>
                </div>
              </div>
              <div style={{ padding: "5px 8px", fontSize: 10, fontWeight: 700, borderRight: "1px solid #ccc", textAlign: "center" }}>
                At Lease / عند الإيجار
              </div>
              <div style={{ padding: "5px 8px", fontSize: 10, fontWeight: 700, textAlign: "center" }}>
                At Return / عند التسليم
              </div>
            </div>
            {/* Condition rows */}
            {[
              { en: "A/C Condition", ar: "حالة التكييف", val: acLabel },
              { en: "Radio/Recorder", ar: "حالة الراديو/المسجل", val: radioLabel },
              { en: "Interior Screen", ar: "حالة الشاشة الداخلية", val: screenLabel },
              { en: "Speedometer", ar: "حالة عداد السرعة", val: speedoLabel },
              { en: "Interior Upholstery", ar: "حالة الفرش الداخلي", val: seatsLabel },
              { en: "Wheels Condition", ar: "حالة العجلات", val: tiresLabel },
              { en: "Spare Wheel", ar: "حالة العجلة الاحتياطية", val: spareLabel },
              { en: "Spare Tire Equipment", ar: "معدات الكفر الاحتياطية", val: spareToolsLabel },
              { en: "Safety Triangle", ar: "توفر المثلث العاكس", val: triangleLabel },
              { en: "Fire Extinguisher", ar: "توفر طفاية الحريق", val: fireLabel },
              { en: "First Aid Kit", ar: "حالة حقيبة الاسعافات الأولية", val: firstAidLabel },
              { en: "Key Condition", ar: "حالة المفتاح", val: keysLabel },
              { en: "Next Oil Change Date", ar: "موعد استدعاء الزيت القادم", val: rentStatus.oilChangeDate || "—" },
            ].map((row) => (
              <div key={row.en} style={{
                display: "grid", gridTemplateColumns: "2fr 1fr 1fr",
                borderBottom: "1px solid #eee",
              }}>
                <div style={{ padding: "4px 8px", fontSize: 10, borderRight: "1px solid #ccc", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ direction: "rtl" }}>{row.ar}</span>
                  <span style={{ direction: "ltr" }}>{row.en}</span>
                </div>
                <div style={{ padding: "4px 8px", fontSize: 10, textAlign: "center", borderRight: "1px solid #ccc", color: "#1a7a5a", fontWeight: 600 }}>{row.val}</div>
                <div style={{ padding: "4px 8px", fontSize: 10, textAlign: "center", color: "#999" }}>—</div>
              </div>
            ))}
            {/* Damage sketch — car diagram with any marked damages, read-only */}
            <div style={{ padding: "8px 10px", borderTop: "1px solid #ccc" }}>
              <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                <span>Car Diagram</span><span>مخطط السيارة</span>
              </div>
              <div style={{ border: "1px solid #ccc", borderRadius: 4, padding: 6, background: "#f8f9fb", display: "flex", justifyContent: "center" }}>
                <SketchComponent value={sketchItems} onChange={() => {}} ar={ar} disabled bodyColor="#ffffff" />
              </div>
              {sketchItems.length > 0 && (
                <div style={{ fontSize: 10, marginTop: 6 }}>
                  ⚠️ {T(`${sketchItems.length} damage(s) registered on the car diagram.`, `تم تسجيل ${sketchItems.length} ضرر/خدش على مخطط السيارة.`, ar)}
                </div>
              )}
            </div>
            {/* Signatures */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: "1px solid #ccc" }}>
              <SigLine label="Lessee Signature" labelAr="توقيع المستأجر" />
              <SigLine label="Lessor Signature" labelAr="توقيع المؤجر" />
            </div>
          </div>
        </div>

        {/* ── Section 11: Main Financial Data ── */}
        <div style={{ margin: "0 10px 10px" }}>
          <SectionHeader ar="بيانات الفوترة والمالية - ١١" en="11- Main Financial Data & Billing:" />
          <FieldGrid cols={4}>
            <Field label="Total Base Lease Cost" labelAr="إجمالي قيمة الإيجار الأساسي" value={`${base.toLocaleString()} SAR`} />
            <Field label="Driver Fare / Day" labelAr="أجرة السائق باليوم" value={`${(driverFarePerDay ?? 0).toLocaleString()} SAR/day`} />
            <Field label="Driver Fare / Hour" labelAr="أجرة السائق بالساعة" value={`${(driverFarePerHour ?? 0).toLocaleString()} SAR/hr`} />
            <Field label="Extra Driver Cost" labelAr="تكلفة السائق الإضافي" value={`${(addons.driver ? (addonPrices.driver ?? 0) : 0).toLocaleString()} SAR`} />
            <Field label="Full Fuel Tank Cost" labelAr="قيمة خزان الوقود ممتلئ" value={`${(fullFuelCost ?? 0).toLocaleString()} SAR`} />
            <Field label="Vehicle Transfer Cost" labelAr="أجرة نقل المركبة" value={`${(vehicleTransferCost ?? 0).toLocaleString()} SAR`} />
            <Field label="Int. Authorization Cost" labelAr="قيمة التفويض الدولي" value={`${(internationalAuthorizationCost ?? 0).toLocaleString()} SAR`} />
            <Field label="Add. Coverage Cost/Day" labelAr="قيمة التغطية الإضافية (باليوم)" value={`${addons.insurance ? (addonPrices.insurance ?? 50) : 0} SAR/day`} />
            <Field label="Discount Rate & Amount" labelAr="نسبة وقيمة الخصم" value={discountAmount ? `${discountAmount.toLocaleString()} SAR (${discountPercent ?? 0}%)` : "0 SAR (0%)"} />
            <Field label="Payment Method Code" labelAr="رمز طريقة الدفع" value={payMethod === "cash" ? T("1 - Cash / نقداً", "1 - نقدي", ar) : T("2 - POS / نقطة بيع", "2 - نقطة بيع", ar)} />
            <Field label="Other Payment Code (Opt.)" labelAr="رمز طريقة الدفع أخرى (اختياري)" value={otherPayMethod || T("None / لا يوجد", "لا يوجد", ar)} span={2} />
          </FieldGrid>

          {/* Financial breakdown table */}
          <div style={{ border: "1px solid #ccc", borderTop: "none" }}>
            {[
              { en: `Base Rent (${days} days)`, ar: `الإيجار الأساسي (${days} أيام)`, amount: base },
              ...Object.entries(addons).filter(([k, v]) => v && ADD_ONS.some(a => a.k === k)).map(([k]) => {
                const ao = ADD_ONS.find(a => a.k === k);
                return { en: ao?.nameEn ?? k, ar: ao?.nameAr ?? k, amount: addonPrices[k] ?? 0 };
              }),
            ].map((row, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "1fr auto",
                padding: "4px 10px", borderBottom: "1px solid #eee", fontSize: 11,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ direction: "rtl" }}>{row.ar}</span>
                  <span style={{ direction: "ltr", marginLeft: 12 }}>{row.en}</span>
                </div>
                <strong style={{ direction: "ltr" }}>{row.amount.toLocaleString()} SAR</strong>
              </div>
            ))}

            <div style={{
              display: "grid", gridTemplateColumns: "1fr auto",
              padding: "4px 10px", borderBottom: "1px solid #ccc", fontSize: 11, background: "#f8f9fb",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ direction: "rtl" }}>المجموع الفرعي</span>
                <span style={{ direction: "ltr", marginLeft: 12 }}>Subtotal</span>
              </div>
              <strong style={{ direction: "ltr" }}>{subtotal.toLocaleString()} SAR</strong>
            </div>

            <div style={{
              display: "grid", gridTemplateColumns: "1fr auto",
              padding: "4px 10px", borderBottom: "1px solid #ccc", fontSize: 11,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ direction: "rtl" }}>ضريبة القيمة المضافة · ١٥٪</span>
                <span style={{ direction: "ltr", marginLeft: 12 }}>VAT · 15%</span>
              </div>
              <span style={{ direction: "ltr" }}>{vat.toLocaleString()} SAR</span>
            </div>

            <div style={{
              display: "grid", gridTemplateColumns: "1fr auto",
              padding: "6px 10px", background: "#1a2233", color: "#fff", fontSize: 12, fontWeight: 700,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ direction: "ltr" }}>TOTAL / الإجمالي</span>
              </div>
              <span style={{ direction: "ltr", color: "#3EC8BE" }}>{total.toLocaleString()} SAR</span>
            </div>

            {/* Payment details */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderTop: "1px solid #ccc" }}>
              <div style={{ padding: "6px 8px", borderRight: "1px solid #ccc", textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "#666" }}>Payment Method / طريقة الدفع</div>
                <div style={{ fontSize: 11, fontWeight: 600 }}>
                  {payMethod === "cash" ? T("Cash / نقدي", "نقدي", ar) : T("POS / نقطة بيع", "نقطة بيع", ar)}
                </div>
              </div>
              <div style={{ padding: "6px 8px", borderRight: "1px solid #ccc", textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "#666" }}>Paid / المدفوع</div>
                <div style={{ fontSize: 11, fontWeight: 600 }}>
                  {tajeerResponse?.totalPaymentDetails
                    ? `${tajeerResponse.totalPaymentDetails.paid.toLocaleString()} SAR`
                    : (payType === "advance" ? `${advanceAmount.toLocaleString()} SAR` : `${total.toLocaleString()} SAR`)}
                </div>
              </div>
              <div style={{ padding: "6px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "#666" }}>Remaining / المتبقي</div>
                <div style={{ fontSize: 11, fontWeight: 600 }}>
                  {tajeerResponse?.totalPaymentDetails
                    ? `${tajeerResponse.totalPaymentDetails.remaining.toLocaleString()} SAR`
                    : (payType === "advance" ? `${remaining.toLocaleString()} SAR` : "0 SAR")}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 12: Other Financial ── */}
        <div style={{ margin: "0 10px 10px" }}>
          <SectionHeader ar="البيانات المالية الأخرى - ١٢" en="12- Other Financial Data:" />
          <FieldGrid cols={4}>
            <Field label="Extra KM Cost Total" labelAr="إجمالي تكلفة الكيلومترات الزائدة" value="0 SAR" />
            <Field label="Delay Cost Total" labelAr="إجمالي قيمة التأخير" value="0 SAR" />
            <Field label="Deductible Amount" labelAr="مبلغ التحمل"
              value={`${rentStatus.enduranceAmount ?? 0} SAR`} />
            <Field label="VAT" labelAr="الضريبة" value={`${vat.toLocaleString()} SAR`} />
            <Field label="Total" labelAr="الإجمالي" value={`${total.toLocaleString()} SAR`} />
            <Field label="Spare Parts Cost" labelAr="تكلفة قطع الغيار" value="0 SAR" />
            <Field label="Supplementary Services" labelAr="الخدمات التكميلية" value="0 SAR" />
            <Field label="Refundable Deposit" labelAr="التأمين قابل للاسترداد" value="1,500 SAR" />
          </FieldGrid>
        </div>

        {/* ── Final Signatures ── */}
        <div style={{ margin: "0 10px 16px" }}>
          <div style={{ border: "1px solid #ccc" }}>
            <div style={{
              background: "#f8f9fb", padding: "6px 10px", fontSize: 10, fontWeight: 700,
              borderBottom: "1px solid #ccc", display: "flex", justifyContent: "space-between",
            }}>
              <span>Signatures / التواقيع</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              <div style={{ padding: "12px 14px", borderRight: "1px solid #ccc" }}>
                <div style={{ fontSize: 9, color: "#666", display: "flex", justifyContent: "space-between", marginBottom: 32 }}>
                  <span style={{ direction: "rtl" }}>توقيع المستأجر</span>
                  <span style={{ direction: "ltr" }}>Lessee Signature</span>
                </div>
                <div style={{ borderBottom: "1px dashed #333", marginBottom: 4 }} />
                <div style={{ fontSize: 10, color: "#888" }}>
                  {signed
                    ? `${ar ? selectedCustomer.nameAr : selectedCustomer.name} · ${contractNumber}`
                    : T("Awaiting renter signature (outside the platform)…", "بانتظار توقيع المستأجر (خارج المنصة)…", ar)}
                </div>
              </div>
              <div style={{ padding: "12px 14px" }}>
                <div style={{ fontSize: 9, color: "#666", display: "flex", justifyContent: "space-between", marginBottom: 32 }}>
                  <span style={{ direction: "rtl" }}>توقيع المؤجر</span>
                  <span style={{ direction: "ltr" }}>Lessor Signature</span>
                </div>
                <div style={{ borderBottom: "1px dashed #333", marginBottom: 4 }} />
                <div style={{ fontSize: 10, color: "#888" }}>
                  {T("Maarkbh · Authorized Representative", "مركبة · المفوض بالتوقيع", ar)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          borderTop: "2px solid #3EC8BE", padding: "8px 16px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: 9, color: "#888",
        }}>
          <span style={{ direction: "ltr" }}>Maarkbh · مركبة | maarkbh.com</span>
          <span>هذا العقد موثّق بموجب قرار مجلس الوزراء رقم (41) وتاريخ هـ١٣/٠١/١٤٤٢</span>
          <Image src="/assets/logo-symbol-v2.png" alt="Maarkbh" width={20} height={20} style={{ objectFit: "contain", opacity: 0.4 }} />
        </div>

      </div>{/* end page 3 */}

    </div>
  );
}
