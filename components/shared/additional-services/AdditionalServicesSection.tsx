"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck, Gauge, Baby, Fuel, Wifi, MapPin, Compass, Accessibility,
  Pencil, Check, Plus, Trash2, Loader2, Search, X, CircleDot, Lock, AlertTriangle,
} from "lucide-react";
import { useAdmin } from "@/contexts/AdminContext";
import {
  Button, Input, Badge, Table, Th, Td, Drawer, DrawerHeader, DrawerFooter,
  Select, Checkbox, IconButton, Toggle, Modal, useToast,
} from "@/components/ui";
import { additionalServiceService, branchService } from "@/lib/api-services";
import * as Types from "@/lib/api-types";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

type LucideIcon = React.ComponentType<{ size?: number; className?: string }>;

const ICON_MAP: Record<string, LucideIcon> = {
  insurance: ShieldCheck,
  unlimited_km: Gauge,
  child: Baby,
  fuel: Fuel,
  internet: Wifi,
  delivery: MapPin,
  return_agent: MapPin,
  navigation: Compass,
  special_needs: Accessibility,
};

const BILLING_UNIT_LABELS: Record<Types.AdditionalServiceBillingUnit, [string, string]> = {
  [Types.AdditionalServiceBillingUnit.Once]: ["Once", "مرة واحدة"],
  [Types.AdditionalServiceBillingUnit.PerDay]: ["Per day", "يوم"],
  [Types.AdditionalServiceBillingUnit.PerKm]: ["Per km", "كم"],
};

function getIcon(iconKey?: string): LucideIcon {
  return ICON_MAP[iconKey || ""] || CircleDot;
}

interface BranchOption {
  id: number;
  name: string;
  nameAr?: string;
  nameEn?: string;
}

