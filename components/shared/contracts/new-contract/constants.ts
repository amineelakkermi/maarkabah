import { ShieldCheck, Gauge, Baby, Fuel, Wifi, MapPin, Compass, Accessibility } from "lucide-react";
import type { DriverProfile } from "@/lib/data";

export const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

// Overall customer status shown at the point of contract creation — a customer
// can be blocked (blacklisted / not verified) or allowed through with a flag
// (debt / circular notice) that the front-desk should be aware of.
export type CustomerStatusTag = "verified" | "debt" | "circular" | "blacklisted" | "unverified";

export function getCustomerStatusTag(c: DriverProfile): CustomerStatusTag {
  if (c.blacklisted) return "blacklisted";
  if (c.status !== "verified") return "unverified";
  if (c.debtAmount && c.debtAmount > 0) return "debt";
  if (c.circularNote) return "circular";
  return "verified";
}

export const CUSTOMER_STATUS_META: Record<CustomerStatusTag, { labelEn: string; labelAr: string; className: string; blocking: boolean }> = {
  verified: { labelEn: "Verified", labelAr: "موثّق", className: "bg-mk-mint-600/12 text-mk-mint-600", blocking: false },
  debt: { labelEn: "Has debt", labelAr: "مديونية", className: "bg-mk-warning/14 text-mk-warning-700", blocking: false },
  circular: { labelEn: "Circular", labelAr: "تعميم", className: "bg-mk-violet-100 text-mk-violet-600", blocking: false },
  blacklisted: { labelEn: "Blacklisted", labelAr: "قائمة سوداء", className: "bg-mk-danger/14 text-mk-danger", blocking: true },
  unverified: { labelEn: "Not verified", labelAr: "غير موثق", className: "bg-mk-ink-200/60 text-mk-ink-600", blocking: true },
};

export const ID_TYPE_CODES: Record<string, 1 | 2 | 3 | 4> = { "Saudi ID": 1, "Iqama": 2, "Passport": 3, "GCC ID": 4 };

// Fallback rate per extra km before a vehicle is selected (overridden by the vehicle's registered rate).
export const SYSTEM_EXTRA_KM_RATE = 1; // SAR per km
// System-defined driver fare — matches the "extra driver" add-on default.
export const SYSTEM_DRIVER_FARE_PER_DAY = 45;
export const SYSTEM_DRIVER_FARE_PER_HOUR = 10;
// System-registered flat fees — same figures the office's Pricing settings hold.
export const SYSTEM_VEHICLE_TRANSFER_COST = 150;
export const SYSTEM_COVERAGE_BASE_COST = 100;

export const ADD_ONS = [
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
export const RENTAL_POLICY_OPTIONS = {
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

export const STEPS = [
  { labelEn: "Customer, dates & vehicle", labelAr: "العميل والتواريخ والمركبة", icon: "user-check" },
  { labelEn: "Add-ons & handover", labelAr: "الخدمات الإضافية والتسليم", icon: "car" },
  { labelEn: "Payment", labelAr: "الدفع", icon: "credit-card" },
  { labelEn: "Verification, signature & issue", labelAr: "التحقق والتوقيع وإصدار العقد", icon: "printer" },
];

// Saudi Arabia's full land neighbors — shown when authorization type is "external"
export const NEIGHBORING_COUNTRIES = [
  { code: "AE", ar: "الإمارات", en: "United Arab Emirates" },
  { code: "QA", ar: "قطر", en: "Qatar" },
  { code: "BH", ar: "البحرين", en: "Bahrain" },
  { code: "KW", ar: "الكويت", en: "Kuwait" },
  { code: "OM", ar: "عُمان", en: "Oman" },
  { code: "JO", ar: "الأردن", en: "Jordan" },
  { code: "IQ", ar: "العراق", en: "Iraq" },
  { code: "YE", ar: "اليمن", en: "Yemen" },
];
