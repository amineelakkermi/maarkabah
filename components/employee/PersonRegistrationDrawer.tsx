"use client";

import { useState } from "react";
import { UserPlus, CheckCircle } from "lucide-react";
import { HijriDatePicker, Select, Input, Button, Drawer, DrawerHeader, DrawerFooter } from "@/components/ui";
import { transliterateArabicName } from "@/lib/transliterate";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

export interface NewPersonProfile {
  name: string;
  nameAr: string;
  phone: string;
  idType: "Saudi ID" | "Iqama" | "Passport" | "GCC ID";
  idNumber: string;
  idExpiryDate?: string;
  birthDate?: string;
  hijriBirthDate?: number;
  nationality?: string;
  personAddress?: string;
  idCopyNumber?: string;
  licenseIssuePlace?: string;
  borderNumber?: string;
  licenseNumber?: string;
  licenseExpiryDate?: string;
  email?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (p: NewPersonProfile) => void;
  ar: boolean;
  titleEn: string;
  titleAr: string;
  submitLabelEn: string;
  submitLabelAr: string;
  /** Restricts the "ID Type" options — e.g. an authorized driver must hold a national ID or Iqama. Defaults to all types. */
  allowedIdTypes?: NewPersonProfile["idType"][];
}

type FieldDef = {
  key: string; labelEn: string; labelAr: string; required: boolean;
  type: "text" | "date" | "email" | "hijri"; value: string; onChange: (v: string) => void;
};

// Mirrors the identity-field logic in app/employee/customer/page.tsx exactly, so
// registering a person from the new-contract flow shows the same modal and fields.
const ALL_ID_TYPES: NewPersonProfile["idType"][] = ["Saudi ID", "Iqama", "Passport", "GCC ID"];

const ID_TYPE_LABELS: Record<NewPersonProfile["idType"], { en: string; ar: string }> = {
  "Saudi ID": { en: "National ID", ar: "هوية وطنية" },
  "Iqama": { en: "Iqama", ar: "إقامة" },
  "Passport": { en: "Visitor", ar: "زائر" },
  "GCC ID": { en: "GCC ID", ar: "هوية خليجية" },
};

