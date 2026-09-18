"use client";


import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search, UserPlus, ShieldCheck , ShieldAlert , ChevronRight, CheckCircle, Phone, CreditCard, X, User, FileSignature, Loader2, FileWarning, Trash2, Ban,
} from "lucide-react";
import { Avatar, Badge, Button, Input, IconButton, Modal, useToast } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { customerService, customerEvents } from "@/lib/api-services";
import { formatPhone, normalizeKycStatus } from "@/lib/formatting";
import { CLIENTS } from "@/lib/data";
import { AddCustomerDrawer, type ClientProfile } from "./AddCustomerDrawer";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

const STATUS_BADGE: Record<string, { variant: "success" | "warning" | "neutral" | "danger"; label: [string, string] }> = {
  verified: { variant: "success", label: ["Verified", "موثّق"] },
  pending: { variant: "warning", label: ["Pending KYC", "قيد التحقق"] },
  rejected: { variant: "danger", label: ["Rejected", "مرفوض"] },
};

interface CustomerListPageProps {
  customerDetailPath: (id: string | number | null | undefined) => string;
  canBlacklist: boolean;
  canDelete: boolean;
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

  // Delete customer state
  const [customerToDelete, setCustomerToDelete] = useState<ClientProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Blacklist customer state
  const [customerToToggleBlacklist, setCustomerToToggleBlacklist] = useState<ClientProfile | null>(null);
  const [blacklistAction, setBlacklistAction] = useState<"add" | "remove" | null>(null);
  const [blacklistReason, setBlacklistReason] = useState("");
  const [isTogglingBlacklist, setIsTogglingBlacklist] = useState(false);

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.nameAr.includes(q) ||
      c.phone.includes(q) ||
      c.idNumber.includes(q)
    );
  });

 
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

      {/* ── DRAWER: Register new customer — shared form ── */}
      <AddCustomerDrawer
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={() => loadCustomers()}
        existingCustomers={clients}
        onViewDuplicate={(c) => router.push(customerDetailPath(c.id))}
      />

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
