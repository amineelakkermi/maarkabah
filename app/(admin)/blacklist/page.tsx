"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, ShieldAlert, Search, Loader2, FileWarning, UserSearch } from "lucide-react";
import { Badge, Button, Input, Table, Th, Td } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { blacklistService, customerEvents } from "@/lib/api-services";
import { formatPhone } from "@/lib/formatting";
import { VerificationStatus } from "@/lib/api-types";
import CustomerInquiryPage from "@/components/shared/customers/CustomerInquiryPage";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

const ID_TYPE_AR: Record<string, string> = {
  "Saudi ID": "هوية وطنية",
  Iqama: "إقامة",
  Passport: "جواز سفر",
  "GCC ID": "هوية خليجية",
};

type VerificationDisplay = "pending" | "verified" | "rejected";

interface BlacklistItem {
  id: number;
  name: string;
  nameAr: string;
  phone: string;
  idType: string;
  idNumber: string;
  branch: string;
  reason?: string;
  date: string;
  verificationStatus: VerificationDisplay;
}

interface BlacklistApiItem {
  id: number | string;
  identityType?: number;
  maskedIdNumber?: string;
  reportedBy?: string;
  reason?: string;
  date?: string;
  isVerified?: boolean;
}

function getIdTypeLabel(code: number | undefined): string {
  if (code === 1) return "Saudi ID";
  if (code === 2) return "Iqama";
  if (code === 3) return "Passport";
  if (code === 4) return "GCC ID";
  return "ID Document";
}

function maskId(value: string): string {
  if (!value || value.length < 6) return value;
  return `${value.slice(0, 4)}••${value.slice(-4)}`;
}

