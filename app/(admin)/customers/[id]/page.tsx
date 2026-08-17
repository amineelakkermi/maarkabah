"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight, ChevronLeft, ChevronDown, Phone, CreditCard, FileText,
  Calendar, Star, Ban, Mail, MapPin, Pencil, Check, X as XIcon, CheckCircle2, FileSignature,
  Loader2, Trash2,
} from "lucide-react";
import { Avatar, Badge, HijriDatePicker, Button, Select, Modal } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { customerService, customerEvents } from "@/lib/api-services";
import { formatPhone, normalizeKycStatus } from "@/lib/formatting";
import { CLIENTS, type ClientProfile, type ClientContract } from "@/lib/data";
import { OtpVerificationPanel } from "@/components/employee/OtpVerification";

type EditableFields = Pick<ClientProfile,
  "name" | "nameAr" | "phone" | "email" | "idType" | "idNumber" | "idExpiryDate" |
  "birthDate" | "hijriBirthDate" | "nationality" | "licenseNumber" | "licenseExpiryDate" |
  "personAddress" | "idCopyNumber" | "licenseIssuePlace" | "borderNumber"
>;

// Required field set per identity type, mirroring the new-contract flow's
// identity form so editing a customer's profile shows the same fields.
type IdentityFieldDef = {
  key: string; labelEn: string; labelAr: string; required: boolean;
  type: "text" | "date" | "email" | "hijri"; value: string; onChange: (v: string) => void;
};

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

const HISTORY_BADGE: Record<ClientContract["status"], { variant: "success" | "warning" | "neutral" | "danger" | "info"; label: [string, string] }> = {
  active: { variant: "info", label: ["Active", "نشط"] },
  pending: { variant: "warning", label: ["Pending", "معلق"] },
  completed: { variant: "success", label: ["Completed", "مكتمل"] },
  expired: { variant: "neutral", label: ["Expired", "منتهي"] },
  cancelled: { variant: "danger", label: ["Cancelled", "ملغي"] },
};

const DEBT_BADGE: Record<"unpaid" | "overdue" | "paid", { variant: "success" | "warning" | "danger"; label: [string, string] }> = {
  unpaid: { variant: "warning", label: ["Unpaid", "غير مسدد"] },
  overdue: { variant: "danger", label: ["Overdue", "متأخر السداد"] },
  paid: { variant: "success", label: ["Paid", "مسدد"] },
};

function firstString(...values: (string | number | undefined | null)[]): string {
  for (const v of values) {
    if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) continue;
    const s = typeof v === "number" ? String(v) : v;
    if (s.trim() !== "") return s;
  }
  return "";
}

