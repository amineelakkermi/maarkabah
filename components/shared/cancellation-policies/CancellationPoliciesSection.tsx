"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Drawer, DrawerFooter, DrawerHeader, IconButton, Input, Toggle, useToast } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { cancellationPolicyService } from "@/lib/api-services";
import * as Types from "@/lib/api-types";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

// Same three-step ladder the old static card showed, as the starting point
// for a new policy so the form never opens empty.
const DEFAULT_TIERS: Types.CancellationPolicyTier[] = [
  { hoursBeforeStart: 24, refundPercent: 100 },
  { hoursBeforeStart: 2, refundPercent: 50 },
  { hoursBeforeStart: 0, refundPercent: 0 },
];

const emptyForm = (): Types.SaveCancellationPolicyRequest => ({
  nameAr: "",
  nameEn: "",
  descriptionAr: "",
  descriptionEn: "",
  sortOrder: 0,
  isActive: true,
  tiers: DEFAULT_TIERS.map((t) => ({ ...t })),
});

// Tiers are a descending ladder: read them from the most generous window
// down to "no refund" so the card reads top-to-bottom like the old mock.
function sortTiers(tiers: Types.CancellationPolicyTier[] = []) {
  return [...tiers].sort((a, b) => b.hoursBeforeStart - a.hoursBeforeStart);
}

function refundTone(pct: number) {
  if (pct >= 100) return "text-mk-mint-600";
  if (pct > 0) return "text-mk-warning";
  return "text-mk-danger";
}

function tierWindowLabel(tier: Types.CancellationPolicyTier, next: Types.CancellationPolicyTier | undefined, ar: boolean) {
  const h = tier.hoursBeforeStart;
  if (h <= 0) return next === undefined && ar ? "أقل من الحد الأدنى" : T("After the last window", "بعد آخر مهلة", ar);
  return T(`${h}h+ before pickup`, `قبل ${h} ساعة أو أكثر من التسليم`, ar);
}

function refundLabel(pct: number, ar: boolean) {
  if (pct <= 0) return T("No refund", "لا استرداد", ar);
  return `${pct}%`;
}

