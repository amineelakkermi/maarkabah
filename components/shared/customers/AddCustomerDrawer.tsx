"use client";

import { useState, useEffect } from "react";
import { UserPlus, CheckCircle, Phone, CreditCard, Plus, Trash2 } from "lucide-react";
import { HijriDatePicker, GregorianDateInput, Button, Input, Select, Drawer, DrawerHeader, DrawerFooter, IconButton, Modal, useToast } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { customerService, attachmentService, countryService, customerEvents } from "@/lib/api-services";
import { formatPhone, normalizeKycStatus } from "@/lib/formatting";
import { hijriToGregorianStr, gregorianToHijriStr } from "@/lib/hijri-utils";
import { ApiError } from "@/lib/api-client";
import { describeApiError } from "@/lib/api-error-messages";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

export interface ClientContract {
  id: string;
  car: string;
  date: string;
  status: "active" | "pending" | "completed" | "expired" | "cancelled";
  rate: number;
}

export interface ClientProfile {
  id: string;
  name: string;
  nameAr: string;
  phone: string;
  email?: string;
  idType: string;
  idNumber: string;
  idExpiryDate?: string;
  birthDate?: string;
  hijriBirthDate?: number;
  nationality?: string;
  personAddress?: string;
  idCopyNumber?: string;
  licenseIssuePlace?: string;
  borderNumber?: string;
  licenseNumber: string;
  licenseExpiryDate?: string;
  contracts: number;
  rating: number;
  kycStatus: "verified" | "pending" | "rejected";
  yakeenStatus?: "verified" | "pending" | "not_verified" | "error";
  tajeerStatus?: "verified" | "pending" | "not_verified" | "error";
  blacklisted: boolean;
  joinDate: string;
  history: ClientContract[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debts?: any[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapApiItemToClientProfile(item: any): ClientProfile {
  const idTypeCode = item.identityType ?? item.idType;
  const idType = idTypeCode === 1 ? "Saudi ID" : idTypeCode === 2 ? "Iqama" : idTypeCode === 3 ? "Passport" : idTypeCode === 4 ? "GCC ID" : "Unknown";
  return {
    id: String(item.id),
    name: item.fullNameEn || item.name || "",
    nameAr: item.fullNameAr || item.nameAr || "",
    phone: item.phoneNumber || "",
    email: item.email,
    idType,
    idNumber: item.beneficiaryIdNumber || item.passportNumber || item.visitor?.passportNumber || item.visitor?.idNumber || item.borderNumber || item.visitor?.borderNumber || item.identityCopyNumber || item.visitor?.identityCopyNumber || item.idCopyNumber || "",
    idExpiryDate: item.idExpiryDate || item.identityExpiryDate || item.national?.identityExpiryDate || item.residence?.identityExpiryDate || item.visitor?.identityExpiryDate || item.gulf?.identityExpiryDate,
    birthDate: item.birthDate || item.national?.birthDate || item.residence?.birthDate || item.visitor?.birthDate || item.gulf?.birthDate,
    hijriBirthDate: item.national?.hijriBirthDate ?? item.residence?.hijriBirthDate,
    nationality: item.nationality || item.national?.nationality || item.residence?.nationality || item.visitor?.nationality || item.gulf?.nationality,
    personAddress: item.address,
    idCopyNumber: item.idCopyNumber || item.identityCopyNumber || item.national?.idCopyNumber || item.residence?.idCopyNumber || item.visitor?.identityCopyNumber || item.gulf?.identityCopyNumber,
    licenseIssuePlace: item.licenseIssuePlace || item.national?.licenseIssuePlace || item.residence?.licenseIssuePlace || item.visitor?.licenseIssuePlace || item.gulf?.licenseIssuePlace,
    borderNumber: item.borderNumber || item.visitor?.borderNumber,
    licenseNumber: item.licenseNumber || item.national?.licenseNumber || item.residence?.licenseNumber || item.visitor?.licenseNumber || item.gulf?.licenseNumber || "",
    licenseExpiryDate: item.licenseExpiryDate || item.national?.licenseExpiryDate || item.residence?.licenseExpiryDate || item.visitor?.licenseExpiryDate || item.gulf?.licenseExpiryDate,
    contracts: item.contracts || 0,
    rating: item.rating || 0,
    kycStatus: normalizeKycStatus(item.verificationStatus),
    yakeenStatus: (item.yakeenStatus === 1 ? "verified" : item.yakeenStatus === 2 ? "pending" : "not_verified") as ClientProfile["yakeenStatus"],
    blacklisted: item.isBlacklisted || false,
    joinDate: (item.joinedAt || item.creationTime) ? new Date(item.joinedAt || item.creationTime).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    history: [],
    debts: [],
  };
}

export type CustomerDuplicateMatch = Pick<ClientProfile, "id" | "name" | "nameAr" | "phone" | "idType" | "idNumber">;

type AddCustomerDrawerProps = {
  open: boolean;
  onClose: () => void;
  /** Called with the created customer id after a successful create. */
  onCreated?: (createdId: number) => void;
  /** Loaded customers used for the local duplicate check before submit. */
  existingCustomers?: CustomerDuplicateMatch[];
  /** "View customer" action in the duplicate modal (e.g. open profile or select it). */
  onViewDuplicate?: (customer: CustomerDuplicateMatch) => void;
};

export function AddCustomerDrawer({ open, onClose, onCreated, existingCustomers, onViewDuplicate }: AddCustomerDrawerProps) {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const { showToast } = useToast();

  // Add customer form state
  const [newName, setNewName] = useState("");
  const [newNameAr, setNewNameAr] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newIdType, setNewIdType] = useState<"Saudi ID" | "Iqama" | "Passport" | "GCC ID">("Saudi ID");
  const [newId, setNewId] = useState("");
  const [newNationality, setNewNationality] = useState("Saudi");
  const [newIdExpiry, setNewIdExpiry] = useState("");
  const [newBirthDate, setNewBirthDate] = useState("");
  const [newHijriBirthDate, setNewHijriBirthDate] = useState("");
  const [newLicense, setNewLicense] = useState("");
  const [newLicenseExpiry, setNewLicenseExpiry] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newIdCopyNumber, setNewIdCopyNumber] = useState("");
  const [newLicenseIssuePlace, setNewLicenseIssuePlace] = useState("");
  const [newBorderNumber, setNewBorderNumber] = useState("");
  const [added, setAdded] = useState(false);

  // Countries selection (for Visitor type)
  const [countries, setCountries] = useState<{ id: number; name: string; nameAr?: string; nameEn?: string }[]>([]);
  const [newCountryId, setNewCountryId] = useState<string>("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);
  const [newDocuments, setNewDocuments] = useState<{ documentType: number; file: File | null }[]>([]);
  const [uploadingDocuments, setUploadingDocuments] = useState(false);

  // Duplicate customer state
  const [duplicateCustomer, setDuplicateCustomer] = useState<CustomerDuplicateMatch | null>(null);

  useEffect(() => {
    customerService
      .getDocumentTypes()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => {
        const list = res?.data ?? res?.items ?? res ?? [];
        setDocumentTypes(Array.isArray(list) ? list : []);
      })
      .catch(() => setDocumentTypes([]));

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

  const addDocumentRow = () => {
    setNewDocuments((prev) => [...prev, { documentType: documentTypes[0]?.id ?? documentTypes[0]?.value ?? 1, file: null }]);
  };
  const updateDocumentRow = (index: number, patch: Partial<{ documentType: number; file: File | null }>) => {
    setNewDocuments((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };
  const removeDocumentRow = (index: number) => {
    setNewDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  // Required field set per identity type — mirrors the new-contract flow's
  // per-type identity form so registering a customer uses the exact same fields.
  type IdentityFieldDef = {
    key: string; labelEn: string; labelAr: string; required: boolean;
    type: "text" | "date" | "email" | "hijri"; value: string; onChange: (v: string) => void;
  };
  function newCustomerIdentityFields(): IdentityFieldDef[] {
    const addressField: IdentityFieldDef = { key: "address", labelEn: "Address", labelAr: "العنوان", required: true, type: "text", value: newAddress, onChange: setNewAddress };
    const idCopyNumberField: IdentityFieldDef = { key: "idCopyNumber", labelEn: "ID Copy No.", labelAr: "رقم نسخة الهوية", required: true, type: "text", value: newIdCopyNumber, onChange: setNewIdCopyNumber };

    if (newIdType === "Saudi ID" || newIdType === "Iqama") {
      const fields: IdentityFieldDef[] = [
        { key: "idNumber", labelEn: "Beneficiary ID No.", labelAr: "رقم هوية المستفيد", required: true, type: "text", value: newId, onChange: setNewId },
        addressField,
        {
          key: "birthDate",
          labelEn: newIdType === "Saudi ID" ? "Date of Birth (Hijri)" : "Date of Birth",
          labelAr: newIdType === "Saudi ID" ? "تاريخ الميلاد (هجري)" : "تاريخ الميلاد",
          required: true,
          type: newIdType === "Saudi ID" ? "hijri" : "date",
          value: newIdType === "Saudi ID" ? newHijriBirthDate : newBirthDate,
          onChange: newIdType === "Saudi ID"
            ? (v: string) => { setNewHijriBirthDate(v); const g = hijriToGregorianStr(v); if (g) setNewBirthDate(g); }
            : setNewBirthDate,
        },
      ];
      if (newIdType === "Saudi ID") {
        fields.push({
          key: "birthDateGregorian",
          labelEn: "Date of Birth (Gregorian)",
          labelAr: "تاريخ الميلاد (ميلادي)",
          required: false,
          type: "date",
          value: newBirthDate,
          onChange: (v: string) => { setNewBirthDate(v); const h = gregorianToHijriStr(v); if (h) setNewHijriBirthDate(h); },
        });
      }
      return fields;
    }
    if (newIdType === "GCC ID") {
      return [
        { key: "idNumber", labelEn: "Beneficiary ID No.", labelAr: "رقم هوية المستفيد", required: true, type: "text", value: newId, onChange: setNewId },
        addressField,
        { key: "birthDate", labelEn: "Date of Birth", labelAr: "تاريخ الميلاد", required: true, type: "date", value: newBirthDate, onChange: setNewBirthDate },
        { key: "licenseNumber", labelEn: "License No.", labelAr: "رقم الرخصة", required: true, type: "text", value: newLicense, onChange: setNewLicense },
        { key: "idExpiry", labelEn: "ID Expiry Date", labelAr: "تاريخ انتهاء الهوية", required: true, type: "date", value: newIdExpiry, onChange: setNewIdExpiry },
        { key: "licenseIssuePlace", labelEn: "License Issue Place", labelAr: "مكان إصدار الرخصة", required: true, type: "text", value: newLicenseIssuePlace, onChange: setNewLicenseIssuePlace },
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
      idCopyNumberField,
      { key: "idExpiry", labelEn: "ID Expiry Date", labelAr: "تاريخ انتهاء الهوية", required: true, type: "date", value: newIdExpiry, onChange: setNewIdExpiry },
    ];
  }

  function getFormIdentityKey(): { identityType: number; idNumber: string } | null {
    const identityTypeMap: Record<string, number> = {
      "Saudi ID": 1,
      "Iqama": 2,
      "Passport": 3,
      "GCC ID": 4,
    };
    const identityType = identityTypeMap[newIdType];
    if (!identityType) return null;

    const idNumber = newId;
    if (!idNumber?.trim()) return null;

    return { identityType, idNumber: idNumber.trim() };
  }

  function findDuplicateInLoadedList(): CustomerDuplicateMatch | null {
    const key = getFormIdentityKey();
    if (!key) return null;

    return (
      (existingCustomers ?? []).find((c) => {
        const idTypeCode =
          c.idType === "Saudi ID" ? 1 :
          c.idType === "Iqama" ? 2 :
          c.idType === "Passport" ? 3 :
          c.idType === "GCC ID" ? 4 : undefined;
        if (idTypeCode !== key.identityType) return false;
        return c.idNumber?.trim() === key.idNumber;
      }) ?? null
    );
  }

  function customerFormErrors() {
    const errors: string[] = [];
    const email = newEmail.trim();
    const phone = newPhone.replace(/[\s()+-]/g, "");
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
    const isValidSaudiPhone = /^(?:9665|05|5)\d{8}$/.test(phone);
    const requiresEmailAndCountry = newIdType === "Passport" || newIdType === "GCC ID";

    if (!newNameAr.trim()) errors.push(T("Arabic full name is required", "الاسم الكامل بالعربية مطلوب", ar));
    if (!isValidSaudiPhone) errors.push(T("Enter a valid Saudi phone number", "أدخل رقم هاتف سعودي صحيح", ar));
    if (email && !isValidEmail) errors.push(T("Enter a valid email address", "أدخل بريدًا إلكترونيًا صحيحا", ar));
    if (requiresEmailAndCountry && !email) errors.push(T("Email is required", "البريد الإلكتروني مطلوب", ar));
    if (requiresEmailAndCountry && !newCountryId) errors.push(T("Country is required", "الدولة مطلوبة", ar));

    newCustomerIdentityFields().forEach((field) => {
      if (field.required && !String(field.value ?? "").trim()) {
        errors.push(T(`${field.labelEn} is required`, `${field.labelAr} مطلوب`, ar));
      }
    });

    return errors;
  }

  function isCustomerFormInvalid() {
    return customerFormErrors().length > 0;
  }

  function resetForm() {
    setNewName(""); setNewNameAr(""); setNewPhone(""); setNewIdType("Saudi ID"); setNewId("");
    setNewNationality("Saudi"); setNewIdExpiry(""); setNewBirthDate(""); setNewHijriBirthDate("");
    setNewLicense(""); setNewLicenseExpiry(""); setNewEmail(""); setNewAddress("");
    setNewIdCopyNumber(""); setNewLicenseIssuePlace(""); setNewBorderNumber(""); setNewCountryId("");
    setNewDocuments([]);
  }

  async function handleAdd() {
    const validationErrors = customerFormErrors();
    if (validationErrors.length > 0) {
      showToast(validationErrors[0]);
      return;
    }

    // Check for duplicates in the already-loaded customer list before submitting.
    const localDuplicate = findDuplicateInLoadedList();
    if (localDuplicate) {
      setDuplicateCustomer(localDuplicate);
      return;
    }

    try {
      setAdded(true);

      // Upload any attached documents first and collect their file IDs
      setUploadingDocuments(true);
      const uploadedDocuments: { documentType: number; fileId: number; sortOrder: number }[] = [];
      for (let i = 0; i < newDocuments.length; i++) {
        const doc = newDocuments[i];
        if (!doc.file) continue;
        const uploadResult = await attachmentService.upload(doc.file);
        const fileId = uploadResult?.data?.id ?? uploadResult?.id ?? uploadResult?.fileId ?? uploadResult?.data?.fileId;
        if (typeof fileId === "number") {
          uploadedDocuments.push({ documentType: doc.documentType, fileId, sortOrder: i + 1 });
        }
      }
      setUploadingDocuments(false);

      // Map ID type to enum
      const identityTypeMap: Record<string, number> = {
        "Saudi ID": 1,
        "Iqama": 2,
        "Passport": 3,
        "GCC ID": 4,
      };

      const createRequest = {
        fullNameEn: newName,
        fullNameAr: newNameAr,
        phoneNumber: newPhone.startsWith("+966") || newPhone.startsWith("+") ? newPhone : `+966 ${newPhone}`,
        email: newEmail || undefined,
        identityType: identityTypeMap[newIdType],
        address: newAddress || undefined,
        national: newIdType === "Saudi ID" ? {
          beneficiaryIdNumber: newId,
          birthDate: newBirthDate || undefined,
          hijriBirthDate: newHijriBirthDate ? parseInt(newHijriBirthDate, 10) : undefined,
          isHijriBirthDate: !newBirthDate,
          email: newEmail || undefined,
        } : undefined,
        residence: newIdType === "Iqama" ? {
          beneficiaryIdNumber: newId,
          birthDate: newBirthDate || undefined,
          isHijriBirthDate: false,
          email: newEmail || undefined,
        } : undefined,
        visitor: newIdType === "Passport" ? {
          passportNumber: newId,
          borderNumber: newBorderNumber || undefined,
          birthDate: newBirthDate || undefined,
          email: newEmail || undefined,
          licenseNumber: newLicense || undefined,
          licenseExpiryDate: newLicenseExpiry || undefined,
          licenseIssuePlace: newLicenseIssuePlace || undefined,
          countryId: newCountryId ? Number(newCountryId) : 1,
          identityExpiryDate: newIdExpiry || undefined,
          identityCopyNumber: newIdCopyNumber || undefined,
        } : undefined,
        gulf: newIdType === "GCC ID" ? {
          beneficiaryIdNumber: newId,
          email: newEmail || undefined,
          birthDate: newBirthDate || undefined,
          licenseNumber: newLicense || undefined,
          licenseExpiryDate: newLicenseExpiry || undefined,
          licenseIssuePlace: newLicenseIssuePlace || undefined,
          countryId: newCountryId ? Number(newCountryId) : 1,
          identityCopyNumber: newIdCopyNumber || undefined,
          identityExpiryDate: newIdExpiry || undefined,
        } : undefined,
        documents: uploadedDocuments.length > 0 ? uploadedDocuments : undefined,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const created = await customerService.create(createRequest as any);
      const createdId = Number(created?.id ?? created?.data?.id ?? 0);
      customerEvents.reload();

      resetForm();
      setAdded(false);
      onClose();
      onCreated?.(createdId);

      showToast(T("🟢 Customer added successfully!", "🟢 تم إضافة العميل بنجاح!", ar));
    } catch (err) {
      console.error("Error creating customer:", err);
      setAdded(false);
      setUploadingDocuments(false);

      if (err instanceof ApiError && err.status === 409) {
        const existing = err.response?.existingCustomer;
        if (existing) {
          setDuplicateCustomer(mapApiItemToClientProfile(existing));
        } else {
          showToast(
            describeApiError(err, ar, T("A customer with this identity already exists.", "يوجد عميل بنفس الهوية مسبقًا.", ar)),
            "error",
          );
        }
        return;
      }

      showToast(
        describeApiError(err, ar, T("Failed to add customer", "فشل في إضافة العميل", ar)),
        "error",
      );
    }
  }

  return (
    <>
      {/* ── DRAWER: Register new customer ───────────────────────── */}
      <Drawer open={open} onClose={onClose}>
        <div className="flex flex-col justify-between h-full max-w-[480px] overflow-y-auto">
          <div>
            <DrawerHeader title={T("Add new customer", "إضافة عميل جديد", ar)} onClose={onClose} className="mb-0 pb-4 border-b border-mk-border" />

            <div className="flex flex-col gap-4 mt-5">
              <Input
                variant="muted"
                dir="rtl"
                label={<>{T("Full name (Arabic)", "الاسم الكامل (عربي)", ar)} <span className="text-mk-danger">*</span></>}
                placeholder="مثال: أحمد المطيري"
                value={newNameAr}
                onChange={(e) => setNewNameAr(e.target.value)}
              />
              <Input
                variant="muted"
                label={<>{T("Full name (English)", "الاسم الكامل (إنجليزي)", ar)} </>}
                placeholder="e.g. Ahmed Al-Mutairi"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
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

              <Input
                variant="muted"
                type="email"
                label={<> {T("Email", "البريد الإلكتروني", ar)} {(newIdType === "Passport" || newIdType === "GCC ID") && <span className="text-mk-danger">*</span>}</>}
                placeholder="example@email.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />

              <div className="flex flex-col gap-2">
                <label className="mk-caption text-mk-ink-700">{T("ID Type", "نوع الهوية", ar)}</label>
                <Select
                  value={newIdType}
                  onChange={(e) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const v = e.target.value as any;
                    setNewIdType(v);
                    if (v === "Saudi ID") setNewNationality("Saudi");
                  }}
                >
                  <option value="Saudi ID">{T("National ID", "هوية وطنية", ar)}</option>
                  <option value="Iqama">{T("Iqama", "إقامة", ar)}</option>
                  <option value="Passport">{T("Visitor", "زائر", ar)}</option>
                  <option value="GCC ID">{T("GCC ID", "هوية خليجية", ar)}</option>
                </Select>
              </div>

              {/* Dynamic identity fields — depends on ID Type, matches the new-contract flow exactly */}
              {newCustomerIdentityFields().map((f) => (
                f.type === "hijri" ? (
                  <div key={f.key} className="flex flex-col gap-2">
                    <label className="mk-caption text-mk-ink-700">
                      {T(f.labelEn, f.labelAr, ar)} {f.required && <span className="text-mk-danger">*</span>}
                    </label>
                    <HijriDatePicker value={f.value} onChange={f.onChange} ar={ar} />
                  </div>
                ) : f.type === "date" && f.key.includes("birthDate") ? (
                  <GregorianDateInput
                    key={f.key}
                    label={<>{T(f.labelEn, f.labelAr, ar)} {f.required && <span className="text-mk-danger">*</span>}</>}
                    value={f.value}
                    onChange={f.onChange}
                    ar={ar}
                    required={f.required}
                  />
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

              {/* Country selection for Visitor only */}
              {(newIdType === "Passport" || newIdType === "GCC ID") && (
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

              {/* Documents (optional) */}
              <div className="flex flex-col gap-3 pt-2 border-t border-mk-border">
                <div className="flex items-center justify-between">
                  <label className="mk-caption text-mk-ink-700">{T("Documents (optional)", "المستندات (اختياري)", ar)}</label>
                  <Button variant="outline" size="sm" onClick={addDocumentRow}>
                    <Plus size={13} /> {T("Add document", "إضافة مستند", ar)}
                  </Button>
                </div>
                {newDocuments.map((doc, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Select
                      className="flex-1"
                      value={doc.documentType}
                      onChange={(e) => updateDocumentRow(index, { documentType: Number(e.target.value) })}
                    >
                      {documentTypes.length > 0 ? (
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        documentTypes.map((dt: any) => (
                          <option key={dt.id ?? dt.value} value={dt.id ?? dt.value}>
                            {ar ? dt.nameAr || dt.name : dt.nameEn || dt.name}
                          </option>
                        ))
                      ) : (
                        [1, 2, 3, 4].map((n) => (
                          <option key={n} value={n}>{T(`Document type ${n}`, `نوع المستند ${n}`, ar)}</option>
                        ))
                      )}
                    </Select>
                    <input
                      type="file"
                      className="flex-1 mk-body-sm text-mk-ink-700"
                      onChange={(e) => updateDocumentRow(index, { file: e.target.files?.[0] ?? null })}
                    />
                    <IconButton size="sm" variant="ghost" onClick={() => removeDocumentRow(index)}>
                      <Trash2 size={14} className="text-mk-danger" />
                    </IconButton>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DrawerFooter className="mt-4 pt-4 border-t border-mk-border justify-stretch flex-col">
            {isCustomerFormInvalid() && (
              <div className="w-full rounded-md bg-mk-danger/8 px-3 py-2 mk-caption text-mk-danger">
                {customerFormErrors()[0]}
              </div>
            )}
            <div className="flex w-full gap-2">
            <Button variant="outline" onClick={onClose}>
              {T("Cancel", "إلغاء", ar)}
            </Button>
            <Button
              variant="primary"
              disabled={isCustomerFormInvalid() || uploadingDocuments}
              onClick={handleAdd}
              className={`flex-1 ${added ? "bg-mk-mint-500 hover:bg-mk-mint-500" : ""}`}
            >
              {added ? (<><CheckCircle size={16} /> {T("Added!", "تمت الإضافة!", ar)}</>) : (<><UserPlus size={16} /> {T("Add Customer", "إضافة عميل", ar)}</>)}
            </Button>
            </div>
          </DrawerFooter>
        </div>
      </Drawer>

      {/* Duplicate customer found */}
      <Modal
        open={!!duplicateCustomer}
        onClose={() => setDuplicateCustomer(null)}
        variant="centered"
        size="sm"
        title={T("Customer already exists", "العميل موجود مسبقًا", ar)}
      >
        <div className="flex flex-col gap-5 p-2">
          <p className="mk-body text-mk-ink-700">
            {T(
              "A customer with the same identity type and number already exists. You can view the existing customer instead of creating a duplicate.",
              "يوجد عميل بنفس نوع الهوية ورقمها. يمكنك عرض العميل الموجود بدلاً من إنشاء نسخة مكررة.",
              ar
            )}
          </p>
          {duplicateCustomer && (
            <div className="rounded-lg border border-mk-border bg-mk-ink-50 p-4 flex flex-col gap-1">
              <div className="mk-body font-medium text-mk-ink-900">{ar ? duplicateCustomer.nameAr : duplicateCustomer.name}</div>
              <div className="mk-caption text-mk-ink-600 flex items-center gap-2">
                <Phone size={12} />
                <span dir="ltr">{formatPhone(duplicateCustomer.phone)}</span>
              </div>
              <div className="mk-caption text-mk-ink-600 flex items-center gap-2">
                <CreditCard size={12} />
                {duplicateCustomer.idType} · {duplicateCustomer.idNumber}
              </div>
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDuplicateCustomer(null)}>
              {T("Cancel", "إلغاء", ar)}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const dup = duplicateCustomer;
                setDuplicateCustomer(null);
                if (dup && onViewDuplicate) onViewDuplicate(dup);
              }}
            >
              {T("View customer", "عرض العميل", ar)}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
