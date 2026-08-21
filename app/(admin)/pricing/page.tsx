"use client";

import { useState } from "react";
import { CARS } from "@/lib/data";
import { useAdmin } from "@/contexts/AdminContext";
import { Button, Badge, Table, Th, Td } from "@/components/ui";
import AdditionalServicesSection from "@/components/shared/additional-services/AdditionalServicesSection";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

export default function PricingPage() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const pricingCars = CARS.filter((c) => c.status !== "draft").slice(0, 6);

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
    <AdditionalServicesSection />
    </div>
  );
}
