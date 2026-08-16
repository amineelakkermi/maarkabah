"use client";

import { UsersRound, Plus, ShieldCheck, ShieldAlert, Search } from "lucide-react";
import { Badge, Button, Input, Table, Th, Td } from "@/components/ui";
import { BLACKLIST } from "@/lib/data";
import { useAdmin } from "@/contexts/AdminContext";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

const ID_TYPE_AR: Record<string, string> = {
  "Saudi ID": "هوية وطنية",
  "Iqama": "إقامة",
  "Passport": "جواز سفر",
};

export default function BlacklistPage() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";

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
            {T("Shared blacklist · 14,238 verified entries", "القائمة السوداء المشتركة · ١٤٬٢٣٨ إدخال موثق", ar)}
          </div>
          <div className="mk-label mt-1 text-mk-ink-500">
            {T(
              "Contributed by 312 partner offices · synced 4 min ago · Your office added 14 entries",
              "مساهمة ٣١٢ مكتب شريك · مزامنة منذ ٤ دقائق · أضاف مكتبك ١٤ إدخالاً",
              ar
            )}
          </div>
        </div>
        <Button variant="primary" className="shrink-0 shadow-[var(--shadow-glow-blue)]">
          <Plus size={14} />
          {T("Report renter", "الإبلاغ عن مستأجر", ar)}
        </Button>
      </div>

      {/* Search bar */}
      <div className="mb-5 max-w-md">
        <Input
          variant="search"
          icon={<Search size={14} />}
          placeholder={T("Search by ID, office, or reason…", "ابحث بالهوية، المكتب، أو السبب…", ar)}
        />
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden mk-surface">
        <Table>
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
            {BLACKLIST.map((b, i) => (
              <tr key={i} className="cursor-pointer transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50">
                <Td>
                  <div className="font-mono mk-label text-mk-ink-900">{b.id}</div>
                  <div className="mk-caption mt-1 text-mk-ink-500">
                    {ar ? ID_TYPE_AR[b.idType] ?? b.idType : b.idType}
                  </div>
                </Td>
                <Td className="mk-label text-mk-ink-700">{b.office}</Td>
                <Td className="mk-label text-mk-ink-700">{b.reason}</Td>
                <Td className="mk-caption text-mk-ink-500">{b.date}</Td>
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
            ))}
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
