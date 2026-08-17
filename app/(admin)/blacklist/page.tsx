"use client";

import { useState, useEffect } from "react";
import { UsersRound, ShieldCheck, ShieldAlert, Search, Loader2, FileWarning } from "lucide-react";
import { Badge, Button, Input, Table, Th, Td } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { customerService, customerEvents } from "@/lib/api-services";
import { formatPhone } from "@/lib/formatting";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

const ID_TYPE_AR: Record<string, string> = {
  "Saudi ID": "هوية وطنية",
  Iqama: "إقامة",
  Passport: "جواز سفر",
  "GCC ID": "هوية خليجية",
};

interface BlacklistItem {
  id: number;
  name: string;
  nameAr: string;
  phone: string;
  idType: string;
  idNumber: string;
  reason?: string;
  date: string;
  verified?: boolean;
}

interface ApiCustomerItem {
  id: number | string;
  identityType?: number;
  idType?: number;
  fullNameEn?: string;
  name?: string;
  fullNameAr?: string;
  nameAr?: string;
  phoneNumber?: string;
  beneficiaryIdNumber?: string;
  visitor?: { passportNumber?: string; idNumber?: string };
  idNumber?: string;
  blacklistReason?: string;
  reason?: string;
  blacklistedAt?: string;
  joinedAt?: string;
  creationTime?: string;
  isBlacklistedVerified?: boolean;
  blacklistVerified?: boolean;
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

function mapCustomerToBlacklistItem(item: ApiCustomerItem): BlacklistItem {
  const idTypeCode = item.identityType ?? item.idType;
  const idType = getIdTypeLabel(idTypeCode);
  const rawId =
    item.beneficiaryIdNumber ||
    item.visitor?.passportNumber ||
    item.visitor?.idNumber ||
    item.idNumber ||
    "";

  return {
    id: Number(item.id),
    name: item.fullNameEn || item.name || "",
    nameAr: item.fullNameAr || item.nameAr || "",
    phone: formatPhone(item.phoneNumber),
    idType,
    idNumber: maskId(rawId),
    reason: item.blacklistReason || item.reason || undefined,
    date: item.blacklistedAt || item.joinedAt || item.creationTime || new Date().toISOString(),
    verified: item.isBlacklistedVerified ?? item.blacklistVerified ?? undefined,
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
        const response = await customerService.search({
          isBlacklisted: true,
          pageNumber: 1,
          pageSize: 100,
        });
        console.log("[Blacklist] API response:", response);
        const items = response?.items ?? response?.data?.items ?? response?.data ?? response ?? [];
        const mapped = Array.isArray(items)
          ? items.map((item) => mapCustomerToBlacklistItem(item as ApiCustomerItem))
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

  return (
    <div>
      {/* Network card */}
      <div className="flex items-center gap-4 rounded-xl px-6 py-5 mb-5 mk-surface">
        <div className="w-11 h-11 rounded-md flex items-center justify-center shrink-0 bg-mk-blue-50 text-mk-blue-500">
          <UsersRound size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="mk-h4 text-mk-ink-900">
            {T("Shared blacklist", "القائمة السوداء المشتركة", ar)}
          </div>
          <div className="mk-label mt-1 text-mk-ink-500">
            {T(
              `${entries.length} verified entries`,
              `${entries.length} إدخال موثق`,
              ar
            )}
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="mb-5 max-w-md">
        <Input
          variant="search"
          icon={<Search size={14} />}
          placeholder={T("Search by name, ID, or reason…", "ابحث بالاسم، الهوية، أو السبب…", ar)}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden mk-surface">
        <Table>
          <thead>
            <tr>
              {[
                T("Customer", "العميل", ar),
                T("ID type · Number", "نوع الهوية · الرقم", ar),
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
              filtered.map((b) => (
                <tr key={b.id} className="cursor-pointer transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50">
                  <Td>
                    <div className="mk-label text-mk-ink-900">{ar ? b.nameAr : b.name}</div>
                    <div className="mk-caption mt-1 text-mk-ink-500">{b.phone}</div>
                  </Td>
                  <Td>
                    <div className="font-mono mk-label text-mk-ink-900">{b.idNumber}</div>
                    <div className="mk-caption mt-1 text-mk-ink-500">
                      {ar ? ID_TYPE_AR[b.idType] ?? b.idType : b.idType}
                    </div>
                  </Td>
                  <Td className="mk-label text-mk-ink-700">{b.reason || "—"}</Td>
                  <Td className="mk-caption text-mk-ink-500">{new Date(b.date).toLocaleDateString(ar ? "ar-SA" : "en-US")}</Td>
                  <Td>
                    {b.verified ? (
                      <Badge variant="success"><ShieldCheck size={12} /> {T("Verified", "موثق", ar)}</Badge>
                    ) : (
                      <Badge variant="warning"><ShieldAlert size={12} /> {T("Awaiting", "في الانتظار", ar)}</Badge>
                    )}
                  </Td>
                  <Td>
                    <Button variant="outline" size="sm">{T("Details", "التفاصيل", ar)}</Button>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {/* How it works */}
      <div className="rounded-xl p-6 mt-4 mk-surface">
        <div className="mk-h4 mb-4 text-mk-ink-900">
          {T("Shared blacklist — how it works", "القائمة السوداء المشتركة — كيف تعمل", ar)}
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
    </div>
  );
}
