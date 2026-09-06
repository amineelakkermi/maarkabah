"use client";

import { useState, type ReactNode } from "react";
import { Banknote, CalendarDays, Check, Clock, Pencil, Plus, Trash2, type LucideIcon } from "lucide-react";
import { CARS } from "@/lib/data";
import { useAdmin } from "@/contexts/AdminContext";
import { Button, Badge, Table, Th, Td, Tabs, Input, Modal, IconButton } from "@/components/ui";
import AdditionalServicesSection from "@/components/shared/additional-services/AdditionalServicesSection";
import RentPoliciesSection from "@/components/shared/rent-policies/RentPoliciesSection";
import CancellationPoliciesSection from "@/components/shared/cancellation-policies/CancellationPoliciesSection";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

const TONAL_TOKENS = {
  blue: { bg: "bg-mk-blue-50", fg: "text-mk-blue-500" },
  violet: { bg: "bg-mk-violet-100", fg: "text-mk-violet-500" },
  warning: { bg: "bg-mk-warning-100", fg: "text-mk-warning" },
} as const;

function SectionCard({ title, action, children }: { title: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden mk-surface">
      <div className="flex items-center gap-3 p-5">
        <div className="flex-1 mk-h4 text-mk-ink-900">{title}</div>
        {action}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}

function TonalIcon({ icon: Icon, tone = "blue" }: { icon: LucideIcon; tone?: keyof typeof TONAL_TOKENS }) {
  const colors = TONAL_TOKENS[tone];
  return (
    <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${colors.bg}`}>
      <Icon size={14} className={colors.fg} />
    </div>
  );
}

function PolicyRow({ icon, tone, children }: { icon: LucideIcon; tone?: keyof typeof TONAL_TOKENS; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <TonalIcon icon={icon} tone={tone} />
      <div>{children}</div>
    </div>
  );
}

type PricingTab = "vehicles" | "policies" | "discounts" | "addons";
type DiscountItem = { k: string; nameEn: string; nameAr: string; pct: number };

export default function PricingPage() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const pricingCars = CARS.filter((c) => c.status !== "draft").slice(0, 6);
  const [activeTab, setActiveTab] = useState<PricingTab>("policies");
  const [discounts, setDiscounts] = useState<DiscountItem[]>([
    { k: "weekly", nameEn: "Weekly rental (7+ days)", nameAr: "حجز أسبوعي (٧+ أيام)", pct: 10 },
    { k: "monthly", nameEn: "Monthly rental (30+ days)", nameAr: "حجز شهري (٣٠+ يوم)", pct: 20 },
    { k: "full-prepay", nameEn: "Full advance payment", nameAr: "الدفع المقدّم بالكامل", pct: 5 },
  ]);
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<DiscountItem | null>(null);
  const [discountForm, setDiscountForm] = useState({ nameEn: "", nameAr: "", pct: 0 });

  function openAddDiscount() {
    setEditingDiscount(null);
    setDiscountForm({ nameEn: "", nameAr: "", pct: 0 });
    setDiscountModalOpen(true);
  }

  function openEditDiscount(discount: DiscountItem) {
    setEditingDiscount(discount);
    setDiscountForm({ nameEn: discount.nameEn, nameAr: discount.nameAr, pct: discount.pct });
    setDiscountModalOpen(true);
  }

  function handleSaveDiscount() {
    if (editingDiscount) {
      setDiscounts((current) => current.map((discount) => discount.k === editingDiscount.k ? { ...discount, ...discountForm } : discount));
    } else {
      setDiscounts((current) => [...current, { k: `discount-${Date.now()}`, ...discountForm }]);
    }
    setDiscountModalOpen(false);
  }

  function handleDeleteDiscount(key: string) {
    setDiscounts((current) => current.filter((discount) => discount.k !== key));
  }

  return (
    <div className="flex flex-col gap-4">
      <Tabs
        variant="default"
        rounded="full"
        className="w-fit mk-view-toggle--reversed"
        value={activeTab}
        onChange={(value) => setActiveTab(value as PricingTab)}
        items={[
          { value: "policies", label: T("Policies", "السياسات", ar) },
          { value: "discounts", label: T("Discounts", "الخصومات", ar), count: discounts.length },
          { value: "addons", label: T("Add-on services", "الخدمات الإضافية", ar) },
          { value: "vehicles", label: T("Vehicle pricing", "أسعار المركبات", ar), count: pricingCars.length },
        ]}
      />

      {activeTab === "vehicles" && (
        <SectionCard title={T("Per-car pricing", "الأسعار لكل مركبة", ar)} action={<Button variant="outline" size="sm">{T("Bulk edit", "تعديل جماعي", ar)}</Button>}>
          {/* Per-car pricing table */}
          <div className="rounded-xl overflow-hidden border border-mk-border">
            <Table>
              <thead>
                <tr>
                  {[T("Car", "المركبة", ar), T("Daily rate", "السعر اليومي", ar), T("KM cap", "حد الكيلومترات", ar), T("Overage", "التجاوز", ar), T("Deposit", "التأمين", ar)].map((heading) => <Th key={heading}>{heading}</Th>)}
                </tr>
              </thead>
              <tbody>
                {pricingCars.map((car) => (
                  <tr key={car.plate} className="cursor-pointer transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50">
                    <Td>
                      <div className="mk-label text-mk-ink-900">{car.make} {car.model}</div>
                      <div className="font-mono mk-overline mt-1 text-mk-ink-500">{car.plate}</div>
                    </Td>
                    <Td><span className="mk-body-sm text-mk-ink-900">{car.dailyRate}</span><span className="mk-caption ms-1 text-mk-ink-500 normal-case tracking-normal">{T("SAR", "ريال", ar)}</span></Td>
                    <Td>{car.kmCap === "Unlimited" ? <Badge variant="neutral" className="normal-case tracking-normal">{T("Unlimited", "غير محدود", ar)}</Badge> : <span className="mk-label text-mk-ink-700">{car.kmCap} {T("km", "كم", ar)}</span>}</Td>
                    <Td className="mk-label text-mk-ink-700">{T("2 SAR/km", "٢ ريال/كم", ar)}</Td>
                    <Td className="mk-label text-mk-ink-700">{T("1,500 SAR", "١٬٥٠٠ ريال", ar)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </SectionCard>
      )}

      {activeTab === "policies" && (
        <div className="flex flex-col gap-4">
          <RentPoliciesSection />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* Cancellation policies — live catalog (POST /cancellation-policies) */}
          <CancellationPoliciesSection />

          {/* Late return rules */}
          <SectionCard title={T("Late-return penalty", "غرامة التأخر في الإرجاع", ar)}>
            <div className="flex flex-col gap-3 mk-caption normal-case tracking-normal text-mk-ink-600">
              <PolicyRow icon={Clock} tone="blue"><b>{T("1h grace", "ساعة سماح", ar)}</b> — {T("no charge", "بدون رسوم", ar)}</PolicyRow>
              <PolicyRow icon={Banknote} tone="warning"><b>{T("Daily rate ÷ 8", "السعر اليومي ÷ ٨", ar)}</b> {T("per hour after grace", "لكل ساعة بعد السماح", ar)}</PolicyRow>
              <PolicyRow icon={CalendarDays} tone="violet"><b>{T("4h or more", "٤ ساعات أو أكثر", ar)}</b> = {T("full extra day", "يوم كامل إضافي", ar)}</PolicyRow>
            </div>
          </SectionCard>
          </div>
        </div>
      )}

      {activeTab === "discounts" && (
        <SectionCard title={T("Discount rules", "قواعد الخصومات", ar)} action={<Button variant="outline" size="sm" onClick={openAddDiscount}><Plus size={16} />{T("Add discount", "إضافة خصم", ar)}</Button>}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {discounts.map((discount) => (
              <div key={discount.k} className="flex items-center justify-between gap-3 px-3 py-3 rounded-md bg-mk-ink-50">
                <span className="mk-label text-mk-ink-900">{ar ? discount.nameAr : discount.nameEn}</span>
                <div className="flex items-center gap-1">
                  <span className="mk-label text-mk-blue-500">%{discount.pct}</span>
                  <IconButton size="sm" variant="ghost" aria-label={T("Edit discount", "تعديل الخصم", ar)} onClick={() => openEditDiscount(discount)}><Pencil size={13} /></IconButton>
                  <IconButton size="sm" variant="ghost" className="text-mk-danger hover:text-mk-danger" aria-label={T("Delete discount", "حذف الخصم", ar)} onClick={() => handleDeleteDiscount(discount.k)}><Trash2 size={13} /></IconButton>
                </div>
              </div>
            ))}
          </div>
          <p className="mk-caption text-mk-ink-500 mt-4">{T("Discount changes are temporary until the backend endpoints are connected.", "تغييرات الخصومات مؤقتة حتى يتم ربط واجهات الخادم.", ar)}</p>
        </SectionCard>
      )}

      {/* Add-on services pricing table */}
      {activeTab === "addons" && <AdditionalServicesSection />}

      <Modal open={discountModalOpen} onClose={() => setDiscountModalOpen(false)} variant="centered" size="sm" title={editingDiscount ? T("Edit discount", "تعديل الخصم", ar) : T("Add discount", "إضافة خصم", ar)}>
        <div className="p-5">
          <div className="flex flex-col gap-4 mb-5">
            <Input label={T("Arabic name", "الاسم بالعربية", ar)} variant="muted" value={discountForm.nameAr} onChange={(event) => setDiscountForm({ ...discountForm, nameAr: event.target.value })} />
            <Input label={T("English name", "الاسم بالإنجليزية", ar)} variant="muted" value={discountForm.nameEn} onChange={(event) => setDiscountForm({ ...discountForm, nameEn: event.target.value })} />
            <Input label={T("Percentage", "النسبة", ar)} variant="muted" type="number" min={0} max={100} value={discountForm.pct} onChange={(event) => setDiscountForm({ ...discountForm, pct: Math.min(100, Math.max(0, Number(event.target.value) || 0)) })} />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setDiscountModalOpen(false)} className="flex-1 justify-center">{T("Cancel", "إلغاء", ar)}</Button>
            <Button variant="primary" disabled={!discountForm.nameAr || !discountForm.nameEn} onClick={handleSaveDiscount} className="flex-1 justify-center"><Check size={13} />{editingDiscount ? T("Save changes", "حفظ التعديلات", ar) : T("Add discount", "إضافة خصم", ar)}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
