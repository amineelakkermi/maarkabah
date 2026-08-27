"use client";


import { useEffect, useState } from "react";
import { ChevronDown, Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Badge, Button, Drawer, DrawerFooter, DrawerHeader, IconButton, Input, Select, Toggle, useToast } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { lookupService, rentPolicyService } from "@/lib/api-services";
import * as Types from "@/lib/api-types";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

type EnumOption = { value: number; nameAr: string; nameEn: string };
type PolicyField = "extensionPolicy" | "earlyReturnPolicy" | "accidentReportPolicy" | "fuelReturnPolicy" | "breakdownReportPolicy";



const FALLBACK_OPTIONS: Record<PolicyField, EnumOption[]> = {
  extensionPolicy: [
    { value: 1, nameAr: "تجديد تلقائي", nameEn: "Automatic renewal" },
    { value: 2, nameAr: "يتطلب موافقة المكتب", nameEn: "Office approval required" },
    { value: 3, nameAr: "لا يسمح بالتمديد", nameEn: "Extension not allowed" },
  ],
  earlyReturnPolicy: [
    { value: 1, nameAr: "بدون استرداد عن الأيام المتبقية", nameEn: "No refund for remaining days" },
    { value: 2, nameAr: "استرداد جزئي عن الأيام المتبقية", nameEn: "Partial refund for remaining days" },
    { value: 3, nameAr: "استرداد كامل عن الأيام المتبقية", nameEn: "Full refund for remaining days" },
  ],
  accidentReportPolicy: [
    { value: 1, nameAr: "يتطلب محضر شرطة فوري", nameEn: "Immediate police report required" },
    { value: 2, nameAr: "إبلاغ المكتب خلال 24 ساعة", nameEn: "Notify the office within 24 hours" },
  ],
  fuelReturnPolicy: [
    { value: 1, nameAr: "إعادة بنفس مستوى الإستلام", nameEn: "Return at the same pickup level" },
    { value: 2, nameAr: "إعادة بخزان ممتلئ", nameEn: "Return with a full tank" },
    { value: 3, nameAr: "وقود مسبق الدفع، إرجاع فارغ", nameEn: "Prepaid fuel, return empty" },
  ],
  breakdownReportPolicy: [
    { value: 1, nameAr: "الاتصال بالمكتب فوراً", nameEn: "Contact the office immediately" },
    { value: 2, nameAr: "الاتصال بخدمة المساعدة على الطريق", nameEn: "Contact roadside assistance" },
  ],
};

const POLICY_FIELDS: { key: PolicyField; labelEn: string; labelAr: string; lookupKey: string }[] = [
  { key: "extensionPolicy", labelEn: "Contract extension", labelAr: "تمديد العقد", lookupKey: "extensionPolicies" },
  { key: "earlyReturnPolicy", labelEn: "Early return", labelAr: "التسليم قبل الموعد", lookupKey: "earlyReturnPolicies" },
  { key: "accidentReportPolicy", labelEn: "Accident reporting", labelAr: "الإبلاغ عن الحوادث", lookupKey: "accidentReportPolicies" },
  { key: "fuelReturnPolicy", labelEn: "Fuel return", labelAr: "إعادة الوقود", lookupKey: "fuelReturnPolicies" },
  { key: "breakdownReportPolicy", labelEn: "Breakdown reporting", labelAr: "الإبلاغ عن الأعطال", lookupKey: "breakdownReportPolicies" },
];

const emptyForm = (): Types.SaveRentPolicyRequest => ({
  nameAr: "",
  nameEn: "",
  descriptionAr: "",
  descriptionEn: "",
  extensionPolicy: 1,
  earlyReturnPolicy: 1,
  accidentReportPolicy: 1,
  fuelReturnPolicy: 1,
  breakdownReportPolicy: 1,
  sortOrder: 0,
  isActive: true,
});

function normalizeOptions(value: any, labels: EnumOption[]): EnumOption[] {
  if (!Array.isArray(value)) return [];
  return value.map((option) => {
    const optionValue = Number(option.value ?? option.id ?? option.code ?? option);
    const label = labels.find((item) => item.value === optionValue);
    return {
      value: optionValue,
      nameAr: label?.nameAr ?? option.nameAr ?? option.labelAr ?? option.ar ?? option.name ?? String(optionValue),
      nameEn: label?.nameEn ?? option.nameEn ?? option.labelEn ?? option.en ?? option.name ?? String(optionValue),
    };
  }).filter((option) => Number.isFinite(option.value));
}

