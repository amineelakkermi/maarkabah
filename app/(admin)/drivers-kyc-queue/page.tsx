"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { KycEntry, KycStatus } from "@/lib/data";
import { Clock, CreditCard, FileText, AlertTriangle, Loader2 } from "lucide-react";
import { Badge, Tabs, Avatar, Select, useToast } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { driverService, driverEvents } from "@/lib/api-services";
import { VerificationStatus } from "@/lib/api-types";
import { formatPhone, normalizeKycStatus } from "@/lib/formatting";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

const STATUS_VARIANT: Record<KycStatus, "warning" | "success" | "danger"> = {
  pending:  "warning",
  verified: "success",
  rejected: "danger",
};

const REJECT_REASONS_EN = ["Image not clear", "Document expired", "Name mismatch", "Incomplete data", "Invalid license"];
const REJECT_REASONS_AR = ["الصورة غير واضحة", "الوثيقة منتهية", "عدم التطابق", "بيانات ناقصة", "رخصة غير صالحة"];

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getSinceLabel(dateString: string | undefined, ar: boolean): string {
  if (!dateString) return ar ? "الآن" : "Just now";
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return ar ? "الآن" : "Just now";
  if (minutes < 60) return ar ? `منذ ${minutes} دقيقة` : `${minutes} min ago`;
  if (hours < 24) return ar ? `منذ ${hours} ساعة ${minutes % 60} دقيقة` : `${hours}h ${minutes % 60}m ago`;
  return ar ? `منذ ${days} يوم` : `${days} day${days === 1 ? "" : "s"} ago`;
}

function getIdTypeLabel(code: number): string {
  if (code === 1) return "Saudi National ID";
  if (code === 2) return "Iqama";
  if (code === 3) return "Passport";
  if (code === 4) return "GCC ID";
  return "ID Document";
}

interface DriverKycEntry extends KycEntry {
  idNumber: string;
  licenseNumber: string;
}

function mapDriverToEntry(item: any, ar: boolean): DriverKycEntry {
  const name = item.fullNameEn || item.fullNameAr || "";
  const phone = formatPhone(item.phoneNumber);
  const created = item.joinedAt || item.creationTime;
  const since = getSinceLabel(created, ar);
  const isSla = created ? Date.now() - new Date(created).getTime() > 2 * 60 * 60 * 1000 : false;
  const idTypeCode = item.identityType ?? item.idType ?? 1;
  const idNumber =
    item.beneficiaryIdNumber ||
    item.passportNumber ||
    item.borderNumber ||
    item.identityCopyNumber ||
    item.idCopyNumber ||
    "";

  return {
    id: Number(item.id),
    name,
    phone,
    since,
    booking: "",
    status: normalizeKycStatus(item.verificationStatus),
    sla: isSla,
    docs: [getIdTypeLabel(idTypeCode)],
    initials: getInitials(name),
    idNumber,
    licenseNumber: item.licenseNumber || item.visitor?.licenseNumber || item.gulf?.licenseNumber || "",
  };
}

