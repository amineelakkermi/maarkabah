"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Pencil, Check, Loader2, RefreshCw } from "lucide-react";
import { useAdmin } from "@/contexts/AdminContext";
import { Button, Input, Badge, Table, Th, Td, Toggle, useToast } from "@/components/ui";
import { extendedCoverageService } from "@/lib/api-services";
import { describeApiError } from "@/lib/api-error-messages";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CoverageRow = any & {
  id: number;
  nameEn: string;
  nameAr: string;
  cost: number;
  sortOrder: number;
  isActive: boolean;
};

export default function ExtendedCoveragesSection() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const { showToast } = useToast();

  const [coverages, setCoverages] = useState<CoverageRow[]>([]);
  const [snapshot, setSnapshot] = useState<CoverageRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadCoverages = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await extendedCoverageService.search({ isActive: null, pageNumber: 1, pageSize: 100 });
      const items = response?.items ?? response?.data?.items ?? response?.data ?? response ?? [];
      const list: CoverageRow[] = (Array.isArray(items) ? items : []).map((item: CoverageRow) => ({
        ...item,
        id: Number(item.id),
        nameEn: String(item.nameEn ?? ""),
        nameAr: String(item.nameAr ?? ""),
        cost: Number(item.cost ?? 0),
        sortOrder: Number(item.sortOrder ?? 0),
        isActive: item.isActive !== false,
      }));
      setCoverages(list);
      setSnapshot(list.map((c) => ({ ...c })));
    } catch (err) {
      console.error("Error loading extended coverages:", err);
      setError(describeApiError(err, ar, T("Failed to load coverages", "فشل تحميل التغطيات", ar)));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCoverages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFieldChange = (id: number, field: "cost" | "sortOrder", value: number) =>
    setCoverages((cur) => cur.map((c) => (c.id === id ? { ...c, [field]: value } : c)));

  const handleToggleActive = (id: number) =>
    setCoverages((cur) => cur.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c)));

  const changed = coverages.filter(
    (c) => {
      const orig = snapshot.find((s) => s.id === c.id);
      return orig && (orig.cost !== c.cost || orig.sortOrder !== c.sortOrder || orig.isActive !== c.isActive);
    }
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(
        changed.map((c) =>
          extendedCoverageService.update(c.id, { cost: c.cost, sortOrder: c.sortOrder, isActive: c.isActive })
        )
      );
      showToast(T("Coverage packages updated", "تم تحديث باقات التغطية", ar));
      await loadCoverages();
      setEditing(false);
    } catch (err) {
      console.error("Error saving coverages:", err);
      showToast(describeApiError(err, ar, T("Failed to save changes", "فشل حفظ التغييرات", ar)), "error");
    } finally {
      setSaving(false);
    }
  };

  // Coverages are synced from Tajeer — the backend upserts by tajeerId and
  // preserves the locally-managed Cost. 400 ExtendedCoverage.TajeerSyncFailed
  // when the Elm/Tajeer integration isn't active.
  const handleSync = async () => {
    setSyncing(true);
    try {
      await extendedCoverageService.sync();
      showToast(T("Coverages synced from Tajeer", "تمت مزامنة التغطيات من تاجير", ar));
      await loadCoverages();
    } catch (err) {
      console.error("Error syncing coverages:", err);
      showToast(describeApiError(err, ar, T("Tajeer sync failed", "فشلت المزامنة مع تاجير", ar)), "error");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-mk-blue-500" />
          <span className="mk-h4 text-mk-ink-900">{T("Extended coverage", "التغطية الإضافية", ar)}</span>
        </div>
        {editing ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => { setCoverages(snapshot.map((c) => ({ ...c }))); setEditing(false); }} disabled={saving}>
              {T("Cancel", "إلغاء", ar)}
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving || changed.length === 0}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {T("Save", "حفظ", ar)}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleSync} disabled={syncing}>
              {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              {T("Sync from Tajeer", "مزامنة من تاجير", ar)}
            </Button>
            <Button variant="primary" onClick={() => setEditing(true)}>
              <Pencil size={13} />{T("Edit", "تعديل", ar)}
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-xl overflow-hidden mk-surface">
        <Table>
          <thead>
            <tr>
              {[
                T("Coverage", "التغطية", ar),
                T("Cost (SAR)", "التكلفة (ريال)", ar),
                T("Sort order", "الترتيب", ar),
                T("Active", "نشط", ar),
              ].map((h, i) => <Th key={i}>{h}</Th>)}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <Td colSpan={4} className="text-center py-14">
                  <div className="flex flex-col items-center justify-center gap-3 text-mk-ink-400">
                    <Loader2 size={32} className="animate-spin" />
                    <span className="mk-label">{T("Loading coverages…", "جاري تحميل التغطيات…", ar)}</span>
                  </div>
                </Td>
              </tr>
            ) : error ? (
              <tr>
                <Td colSpan={4} className="text-center py-14">
                  <div className="flex flex-col items-center justify-center gap-3 text-mk-danger">
                    <span className="mk-label">{error}</span>
                    <Button variant="outline" onClick={loadCoverages}>{T("Retry", "إعادة المحاولة", ar)}</Button>
                  </div>
                </Td>
              </tr>
            ) : coverages.length === 0 ? (
              <tr>
                <Td colSpan={4} className="text-center py-14">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="mk-label text-mk-ink-400">{T("No coverage packages — sync from Tajeer to load them", "لا توجد باقات تغطية — زامن من تاجير لتحميلها", ar)}</span>
                  </div>
                </Td>
              </tr>
            ) : (
              coverages.map((c) => (
                <tr key={c.id} className="transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50">
                  <Td>
                    <div className="flex items-center gap-3">
                      <ShieldCheck size={16} className="text-mk-blue-500 shrink-0" />
                      <div>
                        <div className="mk-label text-mk-ink-900">{ar ? c.nameAr || c.nameEn : c.nameEn || c.nameAr}</div>
                        {c.tajeerId != null && (
                          <Badge variant="neutral" className="normal-case tracking-normal mt-1">
                            {T(`Tajeer #${c.tajeerId}`, `تاجير #${c.tajeerId}`, ar)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Td>
                  <Td>
                    {editing ? (
                      <Input
                        variant="muted"
                        type="number"
                        min={0}
                        className="w-28"
                        value={c.cost}
                        onChange={(e) => handleFieldChange(c.id, "cost", Math.max(0, Number(e.target.value) || 0))}
                      />
                    ) : (
                      <span className="mk-label text-mk-ink-900">{c.cost.toLocaleString()} {T("SAR", "ريال", ar)}</span>
                    )}
                  </Td>
                  <Td>
                    {editing ? (
                      <Input
                        variant="muted"
                        type="number"
                        min={0}
                        className="w-24"
                        value={c.sortOrder}
                        onChange={(e) => handleFieldChange(c.id, "sortOrder", Math.max(0, Number(e.target.value) || 0))}
                      />
                    ) : (
                      <span className="mk-label text-mk-ink-700">{c.sortOrder}</span>
                    )}
                  </Td>
                  <Td>
                    {editing ? (
                      <Toggle checked={c.isActive} onChange={() => handleToggleActive(c.id)} />
                    ) : (
                      <Badge variant={c.isActive ? "success" : "neutral"} dot className="normal-case tracking-normal">
                        {c.isActive ? T("Active", "نشطة", ar) : T("Inactive", "غير نشطة", ar)}
                      </Badge>
                    )}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
