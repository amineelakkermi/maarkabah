"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Search, X, UserSearch, Phone, CreditCard, Star, Ban, ShieldCheck,
  ShieldAlert, Wallet, FileWarning, ExternalLink, Building2,
  UserPlus, CheckCircle2, Loader2, CheckCircle, FileSignature,
} from "lucide-react";
import { Avatar, Badge, Button, Input, IconButton, useToast } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { customerService, customerWarehouseService } from "@/lib/api-services";
import { formatPhone, normalizeKycStatus } from "@/lib/formatting";
import type { ClientProfile, ClientDebt, ClientDispute, DynamicsLookupRecord } from "@/lib/data";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

const KYC_BADGE: Record<ClientProfile["kycStatus"], { variant: "success" | "warning" | "danger"; label: [string, string] }> = {
  verified: { variant: "success", label: ["Verified", "موثّق"] },
  pending: { variant: "warning", label: ["Pending KYC", "قيد التحقق"] },
  rejected: { variant: "danger", label: ["Rejected", "مرفوض"] },
};

const DEBT_BADGE: Record<"unpaid" | "overdue" | "paid", { variant: "success" | "warning" | "danger"; label: [string, string] }> = {
  unpaid: { variant: "warning", label: ["Unpaid", "غير مسدد"] },
  overdue: { variant: "danger", label: ["Overdue", "متأخر السداد"] },
  paid: { variant: "success", label: ["Paid", "مسدد"] },
};

const ID_TYPE_LABELS: Record<number, { en: string; ar: string }> = {
  1: { en: "Saudi ID", ar: "هوية وطنية" },
  2: { en: "Iqama", ar: "إقامة" },
  3: { en: "Passport", ar: "جواز سفر" },
  4: { en: "GCC ID", ar: "هوية خليجية" },
};

interface CustomerInquiryPageProps {
  customerProfilePath: (id: string | number | null | undefined) => string;
}

type InquiryMatch =
  | { kind: "local"; client: ClientProfile }
  | { kind: "external"; record: DynamicsLookupRecord; warehouseId?: number | string };

function idTypeLabel(code: number | undefined | null, ar: boolean): string {
  const label = code ? ID_TYPE_LABELS[code] : undefined;
  return ar ? label?.ar ?? "وثيقة هوية" : label?.en ?? "ID Document";
}

function maskId(value: string | undefined | null): string {
  if (!value) return "—";
  const clean = String(value).trim();
  if (clean.length < 6) return clean;
  if (/[\*•]/.test(clean)) return clean;
  return `${clean.slice(0, 4)}••${clean.slice(-4)}`;
}

function normalizePhone(value: string | undefined | null): string {
  if (!value) return "—";
  return formatPhone(value) ?? value;
}

function mapLocalCustomer(item: any): ClientProfile {
  const idTypeCode = item.identityType ?? item.idType;
  const idType = idTypeLabel(idTypeCode, false);
  return {
    id: String(item.id ?? ""),
    name: item.fullNameEn || item.name || "",
    nameAr: item.fullNameAr || item.nameAr || "",
    phone: normalizePhone(item.phoneNumber),
    email: item.email,
    idType,
    idNumber: maskId(item.beneficiaryIdNumber || item.visitor?.passportNumber || item.visitor?.idNumber || item.idNumber || ""),
    idExpiryDate: item.idExpiryDate || item.identityExpiryDate || item.national?.identityExpiryDate || item.residence?.identityExpiryDate || item.visitor?.identityExpiryDate || item.gulf?.identityExpiryDate,
    birthDate: item.birthDate || item.national?.birthDate || item.residence?.birthDate || item.visitor?.birthDate || item.gulf?.birthDate,
    hijriBirthDate: item.national?.hijriBirthDate ?? item.residence?.hijriBirthDate,
    nationality: item.nationality || item.national?.nationality || item.residence?.nationality || item.visitor?.nationality || item.gulf?.nationality,
    personAddress: item.address,
    idCopyNumber: item.idCopyNumber || item.identityCopyNumber || item.national?.idCopyNumber || item.residence?.idCopyNumber || item.visitor?.identityCopyNumber || item.gulf?.identityCopyNumber,
    licenseIssuePlace: item.licenseIssuePlace || item.national?.licenseIssuePlace || item.residence?.licenseIssuePlace || item.visitor?.licenseIssuePlace || item.gulf?.licenseIssuePlace,
    borderNumber: item.visitor?.borderNumber,
    licenseNumber: item.licenseNumber || item.national?.licenseNumber || item.residence?.licenseNumber || item.visitor?.licenseNumber || item.gulf?.licenseNumber || "",
    licenseExpiryDate: item.licenseExpiryDate || item.national?.licenseExpiryDate || item.residence?.licenseExpiryDate || item.visitor?.licenseExpiryDate || item.gulf?.licenseExpiryDate,
    contracts: item.contracts || 0,
    rating: item.rating || 0,
    kycStatus: normalizeKycStatus(item.verificationStatus),
    yakeenStatus: item.yakeenStatus === 1 ? "verified" : item.yakeenStatus === 2 ? "pending" : "not_verified",
    blacklisted: item.isBlacklisted || false,
    joinDate: item.joinedAt || item.creationTime ? new Date(item.joinedAt || item.creationTime).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    history: [],
    debts: [],
    disputes: [],
  };
}