export default function DriverKycQueuePage() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const { showToast } = useToast();

  const REJECT_REASONS = ar ? REJECT_REASONS_AR : REJECT_REASONS_EN;

  const [entries, setEntries] = useState<DriverKycEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DriverKycEntry | null>(null);
  const [filter, setFilter] = useState<"all" | KycStatus>("all");
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const [rejectReason, setRejectReason] = useState(REJECT_REASONS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const visible = filter === "all" ? entries : entries.filter((e) => e.status === filter);
  const pending = entries.filter((e) => e.status === "pending").length;

  const STATUS_LABEL: Record<KycStatus, string> = {
    pending:  T("Pending",  "معلق",   ar),
    verified: T("Verified", "موثق",   ar),
    rejected: T("Rejected", "مرفوض",  ar),
  };

  const FILTER_LABELS: Record<string, string> = {
    all:      T("All",      "الكل",   ar),
    pending:  T("Pending",  "معلق",   ar),
    verified: T("Verified", "موثق",   ar),
    rejected: T("Rejected", "مرفوض",  ar),
  };

  const loadQueue = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await driverService.search({
        verificationStatus: VerificationStatus.Pending,
        pageNumber: 1,
        pageSize: 100,
      });
      const items = response?.items ?? response?.data?.items ?? response?.data ?? response ?? [];
      const mapped = Array.isArray(items)
        ? items
            .filter((item: any) => !(item.isBlacklisted ?? item.blacklisted))
            .map((item: any) => mapDriverToEntry(item, ar))
        : [];
      setEntries(mapped);
    } catch (err) {
      console.error("Error loading driver KYC queue:", err);
      setError(err instanceof Error ? err.message : T("Failed to load queue", "فشل تحميل الطابور", ar));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
    const unsubscribe = driverEvents.onReload(loadQueue);
    return () => unsubscribe();
  }, [ar]);

  function selectEntry(entry: DriverKycEntry) {
    setSelected(entry);
    setDecision(null);
  }

  async function confirm() {
    if (!selected || !decision) return;

    setIsSubmitting(true);
    try {
      if (decision === "approve") {
        await driverService.verify(selected.id);
        showToast(T("Driver verified", "تم توثيق السائق", ar));
      } else {
        await driverService.rejectVerification(selected.id, { reason: rejectReason });
        showToast(T("Driver rejected", "تم رفض السائق", ar));
      }
      setDecision(null);
      setSelected(null);
      await loadQueue();
      driverEvents.reload();
    } catch (err) {
      console.error("Driver KYC decision error:", err);
      showToast(T("Failed to process decision", "فشل معالجة القرار", ar));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-[600px] lg:h-full overflow-hidden rounded-md">
      {/* Queue list */}
      <div className="w-full lg:w-[290px] flex-shrink-0 flex flex-col border-b lg:border-b-0 lg:border-e border-mk-ink-100 overflow-hidden mk-surface">
        {/* Header */}
        <div className="px-4 py-3 border-b border-mk-ink-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="mk-label text-mk-ink-900">
              {T("Queue", "الطابور", ar)}
            </div>
            {pending > 0 && (
              <span className="mk-overline normal-case tracking-normal px-2 py-px rounded-full bg-mk-warning/12 text-mk-warning">
                {pending} {T("pending", "معلق", ar)}
              </span>
            )}
          </div>
          <Tabs
            variant="default"
            rounded="full"
            value={filter}
            onChange={(v) => setFilter(v as typeof filter)}
            items={(["all", "pending", "verified", "rejected"] as const).map((f) => ({
              value: f,
              label: FILTER_LABELS[f],
            }))}
          />
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto max-h-[300px] lg:max-h-none">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-mk-ink-400">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : error ? (
            <div className="p-4 text-mk-danger mk-caption">{error}</div>
          ) : visible.length === 0 ? (
            <div className="p-4 text-mk-ink-400 mk-caption text-center">
              {T("No drivers in queue", "لا يوجد سائقين في الطابور", ar)}
            </div>
          ) : (
            visible.map((entry) => {
              const isSelected = selected?.id === entry.id;
              return (
                <div
                  key={entry.id}
                  onClick={() => selectEntry(entry)}
                  className={`relative flex items-center gap-3 px-4 py-3 border-b border-b-mk-ink-100 cursor-pointer transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] ${
                    isSelected ? "bg-mk-blue-500/5" : "hover:bg-mk-ink-50"
                  }`}
                >
                  {isSelected && (
                    <span
                      className="absolute top-0 bottom-0 end-0 w-1 bg-mk-blue-500 rounded-s-sm"
                    />
                  )}
                  <Avatar name={entry.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="mk-label truncate text-mk-ink-900">{entry.name}</span>
                      {entry.sla && (
                        <Badge variant="danger" className="mk-overline px-2 py-px shrink-0">SLA!</Badge>
                      )}
                    </div>
                    <div className="mk-overline normal-case tracking-normal text-mk-ink-400">{entry.since}</div>
                  </div>
                  <Badge variant={STATUS_VARIANT[entry.status]} dot className="shrink-0">
                    {STATUS_LABEL[entry.status]}
                  </Badge>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex-1 overflow-y-auto p-5 bg-mk-ink-50">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-mk-ink-400">
            <span className="mk-display opacity-25">🪪</span>
            <div className="mk-label">{T("Select a driver to review", "اختر سائقا للمراجعة", ar)}</div>
          </div>
        ) : (
          <div className="max-w-[500px] flex flex-col gap-4">
            {/* Driver card */}
            <div className="rounded-md border border-mk-ink-100 p-4 mk-surface">
              <div className="flex items-center gap-3 mb-4">
                <Avatar name={selected.name} size="lg" />
                <div className="flex-1">
                  <div className="mk-body text-mk-ink-900">{selected.name}</div>
                  <div className="mk-caption normal-case tracking-normal text-mk-ink-400">{selected.phone}</div>
                  <div className="flex items-center gap-1 mk-overline normal-case tracking-normal mt-1 text-mk-ink-400">
                    <Clock size={11} /> {selected.since}
                  </div>
                </div>
                {selected.sla && (
                  <div className="flex items-center gap-1 px-3 py-2 rounded-sm mk-overline normal-case tracking-normal bg-mk-danger/10 text-mk-danger">
                    <AlertTriangle size={12} />
                    {T("SLA exceeded (2h)", "تجاوز SLA (2 ساعة)", ar)}
                  </div>
                )}
              </div>

              {/* Identity summary */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between mk-label border-b border-mk-ink-100 pb-2">
                  <span className="flex items-center gap-2 text-mk-ink-500">
                    <FileText size={13} className="text-mk-ink-400" />
                    {T("ID Type", "نوع الهوية", ar)}
                  </span>
                  <strong className="text-mk-ink-900">{selected.docs[0]}</strong>
                </div>
                <div className="flex items-center justify-between mk-label border-b border-mk-ink-100 pb-2">
                  <span className="flex items-center gap-2 text-mk-ink-500">
                    <CreditCard size={13} className="text-mk-ink-400" />
                    {T("ID Number", "رقم الهوية", ar)}
                  </span>
                  <strong className="text-mk-ink-900">{selected.idNumber || T("Not provided", "غير مسجل", ar)}</strong>
                </div>
                <div className="flex items-center justify-between mk-label pb-1">
                  <span className="flex items-center gap-2 text-mk-ink-500">
                    <FileText size={13} className="text-mk-ink-400" />
                    {T("Driving License", "رخصة القيادة", ar)}
                  </span>
                  <strong className="text-mk-ink-900">{selected.licenseNumber || T("Not provided", "غير مسجل", ar)}</strong>
                </div>
              </div>

              <Link
                href={`/drivers/${selected.id}`}
                className="inline-block mt-3 mk-caption text-mk-blue-500 no-underline"
              >
                {T("View full profile →", "عرض الملف الكامل ←", ar)}
              </Link>
            </div>

            {/* Decision */}
            {selected.status === "pending" ? (
              <div className="rounded-md border border-mk-ink-100 p-4 flex flex-col gap-3 mk-surface">
                <div className="mk-label text-mk-ink-900">{T("Decision", "القرار", ar)}</div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setDecision("approve")}
                    disabled={isSubmitting}
                    className={`py-4 rounded-sm border-2 mk-label transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      decision === "approve"
                        ? "border-mk-mint-600 bg-mk-mint-600/8 text-mk-mint-600"
                        : "border-mk-ink-200 bg-transparent text-mk-ink-400"
                    }`}
                  >
                    {T("✅ Verified", "موثق ✅", ar)}
                  </button>
                  <button
                    onClick={() => setDecision("reject")}
                    disabled={isSubmitting}
                    className={`py-4 rounded-sm border-2 mk-label transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      decision === "reject"
                        ? "border-mk-danger bg-mk-danger/8 text-mk-danger"
                        : "border-mk-ink-200 bg-transparent text-mk-ink-400"
                    }`}
                  >
                    {T("❌ Rejected", "مرفوض ❌", ar)}
                  </button>
                </div>

                {decision === "reject" && (
                  <Select value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}>
                    {REJECT_REASONS.map((r) => <option key={r}>{r}</option>)}
                  </Select>
                )}

                <button
                  onClick={confirm}
                  disabled={!decision || isSubmitting}
                  className={`w-full py-3 rounded-sm mk-label transition-colors border-0 flex items-center justify-center gap-2 ${
                    !decision || isSubmitting
                      ? "bg-mk-ink-100 text-mk-ink-400 cursor-not-allowed"
                      : decision === "approve"
                        ? "bg-mk-mint-600 text-white cursor-pointer"
                        : "bg-mk-danger text-white cursor-pointer"
                  }`}
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  {!decision
                    ? T("Choose a decision", "اختر القرار", ar)
                    : decision === "approve"
                      ? T("✅ Confirm approval", "✅ تأكيد الموافقة", ar)
                      : T("❌ Confirm rejection", "❌ تأكيد الرفض", ar)
                  }
                </button>
              </div>
            ) : (
              <div
                className={`rounded-md border px-4 py-3 flex items-center gap-3 ${
                  selected.status === "verified"
                    ? "bg-mk-mint-600/8 border-mk-mint-600/25"
                    : "bg-mk-danger/8 border-mk-danger/25"
                }`}
              >
                <span className="text-lg">{selected.status === "verified" ? "✅" : "❌"}</span>
                <Badge variant={STATUS_VARIANT[selected.status]} dot>
                  {STATUS_LABEL[selected.status]}
                </Badge>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