export function PersonRegistrationDrawer({ open, onClose, onCreate, ar, titleEn, titleAr, submitLabelEn, submitLabelAr, allowedIdTypes = ALL_ID_TYPES }: Props) {
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  // Tracks whether the employee typed the English name by hand — once they
  // do, auto-transliteration from Arabic stops overwriting their edit.
  const [englishNameEdited, setEnglishNameEdited] = useState(false);
  const [phone, setPhone] = useState("");
  const [idType, setIdType] = useState<NewPersonProfile["idType"]>(allowedIdTypes[0]);
  const [idNumber, setIdNumber] = useState("");
  const [nationality, setNationality] = useState("Saudi");
  const [idExpiry, setIdExpiry] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [hijriBirthDate, setHijriBirthDate] = useState("");
  const [license, setLicense] = useState("");
  const [licenseExpiry, setLicenseExpiry] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [idCopyNumber, setIdCopyNumber] = useState("");
  const [licenseIssuePlace, setLicenseIssuePlace] = useState("");
  const [borderNumber, setBorderNumber] = useState("");
  const [added, setAdded] = useState(false);

  function identityFields(): FieldDef[] {
    const addressField: FieldDef = { key: "address", labelEn: "Address", labelAr: "العنوان", required: true, type: "text", value: address, onChange: setAddress };
    const idCopyNumberField: FieldDef = { key: "idCopyNumber", labelEn: "ID Copy No.", labelAr: "رقم نسخة الهوية", required: true, type: "text", value: idCopyNumber, onChange: setIdCopyNumber };

    if (idType === "Saudi ID" || idType === "Iqama") {
      return [
        { key: "idNumber", labelEn: "Beneficiary ID No.", labelAr: "رقم هوية المستفيد", required: true, type: "text", value: idNumber, onChange: setIdNumber },
        addressField,
        {
          key: "birthDate",
          labelEn: idType === "Saudi ID" ? "Date of Birth (Hijri)" : "Date of Birth",
          labelAr: idType === "Saudi ID" ? "تاريخ الميلاد (هجري)" : "تاريخ الميلاد",
          required: true,
          type: idType === "Saudi ID" ? "hijri" : "date",
          value: idType === "Saudi ID" ? hijriBirthDate : birthDate,
          onChange: idType === "Saudi ID" ? setHijriBirthDate : setBirthDate,
        },
        { key: "email", labelEn: "Email (optional)", labelAr: "البريد الإلكتروني (غير إلزامي)", required: false, type: "email", value: email, onChange: setEmail },
      ];
    }
    if (idType === "GCC ID") {
      return [
        { key: "idNumber", labelEn: "Beneficiary ID No.", labelAr: "رقم هوية المستفيد", required: true, type: "text", value: idNumber, onChange: setIdNumber },
        addressField,
        { key: "licenseNumber", labelEn: "License No.", labelAr: "رقم الرخصة", required: true, type: "text", value: license, onChange: setLicense },
        { key: "idExpiry", labelEn: "ID Expiry Date", labelAr: "تاريخ انتهاء الهوية", required: true, type: "date", value: idExpiry, onChange: setIdExpiry },
        { key: "licenseIssuePlace", labelEn: "License Issue Place", labelAr: "مكان إصدار الرخصة", required: true, type: "text", value: licenseIssuePlace, onChange: setLicenseIssuePlace },
        { key: "email", labelEn: "Email", labelAr: "البريد الإلكتروني", required: true, type: "email", value: email, onChange: setEmail },
        { key: "country", labelEn: "Country", labelAr: "الدولة", required: true, type: "text", value: nationality, onChange: setNationality },
        idCopyNumberField,
        { key: "licenseExpiry", labelEn: "License Expiry Date", labelAr: "تاريخ انتهاء الرخصة", required: true, type: "date", value: licenseExpiry, onChange: setLicenseExpiry },
      ];
    }
    // Passport / Visitor — no "Beneficiary ID No." field; identity is border/passport number instead
    return [
      addressField,
      { key: "borderNumber", labelEn: "Border No.", labelAr: "رقم الحدود", required: true, type: "text", value: borderNumber, onChange: setBorderNumber },
      { key: "passportNumber", labelEn: "Passport No.", labelAr: "رقم الجواز", required: true, type: "text", value: idNumber, onChange: setIdNumber },
      { key: "licenseNumber", labelEn: "License No.", labelAr: "رقم الرخصة", required: true, type: "text", value: license, onChange: setLicense },
      { key: "licenseExpiry", labelEn: "License Expiry Date", labelAr: "تاريخ انتهاء الرخصة", required: true, type: "date", value: licenseExpiry, onChange: setLicenseExpiry },
      { key: "licenseIssuePlace", labelEn: "License Issue Place", labelAr: "مكان إصدار الرخصة", required: true, type: "text", value: licenseIssuePlace, onChange: setLicenseIssuePlace },
      { key: "email", labelEn: "Email", labelAr: "البريد الإلكتروني", required: true, type: "email", value: email, onChange: setEmail },
      { key: "country", labelEn: "Country", labelAr: "الدولة", required: true, type: "text", value: nationality, onChange: setNationality },
      idCopyNumberField,
      { key: "idExpiry", labelEn: "ID Expiry Date", labelAr: "تاريخ انتهاء الهوية", required: true, type: "date", value: idExpiry, onChange: setIdExpiry },
    ];
  }

  function isInvalid() {
    if (!nameAr || !phone) return true;
    return identityFields().some((f) => f.required && !f.value);
  }

  function reset() {
    setName(""); setNameAr(""); setEnglishNameEdited(false); setPhone(""); setIdType(allowedIdTypes[0]); setIdNumber("");
    setNationality("Saudi"); setIdExpiry(""); setBirthDate(""); setHijriBirthDate("");
    setLicense(""); setLicenseExpiry(""); setEmail(""); setAddress("");
    setIdCopyNumber(""); setLicenseIssuePlace(""); setBorderNumber("");
  }

  function handleSubmit() {
    if (isInvalid()) return;
    const profile: NewPersonProfile = {
      name: name || transliterateArabicName(nameAr),
      nameAr,
      phone: phone.startsWith("+") ? phone : `+966 ${phone}`,
      idType,
      idNumber,
      idExpiryDate: idExpiry || undefined,
      birthDate: idType === "Saudi ID" ? undefined : (birthDate || undefined),
      hijriBirthDate: idType === "Saudi ID" && hijriBirthDate ? parseInt(hijriBirthDate) : undefined,
      nationality: idType === "Saudi ID" ? "سعودي" : (nationality === "Saudi" ? "سعودي" : nationality),
      personAddress: address || undefined,
      idCopyNumber: idCopyNumber || undefined,
      licenseIssuePlace: licenseIssuePlace || undefined,
      borderNumber: borderNumber || undefined,
      licenseNumber: license || undefined,
      licenseExpiryDate: licenseExpiry || undefined,
      email: email || undefined,
    };
    setAdded(true);
    setTimeout(() => {
      onCreate(profile);
      setAdded(false);
      reset();
      onClose();
    }, 700);
  }

  const invalid = isInvalid();

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="flex flex-col justify-between h-full max-w-[480px] overflow-y-auto">
        <div>
          <DrawerHeader title={T(titleEn, titleAr, ar)} onClose={onClose} className="mb-0 pb-4 border-b border-mk-border" />

          <div className="flex flex-col gap-4 mt-5">
            <Input
              variant="muted"
              dir="rtl"
              label={<>{T("Full name (Arabic)", "الاسم الكامل (عربي)", ar)} <span className="text-mk-danger">*</span></>}
              placeholder="مثال: أحمد المطيري"
              value={nameAr}
              onChange={(e) => {
                const v = e.target.value;
                setNameAr(v);
                if (!englishNameEdited) setName(transliterateArabicName(v));
              }}
            />
            <Input
              variant="muted"
              label={T("Full name (English, optional)", "الاسم الكامل (إنجليزي، اختياري)", ar)}
              placeholder="e.g. Ahmed Al-Mutairi"
              value={name}
              onChange={(e) => {
                const v = e.target.value;
                setName(v);
                setEnglishNameEdited(v !== "");
              }}
            />
            <Input
              variant="muted"
              type="tel"
              className="font-mono"
              label={<>{T("Phone number", "رقم الهاتف", ar)} <span className="text-mk-danger">*</span></>}
              placeholder="e.g. +966 50 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <div className="flex flex-col gap-2">
              <label className="mk-caption text-mk-ink-700">{T("ID Type", "نوع الهوية", ar)}</label>
              <Select
                value={idType}
                onChange={(e) => {
                  const v = e.target.value as NewPersonProfile["idType"];
                  setIdType(v);
                  if (v === "Saudi ID") setNationality("Saudi");
                }}
              >
                {allowedIdTypes.map((t) => (
                  <option key={t} value={t}>{T(ID_TYPE_LABELS[t].en, ID_TYPE_LABELS[t].ar, ar)}</option>
                ))}
              </Select>
            </div>

            {identityFields().map((f) => (
              f.type === "hijri" ? (
                <div key={f.key} className="flex flex-col gap-2">
                  <label className="mk-caption text-mk-ink-700">
                    {T(f.labelEn, f.labelAr, ar)} {f.required && <span className="text-mk-danger">*</span>}
                  </label>
                  <HijriDatePicker value={f.value} onChange={f.onChange} ar={ar} />
                </div>
              ) : (
                <Input
                  key={f.key}
                  variant="muted"
                  className="font-mono"
                  type={f.type}
                  label={<>{T(f.labelEn, f.labelAr, ar)} {f.required && <span className="text-mk-danger">*</span>}</>}
                  value={f.value}
                  onChange={(e) => f.onChange(e.target.value)}
                />
              )
            ))}
          </div>
        </div>

        <DrawerFooter className="mt-4 pt-4 border-t border-mk-border justify-stretch">
          <Button variant="outline" onClick={onClose}>
            {T("Cancel", "إلغاء", ar)}
          </Button>
          <Button
            variant="primary"
            disabled={invalid}
            onClick={handleSubmit}
            className={`flex-1 ${added ? "bg-mk-mint-500 hover:bg-mk-mint-500" : ""}`}
          >
            {added ? (<><CheckCircle size={16} /> {T("Added!", "تمت الإضافة!", ar)}</>) : (<><UserPlus size={16} /> {T(submitLabelEn, submitLabelAr, ar)}</>)}
          </Button>
        </DrawerFooter>
      </div>
    </Drawer>
  );
}