function parseOfficeName(office: any, ar: boolean): string {
  if (!office) return ar ? "مكتب آخر" : "Other office";
  if (typeof office === "string") return office;
  return (ar ? office.nameAr || office.name : office.nameEn || office.name) || office.name || (ar ? "مكتب آخر" : "Other office");
}

function mapWarehouseRiskRecords(records: any[] | undefined, ar: boolean): { debts: ClientDebt[]; disputes: ClientDispute[] } {
  const debts: ClientDebt[] = [];
  const disputes: ClientDispute[] = [];

  if (!Array.isArray(records)) return { debts, disputes };

  for (const record of records) {
    const office = parseOfficeName(record.office ?? record.reportedByOffice ?? record.branch, ar);
    const officeAr = parseOfficeName(record.office ?? record.reportedByOffice ?? record.branch, true);

    const debtItems = Array.isArray(record.debts) ? record.debts : [];
    const disputeItems = Array.isArray(record.disputes) ? record.disputes : [];

    for (const d of debtItems) {
      const status = String(d.status ?? "unpaid").toLowerCase();
      const mappedStatus: "unpaid" | "overdue" | "paid" = status === "paid" || status === "2" ? "paid" : status === "overdue" ? "overdue" : "unpaid";
      debts.push({
        id: String(d.id ?? `debt-${debts.length}`),
        type: d.type || d.reason || "Debt",
        typeAr: d.typeAr || d.type || d.reason || "مديونية",
        date: d.date || d.createdAt || d.debtDate || new Date().toISOString().split("T")[0],
        dueDate: d.dueDate,
        amount: Number(d.amount ?? 0),
        status: mappedStatus,
        statusAr: mappedStatus === "paid" ? "مسدد" : mappedStatus === "overdue" ? "متأخر السداد" : "غير مسدد",
        contractRef: d.contractRef,
        notes: d.notes || d.reason || "",
        notesAr: d.notesAr || d.notes || d.reason || "",
        office,
        officeAr,
      });
    }

    for (const d of disputeItems) {
      const status = String(d.status ?? "open").toLowerCase();
      const mappedStatus: "open" | "resolved" = status === "resolved" || status === "2" || status === "closed" ? "resolved" : "open";
      disputes.push({
        id: String(d.id ?? `dispute-${disputes.length}`),
        type: d.type || d.reason || "Dispute",
        typeAr: d.typeAr || d.type || d.reason || "نزاع",
        date: d.date || d.createdAt || d.disputeDate || new Date().toISOString().split("T")[0],
        amount: d.amount != null ? Number(d.amount) : undefined,
        status: mappedStatus,
        statusAr: mappedStatus === "resolved" ? "تمت تسويته" : "نشط",
        notes: d.notes || d.reason || "",
        notesAr: d.notesAr || d.notes || d.reason || "",
        office,
        officeAr,
      });
    }
  }

  return { debts, disputes };
}

