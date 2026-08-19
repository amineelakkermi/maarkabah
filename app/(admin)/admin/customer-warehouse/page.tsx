"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, Loader2, FileWarning, Download, Upload, RefreshCw,
  Database, Globe, Clock, Building2, ShieldAlert,
} from "lucide-react";
import { Badge, Button, Input, Table, Th, Td, useToast } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { customerWarehouseService } from "@/lib/api-services";
import { normalizeKycStatus } from "@/lib/formatting";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

const ID_TYPE_LABELS: Record<number, { en: string; ar: string }> = {
  1: { en: "Saudi ID", ar: "هوية وطنية" },
  2: { en: "Iqama", ar: "إقامة" },
  3: { en: "Passport", ar: "جواز سفر" },
  4: { en: "GCC ID", ar: "هوية خليجية" },
};

interface WarehouseStats {
  totalIdentities?: number;
  totalTenantRecords?: number;
  totalExternalRecords?: number;
  networkBlacklistedCount?: number;
  lastSyncedAt?: string;
}

interface WarehouseItem {
  id: number | string;
  identityType?: number;
  idNumber?: string;
  beneficiaryIdNumber?: string;
  fullNameEn?: string;
  fullNameAr?: string;
  phoneNumber?: string;
  verificationStatus?: number;
  isVerified?: boolean;
  isBlacklisted?: boolean;
  isNetworkBlacklisted?: boolean;
  hasNetworkCircular?: boolean;
  blacklisted?: boolean;
  isActive?: boolean;
  reason?: string;
  officeCount?: number;
  partnerOfficeCount?: number;
  officesCount?: number;
  lastReportedAt?: string;
}

