"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search, ChevronLeft, ChevronRight, Check,
  UserPlus, UserCheck, Calendar, Shield, ShieldCheck, Users, Baby, Fuel, Gauge,
  CreditCard, ArrowRight, ArrowLeft, Printer,
  FileText, Mail, MessageSquare, Download, KeyRound, X,
  LayoutGrid, List, Map as MapIcon, Banknote, Copy,
  Wind, Music, Monitor, Activity, Disc, Wrench, Heart, Triangle,
  Armchair, Flame, Wifi, MapPin, Compass, Accessibility, Lock, Tag, RotateCcw, Info, Wallet,
} from "lucide-react";
import Image from "next/image";
import { Avatar, Badge, AlertBanner, RiyalSymbol, Input, Select, Button, IconButton, Tabs, Modal, Drawer, DrawerHeader, DrawerFooter } from "@/components/ui";
import ContractPreview from "./ContractPreview";
import { CARS, CAR_IMAGES, MOCK_DRIVERS, CLIENTS, type DriverProfile, type ClientProfile, type CarStatus } from "@/lib/data";
import { useAdmin } from "@/contexts/AdminContext";
import {
  tajeerGetBranches, tajeerGetRentPolicies, tajeerGetExtendedCoverage,
  tajeerSaveContract, tajeerGetContract, tajeerCancelContract,
  TAJEER_LOOKUPS,
  type TajeerSaveContractRequest, type TajeerSaveContractResponse,
  type TajeerRentStatus, type SketchItem, type TajeerIdType, type TajeerContractType,
} from "@/lib/tajeer";
import { SketchComponent } from "@/components/employee/SketchComponent";
import { VehicleTypeIcon } from "@/components/employee/VehicleTypeIcon";
import { PersonRegistrationDrawer, type NewPersonProfile } from "@/components/employee/PersonRegistrationDrawer";
import { getAvailabilityText, loadGoogleMapsScript, getGoogleMapsStyle, getCarLatLng, createCustomMarker } from "@/lib/maps";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

/* ── Mock data ───────────────────────────────────────────────────── */
const CUSTOMERS = MOCK_DRIVERS;

// Overall customer status shown at the point of contract creation — a customer
// can be blocked (blacklisted / not verified) or allowed through with a flag
// (debt / circular notice) that the front-desk should be aware of.
type CustomerStatusTag = "verified" | "debt" | "circular" | "blacklisted" | "unverified";

function getCustomerStatusTag(c: DriverProfile): CustomerStatusTag {
  if (c.blacklisted) return "blacklisted";
  if (c.status !== "verified") return "unverified";
  if (c.debtAmount && c.debtAmount > 0) return "debt";
  if (c.circularNote) return "circular";
  return "verified";
}

const CUSTOMER_STATUS_META: Record<CustomerStatusTag, { labelEn: string; labelAr: string; className: string; blocking: boolean }> = {
  verified: { labelEn: "Verified", labelAr: "موثّق", className: "bg-mk-mint-600/12 text-mk-mint-600", blocking: false },
  debt: { labelEn: "Has debt", labelAr: "مديونية", className: "bg-mk-warning/14 text-mk-warning-700", blocking: false },
  circular: { labelEn: "Circular", labelAr: "تعميم", className: "bg-mk-violet-100 text-mk-violet-600", blocking: false },
  blacklisted: { labelEn: "Blacklisted", labelAr: "قائمة سوداء", className: "bg-mk-danger/14 text-mk-danger", blocking: true },
  unverified: { labelEn: "Not verified", labelAr: "غير موثق", className: "bg-mk-ink-200/60 text-mk-ink-600", blocking: true },
};

const ID_TYPE_CODES: Record<string, 1 | 2 | 3 | 4> = { "Saudi ID": 1, "Iqama": 2, "Passport": 3, "GCC ID": 4 };

// Bridges the customer-profile data model (ClientProfile, used by the
// customer list / inquiry / detail pages) into the renter model this flow
// expects, so "Create contract" from a customer profile arrives pre-selected.
function clientToDriverProfile(c: ClientProfile): DriverProfile {
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

// Fallback rate per extra km before a vehicle is selected (overridden by the vehicle's registered rate).
const SYSTEM_EXTRA_KM_RATE = 1; // SAR per km
// System-defined driver fare — matches the "extra driver" add-on default.
const SYSTEM_DRIVER_FARE_PER_DAY = 45;
const SYSTEM_DRIVER_FARE_PER_HOUR = 10;
// System-registered flat fees — same figures the office's Pricing settings hold.
const SYSTEM_VEHICLE_TRANSFER_COST = 150;
const SYSTEM_COVERAGE_BASE_COST = 100;

const ADD_ONS = [
  { k: "insurance_comprehensive", Icon: ShieldCheck, nameEn: "Insurance · Comprehensive", nameAr: "تأمين · شامل", descEn: "Full coverage, zero liability", descAr: "تغطية كاملة بدون تحمل شخصي", price: 1500, unit: "· once", unitAr: "· مرة واحدة", perDay: false },
  { k: "unlimited_km", Icon: Gauge, nameEn: "Unlimited Kilometers", nameAr: "كيلومتر مفتوح", descEn: "No km cap for the rental period", descAr: "بدون حد للكيلومتر طوال الإيجار", price: 85, unit: "/ day", unitAr: "/ يوم", perDay: true },
  { k: "child", Icon: Baby, nameEn: "Child seat (0–2)", nameAr: "مقعد أطفال (٠–٢)", descEn: "Installed before pickup", descAr: "مركّب قبل التسليم", price: 25, unit: "/ day", unitAr: "/ يوم", perDay: true },
  { k: "fuel", Icon: Fuel, nameEn: "Fuel prepay (40 L)", nameAr: "وقود مسبق (٤٠ ل)", descEn: "Return empty, no penalty", descAr: "الإرجاع فارغ بلا غرامة", price: 175, unit: "· once", unitAr: "· مرة واحدة", perDay: false },
  { k: "internet", Icon: Wifi, nameEn: "Internet / Wi-Fi", nameAr: "خدمة الإنترنت", descEn: "High-speed 4G/5G portable router", descAr: "راوتر متنقل سريع 4G/5G", price: 30, unit: "/ day", unitAr: "/ يوم", perDay: true },
  { k: "delivery", Icon: MapPin, nameEn: "Car Delivery (per Km)", nameAr: "توصيل السيارة (بالكيلو)", descEn: "Priced by distance, 5 SAR per Km", descAr: "التوصيل للموقع بسعر ٥ ريال لكل كم", price: 5, unit: "/ Km", unitAr: "/ كم", perDay: false },
  { k: "return_agent", Icon: MapPin, nameEn: "Vehicle Pickup by Agent", nameAr: "استلام المركبة بواسطة مندوب", descEn: "Agent collects the vehicle from the customer's location", descAr: "مندوب يستلم المركبة من موقع العميل عند التسليم", price: 75, unit: "· once", unitAr: "· مرة واحدة", perDay: false },
  { k: "navigation", Icon: Compass, nameEn: "GPS Navigation System", nameAr: "نظام الملاحة GPS", descEn: "Dedicated offline GPS device", descAr: "جهاز خرائط وملاحة مستقل", price: 40, unit: "/ day", unitAr: "/ يوم", perDay: true },
  { k: "special_needs", Icon: Accessibility, nameEn: "Special Needs Amenities", nameAr: "وسائل لذوي الاحتياجات الخاصة", descEn: "Hand controls & specialized assistance", descAr: "تجهيزات خاصة وتسهيلات حركة", price: 50, unit: "/ day", unitAr: "/ يوم", perDay: true },
];

// Office-selectable rental policy options — reflected automatically onto the printed contract
const RENTAL_POLICY_OPTIONS = {
  extension: [
    { key: "auto_renew", ar: "تجديد تلقائي", en: "Auto-renew" },
    { key: "manual_approval", ar: "يتطلب موافقة المكتب", en: "Manual approval required" },
    { key: "no_extension", ar: "لا يسمح بالتمديد", en: "No extension allowed" },
  ],
  earlyReturn: [
    { key: "no_refund", ar: "بدون استرداد عن الأيام المتبقية", en: "No refund for remaining days" },
    { key: "partial_refund", ar: "استرداد جزئي عن الأيام المتبقية", en: "Partial refund for remaining days" },
    { key: "full_refund", ar: "استرداد كامل عن الأيام المتبقية", en: "Full refund for remaining days" },
  ],
  accidentReport: [
    { key: "police_report_required", ar: "يتطلب محضر شرطة فوري", en: "Immediate police report required" },
    { key: "office_notification", ar: "إبلاغ المكتب خلال 24 ساعة", en: "Notify office within 24 hours" },
  ],
  fuelReturn: [
    { key: "same_level", ar: "إعادة بنفس مستوى الاستلام", en: "Return at pickup level" },
    { key: "full_tank", ar: "إعادة بخزان ممتلئ", en: "Return with full tank" },
    { key: "prepaid", ar: "وقود مسبق الدفع، إرجاع فارغ", en: "Prepaid fuel, return empty" },
  ],
  breakdownReport: [
    { key: "call_office", ar: "الاتصال بالمكتب فوراً", en: "Call the office immediately" },
    { key: "roadside_assistance", ar: "الاتصال بخدمة المساعدة على الطريق", en: "Call roadside assistance" },
  ],
} as const;

const STEPS = [
  { labelEn: "Customer, dates & vehicle", labelAr: "العميل والتواريخ والمركبة", icon: "user-check" },
  { labelEn: "Add-ons & handover", labelAr: "الخدمات الإضافية والتسليم", icon: "car" },
  { labelEn: "Payment", labelAr: "الدفع", icon: "credit-card" },
  { labelEn: "Verification, signature & issue", labelAr: "التحقق والتوقيع وإصدار العقد", icon: "printer" },
];

// A Pricing Details field with a registered system default — an in-field
// reset icon (Input's `suffix` slot) appears only once the employee's
// value has actually drifted from that default, and clearing the field
// falls straight back to it via `onChange`.
function PriceInputField({
  value, onChange, defaultValue, ar, min, max, helpText,
}: {
  value: number;
  onChange: (v: number) => void;
  defaultValue: number;
  ar: boolean;
  min?: number;
  max?: number;
  helpText?: string;
}) {
  const changed = value !== defaultValue;
  return (
    <Input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value) || defaultValue)}
      helpText={helpText}
      suffix={changed ? (
        <button
          type="button"
          onClick={() => onChange(defaultValue)}
          title={T("Reset to system default", "استعادة القيمة الافتراضية", ar)}
          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-mk-ink-400 hover:text-mk-blue-500 hover:bg-mk-ink-100 transition-colors cursor-pointer"
        >
          <RotateCcw size={12} />
        </button>
      ) : undefined}
    />
  );
}

// Labeled wrapper around PriceInputField for the common case (label above field).
function PriceInput({
  label, value, onChange, defaultValue, ar, min, max, helpText,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  defaultValue: number;
  ar: boolean;
  min?: number;
  max?: number;
  helpText?: string;
}) {
  return (
    <div>
      <label className="mk-overline mb-2 block text-mk-ink-600">{label}</label>
      <PriceInputField value={value} onChange={onChange} defaultValue={defaultValue} ar={ar} min={min} max={max} helpText={helpText} />
    </div>
  );
}


