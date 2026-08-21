"use client";


import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search, UserPlus, ShieldCheck , ShieldAlert , ChevronRight, CheckCircle, Phone, CreditCard, X, User, FileSignature, Loader2, FileWarning, Plus, Trash2, Ban,
} from "lucide-react";
import { Avatar, Badge, HijriDatePicker, Button, Input, Select, Drawer, DrawerHeader, DrawerFooter, IconButton, Modal, useToast } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { customerService, attachmentService, countryService, customerEvents } from "@/lib/api-services";
import { formatPhone, normalizeKycStatus } from "@/lib/formatting";
import { CLIENTS } from "@/lib/data";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

const STATUS_BADGE: Record<string, { variant: "success" | "warning" | "neutral" | "danger"; label: [string, string] }> = {
  verified: { variant: "success", label: ["Verified", "موثّق"] },
  pending: { variant: "warning", label: ["Pending KYC", "قيد التحقق"] },
  rejected: { variant: "danger", label: ["Rejected", "مرفوض"] },
};

interface ClientContract {
  id: string;
  car: string;
  date: string;
  status: "active" | "pending" | "completed" | "expired" | "cancelled";
  rate: number;
}

interface CustomerListPageProps {
  customerDetailPath: (id: string | number | null | undefined) => string;
  canBlacklist: boolean;
  canDelete: boolean;
}

interface ClientProfile {
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
}

// Verified, has debts, or has disputes are all fine to contract with — only
// blacklisted or not-yet-verified customers are blocked.
function canCreateContract(c: ClientProfile) {
  return !c.blacklisted && c.kycStatus === "verified";
}

