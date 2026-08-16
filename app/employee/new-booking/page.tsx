"use client";

import { useState } from "react";
import { CheckCircle, ShieldCheck, Gauge, Shield, ChevronDown } from "lucide-react";
import { Avatar, Badge, Button, Input, Select, Toggle } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";

const T = (en: string, ar: string, isAr: boolean) => isAr ? ar : en;

const CARS = [
  { plate: "ABC 1234", make: "Toyota", model: "Camry", year: 2024, type: "Sedan", km: 250, rate: 360 },
  { plate: "DEF 5678", make: "Hyundai", model: "Sonata", year: 2023, type: "Sedan", km: 250, rate: 280 },
  { plate: "GHI 9012", make: "Kia", model: "Sportage", year: 2024, type: "SUV", km: 200, rate: 420 },
];

export default function NewBookingPage() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const [step, setStep] = useState(2);;
  const [selectedCar, setSelectedCar] = useState(0);

  // Add-ons state
  const [openKm, setOpenKm] = useState(false);          // كيلومتر مفتوح
  const [kmPrice, setKmPrice] = useState("1.50");        // سعر الكيلو الإضافي
  const [insurance, setInsurance] = useState<"comprehensive" | "standard" | null>(null); // نوع التأمين

  const STEPS = [
    T("Customer", "العميل", ar),
    T("Car & dates", "المركبة والتواريخ", ar),
    T("Add-ons", "الإضافات", ar),
    T("Verification", "التحقق", ar),
    T("Payment", "الدفع", ar),
    T("Issue contract", "إصدار العقد", ar),
  ];

  // Simple pricing estimate
  const baseRate = CARS[selectedCar].rate * 4.2;
  const addonsExtra = (openKm ? 100 : 0) + (insurance === "comprehensive" ? 80 : insurance === "standard" ? 35 : 0);
  const total = (baseRate + addonsExtra).toFixed(0);

  return (
    <div>
      {/* Stepper */}
      <div className="flex gap-2 mb-6">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => setStep(i)}
            className="flex-1 flex items-center gap-3 px-4 py-3 rounded-md mk-label transition-all border-0 cursor-pointer"
            style={{
              background: i === step ? "var(--color-mk-blue-500)" : "white",
              color: i === step ? "white" : i < step ? "var(--color-mk-mint-600)" : "var(--color-mk-ink-600)",
              fontWeight: i === step ? "var(--fw-semibold)" : "var(--fw-regular)",
              boxShadow: i === step ? "0 8px 20px -8px rgba(65,113,226,0.55)" : "0 1px 2px rgba(15,20,48,0.04)",
            }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mk-caption"
              style={{
                background: i < step ? "var(--color-mk-mint-600)" : i === step ? "rgba(255,255,255,0.22)" : "var(--color-mk-ink-100)",
                color: i < step || i === step ? "white" : "var(--color-mk-ink-600)",
              }}
            >
              {i < step ? "✓" : i + 1}
            </div>
            <span className="truncate">{s}</span>
          </button>
        ))}
      </div>

      {/* Two-col */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Car & dates */}
        <div className="mk-surface rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="mk-h4 flex-1 text-mk-ink-900">
              {T("Step 3 · Choose car & dates", "الخطوة ٣ · اختر المركبة والتواريخ", ar)}
            </div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full mk-overline bg-mk-blue-50 text-mk-blue-500">
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {T("Auto-saving", "حفظ تلقائي", ar)}
            </span>
          </div>

          {/* Date inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            {[
              { label: T("Pickup date & time", "تاريخ ووقت التسليم", ar), val: T("Today · Wed, May 7 · 14:00", "اليوم · الأربعاء ٧ مايو · ١٤:٠٠", ar) },
              { label: T("Return date & time", "تاريخ ووقت الإرجاع", ar), val: T("Sun, May 11 · 18:00  4d 4h", "الأحد ١١ مايو · ١٨:٠٠  ٤ي ٤س", ar) },
            ].map(({ label, val }) => (
              <div key={label} className="flex flex-col gap-2">
                <label className="mk-caption text-mk-ink-700">{label}</label>
                <div className="px-4 py-3 rounded-md mk-label bg-mk-ink-50 border border-mk-ink-100 text-mk-ink-900">
                  📅 {val}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {[
              { label: T("Pickup branch", "فرع التسليم", ar), val: T("Riyadh — Olaya", "الرياض — العليا", ar) },
              { label: T("Category", "الفئة", ar), val: T("Sedan", "سيدان", ar) },
            ].map(({ label, val }) => (
              <div key={label} className="flex flex-col gap-2">
                <label className="mk-caption text-mk-ink-700">{label}</label>
                <Select>
                  <option>{val}</option>
                </Select>
              </div>
            ))}
          </div>

          <div className="mk-overline uppercase mb-2 text-mk-ink-500 mk-tracking-wide">
            {T("Available · 6 cars match", "متاحة · ٦ مركبات مطابقة", ar)}
          </div>

          <div className="flex flex-col gap-2">
            {CARS.map((c, i) => (
              <div
                key={c.plate}
                onClick={() => setSelectedCar(i)}
                className="flex items-center gap-4 rounded-lg px-5 py-4 cursor-pointer shadow-[var(--shadow-card)]"
                style={{
                  background: selectedCar === i ? "var(--color-mk-blue-50)" : "white",
                  border: selectedCar === i ? "1px solid var(--color-mk-blue-500)" : "1px solid var(--color-mk-ink-100)",
                }}
              >
                <div className="w-16 h-11 rounded-md flex items-center justify-center shrink-0 text-mk-blue-500" style={{ background: "linear-gradient(135deg,rgba(65,113,226,0.18),rgba(127,67,221,0.18)),var(--color-mk-ink-100)" }}>
                  🚗
                </div>
                <div className="flex-1 min-w-0">
                  <div className="mk-body text-mk-ink-900">{c.make} {c.model} · {c.year}</div>
                  <div className="mk-caption text-mk-ink-500">
                    {c.plate} · {T(c.type, c.type === "Sedan" ? "سيدان" : "دفع رباعي", ar)} · {c.km === 250 ? T("250 km/day", "٢٥٠ كم/يوم", ar) : T(`${c.km} km/day`, `${c.km} كم/يوم`, ar)}
                  </div>
                </div>
                <div className="text-end shrink-0">
                  <div className="mk-body-sm text-mk-ink-900">{c.rate} {T("SAR", "ريال", ar)}</div>
                  <div className="mk-overline text-mk-ink-500">{T("/day · est", "/يوم · تقديري", ar)} {(c.rate * 4.2).toFixed(0)} {T("total", "إجمالي", ar)}</div>
                </div>
                <input type="radio" name="car" readOnly checked={selectedCar === i} className="accent-mk-blue-500" />
              </div>
            ))}
          </div>
        </div>

        {/* Right column: customer + add-ons */}
        <div className="flex flex-col gap-4">

          {/* ─── Add-ons card ─── */}
          <div className="mk-surface rounded-xl p-6">
            <div className="mk-h4 mb-4 text-mk-ink-900">
              {T("Additional services", "الخدمات الإضافية", ar)}
            </div>

            {/* ── Open KM toggle ── */}
            <div
              className="rounded-lg p-4 mb-3"
              style={{
                background: openKm ? "rgba(65,113,226,0.06)" : "var(--color-mk-ink-50)",
                border: openKm ? "1px solid rgba(65,113,226,0.30)" : "1px solid var(--color-mk-ink-100)",
                transition: "all 0.2s",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
                  style={{
                    background: openKm ? "rgba(65,113,226,0.12)" : "var(--color-mk-ink-100)",
                    color: openKm ? "var(--color-mk-blue-500)" : "var(--color-mk-ink-400)",
                  }}
                >
                  <Gauge size={17} />
                </div>
                <div className="flex-1">
                  <div className="mk-body text-mk-ink-900">
                    {T("Unlimited mileage", "كيلومتر مفتوح", ar)}
                  </div>
                  <div className="mk-caption text-mk-ink-500">
                    {T("No daily km cap — drive as much as you need", "لا حد يومي للكيلومترات", ar)}
                  </div>
                </div>
                <Toggle checked={openKm} onChange={setOpenKm} />
              </div>

              {/* Extra km price — shown when open km is OFF */}
              {!openKm && (
                <div className="mt-3 pt-3 border-t border-mk-ink-100">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="mk-caption block mb-2 text-mk-ink-700">
                        {T("Price per extra km", "سعر الكيلو الإضافي", ar)}
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={kmPrice}
                          onChange={(e) => setKmPrice(e.target.value)}
                          className="w-24"
                        />
                        <span className="mk-caption text-mk-ink-500">{T("SAR / km", "ريال / كم", ar)}</span>
                      </div>
                    </div>
                    <div className="mk-overline rounded-sm px-3 py-2 text-center shrink-0 bg-mk-warning-100 text-mk-warning">
                      {T(`${CARS[selectedCar].km} km cap`, `${CARS[selectedCar].km} كم يومياً`, ar)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Insurance type ── */}
            <div className="mb-1">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={13} className="text-mk-ink-400" />
                <span className="mk-caption text-mk-ink-700">
                  {T("Insurance type", "نوع التأمين", ar)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Comprehensive */}
                <button
                  onClick={() => setInsurance(ins => ins === "comprehensive" ? null : "comprehensive")}
                  className="flex flex-col gap-1 rounded-md px-4 py-3 text-start cursor-pointer"
                  style={{
                    background: insurance === "comprehensive" ? "rgba(63,182,172,0.08)" : "var(--color-mk-ink-50)",
                    border: insurance === "comprehensive" ? "1.5px solid var(--color-mk-mint-600)" : "1px solid var(--color-mk-ink-100)",
                    transition: "all 0.15s",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                      style={{ borderColor: insurance === "comprehensive" ? "var(--color-mk-mint-600)" : "var(--color-mk-ink-350)" }}
                    >
                      {insurance === "comprehensive" && <span className="w-2 h-2 rounded-full bg-[var(--color-mk-mint-600)] block" />}
                    </div>
                    <span className="mk-label text-mk-ink-900">
                      {T("Comprehensive", "شامل", ar)}
                    </span>
                  </div>
                  <div className="mk-overline ms-6 text-mk-ink-500">
                    {T("Full coverage · +80 SAR", "تغطية كاملة · +٨٠ ريال", ar)}
                  </div>
                </button>

                {/* Standard */}
                <button
                  onClick={() => setInsurance(ins => ins === "standard" ? null : "standard")}
                  className="flex flex-col gap-1 rounded-md px-4 py-3 text-start cursor-pointer"
                  style={{
                    background: insurance === "standard" ? "rgba(65,113,226,0.06)" : "var(--color-mk-ink-50)",
                    border: insurance === "standard" ? "1.5px solid var(--color-mk-blue-500)" : "1px solid var(--color-mk-ink-100)",
                    transition: "all 0.15s",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                      style={{ borderColor: insurance === "standard" ? "var(--color-mk-blue-500)" : "var(--color-mk-ink-350)" }}
                    >
                      {insurance === "standard" && <span className="w-2 h-2 rounded-full bg-[var(--color-mk-blue-500)] block" />}
                    </div>
                    <span className="mk-label text-mk-ink-900">
                      {T("Standard", "عادي", ar)}
                    </span>
                  </div>
                  <div className="mk-overline ms-6 text-mk-ink-500">
                    {T("Basic coverage · +35 SAR", "تغطية أساسية · +٣٥ ريال", ar)}
                  </div>
                </button>
              </div>

              {insurance === null && (
                <div className="mk-overline mt-2 text-mk-ink-400">
                  {T("No insurance selected — customer assumes liability", "لم يُختر تأمين — المسؤولية على العميل", ar)}
                </div>
              )}
            </div>
          </div>

          {/* ─── Customer card ─── */}
          <div className="mk-surface rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="mk-h4 flex-1 text-mk-ink-900">{T("Customer", "العميل", ar)}</div>
              <Button variant="outline" size="sm">{T("Switch", "تبديل", ar)}</Button>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <Avatar name="Khaled Al-Ahmadi" size="lg" />
              <div>
                <div className="mk-body text-mk-ink-900">{T("Khaled Al-Ahmadi", "خالد الأحمدي", ar)}</div>
                <div className="mk-caption mb-2 text-mk-ink-500">+966 50 4471 ••</div>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="success" dot>{T("Phone verified", "الهاتف موثّق", ar)}</Badge>
                  <Badge variant="success">{T("License on file", "الرخصة محفوظة", ar)}</Badge>
                </div>
              </div>
            </div>

            <div className="rounded-lg p-4 mb-3 bg-mk-ink-50">
              {[
                [T("Past bookings", "الحجوزات السابقة", ar), T("4 completed", "٤ مكتملة", ar)],
                [T("Avg rating given", "متوسط التقييم", ar), T("4.8 ★", "٤٫٨ ★", ar)],
                [T("Last late return", "آخر تأخر إرجاع", ar), T("None", "لا يوجد", ar)],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between mk-label mb-2 last:mb-0">
                  <span className="text-mk-ink-500">{k}</span>
                  <b className="text-mk-ink-900">{v}</b>
                </div>
              ))}
            </div>

            <div className="rounded-lg p-4 mb-4 bg-mk-mint-600/8 border border-mk-mint-600/30">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-mk-mint-600" />
                <b className="mk-label text-mk-ink-900">{T("Cleared blacklist check", "اجتاز فحص القائمة السوداء", ar)}</b>
              </div>
              <div className="mk-caption mt-1 text-mk-ink-500">
                {T("No matches in 14,238-entry shared DB · checked just now", "لا مطابقات في القاعدة المشتركة (١٤٬٢٣٨ سجلاً) · فُحص للتو", ar)}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))}>
                {T("Back", "رجوع", ar)}
              </Button>
              <Button
                variant="primary"
                className="flex-1 shadow-[var(--shadow-glow-blue)]"
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              >
                {ar ? `متابعة · ${Number(total).toLocaleString("ar-SA")} ريال` : `Continue · ${Number(total).toLocaleString()} SAR`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
