"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  Search, X, Ban, SearchX, ExternalLink,
  UserPlus, Loader2, CheckCircle, FileSignature, type LucideIcon,
} from "lucide-react";
import { Avatar, Badge, Button, IconButton, Input, useToast } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { customerService, customerWarehouseService } from "@/lib/api-services";
import { formatPhone } from "@/lib/formatting";
import { VerificationStatus } from "@/lib/api-types";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

const ID_TYPE_LABELS: Record<number, { en: string; ar: string }> = {
  1: { en: "Saudi ID", ar: "هوية وطنية" },
  2: { en: "Iqama", ar: "إقامة" },
  3: { en: "Passport", ar: "جواز سفر" },
  4: { en: "GCC ID", ar: "هوية خليجية" },
};

// Non-Saudi identity holders are capped at this many open contracts.
const OPEN_CONTRACTS_LIMIT = 3;

// ─── Small building blocks (designer parity: InfoCell + EmptyState) ──────────

function InfoCell({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="mk-overline !font-normal text-mk-ink-400 uppercase">{label}</span>
      <span className="mk-label-muted text-mk-ink-900 mt-1">{value}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <Icon size={36} strokeWidth={1.5} className="text-mk-ink-300" />
      <div className="mk-label text-mk-ink-900">{title}</div>
      <div className="mk-caption text-mk-ink-500">{description}</div>
    </div>
  );
}

// ─── View model ─────────────────────────────────────────────────────────────

type DebtRow = { office: string; amount: number; date: string; contractNumber?: string; note?: string };

type InquiryView = {
  kind: "local" | "external";
  name: string;
  nameAr: string;
  phone: string;
  idTypeCode?: number;
  idType: string;
  idNumber: string;
  licenseNumber: string;
  address: string;
  birthDate: string;
  blacklisted: boolean;
  verificationStatus?: number;
  localCustomerId?: number;
  warehouseCustomerId?: number;
  previousContracts: number;
  openContracts: number;
  outstandingDebt: number;
  debts: DebtRow[];
  claims: DebtRow[];
  isForeign: boolean; // anything that isn't a Saudi national ID
};

function maskId(value: string | undefined | null): string {
  const clean = String(value ?? "").trim();
  if (!clean) return "—";
  if (clean.length < 6 || /[\*•]/.test(clean)) return clean;
  return `${clean.slice(0, 4)}••${clean.slice(-4)}`;
}

function idTypeLabel(code: number | undefined): string {
  return (code ? ID_TYPE_LABELS[code]?.en : undefined) ?? "ID Document";
}

function mapDebtRow(row: any): DebtRow {
  return {
    office: row?.officeName ?? row?.office ?? "",
    amount: Number(row?.amount ?? 0),
    date: String(row?.date ?? "").slice(0, 10),
    contractNumber: row?.contractNumber,
    note: row?.note ?? row?.reason,
  };
}

// A stored masked ID ("1054••8822") matches a typed ID sharing the visible head/tail.
function idMatches(stored: string | undefined, typed: string): boolean {
  const s = String(stored ?? "");
  if (!s) return false;
  if (!/[\*•]/.test(s)) return s === typed;
  const [head, tail] = s.split(/[\*•]+/);
  return typed.length >= head.length + (tail?.length ?? 0) && typed.startsWith(head) && typed.endsWith(tail ?? "");
}

function mapInquiryResponse(res: any, queriedId: string): InquiryView | null {
  // The API wraps the payload in a `{ data, message }` envelope.
  const r = res?.data ?? res;
  if (!r || r.found === false) return null;
  const idTypeCode = r.identityType;
  const isLocal = !!r.isRegisteredLocally && r.localCustomerId != null;
  return {
    kind: isLocal ? "local" : "external",
    name: r.fullNameEn || "",
    nameAr: r.fullNameAr || "",
    phone: formatPhone(r.phoneNumber) ?? r.phoneNumber ?? "—",
    idTypeCode,
    idType: idTypeLabel(idTypeCode),
    idNumber: maskId(r.idNumber || queriedId),
    licenseNumber: r.licenseNumber || "—",
    address: r.address || "",
    birthDate: String(r.birthDate ?? "").slice(0, 10),
    blacklisted: !!r.isBlacklisted,
    verificationStatus: r.verificationStatus,
    localCustomerId: r.localCustomerId != null ? Number(r.localCustomerId) : undefined,
    warehouseCustomerId: r.warehouseCustomerId != null ? Number(r.warehouseCustomerId) : undefined,
    previousContracts: Number(r.previousContractsCount ?? 0),
    openContracts: Number(r.openContractsCount ?? 0),
    outstandingDebt: Number(r.outstandingDebt ?? 0),
    debts: (Array.isArray(r.debts) ? r.debts : []).map(mapDebtRow),
    claims: (Array.isArray(r.claims) ? r.claims : []).map(mapDebtRow),
    isForeign: idTypeCode != null && idTypeCode !== 1,
  };
}