function mapWarehouseRecord(item: any, summary: any | null, ar: boolean): DynamicsLookupRecord {
  const idTypeCode = item.identityType ?? item.idType;
  const rawId = item.idNumber ?? item.maskedIdNumber ?? item.beneficiaryIdNumber ?? item.visitor?.passportNumber ?? item.visitor?.idNumber ?? "";
  const idNumber = /[\*•]/.test(String(rawId ?? "")) ? rawId : maskId(rawId);

  const records = summary?.officeRecords ?? summary?.riskRecords ?? summary?.records ?? item.officeRecords ?? item.riskRecords;
  const { debts, disputes } = mapWarehouseRiskRecords(records, ar);

  return {
    idNumber,
    name: item.fullNameEn || item.name || "",
    nameAr: item.fullNameAr || item.nameAr || "",
    phone: normalizePhone(item.phoneNumber ?? item.phone),
    idType: idTypeLabel(idTypeCode, false),
    idExpiryDate: item.idExpiryDate || item.identityExpiryDate,
    nationality: item.nationality,
    licenseNumber: item.licenseNumber ?? item.visitor?.licenseNumber ?? "",
    blacklisted: item.isNetworkBlacklisted ?? item.isBlacklisted ?? item.blacklisted ?? false,
    isNetworkBlacklisted: item.isNetworkBlacklisted ?? false,
    hasNetworkCircular: item.hasNetworkCircular ?? false,
    isRegisteredLocally: item.isRegisteredLocally ?? false,
    localCustomerId: item.localCustomerId != null ? String(item.localCustomerId) : undefined,
    debts,
    disputes,
  };
}