export default function CancellationPoliciesSection() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const { showToast } = useToast();
  const [policies, setPolicies] = useState<Types.CancellationPolicyDto[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPolicyId, setLoadingPolicyId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Types.CancellationPolicyDto | null>(null);
  const [form, setForm] = useState<Types.SaveCancellationPolicyRequest>(emptyForm());

  async function loadPolicies() {
    try {
      setLoading(true);
      const response = await cancellationPolicyService.search({ search: "", isActive: null, pageNumber: 1, pageSize: 200 });
      const items = response?.items ?? response?.data?.items ?? response?.data ?? response ?? [];
      setPolicies(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error("Error loading cancellation policies:", error);
      showToast(T("Failed to load cancellation policies", "فشل تحميل سياسات الإلغاء", ar), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadPolicies(); }, []);

  function openAdd() {
    setEditingPolicy(null);
    setForm(emptyForm());
    setDrawerOpen(true);
  }

  async function loadPolicyDetails(policy: Types.CancellationPolicyDto) {
    if (policy.tiers?.length) return policy;
    const response = await cancellationPolicyService.getById(policy.id);
    const details = response?.data ?? response;
    const loadedPolicy = { ...policy, ...details } as Types.CancellationPolicyDto;
    setPolicies((current) => current.map((item) => item.id === policy.id ? loadedPolicy : item));
    return loadedPolicy;
  }

  async function togglePolicy(policy: Types.CancellationPolicyDto) {
    if (expanded === policy.id) {
      setExpanded(null);
      return;
    }
    setExpanded(policy.id);
    if (policy.tiers?.length) return;
    try {
      setLoadingPolicyId(policy.id);
      await loadPolicyDetails(policy);
    } catch (error) {
      showToast(error instanceof Error ? error.message : T("Failed to load cancellation policy", "فشل تحميل سياسة الإلغاء", ar), "error");
    } finally {
      setLoadingPolicyId(null);
    }
  }

  async function openEdit(policy: Types.CancellationPolicyDto) {
    try {
      setLoadingPolicyId(policy.id);
      const details = await loadPolicyDetails(policy);
      setEditingPolicy(details);
      setForm({
        nameAr: details.nameAr ?? "",
        nameEn: details.nameEn ?? "",
        descriptionAr: details.descriptionAr ?? "",
        descriptionEn: details.descriptionEn ?? "",
        sortOrder: details.sortOrder ?? 0,
        isActive: details.isActive !== false,
        tiers: details.tiers?.length ? sortTiers(details.tiers) : DEFAULT_TIERS.map((t) => ({ ...t })),
      });
      setDrawerOpen(true);
    } catch (error) {
      showToast(error instanceof Error ? error.message : T("Failed to load cancellation policy", "فشل تحميل سياسة الإلغاء", ar), "error");
    } finally {
      setLoadingPolicyId(null);
    }
  }

  function updateTier(index: number, patch: Partial<Types.CancellationPolicyTier>) {
    setForm((f) => ({ ...f, tiers: f.tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)) }));
  }

  function addTier() {
    setForm((f) => ({ ...f, tiers: [...f.tiers, { hoursBeforeStart: 0, refundPercent: 0 }] }));
  }

  function removeTier(index: number) {
    setForm((f) => ({ ...f, tiers: f.tiers.filter((_, i) => i !== index) }));
  }

  const formValid = form.nameAr.trim() && form.nameEn.trim() && form.tiers.length > 0;

  async function savePolicy() {
    try {
      setSaving(true);
      const payload: Types.SaveCancellationPolicyRequest = {
        ...form,
        descriptionAr: form.descriptionAr?.trim() || null,
        descriptionEn: form.descriptionEn?.trim() || null,
        tiers: sortTiers(form.tiers),
      };
      if (editingPolicy) await cancellationPolicyService.update(editingPolicy.id, payload);
      else await cancellationPolicyService.create(payload);
      showToast(editingPolicy ? T("Cancellation policy updated", "تم تحديث سياسة الإلغاء", ar) : T("Cancellation policy created", "تم إنشاء سياسة الإلغاء", ar));
      setDrawerOpen(false);
      await loadPolicies();
    } catch (error) {
      console.error("Error saving cancellation policy:", error);
      showToast(error instanceof Error ? error.message : T("Failed to save cancellation policy", "فشل حفظ سياسة الإلغاء", ar), "error");
    } finally {
      setSaving(false);
    }
  }

  async function deletePolicy(policy: Types.CancellationPolicyDto) {
    if (policy.isSystem) {
      showToast(T("The default cancellation policy cannot be deleted", "لا يمكن حذف سياسة الإلغاء الافتراضية", ar), "error");
      return;
    }
    if (!confirm(T("Delete this cancellation policy?", "هل تريد حذف سياسة الإلغاء هذه؟", ar))) return;
    try {
      await cancellationPolicyService.delete(policy.id);
      showToast(T("Cancellation policy deleted", "تم حذف سياسة الإلغاء", ar));
      await loadPolicies();
    } catch (error) {
      showToast(error instanceof Error ? error.message : T("Failed to delete cancellation policy", "فشل حذف سياسة الإلغاء", ar), "error");
    }
  }

  return (
    <div className="rounded-xl overflow-hidden mk-surface">
      <div className="flex flex-wrap items-center gap-3 p-5">
        <div className="flex-1 mk-h4 text-mk-ink-900">{T("Cancellation policies", "سياسات الإلغاء", ar)}</div>
        <Button variant="outline" size="sm" onClick={openAdd}>
          <Plus size={14} />
          {T("Create policy", "إنشاء سياسة", ar)}
        </Button>
      </div>

      <div className="px-5 pb-5">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-mk-ink-500"><Loader2 size={20} className="animate-spin" />{T("Loading policies...", "جاري تحميل السياسات...", ar)}</div>
        ) : policies.length === 0 ? (
          <div className="py-10 text-center mk-body-sm text-mk-ink-500">{T("No cancellation policies found", "لا توجد سياسات إلغاء", ar)}</div>
        ) : (
          <div className="flex flex-col gap-3">
            {policies.map((policy) => {
              const open = expanded === policy.id;
              const tiers = sortTiers(policy.tiers);
              return (
                <div key={policy.id} className="rounded-lg bg-mk-ink-50 border border-mk-border overflow-hidden">
                  <div role="button" tabIndex={0} className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => void togglePolicy(policy)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") void togglePolicy(policy); }}>
                    <ChevronDown size={14} className={`text-mk-ink-400 transition-transform ${open ? "rotate-180" : ""}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="mk-label text-mk-ink-900">{ar ? policy.nameAr || policy.nameEn : policy.nameEn || policy.nameAr}</span>
                        {policy.isSystem && <Badge variant="info" size="sm">{T("Default", "افتراضية", ar)}</Badge>}
                        {policy.isActive === false && <Badge variant="neutral" size="sm">{T("Inactive", "غير مفعلة", ar)}</Badge>}
                        {/*<span className="mk-overline text-mk-ink-400">{T(`${tiers.length} tiers`, `${tiers.length} مستويات`, ar)}</span>*/}
                      </div>
                    </div>
                    <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
                      <IconButton size="sm" variant="ghost" aria-label={T("Edit", "تعديل", ar)} onClick={() => void openEdit(policy)}><Pencil size={13} /></IconButton>
                      <IconButton size="sm" variant="ghost" className="text-mk-danger" aria-label={T("Delete", "حذف", ar)} onClick={() => deletePolicy(policy)}><Trash2 size={13} /></IconButton>
                    </div>
                  </div>
                  {open && (
                    <div className="px-3 pb-3">
                      {(ar ? policy.descriptionAr || policy.descriptionEn : policy.descriptionEn || policy.descriptionAr) && (
                        <p className="mk-caption text-mk-ink-500 mb-3">{ar ? policy.descriptionAr || policy.descriptionEn : policy.descriptionEn || policy.descriptionAr}</p>
                      )}
                      <div className="flex flex-col gap-2">
                        {loadingPolicyId === policy.id ? (
                          <div className="flex items-center justify-center gap-2 py-4 text-mk-ink-500"><Loader2 size={16} className="animate-spin" />{T("Loading tiers...", "جاري تحميل المستويات...", ar)}</div>
                        ) : tiers.length === 0 ? (
                          <div className="py-4 text-center mk-caption text-mk-ink-500">{T("No refund tiers", "لا توجد مستويات استرداد", ar)}</div>
                        ) : tiers.map((tier, i) => (
                          <div key={`${tier.hoursBeforeStart}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-md bg-white">
                            <span className="mk-label text-mk-ink-900">{tierWindowLabel(tier, tiers[i + 1], ar)}</span>
                            <span className={`mk-label ${refundTone(tier.refundPercent)}`}>{refundLabel(tier.refundPercent, ar)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <div className="flex flex-col justify-between h-full w-full">
          <div className="overflow-y-auto">
            <DrawerHeader title={editingPolicy ? T("Edit cancellation policy", "تعديل سياسة الإلغاء", ar) : T("Create cancellation policy", "إنشاء سياسة إلغاء", ar)} onClose={() => setDrawerOpen(false)} className="mb-0 pb-4 border-b border-mk-border" />
            <div className="flex flex-col gap-4 mt-5">
              <Input label={T("Arabic name *", "الاسم بالعربية *", ar)} variant="muted" value={form.nameAr} onChange={(event) => setForm({ ...form, nameAr: event.target.value })} />
              <Input label={T("English name *", "الاسم بالإنجليزية *", ar)} variant="muted" value={form.nameEn} onChange={(event) => setForm({ ...form, nameEn: event.target.value })} />
              <Input label={T("Arabic description", "الوصف بالعربية", ar)} variant="muted" value={form.descriptionAr ?? ""} onChange={(event) => setForm({ ...form, descriptionAr: event.target.value })} />
              <Input label={T("English description", "الوصف بالإنجليزية", ar)} variant="muted" value={form.descriptionEn ?? ""} onChange={(event) => setForm({ ...form, descriptionEn: event.target.value })} />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="mk-body-sm text-mk-fg-1">{T("Refund tiers *", "مستويات الاسترداد *", ar)}</span>
                  <Button variant="ghost" size="sm" onClick={addTier}><Plus size={13} />{T("Add tier", "إضافة مستوى", ar)}</Button>
                </div>
                <div className="flex flex-col gap-2">
                  {form.tiers.map((tier, index) => (
                    <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end p-3 rounded-md bg-mk-ink-50">
                      <Input
                        label={T("Hours before start", "ساعات قبل البداية", ar)}
                        variant="default"
                        type="number"
                        min={0}
                        className="font-mono"
                        value={tier.hoursBeforeStart}
                        onChange={(event) => updateTier(index, { hoursBeforeStart: Math.max(0, Number(event.target.value) || 0) })}
                      />
                      <Input
                        label={T("Refund %", "نسبة الاسترداد %", ar)}
                        variant="default"
                        type="number"
                        min={0}
                        max={100}
                        className="font-mono"
                        value={tier.refundPercent}
                        onChange={(event) => updateTier(index, { refundPercent: Math.min(100, Math.max(0, Number(event.target.value) || 0)) })}
                      />
                      <IconButton size="sm" variant="ghost" className="text-mk-danger mb-1 disabled:opacity-40 disabled:cursor-not-allowed" aria-label={T("Remove tier", "حذف المستوى", ar)} disabled={form.tiers.length <= 1} onClick={() => removeTier(index)}><Trash2 size={13} /></IconButton>
                    </div>
                  ))}
                </div>
                <p className="mk-caption text-mk-ink-500 mt-2">{T("Tiers are applied from the largest window down; use 0 hours for the final \"no refund\" step.", "تُطبَّق المستويات من أكبر مهلة إلى أصغرها؛ استخدم 0 ساعة للمستوى الأخير \"بدون استرداد\".", ar)}</p>
              </div>

              <Input label={T("Sort order", "ترتيب العرض", ar)} variant="muted" type="number" min={0} value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: Math.max(0, Number(event.target.value) || 0) })} />
              <div className="flex items-center justify-between px-3 py-3 rounded-input bg-mk-ink-50"><span className="mk-body-sm text-mk-ink-700">{T("Active", "مفعلة", ar)}</span><Toggle checked={form.isActive} onChange={(value) => setForm({ ...form, isActive: value })} /></div>
            </div>
          </div>
          <DrawerFooter className="mt-4 pt-4 border-t border-mk-border justify-stretch"><Button variant="outline" onClick={() => setDrawerOpen(false)}>{T("Cancel", "إلغاء", ar)}</Button><Button variant="primary" className="flex-1" disabled={!formValid || saving} onClick={savePolicy}>{saving && <Loader2 size={14} className="animate-spin" />}{editingPolicy ? T("Save changes", "حفظ التعديلات", ar) : T("Create policy", "إنشاء السياسة", ar)}</Button></DrawerFooter>
        </div>
      </Drawer>
    </div>
  );
}