export default function CustomerListPage({ customerDetailPath, canBlacklist, canDelete }: CustomerListPageProps) {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const router = useRouter();
  const { showToast } = useToast();

  const gridTemplate = useMemo(
    () => `2.2fr 1.2fr 1.4fr 0.7fr 0.7fr 40px${canBlacklist ? " 40px" : ""}${canDelete ? " 40px" : ""} 36px`,
    [canBlacklist, canDelete]
  );

  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  // Load customers from API
  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await customerService.search({ pageNumber: 1, pageSize: 100 });
      console.log("[CustomerList] raw response:", response);

      // Transform API response to ClientProfile format
      const transformedClients = response.items?.map((item: any) => {
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
          yakeenStatus: item.yakeenStatus === 1 ? "verified" : item.yakeenStatus === 2 ? "pending" : "not_verified",
          blacklisted: item.isBlacklisted || false,
          joinDate: (item.joinedAt || item.creationTime) ? new Date(item.joinedAt || item.creationTime).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          history: [],
          debts: [],
        };
      }) || [];
      
      setClients(transformedClients);
    } catch (err) {
      console.error("Error loading customers:", err);
      // Keep existing data if we already have it; only fall back to mock data
      // on the very first load so the UI isn't completely empty.
      if (clients.length === 0) {
        setClients(CLIENTS);
      }
      setError(T("Failed to refresh customer list.", "فشل في تحديث قائمة العملاء.", ar));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
    const unsubscribe = customerEvents.onReload(loadCustomers);
    return () => unsubscribe();
  }, []);

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

  const [documentTypes, setDocumentTypes] = useState<any[]>([]);
  const [newDocuments, setNewDocuments] = useState<{ documentType: number; file: File | null }[]>([]);
  const [uploadingDocuments, setUploadingDocuments] = useState(false);

  // Delete customer state
  const [customerToDelete, setCustomerToDelete] = useState<ClientProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Blacklist customer state
  const [customerToToggleBlacklist, setCustomerToToggleBlacklist] = useState<ClientProfile | null>(null);
  const [blacklistAction, setBlacklistAction] = useState<"add" | "remove" | null>(null);
  const [blacklistReason, setBlacklistReason] = useState("");
  const [isTogglingBlacklist, setIsTogglingBlacklist] = useState(false);

  useEffect(() => {
    customerService
      .getDocumentTypes()
      .then((res: any) => {
        const list = res?.data ?? res?.items ?? res ?? [];
        setDocumentTypes(Array.isArray(list) ? list : []);
      })
      .catch(() => setDocumentTypes([]));

    countryService
      .search({ pageNumber: 1, pageSize: 200 })
      .then((res: any) => {
        const list = res?.data?.items ?? res?.items ?? res?.data ?? res ?? [];
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
        { key: "birthDate", labelEn: newIdType === "Saudi ID" ? "Date of Birth (Hijri)" : "Date of Birth", labelAr: newIdType === "Saudi ID" ? "تاريخ الميلاد (هجري)" : "تاريخ الميلاد", required: true, type: newIdType === "Saudi ID" ? "hijri" : "date", value: newIdType === "Saudi ID" ? newHijriBirthDate : newBirthDate, onChange: newIdType === "Saudi ID" ? setNewHijriBirthDate : setNewBirthDate },
      ];
      if (newIdType === "Saudi ID") {
        fields.push({ key: "birthDateGregorian", labelEn: "Date of Birth (Gregorian, optional)", labelAr: "تاريخ الميلاد (ميلادي، اختياري)", required: false, type: "date", value: newBirthDate, onChange: setNewBirthDate });
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

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.nameAr.includes(q) ||
      c.phone.includes(q) ||
      c.idNumber.includes(q)
    );
  });

  function isCustomerFormInvalid() {
    if (!newNameAr || !newName || !newPhone) return true;
    if ((newIdType === "Passport" || newIdType === "GCC ID") && !newCountryId) return true;
    return newCustomerIdentityFields().some((f) => f.required && !f.value);
  }

  async function handleAdd() {
    if (isCustomerFormInvalid()) return;

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

      await customerService.create(createRequest as any);
      
      // Reload customers after creation
      await loadCustomers();
      customerEvents.reload();
      
      setShowAdd(false);
      setAdded(false);
      setNewName(""); setNewNameAr(""); setNewPhone(""); setNewIdType("Saudi ID"); setNewId("");
      setNewNationality("Saudi"); setNewIdExpiry(""); setNewBirthDate(""); setNewHijriBirthDate("");
      setNewLicense(""); setNewLicenseExpiry(""); setNewEmail(""); setNewAddress("");
      setNewIdCopyNumber(""); setNewLicenseIssuePlace(""); setNewBorderNumber(""); setNewCountryId("");
      setNewDocuments([]);
      
      showToast(T("🟢 Customer added successfully!", "🟢 تم إضافة العميل بنجاح!", ar));
    } catch (err) {
      console.error("Error creating customer:", err);
      setAdded(false);
      setUploadingDocuments(false);
      showToast(T("Failed to add customer", "فشل في إضافة العميل", ar));
    }
  }

  async function handleDeleteCustomer() {
    if (!customerToDelete) return;
    try {
      setIsDeleting(true);
      await customerService.delete(Number(customerToDelete.id));
      showToast(T("Customer deleted successfully", "تم حذف العميل بنجاح", ar));
      await loadCustomers();
      customerEvents.reload();
    } catch (err) {
      console.error("Error deleting customer:", err);
      showToast(T("Failed to delete customer", "فشل في حذف العميل", ar));
    } finally {
      setIsDeleting(false);
      setCustomerToDelete(null);
    }
  }

  async function handleToggleBlacklist() {
    if (!customerToToggleBlacklist || !blacklistAction) return;
    try {
      setIsTogglingBlacklist(true);
      const isAdd = blacklistAction === "add";
      if (isAdd) {
        await customerService.addToBlacklist(Number(customerToToggleBlacklist.id), { reason: blacklistReason });
      } else {
        await customerService.removeFromBlacklist(Number(customerToToggleBlacklist.id));
      }
      showToast(
        T(
          isAdd ? "Customer added to blacklist" : "Customer removed from blacklist",
          isAdd ? "تمت إضافة العميل إلى القائمة السوداء" : "تمت إزالة العميل من القائمة السوداء",
          ar
        )
      );

      // Optimistically update local state so the top stats refresh immediately,
      // even if the background API reload is slow or fails.
      setClients((prev) =>
        prev.map((c) =>
          c.id === customerToToggleBlacklist.id
            ? { ...c, blacklisted: isAdd }
            : c
        )
      );

      await loadCustomers();
      customerEvents.reload();
      setCustomerToToggleBlacklist(null);
      setBlacklistAction(null);
      setBlacklistReason("");
    } catch (err: any) {
      console.error("Error toggling blacklist status:", err);
      const msg =
        err?.message ||
        T(
          blacklistAction === "add" ? "Failed to blacklist customer" : "Failed to remove customer from blacklist",
          blacklistAction === "add" ? "فشل في إضافة العميل إلى القائمة السوداء" : "فشل في إزالة العميل من القائمة السوداء",
          ar
        );
      showToast(msg);
    } finally {
      setIsTogglingBlacklist(false);
    }
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
        <div className="w-full sm:w-auto sm:flex-1 sm:max-w-[400px]">
          <Input
            variant="search"
            icon={<Search size={14} />}
            placeholder={T("Search name, phone, or ID…", "ابحث بالاسم أو الهاتف أو رقم الهوية…", ar)}
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
        <Button variant="primary" onClick={() => setShowAdd(true)} className="shadow-[var(--shadow-glow-blue)] sm:ms-auto">
          <UserPlus size={15} />
          {T("Add customer", "إضافة عميل جديد", ar)}
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: T("Total customers", "إجمالي العملاء", ar), value: clients.length, color: "var(--color-mk-blue-500)" },
          { label: T("Verified", "موثّقون", ar), value: clients.filter((c) => c.kycStatus === "verified" && !c.blacklisted).length, color: "var(--color-mk-mint-500)" },
          { label: T("Pending KYC", "قيد التحقق", ar), value: clients.filter((c) => c.kycStatus === "pending" && !c.blacklisted).length, color: "var(--color-mk-warning)" },
          { label: T("Blacklisted", "القائمة السوداء", ar), value: clients.filter((c) => c.blacklisted).length, color: "var(--color-mk-danger)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg px-5 py-4 mk-surface">
            <div className="mk-h2" style={{ color }}>{value}</div>
            <div className="mk-caption mt-1 text-mk-ink-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Customers table */}
      <div className="rounded-xl overflow-x-auto mk-surface">
        <div
          className="grid px-5 py-3 mk-overline uppercase text-mk-ink-400 tracking-wider border-b border-mk-ink-100 bg-mk-ink-50 min-w-[900px]"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          <span>{T("Customer", "العميل", ar)}</span>
          <span>{T("Phone", "الهاتف", ar)}</span>
          <span>{T("National ID", "الهوية", ar)}</span>
          <span>{T("Contracts", "العقود", ar)}</span>
          <span>{T("Status", "الحالة", ar)}</span>
          <span />
          {canBlacklist && <span />}
          {canDelete && <span />}
          <span />
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3 text-mk-ink-400">
            <Loader2 size={32} className="animate-spin" />
            <span className="mk-label">{T("Loading customers...", "جاري تحميل العملاء...", ar)}</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3 text-mk-danger">
            <FileWarning size={32} strokeWidth={1.5} />
            <span className="mk-label">{error}</span>
            <Button variant="outline" size="sm" onClick={loadCustomers}>
              {T("Retry", "إعادة المحاولة", ar)}
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3 text-mk-ink-400">
            <User size={32} strokeWidth={1.5} />
            <span className="mk-label">{T("No customers found", "لا يوجد عملاء مطابقون", ar)}</span>
          </div>
        ) : (
          filtered.map((c, idx) => {
          const sm = STATUS_BADGE[c.kycStatus];
          return (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(customerDetailPath(c.id))}
              onKeyDown={(e) => { if (e.key === "Enter") router.push(customerDetailPath(c.id)); }}
              className="grid items-center px-5 py-4 cursor-pointer transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50 min-w-[900px]"
              style={{
                gridTemplateColumns: gridTemplate,
                borderBottom: idx < filtered.length - 1 ? "1px solid var(--color-mk-border)" : "none",
                borderInlineStart: c.blacklisted ? "3px solid var(--color-mk-danger)" : "none",
              }}
            >
              {/* Name + avatar */}
              <div className="flex items-center gap-3">
                <Avatar name={c.name} size="sm" />
                <div>
                  <div className="mk-body text-mk-ink-900 flex items-center gap-2 flex-wrap">
                    <span>{ar ? c.nameAr : c.name}</span>
                  </div>
                </div>
              </div>
              {/* Phone */}
              <div className="flex items-center gap-2 mk-label text-mk-ink-600">
                <Phone size={12} className="text-mk-ink-400" />
                <span dir="ltr" className="inline-block whitespace-nowrap" style={{ unicodeBidi: "embed" }}>
                  {formatPhone(c.phone)}
                </span>
              </div>
              {/* ID */}
              <div>
                <div className="flex items-center gap-2 mk-label text-mk-ink-600">
                  <CreditCard size={12} className="text-mk-ink-400" />
                  {c.idNumber}
                </div>
                <div className="mk-overline text-mk-ink-400 ms-5 flex items-center gap-1 mt-1">
                  <span>{ar ? (c.idType === "Saudi ID" ? "هوية وطنية" : c.idType === "Iqama" ? "إقامة" : c.idType === "Passport" ? "زائر" : "خليجية") : (c.idType === "Passport" ? "Visitor" : c.idType)}</span>
                  {c.idExpiryDate && <span>· {c.idExpiryDate}</span>}
                </div>
              </div>
              {/* Contracts */}
              <div className="mk-label text-mk-ink-900">
                {c.contracts > 0 ? c.contracts : <span className="text-mk-ink-400">{T("None", "لا يوجد", ar)}</span>}
              </div>
              {/* Status */}
              <div>
                <Badge variant={c.blacklisted ? "danger" : STATUS_BADGE[c.kycStatus]?.variant ?? "neutral"} dot>
                  {c.blacklisted ? T("Blacklisted", "قائمة سوداء", ar) : T(sm?.label[0] ?? "", sm?.label[1] ?? "", ar)}
                </Badge>
              </div>
              {/* Create contract */}
              <div className="flex justify-center">
                {canCreateContract(c) && (
                  <Link
                    href={`/employee/new-contract?clientId=${c.id}`}
                    title={T("Create contract", "إنشاء عقد", ar)}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-center w-7 h-7 rounded-full bg-mk-blue-500 text-white no-underline shrink-0"
                  >
                    <FileSignature size={14} />
                  </Link>
                )}
              </div>
              {canBlacklist && (
                <div className="flex justify-center">
                  {c.blacklisted ? (
                    <button
                      type="button"
                      title={T("Remove from blacklist", "إزالة من القائمة السوداء", ar)}
                      onClick={(e) => { e.stopPropagation(); setCustomerToToggleBlacklist(c); setBlacklistAction("remove"); }}
                      className="flex items-center justify-center w-7 h-7 rounded-full bg-mk-mint-600/10 text-mk-mint-600 hover:bg-mk-mint-600/20 transition-colors"
                    >
                      <CheckCircle size={14} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      title={T("Blacklist customer", "إضافة إلى القائمة السوداء", ar)}
                      onClick={(e) => { e.stopPropagation(); setCustomerToToggleBlacklist(c); setBlacklistAction("add"); }}
                      className="flex items-center justify-center w-7 h-7 rounded-full
                       text-mk-warning-600 hover:bg-mk-warning/20 transition-colors"
                    >
                      <Ban size={14} />
                    </button>
                  )}
                </div>
              )}
              {canDelete && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    title={T("Delete customer", "حذف العميل", ar)}
                    onClick={(e) => { e.stopPropagation(); setCustomerToDelete(c); }}
                    className="flex items-center justify-center w-7 h-7 rounded-full bg-mk-danger/10 text-mk-danger hover:bg-mk-danger/20 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
              {/* Arrow */}
              <div className="flex justify-end">
                <ChevronRight size={16} className="text-mk-ink-300" />
              </div>
            </div>
          );
        })
        )}
      </div>

      {/* ── DRAWER: Register new customer ───────────────────────── */}
      <Drawer open={showAdd} onClose={() => setShowAdd(false)}>
        <div className="flex flex-col justify-between h-full max-w-[480px] overflow-y-auto">
          <div>
            <DrawerHeader title={T("Add new customer", "إضافة عميل جديد", ar)} onClose={() => setShowAdd(false)} className="mb-0 pb-4 border-b border-mk-border" />

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
                label={<>{T("Full name (English)", "الاسم الكامل (إنجليزي)", ar)} <span className="text-mk-danger">*</span></>}
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
                label={T("Email", "البريد الإلكتروني", ar)}
                placeholder="example@email.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />

              <div className="flex flex-col gap-2">
                <label className="mk-caption text-mk-ink-700">{T("ID Type", "نوع الهوية", ar)}</label>
                <Select
                  value={newIdType}
                  onChange={(e) => {
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

          <DrawerFooter className="mt-4 pt-4 border-t border-mk-border justify-stretch">
            <Button variant="outline" onClick={() => setShowAdd(false)}>
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
          </DrawerFooter>
        </div>
      </Drawer>

      {canBlacklist && (
        <Modal
          open={!!customerToToggleBlacklist}
          onClose={() => { if (!isTogglingBlacklist) { setCustomerToToggleBlacklist(null); setBlacklistAction(null); setBlacklistReason(""); } }}
          variant="centered"
          size="sm"
          title={blacklistAction === "remove" ? T("Remove from blacklist?", "إزالة من القائمة السوداء؟", ar) : T("Blacklist customer?", "إضافة إلى القائمة السوداء؟", ar)}
        >
          <div className="flex flex-col gap-5 p-2">
            <p className="mk-body text-mk-ink-700">
              {blacklistAction === "remove"
                ? T(
                    `Are you sure you want to remove ${customerToToggleBlacklist?.name || customerToToggleBlacklist?.nameAr || "this customer"} from the blacklist?`,
                    `هل أنت متأكد من إزالة ${customerToToggleBlacklist?.nameAr || customerToToggleBlacklist?.name || "هذا العميل"} من القائمة السوداء؟`,
                    ar
                  )
                : T(
                    `Are you sure you want to blacklist ${customerToToggleBlacklist?.name || customerToToggleBlacklist?.nameAr || "this customer"}? They will be restricted from new bookings.`,
                    `هل أنت متأكد من إضافة ${customerToToggleBlacklist?.nameAr || customerToToggleBlacklist?.name || "هذا العميل"} إلى القائمة السوداء؟ سيتم منعهم من الحجوزات الجديدة.`,
                    ar
                  )}
            </p>
            {blacklistAction === "add" && (
              <div className="flex flex-col gap-2">
                <label className="mk-caption text-mk-ink-700">{T("Reason (optional)", "السبب (اختياري)", ar)}</label>
                <Input
                  variant="muted"
                  placeholder={T("Enter reason...", "أدخل السبب...", ar)}
                  value={blacklistReason}
                  onChange={(e) => setBlacklistReason(e.target.value)}
                  disabled={isTogglingBlacklist}
                />
              </div>
            )}
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setCustomerToToggleBlacklist(null); setBlacklistAction(null); setBlacklistReason(""); }} disabled={isTogglingBlacklist}>
                {T("Cancel", "إلغاء", ar)}
              </Button>
              <Button variant={blacklistAction === "remove" ? "primary" : "danger"} size="sm" onClick={handleToggleBlacklist} disabled={isTogglingBlacklist}>
                {isTogglingBlacklist ? <><Loader2 size={13} className="animate-spin" /> {T("Processing...", "جارٍ المعالجة...", ar)}</> : blacklistAction === "remove" ? <><CheckCircle size={13} /> {T("Remove", "إزالة", ar)}</> : <><Ban size={13} /> {T("Blacklist", "إضافة", ar)}</>}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {canDelete && (
        <Modal
          open={!!customerToDelete}
          onClose={() => setCustomerToDelete(null)}
          variant="centered"
          size="sm"
          title={T("Delete customer?", "حذف العميل؟", ar)}
        >
          <div className="flex flex-col gap-5 p-2">
            <p className="mk-body text-mk-ink-700">
              {T(
                `Are you sure you want to delete ${customerToDelete?.name || customerToDelete?.nameAr || "this customer"}? This action cannot be undone.`,
                `هل أنت متأكد من حذف ${customerToDelete?.nameAr || customerToDelete?.name || "هذا العميل"}؟ لا يمكن التراجع عن هذا الإجراء.`,
                ar
              )}
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setCustomerToDelete(null)} disabled={isDeleting}>
                {T("Cancel", "إلغاء", ar)}
              </Button>
              <Button variant="danger" size="sm" onClick={handleDeleteCustomer} disabled={isDeleting}>
                {isDeleting ? <><Loader2 size={13} className="animate-spin" /> {T("Deleting...", "جارٍ الحذف...", ar)}</> : <><Trash2 size={13} /> {T("Delete", "حذف", ar)}</>}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
