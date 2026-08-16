"use client";

import { useState } from "react";
import { ShieldCheck, Gauge, Baby, Fuel, Wifi, MapPin, Compass, Accessibility, Pencil, Check } from "lucide-react";
import { CARS } from "@/lib/data";
import { useAdmin } from "@/contexts/AdminContext";
import { Input, Button, Badge, Table, Th, Td } from "@/components/ui";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

export default function PricingPage() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const pricingCars = CARS.filter((c) => c.status !== "draft").slice(0, 6);

  const ADDON_DEFS = [
    { k: "insurance", icon: ShieldCheck, nameEn: "Insurance · Comprehensive", nameAr: "تأمين · شامل", descEn: "Full coverage, zero liability", descAr: "تغطية كاملة بدون تحمل شخصي", defaultPrice: 1500, unitEn: "once", unitAr: "مرة واحدة", cls: "text-mk-mint-600" },
    { k: "unlimited_km", icon: Gauge, nameEn: "Unlimited Kilometers", nameAr: "كيلومتر مفتوح", descEn: "No km cap for the rental period", descAr: "بدون حد للكيلومتر طوال الإيجار", defaultPrice: 85, unitEn: "day", unitAr: "يوم", cls: "text-mk-blue-500" },
    { k: "child", icon: Baby, nameEn: "Child seat (0–2)", nameAr: "مقعد أطفال (٠–٢)", descEn: "Installed before pickup", descAr: "مركّب قبل التسليم", defaultPrice: 25, unitEn: "day", unitAr: "يوم", cls: "text-mk-violet-500" },
    { k: "fuel", icon: Fuel, nameEn: "Fuel prepay (40 L)", nameAr: "وقود مسبق (٤٠ ل)", descEn: "Return empty, no penalty", descAr: "الإرجاع فارغ بلا غرامة", defaultPrice: 175, unitEn: "once", unitAr: "مرة واحدة", cls: "text-mk-warning" },
    { k: "internet", icon: Wifi, nameEn: "Internet / Wi-Fi", nameAr: "خدمة الإنترنت", descEn: "High-speed 4G/5G portable router", descAr: "راوتر متنقل سريع 4G/5G", defaultPrice: 30, unitEn: "day", unitAr: "يوم", cls: "text-mk-blue-500" },
    { k: "delivery", icon: MapPin, nameEn: "Car Delivery (per Km)", nameAr: "توصيل السيارة (بالكيلو)", descEn: "Priced by distance", descAr: "التوصيل للموقع بسعر لكل كم", defaultPrice: 5, unitEn: "km", unitAr: "كم", cls: "text-mk-violet-500" },
    { k: "return_agent", icon: MapPin, nameEn: "Vehicle Pickup by Agent", nameAr: "استلام المركبة بواسطة مندوب", descEn: "Agent collects the vehicle from the customer's location", descAr: "مندوب يستلم المركبة من موقع العميل عند التسليم", defaultPrice: 75, unitEn: "once", unitAr: "مرة واحدة", cls: "text-mk-violet-500" },
    { k: "navigation", icon: Compass, nameEn: "GPS Navigation System", nameAr: "نظام الملاحة GPS", descEn: "Dedicated offline GPS device", descAr: "جهاز خرائط وملاحة مستقل", defaultPrice: 40, unitEn: "day", unitAr: "يوم", cls: "text-mk-mint-600" },
    { k: "special_needs", icon: Accessibility, nameEn: "Special Needs Amenities", nameAr: "وسائل لذوي الاحتياجات الخاصة", descEn: "Hand controls & specialized assistance", descAr: "تجهيزات خاصة وتسهيلات حركة", defaultPrice: 50, unitEn: "day", unitAr: "يوم", cls: "text-mk-warning" },
  ] as const;

  const [addonPrices, setAddonPrices] = useState<Record<string, number>>(
    Object.fromEntries(ADDON_DEFS.map((a) => [a.k, a.defaultPrice]))
  );
  const [editingAddons, setEditingAddons] = useState(false);

  const CANCEL_POLICY = [
    { windowEn: "24h+ before pickup", windowAr: "قبل ٢٤س+ من التسليم", refundEn: "100%", refundAr: "١٠٠٪", cls: "text-mk-mint-600" },
    { windowEn: "2 – 24h before", windowAr: "قبل ٢ – ٢٤ ساعة", refundEn: "50%", refundAr: "٥٠٪", cls: "text-mk-warning" },
    { windowEn: "Under 2h", windowAr: "أقل من ساعتين", refundEn: "No refund", refundAr: "لا استرداد", cls: "text-mk-danger" },
  ];

  return (
    <div className="flex flex-col gap-4">
    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
      {/* Per-car pricing table */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="mk-h4 flex-1 text-mk-ink-900">
            {T("Per-car pricing", "الأسعار لكل مركبة", ar)}
          </div>
          <Button variant="outline" size="sm">{T("Bulk edit", "تعديل جماعي", ar)}</Button>
        </div>
        <div className="rounded-xl overflow-hidden mk-surface">
          <Table>
            <thead>
              <tr>
                {[
                  T("Car", "المركبة", ar),
                  T("Daily rate", "السعر اليومي", ar),
                  T("KM cap", "حد الكيلومترات", ar),
                  T("Overage", "التجاوز", ar),
                  T("Deposit", "التأمين", ar),
                ].map((h, i) => <Th key={i}>{h}</Th>)}
              </tr>
            </thead>
            <tbody>
              {pricingCars.map((c) => (
                <tr key={c.plate} className="cursor-pointer transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50">
                  <Td>
                    <div className="mk-label text-mk-ink-900">{c.make} {c.model}</div>
                    <div className="font-mono mk-overline mt-1 text-mk-ink-500">{c.plate}</div>
                  </Td>
                  <Td>
                    <span className="mk-body-sm text-mk-ink-900">{c.dailyRate}</span>
                    <span className="mk-caption ms-1 text-mk-ink-500 uppercase-none normal-case tracking-normal">{T("SAR", "ريال", ar)}</span>
                  </Td>
                  <Td>
                    {c.kmCap === "Unlimited" ? (
                      <Badge variant="neutral" className="normal-case tracking-normal">{T("Unlimited", "غير محدود", ar)}</Badge>
                    ) : (
                      <span className="mk-label text-mk-ink-700">{c.kmCap} {T("km", "كم", ar)}</span>
                    )}
                  </Td>
                  <Td className="mk-label text-mk-ink-700">{T("2 SAR/km", "٢ ريال/كم", ar)}</Td>
                  <Td className="mk-label text-mk-ink-700">{T("1,500 SAR", "١٬٥٠٠ ريال", ar)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </div>

      {/* Right column */}
      <div className="flex flex-col gap-4">
        {/* Cancellation policy */}
        <div className="rounded-xl p-6 mk-surface">
          <div className="mk-h4 mb-4 text-mk-ink-900">
            {T("Cancellation policy", "سياسة الإلغاء", ar)}
          </div>
          <div className="flex flex-col gap-2">
            {CANCEL_POLICY.map((p) => (
              <div key={p.windowEn} className="flex items-center justify-between px-3 py-3 rounded-md bg-mk-ink-50">
                <span className="mk-label text-mk-ink-900">{ar ? p.windowAr : p.windowEn}</span>
                <span className={`mk-label ${p.cls}`}>{ar ? p.refundAr : p.refundEn}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Late return rules */}
        <div className="rounded-xl p-6 bg-mk-blue-50 shadow-[var(--shadow-card)]">
          <div className="mk-h4 mb-3 text-mk-blue-700">
            {T("Late-return penalty", "غرامة التأخر في الإرجاع", ar)}
          </div>
          <div className="flex flex-col gap-2 mk-caption normal-case tracking-normal text-mk-blue-500">
            <div>⏱ <b>{T("1h grace", "ساعة سماح", ar)}</b> — {T("no charge", "بدون رسوم", ar)}</div>
            <div>💰 <b>{T("Daily rate ÷ 8", "السعر اليومي ÷ ٨", ar)}</b> {T("per hour after grace", "لكل ساعة بعد السماح", ar)}</div>
            <div>📅 <b>{T("4h or more", "٤ ساعات أو أكثر", ar)}</b> = {T("full extra day", "يوم كامل إضافي", ar)}</div>
          </div>
        </div>
      </div>
    </div>

    {/* Add-on services pricing table */}
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="mk-h4 flex-1 text-mk-ink-900">
          {T("Add-on services pricing", "جدول تسعير الخدمات الإضافية", ar)}
        </div>
        {editingAddons ? (
          <Button variant="primary" size="sm" onClick={() => setEditingAddons(false)}>
            <Check size={13} />{T("Done", "تم الحفظ", ar)}
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setEditingAddons(true)}>
            <Pencil size={13} />{T("Edit prices", "تعديل الأسعار", ar)}
          </Button>
        )}
      </div>
      <div className="rounded-xl overflow-hidden mk-surface">
        <Table>
          <thead>
            <tr>
              {[
                T("Service", "الخدمة", ar),
                T("Description", "الوصف", ar),
                T("Unit", "الوحدة", ar),
                T("Price", "السعر", ar),
              ].map((h, i) => <Th key={i}>{h}</Th>)}
            </tr>
          </thead>
          <tbody>
            {ADDON_DEFS.map((a) => (
              <tr key={a.k} className="transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50">
                <Td>
                  <div className="flex items-center gap-3">
                    <a.icon size={16} className={`${a.cls} shrink-0`} />
                    <span className="mk-label text-mk-ink-900">{ar ? a.nameAr : a.nameEn}</span>
                  </div>
                </Td>
                <Td className="mk-caption text-mk-ink-500">{ar ? a.descAr : a.descEn}</Td>
                <Td>
                  <Badge variant="neutral" className="normal-case tracking-normal">
                    {ar ? a.unitAr : `/ ${a.unitEn}`}
                  </Badge>
                </Td>
                <Td>
                  {editingAddons ? (
                    <div className="max-w-[140px]">
                      <Input
                        type="number"
                        min={0}
                        value={addonPrices[a.k]}
                        onChange={(e) =>
                          setAddonPrices((prev) => ({ ...prev, [a.k]: Math.max(0, Number(e.target.value) || 0) }))
                        }
                      />
                    </div>
                  ) : (
                    <>
                      <span className="mk-body-sm text-mk-ink-900">{addonPrices[a.k].toLocaleString()}</span>
                      <span className="mk-caption ms-1 text-mk-ink-500 uppercase-none normal-case tracking-normal">{T("SAR", "ريال", ar)}</span>
                    </>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
    </div>
  );
}
