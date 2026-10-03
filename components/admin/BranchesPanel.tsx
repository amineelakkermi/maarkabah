"use client";

import { useState, useEffect } from "react";
import { Plus, Loader2, MapPin, Edit, Trash2, RefreshCw, HelpCircle } from "lucide-react";
import { Badge, Button, Table, Th, Td, type BadgeVariant, Input, Drawer, DrawerHeader, DrawerFooter, Toggle, Modal, useToast } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { branchService } from "@/lib/api-services";
import { describeApiError } from "@/lib/api-error-messages";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

const STATUS_BADGE: Record<string, BadgeVariant> = {
  "Active": "success",
  "Inactive": "neutral",
  "Pending": "warning",
};

const STATUS_AR: Record<string, string> = {
  "Active": "نشط",
  "Inactive": "غير نشط",
  "Pending": "قيد الانتظار",
};

export function BranchesPanel() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setEditDrawerOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingBranch, setEditingBranch] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [branchToDelete, setBranchToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();

  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [tajeerExternalId, setTajeerExternalId] = useState("");
  const [cityAr, setCityAr] = useState("");
  const [cityEn, setCityEn] = useState("");
  const [addressAr, setAddressAr] = useState("");
  const [addressEn, setAddressEn] = useState("");
  const [phone, setPhone] = useState("");
  const [hoursFrom, setHoursFrom] = useState("08:00");
  const [hoursTo, setHoursTo] = useState("22:00");

  const resetForm = () => {
    setNameAr("");
    setNameEn("");
    setIsActive(true);
    setLatitude("");
    setLongitude("");
    setTajeerExternalId("");
    setCityAr("");
    setCityEn("");
    setAddressAr("");
    setAddressEn("");
    setPhone("");
    setHoursFrom("08:00");
    setHoursTo("22:00");
  };

  // ── Tajeer sync (preview → import) ─────────────────────────
  const [syncOpen, setSyncOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tajeerBranches, setTajeerBranches] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [importing, setImporting] = useState(false);

  const loadBranches = async () => {
    try {
      setLoading(true);
      const response = await branchService.search({});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transformedBranches = (response.items || response.data || []).map((item: any) => ({
        id: item.id,
        name: item.nameEn || item.name || '',
        nameAr: item.nameAr || '',
        status: item.isActive ? 'Active' : 'Inactive',
        latitude: item.latitude ?? null,
        longitude: item.longitude ?? null,
        tajeerExternalId: item.tajeerExternalId ?? null,
        cityAr: item.cityAr || '',
        cityEn: item.cityEn || '',
        addressAr: item.addressAr || '',
        addressEn: item.addressEn || '',
        phone: item.phone || '',
        hoursFrom: item.hoursFrom || '',
        hoursTo: item.hoursTo || '',
      }));
      setBranches(transformedBranches);
    } catch (error) {
      console.error('Error loading branches:', error);
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  // Load branches from API
  useEffect(() => {
    const t = setTimeout(loadBranches, 0);
    return () => clearTimeout(t);
  }, []);

  const handleOpenSync = async () => {
    setSyncOpen(true);
    setSyncLoading(true);
    setSyncError("");
    setSelectedIds(new Set());
    try {
      const res = await branchService.previewTajeerBranches();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: any[] = res?.items ?? res?.data?.items ?? res?.data ?? (Array.isArray(res) ? res : []);
      setTajeerBranches(Array.isArray(items) ? items : []);
      // Pre-select everything that isn't already imported.
      setSelectedIds(new Set(
        (Array.isArray(items) ? items : [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((b: any) => !b.isAlreadyImported && !b.alreadyImported && !b.imported)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((b: any) => Number(b.tajeerId ?? b.id))
          .filter((n: number) => !isNaN(n))
      ));
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Unexpected error");
      setTajeerBranches([]);
    } finally {
      setSyncLoading(false);
    }
  };

  const toggleTajeerBranch = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleImport = async () => {
    setImporting(true);
    setSyncError("");
    try {
      await branchService.importTajeerBranches({ tajeerIds: Array.from(selectedIds) });
      setSyncOpen(false);
      await loadBranches();
      showToast(T("Branches imported from Tajeer", "تم استيراد الفروع من تاجير", ar));
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async () => {
    if (!branchToDelete) return;

    try {
      setIsDeleting(true);
      await branchService.delete(branchToDelete.id);
      loadBranches();
      showToast(T("Branch deleted successfully", "تم حذف الفرع بنجاح", ar));
      setBranchToDelete(null);
    } catch (error) {
      console.error('Error deleting branch:', error);
      showToast(describeApiError(error, ar, ar ? 'فشل حذف الفرع' : 'Failed to delete branch'), "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEditBranch = (branch: any) => {
    setEditingBranch(branch);
    setNameAr(branch.nameAr || "");
    setNameEn(branch.name || "");
    setIsActive(branch.status === "Active");
    setLatitude(branch.latitude != null ? String(branch.latitude) : "");
    setLongitude(branch.longitude != null ? String(branch.longitude) : "");
    setTajeerExternalId(branch.tajeerExternalId != null ? String(branch.tajeerExternalId) : "");
    setCityAr(branch.cityAr || "");
    setCityEn(branch.cityEn || "");
    setAddressAr(branch.addressAr || "");
    setAddressEn(branch.addressEn || "");
    setPhone(branch.phone || "");
    setHoursFrom(branch.hoursFrom || "");
    setHoursTo(branch.hoursTo || "");
    setEditDrawerOpen(true);
  };

  const handleUpdateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(nameAr || nameEn) || !phone) {
      showToast(T("Please fill all mandatory fields", "الرجاء تعبئة الحقول الإلزامية", ar));
      return;
    }

    try {
      await branchService.update(editingBranch.id, {
        nameAr,
        nameEn,
        isActive,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        tajeerExternalId: tajeerExternalId !== "" ? parseInt(tajeerExternalId, 10) : undefined,
        cityAr,
        cityEn,
        addressAr,
        addressEn,
        phone,
        hoursFrom,
        hoursTo,
      });

      await loadBranches();
      setEditDrawerOpen(false);
      setEditingBranch(null);
      resetForm();
      showToast(T("🟢 Branch updated successfully!", "🟢 تم تحديث الفرع بنجاح!", ar));
    } catch (error) {
      console.error('Error updating branch:', error);
      showToast(T('Failed to update branch', 'فشل تحديث الفرع', ar));
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(nameAr || nameEn) || !phone) {
      showToast(T("Please fill all mandatory fields", "الرجاء تعبئة الحقول الإلزامية", ar));
      return;
    }

    try {
      await branchService.create({
        nameAr,
        nameEn,
        isActive,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        tajeerExternalId: tajeerExternalId !== "" ? parseInt(tajeerExternalId, 10) : undefined,
        cityAr,
        cityEn,
        addressAr,
        addressEn,
        phone,
        hoursFrom,
        hoursTo,
      });

      // Reload branches list
      await loadBranches();
      setDrawerOpen(false);
      resetForm();
      showToast(T("🟢 Branch created successfully!", "🟢 تم إضافة الفرع الجديد بنجاح!", ar));
    } catch (error) {
      console.error('Error creating branch:', error);
      showToast(T('Failed to create branch', 'فشل إنشاء الفرع', ar));
    }
  };

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center gap-3 mb-5">
        <div className="mk-h4 flex-1 text-mk-ink-900">
          {T("Branches", "الفروع", ar)}
        </div>
        <Button variant="outline" onClick={handleOpenSync}>
          <RefreshCw size={14} />
          {T("Sync from Tajeer", "مزامنة من تاجير", ar)}
        </Button>
        <Button 
          variant="primary" 
          className="shadow-[var(--shadow-glow-blue)]"
          onClick={() => { resetForm(); setDrawerOpen(true); }}
        >
          <Plus size={14} />
          {T("Add branch", "إضافة فرع", ar)}
        </Button>
      </div>

      {/* Branches table */}
      <div className="rounded-xl overflow-hidden mk-surface">
        <Table>
          <thead>
            <tr>
              {[
                T("Branch name", "اسم الفرع", ar),
                T("City", "المدينة", ar),
                T("Coordinates", "الموقع", ar),
                T("Status", "الحالة", ar),
                "",
              ].map((h, i) => <Th key={i}>{h}</Th>)}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-12">
                  <Loader2 className="animate-spin text-mk-blue-500 mx-auto" size={32} />
                </td>
              </tr>
            ) : branches.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 mk-label text-mk-ink-400">
                  {T("No branches found", "لم يتم العثور على فروع", ar)}
                </td>
              </tr>
            ) : (
              branches.map((branch) => (
                <tr key={branch.id} className="cursor-pointer transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50">
                  <Td>
                    <div className="mk-body text-mk-ink-900">
                      {ar ? (branch.nameAr || branch.name) : branch.name}
                    </div>
                  </Td>
                  <Td>
                    <div className="mk-label text-mk-ink-700">
                      {(ar ? (branch.cityAr || branch.cityEn) : (branch.cityEn || branch.cityAr))
                        || T("Not set", "غير محدد", ar)}
                    </div>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2 mk-label text-mk-ink-700">
                      <MapPin size={14} />
                      {branch.latitude != null && branch.longitude != null
                        ? `${branch.latitude}, ${branch.longitude}`
                        : T("Not set", "غير محدد", ar)}
                    </div>
                  </Td>
                  <Td>
                    <Badge variant={STATUS_BADGE[branch.status] ?? "neutral"}>
                      {ar ? (STATUS_AR[branch.status] ?? branch.status) : branch.status}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditBranch(branch)}
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBranchToDelete(branch)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {/* Drawer */}
      <Drawer open={isDrawerOpen} onClose={() => setDrawerOpen(false)}>
        <div className="flex flex-col justify-between h-full w-full">
          <div className="flex-1 min-h-0 overflow-y-auto mk-scrollbar pe-2">
            <DrawerHeader title={T("Add New Branch", "إضافة فرع جديد", ar)} onClose={() => setDrawerOpen(false)} className="mb-0 pb-4 border-b border-mk-border" />

            <form onSubmit={handleCreateBranch} className="flex flex-col gap-4 mt-5">
              <Input
                variant="muted"
                label={<>{T("Branch name", "اسم الفرع", ar)} <span className="text-mk-danger">*</span></>}
                placeholder={T("Riyadh — Olaya", "الرياض — العليا", ar)}
                value={ar ? nameAr : nameEn}
                onChange={(e) => { setNameAr(e.target.value); setNameEn(e.target.value); }}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  variant="muted"
                  type="number"
                  step="any"
                  className="font-mono"
                  dir="ltr"
                  label={T("Latitude", "خط العرض", ar)}
                  placeholder="24.7136"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                />
                <Input
                  variant="muted"
                  type="number"
                  step="any"
                  className="font-mono"
                  dir="ltr"
                  label={T("Longitude", "خط الطول", ar)}
                  placeholder="46.6753"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                />
              </div>
              <Input
                variant="muted"
                label={T("City", "المدينة", ar)}
                placeholder={T("Riyadh", "الرياض", ar)}
                value={ar ? cityAr : cityEn}
                onChange={(e) => { setCityAr(e.target.value); setCityEn(e.target.value); }}
              />
              <Input
                variant="muted"
                label={T("Address", "العنوان", ar)}
                placeholder={T("Olaya District, Riyadh 12213", "حي العليا، الرياض 12213", ar)}
                value={ar ? addressAr : addressEn}
                onChange={(e) => { setAddressAr(e.target.value); setAddressEn(e.target.value); }}
              />
              <Input
                variant="muted"
                type="tel"
                className="font-mono"
                dir="ltr"
                label={<>{T("Phone", "الهاتف", ar)} <span className="text-mk-danger">*</span></>}
                placeholder="+966 55 000 1234"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Input
                variant="muted"
                className="font-mono"
                dir="ltr"
                label={
                  <span className="flex items-center gap-1">
                    {T("Tajeer External ID", "معرف تأجير الخارجي", ar)}
                    <HelpCircle size={12} className="text-mk-ink-300" />
                  </span>
                }
                placeholder="10045"
                value={tajeerExternalId}
                onChange={(e) => setTajeerExternalId(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  variant="muted"
                  type="time"
                  className="font-mono"
                  label={T("Opens", "من الساعة", ar)}
                  value={hoursFrom}
                  onChange={(e) => setHoursFrom(e.target.value)}
                />
                <Input
                  variant="muted"
                  type="time"
                  className="font-mono"
                  label={T("Closes", "إلى الساعة", ar)}
                  value={hoursTo}
                  onChange={(e) => setHoursTo(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="mk-label text-mk-ink-900">{T("Branch Active", "الفرع نشط", ar)}</div>
                  <p className="mk-caption text-mk-ink-400 mt-1">{T("Disabled branches can't be assigned to new contracts or staff.", "الفروع المعطّلة لا يمكن تعيينها لعقود أو موظفين جدد.", ar)}</p>
                </div>
                <Toggle checked={isActive} onChange={setIsActive} />
              </div>
            </form>
          </div>

          <DrawerFooter className="mt-4 pt-4 border-t border-mk-border justify-stretch">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              {T("Cancel", "إلغاء", ar)}
            </Button>
            <Button
              variant="primary"
              disabled={!(nameAr || nameEn) || !phone}
              onClick={handleCreateBranch}
              className="flex-1"
            >
              {T("Add Branch", "إضافة فرع", ar)}
            </Button>
          </DrawerFooter>
        </div>
      </Drawer>

      {/* Edit Drawer */}
      <Drawer open={isEditDrawerOpen} onClose={() => setEditDrawerOpen(false)}>
        <div className="flex flex-col justify-between h-full w-full">
          <div className="flex-1 min-h-0 overflow-y-auto mk-scrollbar pe-2">
            <DrawerHeader title={T("Edit Branch", "تعديل الفرع", ar)} onClose={() => setEditDrawerOpen(false)} className="mb-0 pb-4 border-b border-mk-border" />

            <form onSubmit={handleUpdateBranch} className="flex flex-col gap-4 mt-5">
              <Input
                variant="muted"
                label={<>{T("Branch name", "اسم الفرع", ar)} <span className="text-mk-danger">*</span></>}
                placeholder={T("Riyadh — Olaya", "الرياض — العليا", ar)}
                value={ar ? nameAr : nameEn}
                onChange={(e) => { setNameAr(e.target.value); setNameEn(e.target.value); }}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  variant="muted"
                  type="number"
                  step="any"
                  className="font-mono"
                  dir="ltr"
                  label={T("Latitude", "خط العرض", ar)}
                  placeholder="24.7136"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                />
                <Input
                  variant="muted"
                  type="number"
                  step="any"
                  className="font-mono"
                  dir="ltr"
                  label={T("Longitude", "خط الطول", ar)}
                  placeholder="46.6753"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                />
              </div>
              <Input
                variant="muted"
                label={T("City", "المدينة", ar)}
                placeholder={T("Riyadh", "الرياض", ar)}
                value={ar ? cityAr : cityEn}
                onChange={(e) => { setCityAr(e.target.value); setCityEn(e.target.value); }}
              />
              <Input
                variant="muted"
                label={T("Address", "العنوان", ar)}
                placeholder={T("Olaya District, Riyadh 12213", "حي العليا، الرياض 12213", ar)}
                value={ar ? addressAr : addressEn}
                onChange={(e) => { setAddressAr(e.target.value); setAddressEn(e.target.value); }}
              />
              <Input
                variant="muted"
                type="tel"
                className="font-mono"
                dir="ltr"
                label={<>{T("Phone", "الهاتف", ar)} <span className="text-mk-danger">*</span></>}
                placeholder="+966 55 000 1234"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Input
                variant="muted"
                className="font-mono"
                dir="ltr"
                label={
                  <span className="flex items-center gap-1">
                    {T("Tajeer External ID", "معرف تأجير الخارجي", ar)}
                    <HelpCircle size={12} className="text-mk-ink-300" />
                  </span>
                }
                placeholder="10045"
                value={tajeerExternalId}
                onChange={(e) => setTajeerExternalId(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  variant="muted"
                  type="time"
                  className="font-mono"
                  label={T("Opens", "من الساعة", ar)}
                  value={hoursFrom}
                  onChange={(e) => setHoursFrom(e.target.value)}
                />
                <Input
                  variant="muted"
                  type="time"
                  className="font-mono"
                  label={T("Closes", "إلى الساعة", ar)}
                  value={hoursTo}
                  onChange={(e) => setHoursTo(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="mk-label text-mk-ink-900">{T("Branch Active", "الفرع نشط", ar)}</div>
                  <p className="mk-caption text-mk-ink-400 mt-1">{T("Disabled branches can't be assigned to new contracts or staff.", "الفروع المعطّلة لا يمكن تعيينها لعقود أو موظفين جدد.", ar)}</p>
                </div>
                <Toggle checked={isActive} onChange={setIsActive} />
              </div>
            </form>
          </div>

          <DrawerFooter className="mt-4 pt-4 border-t border-mk-border justify-stretch">
            <Button variant="outline" onClick={() => setEditDrawerOpen(false)}>
              {T("Cancel", "إلغاء", ar)}
            </Button>
            <Button
              variant="primary"
              disabled={!(nameAr || nameEn) || !phone}
              onClick={handleUpdateBranch}
              className="flex-1"
            >
              {T("Save Changes", "حفظ التعديلات", ar)}
            </Button>
          </DrawerFooter>
        </div>
      </Drawer>

      {/* Tajeer sync drawer — preview remote branches, pick, import */}
      <Drawer open={syncOpen} onClose={() => setSyncOpen(false)}>
        <div className="flex flex-col gap-5 justify-between h-full max-w-[480px]">
          <div className="flex-1 min-h-0 overflow-y-auto mk-scrollbar pe-2">
            <DrawerHeader title={T("Sync branches from Tajeer", "مزامنة الفروع من تاجير", ar)} onClose={() => setSyncOpen(false)} className="mb-0 pb-4 border-b border-mk-border" />
            <div className="mt-5">
              {syncLoading ? (
                <div className="py-12 text-center">
                  <Loader2 className="animate-spin text-mk-blue-500 mx-auto" size={28} />
                </div>
              ) : tajeerBranches.length === 0 ? (
                <div className="py-12 text-center mk-body-sm text-mk-ink-500">
                  {syncError ? syncError : T("No branches returned by Tajeer", "لم يُرجع تاجير أي فروع", ar)}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {tajeerBranches.map((b: any) => {
                    const tid = Number(b.tajeerId ?? b.id);
                    const already = Boolean(b.alreadyImported ?? b.isAlreadyImported ?? b.imported);
                    const checked = selectedIds.has(tid);
                    const label = ar ? (b.nameAr || b.nameEn || String(tid)) : (b.nameEn || b.nameAr || String(tid));
                    const city = ar ? b.cityAr : b.cityEn;
                    return (
                      <label key={tid} className={`flex items-center gap-3 px-4 py-3 rounded-md border ${already ? "border-mk-ink-100 bg-mk-ink-50 opacity-60" : checked ? "border-mk-blue-500/40 bg-mk-blue-50" : "border-mk-ink-100"} ${already ? "" : "cursor-pointer"}`}>
                        <input type="checkbox" checked={already || checked} disabled={already} onChange={() => toggleTajeerBranch(tid)} className="w-4 h-4" />
                        <div className="flex-1 min-w-0">
                          <div className="mk-body-sm text-mk-ink-900 truncate">{label}</div>
                          {(city || b.isMain) && (
                            <div className="mk-caption text-mk-ink-500 truncate">
                              {[city, b.isMain ? T("Main", "رئيسي", ar) : ""].filter(Boolean).join(" · ")}
                            </div>
                          )}
                        </div>
                        {already
                          ? <Badge variant="neutral">{b.localBranchId != null ? T(`→ #${b.localBranchId}`, `→ #${b.localBranchId}`, ar) : T("Imported", "مستورد", ar)}</Badge>
                          : <span className="mk-overline text-mk-ink-400">#{tid}</span>}
                      </label>
                    );
                  })}
                </div>
              )}
              {syncError && tajeerBranches.length > 0 && (
                <p className="mk-label text-mk-danger-700 px-4 py-3 rounded-lg bg-mk-danger-100 mt-3">{syncError}</p>
              )}
            </div>
          </div>

          <DrawerFooter className="mt-4 pt-4 border-t border-mk-border justify-stretch">
            <Button variant="outline" onClick={() => setSyncOpen(false)}>
              {T("Cancel", "إلغاء", ar)}
            </Button>
            <Button
              variant="primary"
              className="flex-1 shadow-[var(--shadow-glow-blue)]"
              disabled={importing || selectedIds.size === 0}
              onClick={handleImport}
            >
              {importing
                ? T("Importing…", "جارٍ الاستيراد…", ar)
                : T(`Import ${selectedIds.size} branch(es)`, `استيراد ${selectedIds.size} فرع`, ar)}
            </Button>
          </DrawerFooter>
        </div>
      </Drawer>

      {/* Confirm delete branch modal — same pattern as CustomerListPage */}
      <Modal
        open={!!branchToDelete}
        onClose={() => { if (!isDeleting) setBranchToDelete(null); }}
        variant="centered"
        size="sm"
        title={T("Delete branch?", "حذف الفرع؟", ar)}
      >
        <div className="flex flex-col gap-5 p-2">
          <p className="mk-body text-mk-ink-700">
            {T(
              `Are you sure you want to delete ${branchToDelete?.name || branchToDelete?.nameEn || branchToDelete?.nameAr || "this branch"}? This action cannot be undone.`,
              `هل أنت متأكد من حذف ${branchToDelete?.nameAr || branchToDelete?.name || branchToDelete?.nameEn || "هذا الفرع"}؟ لا يمكن التراجع عن هذا الإجراء.`,
              ar
            )}
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setBranchToDelete(null)} disabled={isDeleting}>
              {T("Cancel", "إلغاء", ar)}
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting
                ? <><Loader2 size={13} className="animate-spin" /> {T("Deleting...", "جارٍ الحذف...", ar)}</>
                : <><Trash2 size={13} /> {T("Delete", "حذف", ar)}</>}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
