"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight, ChevronLeft, ChevronDown, Phone, CreditCard, FileText,
  Calendar, Star, Ban, Mail, MapPin, Pencil, Check, X as XIcon, CheckCircle2,
  Loader2, Trash2,
} from "lucide-react";
import { Avatar, Badge, HijriDatePicker, Button, Select, Modal } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { driverService, driverEvents } from "@/lib/api-services";
import { formatPhone, normalizeKycStatus } from "@/lib/formatting";
import { MOCK_DRIVERS, type DriverProfile } from "@/lib/data";

type EditableFields = Pick<DriverProfile,
  "name" | "nameAr" | "phone" | "email" | "idType" | "nationalId" | "idExpiryDate" |
  "birthDate" | "hijriBirthDate" | "nationality" | "licenseNumber" | "licenseExpiryDate" |
  "personAddress" | "idCopyNumber" | "licenseIssuePlace" | "borderNumber"
>;

// Required field set per identity type, mirroring the new-contract flow's
// identity form so editing a driver's profile shows the same fields.
type IdentityFieldDef = {
  key: string; labelEn: string; labelAr: string; required: boolean;
  type: "text" | "date" | "email" | "hijri"; value: string; onChange: (v: string) => void;
};

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

const HISTORY_BADGE: Record<string, { variant: "success" | "warning" | "neutral" | "danger" | "info"; label: [string, string] }> = {
  active: { variant: "info", label: ["Active", "نشط"] },
  pending: { variant: "warning", label: ["Pending", "معلق"] },
  completed: { variant: "success", label: ["Completed", "مكتمل"] },
  expired: { variant: "neutral", label: ["Expired", "منتهي"] },
  cancelled: { variant: "danger", label: ["Cancelled", "ملغي"] },
};

function firstString(...values: (string | number | undefined | null)[]): string {
  for (const v of values) {
    if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) continue;
    const s = typeof v === "number" ? String(v) : v;
    if (s.trim() !== "") return s;
  }
  return "";
}

function getIdTypeLabel(code: number): DriverProfile["idType"] {
  if (code === 1) return "Saudi ID";
  if (code === 2) return "Iqama";
  if (code === 3) return "Passport";
  return "GCC ID";
}

function mapApiToDriverProfile(item: any): DriverProfile {
  const idTypeCode = item.identityType ?? item.idType ?? 1;
  const idType = getIdTypeLabel(idTypeCode);

  return {
    id: String(item.id),
    name: item.fullNameEn || item.name || "",
    nameAr: item.fullNameAr || item.nameAr || "",
    phone: item.phoneNumber || "",
    idType,
    idTypeCode: idTypeCode as 1 | 2 | 3 | 4,
    nationalId: firstString(
      item.beneficiaryIdNumber,
      item.passportNumber,
      item.visitor?.passportNumber,
      item.borderNumber,
      item.visitor?.borderNumber,
      item.identityCopyNumber,
      item.visitor?.identityCopyNumber,
      item.idCopyNumber
    ) || "",
    birthDate: firstString(
      item.birthDate,
      item.residence?.birthDate,
      item.visitor?.birthDate,
      item.gulf?.birthDate
    ) || undefined,
    hijriBirthDate: firstString(item.hijriBirthDate, item.national?.hijriBirthDate)
      ? Number(firstString(item.hijriBirthDate, item.national?.hijriBirthDate))
      : undefined,
    email: firstString(item.email, item.national?.email, item.residence?.email, item.visitor?.email, item.gulf?.email) || undefined,
    passportNumber: item.passportNumber || item.visitor?.passportNumber || undefined,
    nationality: firstString(item.nationality, item.visitor?.nationality, item.gulf?.nationality) || undefined,
    nationalityCode: item.countryId,
    licenseNumber: firstString(item.licenseNumber, item.national?.licenseNumber, item.residence?.licenseNumber, item.visitor?.licenseNumber, item.gulf?.licenseNumber) || "",
    licenseExpiryDate: firstString(item.licenseExpiryDate, item.national?.licenseExpiryDate, item.residence?.licenseExpiryDate, item.visitor?.licenseExpiryDate, item.gulf?.licenseExpiryDate) || undefined,
    idExpiryDate: firstString(item.idExpiryDate, item.identityExpiryDate, item.visitor?.identityExpiryDate, item.gulf?.identityExpiryDate) || undefined,
    idCopyNumber: firstString(item.idCopyNumber, item.identityCopyNumber, item.visitor?.identityCopyNumber, item.gulf?.identityCopyNumber) || undefined,
    licenseIssuePlace: firstString(item.licenseIssuePlace, item.national?.licenseIssuePlace, item.residence?.licenseIssuePlace, item.visitor?.licenseIssuePlace, item.gulf?.licenseIssuePlace) || undefined,
    borderNumber: item.borderNumber || item.visitor?.borderNumber || undefined,
    personAddress: item.address || "",
    bookings: item.bookings || 0,
    status: normalizeKycStatus(item.verificationStatus),
    tajeerStatus: item.tajeerStatus === 1 ? "verified" : item.tajeerStatus === 2 ? "pending" : "not_verified",
    lastBooking: item.lastBooking || null,
    rating: item.rating ?? null,
    blacklisted: item.isBlacklisted || false,
    joinDate: (item.joinedAt || item.creationTime) ? new Date(item.joinedAt || item.creationTime).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    history: [],
  };
}