export default function RentPoliciesSection() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const { showToast } = useToast();
  const [policies, setPolicies] = useState<Types.RentPolicyDto[]>([]);
  const [options, setOptions] = useState<Record<string, EnumOption[]>>({});
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Types.RentPolicyDto | null>(null);
  const [form, setForm] =
  useState<Types.SaveRentPolicyRequest>(emptyForm());

  async function loadPolicies() {
    try {
      setLoading(true);
      const response = await rentPolicyService.search({ search: "", pageNumber: 1, pageSize: 200 });
      const items = response?.items ?? response?.data?.items ?? response?.data ?? response ?? [];
      setPolicies(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error("Error loading rent policies:", error);
      showToast(T("Failed to load rent policies", "فشل تحميل سياسات التأجير", ar), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPolicies();
    lookupService.getContext({ sections: ["RentPolicyEnums"], })
      .then((response: any) => {
        const root = response?.rentPolicyEnums ?? response?.data?.rentPolicyEnums ?? response?.data ?? response ?? {};
        setOptions(Object.fromEntries(POLICY_FIELDS.map((field) => [field.lookupKey, normalizeOptions(root[field.lookupKey], FALLBACK_OPTIONS[field.key])])));
      })
      .catch((error) => console.error("Error loading rent policy enums:", error));
  }, []);

  function getOptions(field: typeof POLICY_FIELDS[number]) {
    return options[field.lookupKey]?.length ? options[field.lookupKey] : FALLBACK_OPTIONS[field.key];
  }

  function optionLabel(field: typeof POLICY_FIELDS[number], value?: number | null) {
    if (value == null) return T("Not provided by Tajeer", "غير متوفر من تاجير", ar);
    const option = getOptions(field).find((item) => item.value === Number(value));
    return option ? (ar ? option.nameAr : option.nameEn) : String(value);
  }

  function openAdd() {
    const next = emptyForm();
    for (const field of POLICY_FIELDS) next[field.key] = getOptions(field)[0]?.value ?? 1;
    setEditingPolicy(null);
    setForm(next);
    setDrawerOpen(true);
  }

  function openEdit(policy: Types.RentPolicyDto) {
    setEditingPolicy(policy);
    const next = emptyForm();
    setForm({
      ...next,
      nameAr: policy.nameAr ?? "",
      nameEn: policy.nameEn ?? "",
      descriptionAr: policy.descriptionAr ?? "",
      descriptionEn: policy.descriptionEn ?? "",
      extensionPolicy: policy.extensionPolicy ?? getOptions(POLICY_FIELDS[0])[0]?.value ?? 1,
      earlyReturnPolicy: policy.earlyReturnPolicy ?? getOptions(POLICY_FIELDS[1])[0]?.value ?? 1,
      accidentReportPolicy: policy.accidentReportPolicy ?? getOptions(POLICY_FIELDS[2])[0]?.value ?? 1,
      fuelReturnPolicy: policy.fuelReturnPolicy ?? getOptions(POLICY_FIELDS[3])[0]?.value ?? 1,
      breakdownReportPolicy: policy.breakdownReportPolicy ?? getOptions(POLICY_FIELDS[4])[0]?.value ?? 1,
      sortOrder: policy.sortOrder ?? 0,
      isActive: policy.isActive !== false,
    });
    setDrawerOpen(true);
  }

  async function savePolicy() {
    try {
      setSaving(true);
      if (editingPolicy) await rentPolicyService.update(editingPolicy.id, form);
      else await rentPolicyService.create(form);
      showToast(editingPolicy ? T("Rent policy updated", "تم تحديث سياسة التأجير", ar) : T("Rent policy created", "تم إنشاء سياسة التأجير", ar));
      setDrawerOpen(false);
      await loadPolicies();
    } catch (error) {
      console.error("Error saving rent policy:", error);
      showToast(error instanceof Error ? error.message : T("Failed to save rent policy", "فشل حفظ سياسة التأجير", ar), "error");
    } finally {
      setSaving(false);
    }
  }

  async function deletePolicy(policy: Types.RentPolicyDto) {
    if (!confirm(T("Delete this rent policy?", "هل تريد حذف سياسة التأجير هذه؟", ar))) return;
    try {
      await rentPolicyService.delete(policy.id);
      showToast(T("Rent policy deleted", "تم حذف سياسة التأجير", ar));
      await loadPolicies();
    } catch (error) {
      showToast(error instanceof Error ? error.message : T("Failed to delete rent policy", "فشل حذف سياسة التأجير", ar), "error");
    }
  }

  async function syncPolicies() {
    try {
      setSyncing(true);
      await rentPolicyService.sync();
      showToast(T("Tajeer policies synchronized", "تمت مزامنة سياسات تاجير", ar));
      await loadPolicies();
    } catch (error) {
      showToast(error instanceof Error ? error.message : T("Tajeer synchronization failed", "فشلت مزامنة تاجير", ar), "error");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="rounded-xl overflow-hidden mk-surface">
      <div className="flex flex-wrap items-center gap-3 p-5">
        <div className="flex-1 mk-h4 text-mk-ink-900">{T("Rent policies", "سياسات التأجير", ar)}</div>
        <Button variant="outline" size="sm" onClick={syncPolicies} disabled={syncing}>
          <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
          {T("Sync Tajeer", "مزامنة تاجير", ar)}
        </Button>
        <Button variant="outline" size="sm" onClick={openAdd}>
          <Plus size={14} />
          {T("Create policy", "إنشاء سياسة", ar)}
        </Button>
      </div>

      <div className="px-5 pb-5">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-mk-ink-500"><Loader2 size={20} className="animate-spin" />{T("Loading policies...", "جاري تحميل السياسات...", ar)}</div>
        ) : policies.length === 0 ? (
          <div className="py-10 text-center mk-body-sm text-mk-ink-500">{T("No rent policies found", "لا توجد سياسات تأجير", ar)}</div>
        ) : (
          <div className="flex flex-col gap-3">
            {policies.map((policy) => {
              const isTajeer = Number(policy.source) === Types.RentPolicySource.Tajeer;
              const open = expanded === policy.id;
              return (
                <div key={policy.id} className="rounded-lg bg-mk-ink-50 border border-mk-border overflow-hidden">
                  <div role="button" tabIndex={0} className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setExpanded(open ? null : policy.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setExpanded(open ? null : policy.id); }}>
                    <ChevronDown size={14} className={`text-mk-ink-400 transition-transform ${open ? "rotate-180" : ""}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2"><span className="mk-label text-mk-ink-900">{ar ? policy.nameAr || policy.nameEn : policy.nameEn || policy.nameAr}</span><Badge variant={isTajeer ? "info" : "violet"} size="sm">{isTajeer ? T("Tajeer", "تاجير", ar) : T("Custom", "مخصصة", ar)}</Badge>{policy.isActive === false && <Badge variant="neutral" size="sm">{T("Inactive", "غير مفعلة", ar)}</Badge>}</div>
                      {policy.code && <div className="mk-overline text-mk-ink-400 mt-1">{policy.code}</div>}
                    </div>
                    {!isTajeer && <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}><IconButton size="sm" variant="ghost" aria-label={T("Edit", "تعديل", ar)} onClick={() => openEdit(policy)}><Pencil size={13} /></IconButton><IconButton size="sm" variant="ghost" className="text-mk-danger" aria-label={T("Delete", "حذف", ar)} onClick={() => deletePolicy(policy)}><Trash2 size={13} /></IconButton></div>}
                  </div>
                  {open && <div className="px-3 pb-3"><p className="mk-caption text-mk-ink-500 mb-3">{ar ? policy.descriptionAr || policy.descriptionEn : policy.descriptionEn || policy.descriptionAr}</p><div className="flex flex-wrap gap-2">{POLICY_FIELDS.map((field) => <span key={field.key} className="mk-overline px-2.5 py-1 rounded-full bg-white text-mk-ink-600 normal-case tracking-normal">{T(field.labelEn, field.labelAr, ar)}: {optionLabel(field, policy[field.key])}</span>)}</div></div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <div className="flex flex-col justify-between h-full w-full">
          <div>
            <DrawerHeader title={editingPolicy ? T("Edit rent policy", "تعديل سياسة التأجير", ar) : T("Create rent policy", "إنشاء سياسة تأجير", ar)} onClose={() => setDrawerOpen(false)} className="mb-0 pb-4 border-b border-mk-border" />
            <div className="flex flex-col gap-4 mt-5">
              <Input label={T("Arabic name *", "الاسم بالعربية *", ar)} variant="muted" value={form.nameAr} onChange={(event) => setForm({ ...form, nameAr: event.target.value })} />
              <Input label={T("English name *", "الاسم بالإنجليزية *", ar)} variant="muted" value={form.nameEn} onChange={(event) => setForm({ ...form, nameEn: event.target.value })} />
              <Input label={T("Arabic description", "الوصف بالعربية", ar)} variant="muted" value={form.descriptionAr} onChange={(event) => setForm({ ...form, descriptionAr: event.target.value })} />
              <Input label={T("English description", "الوصف بالإنجليزية", ar)} variant="muted" value={form.descriptionEn} onChange={(event) => setForm({ ...form, descriptionEn: event.target.value })} />
              {POLICY_FIELDS.map((field) => <Select key={field.key} label={T(field.labelEn, field.labelAr, ar)} value={form[field.key]} onChange={(event) => setForm({ ...form, [field.key]: Number(event.target.value) })}>{getOptions(field).map((option) => <option key={option.value} value={option.value}>{ar ? option.nameAr : option.nameEn}</option>)}</Select>)}
              <Input label={T("Sort order", "ترتيب العرض", ar)} variant="muted" type="number" min={0} value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: Math.max(0, Number(event.target.value) || 0) })} />
              <div className="flex items-center justify-between px-3 py-3 rounded-input bg-mk-ink-50"><span className="mk-body-sm text-mk-ink-700">{T("Active", "مفعلة", ar)}</span><Toggle checked={form.isActive} onChange={(value) => setForm({ ...form, isActive: value })} /></div>
            </div>
          </div>
          <DrawerFooter className="mt-4 pt-4 border-t border-mk-border justify-stretch"><Button variant="outline" onClick={() => setDrawerOpen(false)}>{T("Cancel", "إلغاء", ar)}</Button><Button variant="primary" className="flex-1" disabled={!form.nameAr.trim() || !form.nameEn.trim() || saving} onClick={savePolicy}>{saving && <Loader2 size={14} className="animate-spin" />}{editingPolicy ? T("Save changes", "حفظ التعديلات", ar) : T("Create policy", "إنشاء السياسة", ar)}</Button></DrawerFooter>
        </div>
      </Drawer>
    </div>
  );
}
