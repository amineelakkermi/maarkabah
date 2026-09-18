"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search, UserPlus, ChevronRight, Phone, CreditCard,
  X, User, Loader2, FileWarning,
} from "lucide-react";
import { Avatar, Badge, Button, Input, IconButton } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { type DriverProfile } from "@/lib/data";
import { driverService, driverEvents } from "@/lib/api-services";
import { formatPhone, normalizeKycStatus } from "@/lib/formatting";
import { AddDriverDrawer } from "./AddDriverDrawer";

const T = (en: string, ar: string, isAr: boolean) => isAr ? ar : en;

const STATUS_BADGE: Record<string, { variant: "success" | "warning" | "neutral" | "danger"; label: [string, string] }> = {
  verified: { variant: "success", label: ["Verified", "موثّق"] },
  pending: { variant: "warning", label: ["Pending KYC", "قيد التحقق"] },
  new: { variant: "neutral", label: ["New", "جديد"] },
  rejected: { variant: "danger", label: ["Rejected", "مرفوض"] },
};

function getIdTypeLabel(code: number): string {
  if (code === 1) return "Saudi ID";
  if (code === 2) return "Iqama";
  if (code === 3) return "Passport";
  if (code === 4) return "GCC ID";
  return "ID Document";
}

function mapApiToDriverProfile(item: any): DriverProfile {
  const idTypeCode = item.identityType ?? item.idType ?? 1;
  const idType = getIdTypeLabel(idTypeCode);
  const idNumber =
    item.beneficiaryIdNumber ||
    item.passportNumber ||
    item.borderNumber ||
    item.identityCopyNumber ||
    item.idCopyNumber ||
    "";

  return {
    id: String(item.id),
    name: item.fullNameEn || item.name || "",
    nameAr: item.fullNameAr || item.nameAr || "",
    phone: formatPhone(item.phoneNumber),
    idType: idType as DriverProfile["idType"],
    idTypeCode,
    nationalId: idNumber,
    birthDate: item.birthDate || item.visitor?.birthDate || item.gulf?.birthDate || undefined,
    hijriBirthDate: item.hijriBirthDate,
    email: item.email || undefined,
    passportNumber: item.passportNumber || item.visitor?.passportNumber || undefined,
    nationality: item.nationality || item.visitor?.nationality || item.gulf?.nationality || undefined,
    nationalityCode: item.countryId,
    licenseNumber: item.licenseNumber || item.visitor?.licenseNumber || item.gulf?.licenseNumber || "",
    licenseExpiryDate: item.licenseExpiryDate || item.visitor?.licenseExpiryDate || item.gulf?.licenseExpiryDate,
    idExpiryDate: item.idExpiryDate || item.identityExpiryDate || item.visitor?.identityExpiryDate,
    idCopyNumber: item.idCopyNumber || item.identityCopyNumber || item.visitor?.identityCopyNumber,
    licenseIssuePlace: item.licenseIssuePlace || item.visitor?.licenseIssuePlace || item.gulf?.licenseIssuePlace,
    borderNumber: item.borderNumber || item.visitor?.borderNumber,
    personAddress: item.address || "",
    bookings: item.bookings || 0,
    status: normalizeKycStatus(item.verificationStatus),
    tajeerStatus: item.tajeerStatus === 1 ? "verified" : item.tajeerStatus === 2 ? "pending" : "not_verified",
    lastBooking: item.lastBooking || null,
    rating: item.rating ?? null,
    blacklisted: item.isBlacklisted || false,
    joinDate: (item.joinedAt || item.creationTime) ? new Date(item.joinedAt || item.creationTime).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    history: [],
  };
}

interface DriverListPageProps {
  driverDetailPath: (id: string | number | null | undefined) => string;
}