export default function DriverDetailPage() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const id = params.id as string;

  const listHref = pathname?.startsWith("/employee/") ? "/employee/drivers" : "/drivers";

  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedContract, setExpandedContract] = useState<string | null>(null);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EditableFields | null>(null);
  const [savedToast, setSavedToast] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);
  const [blacklistAction, setBlacklistAction] = useState<"add" | "remove">("add");
  const [blacklistReason, setBlacklistReason] = useState("");
  const [isTogglingBlacklist, setIsTogglingBlacklist] = useState(false);

  async function handleDelete() {
    if (!driver) return;
    try {
      setDeleting(true);
      await driverService.delete(driver.id);
      driverEvents.reload();
      setShowDeleteModal(false);
      router.push(listHref);
    } catch (err) {
      console.error("Error deleting driver:", err);
      alert(T("Failed to delete driver.", "فشل حذف السائق.", ar));
      setDeleting(false);
    }
  }

  async function handleToggleBlacklist() {
    if (!driver) return;
    try {
      setIsTogglingBlacklist(true);
      const isAdd = blacklistAction === "add";
      if (isAdd) {
        await driverService.addToBlacklist(driver.id, { reason: blacklistReason });
      } else {
        await driverService.removeFromBlacklist(driver.id);
      }
      setDriver((prev) => prev ? { ...prev, blacklisted: isAdd } : prev);
      driverEvents.reload();
      setShowBlacklistModal(false);
      setBlacklistReason("");
      alert(
        T(
          isAdd ? "Driver added to blacklist." : "Driver removed from blacklist.",
          isAdd ? "تمت إضافة السائق إلى القائمة السوداء." : "تمت إزالة السائق من القائمة السوداء.",
          ar
        )
      );
    } catch (err) {
      console.error("Error toggling blacklist status:", err);
      alert(
        T(
          blacklistAction === "add" ? "Failed to add driver to blacklist." : "Failed to remove driver from blacklist.",
          blacklistAction === "add" ? "فشل إضافة السائق إلى القائمة السوداء." : "فشل إزالة السائق من القائمة السوداء.",
          ar
        )
      );
    } finally {
      setIsTogglingBlacklist(false);
    }
  }

  useEffect(() => {
    async function loadDriver() {
      try {
        setLoading(true);
        setError(null);
        const response = await driverService.getById(id);
        const data = response?.data ?? response?.result ?? response;
        const driverData = data?.data && typeof data.data === "object" && (data.data.id !== undefined || data.data.fullNameEn !== undefined) ? data.data : data;
        const mapped = mapApiToDriverProfile(driverData);
        setDriver(mapped);
        setPhoneVerified(mapped.status === "verified");
        setEmailVerified(mapped.status === "verified");
      } catch (err) {
        console.error("Error loading driver:", err);
        setError(T("Failed to load driver details.", "فشل تحميل بيانات السائق.", ar));
        // Fallback to mock data if API fails during development
        const mocked = MOCK_DRIVERS.find((d) => d.id === id) ?? null;
        if (mocked) {
          setDriver(mocked);
          setPhoneVerified(mocked.status === "verified");
          setEmailVerified(mocked.status === "verified");
        }
      } finally {
        setLoading(false);
      }
    }

    loadDriver();
  }, [id, ar]);

  if (loading) {
    return (
      <div className="py-24 text-center flex flex-col items-center gap-3 text-mk-ink-400">
        <Loader2 size={32} className="animate-spin" />
        <span className="mk-label">{T("Loading driver...", "جاري تحميل بيانات السائق...", ar)}</span>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="py-24 text-center">
        <div className="mk-display mb-3">🪪</div>
        <div className="mk-body mb-2 text-mk-ink-900">{T("Driver not found", "السائق غير موجود", ar)}</div>
        {error && <div className="mk-caption text-mk-danger mb-3">{error}</div>}
        <Link href={listHref} className="mk-body-sm text-mk-blue-500 no-underline">{T("← Back", "→ العودة", ar)}</Link>
      </div>
    );
  }

  function startEditing() {
    if (!driver) return;
    setDraft({
      name: driver.name,
      nameAr: driver.nameAr,
      phone: driver.phone,
      email: driver.email ?? "",
      idType: driver.idType,
      nationalId: driver.nationalId,
      idExpiryDate: driver.idExpiryDate ?? "",
      birthDate: driver.birthDate ?? "",
      hijriBirthDate: driver.hijriBirthDate,
      nationality: driver.nationality ?? "",
      licenseNumber: driver.licenseNumber,
      licenseExpiryDate: driver.licenseExpiryDate ?? "",
      personAddress: driver.personAddress,
      idCopyNumber: driver.idCopyNumber ?? "",
      licenseIssuePlace: driver.licenseIssuePlace ?? "",
      borderNumber: driver.borderNumber ?? "",
    });
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setDraft(null);
  }

  async function saveEditing() {
    if (!draft || !driver) return;
    try {
      const isSaudi = draft.idType === "Saudi ID";
      const isIqama = draft.idType === "Iqama";
      const isPassport = draft.idType === "Passport";
      const isGulf = draft.idType === "GCC ID";

      const updatePayload: any = {
        fullNameEn: draft.name || undefined,
        fullNameAr: draft.nameAr || undefined,
        phoneNumber: draft.phone || undefined,
        identityType: isSaudi ? 1 : isIqama ? 2 : isPassport ? 3 : isGulf ? 4 : undefined,
        address: draft.personAddress || undefined,
        isActive: true,
      };

      if (isSaudi) {
        updatePayload.national = {
          beneficiaryIdNumber: draft.nationalId,
          hijriBirthDate: draft.hijriBirthDate || undefined,
          isHijriBirthDate: !draft.birthDate,
          email: draft.email || undefined,
          licenseNumber: draft.licenseNumber || undefined,
          licenseExpiryDate: draft.licenseExpiryDate || undefined,
          licenseIssuePlace: draft.licenseIssuePlace || undefined,
        };
      } else if (isIqama) {
        updatePayload.residence = {
          beneficiaryIdNumber: draft.nationalId,
          birthDate: draft.birthDate || undefined,
          isHijriBirthDate: false,
          email: draft.email || undefined,
          licenseNumber: draft.licenseNumber || undefined,
          licenseExpiryDate: draft.licenseExpiryDate || undefined,
          licenseIssuePlace: draft.licenseIssuePlace || undefined,
        };
      } else if (isPassport) {
        updatePayload.visitor = {
          email: draft.email || undefined,
          birthDate: draft.birthDate || undefined,
          borderNumber: draft.borderNumber || undefined,
          passportNumber: draft.nationalId,
          licenseNumber: draft.licenseNumber || undefined,
          licenseExpiryDate: draft.licenseExpiryDate || undefined,
          licenseIssuePlace: draft.licenseIssuePlace || undefined,
          countryId: 1,
          identityCopyNumber: draft.idCopyNumber || undefined,
          identityExpiryDate: draft.idExpiryDate || undefined,
        };
      } else if (isGulf) {
        updatePayload.gulf = {
          email: draft.email || undefined,
          birthDate: draft.birthDate || undefined,
          beneficiaryIdNumber: draft.nationalId,
          licenseNumber: draft.licenseNumber || undefined,
          licenseExpiryDate: draft.licenseExpiryDate || undefined,
          licenseIssuePlace: draft.licenseIssuePlace || undefined,
          countryId: 1,
          identityCopyNumber: draft.idCopyNumber || undefined,
          identityExpiryDate: draft.idExpiryDate || undefined,
        };
      }

      // Strip undefined/null values to avoid sending them
      Object.keys(updatePayload).forEach((key) => {
        if (updatePayload[key] === undefined || updatePayload[key] === null) {
          delete updatePayload[key];
        }
      });

      await driverService.update(driver.id, updatePayload);
      driverEvents.reload();

      setDriver((prev) => prev && {
        ...prev,
        ...draft,
      });
      setEditing(false);
      setDraft(null);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2200);
    } catch (err) {
      console.error("Error updating driver:", err);
      alert(T("Failed to save driver. Please check the fields and try again.", "فشل حفظ بيانات السائق. يرجى التحقق من الحقول والمحاولة مرة أخرى.", ar));
    }
  }

  function updateDraft<K extends keyof EditableFields>(key: K, value: EditableFields[K]) {
    setDraft((prev) => prev && { ...prev, [key]: value });
  }

  // Required field set per identity type — mirrors the new-contract flow's
  // per-type identity form so editing here uses the exact same fields.
  function identityFieldsFor(d: EditableFields): IdentityFieldDef[] {
    const addressField: IdentityFieldDef = { key: "address", labelEn: "Address", labelAr: "العنوان", required: true, type: "text", value: d.personAddress ?? "", onChange: (v) => updateDraft("personAddress", v) };
    const idCopyNumberField: IdentityFieldDef = { key: "idCopyNumber", labelEn: "ID Copy No.", labelAr: "رقم نسخة الهوية", required: true, type: "text", value: d.idCopyNumber ?? "", onChange: (v) => updateDraft("idCopyNumber", v) };

    if (d.idType === "Saudi ID" || d.idType === "Iqama") {
      const fields: IdentityFieldDef[] = [
        { key: "idNumber", labelEn: "Beneficiary ID No.", labelAr: "رقم هوية المستفيد", required: true, type: "text", value: d.nationalId, onChange: (v) => updateDraft("nationalId", v) },
        addressField,
      ];
      if (d.idType === "Saudi ID") {
        fields.push(
          {
            key: "hijriBirthDate",
            labelEn: "Date of Birth (Hijri)",
            labelAr: "تاريخ الميلاد (هجري)",
            required: true,
            type: "hijri",
            value: d.hijriBirthDate ? String(d.hijriBirthDate) : "",
            onChange: (v) => updateDraft("hijriBirthDate", v ? Number(v) : undefined as any),
          },
          {
            key: "birthDate",
            labelEn: "Date of Birth (Gregorian, optional)",
            labelAr: "تاريخ الميلاد (ميلادي، اختياري)",
            required: false,
            type: "date",
            value: d.birthDate ?? "",
            onChange: (v) => updateDraft("birthDate", v),
          }
        );
      } else {
        fields.push({
          key: "birthDate",
          labelEn: "Date of Birth",
          labelAr: "تاريخ الميلاد",
          required: true,
          type: "date",
          value: d.birthDate ?? "",
          onChange: (v) => updateDraft("birthDate", v),
        });
      }
      return fields;
    }
    if (d.idType === "GCC ID") {
      return [
        { key: "idNumber", labelEn: "Beneficiary ID No.", labelAr: "رقم هوية المستفيد", required: true, type: "text", value: d.nationalId, onChange: (v) => updateDraft("nationalId", v) },
        addressField,
        { key: "licenseNumber", labelEn: "License No.", labelAr: "رقم الرخصة", required: true, type: "text", value: d.licenseNumber, onChange: (v) => updateDraft("licenseNumber", v) },
        { key: "idExpiry", labelEn: "ID Expiry Date", labelAr: "تاريخ انتهاء الهوية", required: true, type: "date", value: d.idExpiryDate ?? "", onChange: (v) => updateDraft("idExpiryDate", v) },
        { key: "licenseIssuePlace", labelEn: "License Issue Place", labelAr: "مكان إصدار الرخصة", required: true, type: "text", value: d.licenseIssuePlace ?? "", onChange: (v) => updateDraft("licenseIssuePlace", v) },
        { key: "country", labelEn: "Country", labelAr: "الدولة", required: true, type: "text", value: d.nationality ?? "", onChange: (v) => updateDraft("nationality", v) },
        idCopyNumberField,
        { key: "licenseExpiry", labelEn: "License Expiry Date", labelAr: "تاريخ انتهاء الرخصة", required: true, type: "date", value: d.licenseExpiryDate ?? "", onChange: (v) => updateDraft("licenseExpiryDate", v) },
      ];
    }
    // Passport / Visitor — no "Beneficiary ID No." field; identity is border/passport number instead
    return [
      addressField,
      { key: "borderNumber", labelEn: "Border No.", labelAr: "رقم الحدود", required: true, type: "text", value: d.borderNumber ?? "", onChange: (v) => updateDraft("borderNumber", v) },
      { key: "passportNumber", labelEn: "Passport No.", labelAr: "رقم الجواز", required: true, type: "text", value: d.nationalId, onChange: (v) => updateDraft("nationalId", v) },
      { key: "birthDate", labelEn: "Date of Birth", labelAr: "تاريخ الميلاد", required: true, type: "date", value: d.birthDate ?? "", onChange: (v) => updateDraft("birthDate", v) },
      { key: "licenseNumber", labelEn: "License No.", labelAr: "رقم الرخصة", required: true, type: "text", value: d.licenseNumber, onChange: (v) => updateDraft("licenseNumber", v) },
      { key: "licenseExpiry", labelEn: "License Expiry Date", labelAr: "تاريخ انتهاء الرخصة", required: true, type: "date", value: d.licenseExpiryDate ?? "", onChange: (v) => updateDraft("licenseExpiryDate", v) },
      { key: "licenseIssuePlace", labelEn: "License Issue Place", labelAr: "مكان إصدار الرخصة", required: true, type: "text", value: d.licenseIssuePlace ?? "", onChange: (v) => updateDraft("licenseIssuePlace", v) },
      { key: "country", labelEn: "Country", labelAr: "الدولة", required: true, type: "text", value: d.nationality ?? "", onChange: (v) => updateDraft("nationality", v) },
      idCopyNumberField,
      { key: "idExpiry", labelEn: "ID Expiry Date", labelAr: "تاريخ انتهاء الهوية", required: true, type: "date", value: d.idExpiryDate ?? "", onChange: (v) => updateDraft("idExpiryDate", v) },
    ];
  }

  const history = driver.history ?? [];
  const previousContracts = history.filter((h) => h.status !== "active" && h.status !== "pending");
  const activeContracts = history.filter((h) => h.status === "active" || h.status === "pending");

  const birthDateStr = driver.hijriBirthDate
    ? `${String(driver.hijriBirthDate).slice(0, 4)}/${String(driver.hijriBirthDate).slice(4, 6)}/${String(driver.hijriBirthDate).slice(6, 8)} هـ`
    : driver.birthDate
      ? `${driver.birthDate} م`
      : T("Not provided", "غير مسجل", ar);

  const contactRows: [string, React.ReactNode, React.ReactNode][] = [
    [
      T("Mobile phone", "رقم الجوال", ar),
      <div key="phone-val" className="flex items-center gap-2">
        <span dir="ltr" className="inline-block whitespace-nowrap" style={{ unicodeBidi: "embed" }}>
          {formatPhone(driver.phone)}
        </span>
        {phoneVerified && (
          <Badge variant="success" className="mk-overline py-1 px-2 leading-none shrink-0">
            {T("Verified", "تم التحقق", ar)}
          </Badge>
        )}
      </div>,
      <Phone key="p" size={13} className="text-mk-ink-400 shrink-0" />
    ],
    [
      T("Email", "البريد الإلكتروني", ar),
      driver.email ? (
        <div key="email-val" className="flex items-center gap-2">
          <span>{driver.email}</span>
          {emailVerified && (
            <Badge variant="success" className="mk-overline py-1 px-2 leading-none shrink-0">
              {T("Verified", "تم التحقق", ar)}
            </Badge>
          )}
        </div>
      ) : (
        T("Not provided", "غير مسجل", ar)
      ),
      <Mail key="e" size={13} className="text-mk-ink-400 shrink-0" />
    ],
  ];

  const identityRows: [string, React.ReactNode, React.ReactNode][] = [
    [T("Identity Type", "نوع الإثبات", ar), driver.idType === "Passport" ? T("Visitor", "زائر", ar) : driver.idType, <CreditCard key="t" size={13} className="text-mk-ink-400 shrink-0" />],
    [T(driver.idType === "Passport" ? "Passport No." : "Identity Number", driver.idType === "Passport" ? "رقم الجواز" : "رقم الإثبات", ar), driver.nationalId, <CreditCard key="n" size={13} className="text-mk-ink-400 shrink-0" />],
    ...(driver.idType === "Passport" ? [[T("Border No.", "رقم الحدود", ar), driver.borderNumber || T("Not provided", "غير مسجل", ar), <CreditCard key="bn" size={13} className="text-mk-ink-400 shrink-0" />] as [string, React.ReactNode, React.ReactNode]] : []),
    [T("ID Expiry Date", "انتهاء الهوية", ar), driver.idExpiryDate || T("Not provided", "غير مسجل", ar), <Calendar key="ie" size={13} className="text-mk-ink-400 shrink-0" />],
    [T("Date of Birth", "تاريخ الميلاد", ar), birthDateStr, <Calendar key="b" size={13} className="text-mk-ink-400 shrink-0" />],
    [T("Nationality", "الجنسية", ar), driver.nationality || T("Not provided", "غير مسجل", ar), <MapPin key="nat" size={13} className="text-mk-ink-400 shrink-0" />],
    ...(driver.idType === "GCC ID" || driver.idType === "Passport" ? [[T("ID Copy No.", "رقم نسخة الهوية", ar), driver.idCopyNumber || T("Not provided", "غير مسجل", ar), <CreditCard key="icn" size={13} className="text-mk-ink-400 shrink-0" />] as [string, React.ReactNode, React.ReactNode]] : []),
    [T("Driving License", "رقم رخصة القيادة", ar), driver.licenseNumber, <FileText key="l" size={13} className="text-mk-ink-400 shrink-0" />],
    [T("License Expiry", "انتهاء الرخصة", ar), driver.licenseExpiryDate || T("Not provided", "غير مسجل", ar), <Calendar key="le" size={13} className="text-mk-ink-400 shrink-0" />],
    ...(driver.idType === "GCC ID" || driver.idType === "Passport" ? [[T("License Issue Place", "مكان إصدار الرخصة", ar), driver.licenseIssuePlace || T("Not provided", "غير مسجل", ar), <MapPin key="lip" size={13} className="text-mk-ink-400 shrink-0" />] as [string, React.ReactNode, React.ReactNode]] : []),
  ];

  const addressRows: [string, React.ReactNode, React.ReactNode][] = [
    [T("Address", "العنوان الوطني", ar), driver.personAddress || T("Not provided", "غير مسجل", ar), <MapPin key="a" size={13} className="text-mk-ink-400 shrink-0" />],
    [T("Registration date", "تاريخ التسجيل", ar), driver.joinDate, <Calendar key="j" size={13} className="text-mk-ink-400 shrink-0" />],
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Saved toast */}
      {savedToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full text-white mk-label shadow-2xl flex items-center gap-2 bg-mk-midnight">
          <Check size={14} /> {T("Driver profile saved", "تم حفظ بيانات السائق", ar)}
        </div>
      )}

      {/* Back nav */}
      <div className="flex items-center gap-3">
        <Link href={listHref} className="w-9 h-9 rounded-full flex items-center justify-center bg-white shadow-[var(--shadow-card)] text-mk-ink-600 no-underline hover:bg-mk-ink-50 transition-colors">
          {ar ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Link>
        <span className="mk-body-sm text-mk-ink-500">{T("Back to Drivers", "العودة إلى السائقين", ar)}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: profile + verification */}
        <div className="rounded-xl p-6 mk-surface">
          <div className="flex items-center gap-3">
            <Avatar name={ar ? driver.nameAr : driver.name} size="lg" className={driver.blacklisted ? "grayscale opacity-50" : ""} />
            <div>
              <div className="mk-body leading-tight text-mk-ink-900">{ar ? driver.nameAr : driver.name}</div>
              <p className="mk-caption font-mono mt-1 text-mk-ink-400">ID: {driver.id}</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                {driver.blacklisted ? (
                  <Badge variant="danger" dot>{T("Blacklisted", "قائمة سوداء", ar)}</Badge>
                ) : driver.status === "verified" ? (
                  <Badge variant="success" dot>{T("Verified", "موثّق", ar)}</Badge>
                ) : driver.status === "rejected" ? (
                  <Badge variant="danger" dot>{T("Rejected", "مرفوض", ar)}</Badge>
                ) : (
                  <Badge variant="warning" dot>{T("Awaiting Verification", "بانتظار التحقق", ar)}</Badge>
                )}
                {driver.rating != null && driver.rating > 0 && (
                  <span className="flex items-center gap-1 mk-caption text-mk-warning">
                    <Star size={12} className="fill-current" /> {driver.rating}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Profile attributes */}
          <div className="flex items-center justify-between mt-4 mb-2">
            <span className="mk-overline uppercase tracking-wider text-mk-ink-500">{T("Profile details", "بيانات السائق", ar)}</span>
            {!editing ? (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={startEditing}>
                  <Pencil size={12} /> {T("Edit", "تعديل", ar)}
                </Button>
                {driver.blacklisted ? (
                  <Button variant="ghost" size="sm" className="text-mk-mint-600 hover:bg-mk-mint-600/10" onClick={() => { setBlacklistAction("remove"); setShowBlacklistModal(true); }}>
                    <CheckCircle2 size={12} /> {T("Remove from Blacklist", "إزالة من القائمة السوداء", ar)}
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" className="text-mk-warning hover:bg-mk-warning/10" onClick={() => { setBlacklistAction("add"); setShowBlacklistModal(true); }}>
                    <Ban size={12} /> {T("Blacklist", "قائمة سوداء", ar)}
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="text-mk-danger hover:bg-mk-danger/10" onClick={() => setShowDeleteModal(true)}>
                  <Trash2 size={12} /> {T("Delete", "حذف", ar)}
                </Button>
              </div>
            ) : draft && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={cancelEditing}>
                  <XIcon size={12} /> {T("Cancel", "إلغاء", ar)}
                </Button>
                <Button variant="primary" size="sm" disabled={!draft.name || !draft.phone} onClick={saveEditing}>
                  <Check size={12} /> {T("Save changes", "حفظ التعديلات", ar)}
                </Button>
              </div>
            )}
          </div>

          {!editing ? (
            <div className="flex flex-col gap-4">
              {/* Group 1: Contact Details */}
              <div className="flex flex-col gap-2">
                <div className="mk-overline uppercase tracking-wider text-mk-ink-400">
                  {T("Contact Info", "بيانات الاتصال", ar)}
                </div>
                <div className="flex flex-col gap-3">
                  {contactRows.map(([k, v, icon], idx) => (
                    <div key={idx} className="flex justify-between items-center mk-label border-b border-mk-ink-100 last:border-none pb-2 last:pb-0">
                      <span className="flex items-center gap-2 text-mk-ink-500">{icon}{k}</span>
                      <strong className="text-mk-ink-900">{v}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Group 2: Identity & Driving */}
              <div className="flex flex-col gap-2 border-t border-mk-ink-100 pt-3">
                <div className="mk-overline uppercase tracking-wider text-mk-ink-400">
                  {T("Identity & License", "الهوية والقيادة", ar)}
                </div>
                <div className="flex flex-col gap-3">
                  {identityRows.map(([k, v, icon], idx) => (
                    <div key={idx} className="flex justify-between items-center mk-label border-b border-mk-ink-100 last:border-none pb-2 last:pb-0">
                      <span className="flex items-center gap-2 text-mk-ink-500">{icon}{k}</span>
                      <strong className="text-mk-ink-900">{v}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Group 3: National Address */}
              <div className="flex flex-col gap-2 border-t border-mk-ink-100 pt-3">
                <div className="mk-overline uppercase tracking-wider text-mk-ink-400">
                  {T("National Address & Registration", "العنوان والتسجيل", ar)}
                </div>
                <div className="flex flex-col gap-3">
                  {addressRows.map(([k, v, icon], idx) => (
                    <div key={idx} className="flex justify-between items-center mk-label border-b border-mk-ink-100 last:border-none pb-2 last:pb-0">
                      <span className="flex items-center gap-2 text-mk-ink-500">{icon}{k}</span>
                      <strong className="text-mk-ink-900">{v}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : draft && (
            <div className="flex flex-col gap-4 bg-transparent border-0 p-0">
              {/* Section 1: Personal Info */}
              <div className="flex flex-col gap-3">
                <div className="mk-overline uppercase tracking-wider text-mk-ink-400">
                  {T("Personal Information", "البيانات الشخصية", ar)}
                </div>
                <EditField label={T("Full name (English)", "الاسم (إنجليزي)", ar)} value={draft.name} onChange={(v) => updateDraft("name", v)} />
                <EditField label={T("Full name (Arabic)", "الاسم (عربي)", ar)} value={draft.nameAr} onChange={(v) => updateDraft("nameAr", v)} dir="rtl" />
              </div>

              {/* Section 2: Contact Info */}
              <div className="flex flex-col gap-3 border-t border-mk-ink-100 pt-3">
                <div className="mk-overline uppercase tracking-wider text-mk-ink-400">
                  {T("Contact Info", "بيانات الاتصال", ar)}
                </div>
                <EditField
                  label={T("Mobile phone", "رقم الجوال", ar)}
                  value={draft.phone}
                  onChange={(v) => updateDraft("phone", v)}
                  badge={
                    phoneVerified && (
                      <Badge variant="success" className="mk-overline py-1 px-2 leading-none shrink-0">
                        {T("Verified", "تم التحقق", ar)}
                      </Badge>
                    )
                  }
                  dir="ltr"
                  isRtl={false}
                />
                <EditField
                  label={T("Email", "البريد الإلكتروني", ar)}
                  value={draft.email ?? ""}
                  onChange={(v) => updateDraft("email", v)}
                  type="email"
                  badge={
                    emailVerified && (
                      <Badge variant="success" className="mk-overline py-1 px-2 leading-none shrink-0">
                        {T("Verified", "تم التحقق", ar)}
                      </Badge>
                    )
                  }
                  isRtl={ar}
                />
              </div>

              {/* Section 3: Identity & License */}
              <div className="flex flex-col gap-3 border-t border-mk-ink-100 pt-3">
                <div className="mk-overline uppercase tracking-wider text-mk-ink-400">
                  {T("Identity & License", "الهوية والقيادة", ar)}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="mk-overline text-mk-ink-500">{T("ID Type", "نوع الهوية", ar)}</label>
                  <Select
                    value={draft.idType}
                    onChange={(e) => updateDraft("idType", e.target.value as DriverProfile["idType"])}
                  >
                    <option value="Saudi ID">{T("National ID", "هوية وطنية", ar)}</option>
                    <option value="Iqama">{T("Iqama", "إقامة", ar)}</option>
                    <option value="Passport">{T("Visitor", "زائر", ar)}</option>
                    <option value="GCC ID">{T("GCC ID", "هوية خليجية", ar)}</option>
                  </Select>
                </div>
                {/* Dynamic identity fields — depends on ID Type, matches the new-contract flow exactly */}
                <div className="grid grid-cols-2 gap-3">
                  {identityFieldsFor(draft).map((f) => (
                    f.type === "hijri" ? (
                      <div key={f.key} className="flex flex-col gap-1">
                        <label className="mk-overline text-mk-ink-500">{T(f.labelEn, f.labelAr, ar) + (f.required ? " *" : "")}</label>
                        <HijriDatePicker value={f.value} onChange={f.onChange} ar={ar} />
                      </div>
                    ) : (
                      <EditField
                        key={f.key}
                        label={T(f.labelEn, f.labelAr, ar) + (f.required ? " *" : "")}
                        value={f.value}
                        onChange={f.onChange}
                        type={f.type}
                      />
                    )
                  ))}
                </div>
              </div>
            </div>
          )}
          {driver.blacklisted && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-mk-ink-100 mk-caption text-mk-danger">
              <Ban size={13} />{T("This driver is restricted from new bookings", "هذا السائق موقوف عن الحجوزات الجديدة", ar)}
            </div>
          )}
        </div>

        {/* Right: contract history */}
        <div className="flex flex-col gap-4">
          {activeContracts.length > 0 && (
            <div className="rounded-xl p-6 mk-surface">
              <div className="mk-h4 mb-3 text-mk-ink-900">{T("Active & Pending Contracts", "العقود النشطة والمعلقة", ar)}</div>
              <div className="flex flex-col gap-2">
                {activeContracts.map((h) => (
                  <ContractRow
                    key={h.id}
                    h={h}
                    ar={ar}
                    expanded={expandedContract === h.id}
                    onToggle={() => setExpandedContract((cur) => (cur === h.id ? null : h.id))}
                    repeatCount={history.filter((item) => item.car === h.car).length}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl p-6 mk-surface">
            <div className="flex items-center justify-between mb-3">
              <div className="mk-h4 text-mk-ink-900">{T("Previous & Expired Contracts", "العقود السابقة والمنتهية", ar)}</div>
              <span className="mk-overline uppercase text-mk-ink-400">{T(`${previousContracts.length} on file`, `${previousContracts.length} سجل`, ar)}</span>
            </div>
            {previousContracts.length === 0 ? (
              <p className="mk-caption p-3 text-center bg-mk-ink-50 rounded-md text-mk-ink-400">
                {T("No prior rental contracts on file yet", "لا يوجد عقود تأجير سابقة مسجلة بعد لهذا السائق", ar)}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {previousContracts.map((h) => (
                  <ContractRow
                    key={h.id}
                    h={h}
                    ar={ar}
                    expanded={expandedContract === h.id}
                    onToggle={() => setExpandedContract((cur) => (cur === h.id ? null : h.id))}
                    repeatCount={history.filter((item) => item.car === h.car).length}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Blacklist / Remove from blacklist confirmation modal */}
      <Modal open={showBlacklistModal} onClose={() => !isTogglingBlacklist && setShowBlacklistModal(false)} variant="centered" size="sm" title={blacklistAction === "remove" ? T("Remove from blacklist?", "إزالة من القائمة السوداء؟", ar) : T("Blacklist driver?", "إضافة السائق إلى القائمة السوداء؟", ar)}>
        <div className="flex flex-col gap-5 p-2">
          <p className="mk-body text-mk-ink-700">
            {blacklistAction === "remove"
              ? T(
                  `Are you sure you want to remove ${driver?.name || driver?.nameAr || "this driver"} from the blacklist?`,
                  `هل أنت متأكد من إزالة ${driver?.nameAr || driver?.name || "هذا السائق"} من القائمة السوداء؟`,
                  ar
                )
              : T(
                  `Are you sure you want to blacklist ${driver?.name || driver?.nameAr || "this driver"}? They will be restricted from new bookings.`,
                  `هل أنت متأكد من إضافة ${driver?.nameAr || driver?.name || "هذا السائق"} إلى القائمة السوداء؟ سيتم منعهم من الحجوزات الجديدة.`,
                  ar
                )}
          </p>
          {blacklistAction === "add" && (
            <div className="flex flex-col gap-2">
              <label className="mk-caption text-mk-ink-700">{T("Reason (optional)", "السبب (اختياري)", ar)}</label>
              <input
                type="text"
                className="px-3 h-10 rounded-md mk-body-sm outline-none bg-white border border-mk-ink-200 text-mk-ink-900 focus:border-mk-blue-500 focus:shadow-[0_0_0_3px_rgba(65,113,226,0.15)] transition-all w-full"
                placeholder={T("Enter reason...", "أدخل السبب...", ar)}
                value={blacklistReason}
                onChange={(e) => setBlacklistReason(e.target.value)}
                disabled={isTogglingBlacklist}
              />
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => { setShowBlacklistModal(false); setBlacklistReason(""); }} disabled={isTogglingBlacklist}>
              {T("Cancel", "إلغاء", ar)}
            </Button>
            <Button variant={blacklistAction === "remove" ? "primary" : "danger"} size="sm" onClick={handleToggleBlacklist} disabled={isTogglingBlacklist}>
              {isTogglingBlacklist ? <><Loader2 size={13} className="animate-spin" /> {T("Processing...", "جارٍ المعالجة...", ar)}</> : blacklistAction === "remove" ? <><CheckCircle2 size={13} /> {T("Remove", "إزالة", ar)}</> : <><Ban size={13} /> {T("Blacklist", "إضافة", ar)}</>}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} variant="centered" size="sm" title={T("Delete driver?", "حذف السائق؟", ar)}>
        <div className="flex flex-col gap-5 p-2">
          <p className="mk-body text-mk-ink-700">
            {T(
              `Are you sure you want to delete ${driver?.name || driver?.nameAr || "this driver"}? This action cannot be undone.`,
              `هل أنت متأكد من حذف ${driver?.nameAr || driver?.name || "هذا السائق"}؟ لا يمكن التراجع عن هذا الإجراء.`,
              ar
            )}
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
              {T("Cancel", "إلغاء", ar)}
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              {T("Delete", "حذف", ar)}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function EditField({ label, value, onChange, type = "text", dir, mono, badge, isRtl }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  dir?: "rtl" | "ltr";
  mono?: boolean;
  badge?: React.ReactNode;
  isRtl?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="mk-overline text-mk-ink-500">{label}</label>
      <div className="relative flex items-center">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          dir={dir}
          className={`px-3 h-10 rounded-md mk-body-sm outline-none bg-white border border-mk-ink-200 text-mk-ink-900 focus:border-mk-blue-500 focus:shadow-[0_0_0_3px_rgba(65,113,226,0.15)] transition-all w-full ${mono ? "font-mono" : ""}`}
          style={{ [isRtl ? "paddingLeft" : "paddingRight"]: badge ? "90px" : "12px" }}
        />
        {badge && (
          <div className="absolute top-1/2 -translate-y-1/2" style={{ [isRtl ? "left" : "right"]: "12px" }}>
            {badge}
          </div>
        )}
      </div>
    </div>
  );
}

function ContractRow({ h, ar, expanded, onToggle, repeatCount = 0 }: { h: { id: string; car: string; date: string; status: string; rate: number }; ar: boolean; expanded: boolean; onToggle: () => void; repeatCount?: number }) {
  const days = 3;
  const total = h.rate * days;
  const badge = HISTORY_BADGE[h.status] ?? { variant: "neutral" as const, label: [h.status, h.status] as [string, string] };
  return (
    <div className="rounded-md border border-mk-ink-100 bg-mk-ink-50 overflow-hidden transition-all duration-300">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 bg-transparent border-0 cursor-pointer text-start hover:bg-mk-ink-100/10 transition-colors duration-200"
      >
        <div>
          <div className="flex items-center gap-2 mk-label text-mk-ink-900">
            <span>{h.car}</span>
            {repeatCount > 1 && (
              <Badge variant="neutral" className="mk-overline py-px px-2 bg-mk-blue-50 text-mk-blue-600 border border-mk-blue-100 leading-normal shrink-0">
                {ar ? `• استئجار متكرر (${repeatCount})` : `• Repeat Rent (${repeatCount})`}
              </Badge>
            )}
          </div>
          <div className="mk-overline text-mk-ink-400 mt-1">{h.date} · {h.id}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-end">
            <div className="mk-label text-mk-blue-600">{h.rate} {T("SAR/d", "ريال/ي", ar)}</div>
            <Badge variant={badge.variant} className="mk-overline px-2 mt-1">{T(...badge.label, ar)}</Badge>
          </div>
          <ChevronDown size={15} className={`text-mk-ink-400 shrink-0 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} />
        </div>
      </button>
      <div
        className="transition-all duration-300 ease-in-out overflow-hidden"
        style={{
          maxHeight: expanded ? "300px" : "0px",
          opacity: expanded ? 1 : 0,
        }}
      >
        <div className="px-3 pb-3 pt-1 border-t border-mk-ink-100">
          <div className="flex flex-col gap-2 mk-caption">
            <div className="flex justify-between"><span className="text-mk-ink-500">{T("Contract ref", "رقم العقد", ar)}</span><strong className="text-mk-ink-900">{h.id}</strong></div>
            <div className="flex justify-between"><span className="text-mk-ink-500">{T("Vehicle", "المركبة", ar)}</span><strong className="text-mk-ink-900">{h.car}</strong></div>
            <div className="flex justify-between"><span className="text-mk-ink-500">{T("Start date", "تاريخ البدء", ar)}</span><strong className="text-mk-ink-900">{h.date}</strong></div>
            <div className="flex justify-between"><span className="text-mk-ink-500">{T("Duration", "المدة", ar)}</span><strong className="text-mk-ink-900">{T(`${days} days`, `${days} أيام`, ar)}</strong></div>
            <div className="flex justify-between"><span className="text-mk-ink-500">{T("Daily rate", "السعر اليومي", ar)}</span><strong className="text-mk-ink-900">{h.rate} {T("SAR", "ريال", ar)}</strong></div>
            <div className="flex justify-between"><span className="text-mk-ink-500">{T("Total amount", "الإجمالي", ar)}</span><strong className="text-mk-blue-600">{total} {T("SAR", "ريال", ar)}</strong></div>
            <div className="flex justify-between items-center pt-1"><span className="text-mk-ink-500">{T("Status", "الحالة", ar)}</span><Badge variant={badge.variant} className="mk-overline px-2">{T(...badge.label, ar)}</Badge></div>
          </div>
        </div>
      </div>
    </div>
  );
}
