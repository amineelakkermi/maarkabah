"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Banknote, CalendarDays, Check, Clock, Pencil, Plus, Trash2, Scale, type LucideIcon } from "lucide-react";
import { CARS } from "@/lib/data";
import { useAdmin } from "@/contexts/AdminContext";
import { Button, Badge, Table, Th, Td, Tabs, Input, Modal, IconButton } from "@/components/ui";
import AdditionalServicesSection from "@/components/shared/additional-services/AdditionalServicesSection";
import RentPoliciesSection from "@/components/shared/rent-policies/RentPoliciesSection";
import CancellationPoliciesSection from "@/components/shared/cancellation-policies/CancellationPoliciesSection";
import { pricingService } from "@/lib/api-services";
import type { DisputePolicyTerm } from "@/lib/api-types";

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
type DiscountItem = { id: number; nameEn: string; nameAr: string; pct: number; sortOrder: number; isActive: boolean };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDiscount(item: any): DiscountItem {
  return {
    id: Number(item.id),
    nameEn: String(item.nameEn ?? ""),
    nameAr: String(item.nameAr ?? ""),
    pct: Number(item.percent ?? item.pct ?? 0),
    sortOrder: Number(item.sortOrder ?? 0),
    isActive: item.isActive !== false,
  };
}

// ── Late-return penalty card — GET/PUT /pricing/late-return-penalty ────────────
function LateReturnPenaltyCard({ ar }: { ar: boolean }) {
  const [penalty, setPenalty] = useState({ graceHours: 1, perHourDivisor: 8, fullDayThresholdHours: 4 });
  const [draft, setDraft] = useState(penalty);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    pricingService.getLateReturnPenalty()
      .then((p) => {
        if (cancelled) return;
        const d = p?.data ?? p;
        if (d && typeof d === "object") {
          setPenalty({
            graceHours: Number(d.graceHours ?? 1),
            perHourDivisor: Number(d.perHourDivisor ?? 8),
            fullDayThresholdHours: Number(d.fullDayThresholdHours ?? 4),
          });
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const startEdit = () => { setDraft(penalty); setEditing(true); setError(""); };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await pricingService.updateLateReturnPenalty(draft);
      setPenalty(draft);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title={T("Late-return penalty", "غرامة التأخر في الإرجاع", ar)}
      action={!editing && <Button variant="ghost" size="sm" onClick={startEdit}><Pencil size={12} />{T("Edit", "تعديل", ar)}</Button>}
    >
      {!editing ? (
        <div className="flex flex-col gap-3 mk-caption normal-case tracking-normal text-mk-ink-600">
          <PolicyRow icon={Clock} tone="blue"><b>{T(`${penalty.graceHours}h grace`, `${penalty.graceHours} ساعة سماح`, ar)}</b> — {T("no charge", "بدون رسوم", ar)}</PolicyRow>
          <PolicyRow icon={Banknote} tone="warning"><b>{T(`Daily rate ÷ ${penalty.perHourDivisor}`, `السعر اليومي ÷ ${penalty.perHourDivisor}`, ar)}</b> {T("per hour after grace", "لكل ساعة بعد السماح", ar)}</PolicyRow>
          <PolicyRow icon={CalendarDays} tone="violet"><b>{T(`${penalty.fullDayThresholdHours}h or more`, `${penalty.fullDayThresholdHours} ساعات أو أكثر`, ar)}</b> = {T("full extra day", "يوم كامل إضافي", ar)}</PolicyRow>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Input label={T("Grace hours", "ساعات السماح", ar)} variant="muted" type="number" min={0} value={draft.graceHours} onChange={(e) => setDraft({ ...draft, graceHours: Math.max(0, Number(e.target.value) || 0) })} />
          <Input label={T("Per-hour divisor (daily ÷ N)", "مقسوم الساعة (اليومي ÷ N)", ar)} variant="muted" type="number" min={1} value={draft.perHourDivisor} onChange={(e) => setDraft({ ...draft, perHourDivisor: Math.max(1, Number(e.target.value) || 1) })} />
          <Input label={T("Full-day threshold (hours)", "حد اليوم الكامل (ساعات)", ar)} variant="muted" type="number" min={1} value={draft.fullDayThresholdHours} onChange={(e) => setDraft({ ...draft, fullDayThresholdHours: Math.max(1, Number(e.target.value) || 1) })} />
          {error && <p className="mk-label text-mk-danger-700 px-4 py-3 rounded-lg bg-mk-danger-100">{error}</p>}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" disabled={saving} onClick={() => setEditing(false)}>{T("Cancel", "إلغاء", ar)}</Button>
            <Button variant="primary" size="sm" className="flex-1" disabled={saving} onClick={save}><Check size={13} />{saving ? T("Saving…", "جارٍ الحفظ…", ar) : T("Save", "حفظ", ar)}</Button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ── Dispute policy card — GET/PUT /pricing/dispute-policy ──────────────────────
function DisputePolicyCard({ ar }: { ar: boolean }) {
  const [windowHours, setWindowHours] = useState(72);
  const [terms, setTerms] = useState<DisputePolicyTerm[]>([]);
  const [draftWindow, setDraftWindow] = useState(72);
  const [draftTerms, setDraftTerms] = useState<DisputePolicyTerm[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    pricingService.getDisputePolicy()
      .then((p) => {
        if (cancelled) return;
        const d = p?.data ?? p;
        if (d && typeof d === "object") {
          setWindowHours(Number(d.disputeWindowHours ?? 72));
          setTerms(Array.isArray(d.terms) ? d.terms : []);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const startEdit = () => { setDraftWindow(windowHours); setDraftTerms(terms.map((t) => ({ ...t }))); setEditing(true); setError(""); };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = { disputeWindowHours: draftWindow, terms: draftTerms.filter((t) => (t.textEn ?? "").trim() || (t.textAr ?? "").trim()) };
      await pricingService.updateDisputePolicy(payload);
      setWindowHours(payload.disputeWindowHours);
      setTerms(payload.terms);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setSaving(false);
    }
  };

  const setTerm = (i: number, patch: Partial<DisputePolicyTerm>) =>
    setDraftTerms((cur) => cur.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));

  return (
    <SectionCard
      title={T("Dispute policy", "سياسة النزاعات", ar)}
      action={!editing && <Button variant="ghost" size="sm" onClick={startEdit}><Pencil size={12} />{T("Edit", "تعديل", ar)}</Button>}
    >
      {!editing ? (
        <div className="flex flex-col gap-3 mk-caption normal-case tracking-normal text-mk-ink-600">
          <PolicyRow icon={Scale} tone="violet"><b>{T(`${windowHours}h window`, `مهلة ${windowHours} ساعة`, ar)}</b> — {T("to open a dispute after return", "لفتح نزاع بعد الإرجاع", ar)}</PolicyRow>
          {terms.map((t, i) => (
            <PolicyRow key={i} icon={Check} tone="blue">{ar ? (t.textAr ?? t.textEn) : (t.textEn ?? t.textAr)}</PolicyRow>
          ))}
          {terms.length === 0 && (
            <div className="mk-caption text-mk-ink-400">{T("No terms configured", "لا توجد شروط", ar)}</div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Input label={T("Dispute window (hours)", "مهلة النزاع (ساعات)", ar)} variant="muted" type="number" min={0} value={draftWindow} onChange={(e) => setDraftWindow(Math.max(0, Number(e.target.value) || 0))} />
          <div className="mk-overline uppercase text-mk-ink-400">{T("Terms", "الشروط", ar)}</div>
          {draftTerms.map((t, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex-1 flex flex-col gap-2">
                <Input placeholder={T("English text", "النص بالإنجليزية", ar)} variant="muted" value={t.textEn ?? ""} onChange={(e) => setTerm(i, { textEn: e.target.value })} />
                <Input placeholder={T("Arabic text", "النص بالعربية", ar)} variant="muted" value={t.textAr ?? ""} onChange={(e) => setTerm(i, { textAr: e.target.value })} />
              </div>
              <IconButton size="sm" variant="ghost" className="text-mk-danger mt-1" aria-label={T("Remove term", "حذف الشرط", ar)} onClick={() => setDraftTerms((cur) => cur.filter((_, idx) => idx !== i))}><Trash2 size={13} /></IconButton>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setDraftTerms((cur) => [...cur, { textEn: "", textAr: "" }])}><Plus size={13} />{T("Add term", "إضافة شرط", ar)}</Button>
          {error && <p className="mk-label text-mk-danger-700 px-4 py-3 rounded-lg bg-mk-danger-100">{error}</p>}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" disabled={saving} onClick={() => setEditing(false)}>{T("Cancel", "إلغاء", ar)}</Button>
            <Button variant="primary" size="sm" className="flex-1" disabled={saving} onClick={save}><Check size={13} />{saving ? T("Saving…", "جارٍ الحفظ…", ar) : T("Save", "حفظ", ar)}</Button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

export default function PricingPage() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const pricingCars = CARS.filter((c) => c.status !== "draft").slice(0, 6);
  const [activeTab, setActiveTab] = useState<PricingTab>("policies");
  const [discounts, setDiscounts] = useState<DiscountItem[]>([]);
  const [discountsLoading, setDiscountsLoading] = useState(true);
  const [discountsError, setDiscountsError] = useState("");
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<DiscountItem | null>(null);
  const [discountForm, setDiscountForm] = useState({ nameEn: "", nameAr: "", pct: 0 });
  const [discountSaving, setDiscountSaving] = useState(false);

  const loadDiscounts = () => {
    setDiscountsLoading(true);
    pricingService.searchDiscountRates({ pageNumber: 1, pageSize: 50 })
      .then((res) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items: any[] = res?.items ?? res?.data?.items ?? res?.data ?? [];
        setDiscounts((Array.isArray(items) ? items : []).map(mapDiscount));
      })
      .catch(() => setDiscounts([]))
      .finally(() => setDiscountsLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(loadDiscounts, 0);
    return () => clearTimeout(t);
  }, []);

  function openAddDiscount() {
    setEditingDiscount(null);
    setDiscountForm({ nameEn: "", nameAr: "", pct: 0 });
    setDiscountsError("");
    setDiscountModalOpen(true);
  }

  function openEditDiscount(discount: DiscountItem) {
    setEditingDiscount(discount);
    setDiscountForm({ nameEn: discount.nameEn, nameAr: discount.nameAr, pct: discount.pct });
    setDiscountsError("");
    setDiscountModalOpen(true);
  }

  async function handleSaveDiscount() {
    setDiscountSaving(true);
    setDiscountsError("");
    try {
      if (editingDiscount) {
        await pricingService.updateDiscountRate(editingDiscount.id, {
          nameEn: discountForm.nameEn,
          nameAr: discountForm.nameAr,
          percent: discountForm.pct,
          sortOrder: editingDiscount.sortOrder,
          isActive: editingDiscount.isActive,
        });
      } else {
        await pricingService.createDiscountRate({
          nameEn: discountForm.nameEn,
          nameAr: discountForm.nameAr,
          percent: discountForm.pct,
          sortOrder: discounts.length + 1,
          isActive: true,
        });
      }
      setDiscountModalOpen(false);
      loadDiscounts();
    } catch (err) {
      setDiscountsError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setDiscountSaving(false);
    }
  }

  async function handleDeleteDiscount(id: number) {
    try {
      await pricingService.deleteDiscountRate(id);
      loadDiscounts();
    } catch (err) {
      setDiscountsError(err instanceof Error ? err.message : "Unexpected error");
    }
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

          {/* Late return rules — live settings (GET/PUT /pricing/late-return-penalty) */}
          <LateReturnPenaltyCard ar={ar} />

          {/* Dispute policy — live settings (GET/PUT /pricing/dispute-policy) */}
          <DisputePolicyCard ar={ar} />
          </div>
        </div>
      )}

      {activeTab === "discounts" && (
        <SectionCard title={T("Discount rules", "قواعد الخصومات", ar)} action={<Button variant="outline" size="sm" onClick={openAddDiscount}><Plus size={16} />{T("Add discount", "إضافة خصم", ar)}</Button>}>
          {discountsError && !discountModalOpen && (
            <p className="mk-label text-mk-danger-700 px-4 py-3 rounded-lg bg-mk-danger-100 mb-3">{discountsError}</p>
          )}
          {discountsLoading ? (
            <div className="py-10 text-center mk-body-sm text-mk-ink-500">{T("Loading…", "جارٍ التحميل…", ar)}</div>
          ) : discounts.length === 0 ? (
            <div className="py-10 text-center mk-body-sm text-mk-ink-500">{T("No discount rules yet", "لا توجد قواعد خصم بعد", ar)}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {discounts.map((discount) => (
                <div key={discount.id} className="flex items-center justify-between gap-3 px-3 py-3 rounded-md bg-mk-ink-50">
                  <span className="mk-label text-mk-ink-900">{ar ? discount.nameAr : discount.nameEn}</span>
                  <div className="flex items-center gap-1">
                    <span className="mk-label text-mk-blue-500">{discount.pct}%</span>
                    <IconButton size="sm" variant="ghost" aria-label={T("Edit discount", "تعديل الخصم", ar)} onClick={() => openEditDiscount(discount)}><Pencil size={13} /></IconButton>
                    <IconButton size="sm" variant="ghost" className="text-mk-danger hover:text-mk-danger" aria-label={T("Delete discount", "حذف الخصم", ar)} onClick={() => handleDeleteDiscount(discount.id)}><Trash2 size={13} /></IconButton>
                  </div>
                </div>
              ))}
            </div>
          )}
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
          {discountsError && (
            <p className="mk-label text-mk-danger-700 px-4 py-3 rounded-lg bg-mk-danger-100 mb-4">{discountsError}</p>
          )}
          <div className="flex gap-3">
            <Button variant="outline" disabled={discountSaving} onClick={() => setDiscountModalOpen(false)} className="flex-1 justify-center">{T("Cancel", "إلغاء", ar)}</Button>
            <Button variant="primary" disabled={!discountForm.nameAr || !discountForm.nameEn || discountSaving} onClick={handleSaveDiscount} className="flex-1 justify-center"><Check size={13} />{discountSaving ? T("Saving…", "جارٍ الحفظ…", ar) : editingDiscount ? T("Save changes", "حفظ التعديلات", ar) : T("Add discount", "إضافة خصم", ar)}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