export default function AdminCustomerWarehousePage() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const { showToast } = useToast();

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<WarehouseStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  function idTypeLabel(code: number | undefined) {
    return ar ? ID_TYPE_LABELS[code ?? 0]?.ar ?? "—" : ID_TYPE_LABELS[code ?? 0]?.en ?? "—";
  }

  function maskId(value: string | undefined) {
    if (!value) return "—";
    if (value.length < 6) return value;
    return `${value.slice(0, 4)}••${value.slice(-4)}`;
  }

  async function loadStats() {
    setStatsLoading(true);
    try {
      const data = await customerWarehouseService.getAdminStats();
      console.log("[Admin Warehouse] stats response:", data);
      const raw = data?.data ?? data;
      const mapped: WarehouseStats = {
        totalIdentities: raw?.totalIdentities ?? 0,
        totalTenantRecords: raw?.totalTenantRecords ?? 0,
        totalExternalRecords: raw?.totalExternalRecords ?? 0,
        networkBlacklistedCount: raw?.networkBlacklistedCount ?? 0,
        lastSyncedAt: raw?.lastSyncedAt,
      };
      setStats(mapped);
    } catch (err) {
      console.error("Failed to load warehouse stats:", err);
    } finally {
      setStatsLoading(false);
    }
  }

  async function search(rawQuery: string) {
    const q = rawQuery.trim();
    if (q.length < 2) {
      setItems([]);
      setError(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const response = await customerWarehouseService.adminSearch({ search: q, pageNumber: 1, pageSize: 20 });
      console.log("[Admin Warehouse] search response:", response);
      if (controller.signal.aborted) return;
      const rawList = (response?.items ?? response?.data?.items ?? response?.data ?? response ?? []) as any[];
      const list = Array.isArray(rawList) ? rawList : [];
      setItems(
        list.map((item) => ({
          ...item,
          idNumber: item.idNumber ?? item.maskedIdNumber ?? item.beneficiaryIdNumber ?? "",
          isVerified: item.isVerified === true || item.verified === true,
          isBlacklisted: item.isBlacklisted === true || item.isNetworkBlacklisted === true || item.blacklisted === true,
          isActive: item.isActive !== false,
          officeCount: item.officeCount ?? item.officesCount ?? item.partnerOfficeCount ?? item.reportingOfficeCount ?? 1,
        }))
      );
    } catch (err) {
      console.error("Admin warehouse search error:", err);
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : T("Search failed", "فشل البحث", ar));
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 350);
    return () => clearTimeout(timer);
  }, [query]);

  async function downloadTemplate() {
    setDownloadingTemplate(true);
    try {
      const blob = await customerWarehouseService.downloadImportTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "warehouse_import_template.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast(T("Template downloaded. Use the Excel file to prepare your import.", "تم تحميل القالب. استخدم ملف Excel لتحضير الاستيراد.", ar));
    } catch (err) {
      showToast(err instanceof Error ? err.message : T("Download failed. Please try again.", "فشل التحميل. يُرجى المحاولة مرة أخرى.", ar));
    } finally {
      setDownloadingTemplate(false);
    }
  }

  async function handleImport() {
    if (!importFile) return;
    setImporting(true);
    try {
      await customerWarehouseService.importExcel(importFile, "Dynamic");
      showToast(T("Import successful. Warehouse records have been imported.", "تم الاستيراد بنجاح. تم استيراد سجلات المستودع.", ar));
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadStats();
    } catch (err) {
      showToast(err instanceof Error ? err.message : T("Import failed. Please check the file and try again.", "فشل الاستيراد. يُرجى التحقق من الملف والمحاولة مرة أخرى.", ar));
    } finally {
      setImporting(false);
    }
  }

  const statCards = useMemo(() => {
    if (!stats) return [];
    return [
      {
        icon: Database,
        label: ["Total identities", "إجمالي الهويات"],
        value: stats.totalIdentities ?? 0,
        color: "text-mk-blue-500",
      },
      {
        icon: Building2,
        label: ["Tenant records", "سجلات المستأجر"],
        value: stats.totalTenantRecords ?? 0,
        color: "text-mk-mint-600",
      },
      {
        icon: Globe,
        label: ["External records", "سجلات خارجية"],
        value: stats.totalExternalRecords ?? 0,
        color: "text-mk-warning",
      },
      {
        icon: ShieldAlert,
        label: ["Network blacklisted", "محظورون شبكياً"],
        value: stats.networkBlacklistedCount ?? 0,
        color: "text-mk-danger",
      },
    ];
  }, [stats]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <div className="mk-h4 text-mk-ink-900">{T("Customer Warehouse", "مستودع العملاء", ar)}</div>
          <div className="mk-label text-mk-ink-500 mt-1">
            {T("SuperAdmin view of the shared identity warehouse", "عرض المشرف العام لمستودع الهويات المشترك", ar)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={statsLoading} onClick={loadStats}>
            <RefreshCw size={14} className={statsLoading ? "animate-spin" : ""} />
            {T("Refresh stats", "تحديث الإحصائيات", ar)}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {statCards.map((card) => (
          <div key={card.label[0]} className="rounded-xl p-4 mk-surface flex items-center gap-3">
            <div className={`w-10 h-10 rounded-md flex items-center justify-center bg-mk-ink-50 ${card.color}`}>
              <card.icon size={20} />
            </div>
            <div>
              <div className="mk-h3 text-mk-ink-900">{card.value}</div>
              <div className="mk-caption text-mk-ink-500">{T(card.label[0], card.label[1], ar)}</div>
            </div>
          </div>
        ))}
      </div>
      {stats?.lastSyncedAt && (
        <div className="mk-caption text-mk-ink-400 mb-5 flex items-center gap-1">
          <Globe size={12} />
          {T("Last synced:", "آخر مزامنة:", ar)} {new Date(stats.lastSyncedAt).toLocaleString(ar ? "ar-SA" : "en-US")}
        </div>
      )}

      {/* Import tools */}
      <div className="rounded-xl p-4 mb-5 mk-surface flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="mk-label text-mk-ink-900">{T("Bulk import", "استيراد بالجملة", ar)}</span>
          <span className="mk-caption text-mk-ink-500">
            {T("Download the template, fill it, then upload it here.", "حمّل القالب، املأه، ثم ارفعه هنا.", ar)}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" disabled={downloadingTemplate} onClick={downloadTemplate}>
            {downloadingTemplate ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {T("Download template", "تحميل القالب", ar)}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
          />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} />
            {importFile ? importFile.name : T("Choose Excel file", "اختر ملف Excel", ar)}
          </Button>
          <Button variant="primary" size="sm" disabled={!importFile || importing} onClick={handleImport}>
            {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {T("Import", "استيراد", ar)}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-5 max-w-md">
        <Input
          variant="search"
          icon={<Search size={14} />}
          placeholder={T("Search by ID, phone, or name…", "ابحث بالهوية أو الهاتف أو الاسم…", ar)}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Results */}
      <div className="rounded-xl overflow-hidden mk-surface">
        <Table>
          <thead>
            <tr>
              {[
                T("Name", "الاسم", ar),
                T("Identity", "الهوية", ar),
                T("Phone", "الهاتف", ar),
                T("Offices", "المكاتب", ar),
                T("Status", "الحالة", ar),
                "",
              ].map((h, i) => <Th key={i}>{h}</Th>)}
            </tr>
          </thead>
          <tbody>
            {query.trim().length < 2 ? (
              <tr>
                <Td colSpan={6} className="text-center py-12 text-mk-ink-400">
                  {T("Start typing to search the warehouse", "ابدأ الكتابة للبحث في المستودع", ar)}
                </Td>
              </tr>
            ) : loading ? (
              <tr>
                <Td colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center gap-3 text-mk-ink-400">
                    <Loader2 size={32} className="animate-spin" />
                    <span className="mk-label">{T("Searching…", "جاري البحث…", ar)}</span>
                  </div>
                </Td>
              </tr>
            ) : error ? (
              <tr>
                <Td colSpan={6} className="text-center py-12 text-mk-danger">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <FileWarning size={32} strokeWidth={1.5} />
                    <span className="mk-label">{error}</span>
                  </div>
                </Td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <Td colSpan={6} className="text-center py-12 text-mk-ink-400">
                  {T("No warehouse records found", "لا توجد سجلات في المستودع", ar)}
                </Td>
              </tr>
            ) : (
              items.map((item) => {
                const blacklisted = item.isBlacklisted === true || item.isNetworkBlacklisted === true || item.blacklisted === true;
                const hasCircular = item.hasNetworkCircular === true;
                const statusBadgeVariant = blacklisted
                  ? "danger"
                  : hasCircular
                    ? "warning"
                    : "success";
                const statusLabel = blacklisted
                  ? T("Blacklisted", "قائمة سوداء", ar)
                  : hasCircular
                    ? T("Circular", "تنبيه دائري", ar)
                    : T("Active", "نشط", ar);
                return (
                  <tr key={String(item.id)} className="hover:bg-mk-ink-50 transition-colors">
                    <Td>
                      <div className="mk-label text-mk-ink-900">{ar ? item.fullNameAr : item.fullNameEn}</div>
                    </Td>
                    <Td className="flex flex-col justify-start items-start">
                      <div className="mk-label text-mk-ink-900">{idTypeLabel(item.identityType)}</div>
                      <div dir="ltr" className="font-mono mk-caption mt-1 text-mk-ink-500" style={{ unicodeBidi: "embed" }}>
                        {maskId(item.idNumber)}
                      </div>
                    </Td>
                    <Td className="mk-label text-mk-ink-700 ">
                      <span dir="ltr" className="inline-block whitespace-nowrap" style={{ unicodeBidi: "embed" }}>
                        {item.phoneNumber ?? "—"}
                      </span>
                    </Td>
                    <Td className="mk-label text-mk-ink-700">{item.officeCount ?? 1}</Td>
                    <Td>
                      <Badge variant={statusBadgeVariant} dot>
                        {statusLabel}
                      </Badge>
                    </Td>
                    <Td>
                      <Button variant="ghost" size="sm">{T("Details", "التفاصيل", ar)}</Button>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
