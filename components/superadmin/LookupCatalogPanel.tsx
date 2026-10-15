"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Search, Loader2, FileWarning, Plus, Pencil, Trash2, Power,
  ChevronLeft, ChevronRight, RefreshCw,
} from "lucide-react";
import {
  Badge, Button, IconButton, Input, Modal, Select, Table, Th, Td, Toggle, useToast,
} from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { describeApiError } from "@/lib/api-error-messages";
import type {
  AdminLookupItem,
  AdminLookupWriteResponse,
  CreateVehicleLookupRequest,
  UpdateVehicleLookupRequest,
  VehicleLookupSearchRequest,
} from "@/lib/api-types";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

const PAGE_SIZE = 20;

export interface LookupCatalogService {
  search(request: VehicleLookupSearchRequest): Promise<unknown>;
  create(request: CreateVehicleLookupRequest): Promise<AdminLookupWriteResponse>;
  update(id: number, request: UpdateVehicleLookupRequest): Promise<AdminLookupWriteResponse>;
  activate(id: number): Promise<AdminLookupWriteResponse>;
  deactivate(id: number): Promise<AdminLookupWriteResponse>;
  delete(id: number): Promise<void>;
}

interface LookupCatalogPanelProps {
  /** [en, ar] page title, e.g. ["Vehicle Makes", "ماركات المركبات"] */
  title: [string, string];
  /** [en, ar] subtitle under the title. */
  subtitle: [string, string];
  /** [en, ar] singular entity name used in toasts/labels, e.g. ["vehicle make", "الماركة"] */
  entityName: [string, string];
  service: LookupCatalogService;
}