export default function CustomerInquiryPage({ customerProfilePath }: CustomerInquiryPageProps) {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const { showToast } = useToast();

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<InquiryMatch[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [registeringKey, setRegisteringKey] = useState<string | null>(null);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const search = async (rawQuery: string) => {
    const q = rawQuery.trim();
    if (q.length < 2) {
      setMatches([]);
      setError(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setSelectedKey(null);

    try {
      const [localRes, warehouseRes] = await Promise.all([
        customerService.search({ search: q, pageNumber: 1, pageSize: 20 }).catch(() => null),
        customerWarehouseService.inquiry({ search: q, pageNumber: 1, pageSize: 20 }).catch(() => null),
      ]);

      if (controller.signal.aborted) return;

      const localItems = (localRes?.items ?? localRes?.data?.items ?? localRes?.data ?? localRes ?? []) as any[];
      const warehouseItems = (warehouseRes?.items ?? warehouseRes?.data?.items ?? warehouseRes?.data ?? warehouseRes ?? []) as any[];

      const local: InquiryMatch[] = (Array.isArray(localItems) ? localItems : [])
        .filter((item: any) => item && (item.id != null || item.phoneNumber || item.fullNameAr))
        .map((item: any) => ({ kind: "local" as const, client: mapLocalCustomer(item) }));

      const external: InquiryMatch[] = (Array.isArray(warehouseItems) ? warehouseItems : [])
        .filter((item: any) => item && (item.id != null || item.idNumber || item.phoneNumber || item.fullNameAr) && !item.isRegisteredLocally)
        .map((item: any) => ({
          kind: "external" as const,
          record: mapWarehouseRecord(item, null, ar),
          warehouseId: item.id ?? item.warehouseCustomerId,
        }));

      setMatches([...local, ...external]);
    } catch (err) {
      console.error("Inquiry search error:", err);
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : T("Search failed", "فشل البحث", ar));
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => search(query), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const selected = matches.find((m) => keyOf(m) === selectedKey) ?? null;
  const [selectedSummary, setSelectedSummary] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    setSelectedSummary(null);
    setDetailError(null);
    if (!selected || selected.kind !== "external" || selected.warehouseId == null) return;

    let active = true;
    setDetailLoading(true);
    customerWarehouseService
      .getSummary(selected.warehouseId)
      .then((summary) => {
        if (active) {
          setSelectedSummary(summary);
          const idx = matches.findIndex((m) => keyOf(m) === selectedKey);
          if (idx >= 0 && matches[idx].kind === "external") {
            const updated: InquiryMatch = {
              ...matches[idx],
              record: mapWarehouseRecord(matches[idx].record as unknown as any, summary, ar),
            };
            setMatches((prev) => prev.map((m, i) => (i === idx ? updated : m)));
          }
        }
      })
      .catch((err) => {
        if (active) setDetailError(err instanceof Error ? err.message : T("Failed to load details", "فشل تحميل التفاصيل", ar));
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => { active = false; };
  }, [selectedKey, ar]);

  function keyOf(m: InquiryMatch) {
    return m.kind === "local" ? `local:${m.client.id}` : `external:${(m.record as DynamicsLookupRecord).idNumber}:${m.warehouseId ?? ""}`;
  }

  async function handleRegister(match: InquiryMatch) {
    if (match.kind !== "external" || match.warehouseId == null || registeringKey) return;
    const key = keyOf(match);
    setRegisteringKey(key);
    try {
      const result = await customerWarehouseService.importCustomer(match.warehouseId);
      const customerId =
        result?.customerId ??
        result?.id ??
        result?.data?.customerId ??
        result?.data?.id ??
        result?.customer?.id ??
        result?.data?.customer?.id;
      if (customerId) {
        setRegisteredIds((prev) => new Set(prev).add((match.record as DynamicsLookupRecord).idNumber));
        showToast(T("Customer imported. The identity has been added to your local customer list.", "تم استيراد العميل. تمت إضافة الهوية إلى قائمة العملاء المحلية.", ar));
      } else {
        throw new Error(T("Import returned no customer id", "لم يُرجع الاستيراد معرف عميل", ar));
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : T("Import failed. Please try again.", "فشل الاستيراد. يُرجى المحاولة مرة أخرى.", ar));
    } finally {
      setRegisteringKey(null);
    }
  }

  const view = useMemo(() => {
    if (!selected) return null;
    if (selected.kind === "local") {
      const c = selected.client;
      return {
        name: c.name, nameAr: c.nameAr, phone: c.phone,
        idType: c.idType, idNumber: c.idNumber, licenseNumber: c.licenseNumber,
        blacklisted: c.blacklisted, rating: c.rating, contracts: c.contracts,
        kycStatus: c.kycStatus, yakeenStatus: c.yakeenStatus,
        debts: c.debts ?? [], disputes: c.disputes ?? [],
        isLocal: true, localId: c.id,
      };
    }
    const r = selected.record;
    return {
      name: r.name, nameAr: r.nameAr, phone: r.phone,
      idType: r.idType, idNumber: r.idNumber, licenseNumber: r.licenseNumber ?? "—",
      blacklisted: r.blacklisted, rating: 0, contracts: 0,
      kycStatus: null, yakeenStatus: undefined,
      debts: r.debts, disputes: r.disputes,
      isLocal: r.isRegisteredLocally ?? false,
      localId: r.localCustomerId ?? null,
    };
  }, [selected]);

  const outstandingDebt = view ? view.debts.reduce((s: number, d: ClientDebt) => s + (d.status !== "paid" ? d.amount : 0), 0) : 0;
  const openDisputes = view ? view.disputes.filter((d: ClientDispute) => d.status === "open").length : 0;
  const officesInvolved = view
    ? new Set([...view.debts, ...view.disputes].filter((r) => r.office !== "Maarkbh").map((r) => r.office)).size
    : 0;

  return (
    <div>
      {/* Search bar */}
      <div className="mb-5 max-w-[520px]">
        <Input
          variant="search"
          icon={<Search size={15} />}
          autoFocus
          placeholder={T("Enter phone, national ID, license no., or name…", "أدخل الهاتف أو رقم الهوية أو الرخصة أو الاسم…", ar)}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelectedKey(null); }}
          suffix={
            query && (
              <IconButton size="sm" variant="ghost" onClick={() => { setQuery(""); setSelectedKey(null); }}>
                <X size={13} />
              </IconButton>
            )
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: results */}
        <div>
          {query.trim().length < 2 ? (
            <div className="rounded-xl p-10 mk-surface flex flex-col items-center justify-center gap-3 text-center text-mk-ink-400">
              <UserSearch size={30} strokeWidth={1.5} />
              <span className="mk-label">{T("Start typing to query the warehouse network", "ابدأ الكتابة للاستعلام من شبكة المستودع", ar)}</span>
            </div>
          ) : loading ? (
            <div className="rounded-xl p-10 mk-surface flex flex-col items-center justify-center gap-3 text-center text-mk-ink-400">
              <Loader2 size={30} className="animate-spin" />
              <span className="mk-label">{T("Searching…", "جاري البحث…", ar)}</span>
            </div>
          ) : error ? (
            <div className="rounded-xl p-10 mk-surface flex flex-col items-center justify-center gap-3 text-center text-mk-danger">
              <FileWarning size={30} strokeWidth={1.5} />
              <span className="mk-label">{error}</span>
            </div>
          ) : matches.length === 0 ? (
            <div className="rounded-xl p-10 mk-surface flex flex-col items-center justify-center gap-3 text-center text-mk-ink-400">
              <FileWarning size={30} strokeWidth={1.5} />
              <span className="mk-label">{T("No matching identity found in the network", "لا يوجد سجل مطابق في الشبكة", ar)}</span>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden mk-surface">
              {matches.map((m, idx) => {
                const key = keyOf(m);
                const active = key === selectedKey;
                const name = m.kind === "local" ? m.client.name : m.record.name;
                const nameAr = m.kind === "local" ? m.client.nameAr : m.record.nameAr;
                const phone = m.kind === "local" ? m.client.phone : m.record.phone;
                const idNumber = m.kind === "local" ? m.client.idNumber : m.record.idNumber;
                const blacklisted = m.kind === "local" ? m.client.blacklisted : m.record.blacklisted;
                const kyc = m.kind === "local" ? KYC_BADGE[m.client.kycStatus] : null;
                const warehouseRegistered = m.kind === "external" && m.record.isRegisteredLocally && m.record.localCustomerId;
                const alreadyRegistered = m.kind === "local" || warehouseRegistered || registeredIds.has(m.record.idNumber);
                const isRegistering = registeringKey === key;
                const canContract = m.kind === "local" && !m.client.blacklisted && m.client.kycStatus === "verified";
                return (
                  <div
                    key={key}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedKey(key)}
                    onKeyDown={(e) => { if (e.key === "Enter") setSelectedKey(key); }}
                    className="w-full flex items-center gap-3 px-5 py-4 text-start cursor-pointer transition-colors duration-150"
                    style={{
                      background: active ? "var(--color-mk-blue-50)" : "transparent",
                      borderBottom: idx < matches.length - 1 ? "1px solid var(--color-mk-border)" : "none",
                      borderInlineStart: blacklisted ? "3px solid var(--color-mk-danger)" : "3px solid transparent",
                    }}
                  >
                    <Avatar name={name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="mk-body text-mk-ink-900 truncate">{ar ? nameAr : name}</div>
                      <div className="flex items-center gap-2 mk-overline text-mk-ink-400 mt-1">
                        <span className="flex items-center gap-1"><Phone size={10} />{phone}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1 font-mono"><CreditCard size={10} />{idNumber}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex flex-col items-end gap-1">
                        {m.kind === "external" && warehouseRegistered ? (
                          <Badge variant="success" dot>
                            {T("In customer list", "موجود في قائمة العملاء", ar)}
                          </Badge>
                        ) : (
                          <Badge variant={blacklisted ? "danger" : kyc?.variant ?? "neutral"} dot>
                            {blacklisted ? T("Blacklisted", "قائمة سوداء", ar) : kyc ? T(...kyc.label, ar) : T("Not registered", "غير مسجل", ar)}
                          </Badge>
                        )}
                        {m.kind === "external" && (
                          <span className={`mk-overline ${warehouseRegistered ? "text-mk-success" : "text-mk-warning"}`}>
                            {warehouseRegistered
                              ? T("Warehouse + local", "مستودع + محلي", ar)
                              : T("Warehouse only", "من المستودع فقط", ar)}
                          </span>
                        )}
                      </div>
                      {canContract && m.kind === "local" && (
                        <Link
                          href={`/employee/new-contract?clientId=${m.client.id}`}
                          title={T("Create contract", "إنشاء عقد", ar)}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center justify-center w-7 h-7 rounded-full bg-mk-blue-500 text-white no-underline shrink-0"
                        >
                          <FileSignature size={13} />
                        </Link>
                      )}
                      {alreadyRegistered ? (
                        <span
                          title={T("Already in customer list", "موجود في قائمة العملاء", ar)}
                          className="flex items-center justify-center w-7 h-7 rounded-full bg-mk-mint-500/15 text-mk-mint-600 shrink-0"
                        >
                          <CheckCircle size={14} />
                        </span>
                      ) : (
                        <IconButton
                          size="sm"
                          variant="active"
                          className="bg-mk-blue-500 text-white hover:bg-mk-blue-500 disabled:opacity-70"
                          title={T("Add to customer list", "إضافة إلى قائمة العملاء", ar)}
                          onClick={(e) => { e.stopPropagation(); handleRegister(m); }}
                          disabled={isRegistering}
                        >
                          {isRegistering ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
                        </IconButton>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: quick-look card */}
        <div>
          {!view ? (
            <div className="rounded-xl p-10 mk-surface flex flex-col items-center justify-center gap-3 text-center text-mk-ink-400 h-full">
              <ShieldCheck size={30} strokeWidth={1.5} />
              <span className="mk-label">{T("Select a result to view the network summary", "اختر نتيجة لعرض ملخص الشبكة", ar)}</span>
            </div>
          ) : detailLoading ? (
            <div className="rounded-xl p-10 mk-surface flex flex-col items-center justify-center gap-3 text-center text-mk-ink-400 h-full">
              <Loader2 size={30} className="animate-spin" />
              <span className="mk-label">{T("Loading details…", "جاري تحميل التفاصيل…", ar)}</span>
            </div>
          ) : (
            <div className="rounded-xl p-6 mk-surface flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Avatar name={ar ? view.nameAr : view.name} size="lg" className={view.blacklisted ? "grayscale opacity-50" : ""} />
                <div className="flex-1">
                  <div className="mk-body leading-tight text-mk-ink-900">{ar ? view.nameAr : view.name}</div>
                  <p className="mk-caption font-mono mt-1 text-mk-ink-400">{view.isLocal ? view.localId : T("Not registered with Maarkbh", "غير مسجل لدى مركبة", ar)}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {view.blacklisted ? (
                      <Badge variant="danger" dot>{T("Blacklisted", "قائمة سوداء", ar)}</Badge>
                    ) : view.kycStatus ? (
                      <Badge variant={KYC_BADGE[view.kycStatus].variant} dot>{T(...KYC_BADGE[view.kycStatus].label, ar)}</Badge>
                    ) : (
                      <Badge variant="neutral" dot>{T("Not a Maarkbh customer", "ليس عميلاً لدى مركبة", ar)}</Badge>
                    )}
                    {view.rating > 0 && (
                      <span className="flex items-center gap-1 mk-caption text-mk-warning">
                        <Star size={12} className="fill-current" /> {view.rating}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {view.isLocal ? (
                    !view.blacklisted && view.kycStatus === "verified" && (
                      <Link
                        href={`/employee/new-contract?clientId=${view.localId}`}
                        className="flex items-center gap-2 px-3 py-2 rounded-full mk-caption text-white bg-mk-blue-500 no-underline"
                      >
                        <FileSignature size={13} /> {T("Create contract", "إنشاء عقد", ar)}
                      </Link>
                    )
                  ) : selected && selected.kind === "external" && (registeredIds.has(selected.record.idNumber) || selected.record.isRegisteredLocally) ? (
                    <Link
                      href={customerProfilePath(selected.record.localCustomerId)}
                      className="flex items-center gap-2 px-3 py-2 rounded-full mk-caption text-white bg-mk-mint-500 no-underline"
                    >
                      <CheckCircle size={13} /> {T("View customer", "عرض العميل", ar)}
                    </Link>
                  ) : (
                    <Button variant="primary" size="sm" disabled={!!registeringKey || selected?.kind !== "external"} onClick={() => selected && handleRegister(selected)}>
                      {registeringKey === selectedKey ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
                      {T("Add to customer list", "إضافة إلى قائمة العملاء", ar)}
                    </Button>
                  )}
                  {(view.isLocal || (selected?.kind === "external" && selected.record.isRegisteredLocally)) && (
                    <span className="flex items-center gap-1 mk-overline text-mk-mint-600">
                      <CheckCircle size={11} /> {T("Already in customer list", "موجود في قائمة العملاء", ar)}
                    </span>
                  )}
                </div>
              </div>

              {view.blacklisted && (
                <div className="flex items-center gap-2 p-3 rounded-xl border border-mk-danger/20 bg-mk-danger/5 mk-caption text-mk-danger">
                  <Ban size={14} className="shrink-0" />
                  {T("This identity is flagged across the network — proceed with caution", "هذه الهوية موقوفة عبر الشبكة - يُرجى التعامل بحذر", ar)}
                </div>
              )}

              {detailError && (
                <div className="flex items-center gap-2 p-3 rounded-xl border border-mk-warning/20 bg-mk-warning/5 mk-caption text-mk-warning">
                  <FileWarning size={14} className="shrink-0" />
                  {detailError}
                </div>
              )}

              {/* Quick facts */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3 bg-mk-ink-50 flex flex-col gap-1">
                  <span className="mk-overline uppercase tracking-wider text-mk-ink-400">{T("Maarkbh contracts", "عقود مركبة", ar)}</span>
                  <span className="mk-body text-mk-ink-900">{view.contracts}</span>
                </div>
                <div className="rounded-xl p-3 bg-mk-ink-50 flex flex-col gap-1">
                  <span className="mk-overline uppercase tracking-wider text-mk-ink-400">{T("Offices involved", "المكاتب المعنية", ar)}</span>
                  <span className={`mk-body ${officesInvolved > 0 ? "text-mk-warning" : "text-mk-ink-900"}`}>{officesInvolved}</span>
                </div>
                <div className="rounded-xl p-3 col-span-2 flex items-center justify-between" style={{ background: outstandingDebt > 0 ? "rgba(220,38,38,0.06)" : "var(--color-mk-ink-50)" }}>
                  <span className="flex items-center gap-2 mk-overline text-mk-ink-500">
                    <Wallet size={13} /> {T("Outstanding debts & claims (all offices)", "المديونيات والمطالبات المستحقة (كل المكاتب)", ar)}
                  </span>
                  <span className={`mk-body ${outstandingDebt > 0 ? "text-mk-danger" : "text-mk-success"}`}>
                    {outstandingDebt > 0 ? `${outstandingDebt} ${T("SAR", "ريال", ar)}` : T("None", "لا يوجد", ar)}
                  </span>
                </div>
              </div>

              {/* Debts by office */}
              <div className="flex flex-col gap-2 border-t border-mk-ink-100 pt-3">
                <span className="mk-overline uppercase tracking-wider text-mk-ink-400">{T("Debts", "المديونيات", ar)}</span>
                {view.debts.length === 0 ? (
                  <div className="flex items-center gap-2 p-3 rounded-xl border border-mk-success/20 bg-mk-success/5 mk-overline text-mk-success">
                    <CheckCircle2 size={12} className="shrink-0" />
                    <span>{T("No debts on file", "لا توجد مديونيات مسجلة", ar)}</span>
                  </div>
                ) : (
                  view.debts.map((d: ClientDebt) => (
                    <div key={d.id} className="p-3 rounded-xl border border-mk-ink-100 bg-mk-ink-50/50 flex flex-col gap-1 text-start">
                      <div className="flex justify-between items-center mk-caption">
                        <span className="mk-label text-mk-ink-900">{ar ? d.typeAr : d.type}</span>
                        <div className="flex items-center gap-2">
                          <span className="mk-label text-mk-blue-600">{d.amount} {T("SAR", "ريال", ar)}</span>
                          <Badge variant={DEBT_BADGE[d.status].variant} className="mk-overline px-2 py-0">{T(...DEBT_BADGE[d.status].label, ar)}</Badge>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 mk-overline ${d.office === "Maarkbh" ? "text-mk-blue-500" : "text-mk-warning"}`}>
                        <Building2 size={10} /> {ar ? d.officeAr : d.office}
                        <span className="mk-caption text-mk-ink-300">· {d.date}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Disputes / claims by office */}
              <div className="flex flex-col gap-2 border-t border-mk-ink-100 pt-3">
                <span className="mk-overline uppercase tracking-wider text-mk-ink-400">{T("Claims & disputes", "المطالبات والنزاعات", ar)}</span>
                {view.disputes.length === 0 ? (
                  <div className="flex items-center gap-2 p-3 rounded-xl border border-mk-success/20 bg-mk-success/5 mk-overline text-mk-success">
                    <CheckCircle2 size={12} className="shrink-0" />
                    <span>{T("No claims or disputes on file", "لا توجد مطالبات أو نزاعات مسجلة", ar)}</span>
                  </div>
                ) : (
                  view.disputes.map((d: ClientDispute) => (
                    <div key={d.id} className="p-3 rounded-xl border border-mk-ink-100 bg-mk-ink-50/50 flex flex-col gap-1 text-start">
                      <div className="flex justify-between items-center mk-caption">
                        <span className="mk-label text-mk-ink-900">{ar ? d.typeAr : d.type}</span>
                        <div className="flex items-center gap-2">
                          {d.amount && <span className="mk-label text-mk-blue-600">{d.amount} {T("SAR", "ريال", ar)}</span>}
                          <Badge variant={d.status === "open" ? "warning" : "success"} className="mk-overline px-2 py-0">{ar ? d.statusAr : d.status}</Badge>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 mk-overline ${d.office === "Maarkbh" ? "text-mk-blue-500" : "text-mk-warning"}`}>
                        <Building2 size={10} /> {ar ? d.officeAr : d.office}
                        <span className="mk-caption text-mk-ink-300">· {d.date}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Identity quick check */}
              <div className="flex flex-col gap-2 border-t border-mk-ink-100 pt-3">
                <span className="mk-overline uppercase tracking-wider text-mk-ink-400">{T("Identity", "الهوية", ar)}</span>
                <div className="flex justify-between items-center mk-label border-b border-mk-ink-100 pb-2">
                  <span className="flex items-center gap-2 text-mk-ink-500"><CreditCard size={13} className="text-mk-ink-400" />{T(view.idType, view.idType, ar)}</span>
                  <strong className="font-mono text-mk-ink-900">{view.idNumber}</strong>
                </div>
                <div className="flex justify-between items-center mk-label border-b border-mk-ink-100 pb-2">
                  <span className="flex items-center gap-2 text-mk-ink-500"><Phone size={13} className="text-mk-ink-400" />{T("Phone", "الهاتف", ar)}</span>
                  <strong className="text-mk-ink-900">{view.phone}</strong>
                </div>
                {view.isLocal && view.yakeenStatus && (
                  <div className="flex justify-between items-center mk-label">
                    <span className="flex items-center gap-2 text-mk-ink-500">
                      {view.yakeenStatus === "verified" ? <ShieldCheck size={13} className="text-mk-success" /> : <ShieldAlert size={13} className="text-mk-warning" />}
                      {T("Yakeen check", "التحقق من ياقين", ar)}
                    </span>
                    <strong className="text-mk-ink-900">
                      {T(
                        view.yakeenStatus === "verified" ? "Verified" : view.yakeenStatus === "pending" ? "Pending" : view.yakeenStatus === "error" ? "Failed" : "Not verified",
                        view.yakeenStatus === "verified" ? "تم التحقق" : view.yakeenStatus === "pending" ? "قيد التحقق" : view.yakeenStatus === "error" ? "فشل التحقق" : "غير موثّق",
                        ar
                      )}
                    </strong>
                  </div>
                )}
              </div>

              {view.isLocal && (
                <Link
                  href={customerProfilePath(view.localId)}
                  className="flex items-center justify-center gap-2 py-3 rounded-full mk-label text-mk-blue-600 border border-mk-blue-100 bg-mk-blue-50 no-underline mt-1"
                >
                  {T("View full customer profile", "عرض الملف الكامل للعميل", ar)} <ExternalLink size={14} />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