function CarCardCarousel({ images, picked }: { images: string[]; picked?: boolean }) {
  const [index, setIndex] = useState(0);
  const [startX, setStartX] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-[170px] flex items-center justify-center mk-caption text-mk-ink-400 bg-mk-ink-50">
        No Photo
      </div>
    );
  }

  const next = () => {
    setIndex((prev) => (prev + 1) % images.length);
  };

  const prev = () => {
    setIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleStart = (clientX: number) => {
    setStartX(clientX);
    setIsDragging(true);
    setHasDragged(false);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || startX === null) return;
    const diff = startX - clientX;
    if (Math.abs(diff) > 5) {
      setHasDragged(true);
    }
    if (diff > 40) {
      next();
      setIsDragging(false);
      setStartX(null);
    } else if (diff < -40) {
      prev();
      setIsDragging(false);
      setStartX(null);
    }
  };

  const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (hasDragged) {
      e.stopPropagation();
      e.preventDefault();
    }
    setIsDragging(false);
    setStartX(null);
  };

  const activeSrc = images[index];
  const activeFlipped = activeSrc?.endsWith("#flipped");
  const cleanActiveSrc = activeFlipped ? activeSrc.replace("#flipped", "") : activeSrc;

  const bg = picked
    ? "linear-gradient(135deg, rgba(65,113,226,0.12), rgba(127,67,221,0.12))"
    : "linear-gradient(135deg, rgba(65,113,226,0.06), rgba(127,67,221,0.06))";

  return (
    <div
      className="relative w-full overflow-hidden select-none group cursor-grab active:cursor-grabbing"
      style={{ height: 170, background: bg }}
      onTouchStart={(e) => handleStart(e.touches[0].clientX)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
      onTouchEnd={handleEnd}
      onMouseDown={(e) => handleStart(e.clientX)}
      onMouseMove={(e) => {
        if (isDragging) {
          e.preventDefault();
          handleMove(e.clientX);
        }
      }}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onClick={(e) => {
        if (hasDragged) {
          e.stopPropagation();
          e.preventDefault();
        }
      }}
    >
      {images.map((imgUrl, i) => {
        const isImgFlipped = imgUrl.endsWith("#flipped");
        const cleanImgSrc = isImgFlipped ? imgUrl.replace("#flipped", "") : imgUrl;
        return (
          <img
            key={i}
            src={cleanImgSrc}
            alt="Car Photo"
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 pointer-events-none"
            style={{
              opacity: i === index ? 1 : 0,
              transform: isImgFlipped ? "scaleX(-1)" : "none",
              zIndex: i === index ? 10 : 0,
            }}
          />
        );
      })}

      {/* Navigation Arrows & Dots */}
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); prev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/35 text-white flex items-center justify-center border-none cursor-pointer hover:bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity z-20"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); next(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/35 text-white flex items-center justify-center border-none cursor-pointer hover:bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity z-20"
          >
            <ChevronRight size={14} />
          </button>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-20">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex(i);
                }}
                className="rounded-full border-none cursor-pointer p-0 transition-all"
                style={{
                  width: i === index ? 14 : 5,
                  height: 5,
                  background: i === index ? "white" : "rgba(255,255,255,0.5)",
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Saudi Arabia's full land neighbors — shown when authorization type is "external"
const NEIGHBORING_COUNTRIES = [
  { code: "AE", ar: "الإمارات", en: "United Arab Emirates" },
  { code: "QA", ar: "قطر", en: "Qatar" },
  { code: "BH", ar: "البحرين", en: "Bahrain" },
  { code: "KW", ar: "الكويت", en: "Kuwait" },
  { code: "OM", ar: "عُمان", en: "Oman" },
  { code: "JO", ar: "الأردن", en: "Jordan" },
  { code: "IQ", ar: "العراق", en: "Iraq" },
  { code: "YE", ar: "اليمن", en: "Yemen" },
];

export default function NewContractPage() {
  const { dir, isDark, currentUser } = useAdmin();
  const ar = dir === "rtl";
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");
  const preselected = clientId ? CLIENTS.find((c) => c.id === clientId) : null;
  const preselectedDriver = preselected ? clientToDriverProfile(preselected) : null;

  const [step, setStep] = useState(0);
  const [showContractPreview, setShowContractPreview] = useState(false);
  const [customersList, setCustomersList] = useState(
    preselectedDriver ? [preselectedDriver, ...CUSTOMERS] : CUSTOMERS
  );
  const [selectedCustomer, setSelectedCustomer] = useState(preselectedDriver ?? CUSTOMERS[0]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [showCustomerSearch, setShowCustomerSearch] = useState(!preselectedDriver);
  const [pickedPlate, setPickedPlate] = useState("ABC 1234");
  const [carFilter, setCarFilter] = useState("all");
  const [carStatusTab, setCarStatusTab] = useState<"all" | CarStatus>("all");
  const [carSearch, setCarSearch] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "list" | "map">("card");
  const [carMapsLoaded, setCarMapsLoaded] = useState(false);
  const carMapRef = useRef<HTMLDivElement>(null);
  const carMapInstanceRef = useRef<any>(null);
  const carMapMarkersRef = useRef<any[]>([]);
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [conditionView, setConditionView] = useState<"sketch" | "photos">("sketch");
  const [addons, setAddons] = useState({
    insurance_comprehensive: true,
    unlimited_km: false,
    driver: false,
    child: false,
    fuel: false,
    internet: false,
    delivery: false,
    return_agent: false,
    navigation: false,
    special_needs: false,
  });
  const [deliveryKm] = useState(15);
  const [otpDigits, setOtpDigits] = useState(["1", "2", "3", "4", "", ""]);
  const [payMethod, setPayMethod] = useState("pos");
  const [payType, setPayType] = useState<"full" | "advance">("full");
  const [signed, setSigned] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [signOtpDigits, setSignOtpDigits] = useState(["", "", "", ""]);
  const signOtpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Add customer drawer state
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [newIdNumber, setNewIdNumber] = useState("");

  // ── Tajeer: pre-required data ──────────────────────────────────
  const [branches, setBranches] = useState<{ id: number; nameAr: string; nameEn: string }[]>([]);
  const [rentPolicies, setRentPolicies] = useState<{ id: number; nameAr: string; nameEn: string }[]>([]);
  const [extendedCoverage, setExtendedCoverage] = useState<{ id: number; nameAr: string; nameEn: string }[]>([]);

  useEffect(() => {
    Promise.all([
      tajeerGetBranches(),
      tajeerGetRentPolicies(),
      tajeerGetExtendedCoverage(),
    ]).then(([b, p, c]) => {
      setBranches(b);
      setRentPolicies(p);
      setExtendedCoverage(c);
      if (b.length > 0) {
        setWorkingBranchId(b[0].id);
        setReceiveBranchId(b[0].id);
        setReturnBranchId(b[0].id);
      }
      if (p.length > 0) setRentPolicyId(p[0].id);
    }).catch(() => {
      // Silently fail in mock mode — branches will load shortly
    });
  }, []);

  // ── Tajeer: contract settings ──────────────────────────────────
  const [idTypeCode, setIdTypeCode] = useState<TajeerIdType>(1);
  const [contractTypeCode, setContractTypeCode] = useState<TajeerContractType>(1);
  const [workingBranchId, setWorkingBranchId] = useState<number>(0);
  const [receiveBranchId, setReceiveBranchId] = useState<number>(0);
  const [returnBranchId, setReturnBranchId] = useState<number>(0);
  const [rentPolicyId, setRentPolicyId] = useState<number>(0);
  const [allowedLateHours, setAllowedLateHours] = useState<number>(1);
  const [allowedKmPerDay, setAllowedKmPerDay] = useState<number>(200);
  const [allowedKmPerHour, setAllowedKmPerHour] = useState<number>(30);
  const [unlimitedKm, setUnlimitedKm] = useState(false);
  const [isRenterDriver, setIsRenterDriver] = useState(true);

  // Authorized driver fields (when isRenterDriver = false) — selected via customer search, like the renter
  const [selectedAuthDriver, setSelectedAuthDriver] = useState<DriverProfile | null>(null);
  const [authDriverIdType, setAuthDriverIdType] = useState<TajeerIdType>(1);
  const [authDriverIdNumber, setAuthDriverIdNumber] = useState("");
  const [authDriverBirthDate, setAuthDriverBirthDate] = useState("");
  const [authDriverMobile, setAuthDriverMobile] = useState("");
  const [authDriverQuery, setAuthDriverQuery] = useState("");
  const [showAuthDriverAddNew, setShowAuthDriverAddNew] = useState(false);

  // Extra driver fields
  const [extraDriverQuery, setExtraDriverQuery] = useState("");
  const [selectedExtraDriver, setSelectedExtraDriver] = useState<DriverProfile | null>(null);
  const [extraDriverIdType, setExtraDriverIdType] = useState<TajeerIdType>(1);
  const [extraDriverIdNumber, setExtraDriverIdNumber] = useState("");
  const [extraDriverAddress, setExtraDriverAddress] = useState("");
  const [extraDriverBirthDate, setExtraDriverBirthDate] = useState("");

  // ── Tajeer: renter extra fields ────────────────────────────────
  const [renterEmail, setRenterEmail] = useState("");
  const [renterPassport, setRenterPassport] = useState("");
  const [renterHijriBirth, setRenterHijriBirth] = useState("");
  const [renterBirthDate, setRenterBirthDate] = useState("");
  const [renterNationalityCode, setRenterNationalityCode] = useState("");
  const [renterLicenseNumber, setRenterLicenseNumber] = useState("");
  const [renterLicenseExpiry, setRenterLicenseExpiry] = useState("");
  const [renterIdExpiry, setRenterIdExpiry] = useState("");
  const [renterIdCopyNumber, setRenterIdCopyNumber] = useState("");
  const [renterAddress, setRenterAddress] = useState("Riyadh");
  const [renterLicenseIssuePlace, setRenterLicenseIssuePlace] = useState("");
  const [renterBorderNumber, setRenterBorderNumber] = useState("");
  const [isHourlyRental, setIsHourlyRental] = useState(false);
  const [pickupDateTime, setPickupDateTime] = useState("2026-05-24T14:00");
  const [returnDateTime, setReturnDateTime] = useState("2026-05-28T18:00");

  // ── Insurance ────────────────────────────────────────────────
  const [insuranceAmount, setInsuranceAmount] = useState<number>(100000);

  // ── Contract terms (authorization window) ───────────────────
  const [authorizationStartDate, setAuthorizationStartDate] = useState("");
  const [authorizationEndDate, setAuthorizationEndDate] = useState("");

  // Authorization window defaults to the rental's pickup date, ending 6 months later
  useEffect(() => {
    const pickupDate = pickupDateTime.split("T")[0];
    if (!pickupDate) return;
    setAuthorizationStartDate(pickupDate);
    const end = new Date(pickupDate);
    end.setMonth(end.getMonth() + 6);
    setAuthorizationEndDate(end.toISOString().split("T")[0]);
  }, [pickupDateTime]);
  const [authorizationTypeCode, setAuthorizationTypeCode] = useState<"internal" | "external">("internal");
  const [authorizationCountry, setAuthorizationCountry] = useState("");

  // ── Financial data ───────────────────────────────────────────
  const [internationalAuthorizationCost, setInternationalAuthorizationCost] = useState<number>(0);

  // ── Rental policy (office-selectable) ───────────────────────
  const [extensionPolicy, setExtensionPolicy] = useState("auto_renew");
  const [earlyReturnPolicy, setEarlyReturnPolicy] = useState("no_refund");
  const [accidentReportPolicy, setAccidentReportPolicy] = useState("police_report_required");
  const [fuelReturnPolicy, setFuelReturnPolicy] = useState("same_level");
  const [breakdownReportPolicy, setBreakdownReportPolicy] = useState("call_office");

  // ── Tajeer: vehicle condition (rent status) ────────────────────
  const [rentStatus, setRentStatus] = useState<Partial<TajeerRentStatus>>({
    ac: 1, radioStereo: 1, screen: 1, speedometer: 5, keys: 5,
    carSeats: 6, tires: 1, spareTire: 1, safetyTriangle: 8,
    fireExtinguisher: 8, firstAidKit: 8, spareTireTools: 8,
    availableFuel: 1, odometerReading: 0, fuelTypeCode: 1,
    enduranceAmount: 0, oilChangeKmDistance: 5000,
    oilChangeDate: new Date().toISOString().split("T")[0],
    oilType: "", notes: "",
  });
  const [sketchItems, setSketchItems] = useState<SketchItem[]>([]);

  // ── Tajeer: pricing ────────────────────────────────────────────
  const [rentDayCost, setRentDayCost] = useState<number>(0);
  const [rentHourCost, setRentHourCost] = useState<number>(0);
  const [extraKmCost, setExtraKmCost] = useState<number>(SYSTEM_EXTRA_KM_RATE);
  const [fullFuelCost, setFullFuelCost] = useState<number>(0);
  const [lateFeePerHour, setLateFeePerHour] = useState<number>(0);
  const [discountType, setDiscountType] = useState<"percent" | "amount">("percent");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountFlatAmount, setDiscountFlatAmount] = useState<number>(0);
  const [extendedCoverageId, setExtendedCoverageId] = useState<number | undefined>();
  const [additionalCoverageCost, setAdditionalCoverageCost] = useState<number>(0);
  const [driverFarePerDay, setDriverFarePerDay] = useState<number>(0);
  const [driverFarePerHour, setDriverFarePerHour] = useState<number>(0);
  const [vehicleTransferCost, setVehicleTransferCost] = useState<number>(0);

  // Auto-fill renter's fields when selectedCustomer changes
  useEffect(() => {
    if (selectedCustomer) {
      // Find the detailed driver profile from MOCK_DRIVERS matching selectedCustomer id
      const detailed = MOCK_DRIVERS.find(d => d.id === selectedCustomer.id);
      if (detailed) {
        setIdTypeCode(detailed.idTypeCode as TajeerIdType);
        setNewIdNumber(detailed.nationalId || "");
        setRenterBirthDate(detailed.birthDate || "");
        setRenterHijriBirth(detailed.hijriBirthDate ? String(detailed.hijriBirthDate) : "");
        setRenterEmail(detailed.email || "");
        setRenterPassport(detailed.passportNumber || "");
        setRenterNationalityCode(detailed.nationalityCode ? String(detailed.nationalityCode) : "");
        setRenterLicenseNumber(detailed.licenseNumber || "");
        setRenterLicenseExpiry(detailed.licenseExpiryDate || "");
        setRenterIdExpiry(detailed.idExpiryDate || "");
        setRenterAddress(detailed.personAddress || "Riyadh");
        setRenterIdCopyNumber(detailed.idCopyNumber || "");
        setRenterLicenseIssuePlace(detailed.licenseIssuePlace || "");
        setRenterBorderNumber(detailed.borderNumber || "");
      }
    }
  }, [selectedCustomer]);

  // Auto-fill vehicle details when pickedPlate changes
  useEffect(() => {
    const selectedCar = CARS.find((c) => c.plate === pickedPlate);
    if (selectedCar) {
      setRentDayCost(selectedCar.dailyRate);
      setExtraKmCost(selectedCar.extraKmCost);
      setFullFuelCost(selectedCar.fullFuelCost);
      setLateFeePerHour(selectedCar.lateFeePerHour);
      const isUnlimited = selectedCar.kmCap === "Unlimited";
      setUnlimitedKm(isUnlimited);
      setAllowedKmPerDay(isUnlimited ? 200 : Number(selectedCar.kmCap));

      const odometer = { 1: 43210, 3: 28640, 4: 61880, 5: 55320, 7: 38190, 8: 72400 }[selectedCar.id] ?? 45000;
      setRentStatus((s) => ({
        ...s,
        odometerReading: odometer,
        oilChangeDate: selectedCar.oilChangeDate ?? s.oilChangeDate,
        fuelTypeCode: selectedCar.fuelTypeCode,
        enduranceAmount: selectedCar.enduranceAmount,
      }));

      // Auto-fill insurance amount from vehicle fleet data
      if (selectedCar.insuranceAmount) {
        setInsuranceAmount(selectedCar.insuranceAmount);
      }

      setAddons((s) => ({
        ...s,
        unlimited_km: isUnlimited ? true : s.unlimited_km,
      }));

      // Pre-existing registered damages for each car (mocked from fleet)
      // Coordinates are normalized to the sketch canvas (2196×1003 — see CAR_W/CAR_H in SketchComponent).
      const initialSketchMap: Record<string, SketchItem[]> = {
        "ABC 1234": [
          { type: "small-scratch", x: 1107, y: 655, note: "خدش بسيط بالباب الخلفي الأيمن / Small scratch on rear right door" }
        ],
        "DEF 5678": [
          { type: "deep-scratch", x: 1771, y: 888, note: "خدش عميق بالإطار الأمامي / Deep scratch on front tire" }
        ],
        "GHI 9012": [
          { type: "bend-in-body", x: 566, y: 351, note: "طعجة بسيطة بالرفرف الخلفي / Small rear fender bend" }
        ],
        "JKL 3456": [
          { type: "very-deep-scratch", x: 762, y: 234, note: "خدش عميق جداً بالسقف / Very deep scratch on roof" }
        ],
        "MNO 7890": [
          { type: "small-scratch", x: 1525, y: 253, note: "خدش بالزجاج الأمامي / Small scratch on windshield" }
        ],
        "PQR 1357": [
          { type: "deep-scratch", x: 2010, y: 636, note: "خدش عميق بالصدام الأمامي / Deep scratch on front bumper" }
        ],
        "STU 2468": [
          { type: "bend-in-body", x: 516, y: 888, note: "طعجة خفيفة بالإطار الخلفي الأيمن / Mild bend in rear right wheel arch" }
        ],
      };
      setSketchItems(initialSketchMap[selectedCar.plate] || []);

      // Auto-determine branches based on the vehicle location
      let branchId = 1; // Default: Riyadh
      if (selectedCar.location?.includes("Jeddah") || selectedCar.location?.includes("Tahlia")) {
        branchId = 2; // Jeddah
      } else if (selectedCar.location?.includes("Dammam")) {
        branchId = 3; // Dammam
      }
      setWorkingBranchId(branchId);
      setReceiveBranchId(branchId);
      setReturnBranchId(branchId);
    }
  }, [pickedPlate]);

  // Contract type follows the extra-driver add-on selection and the explicit daily/hourly toggle
  useEffect(() => {
    setContractTypeCode(addons.driver ? (isHourlyRental ? 4 : 3) : (isHourlyRental ? 2 : 1));
  }, [addons.driver, isHourlyRental]);

  useEffect(() => {
    if (!showConditionModal) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setShowConditionModal(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showConditionModal]);

  // ── Submission state ───────────────────────────────────
  const [contractStep, setContractStep] = useState<"idle" | "saving" | "pending_signature" | "issued" | "error">("idle");
  const [tajeerResponse, setTajeerResponse] = useState<TajeerSaveContractResponse | null>(null);
  const [tajeerError, setTajeerError] = useState<string>("");

  // Automatically confirm client signature 5 seconds after identity verification completes
  useEffect(() => {
    if (contractStep === "pending_signature" && otpDigits.every(d => d !== "")) {
      const timer = setTimeout(() => {
        handleConfirmSignature();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [contractStep, otpDigits]);

  // ── Tajeer: submit handler ─────────────────────────────────────
  const handleSubmitToTajeer = async () => {
    setContractStep("saving");
    setTajeerError("");
    try {
      const selectedCar = CARS.find((c) => c.plate === pickedPlate) ?? CARS[0];
      const plateNumber = selectedCar.plateNumber;
      const firstChar = selectedCar.plateChar1;
      const secondChar = selectedCar.plateChar2;
      const thirdChar = selectedCar.plateChar3;

      const finalContractTypeCode = (addons.driver && selectedExtraDriver) ? contractTypeCode : (contractTypeCode === 3 ? 1 : contractTypeCode === 4 ? 2 : contractTypeCode);

      const request: TajeerSaveContractRequest = {
        renter: {
          idTypeCode,
          idNumber: (idTypeCode === 3 ? (renterPassport || renterBorderNumber) : newIdNumber) || "1098002244",
          mobile: selectedCustomer.phone.replace(/\D/g, "").replace(/^0/, "966"),
          personAddress: renterAddress || "Riyadh",
          hijriBirthDate: idTypeCode === 1 ? (parseInt(renterHijriBirth) || 14430101) : undefined,
          birthDate: idTypeCode !== 1 ? (renterBirthDate || undefined) : undefined,
          email: renterEmail || undefined,
          passportNumber: renterPassport || undefined,
          nationalityCode: renterNationalityCode ? parseInt(renterNationalityCode) : undefined,
          driveLicenseNumber: renterLicenseNumber || undefined,
          licenseExpiryDate: renterLicenseExpiry || undefined,
          idExpiryDate: renterIdExpiry || undefined,
          idCopyNumber: renterIdCopyNumber || undefined,
        },
        authorizedDriver: !isRenterDriver && authDriverIdNumber ? {
          idTypeCode: authDriverIdType,
          idNumber: authDriverIdNumber,
          birthDate: authDriverBirthDate || undefined,
          mobile: authDriverMobile || undefined,
          authorizationStartDate: authorizationStartDate || undefined,
          authorizationEndDate: authorizationEndDate || undefined,
          authorizationTypeCode,
        } : undefined,
        extraDriver: addons.driver && extraDriverIdNumber ? {
          idTypeCode: extraDriverIdType,
          idNumber: extraDriverIdNumber,
          personAddress: extraDriverAddress || undefined,
          birthDate: extraDriverBirthDate || undefined,
        } : undefined,
        vehicleDetails: {
          plateNumber,
          firstChar,
          secondChar,
          thirdChar,
          plateType: selectedCar.registrationTypeCode ?? 1,
          operationCardNumber: selectedCar.operationCardNumber || undefined,
          operationCardExpiryDate: selectedCar.operationCardExpiryDate || undefined,
        },
        paymentDetails: {
          rentDayCost: finalContractTypeCode === 1 || finalContractTypeCode === 3 ? (rentDayCost || selectedCar.dailyRate) : undefined,
          rentHourCost: finalContractTypeCode === 2 || finalContractTypeCode === 4 ? (rentHourCost || undefined) : undefined,
          extraKmCost,
          fullFuelCost,
          discount: grossSubtotal > 0 ? Math.min(100, Math.round((discountAmount / grossSubtotal) * 100)) : 0,
          paid: payType === "advance" ? advanceAmount : total,
          paymentMethodCode: payMethod === "cash" ? 1 : 2,
          driverFarePerDay: finalContractTypeCode === 3 ? (driverFarePerDay || undefined) : undefined,
          driverFarePerHour: finalContractTypeCode === 4 ? (driverFarePerHour || undefined) : undefined,
          vehicleTransferCost: receiveBranchId !== returnBranchId ? (vehicleTransferCost || undefined) : undefined,
          internationalAuthorizationCost: internationalAuthorizationCost || undefined,
          additionalCoverageCost: extendedCoverageId ? (additionalCoverageCost || undefined) : undefined,
          extendedCoverageId,
        },
        rentStatus: {
          ...rentStatus,
          sketchInfo: sketchItems.length > 0 ? JSON.stringify(sketchItems) : undefined,
        } as TajeerRentStatus,
        workingBranchId: workingBranchId || (branches[0]?.id ?? 1),
        receiveBranchId: receiveBranchId || (branches[0]?.id ?? 1),
        returnBranchId: returnBranchId || (branches[0]?.id ?? 1),
        rentPolicyId: rentPolicyId || (rentPolicies[0]?.id ?? 101),
        contractStartDate: pickupDate.toISOString(),
        contractEndDate: returnDate.toISOString(),
        contractTypeCode: finalContractTypeCode,
        allowedKmPerDay: finalContractTypeCode % 2 === 1 ? allowedKmPerDay : undefined,
        allowedKmPerHour: finalContractTypeCode % 2 === 0 ? allowedKmPerHour : undefined,
        allowedLateHours,
        unlimitedKm: unlimitedKm || addons.unlimited_km,
        operatorId: Number(currentUser?.operatorId ?? 1028558326),
        extendedCoverageId,
      };

      const response = await tajeerSaveContract(request);
      setTajeerResponse(response);
      setContractStep("pending_signature");
    } catch (err) {
      setTajeerError(err instanceof Error ? err.message : "خطأ غير متوقع");
      setContractStep("error");
    }
  };

  const handleConfirmSignature = () => {
    setContractStep("saving");
    setTimeout(() => {
      setContractStep("issued");
    }, 1200);
  };

  const handleCheckStatus = async () => {
    if (!tajeerResponse) return;
    try {
      const contract = await tajeerGetContract(tajeerResponse.contractNumber);
      if (contract.contractStatusCode === 4) {
        setContractStep("issued");
      }
    } catch {
      // show toast in production
    }
  };

  const handleCancelContract = async () => {
    if (!tajeerResponse) return;
    try {
      await tajeerCancelContract(tajeerResponse.contractNumber);
      setContractStep("idle");
      setTajeerResponse(null);
    } catch {
      // show toast in production
    }
  };

  const pickupDate = new Date(pickupDateTime);
  const returnDate = new Date(returnDateTime);
  const rentalMs = Math.max(0, returnDate.getTime() - pickupDate.getTime());
  const rentalWholeDays = Math.floor(rentalMs / (1000 * 60 * 60 * 24));
  const rentalExtraHours = Math.floor((rentalMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const days = Math.max(1, Math.ceil(rentalMs / (1000 * 60 * 60 * 24)));
  const rentalDurationLabel = T(
    `${rentalWholeDays} days · ${rentalExtraHours} hours`,
    `${rentalWholeDays} أيام · ${rentalExtraHours} ساعات`,
    ar
  );
  const car = CARS.find((c) => c.plate === pickedPlate.replace(" ", "").slice(0, 7)) || CARS[0];
  const totalHours = Math.max(1, Math.ceil(rentalMs / (1000 * 60 * 60)));
  const base = (contractTypeCode === 2 || contractTypeCode === 4)
    ? rentHourCost * totalHours
    : (rentDayCost || car.dailyRate) * days;
  const addonPrices = {
    insurance_comprehensive: 1500,
    unlimited_km: 85 * days,
    child: 25 * days,
    fuel: 175,
    internet: 30 * days,
    delivery: 5 * deliveryKm,
    return_agent: 75,
    navigation: 40 * days,
    special_needs: 50 * days,
  };

  const addonTotal = Object.entries(addons)
    .filter(([k, v]) => v && ADD_ONS.some(a => a.k === k))
    .reduce((s, [k]) => s + (addonPrices[k as keyof typeof addonPrices] ?? 0), 0);
  const extraDriverFare = addons.driver && selectedExtraDriver
    ? (contractTypeCode === 4 ? driverFarePerHour * totalHours : driverFarePerDay * days)
    : 0;
  const transferFare = receiveBranchId !== returnBranchId ? (vehicleTransferCost || SYSTEM_VEHICLE_TRANSFER_COST) : 0;
  // No branch/coverage-style gate exists for this one — it's opt-in per contract
  // (only relevant when the authorization is actually international), so its
  // real registered default is "no fee" until the employee enters one.
  const authorizationFare = internationalAuthorizationCost;
  const coverageFare = extendedCoverageId ? (additionalCoverageCost || SYSTEM_COVERAGE_BASE_COST) : 0;
  const grossSubtotal = base + addonTotal + extraDriverFare + transferFare + authorizationFare + coverageFare + fullFuelCost;
  const discountAmount = discountType === "percent"
    ? Math.round(grossSubtotal * (discountPercent / 100))
    : Math.min(discountFlatAmount, grossSubtotal);
  const subtotal = grossSubtotal - discountAmount;
  const vat = Math.round(subtotal * 0.15);
  const total = subtotal + vat;
  const advanceAmount = Math.round(total * 0.5);
  const remaining = total - advanceAmount;

  const filteredCustomers = customersList
    .filter((c) => {
      if (customerQuery.trim().length <= 1) return true;
      const query = customerQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(query) ||
        c.phone.includes(query) ||
        (c.nameAr && c.nameAr.includes(query)) ||
        (c.nationalId && c.nationalId.includes(query))
      );
    })
    .slice(0, 5);

  const filteredAuthDrivers = customersList
    .filter((c) => c.id !== selectedCustomer.id)
    .filter((c) => c.idType === "Saudi ID" || c.idType === "Iqama")
    .filter((c) => {
      if (authDriverQuery.trim().length <= 1) return true;
      const query = authDriverQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(query) ||
        c.phone.includes(query) ||
        (c.nameAr && c.nameAr.includes(query)) ||
        (c.nationalId && c.nationalId.includes(query))
      );
    })
    .slice(0, 5);

  const carStatusCounts: Record<string, number> = {
    available: CARS.filter((c) => c.status === "available").length,
    rented: CARS.filter((c) => c.status === "rented").length,
    overdue: CARS.filter((c) => c.status === "overdue").length,
    maintenance: CARS.filter((c) => c.status === "maintenance").length,
    reserved: CARS.filter((c) => c.status === "reserved").length,
  };

  const availCars = CARS.filter((c) => {
    const matchStatus = carStatusTab === "all" || c.status === carStatusTab;
    const matchType = carFilter === "all" || c.type === carFilter;
    const q = carSearch.trim().toLowerCase();
    const matchSearch = !q ||
      c.name.toLowerCase().includes(q) ||
      c.plate.toLowerCase().includes(q) ||
      `${c.make} ${c.model}`.toLowerCase().includes(q);
    return matchStatus && matchType && matchSearch;
  });

  // ── Vehicle selection map view ──────────────────────────────────
  useEffect(() => {
    if (viewMode !== "map") return;
    loadGoogleMapsScript()
      .then(() => setCarMapsLoaded(true))
      .catch((err) => console.error("Error loading Google Maps SDK:", err));
  }, [viewMode]);

  useEffect(() => {
    if (viewMode !== "map" || !carMapsLoaded || !carMapRef.current) return;
    const map = new (window as any).google.maps.Map(carMapRef.current, {
      center: { lat: 24.7136, lng: 46.6753 },
      zoom: 13,
      styles: getGoogleMapsStyle(isDark),
      disableDefaultUI: true,
      zoomControl: true,
    });
    carMapInstanceRef.current = map;
    return () => {
      carMapInstanceRef.current = null;
    };
  }, [viewMode, carMapsLoaded, isDark]);

  useEffect(() => {
    const map = carMapInstanceRef.current;
    if (!map || viewMode !== "map") return;

    carMapMarkersRef.current.forEach((m) => m && m.setMap(null));
    carMapMarkersRef.current = [];

    const statusColor: Record<string, string> = {
      available: "var(--color-mk-mint-600)", rented: "var(--color-mk-blue-500)", overdue: "var(--color-mk-danger)",
      maintenance: "var(--color-mk-warning)", reserved: "var(--color-mk-violet-500)",
    };

    availCars
      .filter((c) => c.mapX > 0)
      .forEach((c) => {
        const { lat, lng } = getCarLatLng(c.mapX, c.mapY);
        const marker = createCustomMarker(
          map,
          lat,
          lng,
          statusColor[c.status] ?? "var(--color-mk-ink-400)",
          c.name.split(" ")[0],
          c.plate === pickedPlate,
          () => setPickedPlate(c.plate)
        );
        if (marker) carMapMarkersRef.current.push(marker);
      });

    return () => {
      carMapMarkersRef.current.forEach((m) => m && m.setMap(null));
      carMapMarkersRef.current = [];
    };
  }, [viewMode, carMapsLoaded, availCars, pickedPlate]);

  const otpComplete = otpDigits.every((d) => d !== "");

  const handleSelectAuthDriver = (d: DriverProfile) => {
    setSelectedAuthDriver(d);
    setAuthDriverIdType(d.idTypeCode as TajeerIdType);
    setAuthDriverIdNumber(d.nationalId);
    setAuthDriverMobile(d.phone);
    setAuthDriverBirthDate(d.birthDate || (d.hijriBirthDate ? String(d.hijriBirthDate) : ""));
    setAuthDriverQuery("");
  };


  const ID_TYPE_CODE_MAP: Record<NewPersonProfile["idType"], 1 | 2 | 3 | 4> = {
    "Saudi ID": 1, "Iqama": 2, "Passport": 3, "GCC ID": 4,
  };

  const handleCreateCustomerFromDrawer = (p: NewPersonProfile) => {
    const newCust: DriverProfile = {
      id: `D-${1000 + customersList.length + 1}`,
      name: p.name,
      nameAr: p.nameAr,
      phone: p.phone,
      idType: p.idType,
      idTypeCode: ID_TYPE_CODE_MAP[p.idType],
      nationalId: p.idNumber,
      idExpiryDate: p.idExpiryDate,
      birthDate: p.birthDate,
      hijriBirthDate: p.hijriBirthDate,
      email: p.email,
      nationality: p.nationality,
      personAddress: p.personAddress ?? "Riyadh",
      idCopyNumber: p.idCopyNumber,
      licenseIssuePlace: p.licenseIssuePlace,
      borderNumber: p.borderNumber,
      licenseNumber: p.licenseNumber || `LIC-${Math.floor(10000 + Math.random() * 90000)}`,
      licenseExpiryDate: p.licenseExpiryDate,
      bookings: 0,
      status: "verified",
      lastBooking: null,
      rating: 5.0,
      blacklisted: false,
      joinDate: new Date().toISOString().split("T")[0],
    };

    setCustomersList((prev) => [newCust, ...prev]);
    setSelectedCustomer(newCust);
    setShowCustomerSearch(false);
    setIsNewCustomerOpen(false);
  };

  const handleCreateAuthDriverFromDrawer = (p: NewPersonProfile) => {
    const newDriver: DriverProfile = {
      id: `D-${1000 + customersList.length + 1}`,
      name: p.name,
      nameAr: p.nameAr,
      phone: p.phone,
      idType: p.idType,
      idTypeCode: ID_TYPE_CODE_MAP[p.idType],
      nationalId: p.idNumber,
      idExpiryDate: p.idExpiryDate,
      birthDate: p.birthDate,
      hijriBirthDate: p.hijriBirthDate,
      email: p.email,
      nationality: p.nationality,
      personAddress: p.personAddress ?? "Riyadh",
      idCopyNumber: p.idCopyNumber,
      licenseIssuePlace: p.licenseIssuePlace,
      borderNumber: p.borderNumber,
      licenseNumber: p.licenseNumber || `LIC-${Math.floor(10000 + Math.random() * 90000)}`,
      licenseExpiryDate: p.licenseExpiryDate,
      bookings: 0,
      status: "verified",
      lastBooking: null,
      rating: 5.0,
      blacklisted: false,
      joinDate: new Date().toISOString().split("T")[0],
    };

    setCustomersList((prev) => [newDriver, ...prev]);
    handleSelectAuthDriver(newDriver);
    setShowAuthDriverAddNew(false);
  };

  // ── Renter identity fields — the required field set depends on idTypeCode ──
  type RenterFieldDef = {
    key: string; labelEn: string; labelAr: string; required: boolean;
    type: "text" | "date" | "email" | "hijri"; value: string; onChange: (v: string) => void;
  };
  function getRenterIdentityFields(): RenterFieldDef[] {
    const idNumberField: RenterFieldDef = { key: "idNumber", labelEn: "Beneficiary ID No.", labelAr: "رقم هوية المستفيد", required: true, type: "text", value: newIdNumber, onChange: setNewIdNumber };
    const addressField: RenterFieldDef = { key: "address", labelEn: "Address", labelAr: "العنوان", required: true, type: "text", value: renterAddress, onChange: setRenterAddress };
    const idCopyNumberField: RenterFieldDef = { key: "idCopyNumber", labelEn: "ID Copy No.", labelAr: "رقم نسخة الهوية", required: true, type: "text", value: renterIdCopyNumber, onChange: setRenterIdCopyNumber };
    if (idTypeCode === 1) {
      return [
        idNumberField,
        addressField,
        { key: "hijriBirth", labelEn: "Date of Birth (Hijri)", labelAr: "تاريخ الميلاد (هجري)", required: true, type: "hijri", value: renterHijriBirth, onChange: setRenterHijriBirth },
        { key: "email", labelEn: "Email (optional)", labelAr: "البريد الإلكتروني (غير إلزامي)", required: false, type: "email", value: renterEmail, onChange: setRenterEmail },
      ];
    }
    if (idTypeCode === 2) {
      return [
        idNumberField,
        addressField,
        { key: "birthDate", labelEn: "Date of Birth", labelAr: "تاريخ الميلاد", required: true, type: "date", value: renterBirthDate, onChange: setRenterBirthDate },
        { key: "email", labelEn: "Email (optional)", labelAr: "البريد الإلكتروني (غير إلزامي)", required: false, type: "email", value: renterEmail, onChange: setRenterEmail },
      ];
    }
    if (idTypeCode === 4) {
      // GCC
      return [
        idNumberField,
        addressField,
        { key: "licenseNumber", labelEn: "License No.", labelAr: "رقم الرخصة", required: true, type: "text", value: renterLicenseNumber, onChange: setRenterLicenseNumber },
        { key: "idExpiry", labelEn: "ID Expiry Date", labelAr: "تاريخ انتهاء الهوية", required: true, type: "date", value: renterIdExpiry, onChange: setRenterIdExpiry },
        { key: "licenseIssuePlace", labelEn: "License Issue Place", labelAr: "مكان إصدار الرخصة", required: true, type: "text", value: renterLicenseIssuePlace, onChange: setRenterLicenseIssuePlace },
        { key: "email", labelEn: "Email", labelAr: "البريد الإلكتروني", required: true, type: "email", value: renterEmail, onChange: setRenterEmail },
        { key: "country", labelEn: "Country", labelAr: "الدولة", required: true, type: "text", value: renterNationalityCode, onChange: setRenterNationalityCode },
        idCopyNumberField,
        { key: "licenseExpiry", labelEn: "License Expiry Date", labelAr: "تاريخ انتهاء الرخصة", required: true, type: "date", value: renterLicenseExpiry, onChange: setRenterLicenseExpiry },
      ];
    }
    // Visitor (3) — no "Beneficiary ID No." field; identity is border/passport number instead
    return [
      addressField,
      { key: "borderNumber", labelEn: "Border No.", labelAr: "رقم الحدود", required: true, type: "text", value: renterBorderNumber, onChange: setRenterBorderNumber },
      { key: "passportNumber", labelEn: "Passport No.", labelAr: "رقم الجواز", required: true, type: "text", value: renterPassport, onChange: setRenterPassport },
      { key: "licenseNumber", labelEn: "License No.", labelAr: "رقم الرخصة", required: true, type: "text", value: renterLicenseNumber, onChange: setRenterLicenseNumber },
      { key: "licenseExpiry", labelEn: "License Expiry Date", labelAr: "تاريخ انتهاء الرخصة", required: true, type: "date", value: renterLicenseExpiry, onChange: setRenterLicenseExpiry },
      { key: "licenseIssuePlace", labelEn: "License Issue Place", labelAr: "مكان إصدار الرخصة", required: true, type: "text", value: renterLicenseIssuePlace, onChange: setRenterLicenseIssuePlace },
      { key: "email", labelEn: "Email", labelAr: "البريد الإلكتروني", required: true, type: "email", value: renterEmail, onChange: setRenterEmail },
      { key: "country", labelEn: "Country", labelAr: "الدولة", required: true, type: "text", value: renterNationalityCode, onChange: setRenterNationalityCode },
      idCopyNumberField,
      { key: "idExpiry", labelEn: "ID Expiry Date", labelAr: "تاريخ انتهاء الهوية", required: true, type: "date", value: renterIdExpiry, onChange: setRenterIdExpiry },
    ];
  }

  /* ── Stepper ─────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col min-h-[calc(100vh-110px)] justify-between">
      <div className="flex-1 pb-8">
        {/* Alert / Notification Banner */}
        <AlertBanner
          title={T("Attention required:", "تنبيه هام للموظف:", ar)}
          sub={T(
            "The Unified Rental Contract form is filled automatically during this creation journey in Maarkbh. Please thoroughly review all customer data, ID details, and branch information before issuing the contract or requesting the customer's signature.",
            "يتم تعبئة نموذج عقد التأجير الموحد تلقائياً خلال رحلة إنشاء العقد الحالية في مركبة. يرجى مراجعة كافة بيانات العميل وتفاصيل الهوية والفروع بدقة لضمان صحتها قبل إصدار العقد أو طلب توقيع العميل.",
            ar
          )}
          kind="success"
        />

        {/* Desktop Stepper — visible ONLY on desktop (lg:flex) */}
        <div className="hidden lg:flex mk-stepper">
          {STEPS.map((s, i) => (
            <button
              key={i}
              className={`mk-step ${i === step ? "active" : i < step ? "done" : ""}`}
              onClick={() => i <= step && setStep(i)}
            >
              <div className="mk-step-num">{i < step ? <Check size={12} /> : i + 1}</div>
              <span>{ar ? s.labelAr : s.labelEn}</span>
            </button>
          ))}
        </div>

        {/* Mobile & Tablet Responsive Progress Stepper — visible on mobile & tablet (< lg) */}
        <div className="lg:hidden mk-surface rounded-xl p-5 mb-6 !border-0">
          {/* Current Step Title & Step Count Badge */}
          <div className="flex items-center justify-between gap-3">
            <div className="mk-h4 text-mk-ink-900 font-semibold m-0">
              {ar ? STEPS[step].labelAr : STEPS[step].labelEn}
            </div>
            <Badge variant="info">
              {ar ? `الخطوة ${step + 1} من ${STEPS.length}` : `Step ${step + 1} of ${STEPS.length}`}
            </Badge>
          </div>

          {/* Segmented Progress Track */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 my-4">
            {STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => i <= step && setStep(i)}
                className={`h-2 rounded-full transition-all duration-300 border-0 p-0 ${i === step
                    ? "bg-mk-blue-500"
                    : i < step
                      ? "bg-mk-success cursor-pointer"
                      : "bg-mk-ink-100 cursor-default"
                  }`}
                title={ar ? STEPS[i].labelAr : STEPS[i].labelEn}
              />
            ))}
          </div>

          {/* Footer: Next step preview */}
          {step < STEPS.length - 1 && (
            <div className="flex items-center gap-2 mt-2">
              <span className="mk-caption text-mk-ink-500 shrink-0">
                {ar ? "الخطوة التالية:" : "Next step:"}
              </span>
              <span className="mk-caption text-mk-ink-700 font-medium truncate">
                {ar ? STEPS[step + 1].labelAr : STEPS[step + 1].labelEn}
              </span>
            </div>
          )}
        </div>

        {/* ── Step 0: Customer, Dates & Vehicle ──────────────────── */}
        {step === 0 && (
          <div className="flex flex-col gap-4">
            {/* Contract info + Drivers — side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Contract info card */}
              <div className="mk-surface rounded-xl p-6">
                <div className="mk-h4 mb-6 text-mk-ink-900">{T("Renter info", "بيانات المستأجر", ar)}</div>
                <div>

                  {/* Renter */}
                  <div>


                    {showCustomerSearch ? (
                      /* Customer search — results as an absolute dropdown */
                      <div className="relative">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 flex items-center gap-3 rounded-md px-4 h-10 bg-mk-ink-50 border border-mk-ink-100">
                            <Search size={14} className="shrink-0 text-mk-ink-500" />
                            <input className="flex-1 bg-transparent outline-none mk-body-sm text-mk-ink-900"
                              placeholder={T("Search customer by phone, ID, or name…", "ابحث عن العميل بالهاتف أو الهوية أو الاسم…", ar)}
                              value={customerQuery}
                              onChange={(e) => setCustomerQuery(e.target.value)} />
                            {customerQuery && (
                              <IconButton size="sm" variant="ghost" className="shrink-0" onClick={() => setCustomerQuery("")}>
                                <X size={13} />
                              </IconButton>
                            )}
                          </div>
                          <Button
                            variant="tonal"
                            size="sm"
                            className="shrink-0 whitespace-nowrap !rounded-md"
                            onClick={() => setIsNewCustomerOpen(true)}
                          >
                            <UserPlus size={14} />
                            {T("Add new", "إضافة عميل", ar)}
                          </Button>
                        </div>
                        {customerQuery.trim().length > 0 && (
                          <div className="absolute z-30 top-full inset-x-0 mt-2 rounded-xl border border-mk-ink-100 bg-white shadow-lg max-h-[280px] overflow-y-auto">
                            {filteredCustomers.length === 0 ? (
                              <div className="p-4 text-center mk-caption text-mk-ink-400">{T("No customers found", "لا يوجد عملاء مطابقون", ar)}</div>
                            ) : filteredCustomers.map((c) => {
                              const tag = getCustomerStatusTag(c);
                              const meta = CUSTOMER_STATUS_META[tag];
                              return (
                                <button key={c.id}
                                  onClick={() => { setSelectedCustomer(c); setCustomerQuery(""); setShowCustomerSearch(false); }}
                                  className="flex items-center gap-3 p-3 w-full text-start border-0 cursor-pointer hover:bg-mk-ink-50 border-b border-mk-ink-50 last:border-none"
                                >
                                  <Avatar name={c.name} size="sm" />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <div className="mk-label text-mk-ink-900">{ar ? c.nameAr : c.name}</div>
                                      <span className="mk-overline px-2 py-1 rounded-full shrink-0 bg-mk-ink-100 text-mk-ink-600">
                                        {ar ? TAJEER_LOOKUPS.idTypes.find(t => t.code === c.idTypeCode)?.ar : TAJEER_LOOKUPS.idTypes.find(t => t.code === c.idTypeCode)?.en}
                                      </span>
                                    </div>
                                    <div className="mk-caption text-mk-ink-500">
                                      {c.phone} · {c.bookings} {T("past contracts · ★", "عقود سابقة · ★", ar)} {c.rating}
                                    </div>
                                  </div>
                                  <span className={`mk-overline px-2 py-1 rounded-full shrink-0 ${meta.className}`}>
                                    {T(meta.labelEn, meta.labelAr, ar)}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (() => {
                      const tag = getCustomerStatusTag(selectedCustomer);
                      const meta = CUSTOMER_STATUS_META[tag];
                      return (
                        <div>
                          <div className={`flex items-center gap-3 p-3 rounded-lg border ${meta.blocking ? "border-mk-danger/30 bg-mk-danger/5" : "border-mk-blue-500/30 bg-mk-blue-surface"}`}>
                            <Avatar name={selectedCustomer.name} size="sm" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="mk-label text-mk-ink-900">{ar ? selectedCustomer.nameAr : selectedCustomer.name}</div>
                                <span className="mk-overline px-2 py-1 rounded-full shrink-0 bg-mk-ink-100 text-mk-ink-600">
                                  {ar ? TAJEER_LOOKUPS.idTypes.find(t => t.code === selectedCustomer.idTypeCode)?.ar : TAJEER_LOOKUPS.idTypes.find(t => t.code === selectedCustomer.idTypeCode)?.en}
                                </span>
                              </div>
                              <div className="mk-caption text-mk-ink-500">
                                {selectedCustomer.phone} · {selectedCustomer.bookings} {T("past contracts · ★", "عقود سابقة · ★", ar)} {selectedCustomer.rating}
                              </div>
                            </div>
                            <span className={`mk-overline px-2 py-1 rounded-full shrink-0 ${meta.className}`}>
                              {T(meta.labelEn, meta.labelAr, ar)}
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowCustomerSearch(true)}
                              title={T("Change customer", "تغيير العميل", ar)}
                              className="bg-transparent border-0 cursor-pointer text-mk-ink-400 flex shrink-0"
                            >
                              <X size={13} />
                            </button>
                          </div>

                          {meta.blocking && (
                            <div className="flex items-center gap-2 mt-2 p-3 rounded-lg mk-caption bg-mk-danger/8 text-mk-danger">
                              <Shield size={13} className="shrink-0" />
                              {tag === "blacklisted"
                                ? T("This customer is blacklisted — a contract cannot be issued.", "هذا العميل ضمن القائمة السوداء — لا يمكن إصدار عقد.", ar)
                                : T("This customer's identity is not verified — a contract cannot be issued.", "هوية هذا العميل غير موثقة — لا يمكن إصدار عقد.", ar)}
                            </div>
                          )}

                          {tag === "debt" && (
                            <div className="mt-2 p-3 rounded-lg mk-caption bg-mk-warning/8 text-mk-warning-700">
                              <div className="mk-label mb-1">
                                {T(`Outstanding debt · ${selectedCustomer.debtAmount} SAR`, `مديونية مستحقة · ${selectedCustomer.debtAmount} ريال`, ar)}
                              </div>
                              <div>{ar ? selectedCustomer.debtNoteAr : selectedCustomer.debtNote}</div>
                            </div>
                          )}

                          {tag === "circular" && (
                            <div className="mt-2 p-3 rounded-lg mk-caption bg-mk-violet-100/60 text-mk-violet-600">
                              <div className="mk-label mb-1">{T("Circular notice", "تعميم", ar)}</div>
                              <div>{ar ? selectedCustomer.circularNoteAr : selectedCustomer.circularNote}</div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Rental period */}
                  <div className="pt-6 mt-6 border-t border-mk-ink-100">


                    <div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="mk-overline mb-2 block text-mk-ink-600">
                            {T("Pickup date & time", "تاريخ ووقت التسليم", ar)}
                          </label>
                          <div className="flex items-center gap-2 px-4 h-10 rounded-md bg-mk-ink-50 border border-mk-ink-100 focus-within:border-mk-blue-500 transition-all">
                            <Calendar size={14} className="shrink-0 text-mk-blue-500" />
                            <input
                              type="datetime-local"
                              value={pickupDateTime}
                              onChange={(e) => setPickupDateTime(e.target.value)}
                              className="flex-1 bg-transparent border-none outline-none mk-body-sm text-mk-ink-900 cursor-pointer [font-family:inherit]"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="mk-overline mb-2 block text-mk-ink-600">
                            {T("Return date & time", "تاريخ ووقت الإرجاع", ar)}
                          </label>
                          <div className="flex items-center gap-2 px-4 h-10 rounded-md bg-mk-ink-50 border border-mk-ink-100 focus-within:border-mk-blue-500 transition-all">
                            <Calendar size={14} className="shrink-0 text-mk-blue-500" />
                            <input
                              type="datetime-local"
                              value={returnDateTime}
                              onChange={(e) => setReturnDateTime(e.target.value)}
                              className="flex-1 bg-transparent border-none outline-none mk-body-sm text-mk-ink-900 cursor-pointer [font-family:inherit]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Rental type — with the (dynamic) duration shown inline */}
                    <div className="mt-6 flex items-end justify-between gap-3">
                      <div>
                        <label className="mk-overline mb-2 block text-mk-ink-600">
                          {T("Rental type", "نوع التأجير", ar)}<span className="text-mk-danger"> *</span>
                        </label>
                        <div className="flex gap-2 mt-2">
                          <button type="button" onClick={() => setIsHourlyRental(false)}
                            className={`px-3 py-2 rounded-full mk-caption border cursor-pointer transition-all ${!isHourlyRental ? "bg-mk-blue-500 text-white border-mk-blue-500" : "bg-white text-mk-ink-600 border-mk-ink-200"}`}>
                            {T("Daily", "يومي", ar)}
                          </button>
                          <button type="button" onClick={() => setIsHourlyRental(true)}
                            className={`px-3 py-2 rounded-full mk-caption border cursor-pointer transition-all ${isHourlyRental ? "bg-mk-blue-500 text-white border-mk-blue-500" : "bg-white text-mk-ink-600 border-mk-ink-200"}`}>
                            {T("Hourly", "ساعة", ar)}
                          </button>
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="mk-overline  text-mk-ink-600">{T("Rental duration", "مدة الإيجار", ar)}</div>
                        <span className="mk-caption text-mk-ink-700">{rentalDurationLabel}</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Drivers card */}
              <div className="mk-surface rounded-xl p-6">
                <div className="mk-h4 mb-6 text-mk-ink-900">{T("Authorization & Drivers", "بيانات التفويض", ar)}</div>
                <div>

                  {/* Authorization window — moved here alongside driver data */}
                  <div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="mk-overline mb-2 block text-mk-ink-600">
                          {T("Authorization start date", "تاريخ بداية التفويض", ar)}
                        </label>
                        <div className="flex items-center gap-2 px-3 h-10 rounded-md bg-mk-ink-50 border border-mk-ink-100 focus-within:border-mk-blue-500 transition-all">
                          <Calendar size={14} className="shrink-0 text-mk-blue-500" />
                          <input type="date" value={authorizationStartDate} onChange={(e) => setAuthorizationStartDate(e.target.value)}
                            className="flex-1 bg-transparent border-none outline-none mk-body-sm text-mk-ink-900 cursor-pointer [font-family:inherit]" />
                        </div>
                      </div>
                      <div>
                        <label className="mk-overline mb-2 block text-mk-ink-600">
                          {T("Authorization end date", "تاريخ نهاية التفويض", ar)}<span className="text-mk-danger"> *</span>
                        </label>
                        <div className="flex items-center gap-2 px-3 h-10 rounded-md bg-mk-ink-50 border border-mk-ink-100 focus-within:border-mk-blue-500 transition-all">
                          <Calendar size={14} className="shrink-0 text-mk-blue-500" />
                          <input type="date" value={authorizationEndDate} onChange={(e) => setAuthorizationEndDate(e.target.value)}
                            className="flex-1 bg-transparent border-none outline-none mk-body-sm text-mk-ink-900 cursor-pointer [font-family:inherit]" />
                        </div>
                      </div>
                      <div>
                        <label className="mk-overline mb-2 block text-mk-ink-600">
                          {T("Authorization type", "نوع التفويض", ar)}
                        </label>
                        <Select
                          value={authorizationTypeCode}
                          onChange={(e) => setAuthorizationTypeCode(e.target.value as "internal" | "external")}
                        >
                          <option value="internal">{T("Internal", "داخلي", ar)}</option>
                          <option value="external">{T("External", "خارجي", ar)}</option>
                        </Select>
                      </div>
                      {authorizationTypeCode === "external" && (
                        <div>
                          <label className="mk-overline mb-2 block text-mk-ink-600">
                            {T("Country", "الدولة", ar)}
                          </label>
                          <Select
                            value={authorizationCountry}
                            onChange={(e) => setAuthorizationCountry(e.target.value)}
                          >
                            <option value="" disabled>{T("Select a country", "اختر دولة", ar)}</option>
                            {NEIGHBORING_COUNTRIES.map((c) => (
                              <option key={c.code} value={c.code}>{ar ? c.ar : c.en}</option>
                            ))}
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Authorized driver */}
                  <div className="pt-6 mt-6 border-t border-mk-ink-100">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-mk-blue-500/10 flex items-center justify-center shrink-0">
                        <UserCheck size={14} className="text-mk-blue-500" />
                      </div>
                      <span className="mk-label text-mk-ink-900">{T("Authorized driver", "المفوض بالقيادة", ar)}</span>
                    </div>
                    <p className="mk-caption text-mk-ink-500 mb-4 mt-2">
                      {T("Authorized drivers must hold a valid Saudi National ID or Iqama (residence permit) only.", "المفوضين هوية وطنية أو إقامة سارية فقط.", ar)}
                    </p>
                    <label className="mk-overline mb-2 block text-mk-ink-600">
                      {T("Is the beneficiary the authorized driver?", "هل المستفيد هو نفسه المفوض؟", ar)}
                    </label>
                    <div className="flex gap-2 mb-3 mt-2">
                      <button type="button" onClick={() => setIsRenterDriver(true)}
                        className={`px-3 py-2 rounded-full mk-caption border cursor-pointer transition-all ${isRenterDriver ? "bg-mk-blue-500 text-white border-mk-blue-500" : "bg-white text-mk-ink-600 border-mk-ink-200"}`}>
                        {T("Yes", "نعم", ar)}
                      </button>
                      <button type="button" onClick={() => setIsRenterDriver(false)}
                        className={`px-3 py-2 rounded-full mk-caption border cursor-pointer transition-all ${!isRenterDriver ? "bg-mk-blue-500 text-white border-mk-blue-500" : "bg-white text-mk-ink-600 border-mk-ink-200"}`}>
                        {T("No", "لا", ar)}
                      </button>
                    </div>

                    {!isRenterDriver && (
                      <div className="p-4 rounded-lg bg-mk-ink-50 border border-mk-ink-200 flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-2">
                          <label className="mk-overline text-mk-ink-600">{T("Search customers for the authorized driver:", "ابحث عن العملاء لاختيار المفوض:", ar)}</label>
                          {!selectedAuthDriver && (
                            <button
                              type="button"
                              onClick={() => setShowAuthDriverAddNew(true)}
                              className="mk-overline text-mk-blue-600 bg-transparent border-0 cursor-pointer shrink-0"
                            >
                              + {T("Add new authorized driver", "إضافة مفوض جديد", ar)}
                            </button>
                          )}
                        </div>

                        {selectedAuthDriver ? (
                          <div className="flex items-center gap-3 p-3 rounded-lg mk-row-bg border border-mk-blue-500/30">
                            <Avatar name={selectedAuthDriver.name} size="sm" />
                            <div className="flex-1 min-w-0">
                              <div className="mk-caption text-mk-ink-900">{ar ? selectedAuthDriver.nameAr : selectedAuthDriver.name}</div>
                              <div className="mk-overline text-mk-ink-500">
                                {selectedAuthDriver.idType} · {selectedAuthDriver.nationalId} · {selectedAuthDriver.phone}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAuthDriver(null);
                                setAuthDriverIdNumber("");
                                setAuthDriverBirthDate("");
                                setAuthDriverMobile("");
                                setAuthDriverQuery("");
                              }}
                              className="mk-overline text-mk-ink-500 bg-mk-ink-50 px-2 py-1 rounded-full border-0 cursor-pointer"
                            >
                              {T("Change", "تغيير", ar)}
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <div className="flex items-center gap-2 rounded-full px-3 h-10 mk-row-bg border border-mk-ink-200">
                              <Search size={13} className="shrink-0 text-mk-ink-500" />
                              <input
                                className="flex-1 bg-transparent outline-none mk-caption text-mk-ink-900"
                                placeholder={T("Search customer by phone, ID, or name…", "ابحث عن العميل بالهاتف أو الهوية أو الاسم…", ar)}
                                value={authDriverQuery}
                                onChange={(e) => setAuthDriverQuery(e.target.value)}
                              />
                            </div>
                            <div
                              className="absolute top-full inset-x-0 mt-2 z-20 flex flex-col gap-2 max-h-[220px] overflow-y-auto p-2 rounded-lg border border-mk-ink-200 shadow-lg bg-mk-bg-elevated"
                            >
                              {filteredAuthDrivers.map((d) => (
                                <button
                                  key={d.id}
                                  type="button"
                                  onClick={() => handleSelectAuthDriver(d)}
                                  className="flex items-center gap-3 p-3 rounded-lg bg-mk-ink-100 hover:bg-mk-ink-200 border border-mk-ink-200 text-start w-full cursor-pointer transition-colors"
                                >
                                  <Avatar name={d.name} size="sm" />
                                  <div className="flex-1 min-w-0">
                                    <div className="mk-caption text-mk-ink-900">{ar ? d.nameAr : d.name}</div>
                                    <div className="mk-overline text-mk-ink-500">{d.idType} · {d.nationalId}</div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>

              </div>
            </div>

            {/* Vehicle selection — full width; condition & diagram open in a modal per vehicle */}
            <div className="grid grid-cols-1 gap-4 items-start">
              {/* 1. VEHICLE SELECTOR CARD */}
              <div className="mk-surface rounded-xl p-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6 flex-wrap">
                  <div className="flex-1 min-w-[160px]">
                    <div className="mk-h4 text-mk-ink-900">{T("Vehicle Selection", "اختيار المركبة", ar)}</div>
                    <div className="mk-caption mt-1 text-mk-ink-500">
                      {availCars.length} {T("vehicles available for selected dates", "مركبة متاحة للتواريخ المحددة", ar)}
                    </div>
                  </div>

                  {/* Search */}
                  <div className="flex-1 min-w-[220px] max-w-[380px]">
                    <Input
                      variant="default"
                      icon={<Search size={14} />}
                      value={carSearch}
                      onChange={(e) => setCarSearch(e.target.value)}
                      placeholder={T("Search by make, model, plate…", "بحث عن ماركة, طراز, لوحة...", ar)}
                    />
                  </div>

                  {/* Status filter */}
                  <div className="shrink-0 w-[150px]">
                    <Select
                      value={carStatusTab}
                      onChange={(e) => setCarStatusTab(e.target.value as "all" | CarStatus)}
                      className="!mk-caption !pe-8 !rounded-md !border-mk-ink-200"
                    >
                      {([
                        { key: "all", labelEn: "All statuses", labelAr: "كل الحالات" },
                        { key: "available", labelEn: "Available", labelAr: "متاحة" },
                        { key: "rented", labelEn: "Rented", labelAr: "مؤجرة" },
                        { key: "overdue", labelEn: "Overdue", labelAr: "متأخر" },
                        { key: "maintenance", labelEn: "Maintenance", labelAr: "صيانة" },
                        { key: "reserved", labelEn: "Reserved", labelAr: "محجوزة" },
                      ] as { key: "all" | CarStatus; labelEn: string; labelAr: string }[]).map((t) => (
                        <option key={t.key} value={t.key}>
                          {ar ? t.labelAr : t.labelEn}
                          {t.key !== "all" ? ` (${carStatusCounts[t.key] ?? 0})` : ""}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {/* View toggle */}
                  <Tabs
                    variant="default"
                    className="shrink-0"
                    value={viewMode}
                    onChange={(v) => setViewMode(v as typeof viewMode)}
                    items={[
                      { value: "list", icon: <List size={15} />, "aria-label": "List view" },
                      { value: "card", icon: <LayoutGrid size={15} />, "aria-label": "Card view" },
                      { value: "map", icon: <MapIcon size={15} />, "aria-label": "Map view" },
                    ]}
                  />
                </div>

                {/* Filter chips */}
                {(() => {
                  const activeFilter = carFilter;
                  const cats = [
                    { k: "all", label: T("All", "الكل", ar) },
                    { k: "Sedan", label: T("Sedan", "سيدان", ar) },
                    { k: "SUV", label: T("SUV", "دفع رباعي", ar) },
                    { k: "Luxury", label: T("Luxury", "فاخرة", ar) },
                    { k: "Economy", label: T("Economy", "اقتصادية", ar) },
                  ];
                  return (
                    <Tabs
                      variant="default"
                      size="sm"
                      className="mb-4"
                      value={activeFilter}
                      onChange={setCarFilter}
                      items={cats.map(({ k, label }) => ({ value: k, label }))}
                    />
                  );
                })()}

                {/* Vehicle cards grid */}
                {viewMode === "card" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {availCars
                      .map((c) => {
                        const picked = c.plate === pickedPlate;
                        const odometer = ({ 1: 43210, 3: 28640, 4: 61880, 5: 55320, 7: 38190, 8: 72400 } as Record<number, number>)[c.id] ?? 45000;
                        return (
                          <div
                            key={c.plate}
                            onClick={() => setPickedPlate(c.plate)}
                            className={`${picked ? "mk-option mk-option--on-glow" : "mk-vehicle-card"} flex flex-col rounded-lg overflow-hidden text-start select-none cursor-pointer`}
                          >
                            {/* Car image area */}
                            <div className="w-full relative">
                              <CarCardCarousel images={CAR_IMAGES[c.model] || []} picked={picked} />
                              {/* Selected checkmark */}
                              {picked && (
                                <span className="absolute top-2 start-2 w-5 h-5 rounded-full flex items-center justify-center bg-mk-blue-500 z-30">
                                  <Check size={11} className="text-white" />
                                </span>
                              )}
                              {/* View condition & diagram */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPickedPlate(c.plate);
                                  setShowConditionModal(true);
                                }}
                                className="absolute bottom-2 end-2 z-30 flex items-center gap-1 px-3 py-2 rounded-full mk-overline bg-black/55 hover:bg-black/70 text-white border-0 cursor-pointer backdrop-blur-sm transition-colors"
                              >
                                <Gauge size={12} />
                                {T("Condition", "حالة السيارة", ar)}
                              </button>
                            </div>

                            {/* Details */}
                            <div className="p-4 flex flex-col justify-between flex-1">
                              {/* Make + model */}
                              <div className="flex items-start gap-2 mb-2">
                                <div className="flex-1 min-w-0">
                                  <div className="mk-body text-mk-ink-900 truncate">
                                    {c.make} {c.model}
                                  </div>
                                  <div className="mk-overline mt-1 text-mk-ink-500">
                                    {c.plate} · {T(c.type, c.type === "Sedan" ? "سيدان" : c.type === "SUV" ? "دفع رباعي" : c.type === "Luxury" ? "فاخرة" : "اقتصادية", ar)} · {c.year}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  <Badge
                                    variant={
                                      c.status === "available" ? "success" :
                                        c.status === "rented" ? "info" :
                                          c.status === "overdue" ? "danger" : "warning"
                                    }
                                    dot
                                  >
                                    {c.status === "available" ? T("Free", "متاحة", ar) :
                                      c.status === "rented" ? T("Rented", "مؤجرة", ar) :
                                        c.status === "overdue" ? T("Overdue", "متأخرة", ar) :
                                          T(c.status, c.status, ar)}
                                  </Badge>
                                  {(c.status === "rented" || c.status === "overdue") && (
                                    <span className="mk-caption mt-1 text-mk-ink-500 shrink-0">
                                      {getAvailabilityText(c.status, c.id, ar)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Odometer & Allowed KM */}
                              <div className="flex items-center gap-2 mk-overline text-mk-ink-500 mt-1">
                                <div className="flex items-center gap-1">
                                  <Gauge size={11} className="text-mk-violet-500" />
                                  <span>{odometer.toLocaleString()} {T("km", "كم", ar)}</span>
                                </div>
                                <div className="w-px h-3 bg-mk-ink-200" />
                                <div>
                                  {c.kmCap === "Unlimited"
                                    ? T("Unlimited km", "كم غير محدود", ar)
                                    : `${c.kmCap} ${T("km/day", "كم/يوم", ar)}`}
                                </div>
                              </div>

                              {/* Divider & Pricing Details */}
                              <div className="flex items-center justify-between mt-3 pt-3 border-t border-mk-ink-100">
                                <div className="flex items-center gap-1">
                                  <RiyalSymbol size={16} className={picked ? "text-mk-blue-500" : "text-mk-ink-900"} />
                                  <span className={`mk-body ${picked ? "text-mk-blue-500" : "text-mk-ink-900"}`}>{c.dailyRate}</span>
                                  <span className="mk-caption text-mk-ink-400">{T("/d", "/يوم", ar)}</span>
                                </div>
                                <div className={`text-end ${picked ? "text-mk-blue-500" : "text-mk-ink-900"}`}>
                                  <div className="mk-caption text-mk-ink-400 leading-none">{days} {T("days total", "أيام إجمالي", ar)}</div>
                                  <div className="mk-caption mt-1">{(c.dailyRate * days).toLocaleString()} {T("SAR", "ريال", ar)}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* LIST VIEW */}
                {viewMode === "list" && (
                  <div className="flex flex-col gap-2">
                    {availCars
                      .map((c) => {
                        const picked = c.plate === pickedPlate;
                        const odometer = ({ 1: 43210, 3: 28640, 4: 61880, 5: 55320, 7: 38190, 8: 72400 } as Record<number, number>)[c.id] ?? 45000;
                        const statusColor: Record<string, string> = {
                          available: "var(--color-mk-mint-600)", rented: "var(--color-mk-blue-500)", overdue: "var(--color-mk-danger)",
                          maintenance: "var(--color-mk-warning)", reserved: "var(--color-mk-violet-500)",
                        };
                        return (
                          <div
                            key={c.plate}
                            role="button"
                            tabIndex={0}
                            onClick={() => setPickedPlate(c.plate)}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPickedPlate(c.plate); } }}
                            className={`mk-option ${picked ? "mk-option--on" : ""} flex items-center gap-3 p-3 rounded-lg text-start w-full border-0 cursor-pointer`}
                          >
                            <div className={`w-12 h-12 rounded-md overflow-hidden flex items-center justify-center text-[24px] shrink-0 ${picked ? "bg-mk-blue-500/10" : "bg-white"}`}>
                              {(() => {
                                const images = CAR_IMAGES[c.model];
                                if (images && images.length > 0) {
                                  const src = images[0];
                                  const isFlipped = src.endsWith("#flipped");
                                  const cleanSrc = isFlipped ? src.replace("#flipped", "") : src;
                                  return (
                                    <img
                                      src={cleanSrc}
                                      alt={c.model}
                                      className="w-full h-full object-cover"
                                      style={{ transform: isFlipped ? "scaleX(-1)" : "none" }}
                                    />
                                  );
                                }
                                return <VehicleTypeIcon type={c.type} size={20} className="w-full h-full" />;
                              })()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="mk-body text-mk-ink-900">{c.make} {c.model} · {c.year}</div>
                                <span className="mk-overline px-2 py-1 rounded-full"
                                  style={{ background: `${statusColor[c.status] ?? "var(--color-mk-ink-400)"}18`, color: statusColor[c.status] ?? "var(--color-mk-ink-400)" }}>
                                  {c.status === "available" ? T("Free", "متاحة", ar) :
                                    c.status === "rented" ? T("Rented", "مؤجرة", ar) :
                                      c.status === "overdue" ? T("Overdue", "متأخرة", ar) :
                                        T(c.status, c.status, ar)}
                                </span>
                                {(c.status === "rented" || c.status === "overdue") && (
                                  <span className="mk-overline text-mk-ink-500">
                                    · {getAvailabilityText(c.status, c.id, ar)}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                <span className="mk-caption text-mk-ink-500">{c.plate}</span>
                                <span className="mk-caption text-mk-ink-500">{T(c.type, c.type === "Sedan" ? "سيدان" : c.type === "SUV" ? "دفع رباعي" : c.type === "Luxury" ? "فاخرة" : "اقتصادية", ar)}</span>
                                <span className="flex items-center gap-1 mk-caption text-mk-ink-500">
                                  <Gauge size={11} />{odometer.toLocaleString()} {T("km", "كم", ar)}
                                </span>
                                <span className="mk-caption text-mk-ink-500">
                                  {c.kmCap === "Unlimited" ? T("Unlimited km", "كم غير محدود", ar) : `${c.kmCap} ${T("km/day", "كم/يوم", ar)}`}
                                </span>
                              </div>
                            </div>
                            <div className="text-end shrink-0">
                              <div className={`${picked ? "text-mk-blue-500" : "text-mk-ink-900"} flex items-center justify-end gap-1`}>
                                <RiyalSymbol size={16} />
                                <span className="mk-body">{c.dailyRate}</span>
                                <span className="mk-caption text-mk-ink-400">{T("/d", "/يوم", ar)}</span>
                              </div>
                              <div className="mk-caption mt-1 text-mk-ink-400">
                                {T("est.", "تقدير", ar)} {(c.dailyRate * days).toLocaleString()} {T("SAR", "ريال", ar)}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPickedPlate(c.plate);
                                setShowConditionModal(true);
                              }}
                              className="flex items-center gap-1 px-3 py-2 rounded-full mk-overline bg-mk-ink-100 hover:bg-mk-ink-200 text-mk-ink-600 border-0 cursor-pointer shrink-0"
                            >
                              <Gauge size={12} />
                              {T("Condition", "حالة السيارة", ar)}
                            </button>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${picked ? "bg-mk-blue-500 border-0" : "bg-transparent border-2 border-mk-ink-200"}`}>
                              {picked && <Check size={11} className="text-white" />}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* MAP VIEW */}
                {viewMode === "map" && (
                  <div className="relative w-full rounded-md overflow-hidden border border-mk-ink-100 h-[420px]">
                    <div ref={carMapRef} className="w-full h-full" />
                    {!carMapsLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center bg-mk-ink-50 text-mk-ink-500 mk-label">
                        {T("Loading Google Maps...", "جاري تحميل خريطة جوجل...", ar)}
                      </div>
                    )}

                    {/* Hint */}
                    <div className="absolute top-3 start-3 end-3 flex justify-center pointer-events-none z-10">
                      <span className="mk-caption px-4 py-2 rounded-full bg-white/90 text-mk-ink-600 shadow-sm border border-mk-ink-100">
                        {T("Click any car pin to select it", "اضغط على أي سيارة لاختيارها", ar)}
                      </span>
                    </div>

                    {/* Legend */}
                    <div className="absolute bottom-3 end-3 flex gap-3 mk-overline border border-mk-ink-200 px-3 py-2 rounded-sm bg-white/90 z-10 shadow-sm">
                      {(ar
                        ? [["var(--color-mk-mint-600)", "متاحة"], ["var(--color-mk-blue-500)", "مؤجرة"], ["var(--color-mk-danger)", "متأخر"], ["var(--color-mk-warning)", "صيانة"]]
                        : [["var(--color-mk-mint-600)", "Available"], ["var(--color-mk-blue-500)", "Rented"], ["var(--color-mk-danger)", "Overdue"], ["var(--color-mk-warning)", "Maintenance"]]
                      ).map(([c, l]) => (
                        <span key={l} className="flex items-center gap-2 text-mk-ink-700">
                          <span className="w-2 h-2 rounded-full inline-block" style={{ background: c }} />{l}
                        </span>
                      ))}
                    </div>

                    {/* Selected car chip */}
                    {car && (
                      <div className="absolute bottom-3 start-3 flex items-center gap-2 px-3 py-2 rounded-md bg-white/95 border border-mk-ink-100 shadow-sm z-10">
                        <VehicleTypeIcon type={car.type} size={16} className="w-7 h-7" />
                        <div>
                          <div className="mk-label text-mk-ink-900">{car.make} {car.model}</div>
                          <div className="mk-caption text-mk-ink-400">{car.plate}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowConditionModal(true)}
                          className="flex items-center gap-1 px-3 py-2 rounded-full mk-overline bg-mk-ink-100 hover:bg-mk-ink-200 text-mk-ink-600 border-0 cursor-pointer"
                        >
                          <Gauge size={12} />
                          {T("Condition", "حالة السيارة", ar)}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {availCars.length === 0 && viewMode !== "map" && (
                  <div className="text-center py-12 mk-label text-mk-ink-400">
                    {T("No matching vehicles", "لا توجد مركبات مطابقة", ar)}
                  </div>
                )}
              </div>

              {/* 2. VEHICLE CONDITION DRAWER — opens when a vehicle is clicked */}
              {car && (
                <Drawer open={showConditionModal} onClose={() => setShowConditionModal(false)}>
                  <div className="flex flex-col h-full max-w-[480px] overflow-y-auto">
                    <DrawerHeader
                      title={T("Vehicle Condition & Status at Pickup", "حالة السيارة عند الاستلام", ar)}
                      sub={`${car.make} ${car.model} · ${car.plate}`}
                      onClose={() => setShowConditionModal(false)}
                      className="mb-4 pb-4 border-b border-mk-border"
                    />

                    {/* Damage Sketch / Vehicle Photos — toggle */}
                    <div className="flex flex-col gap-2 w-full">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="mk-caption text-mk-ink-600 flex-1">
                          {conditionView === "sketch"
                            ? T("Registered Damages Sketch (Read-only)", "مخطط الأضرار والخدوش المسجلة (عرض فقط)", ar)
                            : T("Vehicle Photos", "صور السيارة", ar)}
                        </div>
                        <Tabs
                          variant="tonal"
                          size="xs"
                          className="shrink-0"
                          value={conditionView}
                          onChange={(v) => setConditionView(v as "sketch" | "photos")}
                          items={[
                            { value: "sketch", label: T("Diagram", "المخطط", ar) },
                            { value: "photos", label: T("Photos", "الصور", ar) },
                          ]}
                        />
                      </div>
                      {conditionView === "sketch" ? (
                        <>
                          <p className="mk-overline text-mk-ink-500">
                            {T("Registered damages from the fleet system. Hover to view details.", "الخدوش والأضرار المسجلة مسبقاً من نظام الأسطول. مرر الفأرة لعرض التفاصيل.", ar)}
                          </p>
                          <div className="rounded-lg flex items-center justify-center w-full">
                            <SketchComponent value={sketchItems} onChange={setSketchItems} ar={ar} disabled={true} />
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="mk-overline text-mk-ink-500">
                            {T("Photos captured by the fleet team at the last inspection.", "صور التقطها فريق الأسطول في آخر فحص للمركبة.", ar)}
                          </p>
                          <div className="rounded-lg overflow-hidden bg-mk-ink-50">
                            <CarCardCarousel images={CAR_IMAGES[car.model] || []} />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Key inspection metrics */}
                    <div className="mt-6 pt-6 border-t border-mk-ink-100">
                      <div className="mk-body text-mk-ink-900 mb-4">
                        {T("Key Inspection Metrics", "المؤشرات الرئيسية للفحص", ar)}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-center gap-3 rounded-lg px-4 py-3 bg-mk-ink-50 select-none">
                          <div className="w-9 h-9 rounded-md bg-mk-blue-500/10 text-mk-blue-500 flex items-center justify-center shrink-0">
                            <Gauge size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="mk-caption text-mk-ink-500 truncate">{T("Current Odometer", "العداد الحالي", ar)}</div>
                            <div className="mk-label text-mk-ink-900 mt-1 truncate">
                              {(rentStatus.odometerReading ?? 0).toLocaleString()} {T("km", "كم", ar)}
                            </div>
                          </div>
                        </div>
                        {(() => {
                          const fuelTypeObj = TAJEER_LOOKUPS.fuelTypes.find(f => f.code === rentStatus.fuelTypeCode) ?? TAJEER_LOOKUPS.fuelTypes[0];
                          const fuelPct: Record<number, number> = { 1: 100, 2: 75, 3: 50, 4: 25, 5: 0 };
                          const pct = fuelPct[rentStatus.availableFuel ?? 1] ?? 100;
                          return (
                            <div className="flex items-center gap-3 rounded-lg px-4 py-3 bg-mk-ink-50 select-none">
                              <div className="w-9 h-9 rounded-md bg-mk-blue-500/10 text-mk-blue-500 flex items-center justify-center shrink-0">
                                <Fuel size={18} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="mk-caption text-mk-ink-500 truncate">{T("Current Fuel", "الوقود الحالي", ar)}</div>
                                <div className="mk-label text-mk-ink-900 mt-1 truncate">{pct}% · {ar ? fuelTypeObj.ar : fuelTypeObj.en}</div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Endurance amount */}
                        <div className="flex items-center gap-3 rounded-lg px-4 py-3 bg-mk-ink-50 select-none">
                          <div className="w-9 h-9 rounded-md bg-mk-blue-500/10 text-mk-blue-500 flex items-center justify-center shrink-0">
                            <ShieldCheck size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="mk-caption text-mk-ink-500 truncate">{T("Insurance Endurance", "مبلغ التحمل للحوادث", ar)}</div>
                            <div className="mk-label text-mk-ink-900 mt-1 truncate">{(rentStatus.enduranceAmount ?? 0).toLocaleString()} {T("SAR", "ريال", ar)}</div>
                          </div>
                        </div>

                        {/* Oil change info */}
                        <div className="flex items-center gap-3 rounded-lg px-4 py-3 bg-mk-ink-50 select-none">
                          <div className="w-9 h-9 rounded-md bg-mk-blue-500/10 text-mk-blue-500 flex items-center justify-center shrink-0">
                            <Wrench size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="mk-caption text-mk-ink-500 truncate">{T("Next Oil Change", "صيانة تغيير الزيت القادمة", ar)}</div>
                            <div className="mk-label text-mk-ink-900 mt-1 truncate">
                              {rentStatus.oilType || "5W-30"} · {rentStatus.oilChangeKmDistance ?? 5000} {T("km", "كم", ar)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Checklist & Current Status */}
                    <div className="mt-6 pt-6 border-t border-mk-ink-100">
                      <div className="grid grid-cols-1 sm:grid-cols-2 ">
                        {[
                          { key: "ac", labelAr: "حالة التكييف", labelEn: "A/C", opts: TAJEER_LOOKUPS.acOptions, Icon: Wind },
                          { key: "radioStereo", labelAr: "حالة الراديو/المسجل", labelEn: "Radio/Stereo", opts: TAJEER_LOOKUPS.acOptions, Icon: Music },
                          { key: "screen", labelAr: "حالة الشاشة الداخلية", labelEn: "Screen", opts: TAJEER_LOOKUPS.acOptions, Icon: Monitor },
                          { key: "speedometer", labelAr: "حالة عداد السرعة", labelEn: "Speedometer", opts: TAJEER_LOOKUPS.workingOptions, Icon: Gauge },
                          { key: "keys", labelAr: "حالة المفتاح", labelEn: "Keys", opts: TAJEER_LOOKUPS.workingOptions, Icon: KeyRound },
                          { key: "carSeats", labelAr: "المقاعد", labelEn: "Car Seats", opts: TAJEER_LOOKUPS.seatsOptions, Icon: Armchair },
                          { key: "tires", labelAr: "حالة العجلات", labelEn: "Tires", opts: TAJEER_LOOKUPS.tiresOptions, Icon: Disc },
                          { key: "spareTire", labelAr: "حالة العجلة الاحتياطية", labelEn: "Spare Tire", opts: TAJEER_LOOKUPS.tiresOptions, Icon: Disc },
                          { key: "spareTireTools", labelAr: "معدات الكفر الاحتياطية", labelEn: "Spare Tire Tools", opts: TAJEER_LOOKUPS.availableOptions, Icon: Wrench },
                          { key: "firstAidKit", labelAr: "حالة حقيبة الاسعافات الأولية", labelEn: "First Aid Kit", opts: TAJEER_LOOKUPS.availableOptions, Icon: Heart },
                          { key: "fireExtinguisher", labelAr: "توفر طفاية الحريق", labelEn: "Fire Extinguisher", opts: TAJEER_LOOKUPS.availableOptions, Icon: Flame },
                          { key: "safetyTriangle", labelAr: "توفر المثلث العاكس", labelEn: "Safety Triangle", opts: TAJEER_LOOKUPS.availableOptions, Icon: Triangle },
                        ].map(({ key, labelAr, labelEn, opts, Icon }) => {
                          const codeValue = (rentStatus as Record<string, number>)[key] ?? opts[0].code;
                          const statusObj = (opts as readonly any[]).find((o) => o.code === codeValue) ?? opts[0];
                          const statusText = ar ? statusObj.ar : statusObj.en;

                          return (
                            <div key={key} className="flex items-center gap-3 p-3 select-none">
                              <div className="w-9 h-9 rounded-md bg-mk-blue-500/10 text-mk-blue-500 flex items-center justify-center shrink-0">
                                <Icon size={18} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="mk-caption text-mk-ink-500 truncate">{ar ? labelAr : labelEn}</div>
                                <div className="mk-caption text-mk-ink-900 mt-1 truncate">
                                  {statusText}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </Drawer>
              )}

              {/* Prompt removed in favor of sticky footer */}
            </div>
          </div>
        )}

        {/* ── Step 1: Add-ons & Handover ──────────────────────────── */}
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 items-start gap-4">

            {/* ── COLUMN 1: HANDOVER METHODS & BRANCHES ── */}
            <div className="flex flex-col gap-4">

              {/* Vehicle, handover branches & km/delay limits — merged */}
              <div className="mk-surface rounded-xl p-6">
                <div className="mk-h4 mb-6 text-mk-ink-900">{T("Vehicle & Handover", "معلومات السيارة والتسليم", ar)}</div>

                {/* Selected vehicle */}
                {car && (
                  <div className="flex items-center gap-3 pb-6 border-b border-mk-ink-100">
                    <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-mk-ink-50 flex items-center justify-center text-[24px]">
                      {(() => {
                        const images = CAR_IMAGES[car.model];
                        if (images && images.length > 0) {
                          const src = images[0];
                          const isFlipped = src.endsWith("#flipped");
                          const cleanSrc = isFlipped ? src.replace("#flipped", "") : src;
                          return (
                            <img
                              src={cleanSrc}
                              alt={car.model}
                              className="w-full h-full object-cover"
                              style={{ transform: isFlipped ? "scaleX(-1)" : "none" }}
                            />
                          );
                        }
                        return <VehicleTypeIcon type={car.type} size={22} className="w-full h-full" />;
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="mk-overline uppercase text-mk-ink-400 mk-tracking-wide">{T("Selected vehicle", "المركبة المختارة", ar)}</div>
                      <div className="mk-body text-mk-ink-900 truncate">{car.make} {car.model} · {car.year}</div>
                      <div className="mk-caption text-mk-ink-500">{car.plate} · {car.location || T("Riyadh — Olaya", "الرياض — العليا", ar)}</div>
                    </div>
                    <div className="text-end shrink-0">
                      <div className="flex items-center gap-1 justify-end">
                        <RiyalSymbol size={14} className="text-mk-ink-900" />
                        <span className="mk-body-sm text-mk-ink-900">{car.dailyRate}</span>
                        <span className="mk-overline text-mk-ink-400">{T("/d", "/يوم", ar)}</span>
                      </div>
                      <div className="mk-overline text-mk-ink-400">{days} {T("days · ", "أيام · ", ar)}{(car.dailyRate * days).toLocaleString()} {T("SAR", "ريال", ar)}</div>
                    </div>
                  </div>
                )}

                {/* Handover branches */}
                <div className="pt-6">
                  <div className="mk-label text-mk-ink-900">{T("Handover Branches", "فروع الاستلام والتسليم", ar)}</div>
                  <p className="mk-caption mt-1 mb-3 text-mk-ink-500">
                    {T("Set from the selected vehicle's current branch — change only for an inter-branch handover.", "محددة تلقائياً حسب فرع المركبة المختارة — غيّرها فقط في حال التسليم بين الفروع.", ar)}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="mk-overline mb-2 block text-mk-ink-600">{T("Pickup Branch", "فرع الاستلام", ar)}</label>
                      <Select
                        value={receiveBranchId}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setReceiveBranchId(val);
                          setWorkingBranchId(val);
                        }}
                      >
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {ar ? b.nameAr : b.nameEn}
                          </option>
                        ))}
                      </Select>
                      <button
                        type="button"
                        onClick={() => setAddons((s) => ({ ...s, delivery: !s.delivery }))}
                        className={`mt-2 flex items-center gap-2 w-full px-3 py-2 rounded-md mk-overline border cursor-pointer transition-all ${addons.delivery ? "bg-mk-blue-500/10 border-mk-blue-500/30 text-mk-blue-600" : "bg-white border-mk-ink-200 text-mk-ink-600"}`}
                      >
                        <span className={`w-4 h-4 rounded-xs border border-transparent flex items-center justify-center shrink-0 ${addons.delivery ? "bg-mk-blue-500" : "bg-mk-ink-100"}`}>
                          {addons.delivery && <Check size={10} className="text-white" />}
                        </span>
                        {T("Deliver by agent (add-on)", "تسليم عبر مندوب (خدمة إضافية)", ar)}
                      </button>
                    </div>

                    <div>
                      <label className="mk-overline mb-2 block text-mk-ink-600">{T("Return Branch", "فرع التسليم", ar)}</label>
                      <Select
                        value={returnBranchId}
                        onChange={(e) => setReturnBranchId(Number(e.target.value))}
                      >
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {ar ? b.nameAr : b.nameEn}
                          </option>
                        ))}
                      </Select>
                      <button
                        type="button"
                        onClick={() => setAddons((s) => ({ ...s, return_agent: !s.return_agent }))}
                        className={`mt-2 flex items-center gap-2 w-full px-3 py-2 rounded-md mk-overline border cursor-pointer transition-all ${addons.return_agent ? "bg-mk-blue-500/10 border-mk-blue-500/30 text-mk-blue-600" : "bg-white border-mk-ink-200 text-mk-ink-600"}`}
                      >
                        <span className={`w-4 h-4 rounded-xs border border-transparent flex items-center justify-center shrink-0 ${addons.return_agent ? "bg-mk-blue-500" : "bg-mk-ink-100"}`}>
                          {addons.return_agent && <Check size={10} className="text-white" />}
                        </span>
                        {T("Pickup by agent (add-on)", "استلام عبر مندوب (خدمة إضافية)", ar)}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rental policy — office-selectable, auto-reflected on the contract */}
              <div className="mk-surface rounded-xl p-6">
                <div className="mk-h4 mb-6 text-mk-ink-900">{T("Rental policy", "سياسة التأجير", ar)}</div>

                {/* Comprehensive insurance — mandatory, included on every contract */}
                {ADD_ONS.filter(a => a.k === "insurance_comprehensive").map((a) => (
                  <div key={a.k} className="flex items-center gap-3 p-3 mb-4 rounded-lg bg-mk-blue-500/8 border border-mk-blue-500/20">
                    <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 bg-mk-blue-50">
                      <a.Icon size={16} className="text-mk-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="mk-label text-mk-ink-900">{ar ? a.nameAr : a.nameEn}</span>
                        <span className="mk-overline px-2 py-1 rounded-full bg-mk-blue-500/10 text-mk-blue-500 shrink-0">
                          {T("Included on every contract", "مُدرج في كل عقد", ar)}
                        </span>
                      </div>
                      <div className="mk-caption mt-1 text-mk-ink-500">
                        {T(
                          "Fully refunded after the vehicle is returned, with no dispute — as long as there's no damage or violation on the vehicle.",
                          "يُسترد المبلغ بالكامل بعد إرجاع المركبة دون أي نزاع، بشرط عدم وجود ضرر أو مخالفة على المركبة.",
                          ar
                        )}
                      </div>
                    </div>
                    <div className="text-end shrink-0">
                      <div className="mk-label text-mk-blue-500">{a.price} {T("SAR", "ريال", ar)}</div>
                      <div className="mk-overline text-mk-ink-400">{ar ? a.unitAr : a.unit}</div>
                    </div>
                  </div>
                ))}

                <div className="grid grid-cols-1 gap-4">
                  {[
                    { labelEn: "Contract extension mechanism", labelAr: "آلية تمديد العقد", value: extensionPolicy, onChange: setExtensionPolicy, options: RENTAL_POLICY_OPTIONS.extension },
                    { labelEn: "Early return policy", labelAr: "سياسة تسليم السيارة قبل الموعد", value: earlyReturnPolicy, onChange: setEarlyReturnPolicy, options: RENTAL_POLICY_OPTIONS.earlyReturn },
                    { labelEn: "Accident reporting policy", labelAr: "سياسة الإبلاغ عن حوادث", value: accidentReportPolicy, onChange: setAccidentReportPolicy, options: RENTAL_POLICY_OPTIONS.accidentReport },
                    { labelEn: "Fuel return policy", labelAr: "سياسة إعادة الوقود", value: fuelReturnPolicy, onChange: setFuelReturnPolicy, options: RENTAL_POLICY_OPTIONS.fuelReturn },
                    { labelEn: "Breakdown reporting policy", labelAr: "سياسة آلية الإبلاغ عن أعطال", value: breakdownReportPolicy, onChange: setBreakdownReportPolicy, options: RENTAL_POLICY_OPTIONS.breakdownReport },
                  ].map((f) => (
                    <div key={f.labelEn}>
                      <label className="mk-overline mb-2 block text-mk-ink-600">{T(f.labelEn, f.labelAr, ar)}</label>
                      <Select value={f.value} onChange={(e) => f.onChange(e.target.value)}>
                        {f.options.map((o) => (
                          <option key={o.key} value={o.key}>{ar ? o.ar : o.en}</option>
                        ))}
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ══ RIGHT COLUMN: Add-ons + Live Summary + Nav ════════════════════════ */}
            <div className="flex flex-col gap-4 sticky top-[18px]">

              {/* 1. ADDITIONAL SERVICES / ADD-ONS CARD */}
              <div className="mk-surface rounded-xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="mk-h4 flex-1 text-mk-ink-900">{T("Add-ons", "الخدمات الإضافية", ar)}</div>
                  <span className="mk-caption text-mk-ink-400">{T("Optional", "اختياري", ar)}</span>
                </div>
                <div className="flex flex-col gap-2">

                  {/* ── Essential services ── */}
                  <div className="mk-overline uppercase mb-1 text-mk-ink-400 mk-tracking-wide">
                    {T("Essential services", "خدمات أساسية", ar)}
                  </div>

                  {/* ── Extra driver ── */}
                  <div className="flex flex-col gap-2 w-full">
                    <button
                      type="button"
                      onClick={() => {
                        const next = !addons.driver;
                        setAddons((s) => ({ ...s, driver: next }));
                        if (next) {
                          if (isHourlyRental) {
                            setDriverFarePerHour((p) => p || 10);
                          } else {
                            setDriverFarePerDay((p) => p || 45);
                          }
                        } else {
                          setSelectedExtraDriver(null);
                          setExtraDriverIdNumber("");
                          setExtraDriverBirthDate("");
                          setExtraDriverAddress("");
                          setExtraDriverQuery("");
                        }
                      }}
                      className={`mk-option ${addons.driver ? "mk-option--on" : ""} flex items-center gap-3 p-3 rounded-lg text-start w-full cursor-pointer border-0`}
                    >
                      <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 bg-mk-blue-50">
                        <UserPlus size={16} className="text-mk-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="mk-label text-mk-ink-900">{T("Extra driver", "سائق إضافي", ar)}</div>
                        <div className="mk-caption text-mk-ink-400">{T("A second driver authorized on the contract", "سائق ثانٍ مفوّض على العقد", ar)}</div>
                      </div>
                      <div className="text-end shrink-0">
                        <div className={`mk-label ${addons.driver ? "text-mk-blue-500" : "text-mk-ink-900"}`}>
                          {isHourlyRental ? (driverFarePerHour || 10) : (driverFarePerDay || 45)} {T("SAR", "ريال", ar)}
                        </div>
                        <div className="mk-overline text-mk-ink-400">{isHourlyRental ? T("/ hour", "/ ساعة", ar) : T("/ day", "/ يوم", ar)}</div>
                      </div>
                      <div className={`w-5 h-5 rounded-xs flex items-center justify-center shrink-0 ${addons.driver ? "bg-mk-blue-500 border-0" : "bg-white border border-mk-ink-200"}`}>
                        {addons.driver && <Check size={11} className="text-white" />}
                      </div>
                    </button>

                    {addons.driver && (
                      <div className="p-4 rounded-lg bg-mk-ink-50 border border-mk-ink-200 flex flex-col gap-3">
                        <label className="mk-overline text-mk-ink-600">{T("Select from drivers list:", "اختر من قائمة السائقين:", ar)}</label>

                        {selectedExtraDriver ? (
                          <div className="flex items-center gap-3 p-3 rounded-lg mk-row-bg border border-mk-blue-500/30">
                            <Avatar name={selectedExtraDriver.name} size="sm" />
                            <div className="flex-1 min-w-0">
                              <div className="mk-caption text-mk-ink-900">{ar ? selectedExtraDriver.nameAr : selectedExtraDriver.name}</div>
                              <div className="mk-overline text-mk-ink-500">
                                ★ {selectedExtraDriver.rating ?? "—"} · {selectedExtraDriver.idType} · {selectedExtraDriver.nationalId}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedExtraDriver(null);
                                setExtraDriverIdNumber("");
                                setExtraDriverBirthDate("");
                                setExtraDriverAddress("");
                                setExtraDriverQuery("");
                              }}
                              className="mk-overline text-mk-ink-500 bg-mk-ink-50 px-2 py-1 rounded-full border-0 cursor-pointer"
                            >
                              {T("Change", "تغيير", ar)}
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <div className="flex items-center gap-2 rounded-full px-3 h-10 mk-row-bg border border-mk-ink-200">
                              <Search size={13} className="shrink-0 text-mk-ink-500" />
                              <input
                                className="flex-1 bg-transparent outline-none mk-caption text-mk-ink-900"
                                placeholder={T("Search by name, phone, or ID…", "بحث بالاسم، الهاتف، أو الهوية…", ar)}
                                value={extraDriverQuery}
                                onChange={(e) => setExtraDriverQuery(e.target.value)}
                              />
                            </div>
                            <div
                              className="absolute top-full inset-x-0 mt-2 z-20 flex flex-col gap-2 max-h-[220px] overflow-y-auto p-2 rounded-lg border border-mk-ink-200 shadow-lg bg-mk-bg-elevated"
                            >
                              {MOCK_DRIVERS
                                .filter((d) => {
                                  const q = extraDriverQuery.trim().toLowerCase();
                                  if (!q) return true;
                                  return (
                                    d.name.toLowerCase().includes(q) ||
                                    d.nameAr.includes(q) ||
                                    d.phone.includes(q) ||
                                    d.nationalId.includes(q)
                                  );
                                })
                                .slice(0, 5)
                                .map((d) => (
                                  <button
                                    key={d.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedExtraDriver(d);
                                      setExtraDriverIdType(d.idTypeCode as TajeerIdType);
                                      setExtraDriverIdNumber(d.nationalId);
                                      setExtraDriverBirthDate(d.birthDate || (d.hijriBirthDate ? String(d.hijriBirthDate) : ""));
                                      setExtraDriverAddress(d.personAddress || "Riyadh");
                                    }}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-mk-ink-100 hover:bg-mk-ink-200 border border-mk-ink-200 text-start w-full cursor-pointer transition-colors"
                                  >
                                    <Avatar name={d.name} size="sm" />
                                    <div className="flex-1 min-w-0">
                                      <div className="mk-caption text-mk-ink-900">{ar ? d.nameAr : d.name}</div>
                                      <div className="mk-overline text-mk-ink-500">{d.idType} · {d.nationalId}</div>
                                    </div>
                                    <span className="mk-overline text-mk-warning-700 shrink-0">★ {d.rating ?? "—"}</span>
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {ADD_ONS.filter(a => ["child", "internet", "delivery", "navigation", "special_needs"].includes(a.k)).map((a) => {
                    const on = addons[a.k as keyof typeof addons];
                    return (
                      <div key={a.k} className="flex flex-col gap-2 w-full">
                        <button
                          type="button"
                          onClick={() => setAddons((s) => ({ ...s, [a.k]: !s[a.k as keyof typeof s] }))}
                          className={`mk-option ${on ? "mk-option--on" : ""} flex items-center gap-3 p-3 rounded-lg text-start w-full cursor-pointer border-0`}
                        >
                          <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 bg-mk-blue-50">
                            <a.Icon size={16} className="text-mk-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="mk-label text-mk-ink-900">{ar ? a.nameAr : a.nameEn}</div>
                            <div className="mk-caption text-mk-ink-400">{ar ? a.descAr : a.descEn}</div>
                          </div>
                          <div className="text-end shrink-0">
                            <div className={`mk-label ${on ? "text-mk-blue-500" : "text-mk-ink-900"}`}>{a.price} {T("SAR", "ريال", ar)}</div>
                            <div className="mk-overline text-mk-ink-400">{ar ? a.unitAr : a.unit}</div>
                          </div>
                          <div className={`w-5 h-5 rounded-xs flex items-center justify-center shrink-0 ${on ? "bg-mk-blue-500 border-0" : "bg-white border border-mk-ink-200"}`}>
                            {on && <Check size={11} className="text-white" />}
                          </div>
                        </button>
                      </div>
                    );
                  })}

                  {/* Unlimited km toggle */}
                  {(() => {
                    const a = ADD_ONS.find(x => x.k === "unlimited_km")!;
                    const on = addons.unlimited_km;
                    return (
                      <div>
                        <button
                          type="button"
                          onClick={() => setAddons((s) => ({ ...s, unlimited_km: !s.unlimited_km }))}
                          className={`mk-option ${on ? "mk-option--on" : ""} flex items-center gap-3 p-3 rounded-lg text-start w-full border-0`}
                        >
                          <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 bg-mk-blue-50">
                            <Gauge size={16} className="text-mk-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="mk-label text-mk-ink-900">{ar ? a.nameAr : a.nameEn}</div>
                            <div className="mk-caption text-mk-ink-400">{ar ? a.descAr : a.descEn}</div>
                          </div>
                          <div className="text-end shrink-0">
                            <div className={`mk-label ${on ? "text-mk-blue-500" : "text-mk-ink-900"}`}>{a.price} {T("SAR", "ريال", ar)}</div>
                            <div className="mk-overline text-mk-ink-400">{ar ? a.unitAr : a.unit}</div>
                          </div>
                          <div className={`w-5 h-5 rounded-xs flex items-center justify-center shrink-0 ${on ? "bg-mk-blue-500 border-0" : "bg-white border border-mk-ink-200"}`}>
                            {on && <Check size={11} className="text-white" />}
                          </div>
                        </button>
                      </div>
                    );
                  })()}

                  {/* ── Other services ── */}
                  <div className="mk-overline uppercase mt-3 mb-1 text-mk-ink-400 mk-tracking-wide">
                    {T("Other services", "خدمات أخرى", ar)}
                  </div>
                  {ADD_ONS.filter(a => ["fuel", "return_agent"].includes(a.k)).map((a) => {
                    const on = addons[a.k as keyof typeof addons];
                    return (
                      <div key={a.k} className="flex flex-col gap-2 w-full">
                        <button
                          type="button"
                          onClick={() => setAddons((s) => ({ ...s, [a.k]: !s[a.k as keyof typeof s] }))}
                          className={`mk-option ${on ? "mk-option--on" : ""} flex items-center gap-3 p-3 rounded-lg text-start w-full cursor-pointer border-0`}
                        >
                          <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 bg-mk-blue-50">
                            <a.Icon size={16} className="text-mk-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="mk-label text-mk-ink-900">{ar ? a.nameAr : a.nameEn}</div>
                            <div className="mk-caption text-mk-ink-400">{ar ? a.descAr : a.descEn}</div>
                          </div>
                          <div className="text-end shrink-0">
                            <div className={`mk-label ${on ? "text-mk-blue-500" : "text-mk-ink-900"}`}>{a.price} {T("SAR", "ريال", ar)}</div>
                            <div className="mk-overline text-mk-ink-400">{ar ? a.unitAr : a.unit}</div>
                          </div>
                          <div className={`w-5 h-5 rounded-xs flex items-center justify-center shrink-0 ${on ? "bg-mk-blue-500 border-0" : "bg-white border border-mk-ink-200"}`}>
                            {on && <Check size={11} className="text-white" />}
                          </div>
                        </button>
                      </div>
                    );
                  })}

                </div>
              </div>

              {/* 2. LIVE SUMMARY CARD — compact total only */}
              <div className="mk-surface rounded-xl p-5">
                <div className="flex items-center gap-2 mb-6">
                  <div className="mk-h4 flex-1 text-mk-ink-900">{T("Live summary", "ملخص مباشر", ar)}</div>
                  <Badge variant="warning" dot>MK-2428</Badge>
                </div>
                <div className="flex justify-between items-center px-4 py-4 rounded-xl border-2 border-mk-blue-500/20 bg-mk-blue-50">
                  <span className="mk-body text-mk-ink-700">{T("Estimated Total", "الإجمالي التقديري", ar)}</span>
                  <span className="mk-h3 text-mk-blue-500">{total.toLocaleString()} <span className="mk-label">{T("SAR", "ريال", ar)}</span></span>
                </div>
                <p className="mk-overline text-mk-ink-400 mt-2 text-center">{T("Full price breakdown is confirmed at the payment step", "تفاصيل الأسعار كاملة في خطوة الدفع", ar)}</p>
              </div>

              {/* Navigation buttons moved to sticky footer */}
            </div>
          </div>
        )}


        {/* ── Step 2: Verification & Payment ────────────────────── */}
        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Right column (RTL): Pricing details — its own card, editable per contract nature */}
            <div className="flex flex-col gap-4">
              <div className="mk-surface rounded-xl p-6">
                <div className="mk-h4 mb-6 text-mk-ink-900">{T("Pricing Details", "تفاصيل أسعار العقد", ar)}</div>

                {/* Rates registered on the vehicle profile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-6 border-b border-mk-ink-100">
                  {(contractTypeCode === 1 || contractTypeCode === 3) && (
                    <PriceInput
                      label={T("Day rate (SAR)", "سعر اليوم", ar)}
                      value={rentDayCost || car.dailyRate}
                      defaultValue={car.dailyRate}
                      onChange={setRentDayCost}
                      ar={ar}
                    />
                  )}
                  {(contractTypeCode === 2 || contractTypeCode === 4) && (
                    <PriceInput
                      label={T("Hour rate (SAR)", "سعر الساعة", ar)}
                      value={rentHourCost || Math.round(car.dailyRate / 8)}
                      defaultValue={Math.round(car.dailyRate / 8)}
                      onChange={setRentHourCost}
                      ar={ar}
                    />
                  )}
                  <div>
                    <label className="mk-overline mb-2 block text-mk-ink-600">{T("Extra km cost (SAR/km)", "سعر الكم الزائد", ar)}</label>
                    <PriceInputField
                      value={extraKmCost}
                      defaultValue={car.extraKmCost}
                      onChange={setExtraKmCost}
                      ar={ar}
                    />
                    {(unlimitedKm || addons.unlimited_km) && (
                      <p className="flex items-center gap-1 mk-caption text-mk-ink-400 mt-1">
                        <Info size={12} className="shrink-0" />
                        {T("Not applied with unlimited km", "لا يُطبَّق مع الكيلومتر المفتوح", ar)}
                      </p>
                    )}
                  </div>

                  {contractTypeCode === 4 && driverFarePerHour > 0 && (
                    <div className="flex flex-col">
                      <span className="mk-overline text-mk-ink-400 uppercase">{T("Total driver fare", "إجمالي أجرة السائق", ar)}</span>
                      <span className="mk-label text-mk-blue-600 mt-1">
                        {(driverFarePerHour * days).toLocaleString()} {T("SAR", "ريال", ar)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Additional contract-specific costs — editable per contract nature */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6">
                  <PriceInput
                    label={T("Full fuel cost (SAR)", "تكلفة الوقود الممتلئ", ar)}
                    value={fullFuelCost}
                    defaultValue={car.fullFuelCost}
                    onChange={setFullFuelCost}
                    ar={ar}
                  />
                  {contractTypeCode === 3 && (
                    <div>
                      <label className="mk-overline mb-2 block text-mk-ink-600">
                        {T("Total driver fare (SAR)", "إجمالي أجرة السائق", ar)}
                      </label>
                      <PriceInputField
                        value={(driverFarePerDay || SYSTEM_DRIVER_FARE_PER_DAY) * days}
                        defaultValue={SYSTEM_DRIVER_FARE_PER_DAY * days}
                        onChange={(v) => setDriverFarePerDay(Math.round(v / days))}
                        ar={ar}
                      />
                    </div>
                  )}
                  {contractTypeCode === 4 && (
                    <PriceInput
                      label={T("Driver fare / hour (SAR)", "أجرة السائق/ساعة", ar)}
                      value={driverFarePerHour || SYSTEM_DRIVER_FARE_PER_HOUR}
                      defaultValue={SYSTEM_DRIVER_FARE_PER_HOUR}
                      onChange={setDriverFarePerHour}
                      ar={ar}
                    />
                  )}
                  {receiveBranchId !== returnBranchId && (
                    <PriceInput
                      label={T("Delivery to another city (SAR)", "قيمة تسليم السيارة إلى مدن أخرى", ar)}
                      value={vehicleTransferCost || SYSTEM_VEHICLE_TRANSFER_COST}
                      defaultValue={SYSTEM_VEHICLE_TRANSFER_COST}
                      onChange={setVehicleTransferCost}
                      ar={ar}
                    />
                  )}
                  <PriceInput
                    label={T("International authorization value (SAR)", "قيمة التفويض الدولي", ar)}
                    value={internationalAuthorizationCost}
                    defaultValue={0}
                    onChange={setInternationalAuthorizationCost}
                    ar={ar}
                  />
                  {extendedCoverageId && (
                    <PriceInput
                      label={T("Additional coverage cost (SAR)", "تكلفة التغطية الإضافية", ar)}
                      value={additionalCoverageCost || SYSTEM_COVERAGE_BASE_COST}
                      defaultValue={SYSTEM_COVERAGE_BASE_COST}
                      onChange={setAdditionalCoverageCost}
                      ar={ar}
                      helpText={T(`Max = day rate × 2`, "الحد الأقصى = سعر اليوم × ٢", ar)}
                    />
                  )}
                </div>

                {/* Discount — registered by the owner in Pricing settings; read-only here */}
                <div className="pt-6 mt-6 border-t border-mk-ink-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="mk-label text-mk-ink-900">{T("Discount", "نسبة الخصم", ar)}</div>
                    <span className="flex items-center gap-1 mk-overline text-mk-ink-400">
                      <Lock size={11} />{T("Set in Pricing settings", "تُحدَّد من إعدادات الأسعار", ar)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 h-10 px-3 rounded-md bg-mk-ink-50 border border-mk-ink-100">
                    <Tag size={13} className="text-mk-ink-400" />
                    <span className="mk-caption text-mk-ink-400">
                      {discountAmount > 0
                        ? (discountType === "percent"
                          ? T(`${discountPercent}% discount applied`, `تم تطبيق خصم ${discountPercent}٪`, ar)
                          : T(`${discountAmount.toLocaleString()} SAR discount applied`, `تم تطبيق خصم ${discountAmount.toLocaleString()} ريال`, ar))
                        : T("No discount", "لا يوجد خصم", ar)}
                    </span>
                  </div>
                </div>

                {/* Km & delay limits */}
                <div className="pt-6 mt-6 border-t border-mk-ink-100">
                  <div className="mk-label mb-3 text-mk-ink-900">{T("Km & delay limits", "حدود الكيلومترات والتأخير", ar)}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <PriceInput
                      label={T("Free km / day", "عدد الكيلومترات المجانية المسموحة باليوم", ar)}
                      min={0}
                      value={allowedKmPerDay}
                      defaultValue={typeof car.kmCap === "number" ? car.kmCap : 200}
                      onChange={setAllowedKmPerDay}
                      ar={ar}
                    />
                    <PriceInput
                      label={T("Allowed late hours", "عدد ساعات التأخير المسموحة", ar)}
                      min={0}
                      value={allowedLateHours}
                      defaultValue={1}
                      onChange={setAllowedLateHours}
                      ar={ar}
                    />
                    <PriceInput
                      label={T("Late fee / hour (SAR)", "سعر ساعة التأخير", ar)}
                      min={0}
                      value={lateFeePerHour}
                      defaultValue={car.lateFeePerHour}
                      onChange={setLateFeePerHour}
                      ar={ar}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Left column (RTL): Payment card + Price breakdown card */}
            <div className="flex flex-col gap-4">

              {/* Payment type & method */}
              <div className="mk-surface rounded-xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="mk-h4 flex-1 text-mk-ink-900">{T("Payment", "الدفع", ar)}</div>
                  <Badge variant="warning" dot>{T("Awaiting capture", "بانتظار الخصم", ar)}</Badge>
                </div>

                <div className="mk-overline mb-1 text-mk-ink-600">
                  {T("Payment type", "نوع الدفع", ar)}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                  {([
                    { k: "full", titleEn: "Full payment", titleAr: "الدفع الكامل", descEn: "Total captured now", descAr: "يُخصم الإجمالي كاملاً الآن", Icon: CreditCard },
                    { k: "advance", titleEn: "Advance payment", titleAr: "دفع مقدم", descEn: "50% now · rest on return", descAr: "٥٠٪ الآن · الباقي عند الإرجاع", Icon: Wallet },
                  ] as const).map((pt) => {
                    const on = payType === pt.k;
                    return (
                      <button key={pt.k} onClick={() => setPayType(pt.k)}
                        className={`mk-option ${on ? "mk-option--on" : "mk-surface"} flex flex-col items-center p-3 rounded-lg text-center`}>
                        <div className={`w-9 h-9 rounded-md mb-2 flex items-center justify-center shrink-0 ${on ? "bg-white" : "bg-mk-blue-50"}`}>
                          <pt.Icon size={16} className="text-mk-blue-500" />
                        </div>
                        <div className={`mk-caption ${on ? "text-mk-blue-500" : "text-mk-ink-900"}`}>{ar ? pt.titleAr : pt.titleEn}</div>
                        <div className="mk-overline mt-1 text-mk-ink-400">{ar ? pt.descAr : pt.descEn}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="mk-caption mb-3 text-mk-ink-600">
                  {T("Payment method", "طريقة الدفع", ar)}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { k: "cash", l: T("Cash", "نقدي", ar), sub: T("Pay cash at counter", "دفع نقدي عند المكتب", ar), Icon: Banknote },
                    { k: "pos", l: T("Point of Sale (POS)", "نقطة بيع", ar), sub: T("Pay via card machine", "دفع عبر جهاز الشبكة", ar), Icon: CreditCard },
                  ].map((p) => {
                    const on = payMethod === p.k;
                    return (
                      <button key={p.k} onClick={() => setPayMethod(p.k)}
                        className={`mk-option ${on ? "mk-option--on" : "mk-surface"} flex flex-col items-center p-3 rounded-lg text-center`}>
                        <div className={`w-9 h-9 rounded-md mb-2 flex items-center justify-center shrink-0 ${on ? "bg-white" : "bg-mk-blue-50"}`}>
                          <p.Icon size={16} className="text-mk-blue-500" />
                        </div>
                        <div className={`mk-caption ${on ? "text-mk-blue-500" : "text-mk-ink-900"}`}>{p.l}</div>
                        <div className="mk-overline mt-1 text-mk-ink-400">{p.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price breakdown */}
              <div className="mk-surface rounded-xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="mk-h4 text-mk-ink-900 uppercase tracking-wider">{T("Price Breakdown", "تفاصيل الأسعار", ar)}</div>
                </div>
                <div className="flex flex-col gap-2.5 mk-caption">
                  <div className="flex justify-between">
                    <span>
                      {(contractTypeCode === 2 || contractTypeCode === 4)
                        ? T(`Base rent (${totalHours} hours × ${rentHourCost} SAR)`, `الإيجار الأساسي (${totalHours} ساعات × ${rentHourCost} ريال)`, ar)
                        : T(`Base rent (${days} days × ${rentDayCost || car.dailyRate} SAR)`, `الإيجار الأساسي (${days} أيام × ${rentDayCost || car.dailyRate} ريال)`, ar)}
                    </span>
                    <strong>{base.toLocaleString()} {T("SAR", "ريال", ar)}</strong>
                  </div>
                  {Object.entries(addons).filter(([k, v]) => v && ADD_ONS.some(a => a.k === k)).map(([k]) => {
                    const ao = ADD_ONS.find((a) => a.k === k)!;
                    return (
                      <div key={k} className="flex justify-between text-mk-ink-600">
                        <span>+ {ar ? ao.nameAr : ao.nameEn}</span>
                        <span>{addonPrices[k as keyof typeof addonPrices].toLocaleString()} {T("SAR", "ريال", ar)}</span>
                      </div>
                    );
                  })}
                  {extraDriverFare > 0 && (
                    <div className="flex justify-between text-mk-ink-600">
                      <span>+ {T("Extra driver fare", "أجرة السائق الإضافي", ar)}</span>
                      <span>{extraDriverFare.toLocaleString()} {T("SAR", "ريال", ar)}</span>
                    </div>
                  )}
                  {transferFare > 0 && (
                    <div className="flex justify-between text-mk-ink-600">
                      <span>+ {T("Delivery to another city", "تسليم السيارة إلى مدن أخرى", ar)}</span>
                      <span>{transferFare.toLocaleString()} {T("SAR", "ريال", ar)}</span>
                    </div>
                  )}
                  {authorizationFare > 0 && (
                    <div className="flex justify-between text-mk-ink-600">
                      <span>+ {T("International authorization", "التفويض الدولي", ar)}</span>
                      <span>{authorizationFare.toLocaleString()} {T("SAR", "ريال", ar)}</span>
                    </div>
                  )}
                  {coverageFare > 0 && (
                    <div className="flex justify-between text-mk-ink-600">
                      <span>+ {T("Additional coverage", "التغطية الإضافية", ar)}</span>
                      <span>{coverageFare.toLocaleString()} {T("SAR", "ريال", ar)}</span>
                    </div>
                  )}
                  {fullFuelCost > 0 && (
                    <div className="flex justify-between text-mk-ink-600">
                      <span>+ {T("Full fuel cost", "تكلفة الوقود الممتلئ", ar)}</span>
                      <span>{fullFuelCost.toLocaleString()} {T("SAR", "ريال", ar)}</span>
                    </div>
                  )}
                  {discountAmount > 0 && (
                    <div className="flex justify-between border-t border-mk-ink-100 pt-2.5 mt-1 text-mk-blue-600">
                      <span>{discountType === "percent"
                        ? T(`Discount (${discountPercent}%)`, `الخصم (${discountPercent}٪)`, ar)
                        : T("Discount (fixed amount)", "الخصم (مبلغ ثابت)", ar)}</span>
                      <span>-{discountAmount.toLocaleString()} {T("SAR", "ريال", ar)}</span>
                    </div>
                  )}
                  <div className={`flex justify-between pt-2.5 mt-1 text-mk-ink-900 mk-label ${discountAmount > 0 ? "" : "border-t border-mk-ink-100"}`}>
                    <span>{T("Subtotal (before VAT)", "المجموع قبل الضريبة", ar)}</span>
                    <span>{subtotal.toLocaleString()} {T("SAR", "ريال", ar)}</span>
                  </div>
                  <div className="flex justify-between text-mk-ink-500 mk-overline">
                    <span>{T("VAT · 15%", "ضريبة قيمة مضافة · ١٥٪", ar)}</span>
                    <span>{vat.toLocaleString()} {T("SAR", "ريال", ar)}</span>
                  </div>
                  <div className="flex justify-between items-center text-mk-blue-600 border-t border-mk-ink-100 pt-3 mt-1">
                    <span className="mk-h4">{T("Total", "الإجمالي", ar)}</span>
                    <span className="mk-h4">{total.toLocaleString()} {T("SAR", "ريال", ar)}</span>
                  </div>
                  {payType === "advance" && (
                    <div className="border-t border-dashed border-mk-ink-100 pt-2.5 mt-1 flex flex-col gap-2">
                      <div className="flex justify-between">
                        <span className="mk-label text-mk-blue-500">{T("Advance now (50%)", "مقدّم الآن (٥٠٪)", ar)}</span>
                        <strong className="text-mk-blue-500">{advanceAmount.toLocaleString()} {T("SAR", "ريال", ar)}</strong>
                      </div>
                      <div className="flex justify-between text-mk-ink-400 mk-overline">
                        <span>{T("Remaining on return", "الباقي عند الإرجاع", ar)}</span>
                        <span>{remaining.toLocaleString()} {T("SAR", "ريال", ar)}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-mk-ink-100">
                  <span className="mk-caption text-mk-ink-500 flex-1">+ {T("Refundable security deposit", "تأمين قابل للاسترداد", ar)}</span>
                  <strong className="mk-caption text-mk-ink-700">1,500 {T("SAR", "ريال", ar)}</strong>
                </div>
              </div>
            </div>

            {/* Navigation buttons moved to sticky footer */}
          </div>
        )}

        {/* ── Step 3: Issue via Tajeer ───────────────────────────── */}
        {step === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">


            {/* Left: Tajeer submission flow */}
            <div className="flex flex-col gap-4">

              {/* IDLE: detailed review + issue button */}
              {contractStep === "idle" && (
                <div className="mk-surface rounded-xl p-6 ">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="mk-h4 flex-1 text-mk-ink-900">{T("Review & Issue Contract", "مراجعة وإصدار العقد", ar)}</div>
                    <Button variant="tonal" size="sm" onClick={() => setShowContractPreview(true)}>
                      <FileText size={14} />
                      {T("Contract preview", "معاينة العقد", ar)}
                    </Button>
                  </div>

                  <div className="p-3 rounded-lg bg-mk-warning-100 border border-mk-warning/30 mk-caption text-mk-warning-700 mb-6">
                    ⚠️ {T("Once issued, contract data cannot be modified. The renter will receive a signature link.", "بعد الإصدار، لا يمكن تعديل بيانات العقد. سيصل للمستأجر رابط التوقيع.", ar)}
                  </div>

                  {/* Completed steps recap */}


                  <div className="flex flex-col gap-4 mk-label-muted text-mk-ink-700 mb-5">

                    {/* ═══ Step 1 info: Customer, Dates & Vehicle ═══ */}

                    {/* Renter (Client) + Authorized driver */}
                    <div className="flex flex-col gap-3 pb-3 border-b border-mk-ink-100">
                      <div className="mk-overline text-mk-ink-400 uppercase">{T("Renter (Client)", "المستأجر (العميل)", ar)}</div>
                      <div>
                        <div className="mk-label text-mk-ink-900">{ar ? selectedCustomer.nameAr : selectedCustomer.name}</div>
                        <div className="mk-overline text-mk-ink-500">{selectedCustomer.phone}</div>
                      </div>

                      {/* ID type — set from the customer's registered record; drives the required field set below */}
                      <div className="flex flex-col">
                        <span className="mk-overline text-mk-ink-400 uppercase">
                          {T("Beneficiary ID type", "نوع هوية المستفيد", ar)}
                        </span>
                        <span className="mk-label-muted text-mk-ink-700 mt-1">
                          {ar
                            ? TAJEER_LOOKUPS.idTypes.find(t => t.code === idTypeCode)?.ar
                            : TAJEER_LOOKUPS.idTypes.find(t => t.code === idTypeCode)?.en}
                        </span>
                      </div>

                      {/* Dynamic renter identity fields — depends on idTypeCode.
                          Display-only here: this is the final review before issuing,
                          so renter data is shown as plain info, matching the rest of the contract details. */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {getRenterIdentityFields().map((f) => (
                          <div key={f.key} className={`flex flex-col ${f.type === "hijri" ? "col-span-2" : ""}`}>
                            <span className="mk-overline text-mk-ink-400 uppercase">
                              {T(f.labelEn, f.labelAr, ar)}{f.required && <span className="text-mk-danger"> *</span>}
                            </span>
                            <span className="mk-label-muted text-mk-ink-700 mt-1">
                              {f.value.trim() || "—"}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Authorized driver — read-only summary; set in the same step as the renter */}
                      <div className="flex flex-col pt-3 border-t border-mk-ink-100">
                        <span className="mk-overline text-mk-ink-400 uppercase">{T("Authorized driver", "المفوض", ar)}</span>
                        <span className="mk-label-muted text-mk-ink-700 mt-1">
                          {isRenterDriver ? T("Same as beneficiary", "نفس المستفيد", ar) : (
                            <>
                              {authDriverIdNumber || "—"}
                              {authDriverMobile && ` · ${authDriverMobile}`}
                              {authDriverBirthDate && ` · ${authDriverBirthDate}`}
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Rental period */}
                    <div className="pb-3 border-b border-mk-ink-100">
                      <div className="mk-overline text-mk-ink-400 uppercase">{T("Rental Period", "فترة التأجير", ar)}</div>
                      <div className="mk-label text-mk-ink-900 mt-1">{days} {T("Days", "أيام", ar)}</div>
                      <div className="mk-overline text-mk-ink-500">
                        {pickupDate.toLocaleString(ar ? "ar-SA" : "en-US", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        {" → "}
                        {returnDate.toLocaleString(ar ? "ar-SA" : "en-US", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>

                    {/* Vehicle details */}
                    <div className="p-3 rounded-lg bg-mk-ink-50 flex items-center gap-3">
                      <div className="w-12 h-12 rounded overflow-hidden shrink-0 bg-white border border-mk-ink-200 flex items-center justify-center">
                        {CAR_IMAGES[car.model]?.[0] ? (
                          <img src={CAR_IMAGES[car.model][0]} alt={car.model} className="w-full h-full object-cover" />
                        ) : (
                          <VehicleTypeIcon type={car.type} size={20} className="w-full h-full" />
                        )}
                      </div>
                      <div>
                        <div className="mk-label text-mk-ink-900">{car.make} {car.model} ({car.year})</div>
                        <div className="mk-overline text-mk-ink-500">
                          {T("Plate: ", "رقم اللوحة: ", ar)} {car.plate} · {T("Odometer: ", "العداد: ", ar)}{" "}
                          {rentStatus.odometerReading || (({ 1: 43210, 3: 28640, 4: 61880, 5: 55320, 7: 38190, 8: 72400 } as Record<number, number>)[car.id] ?? 45000)} km
                        </div>
                      </div>
                    </div>

                    {/* Vehicle data — sourced from the vehicle's own file (Fleet), not editable here */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-mk-ink-100">
                      <div className="flex flex-col">
                        <span className="mk-overline text-mk-ink-400 uppercase">{T("Registration type", "نوع التسجيل", ar)}</span>
                        <span className="mk-label-muted text-mk-ink-700 mt-1">{car.registrationTypeCode === 3 ? T("Private transport", "نقل خاص", ar) : T("Private", "خصوصي", ar)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="mk-overline text-mk-ink-400 uppercase">{T("Operation card", "بطاقة التشغيل", ar)}</span>
                        <span className="mk-label-muted text-mk-ink-700 mt-1">{car.operationCardNumber || "—"}{car.operationCardExpiryDate ? ` (${T("exp. ", "تنتهي ", ar)}${car.operationCardExpiryDate})` : ""}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="mk-overline text-mk-ink-400 uppercase">{T("Next oil change due", "موعد استدعاء الزيت القادم", ar)}</span>
                        <span className="mk-label-muted text-mk-ink-700 mt-1">{rentStatus.oilChangeDate || "—"}</span>
                      </div>
                      {car.otherNotes && (
                        <div className="flex flex-col col-span-2">
                          <span className="mk-overline text-mk-ink-400 uppercase">{T("Other", "أخرى", ar)}</span>
                          <span className="mk-label-muted text-mk-ink-700 mt-1">{car.otherNotes}</span>
                        </div>
                      )}
                    </div>

                    {/* Vehicle condition & inspection at pickup */}
                    <div className="pb-3 border-b border-mk-ink-100">
                      <div className="mk-overline text-mk-ink-400 uppercase mb-2">{T("Inspection & Vehicle Condition at Pickup", "بيانات الفحص وحالة المركبة عند الاستلام", ar)}</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {[
                          { k: T("Fuel", "الوقود", ar), v: TAJEER_LOOKUPS.availableFuelOptions.find(o => o.code === rentStatus.availableFuel)?.[ar ? "ar" : "en"] ?? "—" },
                          { k: T("Odometer", "العداد الحالي", ar), v: `${(rentStatus.odometerReading ?? 0).toLocaleString()} ${T("km", "كم", ar)}` },
                          { k: T("Oil", "الزيت", ar), v: rentStatus.oilType || "5W-30" },
                          { k: T("A/C", "حالة التكييف", ar), v: TAJEER_LOOKUPS.acOptions.find(o => o.code === rentStatus.ac)?.[ar ? "ar" : "en"] ?? "—" },
                          { k: T("Radio/Stereo", "حالة الراديو/المسجل", ar), v: TAJEER_LOOKUPS.acOptions.find(o => o.code === rentStatus.radioStereo)?.[ar ? "ar" : "en"] ?? "—" },
                          { k: T("Screen", "حالة الشاشة الداخلية", ar), v: TAJEER_LOOKUPS.acOptions.find(o => o.code === rentStatus.screen)?.[ar ? "ar" : "en"] ?? "—" },
                          { k: T("Speedometer", "حالة عداد السرعة", ar), v: TAJEER_LOOKUPS.workingOptions.find(o => o.code === rentStatus.speedometer)?.[ar ? "ar" : "en"] ?? "—" },
                          { k: T("Keys", "حالة المفتاح", ar), v: TAJEER_LOOKUPS.workingOptions.find(o => o.code === rentStatus.keys)?.[ar ? "ar" : "en"] ?? "—" },
                          { k: T("Seats", "المقاعد", ar), v: TAJEER_LOOKUPS.seatsOptions.find(o => o.code === rentStatus.carSeats)?.[ar ? "ar" : "en"] ?? "—" },
                          { k: T("Tires", "حالة العجلات", ar), v: TAJEER_LOOKUPS.tiresOptions.find(o => o.code === rentStatus.tires)?.[ar ? "ar" : "en"] ?? "—" },
                          { k: T("Spare Tire", "حالة العجلة الاحتياطية", ar), v: TAJEER_LOOKUPS.tiresOptions.find(o => o.code === rentStatus.spareTire)?.[ar ? "ar" : "en"] ?? "—" },
                          { k: T("Spare Tire Tools", "معدات الكفر الاحتياطية", ar), v: TAJEER_LOOKUPS.availableOptions.find(o => o.code === rentStatus.spareTireTools)?.[ar ? "ar" : "en"] ?? "—" },
                          { k: T("Safety Triangle", "توفر المثلث العاكس", ar), v: TAJEER_LOOKUPS.availableOptions.find(o => o.code === rentStatus.safetyTriangle)?.[ar ? "ar" : "en"] ?? "—" },
                          { k: T("Fire Extinguisher", "توفر طفاية الحريق", ar), v: TAJEER_LOOKUPS.availableOptions.find(o => o.code === rentStatus.fireExtinguisher)?.[ar ? "ar" : "en"] ?? "—" },
                          { k: T("First Aid Kit", "حالة حقيبة الاسعافات الأولية", ar), v: TAJEER_LOOKUPS.availableOptions.find(o => o.code === rentStatus.firstAidKit)?.[ar ? "ar" : "en"] ?? "—" },
                          { k: T("Oil change @", "تغيير الزيت عند", ar), v: `${(rentStatus.oilChangeKmDistance ?? 5000).toLocaleString()} ${T("km", "كم", ar)}` },
                        ].map(({ k, v }) => (
                          <div key={k} className="flex flex-col">
                            <span className="mk-overline text-mk-ink-400 uppercase">{k}</span>
                            <span className="mk-label-muted text-mk-ink-700 mt-1">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ═══ Step 2 info: Add-ons & Handover ═══ */}

                    {/* Handover branches */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-mk-ink-100">
                      <div className="flex flex-col">
                        <span className="mk-overline text-mk-ink-400 uppercase">{T("Pickup Branch", "فرع الاستلام", ar)}</span>
                        <span className="mk-label-muted text-mk-ink-700 mt-1">
                          {ar ? (branches.find(b => b.id === receiveBranchId)?.nameAr || T("Main Branch", "الفرع الرئيسي", ar)) : (branches.find(b => b.id === receiveBranchId)?.nameEn || "Main Branch")}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="mk-overline text-mk-ink-400 uppercase">{T("Return Branch", "فرع التسليم", ar)}</span>
                        <span className="mk-label-muted text-mk-ink-700 mt-1">
                          {ar ? (branches.find(b => b.id === returnBranchId)?.nameAr || T("Main Branch", "الفرع الرئيسي", ar)) : (branches.find(b => b.id === returnBranchId)?.nameEn || "Main Branch")}
                        </span>
                      </div>
                    </div>

                    {/* Contract specifics & add-ons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* 1. Contract Type + Nested Extra Driver (swapped to first/right position) */}
                      {(() => {
                        const displayedContractTypeCode = (addons.driver && selectedExtraDriver) ? contractTypeCode : (contractTypeCode === 3 ? 1 : contractTypeCode === 4 ? 2 : contractTypeCode);
                        const contractTypeObj = TAJEER_LOOKUPS.contractTypes.find(t => t.code === displayedContractTypeCode);
                        return (
                          <div className="flex flex-col">
                            <span className="mk-overline text-mk-ink-400 uppercase">{T("Contract type", "نوع العقد", ar)}</span>
                            <span className="mk-label text-mk-ink-900 mt-1">
                              {ar ? contractTypeObj?.ar : contractTypeObj?.en}
                            </span>
                            {addons.driver && selectedExtraDriver && (
                              <div className="mt-2 flex flex-col gap-1 mk-overline text-mk-ink-500">
                                <div className="mk-label text-mk-ink-900 mb-1">{ar ? selectedExtraDriver.nameAr : selectedExtraDriver.name}</div>
                                <div><strong>{T("Phone: ", "رقم الجوال: ", ar)}</strong>{selectedExtraDriver.phone}</div>
                                <div><strong>{T("ID Number: ", "رقم الهوية: ", ar)}</strong>{extraDriverIdNumber}</div>
                                <div className="mt-1 text-mk-blue-600">
                                  <strong>{T("License: ", "الرخصة: ", ar)}</strong>{selectedExtraDriver.licenseNumber || "—"}
                                  {selectedExtraDriver.licenseExpiryDate && ` (${T("valid to ", "تنتهي في ", ar)}${selectedExtraDriver.licenseExpiryDate})`}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* 2. Allowed KM (swapped to second/left position) */}
                      {(() => {
                        const displayedContractTypeCode = (addons.driver && selectedExtraDriver) ? contractTypeCode : (contractTypeCode === 3 ? 1 : contractTypeCode === 4 ? 2 : contractTypeCode);
                        return (
                          <div className="flex flex-col">
                            <span className="mk-overline text-mk-ink-400 uppercase">{T("Allowed km", "الكم المسموح", ar)}</span>
                            <span className="mk-label-muted text-mk-ink-700 mt-1">
                              {(unlimitedKm || addons.unlimited_km) ? T("Unlimited", "غير محدود", ar) : `${displayedContractTypeCode % 2 === 1 ? allowedKmPerDay : allowedKmPerHour} ${T("km", "كم", ar)}`}
                            </span>
                          </div>
                        );
                      })()}

                      {/* 3. Extra driver — only when not already shown nested under Contract type above */}
                      {!(addons.driver && selectedExtraDriver) && (
                        <div className="flex flex-col">
                          <span className="mk-overline text-mk-ink-400 uppercase">{T("Extra driver", "سائق إضافي", ar)}</span>
                          <span className="mk-label-muted text-mk-ink-700 mt-1">
                            {!addons.driver ? (
                              T("None", "لا يوجد", ar)
                            ) : (
                              <>
                                {extraDriverIdNumber || "—"}
                                {extraDriverBirthDate && ` · ${extraDriverBirthDate}`}
                              </>
                            )}
                          </span>
                        </div>
                      )}

                      {/* 4. Other specifics mapped in a loop */}
                      {(() => {
                        const rentPolicyObj = rentPolicies.find((p) => p.id === rentPolicyId);
                        return [
                          { k: T("Rent policy", "سياسة الإيجار", ar), v: rentPolicyObj ? (ar ? rentPolicyObj.nameAr : rentPolicyObj.nameEn) : `#${rentPolicyId}` },
                          { k: T("Late hours grace", "ساعات التأخير", ar), v: `${allowedLateHours} ${T("hr", "ساعة", ar)}` },
                          { k: T("Late fee / hour", "سعر ساعة التأخير", ar), v: `${lateFeePerHour} ${T("SAR", "ريال", ar)}` },
                          { k: T("Damages marked", "أضرار مسجلة", ar), v: sketchItems.length > 0 ? `${sketchItems.length} ${T("items", "عناصر", ar)}` : T("None", "لا شيء", ar) },
                          { k: T("Endurance amount", "مبلغ التحمل", ar), v: `${rentStatus.enduranceAmount ?? 0} ${T("SAR", "ريال", ar)}` },
                        ].map(({ k, v }) => (
                          <div key={k} className="flex flex-col">
                            <span className="mk-overline text-mk-ink-400 uppercase">{k}</span>
                            <span className="mk-label-muted text-mk-ink-700 mt-1">{v}</span>
                          </div>
                        ));
                      })()}
                    </div>

                  </div>
                  {/* Issue button moved to sticky footer */}
                </div>
              )}

              {/* SAVING */}
              {contractStep === "saving" && (
                <div className="mk-surface rounded-xl p-6 text-center py-16">
                  <div className="mk-display-lg animate-spin inline-block mb-4">⟳</div>
                  <div className="mk-h4 mb-2 text-mk-ink-900">{T("Saving contract…", "جاري حفظ العقد…", ar)}</div>
                  <p className="mk-label text-mk-ink-500">{T("Issuing contract. Please wait…", "يتم إصدار العقد، يرجى الانتظار…", ar)}</p>
                </div>
              )}

              {/* VERIFICATION & SIGNATURE — merged into one screen */}
              {contractStep === "pending_signature" && tajeerResponse && (
                <div className="mk-surface rounded-xl p-6">
                  <div className="text-center mb-5">
                    <div className="mk-display-lg mb-2">{otpDigits.every(d => d !== "") ? "⏳" : "🪪"}</div>
                    <div className="mk-h4 mb-1 text-mk-ink-900">
                      {otpDigits.every(d => d !== "")
                        ? T("Awaiting renter signature", "بانتظار توقيع المستأجر", ar)
                        : T("Verify renter identity", "التحقق من هوية المستأجر", ar)}
                    </div>
                    <p className="mk-caption text-mk-ink-500">{T("Contract no.", "رقم العقد", ar)}: <strong className="font-mono text-mk-blue-500">{tajeerResponse.contractNumber}</strong></p>
                  </div>

                  {!otpDigits.every(d => d !== "") ? (
                    /* Step 1 of this screen: identity verification via Tajeer OTP */
                    <div className="rounded-xl p-5 mb-5 bg-mk-blue-surface/40 border border-mk-blue-500/10 flex flex-col items-center justify-center text-center">
                      <div className="w-10 h-10 rounded-full border-4 border-mk-blue-500 border-t-transparent animate-spin mb-3"></div>
                      <div className="mk-label text-mk-ink-800 mb-1">
                        {T("Waiting for customer verification...", "بانتظار إتمام التحقق من طرف العميل...", ar)}
                      </div>
                      <div className="mk-overline text-mk-ink-500 mb-4">
                        {T("An OTP was sent via the Tajeer platform to the registered phone number:", "تم إرسال رمز التحقق (OTP) عبر منصة تأجير إلى رقم الجوال المسجل:", ar)}
                        <div className="font-mono mt-1 text-mk-blue-600 mk-caption">{selectedCustomer.phone}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOtpDigits(["1", "2", "3", "4", "5", "6"])}
                        className="px-4 py-2 rounded-full bg-mk-blue-500 text-white border-0 mk-caption cursor-pointer hover:bg-mk-blue-600 transition-colors shadow-sm"
                      >
                        {T("Simulate Customer Approval", "محاكاة موافقة العميل", ar)}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-4 px-1">
                        <span className="text-mk-mint-600 mk-body">✓</span>
                        <span className="mk-caption text-mk-mint-600">{T("Identity verified via the Tajeer platform", "تم التحقق من الهوية عبر منصة تأجير", ar)}</span>
                      </div>

                      {/* Step 2 of this screen: signature, outside the platform */}
                      <div className="rounded-xl p-5 mb-5 bg-mk-blue-surface/40 border border-mk-blue-500/10 flex flex-col items-center justify-center text-center">
                        <div className="w-10 h-10 rounded-full border-4 border-mk-blue-500 border-t-transparent animate-spin mb-3"></div>
                        <div className="mk-label text-mk-ink-800 mb-1">
                          {T("Waiting for the renter to sign outside the platform...", "بانتظار توقيع المستأجر خارج المنصة...", ar)}
                        </div>
                        <div className="mk-overline text-mk-ink-500 mb-4 flex flex-col gap-1 items-center justify-center">
                          <div>{T("A signature link was sent to:", "تم إرسال رابط التوقيع إلى:", ar)}</div>
                          <strong dir="ltr" className="text-mk-blue-600 font-mono mk-caption">{selectedCustomer.phone}</strong>
                        </div>

                        {/* Check signature button moved to sticky footer */}
                      </div>

                      <div className="rounded-xl p-3 mk-caption text-mk-warning-700 mb-4 bg-mk-warning-100 border border-mk-warning/30 text-start">
                        ⚠️ {T("Contract will be auto-cancelled after 12 hours if not signed.", "سيتم إلغاء العقد تلقائياً بعد ١٢ ساعة إذا لم يُوقَّع.", ar)}
                      </div>
                    </>
                  )}

                  {/* Payment summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                    {[
                      { k: T("Paid", "المدفوع", ar), v: tajeerResponse.totalPaymentDetails.paid },
                      { k: T("Remaining", "المتبقي", ar), v: tajeerResponse.totalPaymentDetails.remaining },
                      { k: T("Total", "الإجمالي", ar), v: tajeerResponse.totalPaymentDetails.total },
                    ].map(({ k, v }) => (
                      <div key={k} className="text-center p-3 rounded-lg bg-mk-ink-50">
                        <div className="mk-overline text-mk-ink-500 mb-1">{k}</div>
                        <div className="mk-body-sm text-mk-ink-900">{v.toLocaleString()} <span className="mk-overline text-mk-ink-400">{T("SAR", "ريال", ar)}</span></div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 justify-center">
                    <Button variant="outline" onClick={handleCancelContract} className="border-mk-danger/30 text-mk-danger">
                      {T("Cancel contract", "إلغاء العقد", ar)}
                    </Button>
                  </div>
                </div>
              )}

              {/* ISSUED */}
              {contractStep === "issued" && tajeerResponse && (
                <div className="mk-surface rounded-xl p-6 text-center">
                  <div className="mk-display-lg mb-3">✅</div>
                  <div className="mk-h4 mb-2 text-mk-ink-900">{T("Contract issued successfully!", "تم إبرام العقد بنجاح!", ar)}</div>
                  <p className="mk-label text-mk-ink-500 mb-2">{T("Contract no.", "رقم العقد", ar)}: <strong className="font-mono text-mk-blue-500 mk-body">{tajeerResponse.contractNumber}</strong></p>
                  <p className="mk-caption text-mk-ink-400 mb-6">{T("The contract is now active on the system.", "العقد الآن نشط على النظام.", ar)}</p>
                  <div className="flex flex-col gap-2">
                    <Button variant="primary" className="shadow-[var(--shadow-glow-blue)]">
                      <Printer size={14} />
                      {T("Print full contract", "طباعة العقد كامل", ar)}
                    </Button>
                    <Button variant="outline">
                      <FileText size={14} />
                      {T("Print summary (QR)", "طباعة الملخص (QR)", ar)}
                    </Button>
                    <Button variant="outline">
                      {T("View in contracts list", "عرض في قائمة العقود", ar)}
                    </Button>
                  </div>
                </div>
              )}

              {/* ERROR */}
              {contractStep === "error" && (
                <div className="mk-surface rounded-xl p-6 text-center">
                  <div className="mk-display-lg mb-3">❌</div>
                  <div className="mk-h4 mb-2 text-mk-ink-900">{T("An error occurred", "حدث خطأ", ar)}</div>
                  <p className="mk-label text-mk-danger-700 mb-5 px-4 py-3 rounded-lg bg-mk-danger-100">{tajeerError}</p>
                  {/* Try again moved to sticky footer */}
                </div>
              )}

              {/* Back button moved to sticky footer */}
            </div>

            {/* Delivery actions */}
            <div className="flex flex-col gap-4">
              {/* Financial breakdown — beside the review column */}
              <div className="mk-surface rounded-xl p-6">
                <div className="mk-h4 mb-6 text-mk-ink-900">{T("Pricing Breakdown", "تفصيل الحساب المالي", ar)}</div>
                <div className="flex flex-col gap-2.5 mk-caption">
                  <div className="flex justify-between">
                    <span>{T(`Base Rent (${days} days)`, `الإيجار الأساسي (${days} أيام)`, ar)}</span>
                    <strong>{base.toLocaleString()} {T("SAR", "ريال", ar)}</strong>
                  </div>
                  {Object.entries(addons).filter(([k, v]) => v && ADD_ONS.some(a => a.k === k)).map(([k]) => {
                    const ao = ADD_ONS.find((a) => a.k === k)!;
                    return (
                      <div key={k} className="flex justify-between text-mk-ink-600">
                        <span>+ {ar ? ao.nameAr : ao.nameEn}</span>
                        <span>{addonPrices[k as keyof typeof addonPrices].toLocaleString()} {T("SAR", "ريال", ar)}</span>
                      </div>
                    );
                  })}
                  {extraDriverFare > 0 && (
                    <div className="flex justify-between text-mk-ink-600">
                      <span>+ {T("Extra driver fare", "أجرة السائق الإضافي", ar)}</span>
                      <span>{extraDriverFare.toLocaleString()} {T("SAR", "ريال", ar)}</span>
                    </div>
                  )}
                  {transferFare > 0 && (
                    <div className="flex justify-between text-mk-ink-600">
                      <span>+ {T("Delivery to another city", "تسليم السيارة إلى مدن أخرى", ar)}</span>
                      <span>{transferFare.toLocaleString()} {T("SAR", "ريال", ar)}</span>
                    </div>
                  )}
                  {authorizationFare > 0 && (
                    <div className="flex justify-between text-mk-ink-600">
                      <span>+ {T("International authorization", "التفويض الدولي", ar)}</span>
                      <span>{authorizationFare.toLocaleString()} {T("SAR", "ريال", ar)}</span>
                    </div>
                  )}
                  {coverageFare > 0 && (
                    <div className="flex justify-between text-mk-ink-600">
                      <span>+ {T("Additional coverage", "التغطية الإضافية", ar)}</span>
                      <span>{coverageFare.toLocaleString()} {T("SAR", "ريال", ar)}</span>
                    </div>
                  )}
                  {fullFuelCost > 0 && (
                    <div className="flex justify-between text-mk-ink-600">
                      <span>+ {T("Full fuel cost", "تكلفة الوقود الممتلئ", ar)}</span>
                      <span>{fullFuelCost.toLocaleString()} {T("SAR", "ريال", ar)}</span>
                    </div>
                  )}
                  {discountAmount > 0 && (
                    <div className="flex justify-between border-t border-mk-ink-100 pt-2.5 mt-1 text-mk-blue-600">
                      <span>{discountType === "percent"
                        ? T(`Discount (${discountPercent}%)`, `الخصم (${discountPercent}٪)`, ar)
                        : T("Discount (fixed amount)", "الخصم (مبلغ ثابت)", ar)}</span>
                      <span>-{discountAmount.toLocaleString()} {T("SAR", "ريال", ar)}</span>
                    </div>
                  )}
                  <div className={`flex justify-between pt-2.5 mt-1 text-mk-ink-900 mk-label ${discountAmount > 0 ? "" : "border-t border-mk-ink-100"}`}>
                    <span>{T("Subtotal", "المجموع الفرعي", ar)}</span>
                    <span>{subtotal.toLocaleString()} {T("SAR", "ريال", ar)}</span>
                  </div>
                  <div className="flex justify-between text-mk-ink-500 mk-overline">
                    <span>{T("VAT 15%", "الضريبة ١٥٪", ar)}</span>
                    <span>{vat.toLocaleString()} {T("SAR", "ريال", ar)}</span>
                  </div>
                  <div className="flex justify-between items-center text-mk-blue-600 border-t border-mk-ink-100 pt-3 mt-1">
                    <span className="mk-h4">{T("Total Contract Value", "القيمة الإجمالية للعقد", ar)}</span>
                    <span className="mk-h4">{total.toLocaleString()} {T("SAR", "ريال", ar)}</span>
                  </div>
                </div>
              </div>

              {/* Payment confirmed */}
              <div className="rounded-xl p-5 flex items-center gap-3 bg-mk-mint-600/6 border border-mk-mint-600/25">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-mk-mint-600/15">
                  <Check size={18} className="text-mk-mint-600" />
                </div>
                <div>
                  <div className="mk-body-sm text-mk-mint-600">{T("Payment captured", "تم خصم الدفعة", ar)}</div>
                  <div className="mk-caption mt-1 text-mk-mint-600 opacity-70">
                    {total.toLocaleString()}{" "}
                    {payMethod === "cash"
                      ? T("SAR via Cash", "ريال نقداً", ar)
                      : T("SAR via POS · txn ZRT-8842", "ريال عبر نقطة البيع · العملية ZRT-8842", ar)}
                  </div>
                </div>
              </div>

              {/* Key handover tip */}
              {contractStep === "issued" && (
                <div className="rounded-xl p-5 bg-mk-midnight text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <KeyRound size={16} className="text-white/70" />
                    <strong className="mk-label">{T("Next: hand over keys", "التالي: تسليم المفاتيح", ar)}</strong>
                  </div>
                  <p className="mk-label text-white/70 leading-relaxed m-0">
                    {T("Once issued and signed, escort the customer to slot B-04 and complete the in-person key handover.",
                      "بعد الإصدار والتوقيع، رافق العميل إلى الموقف ب-٠٤ وأكمل تسليم المفاتيح وجهاً لوجه.", ar)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Contract preview overlay modal ───────────────────── */}
        <Modal
          open={showContractPreview}
          onClose={() => setShowContractPreview(false)}
          variant="centered"
          size="5xl"
          title={T("Contract preview", "معاينة العقد", ar)}
          headerActions={
            <div className="flex items-center gap-3">
              <span className="mk-caption text-mk-ink-400">
                {tajeerResponse?.contractNumber ?? T("Draft", "مسودة", ar)} · {T("Tajeer Format", "تنسيق تاجير", ar)}
              </span>
              <Button size="sm" variant="primary" onClick={() => window.print()}>
                <Printer size={13} /> {ar ? "طباعة" : "Print"}
              </Button>
            </div>
          }
        >
          <div className="p-6 bg-mk-bg-muted flex justify-center">
            <ContractPreview
              ar={ar}
              selectedCustomer={selectedCustomer}
              car={car}
              idTypeCode={idTypeCode}
              newIdNumber={newIdNumber}
              renterIdExpiry={renterIdExpiry}
              renterLicenseNumber={renterLicenseNumber}
              renterLicenseExpiry={renterLicenseExpiry}
              renterBirthDate={renterBirthDate}
              renterHijriBirth={renterHijriBirth}
              renterIdCopyNumber={renterIdCopyNumber}
              renterAddress={renterAddress}
              renterNationalityCode={renterNationalityCode}
              renterEmail={renterEmail}
              renterPassport={renterPassport}
              renterLicenseIssuePlace={renterLicenseIssuePlace}
              renterBorderNumber={renterBorderNumber}
              contractTypeCode={contractTypeCode}
              contractStartDate={pickupDate.toISOString()}
              contractEndDate={returnDate.toISOString()}
              days={days}
              rentDayCost={rentDayCost}
              rentHourCost={rentHourCost}
              extraKmCost={extraKmCost}
              allowedKmPerDay={allowedKmPerDay}
              allowedKmPerHour={allowedKmPerHour}
              allowedLateHours={allowedLateHours}
              lateFeePerHour={lateFeePerHour}
              unlimitedKm={unlimitedKm || addons.unlimited_km}
              base={base}
              subtotal={subtotal}
              vat={vat}
              total={total}
              advanceAmount={advanceAmount}
              remaining={remaining}
              payType={payType}
              addons={addons}
              addonPrices={addonPrices}
              ADD_ONS={ADD_ONS}
              rentStatus={rentStatus}
              sketchItems={sketchItems}
              receiveBranchId={receiveBranchId}
              returnBranchId={returnBranchId}
              workingBranchId={workingBranchId}
              branches={branches}
              tajeerResponse={tajeerResponse}
              contractStep={contractStep}
              signed={signed}
              rentPolicies={rentPolicies}
              rentPolicyId={rentPolicyId}
              TAJEER_LOOKUPS={TAJEER_LOOKUPS}
              isRenterDriver={isRenterDriver}
              authDriverIdType={authDriverIdType}
              authDriverIdNumber={authDriverIdNumber}
              authDriverBirthDate={authDriverBirthDate}
              authDriverMobile={authDriverMobile}
              authDriverAddress="الرياض"
              authorizationStartDate={authorizationStartDate}
              authorizationEndDate={authorizationEndDate}
              authorizationTypeCode={authorizationTypeCode}
              authorizationCountry={authorizationCountry}
              selectedExtraDriver={selectedExtraDriver}
              extraDriverIdType={extraDriverIdType}
              extraDriverIdNumber={extraDriverIdNumber}
              extraDriverAddress={extraDriverAddress}
              extraDriverBirthDate={extraDriverBirthDate}
              discountPercent={discountPercent}
              discountAmount={discountAmount}
              payMethod={payMethod}
              employeeId="EMP-102"
              registrationTypeCode={car.registrationTypeCode ?? 1}
              operationCardNumber={car.operationCardNumber}
              operationCardExpiry={car.operationCardExpiryDate}
              vehicleOtherNotes={car.otherNotes}
              insuranceAmount={insuranceAmount}
              internationalAuthorizationCost={internationalAuthorizationCost}
              fullFuelCost={fullFuelCost}
              driverFarePerDay={driverFarePerDay}
              driverFarePerHour={driverFarePerHour}
              vehicleTransferCost={vehicleTransferCost}
              rentalPolicyText={{
                extension: RENTAL_POLICY_OPTIONS.extension.find((o) => o.key === extensionPolicy) ?? RENTAL_POLICY_OPTIONS.extension[0],
                earlyReturn: RENTAL_POLICY_OPTIONS.earlyReturn.find((o) => o.key === earlyReturnPolicy) ?? RENTAL_POLICY_OPTIONS.earlyReturn[0],
                accidentReport: RENTAL_POLICY_OPTIONS.accidentReport.find((o) => o.key === accidentReportPolicy) ?? RENTAL_POLICY_OPTIONS.accidentReport[0],
                fuelReturn: RENTAL_POLICY_OPTIONS.fuelReturn.find((o) => o.key === fuelReturnPolicy) ?? RENTAL_POLICY_OPTIONS.fuelReturn[0],
                breakdownReport: RENTAL_POLICY_OPTIONS.breakdownReport.find((o) => o.key === breakdownReportPolicy) ?? RENTAL_POLICY_OPTIONS.breakdownReport[0],
              }}
            />
          </div>
        </Modal>
      </div>

      {/* Sticky Bottom Navigation Bar */}
      {(step < 3 || contractStep === "idle" || contractStep === "pending_signature" || contractStep === "error") && (
        <div className="sticky bottom-0 z-40 mk-surface border border-mk-border py-4 px-6 flex justify-between items-center shadow-[0_4px_20px_rgba(0,0,0,0.08)] rounded-xl mt-6 animate-[fi_0.22s_ease-out]">
          {/* Back Button */}
          {step > 0 && (contractStep === "idle" || contractStep === "error") ? (
            <Button
              variant="outline"
              onClick={() => {
                if (step === 3) {
                  setStep(2);
                } else {
                  setStep(step - 1);
                }
              }}
              className="shrink-0 whitespace-nowrap"
            >
              {ar ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
              {T("Back", "رجوع", ar)}
            </Button>
          ) : (
            <div />
          )}

          {/* Step indicator */}
          <div className="hidden sm:flex items-center gap-2 mk-caption text-mk-ink-500">
            <span>{T("Step", "الخطوة", ar)} {step + 1} {T("of", "من", ar)} 4 · </span>
            <span className="text-mk-ink-700">
              {step === 3
                ? (contractStep === "pending_signature"
                  ? (otpDigits.every(d => d !== "") ? T("Awaiting Signature", "بانتظار التوقيع", ar) : T("Verifying Renter", "التحقق من المستأجر", ar))
                  : T("Review & Issue", "مراجعة وإصدار", ar))
                : (ar ? STEPS[step].labelAr : STEPS[step].labelEn)}
            </span>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 shrink-0">
            {step === 0 && (
              <Button
                onClick={() => setStep(1)}
                disabled={CUSTOMER_STATUS_META[getCustomerStatusTag(selectedCustomer)].blocking}
                className="shadow-[var(--shadow-glow-blue)] shrink-0 whitespace-nowrap"
              >
                {T("Continue", "متابعة", ar)}
                {ar ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
              </Button>
            )}
            {step === 1 && (
              <Button onClick={() => setStep(2)} className="shadow-[var(--shadow-glow-blue)] shrink-0 whitespace-nowrap">
                {T("Continue to payment", "متابعة إلى الدفع", ar)}
                {ar ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
              </Button>
            )}
            {step === 2 && (
              <Button
                onClick={() => setStep(3)}
                className="shadow-[var(--shadow-glow-blue)] shrink-0 whitespace-nowrap"
              >
                <CreditCard size={14} />
                {payType === "advance"
                  ? `${T("Capture advance", "تنفيذ الدفع المقدم", ar)} · ${advanceAmount.toLocaleString()} ${T("SAR", "ريال", ar)}`
                  : `${T("Capture payment", "تنفيذ الدفع", ar)} · ${total.toLocaleString()} ${T("SAR", "ريال", ar)}`
                }
              </Button>
            )}
            {step === 3 && (
              <>
                {contractStep === "idle" && (
                  <Button onClick={handleSubmitToTajeer}
                    className="shadow-[var(--shadow-glow-blue)] shrink-0 whitespace-nowrap">
                    <FileText size={15} />
                    {T("Issue Unified Contract", "إصدار العقد الموحد", ar)}
                  </Button>
                )}
                {contractStep === "pending_signature" && otpDigits.every(d => d !== "") && (
                  <Button onClick={handleConfirmSignature}
                    className="shadow-[var(--shadow-glow-blue)] shrink-0 whitespace-nowrap">
                    <Check size={14} />
                    {T("Check signature status", "التحقق من حالة التوقيع", ar)}
                  </Button>
                )}
                {contractStep === "error" && (
                  <Button onClick={() => { setContractStep("idle"); setTajeerError(""); }}
                    className="shadow-[var(--shadow-glow-blue)] shrink-0 whitespace-nowrap">
                    {T("Try again", "حاول مرة أخرى", ar)}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Registration drawers — match the "Register new customer" modal in the customer page ── */}
      <PersonRegistrationDrawer
        open={isNewCustomerOpen}
        onClose={() => setIsNewCustomerOpen(false)}
        onCreate={handleCreateCustomerFromDrawer}
        ar={ar}
        titleEn="Add new customer"
        titleAr="إضافة عميل جديد"
        submitLabelEn="Add Customer"
        submitLabelAr="إضافة عميل"
      />
      <PersonRegistrationDrawer
        open={showAuthDriverAddNew}
        onClose={() => setShowAuthDriverAddNew(false)}
        onCreate={handleCreateAuthDriverFromDrawer}
        ar={ar}
        titleEn="Add new authorized driver"
        titleAr="إضافة مفوض جديد"
        submitLabelEn="Add Authorized Driver"
        submitLabelAr="إضافة مفوض"
        allowedIdTypes={["Saudi ID", "Iqama"]}
      />
    </div>
  );
}