interface FormState {
  nameAr: string;
  nameEn: string;
  sortOrder: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = { nameAr: "", nameEn: "", sortOrder: "", isActive: true };

export function LookupCatalogPanel({ title, subtitle, entityName, service }: LookupCatalogPanelProps) {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const { showToast } = useToast();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pageNumber, setPageNumber] = useState(1);
  const [items, setItems] = useState<AdminLookupItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowActionId, setRowActionId] = useState<number | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminLookupItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminLookupItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const entity = T(entityName[0], entityName[1], ar);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const load = useCallback(async (page: number, search: string, isActive: boolean | null) => {
    setLoading(true);
    setError(null);
    try {
      const response = await service.search({
        search: search.trim(),
        isActive: isActive ?? undefined,
        pageNumber: page,
        pageSize: PAGE_SIZE,
      });
      const res = response as
        | { items?: AdminLookupItem[]; totalCount?: number; data?: { items?: AdminLookupItem[]; totalCount?: number } | AdminLookupItem[] }
        | AdminLookupItem[]
        | undefined;
      const dataObj = !Array.isArray(res) && res && !Array.isArray(res.data) ? res.data : undefined;
      const list: AdminLookupItem[] = Array.isArray(res)
        ? res
        : res?.items ?? (Array.isArray(res?.data) ? res.data : dataObj?.items) ?? [];
      setItems(list.map((item) => ({ ...item, isActive: item.isActive !== false })));
      setTotalCount((!Array.isArray(res) ? res?.totalCount ?? dataObj?.totalCount : undefined) ?? list.length);
    } catch (err) {
      setError(describeApiError(err, ar, T("Failed to load the catalog", "فشل تحميل القائمة", ar)));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [service, ar]);

  useEffect(() => {
    const isActive = statusFilter === "all" ? null : statusFilter === "active";
    const timer = setTimeout(() => {
      setPageNumber(1);
      load(1, query, isActive);
    }, 350);
    return () => clearTimeout(timer);
  }, [query, statusFilter, load]);

  function goToPage(page: number) {
    const next = Math.min(Math.max(1, page), totalPages);
    setPageNumber(next);
    load(next, query, statusFilter === "all" ? null : statusFilter === "active");
  }

  // Write responses carry { synced, failedTenants } — surface partial syncs
  // instead of reporting unconditional success.
  function reportSync(res: AdminLookupWriteResponse | undefined, successEn: string, successAr: string) {
    const failed = res?.failedTenants;
    const failedCount = Array.isArray(failed) ? failed.length : typeof failed === "number" ? failed : 0;
    if (failedCount > 0) {
      showToast(
        T(
          `${successEn} — but ${failedCount} office(s) could not be synced.`,
          `${successAr} — لكن تعذّرت المزامنة مع ${failedCount} مكتب.`,
          ar,
        ),
        "error",
      );
    } else {
      showToast(T(successEn, successAr, ar));
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(item: AdminLookupItem) {
    setEditing(item);
    setForm({
      nameAr: item.nameAr ?? "",
      nameEn: item.nameEn ?? "",
      sortOrder: item.sortOrder !== undefined ? String(item.sortOrder) : "",
      isActive: item.isActive !== false,
    });
    setFormOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      nameAr: form.nameAr.trim(),
      nameEn: form.nameEn.trim(),
      sortOrder: form.sortOrder.trim() ? Number(form.sortOrder) : undefined,
      isActive: form.isActive,
    };
    setSaving(true);
    try {
      if (editing) {
        const res = await service.update(editing.id, payload);
        reportSync(res, "Changes saved and synced to all offices.", "تم حفظ التعديلات ومزامنتها مع كل المكاتب.");
      } else {
        const res = await service.create(payload);
        reportSync(res, `${entity} created and synced to all offices.`, `تم إنشاء ${entity} ومزامنته مع كل المكاتب.`);
      }
      setFormOpen(false);
      load(pageNumber, query, statusFilter === "all" ? null : statusFilter === "active");
    } catch (err) {
      showToast(describeApiError(err, ar, T("Save failed", "فشل الحفظ", ar)), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(item: AdminLookupItem) {
    setRowActionId(item.id);
    try {
      const res = item.isActive === false
        ? await service.activate(item.id)
        : await service.deactivate(item.id);
      reportSync(
        res,
        item.isActive === false ? `${entity} activated.` : `${entity} deactivated.`,
        item.isActive === false ? `تم تفعيل ${entity}.` : `تم إيقاف ${entity}.`,
      );
      load(pageNumber, query, statusFilter === "all" ? null : statusFilter === "active");
    } catch (err) {
      showToast(describeApiError(err, ar, T("Status update failed", "فشل تحديث الحالة", ar)), "error");
    } finally {
      setRowActionId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await service.delete(deleteTarget.id);
      showToast(T(`${entity} deleted.`, `تم حذف ${entity}.`, ar));
      setDeleteTarget(null);
      load(pageNumber, query, statusFilter === "all" ? null : statusFilter === "active");
    } catch (err) {
      showToast(describeApiError(err, ar, T("Delete failed", "فشل الحذف", ar)), "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <div className="mk-h4 text-mk-ink-900">{T(title[0], title[1], ar)}</div>
          <div className="mk-label text-mk-ink-500 mt-1">{T(subtitle[0], subtitle[1], ar)}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={loading} onClick={() => goToPage(pageNumber)}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {T("Refresh", "تحديث", ar)}
          </Button>
          <Button variant="primary" size="sm" onClick={openCreate}>
            <Plus size={14} />
            {T("Add new", "إضافة جديد", ar)}
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex-1 max-w-md">
          <Input
            variant="search"
            icon={<Search size={14} />}
            placeholder={T("Search by name or code…", "ابحث بالاسم أو الرمز…", ar)}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select
          variant="search"
          size="md"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); }}
        >
          <option value="all">{T("All statuses", "كل الحالات", ar)}</option>
          <option value="active">{T("Active", "نشط", ar)}</option>
          <option value="inactive">{T("Inactive", "غير نشط", ar)}</option>
        </Select>
      </div>

      <div className="rounded-xl overflow-hidden mk-surface">
        <Table>
          <thead>
            <tr>
              {[
                T("Code", "الرمز", ar),
                T("Name (AR)", "الاسم (عربي)", ar),
                T("Name (EN)", "الاسم (إنجليزي)", ar),
                T("Order", "الترتيب", ar),
                T("Status", "الحالة", ar),
                "",
              ].map((h, i) => <Th key={i}>{h}</Th>)}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <Td colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center gap-3 text-mk-ink-400">
                    <Loader2 size={32} className="animate-spin" />
                    <span className="mk-label">{T("Loading…", "جاري التحميل…", ar)}</span>
                  </div>
                </Td>
              </tr>
            ) : error ? (
              <tr>
                <Td colSpan={6} className="text-center py-12 text-mk-danger">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <FileWarning size={32} strokeWidth={1.5} />
                    <span className="mk-label">{error}</span>
                  </div>
                </Td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <Td colSpan={6} className="text-center py-12 text-mk-ink-400">
                  {T("No records found", "لا توجد سجلات", ar)}
                </Td>
              </tr>
            ) : (
              items.map((item) => {
                const active = item.isActive !== false;
                const busy = rowActionId === item.id;
                return (
                  <tr key={String(item.id)} className="hover:bg-mk-ink-50 transition-colors">
                    <Td className="font-mono mk-label text-mk-ink-500">{item.code ?? "—"}</Td>
                    <Td className="mk-label text-mk-ink-900">{item.nameAr ?? "—"}</Td>
                    <Td className="mk-label text-mk-ink-900">{item.nameEn ?? "—"}</Td>
                    <Td className="mk-label text-mk-ink-700">{item.sortOrder ?? "—"}</Td>
                    <Td>
                      <Badge variant={active ? "success" : "neutral"} dot>
                        {active ? T("Active", "نشط", ar) : T("Inactive", "غير نشط", ar)}
                      </Badge>
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <IconButton size="sm" variant="ghost" onClick={() => openEdit(item)} aria-label={T("Edit", "تعديل", ar)}>
                          <Pencil size={14} />
                        </IconButton>
                        <IconButton
                          size="sm"
                          variant={active ? "ghost" : "active"}
                          disabled={busy}
                          onClick={() => handleToggleActive(item)}
                          aria-label={active ? T("Deactivate", "إيقاف", ar) : T("Activate", "تفعيل", ar)}
                        >
                          {busy ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
                        </IconButton>
                        <IconButton
                          size="sm"
                          variant="ghost"
                          className="hover:text-mk-danger"
                          onClick={() => setDeleteTarget(item)}
                          aria-label={T("Delete", "حذف", ar)}
                        >
                          <Trash2 size={14} />
                        </IconButton>
                      </div>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </div>

      {totalCount > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4">
          <div className="mk-caption text-mk-ink-500">
            {T(`Page ${pageNumber} of ${totalPages} · ${totalCount} records`, `صفحة ${pageNumber} من ${totalPages} · ${totalCount} سجل`, ar)}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={pageNumber <= 1 || loading} onClick={() => goToPage(pageNumber - 1)}>
              <ChevronLeft size={14} />
              {T("Previous", "السابق", ar)}
            </Button>
            <Button variant="outline" size="sm" disabled={pageNumber >= totalPages || loading} onClick={() => goToPage(pageNumber + 1)}>
              {T("Next", "التالي", ar)}
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        variant="centered"
        size="md"
        title={editing ? T("Edit", "تعديل", ar) : T("Add new", "إضافة جديد", ar)}
      >
        <form onSubmit={handleSave} className="p-4 sm:p-6 flex flex-col gap-4">
          <Input
            variant="muted"
            label={T("Name (Arabic)", "الاسم (عربي)", ar)}
            value={form.nameAr}
            onChange={(e) => setForm((p) => ({ ...p, nameAr: e.target.value }))}
            required
          />
          <Input
            variant="muted"
            label={T("Name (English)", "الاسم (إنجليزي)", ar)}
            value={form.nameEn}
            onChange={(e) => setForm((p) => ({ ...p, nameEn: e.target.value }))}
            required
          />
          <Input
            variant="muted"
            type="number"
            label={T("Sort order", "ترتيب العرض", ar)}
            value={form.sortOrder}
            onChange={(e) => setForm((p) => ({ ...p, sortOrder: e.target.value }))}
            className="font-mono"
          />
          <Toggle
            label={T("Active", "نشط", ar)}
            checked={form.isActive}
            onChange={(checked) => setForm((p) => ({ ...p, isActive: checked }))}
          />
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setFormOpen(false)}>
              {T("Cancel", "إلغاء", ar)}
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {editing ? T("Save changes", "حفظ التعديلات", ar) : T("Create", "إنشاء", ar)}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        variant="centered"
        size="sm"
        title={T("Confirm delete", "تأكيد الحذف", ar)}
      >
        <div className="p-4 sm:p-6 flex flex-col gap-4">
          <p className="mk-body-sm text-mk-ink-700">
            {T(
              `Delete "${deleteTarget ? (ar ? deleteTarget.nameAr : deleteTarget.nameEn) ?? "" : ""}" from the platform catalog and every office copy?`,
              `حذف "${deleteTarget?.nameAr ?? ""}" من القائمة العامة ومن كل نسخ المكاتب؟`,
              ar,
            )}
          </p>
          <p className="mk-caption text-mk-ink-500">
            {T(
              "The delete is blocked if any office still references this record.",
              "يُمنع الحذف إذا كان أي مكتب لا يزال يستخدم هذا السجل.",
              ar,
            )}
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>
              {T("Cancel", "إلغاء", ar)}
            </Button>
            <Button variant="danger" size="sm" disabled={deleting} onClick={handleDelete}>
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              {T("Delete", "حذف", ar)}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
