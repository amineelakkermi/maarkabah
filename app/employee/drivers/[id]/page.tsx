"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight, ChevronLeft, ChevronDown, Phone, CreditCard, FileText,
  Calendar, Star, Ban, Mail, MapPin, Pencil, Check, X as XIcon,
} from "lucide-react";
import { Avatar, Badge, HijriDatePicker, Button, Select } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { MOCK_DRIVERS, type DriverProfile } from "@/lib/data";
import { OtpVerificationPanel } from "@/components/employee/OtpVerification";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

const HISTORY_BADGE: Record<string, { variant: "success" | "warning" | "neutral" | "danger" | "info"; label: [string, string] }> = {
  active: { variant: "info", label: ["Active", "نشط"] },
  pending: { variant: "warning", label: ["Pending", "معلق"] },
  completed: { variant: "success", label: ["Completed", "مكتمل"] },
  expired: { variant: "neutral", label: ["Expired", "منتهي"] },
  cancelled: { variant: "danger", label: ["Cancelled", "ملغي"] },
};

type EditableFields = Pick<DriverProfile,
  "name" | "nameAr" | "phone" | "email" | "idType" | "nationalId" | "idExpiryDate" |
  "birthDate" | "nationality" | "licenseNumber" | "licenseExpiryDate" | "personAddress" |
  "idCopyNumber" | "licenseIssuePlace" | "borderNumber"
>;

// Required field set per identity type — mirrors the new-contract flow's
// per-type identity form so editing here uses the exact same fields.
type IdentityFieldDef = {
  key: string; labelEn: string; labelAr: string; required: boolean;
  type: "text" | "date" | "email" | "hijri"; value: string; onChange: (v: string) => void;
};

export default function DriverDetailPage() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const params = useParams();
  const id = params.id as string;

  const initialDriver = MOCK_DRIVERS.find((d) => d.id === id) ?? null;
  const [driver, setDriver] = useState<DriverProfile | null>(initialDriver);
  const [expandedContract, setExpandedContract] = useState<string | null>(null);
  const [phoneVerified, setPhoneVerified] = useState(initialDriver?.status === "verified");
  const [emailVerified, setEmailVerified] = useState(initialDriver?.status === "verified");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EditableFields | null>(null);
  const [savedToast, setSavedToast] = useState(false);

  if (!driver) {
    return (
      <div className="py-24 text-center">
        <div className="mk-display mb-3">🪪</div>
        <div className="mk-body mb-2 text-mk-ink-900">{T("Driver not found", "السائق غير موجود", ar)}</div>
        <Link href="/employee/drivers" className="mk-body-sm text-mk-blue-500 no-underline">{T("← Back", "→ العودة", ar)}</Link>
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
      birthDate: driver.birthDate ?? (driver.hijriBirthDate ? String(driver.hijriBirthDate) : ""),
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

  function saveEditing() {
    if (!draft) return;
    const isSaudi = draft.idType === "Saudi ID";
    setDriver((prev) => prev && {
      ...prev,
      ...draft,
      hijriBirthDate: isSaudi && draft.birthDate ? parseInt(draft.birthDate) : undefined,
      birthDate: isSaudi ? undefined : draft.birthDate,
    });
    setEditing(false);
    setDraft(null);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2200);
  }

  function updateDraft<K extends keyof EditableFields>(key: K, value: EditableFields[K]) {
    setDraft((prev) => prev && { ...prev, [key]: value });
  }

  function identityFieldsFor(d: EditableFields): IdentityFieldDef[] {
    const addressField: IdentityFieldDef = { key: "address", labelEn: "Address", labelAr: "العنوان", required: true, type: "text", value: d.personAddress ?? "", onChange: (v) => updateDraft("personAddress", v) };
    const idCopyNumberField: IdentityFieldDef = { key: "idCopyNumber", labelEn: "ID Copy No.", labelAr: "رقم نسخة الهوية", required: true, type: "text", value: d.idCopyNumber ?? "", onChange: (v) => updateDraft("idCopyNumber", v) };

    if (d.idType === "Saudi ID" || d.idType === "Iqama") {
      return [
        { key: "idNumber", labelEn: "Beneficiary ID No.", labelAr: "رقم هوية المستفيد", required: true, type: "text", value: d.nationalId, onChange: (v) => updateDraft("nationalId", v) },
        addressField,
        {
          key: "birthDate",
          labelEn: d.idType === "Saudi ID" ? "Date of Birth (Hijri)" : "Date of Birth",
          labelAr: d.idType === "Saudi ID" ? "تاريخ الميلاد (هجري)" : "تاريخ الميلاد",
          required: true,
          type: d.idType === "Saudi ID" ? "hijri" : "date",
          value: d.birthDate ?? "",
          onChange: (v) => updateDraft("birthDate", v),
        },
      ];
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
        <span>{driver.phone}</span>
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
        <Link href="/employee/drivers" className="w-9 h-9 rounded-full flex items-center justify-center bg-white shadow-[var(--shadow-card)] text-mk-ink-600 no-underline hover:bg-mk-ink-50 transition-colors">
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
                ) : phoneVerified || emailVerified ? (
                  <Badge variant="success" dot>{T("Verified", "موثّق", ar)}</Badge>
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
              <Button variant="ghost" size="sm" onClick={startEditing}>
                <Pencil size={12} /> {T("Edit", "تعديل", ar)}
              </Button>
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
                  isRtl={ar}
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
                    repeatCount={(driver.history ?? []).filter((item) => item.car === h.car).length}
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
                    repeatCount={(driver.history ?? []).filter((item) => item.car === h.car).length}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
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
          className={`px-3 h-10 rounded-md mk-body-sm outline-none bg-white border border-mk-ink-200 text-mk-ink-900 w-full ${mono ? "font-mono" : ""}`}
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