function formatGregorianDate(value: string | undefined, ar: boolean): string {
  if (!value) return "—";
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return date.toLocaleDateString(ar ? "en-GB" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function mapBlacklistApiItem(item: BlacklistApiItem, ar: boolean): BlacklistItem {
  const idType = getIdTypeLabel(item.identityType);
  const idNumber = item.maskedIdNumber || "";

  return {
    id: Number(item.id),
    name: idNumber,
    nameAr: idNumber,
    phone: "",
    idType,
    idNumber,
    branch: item.reportedBy || (ar ? "غير معروف" : "Unknown"),
    reason: item.reason?.trim() || undefined,
    date: formatGregorianDate(item.date, ar),
    verificationStatus: item.isVerified === true ? "verified" : "pending",
  };
}

export default function BlacklistPage() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";

  const [entries, setEntries] = useState<BlacklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const triggerReload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await blacklistService.search({
          search: "",
          pageNumber: 1,
          pageSize: 100,
        });
        console.log("[Blacklist] API response:", response);
        const items = response?.items ?? response?.data?.items ?? response?.data ?? response ?? [];
        const mapped = Array.isArray(items)
          ? items.map((item) => mapBlacklistApiItem(item as BlacklistApiItem, ar))
          : [];
        if (active) setEntries(mapped);
      } catch (err) {
        console.error("Error loading blacklist:", err);
        if (active) setError(err instanceof Error ? err.message : T("Failed to load blacklist", "فشل تحميل القائمة السوداء", ar));
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    const unsubscribe = customerEvents.onReload(triggerReload);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [ar, reloadKey]);

  const filtered = entries.filter((b) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      b.name.toLowerCase().includes(q) ||
      b.nameAr.toLowerCase().includes(q) ||
      b.phone.toLowerCase().includes(q) ||
      b.idNumber.toLowerCase().includes(q) ||
      b.branch.toLowerCase().includes(q) ||
      (b.reason?.toLowerCase() ?? "").includes(q)
    );
  });

  const HOW_IT_WORKS = [
    {
      icon: "🌐",
      titleEn: "Network-wide",
      titleAr: "على مستوى الشبكة",
      descEn: "All partner offices share and read the same DB — a bad renter is flagged across the network.",
      descAr: "جميع المكاتب الشريكة تشارك وتقرأ نفس قاعدة البيانات — يُحدَّد المستأجر المشكِل عبر كامل الشبكة.",
    },
    {
      icon: "✅",
      titleEn: "Verified entries",
      titleAr: "إدخالات موثقة",
      descEn: "Entries require confirmation from at least 1 other office before flagging at booking time.",
      descAr: "تتطلب الإدخالات تأكيداً من مكتب آخر واحد على الأقل قبل التحذير عند الحجز.",
    },
    {
      icon: "🔒",
      titleEn: "Partial IDs only",
      titleAr: "هويات جزئية فقط",
      descEn: "Only masked IDs are stored (e.g., 1077••5512) — no full personal data is shared.",
      descAr: "تُخزَّن الهويات المقنّعة فقط (مثل ١٠٧٧••٥٥١٢) — لا تُشارك أي بيانات شخصية كاملة.",
    },
  ];

  const VERIFICATION_BADGE: Record<VerificationDisplay, { variant: "success" | "warning" | "danger"; label: [string, string] }> = {
    verified: { variant: "success", label: ["Verified", "موثق"] },
    pending: { variant: "warning", label: ["Pending", "في الانتظار"] },
    rejected: { variant: "danger", label: ["Rejected", "مرفوض"] },
  };

  return (
    <div className="flex flex-col gap-8">
      {/* ── Section: customer identity inquiry (same as /customers/inquiry) ── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-mk-blue-50 text-mk-blue-500">
            <UserSearch size={20} />
          </div>
          <div className="min-w-0">
            <div className="mk-h4 text-mk-ink-900">
              {T("Customer inquiry", "الاستعلام عن عميل", ar)}
            </div>
            <div className="mk-caption mt-0.5 text-mk-ink-500">
              {T(
                "Look up an identity across the shared network before renting or flagging.",
                "استعلم عن الهوية عبر الشبكة المشتركة قبل التأجير أو الإبلاغ.",
                ar
              )}
            </div>
          </div>
        </div>
        <CustomerInquiryPage customerProfilePath={(id) => `/customers/${id ?? ""}`} />
      </section>

      <hr className="border-mk-ink-100" />

      {/* ── Section: shared blacklist ── */}
      <section>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-mk-danger/10 text-mk-danger">
          <ShieldAlert size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="mk-h4 text-mk-ink-900">
            {T("Shared blacklist", "القائمة السوداء المشتركة", ar)}
          </div>
          <div className="mk-caption mt-0.5 text-mk-ink-500">
            {T(
              "Flagged identities reported by partner offices across the network.",
                "الهويات المبلغ عنها من مكاتب الشبكة.",
                ar
            )}
          </div>
        </div>
        <Badge variant="neutral" className="shrink-0">
          {T(
            `${entries.length} entries`,
            `${entries.length} إدخال`,
            ar
          )}
        </Badge>
      </div>

      {/* Search bar */}
      <div className="mb-4 max-w-md">
        <Input
          variant="search"
          icon={<Search size={14} />}
          placeholder={T("Search by ID, branch, or reason…", "ابحث بالهوية، المكتب، أو السبب…", ar)}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-x-auto mk-surface">
        <Table className="min-w-[700px]">
          <thead>
            <tr>
              {[
                T("ID type · Number", "نوع الهوية · الرقم", ar),
                T("Reported by", "أبلغ عنه", ar),
                T("Reason", "السبب", ar),
                T("Date", "التاريخ", ar),
                T("Verification", "التحقق", ar),
                "",
              ].map((h, i) => <Th key={i}>{h}</Th>)}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <Td colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center gap-3 text-mk-ink-400">
                    <Loader2 size={32} className="animate-spin" />
                    <span className="mk-label">{T("Loading blacklist...", "جاري تحميل القائمة السوداء...", ar)}</span>
                  </div>
                </Td>
              </tr>
            ) : error ? (
              <tr>
                <Td colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center gap-3 text-mk-danger">
                    <FileWarning size={32} strokeWidth={1.5} />
                    <span className="mk-label">{error}</span>
                    <Button variant="outline" size="sm" onClick={triggerReload}>
                      {T("Retry", "إعادة المحاولة", ar)}
                    </Button>
                  </div>
                </Td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <Td colSpan={6} className="text-center py-12 text-mk-ink-400">
                  {T("No blacklisted customers", "لا يوجد عملاء في القائمة السوداء", ar)}
                </Td>
              </tr>
            ) : (
              filtered.map((b) => {
                const status = VERIFICATION_BADGE[b.verificationStatus];
                return (
                  <tr key={b.id} className="cursor-pointer transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50">
                    <Td className="flex flex-col items-start">
                      <div className="mk-label text-mk-ink-900">
                        {ar ? ID_TYPE_AR[b.idType] ?? b.idType : b.idType}
                      </div>
                      <div dir="ltr" className="font-mono mk-caption mt-1 text-mk-ink-500" style={{ unicodeBidi: "embed" }}>
                        {b.idNumber}
                      </div>
                    </Td>
                    <Td className="mk-label text-mk-ink-700">{b.branch}</Td>
                    <Td className="mk-label text-mk-ink-700">{b.reason || "—"}</Td>
                    <Td className="mk-caption text-mk-ink-500">{b.date}</Td>
                    <Td>
                      <Badge variant={status.variant} dot>
                        {status.variant === "success" ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                        {T(...status.label, ar)}
                      </Badge>
                    </Td>
                    <Td>
                      <Button variant="outline" size="sm">{T("Details", "التفاصيل", ar)}</Button>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </div>

      {/* How it works */}
      <div className="rounded-xl p-4 sm:p-6 mt-4 mk-surface">
        <div className="mk-label mb-4 text-mk-ink-900">
          {T("How it works", "كيف تعمل", ar)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {HOW_IT_WORKS.map((item) => (
            <div key={item.titleEn} className="p-4 rounded-md bg-mk-ink-50">
              <div className="mk-h3 mb-2">{item.icon}</div>
              <div className="mk-label mb-1 text-mk-ink-900">
                {ar ? item.titleAr : item.titleEn}
              </div>
              <div className="mk-caption text-mk-ink-500">
                {ar ? item.descAr : item.descEn}
              </div>
            </div>
          ))}
        </div>
      </div>
      </section>
    </div>
  );
}