export default function DriverListPage({ driverDetailPath }: DriverListPageProps) {
  const { dir } = useAdmin();
  const ar = dir === "rtl";

  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const loadDrivers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await driverService.search({
        search: "",
        pageNumber: 1,
        pageSize: 100,
      });
      const items = response?.items ?? response?.data?.items ?? response?.data ?? response ?? [];
      const mapped = Array.isArray(items) ? items.map(mapApiToDriverProfile) : [];
      setDrivers(mapped);
    } catch (err) {
      console.error("Error loading drivers:", err);
      setError(err instanceof Error ? err.message : T("Failed to load drivers", "فشل تحميل السائقين", ar));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();
    const unsubscribe = driverEvents.onReload(loadDrivers);
    return () => unsubscribe();
  }, [ar]);

  const filtered = drivers.filter((d) => {
    const q = search.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.nameAr.includes(q) ||
      d.phone.includes(q) ||
      d.nationalId.includes(q) ||
      (d.lastBooking ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 max-w-[400px]">
          <Input
            variant="search"
            icon={<Search size={14} />}
            placeholder={T("Search name, phone, ID, booking…", "ابحث باسم السائق، الهاتف، الهوية، أو الحجز…", ar)}
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
        <div className="flex-1" />
        <Button variant="primary" onClick={() => setShowAdd(true)} className="shadow-[var(--shadow-glow-blue)]">
          <UserPlus size={15} />
          {T("Add driver", "إضافة سائق جديد", ar)}
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: T("Total drivers", "إجمالي السائقين", ar), value: drivers.length, color: "var(--color-mk-blue-500)" },
          { label: T("Verified", "موثّقون", ar), value: drivers.filter(c => c.status === "verified").length, color: "var(--color-mk-mint-500)" },
          { label: T("Pending", "قيد التحقق", ar), value: drivers.filter(c => c.status === "pending").length, color: "var(--color-mk-warning)" },
          { label: T("Blacklisted", "القائمة السوداء", ar), value: drivers.filter(c => c.blacklisted).length, color: "var(--color-mk-danger)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg px-5 py-4 mk-surface">
            <div className="mk-h2" style={{ color }}>{value}</div>
            <div className="mk-caption mt-1 text-mk-ink-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Drivers list */}
      <div className="rounded-xl overflow-hidden mk-surface">
        {/* Header */}
        <div
          className="grid px-5 py-3 mk-overline uppercase text-mk-ink-400 tracking-wider border-b border-mk-ink-100 bg-mk-ink-50 grid-cols-[2.2fr_1.2fr_1.4fr_0.7fr_0.7fr_36px]"
        >
          <span>{T("Driver", "السائق", ar)}</span>
          <span>{T("Phone", "الهاتف", ar)}</span>
          <span>{T("National ID", "الهوية", ar)}</span>
          <span>{T("Bookings", "العقود", ar)}</span>
          <span>{T("Status", "الحالة", ar)}</span>
          <span />
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3 text-mk-ink-400">
            <Loader2 size={32} className="animate-spin" />
            <span className="mk-label">{T("Loading drivers...", "جاري تحميل السائقين...", ar)}</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3 text-mk-danger">
            <FileWarning size={32} strokeWidth={1.5} />
            <span className="mk-label">{error}</span>
            <Button variant="outline" size="sm" onClick={loadDrivers}>
              {T("Retry", "إعادة المحاولة", ar)}
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3 text-mk-ink-400">
            <User size={32} strokeWidth={1.5} />
            <span className="mk-label">{T("No drivers found", "لا يوجد سائقين مطابقين للبحث", ar)}</span>
          </div>
        ) : (
          filtered.map((d, idx) => {
          const sm = STATUS_BADGE[d.status];
          return (
            <Link
              key={d.id}
              href={driverDetailPath(d.id)}
              className="grid items-center px-5 py-4 cursor-pointer transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50 no-underline grid-cols-[2.2fr_1.2fr_1.4fr_0.7fr_0.7fr_36px]"
              style={{
                borderBottom: idx < filtered.length - 1 ? "1px solid var(--color-mk-border)" : "none",
                borderInlineStart: d.blacklisted ? "3px solid var(--color-mk-danger)" : "none",
              }}
            >
              {/* Name + avatar */}
              <div className="flex items-center gap-3">
                <Avatar name={d.name} size="sm" />
                <div>
                  <div className="mk-body text-mk-ink-900 flex items-center gap-2 flex-wrap">
                    <span>{ar ? d.nameAr : d.name}</span>
                  </div>
                  <div className="mk-overline text-mk-ink-400">{d.id}</div>
                </div>
              </div>
              {/* Phone */}
             
               <div className="flex items-center gap-2 mk-label text-mk-ink-600">
                <Phone size={12} className="text-mk-ink-400" />
                <span dir="ltr" className="inline-block whitespace-nowrap" style={{ unicodeBidi: "embed" }}>
                   {d.phone}
                </span>
              </div>
              {/* ID */}
              <div>
                <div className="flex items-center gap-2 mk-label text-mk-ink-600">
                  <CreditCard size={12} className="text-mk-ink-400" />
                  {d.nationalId}
                </div>
                <div className="mk-overline text-mk-ink-400 ms-5 flex items-center gap-1 mt-1">
                  <span>{ar ? (d.idType === "Saudi ID" ? "هوية وطنية" : d.idType === "Iqama" ? "إقامة" : d.idType === "Passport" ? "زائر" : "خليجية") : (d.idType === "Passport" ? "Visitor" : d.idType)}</span>
                  {d.idExpiryDate && <span>· {d.idExpiryDate}</span>}
                </div>
              </div>
              {/* Bookings */}
              <div className="mk-label text-mk-ink-900">
                {d.bookings > 0 ? (
                  <span>
                    {d.bookings}
                    {d.lastBooking && (
                      <span className="mk-overline ms-1 text-mk-ink-400">· {d.lastBooking}</span>
                    )}
                  </span>
                ) : (
                  <span className="text-mk-ink-400">{T("None", "لا يوجد", ar)}</span>
                )}
              </div>
              {/* Status */}
              <div>
                <Badge variant={d.blacklisted ? "danger" : sm.variant} dot>
                  {d.blacklisted ? T("Blacklisted", "قائمة سوداء", ar) : T(sm.label[0], sm.label[1], ar)}
                </Badge>
              </div>
              {/* Arrow */}
              <div className="flex justify-end">
                <ChevronRight size={16} className="text-mk-ink-300" />
              </div>
            </Link>
          );
        })
        )}
      </div>

      {/* ── DRAWER: Add new driver — shared form ── */}
      <AddDriverDrawer
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={() => loadDrivers()}
      />
    </div>
  );
}