function mapApiToClientProfile(item: any): ClientProfile {
  // Keep this log until the backend response shape is fully confirmed.
  console.log("[CustomerDetail] raw API item:", item);

  const idTypeCode = item.identityType ?? item.idType;
  const idType = idTypeCode === 1 ? "Saudi ID" : idTypeCode === 2 ? "Iqama" : idTypeCode === 3 ? "Passport" : idTypeCode === 4 ? "GCC ID" : "Unknown";

  return {
    id: String(item.id),
    name: item.fullNameEn || item.name || "",
    nameAr: item.fullNameAr || item.nameAr || "",
    phone: item.phoneNumber || "",
    email: firstString(
      item.email,
      item.national?.email,
      item.residence?.email,
      item.visitor?.email,
      item.gulf?.email
    ) || undefined,
    idType,
    idNumber: firstString(
      item.beneficiaryIdNumber,
      item.visitor?.passportNumber,
      item.visitor?.idNumber
    ),
    idExpiryDate: firstString(
      item.idExpiryDate,
      item.identityExpiryDate,
      item.national?.identityExpiryDate,
      item.residence?.identityExpiryDate,
      item.visitor?.identityExpiryDate,
      item.gulf?.identityExpiryDate
    ) || undefined,
    birthDate: firstString(
      item.birthDate,
      item.dateOfBirth,
      item.national?.birthDate,
      item.national?.dateOfBirth,
      item.residence?.birthDate,
      item.residence?.dateOfBirth,
      item.visitor?.birthDate,
      item.visitor?.dateOfBirth,
      item.gulf?.birthDate,
      item.gulf?.dateOfBirth
    ) || undefined,
    hijriBirthDate: firstString(
      item.hijriBirthDate,
      item.hijriDateOfBirth,
      item.national?.hijriBirthDate,
      item.national?.hijriDateOfBirth,
      item.residence?.hijriBirthDate,
      item.residence?.hijriDateOfBirth
    )
      ? Number(firstString(
          item.hijriBirthDate,
          item.hijriDateOfBirth,
          item.national?.hijriBirthDate,
          item.national?.hijriDateOfBirth,
          item.residence?.hijriBirthDate,
          item.residence?.hijriDateOfBirth
        ))
      : undefined,
    nationality: firstString(
      item.nationality,
      item.national?.nationality,
      item.residence?.nationality,
      item.visitor?.nationality,
      item.gulf?.nationality
    ) || undefined,
    personAddress: item.address,
    idCopyNumber: firstString(
      item.idCopyNumber,
      item.identityCopyNumber,
      item.national?.idCopyNumber,
      item.residence?.idCopyNumber,
      item.visitor?.identityCopyNumber,
      item.gulf?.identityCopyNumber
    ) || undefined,
    licenseIssuePlace: firstString(
      item.licenseIssuePlace,
      item.national?.licenseIssuePlace,
      item.residence?.licenseIssuePlace,
      item.visitor?.licenseIssuePlace,
      item.gulf?.licenseIssuePlace
    ) || undefined,
    borderNumber: item.visitor?.borderNumber || undefined,
    licenseNumber: firstString(
      item.licenseNumber,
      item.national?.licenseNumber,
      item.residence?.licenseNumber,
      item.visitor?.licenseNumber,
      item.gulf?.licenseNumber
    ) || "",
    licenseExpiryDate: firstString(
      item.licenseExpiryDate,
      item.national?.licenseExpiryDate,
      item.residence?.licenseExpiryDate,
      item.visitor?.licenseExpiryDate,
      item.gulf?.licenseExpiryDate
    ) || undefined,
    contracts: item.contracts || 0,
    rating: item.rating || 0,
    kycStatus: normalizeKycStatus(item.verificationStatus),
    yakeenStatus: item.yakeenStatus === 1 ? "verified" : item.yakeenStatus === 2 ? "pending" : "not_verified",
    blacklisted: item.isBlacklisted || false,
    joinDate: (item.joinedAt || item.creationTime) ? new Date(item.joinedAt || item.creationTime).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    history: [],
    debts: [],
  };
}

