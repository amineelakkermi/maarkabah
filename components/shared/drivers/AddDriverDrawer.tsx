"use client";

import { useState, useEffect } from "react";
import { UserPlus, CheckCircle } from "lucide-react";
import { HijriDatePicker, Button, Input, Select, Drawer, DrawerHeader, DrawerFooter, useToast } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { driverService, driverEvents, countryService } from "@/lib/api-services";
import { transliterateArabicName } from "@/lib/transliterate";

const T = (en: string, ar: string, isAr: boolean) => isAr ? ar : en;

export type DriverIdType = "Saudi ID" | "Iqama" | "Passport" | "GCC ID";

type AddDriverDrawerProps = {
  open: boolean;
  onClose: () => void;
  /** Called with the created driver id after a successful create. */
  onCreated?: (createdId: number) => void;
  titleEn?: string;
  titleAr?: string;
  submitLabelEn?: string;
  submitLabelAr?: string;
  /** Restrict selectable identity types (e.g. authorized drivers: Saudi ID / Iqama only). */
  allowedIdTypes?: DriverIdType[];
};

export function AddDriverDrawer({
  open, onClose, onCreated,
  titleEn = "Add new driver", titleAr = "إضافة سائق جديد",
  submitLabelEn = "Add Driver", submitLabelAr = "إضافة سائق",
  allowedIdTypes,
}: AddDriverDrawerProps) {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const { showToast } = useToast();

  // Add driver form state
  const [newName, setNewName] = useState("");
  const [newNameAr, setNewNameAr] = useState("");
  // Tracks whether the employee typed the English name by hand — once they
  // do, auto-transliteration from Arabic stops overwriting their edit.
  const [englishNameEdited, setEnglishNameEdited] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newId, setNewId] = useState("");
  const [newIdType, setNewIdType] = useState<DriverIdType>("Saudi ID");
  const [newLicense, setNewLicense] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newBirthDate, setNewBirthDate] = useState("");
  const [newHijriBirthDate, setNewHijriBirthDate] = useState("");
  const [newIdExpiry, setNewIdExpiry] = useState("");
  const [newLicenseExpiry, setNewLicenseExpiry] = useState("");
  const [newIdCopyNumber, setNewIdCopyNumber] = useState("");
  const [newLicenseIssuePlace, setNewLicenseIssuePlace] = useState("");
  const [newBorderNumber, setNewBorderNumber] = useState("");
  const [added, setAdded] = useState(false);

  // Countries selection (for Visitor / GCC ID types)
  const [countries, setCountries] = useState<{ id: number; name: string; nameAr?: string; nameEn?: string }[]>([]);
  const [newCountryId, setNewCountryId] = useState<string>("");

  useEffect(() => {
    countryService
      .search({ pageNumber: 1, pageSize: 200 })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => {
        const list = res?.data?.items ?? res?.items ?? res?.data ?? res ?? [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const normalized = Array.isArray(list) ? list.map((c: any) => ({
          id: c.id,
          name: c.nameAr || c.nameEn || c.name || "",
          nameAr: c.nameAr,
          nameEn: c.nameEn,
        })) : [];
        setCountries(normalized);
      })
      .catch(() => setCountries([]));
  }, []);

  const idTypeOptions: DriverIdType[] = allowedIdTypes ?? ["Saudi ID", "Iqama", "Passport", "GCC ID"];

  // If the selected type becomes disallowed (restricted authorized-driver
  // form), fall back to the first allowed option.
  const effectiveIdType: DriverIdType = idTypeOptions.includes(newIdType) ? newIdType : (idTypeOptions[0] ?? "Saudi ID");

  // Required field set per identity type — mirrors the new-contract flow's
  // per-type identity form so registering a driver uses the exact same fields.
  type IdentityFieldDef = {
    key: string; labelEn: string; labelAr: string; required: boolean;
    type: "text" | "date" | "email" | "hijri"; value: string; onChange: (v: string) => void;
  };
  function newDriverIdentityFields(): IdentityFieldDef[] {
    const addressField: IdentityFieldDef = { key: "address", labelEn: "Address", labelAr: "العنوان", required: true, type: "text", value: newAddress, onChange: setNewAddress };
    const idCopyNumberField: IdentityFieldDef = { key: "idCopyNumber", labelEn: "ID Copy No.", labelAr: "رقم نسخة الهوية", required: true, type: "text", value: newIdCopyNumber, onChange: setNewIdCopyNumber };

    if (effectiveIdType === "Saudi ID" || effectiveIdType === "Iqama") {
      const fields: IdentityFieldDef[] = [
        { key: "idNumber", labelEn: "Beneficiary ID No.", labelAr: "رقم هوية المستفيد", required: true, type: "text", value: newId, onChange: setNewId },
        addressField,
        { key: "birthDate", labelEn: effectiveIdType === "Saudi ID" ? "Date of Birth (Hijri)" : "Date of Birth", labelAr: effectiveIdType === "Saudi ID" ? "تاريخ الميلاد (هجري)" : "تاريخ الميلاد", required: true, type: effectiveIdType === "Saudi ID" ? "hijri" : "date", value: effectiveIdType === "Saudi ID" ? newHijriBirthDate : newBirthDate, onChange: effectiveIdType === "Saudi ID" ? setNewHijriBirthDate : setNewBirthDate },
      ];
      if (effectiveIdType === "Saudi ID") {
        fields.push({ key: "birthDateGregorian", labelEn: "Date of Birth (Gregorian, optional)", labelAr: "تاريخ الميلاد (ميلادي، اختياري)", required: false, type: "date", value: newBirthDate, onChange: setNewBirthDate });
      }
      fields.push(
        { key: "licenseNumber", labelEn: "License No.", labelAr: "رقم الرخصة", required: true, type: "text", value: newLicense, onChange: setNewLicense },
        { key: "licenseExpiry", labelEn: "License Expiry Date", labelAr: "تاريخ انتهاء الرخصة", required: true, type: "date", value: newLicenseExpiry, onChange: setNewLicenseExpiry },
        { key: "licenseIssuePlace", labelEn: "License Issue Place", labelAr: "مكان إصدار الرخصة", required: true, type: "text", value: newLicenseIssuePlace, onChange: setNewLicenseIssuePlace },
        { key: "email", labelEn: "Email (optional)", labelAr: "البريد الإلكتروني (غير إلزامي)", required: false, type: "email", value: newEmail, onChange: setNewEmail },
      );
      return fields;
    }
    if (effectiveIdType === "GCC ID") {
      return [
        { key: "idNumber", labelEn: "Beneficiary ID No.", labelAr: "رقم هوية المستفيد", required: true, type: "text", value: newId, onChange: setNewId },
        addressField,
        { key: "birthDate", labelEn: "Date of Birth", labelAr: "تاريخ الميلاد", required: true, type: "date", value: newBirthDate, onChange: setNewBirthDate },
        { key: "licenseNumber", labelEn: "License No.", labelAr: "رقم الرخصة", required: true, type: "text", value: newLicense, onChange: setNewLicense },
        { key: "idExpiry", labelEn: "ID Expiry Date", labelAr: "تاريخ انتهاء الهوية", required: true, type: "date", value: newIdExpiry, onChange: setNewIdExpiry },
        { key: "licenseIssuePlace", labelEn: "License Issue Place", labelAr: "مكان إصدار الرخصة", required: true, type: "text", value: newLicenseIssuePlace, onChange: setNewLicenseIssuePlace },
        { key: "email", labelEn: "Email", labelAr: "البريد الإلكتروني", required: true, type: "email", value: newEmail, onChange: setNewEmail },
        idCopyNumberField,
        { key: "licenseExpiry", labelEn: "License Expiry Date", labelAr: "تاريخ انتهاء الرخصة", required: true, type: "date", value: newLicenseExpiry, onChange: setNewLicenseExpiry },
      ];
    }
    // Passport / Visitor — no "Beneficiary ID No." field; identity is border/passport number instead
    return [
      addressField,
      { key: "borderNumber", labelEn: "Border No.", labelAr: "رقم الحدود", required: true, type: "text", value: newBorderNumber, onChange: setNewBorderNumber },
      { key: "passportNumber", labelEn: "Passport No.", labelAr: "رقم الجواز", required: true, type: "text", value: newId, onChange: setNewId },
      { key: "birthDate", labelEn: "Date of Birth", labelAr: "تاريخ الميلاد", required: true, type: "date", value: newBirthDate, onChange: setNewBirthDate },
      { key: "licenseNumber", labelEn: "License No.", labelAr: "رقم الرخصة", required: true, type: "text", value: newLicense, onChange: setNewLicense },
      { key: "licenseExpiry", labelEn: "License Expiry Date", labelAr: "تاريخ انتهاء الرخصة", required: true, type: "date", value: newLicenseExpiry, onChange: setNewLicenseExpiry },
      { key: "licenseIssuePlace", labelEn: "License Issue Place", labelAr: "مكان إصدار الرخصة", required: true, type: "text", value: newLicenseIssuePlace, onChange: setNewLicenseIssuePlace },
      { key: "email", labelEn: "Email", labelAr: "البريد الإلكتروني", required: true, type: "email", value: newEmail, onChange: setNewEmail },
      idCopyNumberField,
      { key: "idExpiry", labelEn: "ID Expiry Date", labelAr: "تاريخ انتهاء الهوية", required: true, type: "date", value: newIdExpiry, onChange: setNewIdExpiry },
    ];
  }

  function driverFormErrors() {
    const errors: string[] = [];
    const phone = newPhone.replace(/[\s()+-]/g, "");
    const isValidSaudiPhone = /^(?:9665|05|5)\d{8}$/.test(phone);

    if (!newNameAr.trim()) errors.push(T("Arabic full name is required", "الاسم الكامل بالعربية مطلوب", ar));
    if (!isValidSaudiPhone) errors.push(T("Enter a valid Saudi phone number", "أدخل رقم هاتف سعودي صحيح", ar));
    if ((effectiveIdType === "Passport" || effectiveIdType === "GCC ID") && !newCountryId) errors.push(T("Country is required", "الدولة مطلوبة", ar));

    newDriverIdentityFields().forEach((field) => {
      if (field.required && !String(field.value ?? "").trim()) {
        errors.push(T(`${field.labelEn} is required`, `${field.labelAr} مطلوب`, ar));
      }
    });

    return errors;
  }

  function isDriverFormInvalid() {
    return driverFormErrors().length > 0;
  }

  function resetForm() {
    setNewName("");
    setNewNameAr("");
    setEnglishNameEdited(false);
    setNewPhone("");
    setNewId("");
    setNewIdType(idTypeOptions[0] ?? "Saudi ID");
    setNewLicense("");
    setNewAddress("");
    setNewEmail("");
    setNewBirthDate("");
    setNewHijriBirthDate("");
    setNewIdExpiry("");
    setNewLicenseExpiry("");
    setNewCountryId("");
    setNewIdCopyNumber("");
    setNewLicenseIssuePlace("");
    setNewBorderNumber("");
  }

  async function handleAdd() {
    const validationErrors = driverFormErrors();
    if (validationErrors.length > 0) {
      showToast(validationErrors[0]);
      return;
    }

    const idTypeCodes: Record<string, 1 | 2 | 3 | 4> = {
      "Saudi ID": 1,
      "Iqama": 2,
      "Passport": 3,
      "GCC ID": 4
    };
    const identityType = idTypeCodes[effectiveIdType] ?? 1;
    const phone = newPhone.startsWith("+966") || newPhone.startsWith("+") ? newPhone : `+966 ${newPhone}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      fullNameEn: newName || transliterateArabicName(newNameAr),
      fullNameAr: newNameAr,
      phoneNumber: phone,
      identityType,
      address: newAddress || undefined,
      customerId: null,
      isActive: true,
    };

    if (effectiveIdType === "Saudi ID") {
      payload.national = {
        beneficiaryIdNumber: newId,
        birthDate: newBirthDate || undefined,
        hijriBirthDate: newHijriBirthDate ? parseInt(newHijriBirthDate, 10) : undefined,
        isHijriBirthDate: !newBirthDate,
        email: newEmail || undefined,
        licenseNumber: newLicense || undefined,
        licenseExpiryDate: newLicenseExpiry || undefined,
        licenseIssuePlace: newLicenseIssuePlace || undefined,
      };
    } else if (effectiveIdType === "Iqama") {
      payload.residence = {
        beneficiaryIdNumber: newId,
        birthDate: newBirthDate || undefined,
        isHijriBirthDate: false,
        email: newEmail || undefined,
        licenseNumber: newLicense || undefined,
        licenseExpiryDate: newLicenseExpiry || undefined,
        licenseIssuePlace: newLicenseIssuePlace || undefined,
      };
    } else if (effectiveIdType === "Passport") {
      payload.visitor = {
        passportNumber: newId,
        borderNumber: newBorderNumber || undefined,
        birthDate: newBirthDate || undefined,
        email: newEmail || undefined,
        licenseNumber: newLicense || undefined,
        licenseExpiryDate: newLicenseExpiry || undefined,
        licenseIssuePlace: newLicenseIssuePlace || undefined,
        countryId: newCountryId ? Number(newCountryId) : undefined,
        identityCopyNumber: newIdCopyNumber || undefined,
        identityExpiryDate: newIdExpiry || undefined,
      };
    } else if (effectiveIdType === "GCC ID") {
      payload.gulf = {
        beneficiaryIdNumber: newId,
        email: newEmail || undefined,
        birthDate: newBirthDate || undefined,
        licenseNumber: newLicense || undefined,
        licenseExpiryDate: newLicenseExpiry || undefined,
        licenseIssuePlace: newLicenseIssuePlace || undefined,
        countryId: newCountryId ? Number(newCountryId) : undefined,
        identityCopyNumber: newIdCopyNumber || undefined,
        identityExpiryDate: newIdExpiry || undefined,
      };
    }

    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined || payload[key] === null) {
        delete payload[key];
      }
    });

    setAdded(true);
    try {
      const created = await driverService.create(payload);
      const createdId = Number(created?.id ?? created?.data?.id ?? 0);
      driverEvents.reload();
      resetForm();
      setAdded(false);
      onClose();
      onCreated?.(createdId);
    } catch (err) {
      console.error("Error creating driver:", err);
      setAdded(false);
      alert(T("Failed to add driver. Please check the fields.", "فشل إضافة السائق. يرجى التحقق من الحقول.", ar));
    }
  }

  const idTypeOptionLabel = (v: DriverIdType) =>
    v === "Saudi ID" ? T("National ID", "هوية وطنية", ar)
    : v === "Iqama" ? T("Iqama", "إقامة", ar)
    : v === "Passport" ? T("Visitor", "زائر", ar)
    : T("GCC ID", "هوية خليجية", ar);

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
                value={effectiveIdType}
                onChange={(e) => {
                  const selectedType = e.target.value as DriverIdType;
                  setNewIdType(selectedType);
                }}
              >
                {idTypeOptions.map((v) => (
                  <option key={v} value={v}>{idTypeOptionLabel(v)}</option>
                ))}
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

            {/* Country selection — required for Visitor / GCC ID types */}
            {(effectiveIdType === "Passport" || effectiveIdType === "GCC ID") && (
              <div className="flex flex-col gap-2">
                <label className="mk-caption text-mk-ink-700">
                  {T("Country", "الدولة", ar)} <span className="text-mk-danger">*</span>
                </label>
                <Select value={newCountryId} onChange={(e) => setNewCountryId(e.target.value)}>
                  <option value="">{T("Select country...", "اختر الدولة...", ar)}</option>
                  {countries.map((country) => (
                    <option key={country.id} value={String(country.id)}>
                      {ar ? country.nameAr || country.name : country.nameEn || country.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>
        </div>

        <DrawerFooter className="mt-4 pt-4 border-t border-mk-border justify-stretch flex-col">
          {isDriverFormInvalid() && (
            <div className="w-full rounded-md bg-mk-danger/8 px-3 py-2 mk-caption text-mk-danger">
              {driverFormErrors()[0]}
            </div>
          )}
          <div className="flex w-full gap-2">
          <Button variant="outline" onClick={onClose}>
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
              <><UserPlus size={16} /> {T(submitLabelEn, submitLabelAr, ar)}</>
            )}
          </Button>
          </div>
        </DrawerFooter>
      </div>
    </Drawer>
  );
}