export default function AdditionalServicesSection() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const { showToast } = useToast();

  const [services, setServices] = useState<Types.AdditionalServiceDto[]>([]);
  const [snapshot, setSnapshot] = useState<Types.AdditionalServiceDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<Types.AdditionalServiceDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Create form state
  const [newNameAr, setNewNameAr] = useState("");
  const [newNameEn, setNewNameEn] = useState("");
  const [newDescAr, setNewDescAr] = useState("");
  const [newDescEn, setNewDescEn] = useState("");
  const [newBillingUnit, setNewBillingUnit] = useState<Types.AdditionalServiceBillingUnit>(Types.AdditionalServiceBillingUnit.Once);
  const [newUnitPrice, setNewUnitPrice] = useState<string>("0");
  const [newSortOrder, setNewSortOrder] = useState<string>("0");
  const [newIconKey, setNewIconKey] = useState("");
  const [selectedBranchIds, setSelectedBranchIds] = useState<number[]>([]);
  const [creating, setCreating] = useState(false);

  const loadServices = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await additionalServiceService.search({ pageNumber: 1, pageSize: 200 });
      const items = response?.items ?? response?.data?.items ?? response?.data ?? response ?? [];
      const list = Array.isArray(items) ? items : [];
      setServices(list);
      setSnapshot(list.map((s: Types.AdditionalServiceDto) => ({ ...s })));
    } catch (err) {
      console.error("Error loading additional services:", err);
      setError(err instanceof Error ? err.message : T("Failed to load add-on services", "فشل تحميل الخدمات الإضافية", ar));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, [ar]);

  useEffect(() => {
    branchService
      .search({ pageNumber: 1, pageSize: 200 })
      .then((res: any) => {
        const items = res?.items ?? res?.data?.items ?? res?.data ?? res ?? [];
        const list = Array.isArray(items)
          ? items.map((b: any) => ({
              id: b.id,
              name: b.nameAr || b.nameEn || b.name || "",
              nameAr: b.nameAr,
              nameEn: b.nameEn,
            }))
          : [];
        setBranches(list);
      })
      .catch(() => setBranches([]));
  }, [ar]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return services.filter(
      (s) =>
        (s.nameEn || "").toLowerCase().includes(q) ||
        (s.nameAr || "").toLowerCase().includes(q) ||
        (s.descriptionEn || "").toLowerCase().includes(q) ||
        (s.descriptionAr || "").toLowerCase().includes(q) ||
        (s.code || "").toLowerCase().includes(q)
    );
  }, [services, search]);

  const changed = useMemo(() => {
    return services.filter((s) => {
      const orig = snapshot.find((x) => x.id === s.id);
      if (!orig) return false;
      return (
        s.unitPrice !== orig.unitPrice ||
        s.isActive !== orig.isActive ||
        s.nameEn !== orig.nameEn ||
        s.nameAr !== orig.nameAr ||
        s.descriptionEn !== orig.descriptionEn ||
        s.descriptionAr !== orig.descriptionAr
      );
    });
  }, [services, snapshot]);

  const handlePriceChange = (id: number, value: string) => {
    const price = Math.max(0, Number(value) || 0);
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, unitPrice: price } : s)));
  };

  const handleActiveChange = (id: number, active: boolean) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: active } : s)));
  };

  const handleFieldChange = (
    id: number,
    field: keyof Types.AdditionalServiceDto,
    value: any
  ) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const handleSave = async () => {
    if (changed.length === 0) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await Promise.all(
        changed.map((s) =>
          additionalServiceService.update(s.id, {
            nameAr: s.nameAr,
            nameEn: s.nameEn,
            descriptionAr: s.descriptionAr,
            descriptionEn: s.descriptionEn,
            billingUnit: s.billingUnit,
            unitPrice: s.unitPrice,
            sortOrder: s.sortOrder,
            iconKey: s.iconKey,
            isActive: s.isActive,
            branchIds: s.branchIds,
          })
        )
      );
      showToast(T("Add-on services updated", "تم تحديث الخدمات الإضافية", ar));
      await loadServices();
      setEditing(false);
    } catch (err) {
      console.error("Error saving additional services:", err);
      alert(err instanceof Error ? err.message : T("Failed to save changes", "فشل حفظ التغييرات", ar));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (service: Types.AdditionalServiceDto) => {
    setServiceToDelete(service);
  };

  const cancelDelete = () => {
    setServiceToDelete(null);
  };

  const handleDelete = async () => {
    const service = serviceToDelete;
    if (!service) return;

    if (service.isSystem) {
      showToast(T("System services cannot be deleted", "الخدمات النظامية لا يمكن حذفها", ar), "error");
      cancelDelete();
      return;
    }

    setDeleting(true);
    try {
      await additionalServiceService.delete(service.id);
      showToast(T("Add-on service deleted", "تم حذف الخدمة الإضافية", ar));
      await loadServices();
      cancelDelete();
    } catch (err) {
      console.error("Error deleting additional service:", err);
      const message = err instanceof Error ? err.message : T("Failed to delete service", "فشل حذف الخدمة", ar);
      showToast(message, "error");
    } finally {
      setDeleting(false);
    }
  };

  const resetAddForm = () => {
    setNewNameAr("");
    setNewNameEn("");
    setNewDescAr("");
    setNewDescEn("");
    setNewBillingUnit(Types.AdditionalServiceBillingUnit.Once);
    setNewUnitPrice("0");
    setNewSortOrder("0");
    setNewIconKey("");
    setSelectedBranchIds([]);
  };

  const handleAdd = async () => {
    if (!newNameAr && !newNameEn) {
      alert(T("Name is required", "الاسم مطلوب", ar));
      return;
    }
    setCreating(true);
    try {
      await additionalServiceService.create({
        nameAr: newNameAr || undefined,
        nameEn: newNameEn || undefined,
        descriptionAr: newDescAr || undefined,
        descriptionEn: newDescEn || undefined,
        billingUnit: newBillingUnit,
        unitPrice: Number(newUnitPrice) || 0,
        sortOrder: Number(newSortOrder) || 0,
        iconKey: newIconKey || undefined,
        branchIds: selectedBranchIds.length > 0 ? selectedBranchIds : [],
      });
      showToast(T("Add-on service created", "تم إنشاء الخدمة الإضافية", ar));
      resetAddForm();
      setShowAdd(false);
      await loadServices();
    } catch (err) {
      console.error("Error creating additional service:", err);
      alert(err instanceof Error ? err.message : T("Failed to create service", "فشل إنشاء الخدمة", ar));
    } finally {
      setCreating(false);
    }
  };

  const billingUnitOptions = [
    { value: String(Types.AdditionalServiceBillingUnit.Once), labelEn: "Once", labelAr: "مرة واحدة" },
    { value: String(Types.AdditionalServiceBillingUnit.PerDay), labelEn: "Per day", labelAr: "يوم" },
    { value: String(Types.AdditionalServiceBillingUnit.PerKm), labelEn: "Per km", labelAr: "كم" },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="mk-h4 flex-1 text-mk-ink-900">
          {T("Add-on services pricing", "جدول تسعير الخدمات الإضافية", ar)}
        </div>
        {editing ? (
          <div className="flex items-center gap-2">
            <Button variant="outline"  onClick={() => { setServices(snapshot.map(s => ({ ...s }))); setEditing(false); }} disabled={saving}>
              {T("Cancel", "إلغاء", ar)}
            </Button>
            <Button variant="primary"  onClick={handleSave} disabled={saving || changed.length === 0}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {T("Save", "حفظ", ar)}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="outline"  onClick={() => setEditing(true)}>
              <Pencil size={13} />{T("Edit", "تعديل", ar)}
            </Button>
            <Button variant="primary"  onClick={() => setShowAdd(true)}>
              <Plus size={13} />{T("Add service", "إضافة خدمة", ar)}
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-xl overflow-hidden mk-surface">
        <div className="px-5 py-3 border-b border-mk-ink-100 bg-mk-ink-50">
          <div className="max-w-[320px]">
            <Input
              variant="search"
              icon={<Search size={14} />}
              placeholder={T("Search services…", "ابحث في الخدمات…", ar)}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              suffix={
                search && (
                  <IconButton  variant="ghost" onClick={() => setSearch("")}>
                    <X size={13} />
                  </IconButton>
                )
              }
            />
          </div>
        </div>

        <Table>
          <thead>
            <tr>
              {[
                T("Service", "الخدمة", ar),
                T("Description", "الوصف", ar),
                T("Unit", "الوحدة", ar),
                T("Price", "السعر", ar),
                T("Active", "نشط", ar),
                ...(editing ? [""] : []),
              ].map((h, i) => <Th key={i}>{h}</Th>)}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <Td colSpan={editing ? 6 : 5} className="text-center py-14">
                  <div className="flex flex-col items-center justify-center gap-3 text-mk-ink-400">
                    <Loader2 size={32} className="animate-spin" />
                    <span className="mk-label">{T("Loading add-on services…", "جاري تحميل الخدمات الإضافية…", ar)}</span>
                  </div>
                </Td>
              </tr>
            ) : error ? (
              <tr>
                <Td colSpan={editing ? 6 : 5} className="text-center py-14">
                  <div className="flex flex-col items-center justify-center gap-3 text-mk-danger">
                    <span className="mk-label">{error}</span>
                    <Button variant="outline"  onClick={loadServices}>{T("Retry", "إعادة المحاولة", ar)}</Button>
                  </div>
                </Td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <Td colSpan={editing ? 6 : 5} className="text-center py-14">
                  <span className="mk-label text-mk-ink-400">{T("No add-on services found", "لا توجد خدمات إضافية", ar)}</span>
                </Td>
              </tr>
            ) : (
              filtered.map((s) => {
                const Icon = getIcon(s.iconKey);
                const unit = s.billingUnit ? BILLING_UNIT_LABELS[s.billingUnit] : ["", ""];
                return (
                  <tr key={s.id} className="transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50">
                    <Td>
                      <div className="flex items-center gap-3">
                        <Icon size={16} className="text-mk-blue-500 shrink-0" />
                        {editing ? (
                          <div className="flex flex-col gap-2 min-w-[180px]">
                            <Input
                              variant="muted"
                              
                              placeholder={T("English name", "الاسم الإنجليزي", ar)}
                              value={s.nameEn || ""}
                              onChange={(e) => handleFieldChange(s.id, "nameEn", e.target.value)}
                            />
                            <Input
                              variant="muted"
                              
                              dir="rtl"
                              placeholder={T("Arabic name", "الاسم العربي", ar)}
                              value={s.nameAr || ""}
                              onChange={(e) => handleFieldChange(s.id, "nameAr", e.target.value)}
                            />
                          </div>
                        ) : (
                          <span className="mk-label text-mk-ink-900">{ar ? s.nameAr || s.nameEn : s.nameEn || s.nameAr}</span>
                        )}
                      </div>
                    </Td>
                    <Td className="max-w-[260px]">
                      {editing ? (
                        <div className="flex flex-col gap-2">
                          <Input
                            variant="muted"
                            
                            placeholder={T("English description", "الوصف الإنجليزي", ar)}
                            value={s.descriptionEn || ""}
                            onChange={(e) => handleFieldChange(s.id, "descriptionEn", e.target.value)}
                          />
                          <Input
                            variant="muted"
                            
                            dir="rtl"
                            placeholder={T("Arabic description", "الوصف العربي", ar)}
                            value={s.descriptionAr || ""}
                            onChange={(e) => handleFieldChange(s.id, "descriptionAr", e.target.value)}
                          />
                        </div>
                      ) : (
                        <span className="mk-caption text-mk-ink-500 line-clamp-2">{ar ? s.descriptionAr || s.descriptionEn : s.descriptionEn || s.descriptionAr}</span>
                      )}
                    </Td>
                    <Td>
                      <Badge variant="neutral" className="normal-case tracking-normal">
                        {ar ? unit[1] : `/ ${unit[0]}`}
                      </Badge>
                    </Td>
                    <Td>
                      {editing ? (
                        <div className="max-w-[140px]">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            
                            value={s.unitPrice ?? 0}
                            onChange={(e) => handlePriceChange(s.id, e.target.value)}
                          />
                        </div>
                      ) : (
                        <>
                          <span className="mk-body-sm text-mk-ink-900">{(s.unitPrice ?? 0).toLocaleString()}</span>
                          <span className="mk-caption ms-1 text-mk-ink-500 uppercase-none normal-case tracking-normal">{T("SAR", "ريال", ar)}</span>
                        </>
                      )}
                    </Td>
                    <Td>
                      {editing ? (
                        <Toggle
                          checked={s.isActive ?? true}
                          onChange={(v) => handleActiveChange(s.id, v)}
                        />
                      ) : (
                        <Badge variant={s.isActive === false ? "neutral" : "success"}>
                          {s.isActive === false ? T("Inactive", "غير نشط", ar) : T("Active", "نشط", ar)}
                        </Badge>
                      )}
                    </Td>
                    {editing && (
                      <Td>
                        {s.isSystem ? (
                          <span
                            title={T("System service — cannot be deleted", "خدمة نظام — لا يمكن الحذف", ar)}
                            className="inline-flex items-center justify-center w-8 h-8 text-mk-ink-400"
                          >
                            <Lock size={14} />
                          </span>
                        ) : (
                          <IconButton
                            variant="ghost"
                            onClick={() => confirmDelete(s)}
                            aria-label={T("Delete", "حذف", ar)}
                          >
                            <Trash2 size={14} className="text-mk-danger" />
                          </IconButton>
                        )}
                      </Td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </div>

      {/* ── DELETE CONFIRMATION MODAL ────────────────────────────── */}
      <Modal
        open={!!serviceToDelete}
        onClose={cancelDelete}
        variant="centered"
        size="sm"
        title={T("Delete add-on service", "حذف الخدمة الإضافية", ar)}
      >
        <div className="flex flex-col items-center gap-4 p-6 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-mk-danger/10">
            <AlertTriangle size={28} className="text-mk-danger" />
          </div>
          <div>
            <p className="mk-body text-mk-ink-900 mb-1">
              {T("Are you sure you want to delete this add-on service?", "هل أنت متأكد أنك تريد حذف هذه الخدمة الإضافية؟", ar)}
            </p>
            {serviceToDelete && (
              <p className="mk-label text-mk-blue-500">
                {ar ? serviceToDelete.nameAr || serviceToDelete.nameEn : serviceToDelete.nameEn || serviceToDelete.nameAr}
              </p>
            )}
          </div>
          <p className="mk-caption text-mk-ink-500">
            {T("This action cannot be undone.", "لا يمكن التراجع عن هذا الإجراء.", ar)}
          </p>
          <div className="flex items-center gap-3 w-full mt-2">
            <Button variant="outline" className="flex-1" onClick={cancelDelete} disabled={deleting}>
              {T("Cancel", "إلغاء", ar)}
            </Button>
            <Button variant="primary" className="flex-1 bg-mk-danger hover:bg-mk-danger border-mk-danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              {T("Delete", "حذف", ar)}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── DRAWER: Add new add-on service ───────────────────────── */}
      <Drawer open={showAdd} onClose={() => { setShowAdd(false); resetAddForm(); }}>
        <div className="flex flex-col justify-between h-full max-w-[480px] overflow-y-auto">
          <div>
            <DrawerHeader
              title={T("Add add-on service", "إضافة خدمة إضافية", ar)}
              onClose={() => { setShowAdd(false); resetAddForm(); }}
              className="mb-0 pb-4 border-b border-mk-border"
            />
            <div className="flex flex-col gap-4 mt-5">
              <Input
                variant="muted"
                label={<>{T("Name (English)", "الاسم (إنجليزي)", ar)} <span className="text-mk-danger">*</span></>}
                value={newNameEn}
                onChange={(e) => setNewNameEn(e.target.value)}
              />
              <Input
                variant="muted"
                dir="rtl"
                label={<>{T("Name (Arabic)", "الاسم (عربي)", ar)} <span className="text-mk-danger">*</span></>}
                value={newNameAr}
                onChange={(e) => setNewNameAr(e.target.value)}
              />
              <Input
                variant="muted"
                label={T("Description (English)", "الوصف (إنجليزي)", ar)}
                value={newDescEn}
                onChange={(e) => setNewDescEn(e.target.value)}
              />
              <Input
                variant="muted"
                dir="rtl"
                label={T("Description (Arabic)", "الوصف (عربي)", ar)}
                value={newDescAr}
                onChange={(e) => setNewDescAr(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="mk-caption text-mk-ink-700">{T("Billing unit", "وحدة الفوترة", ar)}</label>
                  <Select
                    value={String(newBillingUnit)}
                    onChange={(e) => setNewBillingUnit(Number(e.target.value) as Types.AdditionalServiceBillingUnit)}
                  >
                    {billingUnitOptions.map((o) => (
                      <option key={o.value} value={o.value}>{ar ? o.labelAr : o.labelEn}</option>
                    ))}
                  </Select>
                </div>
                <Input
                  variant="muted"
                  type="number"
                  min={0}
                  step="0.01"
                  label={<>{T("Unit price", "سعر الوحدة", ar)} <span className="text-mk-danger">*</span></>}
                  value={newUnitPrice}
                  onChange={(e) => setNewUnitPrice(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  variant="muted"
                  type="number"
                  min={0}
                  label={T("Sort order", "ترتيب العرض", ar)}
                  value={newSortOrder}
                  onChange={(e) => setNewSortOrder(e.target.value)}
                />
                <Input
                  variant="muted"
                  label={T("Icon key", "مفتاح الأيقونة", ar)}
                  placeholder="e.g. insurance, child, gps"
                  value={newIconKey}
                  onChange={(e) => setNewIconKey(e.target.value)}
                />
              </div>

              {branches.length > 0 && (
                <div className="flex flex-col gap-3">
                  <label className="mk-caption text-mk-ink-700">
                    {T("Offered at branches", "متوفرة في الفروع", ar)}
                    <span className="text-mk-ink-400 ms-1">{T("(empty = tenant-wide)", "(فارغ = جميع الفروع)", ar)}</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[200px] overflow-y-auto p-3 rounded-lg border border-mk-ink-100 bg-mk-ink-50">
                    {branches.map((b) => (
                      <Checkbox
                        key={b.id}
                        label={ar ? b.nameAr || b.name : b.nameEn || b.name}
                        checked={selectedBranchIds.includes(b.id)}
                        onChange={(checked) => {
                          setSelectedBranchIds((prev) =>
                            checked ? [...prev, b.id] : prev.filter((id) => id !== b.id)
                          );
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DrawerFooter className="mt-4 pt-4 border-t border-mk-border justify-stretch">
            <Button variant="outline" onClick={() => { setShowAdd(false); resetAddForm(); }}>
              {T("Cancel", "إلغاء", ar)}
            </Button>
            <Button
              variant="primary"
              disabled={(!newNameAr && !newNameEn) || creating}
              onClick={handleAdd}
              className="flex-1"
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {T("Add service", "إضافة خدمة", ar)}
            </Button>
          </DrawerFooter>
        </div>
      </Drawer>
    </div>
  );
}