export default function CustomerDetailPage() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const id = params.id as string;

  const listHref = pathname?.startsWith("/employee/") ? "/employee/customer" : "/customers";

  const [client, setClient] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedContract, setExpandedContract] = useState<string | null>(null);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EditableFields | null>(null);
  const [savedToast, setSavedToast] = useState(false);
  const [showContracts, setShowContracts] = useState(true);
  const [expandedDebts, setExpandedDebts] = useState<Record<number, boolean>>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState("");
  const [isBlacklisting, setIsBlacklisting] = useState(false);

  async function handleDelete() {
    if (!client) return;
    try {
      setDeleting(true);
      await customerService.delete(Number(client.id));
      setShowDeleteModal(false);
      router.push(listHref);
    } catch (err) {
      console.error("Error deleting customer:", err);
      alert(T("Failed to delete customer.", "فشل حذف العميل.", ar));
      setDeleting(false);
    }
  }

  async function handleBlacklist() {
    if (!client) return;
    try {
      setIsBlacklisting(true);
      await customerService.addToBlacklist(Number(client.id), { reason: blacklistReason });
      setClient((prev) => prev ? { ...prev, blacklisted: true } : prev);
      customerEvents.reload();
      setShowBlacklistModal(false);
      setBlacklistReason("");
      alert(T("Customer added to blacklist.", "تمت إضافة العميل إلى القائمة السوداء.", ar));
    } catch (err) {
      console.error("Error blacklisting customer:", err);
      alert(T("Failed to add customer to blacklist.", "فشل إضافة العميل إلى القائمة السوداء.", ar));
    } finally {
      setIsBlacklisting(false);
    }
  }

  useEffect(() => {
    async function loadCustomer() {
      try {
        setLoading(true);
        setError(null);
        const response = await customerService.getById(Number(id));
        const data = response?.data ?? response?.result ?? response;
        const customerData = data?.data && typeof data.data === "object" && (data.data.id !== undefined || data.data.fullNameEn !== undefined) ? data.data : data;
        console.log("[CustomerDetail] API response:", response);
        console.log("[CustomerDetail] extracted customerData:", customerData);
        const mapped = mapApiToClientProfile(customerData);
        console.log("[CustomerDetail] mapped client:", mapped);
        setClient(mapped);
        setPhoneVerified(mapped.kycStatus === "verified");
        setEmailVerified(mapped.kycStatus === "verified");
      } catch (err: any) {
        console.error("Error loading customer:", err);
        setError(T("Failed to load customer details.", "فشل تحميل بيانات العميل.", ar));
        // Fallback to mock data if API fails during development
        const mocked = CLIENTS.find((c) => c.id === id) ?? null;
        if (mocked) {
          setClient(mocked);
          setPhoneVerified(mocked.kycStatus === "verified");
          setEmailVerified(mocked.kycStatus === "verified");
        }
      } finally {
        setLoading(false);
      }
    }

    loadCustomer();
  }, [id, ar]);

  if (loading) {
    return (
      <div className="py-24 text-center flex flex-col items-center gap-3 text-mk-ink-400">
        <Loader2 size={32} className="animate-spin" />
        <span className="mk-label">{T("Loading customer...", "جاري تحميل بيانات العميل...", ar)}</span>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="py-24 text-center">
        <div className="mk-display mb-3">🪪</div>
        <div className="mk-body mb-2 text-mk-ink-900">{T("Customer not found", "العميل غير موجود", ar)}</div>
        {error && <div className="mk-caption text-mk-danger mb-3">{error}</div>}
        <Link href={listHref} className="mk-body-sm text-mk-blue-500 no-underline">{T("← Back", "→ العودة", ar)}</Link>
      </div>
    );
  }

  function startEditing() {
    if (!client) return;
    setDraft({
      name: client.name,
      nameAr: client.nameAr,
      phone: client.phone,
      email: client.email ?? "",
      idType: client.idType,
      idNumber: client.idNumber,
      idExpiryDate: client.idExpiryDate ?? "",
      birthDate: client.birthDate ?? "",
      hijriBirthDate: client.hijriBirthDate,
      nationality: client.nationality ?? "",
      licenseNumber: client.licenseNumber,
      licenseExpiryDate: client.licenseExpiryDate ?? "",
      personAddress: client.personAddress ?? "",
      idCopyNumber: client.idCopyNumber ?? "",
      licenseIssuePlace: client.licenseIssuePlace ?? "",
      borderNumber: client.borderNumber ?? "",
    });
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setDraft(null);
  }

  async function saveEditing() {
    if (!draft || !client) return;
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
          beneficiaryIdNumber: draft.idNumber,
          birthDate: draft.birthDate || undefined,
          hijriBirthDate: draft.hijriBirthDate || undefined,
          email: draft.email || undefined,
          isHijriBirthDate: !draft.birthDate,
        };
      } else if (isIqama) {
        updatePayload.residence = {
          beneficiaryIdNumber: draft.idNumber,
          birthDate: draft.birthDate || undefined,
          email: draft.email || undefined,
          isHijriBirthDate: false,
        };
      } else if (isPassport) {
        updatePayload.visitor = {
          email: draft.email || undefined,
          birthDate: draft.birthDate || undefined,
          borderNumber: draft.borderNumber || undefined,
          passportNumber: draft.idNumber,
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
          beneficiaryIdNumber: draft.idNumber,
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

      await customerService.update(Number(client.id), updatePayload);
      customerEvents.reload();

      setClient((prev) => prev && {
        ...prev,
        ...draft,
      });
      setEditing(false);
      setDraft(null);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2200);
    } catch (err) {
      console.error("Error updating customer:", err);
      alert(T("Failed to save customer. Please check the fields and try again.", "فشل حفظ بيانات العميل. يرجى التحقق من الحقول والمحاولة مرة أخرى.", ar));
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
        { key: "idNumber", labelEn: "Beneficiary ID No.", labelAr: "رقم هوية المستفيد", required: true, type: "text", value: d.idNumber, onChange: (v) => updateDraft("idNumber", v) },
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
        { key: "idNumber", labelEn: "Beneficiary ID No.", labelAr: "رقم هوية المستفيد", required: true, type: "text", value: d.idNumber, onChange: (v) => updateDraft("idNumber", v) },
        addressField,
        { key: "birthDate", labelEn: "Date of Birth", labelAr: "تاريخ الميلاد", required: true, type: "date", value: d.birthDate ?? "", onChange: (v) => updateDraft("birthDate", v) },
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
      { key: "passportNumber", labelEn: "Passport No.", labelAr: "رقم الجواز", required: true, type: "text", value: d.idNumber, onChange: (v) => updateDraft("idNumber", v) },
      { key: "birthDate", labelEn: "Date of Birth", labelAr: "تاريخ الميلاد", required: true, type: "date", value: d.birthDate ?? "", onChange: (v) => updateDraft("birthDate", v) },
      { key: "licenseNumber", labelEn: "License No.", labelAr: "رقم الرخصة", required: true, type: "text", value: d.licenseNumber, onChange: (v) => updateDraft("licenseNumber", v) },
      { key: "licenseExpiry", labelEn: "License Expiry Date", labelAr: "تاريخ انتهاء الرخصة", required: true, type: "date", value: d.licenseExpiryDate ?? "", onChange: (v) => updateDraft("licenseExpiryDate", v) },
      { key: "licenseIssuePlace", labelEn: "License Issue Place", labelAr: "مكان إصدار الرخصة", required: true, type: "text", value: d.licenseIssuePlace ?? "", onChange: (v) => updateDraft("licenseIssuePlace", v) },
      { key: "country", labelEn: "Country", labelAr: "الدولة", required: true, type: "text", value: d.nationality ?? "", onChange: (v) => updateDraft("nationality", v) },
      idCopyNumberField,
      { key: "idExpiry", labelEn: "ID Expiry Date", labelAr: "تاريخ انتهاء الهوية", required: true, type: "date", value: d.idExpiryDate ?? "", onChange: (v) => updateDraft("idExpiryDate", v) },
    ];
  }

  const canCreateContract = !client.blacklisted && client.kycStatus === "verified";

  const outstandingDebt = (client.debts ?? []).reduce((sum, d) => sum + (d.status !== "paid" ? d.amount : 0), 0);

  const previousContracts = client.history.filter((h) => h.status !== "active" && h.status !== "pending");
  const activeContracts = client.history.filter((h) => h.status === "active" || h.status === "pending");

  const birthDateStr = client.hijriBirthDate
    ? `${String(client.hijriBirthDate).slice(0, 4)}/${String(client.hijriBirthDate).slice(4, 6)}/${String(client.hijriBirthDate).slice(6, 8)} هـ`
    : client.birthDate
      ? `${client.birthDate} م`
      : T("Not provided", "غير مسجل", ar);

  const contactRows: [string, React.ReactNode, React.ReactNode][] = [
    [
      T("Mobile phone", "رقم الجوال", ar),
      <div key="phone-val" className="flex items-center gap-2">
        <span dir="ltr" className="inline-block whitespace-nowrap" style={{ unicodeBidi: "embed" }}>
          {formatPhone(client.phone)}
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
      client.email ? (
        <div key="email-val" className="flex items-center gap-2">
          <span>{client.email}</span>
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

  // Identity & License — includes the per-type fields (ID copy no., license issue
  // place, border no.) only when the customer's ID type actually has them, mirroring
  // the new-contract flow's identity form.
  const identityRows: [string, React.ReactNode, React.ReactNode][] = [
    [T("Identity Type", "نوع الإثبات", ar), client.idType === "Passport" ? T("Visitor", "زائر", ar) : client.idType, <CreditCard key="t" size={13} className="text-mk-ink-400 shrink-0" />],
    [T(client.idType === "Passport" ? "Passport No." : "Identity Number", client.idType === "Passport" ? "رقم الجواز" : "رقم الإثبات", ar), client.idNumber, <CreditCard key="n" size={13} className="text-mk-ink-400 shrink-0" />],
    ...(client.idType === "Passport" ? [[T("Border No.", "رقم الحدود", ar), client.borderNumber || T("Not provided", "غير مسجل", ar), <CreditCard key="bn" size={13} className="text-mk-ink-400 shrink-0" />] as [string, React.ReactNode, React.ReactNode]] : []),
    [T("ID Expiry Date", "انتهاء الهوية", ar), client.idExpiryDate || T("Not provided", "غير مسجل", ar), <Calendar key="ie" size={13} className="text-mk-ink-400 shrink-0" />],
    [T("Date of Birth", "تاريخ الميلاد", ar), birthDateStr, <Calendar key="b" size={13} className="text-mk-ink-400 shrink-0" />],
    [T("Nationality", "الجنسية", ar), client.nationality || T("Not provided", "غير مسجل", ar), <MapPin key="nat" size={13} className="text-mk-ink-400 shrink-0" />],
    ...(client.idType === "GCC ID" || client.idType === "Passport" ? [[T("ID Copy No.", "رقم نسخة الهوية", ar), client.idCopyNumber || T("Not provided", "غير مسجل", ar), <CreditCard key="icn" size={13} className="text-mk-ink-400 shrink-0" />] as [string, React.ReactNode, React.ReactNode]] : []),
    [T("Driving License", "رقم رخصة القيادة", ar), client.licenseNumber, <FileText key="l" size={13} className="text-mk-ink-400 shrink-0" />],
    [T("License Expiry", "انتهاء الرخصة", ar), client.licenseExpiryDate || T("Not provided", "غير مسجل", ar), <Calendar key="le" size={13} className="text-mk-ink-400 shrink-0" />],
    ...(client.idType === "GCC ID" || client.idType === "Passport" ? [[T("License Issue Place", "مكان إصدار الرخصة", ar), client.licenseIssuePlace || T("Not provided", "غير مسجل", ar), <MapPin key="lip" size={13} className="text-mk-ink-400 shrink-0" />] as [string, React.ReactNode, React.ReactNode]] : []),
  ];

  const addressRows: [string, React.ReactNode, React.ReactNode][] = [
    [T("Address", "العنوان الوطني", ar), client.personAddress || T("Not provided", "غير مسجل", ar), <MapPin key="a" size={13} className="text-mk-ink-400 shrink-0" />],
    [T("Registration date", "تاريخ التسجيل", ar), client.joinDate, <Calendar key="j" size={13} className="text-mk-ink-400 shrink-0" />],
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Saved toast */}
      {savedToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full text-white mk-label shadow-2xl flex items-center gap-2 bg-mk-midnight">
          <Check size={14} /> {T("Customer profile saved", "تم حفظ بيانات العميل", ar)}
        </div>
      )}

      {/* Back nav */}
      <div className="flex items-center gap-3">
        <Link href={listHref} className="w-9 h-9 rounded-full flex items-center justify-center bg-white shadow-[var(--shadow-card)] text-mk-ink-600 no-underline hover:bg-mk-ink-50 transition-colors">
          {ar ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Link>
        <span className="mk-body-sm text-mk-ink-500">{T("Back to Customers", "العودة إلى العملاء", ar)}</span>
        <div className="flex-1" />
        {canCreateContract && (
          <Link
            href={`/employee/new-contract?clientId=${client.id}`}
            className="flex items-center gap-2 px-4 py-3 rounded-full mk-label text-white bg-mk-blue-500 no-underline shadow-[var(--shadow-glow-blue)]"
          >
            <FileSignature size={14} /> {T("Create contract", "إنشاء عقد", ar)}
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: profile + verification */}
        <div className="rounded-xl p-6 mk-surface">
          <div className="flex items-center gap-3">
            <Avatar name={ar ? client.nameAr : client.name} size="lg" className={client.blacklisted ? "grayscale opacity-50" : ""} />
            <div>
              <div className="mk-body leading-tight text-mk-ink-900">{ar ? client.nameAr : client.name}</div>
              <div className="flex gap-2 mt-2 flex-wrap">
                {client.blacklisted ? (
                  <Badge variant="danger" dot>{T("Blacklisted", "قائمة سوداء", ar)}</Badge>
                ) : phoneVerified || emailVerified ? (
                  <Badge variant="success" dot>{T("Verified", "موثّق", ar)}</Badge>
                ) : (
                  <Badge variant="warning" dot>{T("Awaiting Verification", "بانتظار التحقق", ar)}</Badge>
                )}
                {client.rating > 0 && (
                  <span className="flex items-center gap-1 mk-caption text-mk-warning">
                    <Star size={12} className="fill-current" /> {client.rating}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Profile attributes */}
          <div className="flex items-center justify-between mt-4 mb-2">
            <span className="mk-overline uppercase tracking-wider text-mk-ink-500">{T("Profile details", "بيانات العميل", ar)}</span>
            {!editing ? (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={startEditing}>
                  <Pencil size={12} /> {T("Edit", "تعديل", ar)}
                </Button>
                {!client.blacklisted && (
                  <Button variant="ghost" size="sm" className="text-mk-warning hover:bg-mk-warning/10" onClick={() => setShowBlacklistModal(true)}>
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
                    onChange={(e) => updateDraft("idType", e.target.value)}
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
          {client.blacklisted && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-mk-ink-100 mk-caption text-mk-danger">
              <Ban size={13} />{T("This customer is restricted from new bookings", "هذا العميل موقوف عن الحجوزات الجديدة", ar)}
            </div>
          )}        </div>

        {/* Right: contract history */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl p-6 mk-surface">
            <div className="flex items-center justify-between mb-3">
              <div className="mk-h4 text-mk-ink-900">{T("Contracts", "العقود", ar)}</div>
              <span className="mk-overline uppercase text-mk-ink-400">{T(`${client.history.length} on file`, `${client.history.length} سجل`, ar)}</span>
            </div>
            {client.history.length === 0 ? (
              <p className="mk-caption p-3 text-center bg-mk-ink-50 rounded-md text-mk-ink-400">
                {T("No rental contracts on file yet", "لا يوجد عقود تأجير مسجلة بعد لهذا العميل", ar)}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {[...activeContracts, ...previousContracts].map((h) => (
                  <ContractRow
                    key={h.id}
                    h={h}
                    ar={ar}
                    expanded={expandedContract === h.id}
                    onToggle={() => setExpandedContract((cur) => (cur === h.id ? null : h.id))}
                    repeatCount={client.history.filter((item) => item.car === h.car).length}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Claims & Debts */}
          <div className="rounded-xl p-6 mk-surface flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="mk-h4 text-mk-ink-900">{T("Claims & Debts", "المطالبات والمديونيات", ar)}</div>
              {outstandingDebt > 0 && (
                <span className="mk-label text-mk-danger">
                  {T(`${outstandingDebt} SAR outstanding`, `${outstandingDebt} ريال مستحق`, ar)}
                </span>
              )}
            </div>
            {client.debts && client.debts.length > 0 ? (
              <div className="flex flex-col gap-2">
                {client.debts.map((d) => (
                  <div key={d.id} className="p-3 rounded-xl border border-mk-ink-100 bg-mk-ink-50/50 flex flex-col gap-2 text-start">
                    <div className="flex justify-between items-center mk-caption">
                      <div className="flex flex-col gap-1">
                        <span className="mk-label text-mk-ink-900">{ar ? d.typeAr : d.type}</span>
                        <span className={`mk-overline ${d.office === "Maarkbh" ? "text-mk-blue-500" : "text-mk-warning"}`}>
                          {ar ? d.officeAr : d.office}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="mk-label text-mk-blue-600">{d.amount} {T("SAR", "ريال", ar)}</span>
                        <Badge variant={DEBT_BADGE[d.status].variant} className="mk-overline px-2 py-0">
                          {T(...DEBT_BADGE[d.status].label, ar)}
                        </Badge>
                      </div>
                    </div>
                    <p className="mk-overline text-mk-ink-500 m-0 leading-relaxed">{ar ? d.notesAr : d.notes}</p>
                    <div className="mk-overline text-mk-ink-400 text-end">
                      {d.date}{d.dueDate ? ` · ${T("due", "الاستحقاق", ar)} ${d.dueDate}` : ""}{d.contractRef ? ` · ${d.contractRef}` : ""} · {d.id}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-xl border border-mk-success/20 bg-mk-success/5 mk-caption text-mk-success">
                <CheckCircle2 size={13} className="shrink-0" />
                <span>{T("No outstanding claims or debts on file", "لا توجد مطالبات أو مديونيات مستحقة", ar)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Blacklist confirmation modal */}
      <Modal open={showBlacklistModal} onClose={() => !isBlacklisting && setShowBlacklistModal(false)} variant="centered" size="sm" title={T("Blacklist customer?", "إضافة إلى القائمة السوداء؟", ar)}>
        <div className="flex flex-col gap-5 p-2">
          <p className="mk-body text-mk-ink-700">
            {T(
              `Are you sure you want to blacklist ${client?.name || client?.nameAr || "this customer"}? They will be restricted from new bookings.`,
              `هل أنت متأكد من إضافة ${client?.nameAr || client?.name || "هذا العميل"} إلى القائمة السوداء؟ سيتم منعهم من الحجوزات الجديدة.`,
              ar
            )}
          </p>
          <div className="flex flex-col gap-2">
            <label className="mk-caption text-mk-ink-700">{T("Reason (optional)", "السبب (اختياري)", ar)}</label>
            <input
              type="text"
              className="px-3 h-10 rounded-md mk-body-sm outline-none bg-white border border-mk-ink-200 text-mk-ink-900 focus:border-mk-blue-500 focus:shadow-[0_0_0_3px_rgba(65,113,226,0.15)] transition-all w-full"
              placeholder={T("Enter reason...", "أدخل السبب...", ar)}
              value={blacklistReason}
              onChange={(e) => setBlacklistReason(e.target.value)}
              disabled={isBlacklisting}
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => { setShowBlacklistModal(false); setBlacklistReason(""); }} disabled={isBlacklisting}>
              {T("Cancel", "إلغاء", ar)}
            </Button>
            <Button variant="danger" size="sm" onClick={handleBlacklist} disabled={isBlacklisting}>
              {isBlacklisting ? <><Loader2 size={13} className="animate-spin" /> {T("Adding...", "جارٍ الإضافة...", ar)}</> : <><Ban size={13} /> {T("Blacklist", "إضافة", ar)}</>}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} variant="centered" size="sm" title={T("Delete customer?", "حذف العميل؟", ar)}>
        <div className="flex flex-col gap-5 p-2">
          <p className="mk-body text-mk-ink-700">
            {T(
              `Are you sure you want to delete ${client?.name || client?.nameAr || "this customer"}? This action cannot be undone.`,
              `هل أنت متأكد من حذف ${client?.nameAr || client?.name || "هذا العميل"}؟ لا يمكن التراجع عن هذا الإجراء.`,
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

function ContractRow({ h, ar, expanded, onToggle, repeatCount = 0 }: { h: ClientContract; ar: boolean; expanded: boolean; onToggle: () => void; repeatCount?: number }) {
  const days = 3;
  const total = h.rate * days;
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
            <Badge variant={HISTORY_BADGE[h.status].variant} className="mk-overline px-2 mt-1">
              {T(...HISTORY_BADGE[h.status].label, ar)}
            </Badge>
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
            <div className="flex justify-between items-center pt-1"><span className="text-mk-ink-500">{T("Status", "الحالة", ar)}</span><Badge variant={HISTORY_BADGE[h.status].variant} className="mk-overline px-2">{T(...HISTORY_BADGE[h.status].label, ar)}</Badge></div>
          </div>
        </div>
      </div>
    </div>
  );
}
