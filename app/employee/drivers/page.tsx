"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search, UserPlus, ChevronRight, CheckCircle, Phone, CreditCard,
  X, User,
} from "lucide-react";
import { Avatar, Badge, HijriDatePicker, Button, Input, Select, Drawer, DrawerHeader, DrawerFooter, IconButton } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { MOCK_DRIVERS, type DriverProfile } from "@/lib/data";
import { transliterateArabicName } from "@/lib/transliterate";

const T = (en: string, ar: string, isAr: boolean) => isAr ? ar : en;

const STATUS_BADGE: Record<string, { variant: "success" | "warning" | "neutral" | "danger"; label: [string, string] }> = {
  verified: { variant: "success", label: ["Verified", "موثّق"] },
  pending: { variant: "warning", label: ["Pending KYC", "قيد التحقق"] },
  new: { variant: "neutral", label: ["New", "جديد"] },
  rejected: { variant: "danger", label: ["Rejected", "مرفوض"] },
};

export default function DriversListPage() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";

  const [drivers, setDrivers] = useState<DriverProfile[]>(MOCK_DRIVERS);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  // Add driver form state
  const [newName, setNewName] = useState("");
  const [newNameAr, setNewNameAr] = useState("");
  // Tracks whether the employee typed the English name by hand — once they
  // do, auto-transliteration from Arabic stops overwriting their edit.
  const [englishNameEdited, setEnglishNameEdited] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newId, setNewId] = useState("");
  const [newIdType, setNewIdType] = useState<"Saudi ID" | "Iqama" | "Passport" | "GCC ID">("Saudi ID");
  const [newLicense, setNewLicense] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newBirthDate, setNewBirthDate] = useState("");
  const [newHijriBirthDate, setNewHijriBirthDate] = useState("");
  const [newIdExpiry, setNewIdExpiry] = useState("");
  const [newLicenseExpiry, setNewLicenseExpiry] = useState("");
  const [newNationality, setNewNationality] = useState("Saudi");
  const [newIdCopyNumber, setNewIdCopyNumber] = useState("");
  const [newLicenseIssuePlace, setNewLicenseIssuePlace] = useState("");
  const [newBorderNumber, setNewBorderNumber] = useState("");
  const [added, setAdded] = useState(false);

  // Required field set per identity type — mirrors the new-contract flow's
  // per-type identity form so registering a driver uses the exact same fields.
  type IdentityFieldDef = {
    key: string; labelEn: string; labelAr: string; required: boolean;
    type: "text" | "date" | "email" | "hijri"; value: string; onChange: (v: string) => void;
  };
  function newDriverIdentityFields(): IdentityFieldDef[] {
    const addressField: IdentityFieldDef = { key: "address", labelEn: "Address", labelAr: "العنوان", required: true, type: "text", value: newAddress, onChange: setNewAddress };
    const idCopyNumberField: IdentityFieldDef = { key: "idCopyNumber", labelEn: "ID Copy No.", labelAr: "رقم نسخة الهوية", required: true, type: "text", value: newIdCopyNumber, onChange: setNewIdCopyNumber };

    if (newIdType === "Saudi ID" || newIdType === "Iqama") {
      return [
        { key: "idNumber", labelEn: "Beneficiary ID No.", labelAr: "رقم هوية المستفيد", required: true, type: "text", value: newId, onChange: setNewId },
        addressField,
        { key: "birthDate", labelEn: newIdType === "Saudi ID" ? "Date of Birth (Hijri)" : "Date of Birth", labelAr: newIdType === "Saudi ID" ? "تاريخ الميلاد (هجري)" : "تاريخ الميلاد", required: true, type: newIdType === "Saudi ID" ? "hijri" : "date", value: newIdType === "Saudi ID" ? newHijriBirthDate : newBirthDate, onChange: newIdType === "Saudi ID" ? setNewHijriBirthDate : setNewBirthDate },
        { key: "email", labelEn: "Email (optional)", labelAr: "البريد الإلكتروني (غير إلزامي)", required: false, type: "email", value: newEmail, onChange: setNewEmail },
      ];
    }
    if (newIdType === "GCC ID") {
      return [
        { key: "idNumber", labelEn: "Beneficiary ID No.", labelAr: "رقم هوية المستفيد", required: true, type: "text", value: newId, onChange: setNewId },
        addressField,
        { key: "licenseNumber", labelEn: "License No.", labelAr: "رقم الرخصة", required: true, type: "text", value: newLicense, onChange: setNewLicense },
        { key: "idExpiry", labelEn: "ID Expiry Date", labelAr: "تاريخ انتهاء الهوية", required: true, type: "date", value: newIdExpiry, onChange: setNewIdExpiry },
        { key: "licenseIssuePlace", labelEn: "License Issue Place", labelAr: "مكان إصدار الرخصة", required: true, type: "text", value: newLicenseIssuePlace, onChange: setNewLicenseIssuePlace },
        { key: "email", labelEn: "Email", labelAr: "البريد الإلكتروني", required: true, type: "email", value: newEmail, onChange: setNewEmail },
        { key: "country", labelEn: "Country", labelAr: "الدولة", required: true, type: "text", value: newNationality, onChange: setNewNationality },
        idCopyNumberField,
        { key: "licenseExpiry", labelEn: "License Expiry Date", labelAr: "تاريخ انتهاء الرخصة", required: true, type: "date", value: newLicenseExpiry, onChange: setNewLicenseExpiry },
      ];
    }
    // Passport / Visitor — no "Beneficiary ID No." field; identity is border/passport number instead
    return [
      addressField,
      { key: "borderNumber", labelEn: "Border No.", labelAr: "رقم الحدود", required: true, type: "text", value: newBorderNumber, onChange: setNewBorderNumber },
      { key: "passportNumber", labelEn: "Passport No.", labelAr: "رقم الجواز", required: true, type: "text", value: newId, onChange: setNewId },
      { key: "licenseNumber", labelEn: "License No.", labelAr: "رقم الرخصة", required: true, type: "text", value: newLicense, onChange: setNewLicense },
      { key: "licenseExpiry", labelEn: "License Expiry Date", labelAr: "تاريخ انتهاء الرخصة", required: true, type: "date", value: newLicenseExpiry, onChange: setNewLicenseExpiry },
      { key: "licenseIssuePlace", labelEn: "License Issue Place", labelAr: "مكان إصدار الرخصة", required: true, type: "text", value: newLicenseIssuePlace, onChange: setNewLicenseIssuePlace },
      { key: "email", labelEn: "Email", labelAr: "البريد الإلكتروني", required: true, type: "email", value: newEmail, onChange: setNewEmail },
      { key: "country", labelEn: "Country", labelAr: "الدولة", required: true, type: "text", value: newNationality, onChange: setNewNationality },
      idCopyNumberField,
      { key: "idExpiry", labelEn: "ID Expiry Date", labelAr: "تاريخ انتهاء الهوية", required: true, type: "date", value: newIdExpiry, onChange: setNewIdExpiry },
    ];
  }

  const filtered = drivers.filter((d) => {
    const q = search.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.nameAr.includes(q) ||
      d.phone.includes(q) ||
      d.nationalId.includes(q) ||
      (d.lastBooking ?? "").toLowerCase().includes(q)
    );
  });

  function isDriverFormInvalid() {
    if (!newNameAr || !newPhone) return true;
    return newDriverIdentityFields().some((f) => f.required && !f.value);
  }

  function handleAdd() {
    if (isDriverFormInvalid()) return;

    const idTypeCodes: Record<string, 1 | 2 | 3 | 4> = {
      "Saudi ID": 1,
      "Iqama": 2,
      "Passport": 3,
      "GCC ID": 4
    };

    const newDriver: DriverProfile = {
      id: `D-${1000 + drivers.length + 1}`,
      name: newName || transliterateArabicName(newNameAr),
      nameAr: newNameAr,
      phone: newPhone.startsWith("+966") || newPhone.startsWith("+") ? newPhone : `+966 ${newPhone}`,
      idType: newIdType,
      idTypeCode: idTypeCodes[newIdType] ?? 1,
      nationalId: newId,
      licenseNumber: newLicense || `LIC-${Math.floor(10000 + Math.random() * 90000)}`,
      personAddress: newAddress || "Riyadh",
      email: newEmail || undefined,
      birthDate: newBirthDate || undefined,
      hijriBirthDate: newHijriBirthDate ? parseInt(newHijriBirthDate) : undefined,
      idExpiryDate: newIdExpiry || undefined,
      idCopyNumber: newIdCopyNumber || undefined,
      licenseIssuePlace: newLicenseIssuePlace || undefined,
      borderNumber: newBorderNumber || undefined,
      licenseExpiryDate: newLicenseExpiry || undefined,
      nationality: newIdType === "Saudi ID" ? "سعودي" : (newNationality === "Saudi" ? "سعودي" : newNationality),
      bookings: 0,
      status: "new",
      tajeerStatus: "not_verified",
      lastBooking: null,
      rating: null,
      blacklisted: false,
      joinDate: new Date().toISOString().split("T")[0],
      history: [],
    };

    setAdded(true);
    setTimeout(() => {
      setDrivers((prev) => [newDriver, ...prev]);
      setShowAdd(false);
      setAdded(false);
      setNewName("");
      setNewNameAr("");
      setEnglishNameEdited(false);
      setNewPhone("");
      setNewId("");
      setNewIdType("Saudi ID");
      setNewLicense("");
      setNewAddress("");
      setNewEmail("");
      setNewBirthDate("");
      setNewHijriBirthDate("");
      setNewIdExpiry("");
      setNewLicenseExpiry("");
      setNewNationality("Saudi");
      setNewIdCopyNumber("");
      setNewLicenseIssuePlace("");
      setNewBorderNumber("");
    }, 1400);
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 max-w-[400px]">
          <Input
            variant="search"
            icon={<Search size={14} />}
            placeholder={T("Search name, phone, ID, booking…", "ابحث باسم السائق، الهاتف، الهوية، أو الحجز…", ar)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            suffix={
              search && (
                <IconButton size="sm" variant="ghost" onClick={() => setSearch("")}>
                  <X size={13} />
                </IconButton>
              )
            }
          />
        </div>
        <div className="flex-1" />
        <Button variant="primary" onClick={() => setShowAdd(true)} className="shadow-[var(--shadow-glow-blue)]">
          <UserPlus size={15} />
          {T("Add driver", "إضافة سائق جديد", ar)}
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: T("Total drivers", "إجمالي السائقين", ar), value: drivers.length, color: "var(--color-mk-blue-500)" },
          { label: T("Verified", "موثّقون", ar), value: drivers.filter(c => c.status === "verified").length, color: "var(--color-mk-mint-500)" },
          { label: T("Pending", "قيد التحقق", ar), value: drivers.filter(c => c.status === "pending").length, color: "var(--color-mk-warning)" },
          { label: T("Blacklisted", "القائمة السوداء", ar), value: drivers.filter(c => c.blacklisted).length, color: "var(--color-mk-danger)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg px-5 py-4 mk-surface">
            <div className="mk-h2" style={{ color }}>{value}</div>
            <div className="mk-caption mt-1 text-mk-ink-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Drivers list */}
      <div className="rounded-xl overflow-hidden mk-surface">
        {/* Header */}
        <div
          className="grid px-5 py-3 mk-overline uppercase text-mk-ink-400 tracking-wider border-b border-mk-ink-100 bg-mk-ink-50 grid-cols-[2.2fr_1.2fr_1.4fr_0.7fr_0.7fr_36px]"
        >
          <span>{T("Driver", "السائق", ar)}</span>
          <span>{T("Phone", "الهاتف", ar)}</span>
          <span>{T("National ID", "الهوية", ar)}</span>
          <span>{T("Bookings", "العقود", ar)}</span>
          <span>{T("Status", "الحالة", ar)}</span>
          <span />
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 gap-3 text-mk-ink-400">
            <User size={32} strokeWidth={1.5} />
            <span className="mk-label">{T("No drivers found", "لا يوجد سائقين مطابقين للبحث", ar)}</span>
          </div>
        )}

        {filtered.map((d, idx) => {
          const sm = STATUS_BADGE[d.status];
          return (
            <Link
              key={d.id}
              href={`/employee/drivers/${d.id}`}
              className="grid items-center px-5 py-4 cursor-pointer transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50 no-underline grid-cols-[2.2fr_1.2fr_1.4fr_0.7fr_0.7fr_36px]"
              style={{
                borderBottom: idx < filtered.length - 1 ? "1px solid var(--color-mk-border)" : "none",
                borderInlineStart: d.blacklisted ? "3px solid var(--color-mk-danger)" : "none",
              }}
            >
              {/* Name + avatar */}
              <div className="flex items-center gap-3">
                <Avatar name={d.name} size="sm" />
                <div>
                  <div className="mk-body text-mk-ink-900 flex items-center gap-2 flex-wrap">
                    <span>{ar ? d.nameAr : d.name}</span>
                  </div>
                  <div className="mk-overline text-mk-ink-400">{d.id}</div>
                </div>
              </div>
              {/* Phone */}
              <div className="flex items-center gap-2 mk-label text-mk-ink-600">
                <Phone size={12} className="text-mk-ink-400" />
                {d.phone}
              </div>
              {/* ID */}
              <div>
                <div className="flex items-center gap-2 mk-label text-mk-ink-600">
                  <CreditCard size={12} className="text-mk-ink-400" />
                  {d.nationalId}
                </div>
                <div className="mk-overline text-mk-ink-400 ms-5 flex items-center gap-1 mt-1">
                  <span>{ar ? (d.idType === "Saudi ID" ? "هوية وطنية" : d.idType === "Iqama" ? "إقامة" : d.idType === "Passport" ? "زائر" : "خليجية") : (d.idType === "Passport" ? "Visitor" : d.idType)}</span>
                  {d.idExpiryDate && <span>· {d.idExpiryDate}</span>}
                </div>
              </div>
              {/* Bookings */}
              <div className="mk-label text-mk-ink-900">
                {d.bookings > 0 ? (
                  <span>
                    {d.bookings}
                    {d.lastBooking && (
                      <span className="mk-overline ms-1 text-mk-ink-400">· {d.lastBooking}</span>
                    )}
                  </span>
                ) : (
                  <span className="text-mk-ink-400">{T("None", "لا يوجد", ar)}</span>
                )}
              </div>
              {/* Status */}
              <div>
                <Badge variant={d.blacklisted ? "danger" : sm.variant} dot>
                  {d.blacklisted ? T("Blacklisted", "قائمة سوداء", ar) : T(sm.label[0], sm.label[1], ar)}
                </Badge>
              </div>
              {/* Arrow */}
              <div className="flex justify-end">
                <ChevronRight size={16} className="text-mk-ink-300" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── DRAWER: Add new driver ───────────────────────────────── */}
      <Drawer open={showAdd} onClose={() => setShowAdd(false)}>
        <div className="flex flex-col justify-between h-full max-w-[480px] overflow-y-auto">
          <div>
            <DrawerHeader title={T("Add new driver", "إضافة سائق جديد", ar)} onClose={() => setShowAdd(false)} className="mb-0 pb-4 border-b border-mk-border" />

            <div className="flex flex-col gap-4 mt-5">
              <Input
                variant="muted"
                dir="rtl"
                label={<>{T("Full name (Arabic)", "الاسم الكامل (عربي)", ar)} <span className="text-mk-danger">*</span></>}
                placeholder="مثال: خالد المطيري"
                value={newNameAr}
                onChange={(e) => {
                  const v = e.target.value;
                  setNewNameAr(v);
                  if (!englishNameEdited) setNewName(transliterateArabicName(v));
                }}
              />
              <Input
                variant="muted"
                label={T("Full name (English, optional)", "الاسم الكامل (إنجليزي، اختياري)", ar)}
                placeholder="e.g. Khaled Al-Mutairi"
                value={newName}
                onChange={(e) => {
                  const v = e.target.value;
                  setNewName(v);
                  setEnglishNameEdited(v !== "");
                }}
              />
              <Input
                variant="muted"
                type="tel"
                className="font-mono"
                label={<>{T("Phone number", "رقم الهاتف", ar)} <span className="text-mk-danger">*</span></>}
                placeholder="e.g. +966 50 123 4567"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
              <div className="flex flex-col gap-2">
                <label className="mk-caption text-mk-ink-700">
                  {T("ID Type", "نوع الهوية", ar)}
                </label>
                <Select
                  value={newIdType}
                  onChange={(e) => {
                    const selectedType = e.target.value as any;
                    setNewIdType(selectedType);
                    if (selectedType === "Saudi ID") {
                      setNewNationality("Saudi");
                    }
                  }}
                >
                  <option value="Saudi ID">{T("National ID", "هوية وطنية", ar)}</option>
                  <option value="Iqama">{T("Iqama", "إقامة", ar)}</option>
                  <option value="Passport">{T("Visitor", "زائر", ar)}</option>
                  <option value="GCC ID">{T("GCC ID", "هوية خليجية", ar)}</option>
                </Select>
              </div>

              {/* Dynamic identity fields — depends on ID Type, matches the new-contract flow exactly */}
              {newDriverIdentityFields().map((f) => (
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
            <Button variant="outline" onClick={() => setShowAdd(false)}>
              {T("Cancel", "إلغاء", ar)}
            </Button>
            <Button
              variant="primary"
              disabled={isDriverFormInvalid()}
              onClick={handleAdd}
              className={`flex-1 ${added ? "bg-mk-mint-500 hover:bg-mk-mint-500" : ""}`}
            >
              {added ? (
                <><CheckCircle size={16} /> {T("Added!", "تمت الإضافة!", ar)}</>
              ) : (
                <><UserPlus size={16} /> {T("Add Driver", "إضافة سائق", ar)}</>
              )}
            </Button>
          </DrawerFooter>
        </div>
      </Drawer>
    </div>
  );
}
