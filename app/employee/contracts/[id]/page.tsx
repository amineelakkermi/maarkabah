"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeft, ChevronRight, Phone, MessageSquare,
  FileText, Printer, XCircle, ArrowLeft, ArrowRight,
  AlertTriangle, Eye, CalendarPlus, Check, Clock, X,
  CheckCircle2, MoreVertical, MapPin, Pencil, Lock, Tag,
} from "lucide-react";
import { Avatar, Badge, Modal, Button, IconButton } from "@/components/ui";
import { BOOKINGS, CARS, CAR_IMAGES } from "@/lib/data";
import { useAdmin } from "@/contexts/AdminContext";
import { VehicleMapPanel } from "@/components/employee/VehicleMapPanel";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

const STATUS_CONFIG: Record<string, { variant: "success" | "warning" | "danger" | "neutral"; labelEn: string; labelAr: string }> = {
  active:    { variant: "success", labelEn: "Active",    labelAr: "نشط"    },
  pending:   { variant: "warning", labelEn: "Pending",   labelAr: "معلق"   },
  late:      { variant: "danger",  labelEn: "Late",      labelAr: "متأخر"  },
  completed: { variant: "neutral", labelEn: "Completed", labelAr: "مكتمل"  },
};

const CONTRACT_EXT: Record<string, { days: number; dailyRate: number; deposit: number; addOns: string[]; payment: string; kmCap: string }> = {
  "MK-2419": { days: 4, dailyRate: 360, deposit: 500, addOns: ["GPS tracker"], payment: "Mada", kmCap: "250 km/day" },
  "MK-2420": { days: 3, dailyRate: 280, deposit: 500, addOns: [], payment: "Visa", kmCap: "250 km/day" },
  "MK-2421": { days: 5, dailyRate: 420, deposit: 500, addOns: ["GPS tracker", "Personal accident cover"], payment: "Apple Pay", kmCap: "200 km/day" },
  "MK-2422": { days: 4, dailyRate: 950, deposit: 1000, addOns: ["GPS tracker", "24/7 Roadside assist"], payment: "Mada", kmCap: "200 km/day" },
  "MK-2423": { days: 2, dailyRate: 320, deposit: 500, addOns: [], payment: "Mada", kmCap: "250 km/day" },
  "MK-2424": { days: 2, dailyRate: 210, deposit: 300, addOns: [], payment: "Cash", kmCap: "Unlimited" },
  "MK-2425": { days: 3, dailyRate: 360, deposit: 500, addOns: ["Personal accident cover"], payment: "Mada", kmCap: "250 km/day" },
  "MK-2418": { days: 4, dailyRate: 1180, deposit: 1500, addOns: ["GPS tracker", "24/7 Roadside assist", "Personal accident cover"], payment: "Visa", kmCap: "200 km/day" },
};

const TIMELINE_STEPS = [
  { labelEn: "Contract created",   labelAr: "تم إنشاء العقد",      done: true,  time: "Today, 09:00" },
  { labelEn: "Payment authorised", labelAr: "تم تفويض الدفع",      done: true,  time: "Today, 09:01" },
  { labelEn: "KYC verified",       labelAr: "تم التحقق من الهوية", done: true,  time: "Today, 09:04" },
  { labelEn: "Keys handed over",   labelAr: "تم تسليم المفاتيح",   done: false, time: "Pending"      },
  { labelEn: "Return scheduled",   labelAr: "الإرجاع المجدوَل",    done: false, time: "—"            },
];

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-[8px] border-b border-mk-ink-100">
      <span className="mk-caption text-mk-ink-500">{label}</span>
      <span className="mk-label text-mk-ink-900">{value}</span>
    </div>
  );
}

// ── Contract Preview Modal ─────────────────────────────────────────────────────
type BookingType = (typeof BOOKINGS)[number];