function mapWarehouseItem(item: any, queriedId: string): InquiryView | null {
  if (!item) return null;
  const idTypeCode = item.identityType ?? item.idType;
  const isLocal = !!item.isRegisteredLocally && item.localCustomerId != null;
  return {
    kind: isLocal ? "local" : "external",
    name: item.fullNameEn || "",
    nameAr: item.fullNameAr || "",
    phone: formatPhone(item.phoneNumber ?? item.phone) ?? item.phoneNumber ?? "—",
    idTypeCode,
    idType: idTypeLabel(idTypeCode),
    idNumber: maskId(item.idNumber ?? item.maskedIdNumber ?? queriedId),
    licenseNumber: item.licenseNumber ?? "—",
    address: "",
    birthDate: "",
    blacklisted: !!(item.isNetworkBlacklisted ?? item.isBlacklisted ?? item.blacklisted),
    verificationStatus: undefined,
    localCustomerId: item.localCustomerId != null ? Number(item.localCustomerId) : undefined,
    warehouseCustomerId: item.id != null ? Number(item.id) : undefined,
    previousContracts: 0,
    openContracts: 0,
    outstandingDebt: 0,
    debts: [],
    claims: [],
    isForeign: idTypeCode != null && idTypeCode !== 1,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RenterVerification({
  contractHref, profileHref, initialId, readOnly = false,
}: {
  contractHref: (clientId: string | number) => string;
  profileHref: (clientId: string | number) => string;
  /** Opens with this ID already searched (e.g. the customer on a marketplace request). */
  initialId?: string;
  /** Result only: no profile / contract / add-to-list actions. */
  readOnly?: boolean;
}) {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const { showToast } = useToast();

  const [query, setQuery] = useState(initialId ?? "");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InquiryView | null | "none">(null);
  const [registering, setRegistering] = useState(false);
  const [registeredLocalId, setRegisteredLocalId] = useState<number | null>(null);
  const abortRef = useRef(0);

  const typed = query.replace(/\s/g, "");
  const canSearch = /^\d{5,15}$/.test(typed);

  const view: InquiryView | null = useMemo(() => {
    if (!result || result === "none") return null;
    // After a successful import the identity is now a local customer.
    if (registeredLocalId != null && result.kind === "external") {
      return { ...result, kind: "local", localCustomerId: registeredLocalId };
    }
    return result;
  }, [result, registeredLocalId]);

  const atOpenContractsLimit = !!view && view.isForeign && view.openContracts >= OPEN_CONTRACTS_LIMIT;

  async function runSearch(idNumber: string) {
    const ticket = ++abortRef.current;
    setLoading(true);
    setResult(null);
    setRegisteredLocalId(null);

    // The two lookups run in parallel: the single-identity inquiry (which also
    // reaches Dynamics GetClientInfo) and the shared-warehouse search.
    const [inquiryRes, warehouseRes] = await Promise.all([
      customerService.inquiry({ idNumber }).catch(() => null),
      customerWarehouseService.inquiry({ search: idNumber, pageNumber: 1, pageSize: 20 }).catch(() => null),
    ]);
    if (ticket !== abortRef.current) return;

    const fromInquiry = mapInquiryResponse(inquiryRes, idNumber);
    if (fromInquiry) {
      setResult(fromInquiry);
      setLoading(false);
      return;
    }

    const warehouseItems: any[] = warehouseRes?.items ?? warehouseRes?.data?.items ?? warehouseRes?.data ?? [];
    const items = Array.isArray(warehouseItems) ? warehouseItems : [];
    const best = items.find((it) => idMatches(it?.maskedIdNumber ?? it?.idNumber, idNumber)) ?? items[0];
    setResult(mapWarehouseItem(best, idNumber) ?? "none");
    setLoading(false);
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!canSearch) return;
    setSubmitted(typed);
    runSearch(typed);
  }

  // initialId auto-searches once on mount.
  useEffect(() => {
    if (initialId) {
      const id = initialId.replace(/\s/g, "");
      if (/^\d{5,15}$/.test(id)) {
        setSubmitted(id);
        runSearch(id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRegister() {
    if (!view?.warehouseCustomerId || registering) return;
    setRegistering(true);
    try {
      const res = await customerWarehouseService.importCustomer(view.warehouseCustomerId);
      const customerId =
        res?.customerId ?? res?.data?.customerId ?? res?.customer?.id ?? res?.data?.customer?.id ?? res?.id ?? res?.data?.id;
      if (customerId == null) throw new Error("no-id");
      setRegisteredLocalId(Number(customerId));
      showToast(T("Customer imported. The identity has been added to your local customer list.", "تم استيراد العميل. تمت إضافة الهوية إلى قائمة العملاء المحلية.", ar));
    } catch {
      showToast(T("Import failed — try again.", "فشل الاستيراد — حاول مرة أخرى.", ar));
    } finally {
      setRegistering(false);
    }
  }

  return (
    <div className="w-full">
      
      <div className="mx-auto w-full max-w-xl">
        <h2 className="mk-h3 text-mk-ink-900 text-center">
          {T("Check the customer before you issue the contract", "تحقّق من العميل قبل إصدار العقد", ar)}
        </h2>
        <p className="mk-body-sm text-mk-ink-500 text-center mt-2 mb-6">
          {T(
            "Enter the ID number to see debts, disputes and risk flags from the shared office network.",
            "أدخل رقم الهوية لعرض المديونيات والنزاعات وعلامات المخاطر من شبكة المكاتب المشتركة.",
            ar
          )}
        </p>

        <form onSubmit={handleSearch} className="mb-5 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              variant="search"
              icon={<Search size={15} />}
              autoFocus
              inputMode="numeric"
              dir="ltr"
              maxLength={15}
              aria-label={T("ID number", "رقم الهوية", ar)}
              placeholder={T("Enter the national ID or Iqama number", "أدخل رقم الهوية الوطنية أو الإقامة", ar)}
              value={query}
              onChange={(e) => { setQuery(e.target.value.replace(/[^\d\s]/g, "")); setSubmitted(null); setResult(null); }}
              suffix={
                query ? (
                  <IconButton type="button" size="sm" variant="ghost" onClick={() => { setQuery(""); setSubmitted(null); setResult(null); }}>
                    <X size={13} />
                  </IconButton>
                ) : undefined
              }
            />
          </div>
          {!view && (
            <Button type="submit" variant={submitted ? "outline" : "primary"} disabled={!canSearch || loading} className="justify-center sm:w-40">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              {T("Search", "بحث", ar)}
            </Button>
          )}
        </form>
      </div>

      {loading && (
        <div className="rounded-xl mk-surface py-12 flex items-center justify-center gap-3 text-mk-ink-400">
          <Loader2 size={28} className="animate-spin" />
          <span className="mk-label">{T("Checking the network…", "جارٍ الاستعلام في الشبكة…", ar)}</span>
        </div>
      )}

      {!loading && submitted && result === "none" && (
        <div className="rounded-xl mk-surface">
          <EmptyState
            icon={SearchX}
            title={T("No matching identity found in the network", "لا يوجد سجل مطابق في الشبكة", ar)}
            description={T("Check the ID number and try again.", "تأكد من رقم الهوية وحاول مرة أخرى.", ar)}
          />
        </div>
      )}

      {!loading && view && (
        <div className="flex flex-col gap-4 mk-enter">
          {/* 1 · Who is this — identity, status and the actions available */}
          <section className="rounded-xl mk-surface p-5 sm:p-6 flex flex-col gap-5">
            <div className="flex flex-wrap items-start gap-4">
              <Avatar name={ar ? view.nameAr : view.name} size="lg" className={view.blacklisted ? "grayscale opacity-50" : ""} />
              <div className="flex-1 min-w-48">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="mk-h4 leading-tight text-mk-ink-900">{(ar ? view.nameAr : view.name) || view.name || view.nameAr || "—"}</h3>
                </div>
                <p className={`${view.kind === "local" ? "mk-mono" : "mk-caption"} mt-1 text-mk-ink-400`}>
                  {view.kind === "local" ? view.localCustomerId : T("Not registered with Maarkbh", "غير مسجل لدى مركبة", ar)}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {view.blacklisted ? (
                    <Badge variant="danger" dot>{T("High risk", "عالي المخاطر", ar)}</Badge>
                  ) : view.kind === "local" ? (
                    <Badge variant="success" dot>{T("Maarkbh customer", "عميل لدى مركبة", ar)}</Badge>
                  ) : null}
                  {view.verificationStatus === VerificationStatus.Verified && (
                    <Badge variant="success" dot>{T("Verified", "موثّق", ar)}</Badge>
                  )}
                  {view.verificationStatus === VerificationStatus.Pending && (
                    <Badge variant="warning" dot>{T("Pending KYC", "قيد التحقق", ar)}</Badge>
                  )}
                  {view.verificationStatus === VerificationStatus.Rejected && (
                    <Badge variant="danger" dot>{T("Rejected", "مرفوض", ar)}</Badge>
                  )}
                </div>
              </div>

              {/* Actions */}
              {!readOnly && (
                <div className="flex flex-wrap items-stretch gap-3 w-full sm:w-auto sm:shrink-0">
                  {view.kind === "local" && view.localCustomerId != null ? (
                    <>
                      <Link
                        href={profileHref(view.localCustomerId)}
                        className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-5 py-2.5 rounded-full mk-label text-mk-ink-900 border border-mk-border bg-mk-bg-muted no-underline"
                      >
                        {T("Full customer profile", "الملف الكامل للعميل", ar)} <ExternalLink size={14} />
                      </Link>
                      {!view.blacklisted && !atOpenContractsLimit && (
                        <Link
                          href={contractHref(view.localCustomerId)}
                          className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-5 py-2.5 rounded-full mk-label text-white bg-mk-blue-500 no-underline"
                        >
                          <FileSignature size={14} /> {T("Create contract", "إنشاء عقد", ar)}
                        </Link>
                      )}
                    </>
                  ) : registeredLocalId != null ? (
                    <div className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-5 py-2.5 rounded-full mk-label text-mk-ink-900 bg-mk-bg-muted border border-mk-border">
                      <CheckCircle size={14} /> {T("Added", "تمت الإضافة", ar)}
                    </div>
                  ) : view.warehouseCustomerId != null ? (
                    <>
                      <p className="mk-caption text-mk-ink-400 w-full sm:w-auto sm:self-center sm:whitespace-nowrap">
                        {T("Not in your customer list — add to create a contract.", "غير مسجل في عملائك، أضفه لإنشاء عقد.", ar)}
                      </p>
                      <Button variant="primary" className="w-full sm:w-auto justify-center" disabled={registering} onClick={handleRegister}>
                        {registering ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                        {T("Add to customer list", "إضافة إلى قائمة العملاء", ar)}
                      </Button>
                    </>
                  ) : null}
                </div>
              )}
            </div>

            {view.blacklisted && (
              <div className="flex items-center gap-2 p-3 rounded-xl border border-mk-danger/20 bg-mk-danger/5 mk-label-muted text-mk-danger">
                <Ban size={14} className="shrink-0" />
                {T("This identity is flagged across the network — proceed with caution", "هذه الهوية موقوفة عبر الشبكة - يُرجى التعامل بحذر", ar)}
              </div>
            )}
            {atOpenContractsLimit && (
              <div className="flex items-center gap-2 p-3 rounded-xl border border-mk-border bg-mk-bg-muted mk-label-muted text-mk-ink-900">
                <Ban size={14} className="shrink-0 text-mk-ink-500" />
                {T(`Non-Saudi ID — already at the ${OPEN_CONTRACTS_LIMIT} open-contract limit`, `هوية غير سعودية — وصل بالفعل للحد الأقصى ${OPEN_CONTRACTS_LIMIT} عقود مفتوحة`, ar)}
              </div>
            )}

            {/* Verification data */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 border-t border-mk-border pt-5">
              <InfoCell label={T("ID type · Number", "نوع الهوية · الرقم", ar)} value={
                <span>
                  {T(view.idType, ID_TYPE_LABELS[view.idTypeCode ?? -1]?.ar ?? view.idType, ar)}{" "}
                  <bdi dir="ltr" className="font-mono">{view.idNumber}</bdi>
                </span>
              } />
              <InfoCell label={T("Address", "العنوان", ar)} value={view.address || T("Not available", "غير متوفر", ar)} />
              <InfoCell label={T("Date of birth", "تاريخ الميلاد", ar)} value={view.birthDate ? <bdi dir="ltr">{view.birthDate}</bdi> : T("Not available", "غير متوفر", ar)} />
              <InfoCell label={T("Previous contracts", "عدد العقود السابقة", ar)} value={String(view.previousContracts)} />
              <InfoCell
                label={T("Current contracts", "العقود الحالية (المفتوحة)", ar)}
                value={<span className={atOpenContractsLimit ? "text-mk-danger" : ""}>{view.openContracts}{view.isForeign ? ` / ${OPEN_CONTRACTS_LIMIT}` : ""}</span>}
              />
              <InfoCell
                label={T("Debts", "المديونيات", ar)}
                value={view.outstandingDebt > 0 ? <span className="text-mk-danger">{view.outstandingDebt} {T("SAR", "ريال", ar)}</span> : T("None", "لا يوجد", ar)}
              />
              <InfoCell
                label={T("Blacklist", "القائمة السوداء", ar)}
                value={view.blacklisted ? <span className="text-mk-danger">{T("Blacklisted", "مدرج في القائمة السوداء", ar)}</span> : T("Not blacklisted", "غير مدرج", ar)}
              />
              <InfoCell label={T("License", "رخصة القيادة", ar)} value={view.licenseNumber !== "—" ? <bdi dir="ltr" className="font-mono">{view.licenseNumber}</bdi> : "—"} />
              <InfoCell label={T("Phone", "الجوال", ar)} value={<bdi dir="ltr" className="font-mono">{view.phone}</bdi>} />
            </div>

            {/* Debts & claims details */}
            {view.debts.length > 0 && (
              <div className="border-t border-mk-border pt-4">
                <div className="mk-label text-mk-ink-900 mb-2">{T("Debts", "المديونيات", ar)}</div>
                <div className="flex flex-col gap-2">
                  {view.debts.map((d, i) => (
                    <div key={`debt-${i}`} className="flex items-center justify-between gap-3 rounded-md bg-mk-ink-50 px-4 py-2.5">
                      <div className="min-w-0">
                        <div className="mk-label text-mk-ink-900 truncate">{d.note || d.contractNumber || T("Debt", "مديونية", ar)}</div>
                        <div className="mk-caption text-mk-ink-500 truncate">{d.office}{d.date ? ` · ${d.date}` : ""}</div>
                      </div>
                      <div className="mk-label text-mk-danger shrink-0">{d.amount} {T("SAR", "ريال", ar)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {view.claims.length > 0 && (
              <div className="border-t border-mk-border pt-4">
                <div className="mk-label text-mk-ink-900 mb-2">{T("Disputes & claims", "النزاعات والمطالبات", ar)}</div>
                <div className="flex flex-col gap-2">
                  {view.claims.map((c, i) => (
                    <div key={`claim-${i}`} className="flex items-center justify-between gap-3 rounded-md bg-mk-ink-50 px-4 py-2.5">
                      <div className="min-w-0">
                        <div className="mk-label text-mk-ink-900 truncate">{c.note || c.contractNumber || T("Claim", "مطالبة", ar)}</div>
                        <div className="mk-caption text-mk-ink-500 truncate">{c.office}{c.date ? ` · ${c.date}` : ""}</div>
                      </div>
                      {c.amount > 0 && <div className="mk-label text-mk-warning shrink-0">{c.amount} {T("SAR", "ريال", ar)}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default RenterVerification;
