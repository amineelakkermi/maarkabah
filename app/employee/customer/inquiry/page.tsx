"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search, X, UserSearch, Phone, CreditCard, Star, Ban, ShieldCheck,
  ShieldAlert, Wallet, FileWarning, ExternalLink, Building2,
  UserPlus, CheckCircle2, Loader2, CheckCircle, FileSignature,
} from "lucide-react";
import { Avatar, Badge, Input, Button, IconButton } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import {
  CLIENTS, DYNAMICS_LOOKUP,
  type ClientProfile, type ClientDebt, type ClientDispute, type DynamicsLookupRecord,
} from "@/lib/data";

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

// Unified shape so the result list & detail panel can render either a
// registered Maarkbh customer or a Dynamics-only (unregistered) identity.
type InquiryMatch =
  | { kind: "local"; client: ClientProfile }
  | { kind: "external"; record: DynamicsLookupRecord };

export default function CustomerInquiryPage() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";

  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [registeringKey, setRegisteringKey] = useState<string | null>(null);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());

  const matches: InquiryMatch[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const norm = (s: string) => s.replace(/[\s•]/g, "").toLowerCase();

    const local: InquiryMatch[] = CLIENTS.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.nameAr.includes(q) ||
      norm(c.phone).includes(norm(q)) ||
      norm(c.idNumber).includes(norm(q)) ||
      norm(c.licenseNumber).includes(norm(q))
    ).map((client) => ({ kind: "local" as const, client }));

    const external: InquiryMatch[] = DYNAMICS_LOOKUP.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      r.nameAr.includes(q) ||
      norm(r.phone).includes(norm(q)) ||
      norm(r.idNumber).includes(norm(q))
    ).map((record) => ({ kind: "external" as const, record }));

    return [...local, ...external].slice(0, 8);
  }, [query]);

  const keyOf = (m: InquiryMatch) => (m.kind === "local" ? `local:${m.client.id}` : `external:${m.record.idNumber}`);
  const selected = matches.find((m) => keyOf(m) === selectedKey) ?? null;

  // Normalize the fields the detail panel needs regardless of source.
  const view = selected
    ? selected.kind === "local"
      ? {
        name: selected.client.name, nameAr: selected.client.nameAr, phone: selected.client.phone,
        idType: selected.client.idType, idNumber: selected.client.idNumber, licenseNumber: selected.client.licenseNumber,
        blacklisted: selected.client.blacklisted, rating: selected.client.rating, contracts: selected.client.contracts,
        kycStatus: selected.client.kycStatus as ClientProfile["kycStatus"] | null,
        yakeenStatus: selected.client.yakeenStatus,
        debts: selected.client.debts ?? [], disputes: selected.client.disputes ?? [],
        isLocal: true, localId: selected.client.id,
      }
      : {
        name: selected.record.name, nameAr: selected.record.nameAr, phone: selected.record.phone,
        idType: selected.record.idType, idNumber: selected.record.idNumber, licenseNumber: selected.record.licenseNumber ?? "—",
        blacklisted: selected.record.blacklisted, rating: 0, contracts: 0,
        kycStatus: null, yakeenStatus: undefined,
        debts: selected.record.debts, disputes: selected.record.disputes,
        isLocal: false, localId: null,
      }
    : null;

  const outstandingDebt = view ? view.debts.reduce((s: number, d: ClientDebt) => s + (d.status !== "paid" ? d.amount : 0), 0) : 0;
  const openDisputes = view ? view.disputes.filter((d: ClientDispute) => d.status === "open").length : 0;
  const officesInvolved = view
    ? new Set([...view.debts, ...view.disputes].filter((r) => r.office !== "Maarkbh").map((r) => r.office)).size
    : 0;

  function handleRegister(idNumber: string, key: string) {
    if (registeringKey) return;
    setRegisteringKey(key);
    setTimeout(() => {
      setRegisteringKey(null);
      setRegisteredIds((prev) => new Set(prev).add(idNumber));
    }, 1100);
  }

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
              <span className="mk-label">{T("Start typing to query the Dynamics network", "ابدأ الكتابة للاستعلام من شبكة دينامكس", ar)}</span>
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
                const alreadyRegistered = m.kind === "local" || registeredIds.has(idNumber);
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
                        <Badge variant={blacklisted ? "danger" : kyc?.variant ?? "neutral"} dot>
                          {blacklisted ? T("Blacklisted", "قائمة سوداء", ar) : kyc ? T(...kyc.label, ar) : T("Not registered", "غير مسجل", ar)}
                        </Badge>
                        {m.kind === "external" && (
                          <span className="mk-overline text-mk-warning">{T("Dynamics only", "من دينامكس فقط", ar)}</span>
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
                          onClick={(e) => { e.stopPropagation(); handleRegister(idNumber, key); }}
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
                  ) : registeredIds.has(view.idNumber) ? (
                    <span className="flex items-center gap-2 px-3 py-2 rounded-full mk-caption text-white bg-mk-mint-500">
                      <CheckCircle size={13} /> {T("Added", "تمت الإضافة", ar)}
                    </span>
                  ) : (
                    <Button variant="primary" size="sm" disabled={!!registeringKey} onClick={() => handleRegister(view.idNumber, selectedKey!)}>
                      {registeringKey === selectedKey ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
                      {T("Add to customer list", "إضافة إلى قائمة العملاء", ar)}
                    </Button>
                  )}
                  {view.isLocal && (
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
                  href={`/employee/customer/${view.localId}`}
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
