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

// Backend-assigned (not in create/update bodies): 1 = basic — billed as a
// regular add-on line; 2 = supplementary — summed into the Tajeer
// additional-coverage cost under tenant extendedCoverageTajeerId.
function serviceTypeBadge(type: number | undefined, ar: boolean) {
  return type === 1
    ? { label: ar ? "أساسية" : "Basic", variant: "neutral" as const }
    : { label: ar ? "تكميلية" : "Supplementary", variant: "info" as const };
}

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  // Set while the drawer is in edit mode (prefilled from the row/detail).
  const [editingService, setEditingService] = useState<Types.AdditionalServiceDto | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<Types.AdditionalServiceDto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Create form state
  const [newNameAr, setNewNameAr] = useState("");
  const [newNameEn, setNewNameEn] = useState("");
  const [newDescAr, setNewDescAr] = useState("");
  const [newDescEn, setNewDescEn] = useState("");
  const [newBillingUnit, setNewBillingUnit] = useState<Types.AdditionalServiceBillingUnit>(Types.AdditionalServiceBillingUnit.Once);
  const [newUnitPrice, setNewUnitPrice] = useState<string>("0");
  const [newSortOrder, setNewSortOrder] = useState<string>("0");
  const [newIconKey, setNewIconKey] = useState("");
  const [newIncludeInVat, setNewIncludeInVat] = useState(true);
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

  // Search rows carry branchCount, not branchIds — the PUT treats empty
  // branchIds as tenant-wide, so any save must be built on the detail
  // response to avoid wiping a service's branch scope.
  const fetchFullService = async (id: number): Promise<Types.AdditionalServiceDto> => {
    const res = await additionalServiceService.getById(id);
    return res?.data ?? res;
  };

  // Immediate toggle — no edit mode. Optimistic flip, reverted on failure.
  const handleToggleActive = async (s: Types.AdditionalServiceDto) => {
    const next = !(s.isActive ?? true);
    setTogglingId(s.id);
    setServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, isActive: next } : x)));
    try {
      const d = await fetchFullService(s.id);
      await additionalServiceService.update(s.id, {
        nameAr: d.nameAr, nameEn: d.nameEn,
        descriptionAr: d.descriptionAr, descriptionEn: d.descriptionEn,
        billingUnit: d.billingUnit, unitPrice: d.unitPrice, sortOrder: d.sortOrder,
        iconKey: d.iconKey, isActive: next, includeInVat: d.includeInVat,
        branchIds: d.branchIds ?? [],
      });
    } catch (err) {
      setServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, isActive: s.isActive } : x)));
      showToast(err instanceof Error ? err.message : T("Failed to update service", "فشل تحديث الخدمة", ar), "error");
    } finally {
      setTogglingId(null);
    }
  };

  const openCreateDrawer = () => {
    setEditingService(null);
    resetAddForm();
    setShowAdd(true);
  };

  const openEditDrawer = async (s: Types.AdditionalServiceDto) => {
    try {
      const d = await fetchFullService(s.id);
      setEditingService(d);
      setNewNameAr(d.nameAr ?? "");
      setNewNameEn(d.nameEn ?? "");
      setNewDescAr(d.descriptionAr ?? "");
      setNewDescEn(d.descriptionEn ?? "");
      setNewBillingUnit(d.billingUnit ?? Types.AdditionalServiceBillingUnit.Once);
      setNewUnitPrice(String(d.unitPrice ?? 0));
      setNewSortOrder(String(d.sortOrder ?? 0));
      setNewIconKey(d.iconKey ?? "");
      setNewIncludeInVat(d.includeInVat !== false);
      setSelectedBranchIds(d.branchIds ?? []);
      setShowAdd(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : T("Failed to load service", "فشل تحميل الخدمة", ar), "error");
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
    setNewIncludeInVat(true);
    setSelectedBranchIds([]);
  };

  const handleSubmit = async () => {
    if (ar ? !newNameAr.trim() : !newNameEn.trim()) {
      alert(T("English name is required", "الاسم العربي مطلوب", ar));
      return;
    }
    setCreating(true);
    try {
      if (editingService) {
        await additionalServiceService.update(editingService.id, {
          nameAr: newNameAr || undefined,
          nameEn: newNameEn || undefined,
          descriptionAr: newDescAr || undefined,
          descriptionEn: newDescEn || undefined,
          billingUnit: newBillingUnit,
          unitPrice: Number(newUnitPrice) || 0,
          sortOrder: Number(newSortOrder) || 0,
          iconKey: newIconKey || undefined,
          isActive: editingService.isActive,
          includeInVat: newIncludeInVat,
          branchIds: selectedBranchIds,
        });
        showToast(T("Add-on service updated", "تم تحديث الخدمة الإضافية", ar));
      } else {
        await additionalServiceService.create({
          nameAr: newNameAr || undefined,
          nameEn: newNameEn || undefined,
          descriptionAr: newDescAr || undefined,
          descriptionEn: newDescEn || undefined,
          billingUnit: newBillingUnit,
          unitPrice: Number(newUnitPrice) || 0,
          sortOrder: Number(newSortOrder) || 0,
          iconKey: newIconKey || undefined,
          includeInVat: newIncludeInVat,
          branchIds: selectedBranchIds,
        });
        showToast(T("Add-on service created", "تم إنشاء الخدمة الإضافية", ar));
      }
      resetAddForm();
      setEditingService(null);
      setShowAdd(false);
      await loadServices();
    } catch (err) {
      console.error("Error saving additional service:", err);
      alert(err instanceof Error ? err.message : T("Failed to save service", "فشل حفظ الخدمة", ar));
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
      </div>

      <div className="rounded-xl overflow-hidden mk-surface">
        <div className="px-5 py-3 border-b border-mk-ink-100 bg-mk-ink-50 flex justify-between items-center gap-3">
          <div className="flex-1 max-w-[320px]">
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
        
          <Button variant="outline" onClick={openCreateDrawer} className="shrink-0">
            <Plus size={13} />{T("Add supplementary service", "إضافة خدمة تكميلية", ar)}
          </Button>
        </div>

        <Table>
          <thead>
            <tr>
              {[
                T("Service", "الخدمة", ar),
                T("Type", "النوع", ar),
                T("Description", "الوصف", ar),
                T("Unit", "الوحدة", ar),
                T("Price", "السعر", ar),
                T("VAT", "الضريبة", ar),
                T("Active", "نشط", ar),
                "",
              ].map((h, i) => <Th key={i}>{h}</Th>)}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <Td colSpan={8} className="text-center py-14">
                  <div className="flex flex-col items-center justify-center gap-3 text-mk-ink-400">
                    <Loader2 size={32} className="animate-spin" />
                    <span className="mk-label">{T("Loading add-on services…", "جاري تحميل الخدمات الإضافية…", ar)}</span>
                  </div>
                </Td>
              </tr>
            ) : error ? (
              <tr>
                <Td colSpan={8} className="text-center py-14">
                  <div className="flex flex-col items-center justify-center gap-3 text-mk-danger">
                    <span className="mk-label">{error}</span>
                    <Button variant="outline"  onClick={loadServices}>{T("Retry", "إعادة المحاولة", ar)}</Button>
                  </div>
                </Td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <Td colSpan={8} className="text-center py-14">
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
                        <span className="mk-label text-mk-ink-900">{ar ? s.nameAr || s.nameEn : s.nameEn || s.nameAr}</span>
                      </div>
                    </Td>
                    <Td>
                      <Badge
                        variant={serviceTypeBadge(s.type, ar).variant}
                        className="normal-case tracking-normal"
                        title={s.type === 1
                          ? T("Basic service — billed as a regular add-on line", "خدمة أساسية — تُحتسب كسطر إضافي عادي", ar)
                          : T("Supplementary — grouped into the Tajeer additional coverage", "تكميلية — تُجمّع ضمن التغطية الإضافية في تاجير", ar)}
                      >
                        {serviceTypeBadge(s.type, ar).label}
                      </Badge>
                    </Td>
                    <Td className="max-w-[260px]">
                      <span className="mk-caption text-mk-ink-500 line-clamp-2">{ar ? s.descriptionAr || s.descriptionEn : s.descriptionEn || s.descriptionAr}</span>
                    </Td>
                    <Td>
                      <Badge variant="neutral" className="normal-case tracking-normal">
                        {ar ? unit[1] : `/ ${unit[0]}`}
                      </Badge>
                    </Td>
                    <Td>
                      <span className="mk-body-sm text-mk-ink-900">{(s.unitPrice ?? 0).toLocaleString()}</span>
                      <span className="mk-caption ms-1 text-mk-ink-500 uppercase-none normal-case tracking-normal">{T("SAR", "ريال", ar)}</span>
                    </Td>
                    <Td>
                      <Badge variant={s.includeInVat === false ? "neutral" : "success"} className="normal-case tracking-normal">
                        {s.includeInVat === false ? T("Excluded", "خارج الضريبة", ar) : T("Included", "مشمولة", ar)}
                      </Badge>
                    </Td>
                    <Td>
                      {togglingId === s.id ? (
                        <Loader2 size={16} className="animate-spin text-mk-ink-400" />
                      ) : (
                        <Toggle
                          checked={s.isActive ?? true}
                          onChange={() => handleToggleActive(s)}
                          size="sm"
                        />
                      )}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <IconButton
                          variant="ghost"
                          onClick={() => openEditDrawer(s)}
                          aria-label={T("Edit", "تعديل", ar)}
                        >
                          <Pencil size={14} className="text-mk-ink-500" />
                        </IconButton>
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
                      </div>
                    </Td>
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
      <Drawer open={showAdd} onClose={() => { setShowAdd(false); setEditingService(null); resetAddForm(); }}>
        <div className="flex flex-col justify-between h-full max-w-[480px]">
          <div className="flex-1 min-h-0 overflow-y-auto mk-scrollbar pe-2">
            <DrawerHeader
              title={editingService
                ? T("Edit add-on service", "تعديل الخدمة الإضافية", ar)
                : T("Add add-on service", "إضافة خدمة إضافية", ar)}
              onClose={() => { setShowAdd(false); setEditingService(null); resetAddForm(); }}
              className="mb-0 pb-4 border-b border-mk-border"
            />
            <div className="flex flex-col gap-4 mt-5">
              {ar ? (
                <>
                  <Input
                    variant="muted"
                    dir="rtl"
                    label={<>الاسم عربي <span className="text-mk-danger">*</span></>}
                    value={newNameAr}
                    onChange={(e) => setNewNameAr(e.target.value)}
                  />
                  <Input
                    variant="muted"
                    dir="rtl"
                    label="الوصف عربي"
                    value={newDescAr}
                    onChange={(e) => setNewDescAr(e.target.value)}
                  />
                  <Input
                    variant="muted"
                    label="الاسم إنجليزي (اختياري)"
                    value={newNameEn}
                    onChange={(e) => setNewNameEn(e.target.value)}
                  />
                  <Input
                    variant="muted"
                    label="الوصف إنجليزي (اختياري)"
                    value={newDescEn}
                    onChange={(e) => setNewDescEn(e.target.value)}
                  />
                </>
              ) : (
                <>
                  <Input
                    variant="muted"
                    label={<>English name <span className="text-mk-danger">*</span></>}
                    value={newNameEn}
                    onChange={(e) => setNewNameEn(e.target.value)}
                  />
                  <Input
                    variant="muted"
                    label="English description"
                    value={newDescEn}
                    onChange={(e) => setNewDescEn(e.target.value)}
                  />
                  <Input
                    variant="muted"
                    dir="rtl"
                    label="Arabic name (optional)"
                    value={newNameAr}
                    onChange={(e) => setNewNameAr(e.target.value)}
                  />
                  <Input
                    variant="muted"
                    dir="rtl"
                    label="Arabic description (optional)"
                    value={newDescAr}
                    onChange={(e) => setNewDescAr(e.target.value)}
                  />
                </>
              )}
              <div className="flex flex-col gap-2">
                <label className="mk-caption text-mk-ink-700">
                  {T("Billing unit", "وحدة الفوترة", ar)}
                  {editingService?.isSystem && (
                    <span className="text-mk-ink-400 ms-1">{T("(locked on system services)", "(مقفلة في خدمات النظام)", ar)}</span>
                  )}
                </label>
                <Select
                  value={String(newBillingUnit)}
                  onChange={(e) => setNewBillingUnit(Number(e.target.value) as Types.AdditionalServiceBillingUnit)}
                  disabled={editingService?.isSystem}
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

              <Checkbox
                label={T("Include in VAT (15%)", "مشمولة في ضريبة القيمة المضافة (١٥٪)", ar)}
                description={T(
                  "Included: the line is inside the 15% VAT base. Excluded: the amount stays on the invoice but out of VAT.",
                  "مشمولة: يدخل المبلغ ضمن أساس الضريبة ١٥٪. خارج الضريبة: يبقى المبلغ على الفاتورة دون احتساب ضريبة.",
                  ar
                )}
                checked={newIncludeInVat}
                onChange={setNewIncludeInVat}
              />

              {branches.length > 0 && (
                <div className="flex flex-col gap-3">
                  <label className="mk-caption text-mk-ink-700">
                    {T("Offered at branches", "متوفرة في الفروع", ar)}
                    <span className="text-mk-ink-400 ms-1">{T("(empty = tenant-wide)", "(فارغ = جميع الفروع)", ar)}</span>
                  </label>
                  <div className="grid grid-cols-1 gap-3 max-h-[200px] overflow-y-auto mk-scrollbar p-3 rounded-lg border border-mk-ink-100 bg-mk-ink-50">
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
            <Button variant="outline" onClick={() => { setShowAdd(false); setEditingService(null); resetAddForm(); }}>
              {T("Cancel", "إلغاء", ar)}
            </Button>
            <Button
              variant="primary"
              disabled={(ar ? !newNameAr.trim() : !newNameEn.trim()) || creating}
              onClick={handleSubmit}
              className="flex-1"
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : (editingService ? <Check size={16} /> : <Plus size={16} />)}
              {editingService ? T("Save changes", "حفظ التعديلات", ar) : T("Add service", "إضافة خدمة", ar)}
            </Button>
          </DrawerFooter>
        </div>
      </Drawer>
    </div>
  );
}