function ContractPreviewModal({
  contract, ext, lateFeePerHour, onClose, ar,
}: {
  contract: BookingType;
  ext: { days: number; dailyRate: number; deposit: number; addOns: string[]; payment: string; kmCap: string };
  lateFeePerHour: number;
  onClose: () => void;
  ar: boolean;
}) {
  const subtotal = Math.round(contract.amount / 1.15);
  const vat = contract.amount - subtotal;

  const SectionHeader = ({ en, arLabel }: { en: string; arLabel: string }) => (
    <div style={{
      background: "#1a2233", color: "white", padding: "6px 12px",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      marginTop: 16, marginBottom: 0, borderRadius: 4,
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>{en}</span>
      <span style={{ fontSize: 11, fontWeight: 700 }}>{arLabel}</span>
    </div>
  );

  const Field = ({ en, arLabel, value, span = 1 }: { en: string; arLabel: string; value: string; span?: number }) => (
    <div style={{ padding: "6px 10px", borderBottom: "1px solid #f0f0f0", borderRight: "1px solid #f0f0f0", gridColumn: `span ${span}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 9, color: "#999", fontWeight: 600, textTransform: "uppercase" }}>{en}</span>
        <span style={{ fontSize: 9, color: "#999", fontWeight: 600 }}>{arLabel}</span>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#1a2233" }}>{value || "—"}</div>
    </div>
  );

  const FieldGrid = ({ children, cols = 4 }: { children: React.ReactNode; cols?: number }) => (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, border: "1px solid #f0f0f0", borderRight: "none", borderBottom: "none", marginBottom: 0 }}>
      {children}
    </div>
  );

  return (
    <Modal
      open={true}
      onClose={onClose}
      variant="centered"
      size="5xl"
      title={
        <div className="flex items-center gap-2">
          <span>{T("Contract Preview", "معاينة العقد", ar)}</span>
          <span className="text-mk-mint-500 font-mono">({contract.id})</span>
        </div>
      }
      headerActions={
        <Button size="sm" variant="primary" onClick={() => window.print()}>
          <Printer size={14} /> {ar ? "طباعة" : "Print"}
        </Button>
      }
    >
      <div className="flex justify-center p-6 bg-mk-bg-muted">
        <div style={{
          background: "white", width: "100%", maxWidth: 794,
          padding: "36px 44px", fontFamily: "'Arial', sans-serif",
          boxShadow: "0 10px 40px rgba(0,0,0,0.12)",
          borderRadius: "8px",
          direction: "ltr",
        }}>
          {/* Page Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 16, borderBottom: "2.5px solid #3EC8BE", marginBottom: 4 }}>
            <div>
              <Image src="/assets/logo-full.png" alt="Maarkbh" width={130} height={52} style={{ objectFit: "contain" }} />
              <div style={{ fontSize: 10, color: "#888", marginTop: 6 }}>مـركـبـة — Vehicle Rental Platform</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#1a2233", letterSpacing: -0.5 }}>VEHICLE RENTAL CONTRACT</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#1a2233", marginTop: 2 }}>عقـد تأجـير مـركـبـة</div>
              <div style={{ fontSize: 10, color: "#3EC8BE", fontWeight: 700, marginTop: 4, letterSpacing: 1 }}>POWERED BY TAJEER · مدعوم من تاجير</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9, color: "#999", marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>Contract No. / رقم العقد</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#4B72E6" }}>{contract.id}</div>
              <div style={{ fontSize: 9, color: "#999", marginTop: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Date / التاريخ</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1a2233" }}>{contract.date}</div>
              <div style={{ marginTop: 8 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                  background: contract.status === "active" ? "#EDFAF9" : contract.status === "late" ? "#FDEDF2" : "#F1F5FE",
                  color: contract.status === "active" ? "#1B9C90" : contract.status === "late" ? "#E24171" : "#4B72E6",
                }}>
                  {contract.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Section 1 — Lessor */}
          <SectionHeader en="1. LESSOR INFORMATION" arLabel="بيانات المؤجر" />
          <FieldGrid>
            <Field en="Company Name" arLabel="اسم الشركة" value="Maarkbh مركبة" />
            <Field en="Branch" arLabel="الفرع" value={contract.branch} />
            <Field en="CR / License No." arLabel="السجل / رقم الترخيص" value="14/00001234" />
            <Field en="City" arLabel="المدينة" value="Riyadh / الرياض" />
          </FieldGrid>

          {/* Section 2 — Lessee */}
          <SectionHeader en="2. LESSEE INFORMATION" arLabel="بيانات المستأجر" />
          <FieldGrid>
            <Field en="Full Name" arLabel="الاسم الكامل" value={contract.customer} />
            <Field en="Mobile" arLabel="الجوال" value={contract.phone} />
            <Field en="ID / Iqama No." arLabel="رقم الهوية / الإقامة" value="—" />
            <Field en="ID Expiry" arLabel="تاريخ انتهاء الهوية" value="—" />
            <Field en="License No." arLabel="رقم الرخصة" value="—" />
            <Field en="License Expiry" arLabel="انتهاء الرخصة" value="—" />
            <Field en="Nationality" arLabel="الجنسية" value="Saudi / سعودي" />
            <Field en="Address" arLabel="العنوان" value="Riyadh / الرياض" />
          </FieldGrid>

          {/* Section 3 — Vehicle */}
          <SectionHeader en="3. VEHICLE INFORMATION" arLabel="بيانات المركبة" />
          <FieldGrid>
            <Field en="Make / Model" arLabel="الماركة / الموديل" value={contract.car} />
            <Field en="Plate No." arLabel="رقم اللوحة" value={contract.plate} />
            <Field en="KM Limit / Day" arLabel="حد الكيلومترات" value={ext.kmCap} />
            <Field en="Extra KM Cost" arLabel="تكلفة الكيلومتر الزائد" value="2 SAR / ر.س" />
          </FieldGrid>

          {/* Section 4 — Rental Period */}
          <SectionHeader en="4. RENTAL PERIOD" arLabel="فترة الإيجار" />
          <FieldGrid>
            <Field en="Pickup Date & Time" arLabel="تاريخ / وقت الاستلام" value={`${contract.date} ${contract.time}`} />
            <Field en="Return Date & Time" arLabel="تاريخ / وقت الإرجاع" value={contract.dropoff} />
            <Field en="Duration" arLabel="مدة الإيجار" value={`${ext.days} ${ar ? "أيام" : "day(s)"}`} />
            <Field en="Pickup Branch" arLabel="فرع الاستلام" value={contract.branch} />
          </FieldGrid>

          {/* Section 5 — Financial Summary */}
          <SectionHeader en="5. FINANCIAL SUMMARY" arLabel="الملخص المالي" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: "1px solid #f0f0f0", borderRight: "none", borderBottom: "none" }}>
            {/* Left */}
            <div>
              <div style={{ padding: "6px 10px", borderBottom: "1px solid #f0f0f0", borderRight: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#555" }}>{T("Daily Rate", "السعر اليومي", ar)}</span>
                <span style={{ fontWeight: 600 }}>{ext.dailyRate.toLocaleString()} SAR</span>
              </div>
              <div style={{ padding: "6px 10px", borderBottom: "1px solid #f0f0f0", borderRight: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#555" }}>{T("Duration", "المدة", ar)}</span>
                <span style={{ fontWeight: 600 }}>{ext.days} {T("days", "أيام", ar)}</span>
              </div>
              {ext.addOns.length > 0 && (
                <div style={{ padding: "6px 10px", borderBottom: "1px solid #f0f0f0", borderRight: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "#555" }}>{T("Add-ons", "الخدمات الإضافية", ar)}</span>
                  <span style={{ fontWeight: 600, fontSize: 11, color: "#4B72E6" }}>{ext.addOns.join(", ")}</span>
                </div>
              )}
              <div style={{ padding: "6px 10px", borderBottom: "1px solid #f0f0f0", borderRight: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#666" }}>{T("Subtotal", "المجموع الجزئي", ar)}</span>
                <span style={{ fontWeight: 700 }}>{subtotal.toLocaleString()} SAR</span>
              </div>
              <div style={{ padding: "6px 10px", borderBottom: "1px solid #f0f0f0", borderRight: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#888" }}>{T("VAT 15%", "ضريبة 15%", ar)}</span>
                <span style={{ color: "#888" }}>{vat.toLocaleString()} SAR</span>
              </div>
              <div style={{ padding: "8px 10px", borderBottom: "1px solid #f0f0f0", borderRight: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", background: "#f8f9ff" }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#1a2233" }}>{T("TOTAL", "الإجمالي", ar)}</span>
                <span style={{ fontSize: 15, fontWeight: 900, color: "#4B72E6" }}>{contract.amount.toLocaleString()} SAR</span>
              </div>
            </div>
            {/* Right */}
            <div>
              <div style={{ padding: "6px 10px", borderBottom: "1px solid #f0f0f0", borderRight: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#555" }}>{T("Deposit (Auth. Hold)", "الوديعة (حجز مصرفي)", ar)}</span>
                <span style={{ fontWeight: 600 }}>{ext.deposit.toLocaleString()} SAR</span>
              </div>
              <div style={{ padding: "6px 10px", borderBottom: "1px solid #f0f0f0", borderRight: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#555" }}>{T("Payment Method", "طريقة الدفع", ar)}</span>
                <span style={{ fontWeight: 600 }}>{ext.payment}</span>
              </div>
              <div style={{ padding: "6px 10px", borderBottom: "1px solid #f0f0f0", borderRight: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#555" }}>{T("Late fee / hr", "غرامة التأخير/ساعة", ar)}</span>
                <span style={{ fontWeight: 600 }}>{lateFeePerHour} SAR (1hr grace)</span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div style={{ marginTop: 36, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 28 }}>
            {[
              { en: "Lessor Signature", ar: "توقيع المؤجر" },
              { en: "Lessee Signature", ar: "توقيع المستأجر" },
              { en: "Authorized Officer", ar: "المسؤول المفوض" },
            ].map((sig) => (
              <div key={sig.en} style={{ textAlign: "center" }}>
                <div style={{ borderBottom: "1.5px dashed #1a2233", marginBottom: 10, height: 48 }} />
                <div style={{ fontSize: 10, fontWeight: 700, color: "#444" }}>{sig.en}</div>
                <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>{sig.ar}</div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ marginTop: 28, paddingTop: 12, borderTop: "1px solid #e8e8e8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Image src="/assets/logo-symbol-v2.png" alt="" width={22} height={22} style={{ objectFit: "contain", opacity: 0.4 }} />
            <div style={{ fontSize: 9, color: "#bbb", textAlign: "center", lineHeight: 1.6 }}>
              This contract is governed by Saudi Traffic Law and Tajeer platform terms and conditions.<br />
              هذا العقد خاضع لنظام المرور السعودي وشروط وأحكام منصة تاجير.
            </div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#3EC8BE" }}>مـركـبـة Maarkbh</div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── Extend policy ──────────────────────────────────────────────────────────────
const EXTEND_POLICY: Record<string, { en: string; ar: string }> = {
  pending: {
    en: "Extensions open up once the vehicle has been handed over to the customer.",
    ar: "يتوفر التمديد بعد تسليم المركبة للعميل.",
  },
  late: {
    en: "This contract is past its return time. Process the return and settle the late fee before requesting an extension.",
    ar: "تجاوز هذا العقد موعد الإرجاع. يجب معالجة الإرجاع وتسوية غرامة التأخير أولاً قبل طلب التمديد.",
  },
  completed: {
    en: "This contract is completed and can no longer be extended.",
    ar: "هذا العقد مكتمل ولا يمكن تمديده.",
  },
};

function ExtendCardShell({ ar, children }: { ar: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-[22px] p-5 mk-surface">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(75,114,230,0.10)" }}>
          <CalendarPlus size={16} color="#4B72E6" />
        </div>
        <div className="mk-h4 text-mk-ink-900">{T("Extend Contract", "تمديد العقد", ar)}</div>
      </div>
      {children}
    </div>
  );
}

// ── Extend Card — inline in the contract details, policy-gated ─────────────────
function ExtendCard({
  contract, ext, ar,
}: {
  contract: BookingType;
  ext: { days: number; dailyRate: number; deposit: number; addOns: string[]; payment: string; kmCap: string };
  ar: boolean;
}) {
  const [extDays, setExtDays] = useState(1);
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const addCost = Math.round(extDays * ext.dailyRate * 1.15);
  const extPercent = ((extDays - 1) / 29) * 100;

  const reasons = ar
    ? ["طلب العميل", "عطل المركبة البديلة", "سفر متأخر", "ظروف طارئة", "أخرى"]
    : ["Customer request", "Replacement vehicle unavailable", "Delayed travel", "Emergency", "Other"];

  // Only an active contract, not yet at its return period, is eligible for extension.
  if (contract.status !== "active") {
    const policy = EXTEND_POLICY[contract.status] ?? {
      en: "Extensions aren't available for this contract.",
      ar: "التمديد غير متاح لهذا العقد.",
    };
    return (
      <ExtendCardShell ar={ar}>
        <div className="rounded-xl px-4 py-3 mk-caption leading-relaxed bg-mk-ink-50 text-mk-ink-500">
          {ar ? policy.ar : policy.en}
        </div>
      </ExtendCardShell>
    );
  }

  if (submitted) {
    return (
      <ExtendCardShell ar={ar}>
        <div className="text-center">
          <div style={{ fontSize: 36 }} className="mb-2">✅</div>
          <div className="mk-body-sm text-mk-ink-900 mb-1">
            {T("Contract Extended!", "تم تمديد العقد!", ar)}
          </div>
          <div className="mk-caption text-mk-ink-500 mb-4">
            {T(`+${extDays} day(s) added · ${addCost.toLocaleString()} SAR charged`, `تمت إضافة ${extDays} يوم · ${addCost.toLocaleString()} ر.س`, ar)}
          </div>
          <button
            onClick={() => { setSubmitted(false); setReason(""); }}
            className="px-6 py-[9px] rounded-full mk-label bg-mk-blue-500 text-white border-0 cursor-pointer"
          >
            {T("Done", "تم", ar)}
          </button>
        </div>
      </ExtendCardShell>
    );
  }

  return (
    <ExtendCardShell ar={ar}>
      {/* Extension days */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setExtDays((d) => Math.max(1, d - 1))}
          className="w-9 h-9 rounded-full flex items-center justify-center border-0 cursor-pointer mk-h4"
          style={{ background: "rgba(75,114,230,0.10)", color: "#4B72E6" }}
        >−</button>
        <div className="text-center">
          <div className="mk-h2 text-mk-ink-900 leading-none">{extDays}</div>
          <div className="mk-overline text-mk-ink-400 mt-1">{T("day(s)", "يوم", ar)}</div>
        </div>
        <button
          onClick={() => setExtDays((d) => Math.min(30, d + 1))}
          className="w-9 h-9 rounded-full flex items-center justify-center border-0 cursor-pointer mk-h4"
          style={{ background: "rgba(75,114,230,0.10)", color: "#4B72E6" }}
        >+</button>
      </div>
      <input
        type="range" min={1} max={30} value={extDays}
        onChange={(e) => setExtDays(Number(e.target.value))}
        className="w-full mb-4 h-1.5 rounded-pill appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2
          [&::-webkit-slider-thumb]:border-mk-blue-500 [&::-webkit-slider-thumb]:shadow-[var(--shadow-thumb)]
          [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
          [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2
          [&::-moz-range-thumb]:border-mk-blue-500 [&::-moz-range-thumb]:shadow-[var(--shadow-thumb)]"
        style={{
          background: `linear-gradient(to ${ar ? "left" : "right"}, var(--color-mk-blue-500) ${extPercent}%, var(--color-mk-ink-200) ${extPercent}%)`,
        }}
      />

      {/* Cost summary */}
      <div
        className="rounded-xl p-3 mb-3"
        style={{ background: "linear-gradient(135deg, rgba(75,114,230,0.07), rgba(62,200,190,0.07))", border: "1px solid rgba(75,114,230,0.15)" }}
      >
        <div className="flex justify-between mk-caption mb-1">
          <span className="text-mk-ink-500">{extDays} × {ext.dailyRate} {T("SAR", "ر.س", ar)}</span>
          <span className="mk-label">{(extDays * ext.dailyRate).toLocaleString()} {T("SAR", "ر.س", ar)}</span>
        </div>
        <div className="flex justify-between mk-overline mb-2">
          <span className="text-mk-ink-400">{T("VAT 15%", "ضريبة 15%", ar)}</span>
          <span className="text-mk-ink-400">+{Math.round(extDays * ext.dailyRate * 0.15).toLocaleString()} {T("SAR", "ر.س", ar)}</span>
        </div>
        <div className="flex justify-between mk-body-sm pt-2" style={{ borderTop: "1.5px solid rgba(75,114,230,0.18)" }}>
          <span className="text-mk-ink-900">{T("Total extra", "الإجمالي الإضافي", ar)}</span>
          <span className="text-mk-blue-500">{addCost.toLocaleString()} {T("SAR", "ر.س", ar)}</span>
        </div>
      </div>

      {/* Reason */}
      <div className="mb-4">
        <div className="mk-overline uppercase mb-2 text-mk-ink-400 mk-tracking-eyebrow">
          {T("Reason", "السبب", ar)}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {reasons.map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className="px-2.5 py-[6px] rounded-full mk-overline border-0 cursor-pointer transition-all"
              style={reason === r
                ? { background: "#4B72E6", color: "white" }
                : { background: "var(--color-mk-ink-50)", color: "#4A4F73" }
              }
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Confirm */}
      <button
        onClick={() => setSubmitted(true)}
        disabled={!reason}
        className="w-full flex items-center justify-center gap-2 py-[10px] rounded-full mk-label border-0 cursor-pointer"
        style={{
          background: reason ? "#4B72E6" : "#E4E6F0",
          color: reason ? "white" : "#B0B4D0",
          transition: "background 0.2s",
        }}
      >
        <CalendarPlus size={14} />
        {T(`Confirm +${extDays} day(s)`, `تأكيد +${extDays} يوم`, ar)}
      </button>
    </ExtendCardShell>
  );
}

// ── Pricing Details card — discount editable by owner role only ────────────────
function PricingDetailsCard({
  baseAmount, dailyRate, days, deposit, payment, role, ar,
}: {
  baseAmount: number;
  dailyRate: number;
  days: number;
  deposit: number;
  payment: string;
  role: "owner" | "frontdesk";
  ar: boolean;
}) {
  const canEdit = role === "owner";
  const [discount, setDiscount] = useState(0);
  const [draftDiscount, setDraftDiscount] = useState(0);
  const [editing, setEditing] = useState(false);

  const discountAmount = Math.round(baseAmount * (discount / 100));
  const netBeforeVat = baseAmount - discountAmount;
  const vat = Math.round(netBeforeVat * 0.15);
  const total = netBeforeVat + vat;

  const startEdit = () => { setDraftDiscount(discount); setEditing(true); };
  const saveEdit = () => { setDiscount(Math.min(100, Math.max(0, draftDiscount))); setEditing(false); };
  const cancelEdit = () => setEditing(false);

  return (
    <div className="rounded-[22px] p-5 mk-surface">
      <div className="flex items-center justify-between mb-6">
        <div className="mk-h4 text-mk-ink-900">
          {T("Pricing Details", "تفاصيل أسعار العقد", ar)}
        </div>
        {canEdit ? (
          !editing && (
            <button
              onClick={startEdit}
              className="flex items-center gap-1 px-2.5 py-[4px] rounded-full mk-overline border-0 cursor-pointer bg-mk-blue-100 text-mk-blue-500"
            >
              <Pencil size={11} />{T("Edit discount", "تعديل الخصم", ar)}
            </button>
          )
        ) : (
          <span className="flex items-center gap-1 mk-overline text-mk-ink-400">
            <Lock size={11} />{T("Owner only", "للمالك فقط", ar)}
          </span>
        )}
      </div>

      <div className="flex justify-between mk-caption mb-2.5">
        <span className="text-mk-ink-500">{T("Daily rate", "السعر اليومي", ar)}</span>
        <span>{dailyRate.toLocaleString()} {T("SAR", "ر.س", ar)}</span>
      </div>
      <div className="flex justify-between mk-caption mb-2.5">
        <span className="text-mk-ink-500">{T("Duration", "المدة", ar)}</span>
        <span>{days} {T("days", "أيام", ar)}</span>
      </div>
      <div className="flex justify-between mk-caption mb-2.5">
        <span className="text-mk-ink-400">{T("Base amount", "المبلغ الأساسي", ar)}</span>
        <span>{baseAmount.toLocaleString()} {T("SAR", "ر.س", ar)}</span>
      </div>

      {/* Discount row */}
      <div className="flex items-center justify-between mk-caption mb-2.5 py-1">
        <span className="flex items-center gap-1.5 text-mk-ink-500">
          <Tag size={11} />{T("Discount", "الخصم", ar)}
        </span>
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              max={100}
              value={draftDiscount}
              onChange={(e) => setDraftDiscount(Number(e.target.value))}
              className="w-[56px] px-2 py-[3px] rounded-md text-end mk-caption border border-mk-ink-200 bg-white text-mk-ink-900"
              autoFocus
            />
            <span className="text-mk-ink-400">%</span>
            <button
              onClick={saveEdit}
              className="w-6 h-6 rounded-full flex items-center justify-center border-0 cursor-pointer bg-mk-blue-500 text-white"
            >
              <Check size={12} strokeWidth={3} />
            </button>
            <button
              onClick={cancelEdit}
              className="w-6 h-6 rounded-full flex items-center justify-center border-0 cursor-pointer bg-mk-ink-100 text-mk-ink-500"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <span className={discount > 0 ? "text-mk-blue-500" : "text-mk-ink-400"}>
            {discount > 0
              ? T(`-${discount}% (-${discountAmount.toLocaleString()} SAR)`, `−${discount}٪ (−${discountAmount.toLocaleString()} ر.س)`, ar)
              : T("None", "لا يوجد", ar)}
          </span>
        )}
      </div>

      <div className="flex justify-between mk-caption mb-2.5 pt-2.5 border-t border-mk-ink-100">
        <span className="text-mk-ink-500">{T("Net before VAT", "الصافي قبل الضريبة", ar)}</span>
        <span>{netBeforeVat.toLocaleString()} {T("SAR", "ر.س", ar)}</span>
      </div>
      <div className="flex justify-between mk-caption mb-2.5">
        <span className="text-mk-ink-400">{T("VAT 15%", "ضريبة 15%", ar)}</span>
        <span className="text-mk-ink-400">{vat.toLocaleString()} {T("SAR", "ر.س", ar)}</span>
      </div>
      <div className="flex justify-between mt-1 pt-3 border-t border-mk-ink-100">
        <span className="mk-h4 text-mk-ink-900">{T("Total", "الإجمالي", ar)}</span>
        <span className="mk-h4 text-mk-blue-500">{total.toLocaleString()} {T("SAR", "ر.س", ar)}</span>
      </div>

      <Row label={T("Deposit", "الوديعة", ar)} value={`${deposit} ${T("SAR", "ر.س", ar)}`} />
      <Row label={T("Payment", "الدفع", ar)} value={payment} />
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ContractDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { dir, role } = useAdmin();
  const ar = dir === "rtl";

  const [showPreview, setShowPreview] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showActions) return;
    const handleClick = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) setShowActions(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showActions]);

  const contract = BOOKINGS.find((b) => b.id === id);

  if (!contract) {
    return (
      <div className="py-24 text-center">
        <div className="mk-display mb-3">📋</div>
        <div className="mk-body mb-1 text-mk-ink-900">{T("Contract not found", "العقد غير موجود", ar)}</div>
        <Link href="/employee/contracts" className="mk-body-sm text-mk-blue-500 no-underline">
          {T("← Back to contracts", "العودة للعقود →", ar)}
        </Link>
      </div>
    );
  }

  const ext = CONTRACT_EXT[id] ?? { days: 3, dailyRate: 300, deposit: 500, addOns: [], payment: "Mada", kmCap: "250 km/day" };
  const car = CARS.find((c) => c.plate === contract.plate);
  const carKey = ["Camry", "Sonata", "Elantra", "Civic", "Sportage", "Patrol", "CX-5", "Land Cruiser", "Tahoe", "ZS"].find((k) => contract.car.includes(k)) || "Sonata";
  const carPhoto = (CAR_IMAGES[carKey] ?? CAR_IMAGES["Sonata"])[0];
  const sm = STATUS_CONFIG[contract.status] ?? { variant: "neutral" as const, labelEn: contract.status, labelAr: contract.status };
  const baseAmount = ext.dailyRate * ext.days;
  const lateFeePerHour = car?.lateFeePerHour ?? 35;

  const canHandOver = contract.status === "pending";
  const canReturn   = contract.status === "active" || contract.status === "late";
  const canCancel   = role === "owner";

  return (
    <div dir={ar ? "rtl" : "ltr"}>
      {/* Header row */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link
          href="/employee/contracts"
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-white shadow-[var(--shadow-card)] text-mk-ink-600 no-underline"
        >
          {ar ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Link>

        <span className="font-mono mk-h3 leading-none text-mk-ink-900">{contract.id}</span>
        <Badge variant={sm.variant} dot>{ar ? sm.labelAr : sm.labelEn}</Badge>

        {contract.flagged && (
          <span className="flex items-center gap-1 mk-caption px-2 py-[3px] rounded-full text-mk-danger" style={{ background: "rgba(226,65,113,0.10)" }}>
            <AlertTriangle size={11} /> {T("Flagged", "مُبلَّغ", ar)}
          </span>
        )}

        <div className="flex-1" />

        {/* More actions dropdown */}
        <div className="relative" ref={actionsRef}>
          <button
            onClick={() => setShowActions((s) => !s)}
            className={`w-8 h-8 rounded-full flex items-center justify-center border-0 cursor-pointer transition-colors ${
              showActions ? "bg-mk-blue-100 text-mk-blue-500" : "bg-mk-ink-100 text-mk-ink-500 hover:bg-mk-ink-200"
            }`}
          >
            <MoreVertical size={15} />
          </button>
          {showActions && (
            <div
              className="absolute z-50 w-[210px] mk-surface rounded-[14px] overflow-hidden py-1"
              style={{ boxShadow: "0 8px 32px -4px rgba(15,20,48,0.18), 0 1px 4px rgba(15,20,48,0.08)", top: "calc(100% + 6px)", insetInlineEnd: 0 }}
            >
              <button
                onClick={() => { setShowPreview(true); setShowActions(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-[9px] mk-label text-start border-0 bg-transparent cursor-pointer transition-colors text-mk-ink-800 hover:bg-mk-ink-50"
              >
                <Eye size={14} />{T("Contract Preview", "معاينة العقد", ar)}
              </button>
              <button
                onClick={() => setShowActions(false)}
                className="w-full flex items-center gap-2.5 px-4 py-[9px] mk-label text-start border-0 bg-transparent cursor-pointer transition-colors text-mk-ink-800 hover:bg-mk-ink-50"
              >
                <FileText size={14} />{T("Contract PDF", "تحميل PDF", ar)}
              </button>
              <button
                onClick={() => setShowActions(false)}
                className="w-full flex items-center gap-2.5 px-4 py-[9px] mk-label text-start border-0 bg-transparent cursor-pointer transition-colors text-mk-ink-800 hover:bg-mk-ink-50"
              >
                <Printer size={14} />{T("Print", "طباعة", ar)}
              </button>
              {canCancel ? (
                <>
                  <div className="my-1 border-t border-mk-ink-100" />
                  <button
                    onClick={() => setShowActions(false)}
                    className="w-full flex items-center gap-2.5 px-4 py-[9px] mk-label text-start border-0 bg-transparent cursor-pointer transition-colors text-mk-danger hover:bg-mk-danger/6"
                  >
                    <XCircle size={14} />{T("Cancel contract", "إلغاء العقد", ar)}
                  </button>
                </>
              ) : contract.status !== "completed" && (
                <>
                  <div className="my-1 border-t border-mk-ink-100" />
                  <div className="flex items-center gap-2.5 px-4 py-[9px] mk-caption text-mk-ink-400">
                    🔒 {T("Cancellation: manager only", "الإلغاء: للمدير فقط", ar)}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {canReturn && (
          <Link
            href={`/employee/return?id=${contract.id}`}
            className="flex items-center gap-2 px-5 py-[10px] rounded-full mk-body-sm text-white no-underline shadow-[var(--shadow-glow-blue)]"
            style={{ background: contract.status === "late" ? "#E24171" : "#4171E2" }}
          >
            {T("Process return", "معالجة الإرجاع", ar)}
            {ar ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
          </Link>
        )}

        {canHandOver && (
          <Link
            href={`/employee/pickup?id=${contract.id}`}
            className="flex items-center gap-2 px-5 py-[10px] rounded-full mk-body-sm text-white bg-mk-blue-500 no-underline shadow-[var(--shadow-glow-blue)]"
          >
            {T("Hand over vehicle", "تسليم المركبة", ar)}
            {ar ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
          </Link>
        )}
      </div>

      {/* Late warning */}
      {contract.status === "late" && (
        <div
          className="flex items-center gap-3 rounded-lg px-5 py-[14px] mb-4"
          style={{ background: "rgba(226,65,113,0.06)", border: "1px solid rgba(226,65,113,0.25)" }}
        >
          <AlertTriangle size={18} className="text-mk-danger shrink-0" />
          <div>
            <div className="mk-body-sm" style={{ color: "#C01A52" }}>
              {T("Late return — penalty accumulating", "إرجاع متأخر — الغرامة تتراكم", ar)}
            </div>
            <div className="mk-caption mt-[2px]" style={{ color: "#9B1D47" }}>
              {T(`Rate: ${lateFeePerHour} SAR/hr after 1 hr grace. 4 hours = full day charge.`, `السعر: ${lateFeePerHour} ر.س/ساعة بعد ساعة مهلة. ٤ ساعات = يوم كامل.`, ar)}
            </div>
          </div>
        </div>
      )}

      {/* 2-column layout, 60/40: contract details · timeline + extend + financial */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4 mb-4 items-start">

        {/* Column 1 — Contract Details */}
        <div className="rounded-[22px] p-5 mk-surface">
          <div className="mk-h4 mb-6 text-mk-ink-900">
            {T("Contract Details", "تفاصيل العقد", ar)}
          </div>

          {/* Customer */}
          <div className="flex items-center gap-3 mb-3">
            <Avatar name={contract.customer} size="md" />
            <div>
              <div className="mk-body-sm text-mk-ink-900">{contract.customer}</div>
              <div className="mk-caption text-mk-ink-500">{contract.phone}</div>
            </div>
          </div>
          <Row label={T("KYC", "التحقق", ar)} value={
            <span className="px-2 py-[2px] rounded-full mk-overline"
              style={contract.kyc === "verified"
                ? { background: "rgba(63,182,172,0.12)", color: "#3FB6AC" }
                : { background: "rgba(226,163,65,0.14)", color: "#C47A15" }
              }>
              {contract.kyc === "verified" ? T("Verified ✓", "موثّق ✓", ar) : T("Pending", "معلق", ar)}
            </span>
          } />
          <Row label={T("Blacklist", "القائمة السوداء", ar)} value={
            <span className="px-2 py-[2px] rounded-full mk-overline" style={{ background: "rgba(63,182,172,0.12)", color: "#3FB6AC" }}>
              {T("Clear ✓", "نظيف ✓", ar)}
            </span>
          } />
          <div className="flex gap-2 mt-3 mb-4">
            <button className="flex-1 flex items-center justify-center gap-1 py-[8px] rounded-full mk-caption bg-mk-blue-100 text-mk-blue-500 border-0 cursor-pointer">
              <Phone size={12} />{T("Call", "اتصال", ar)}
            </button>
            <button className="flex-1 flex items-center justify-center gap-1 py-[8px] rounded-full mk-caption bg-mk-blue-100 text-mk-blue-500 border-0 cursor-pointer">
              <MessageSquare size={12} />{T("SMS", "رسالة", ar)}
            </button>
          </div>

          <div className="h-px bg-mk-ink-100 mb-4" />

          {/* Vehicle — compact row */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-mk-ink-50">
              <Image src={carPhoto} alt={contract.car} fill sizes="56px" style={{ objectFit: "cover", objectPosition: "center" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="mk-body-sm text-mk-ink-900 truncate">{contract.car}</div>
              <div className="flex items-center gap-2 mt-[2px] flex-wrap">
                <span className="mk-caption text-mk-ink-500">{contract.plate}</span>
                <span className="mk-caption text-mk-ink-500">{car?.type ?? "—"}</span>
                <span className="mk-caption text-mk-ink-500">{ext.kmCap}</span>
              </div>
            </div>
            <div className="text-end shrink-0">
              <div className="flex items-center justify-end gap-1 text-mk-blue-500">
                <span className="mk-body-sm">{ext.dailyRate}</span>
                <span className="mk-overline text-mk-ink-400">{T("SAR/d", "ر.س/يوم", ar)}</span>
              </div>
              <div className="mk-overline mt-[1px] text-mk-ink-400">
                {T("est.", "تقدير", ar)} {baseAmount.toLocaleString()} {T("SAR", "ريال", ar)}
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowMap(true)}
            className="w-full flex items-center justify-center gap-1.5 py-[7px] rounded-full mk-caption bg-mk-blue-100 text-mk-blue-500 border-0 cursor-pointer mb-4"
          >
            <MapPin size={13} />
            {T("View on map", "عرض على الخريطة", ar)}
          </button>

          <div className="h-px bg-mk-ink-100 mb-4" />

          {/* Period */}
          <Row label={T("Pickup", "التسليم", ar)} value={`${contract.date} ${contract.time}`} />
          <Row label={T("Return", "الإرجاع", ar)} value={contract.dropoff} />
          <Row label={T("Duration", "المدة", ar)} value={`${ext.days} ${T("days", "أيام", ar)}`} />
          <Row label={T("Branch", "الفرع", ar)} value={contract.branch} />
          {ext.addOns.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {ext.addOns.map((ao) => (
                <span key={ao} className="mk-overline px-2 py-[3px] rounded-full bg-mk-blue-100 text-mk-blue-500">
                  {ao}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Column 2 — Timeline, then Extend, then Financial */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-4">
          {/* Timeline (vertical) */}
          <div className="rounded-[22px] p-5 mk-surface">
            <div className="mk-h4 mb-6 text-mk-ink-900">
              {T("Timeline", "المسار الزمني", ar)}
            </div>
            <div className="flex flex-col">
              {TIMELINE_STEPS.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: step.done ? "#3FB6AC" : "#E8EAFB",
                        color: step.done ? "white" : "#B0B4D0",
                      }}
                    >
                      {step.done ? <Check size={11} strokeWidth={3} /> : <Clock size={10} />}
                    </div>
                    {i < TIMELINE_STEPS.length - 1 && (
                      <div className="w-[2px] flex-1 my-1" style={{ background: step.done ? "#3EC8BE" : "#E8EAFB", minHeight: 24 }} />
                    )}
                  </div>
                  <div className={i < TIMELINE_STEPS.length - 1 ? "pb-4" : ""}>
                    <div className="mk-caption leading-tight" style={{ color: step.done ? "var(--color-mk-ink-900)" : "var(--color-mk-ink-400)" }}>
                      {ar ? step.labelAr : step.labelEn}
                    </div>
                    <div className="mk-overline mt-[2px]" style={{ color: "#B0B4D0" }}>{step.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Extend — inline card, policy-gated */}
          <ExtendCard contract={contract} ext={ext} ar={ar} />

          {/* Pricing Details — discount editable by owner role only */}
          <PricingDetailsCard
            baseAmount={baseAmount}
            dailyRate={ext.dailyRate}
            days={ext.days}
            deposit={ext.deposit}
            payment={ext.payment}
            role={role}
            ar={ar}
          />
        </div>
      </div>

      {/* Modals */}
      {showPreview && (
        <ContractPreviewModal
          contract={contract}
          ext={ext}
          lateFeePerHour={lateFeePerHour}
          onClose={() => setShowPreview(false)}
          ar={ar}
        />
      )}
      {showMap && (
        <VehicleMapPanel
          contract={contract}
          ar={ar}
          onClose={() => setShowMap(false)}
        />
      )}
    </div>
  );
}
