"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Puzzle } from "lucide-react";
import { useAdmin } from "@/contexts/AdminContext";
import { adminTenantService } from "@/lib/api-services";
import type { TenantFeature } from "@/lib/api-types";
import { Badge, Button, Toggle, useToast } from "@/components/ui";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

// Licensed modules the backend currently supports — merged with the API
// response so the toggles are rendered even when the list comes back empty.
const KNOWN_FEATURES: { code: string; name: [string, string]; description: [string, string] }[] = [
  {
    code: "ElmTajeer",
    name: ["Elm Tajeer", "تاجير (علم)"],
    description: [
      "Tajeer (Elm) rental compliance integration.",
      "تكامل تاجير (علم) للامتثال في التأجير.",
    ],
  },
];

export default function SuperAdminTenantFeaturesPage() {
  const { tenantId: tenantIdParam } = useParams<{ tenantId: string }>();
  const tenantId = Number(tenantIdParam);
  const { dir } = useAdmin();
  const { showToast } = useToast();
  const ar = dir === "rtl";

  const [features, setFeatures] = useState<TenantFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  async function loadFeatures() {
    if (!tenantId) return;
    setLoading(true);
    try {
      const response = await adminTenantService.getFeatures(tenantId);
      const raw = response?.features ?? response?.items ?? response?.data ?? response ?? [];
      const list: TenantFeature[] = (Array.isArray(raw) ? raw : []).map((f: any) => ({
        featureCode: f.featureCode ?? f.code ?? f.name,
        isEnabled: f.isEnabled ?? f.enabled ?? false,
      }));
      for (const known of KNOWN_FEATURES) {
        if (!list.some((f) => f.featureCode === known.code)) {
          list.push({ featureCode: known.code, isEnabled: false });
        }
      }
      setFeatures(list);
      setDirty(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : T("Failed to load features.", "فشل تحميل الميزات.", ar));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFeatures();
  }, [tenantId]);

  function toggleFeature(code: string, enabled: boolean) {
    setFeatures((prev) =>
      prev.map((f) => (f.featureCode === code ? { ...f, isEnabled: enabled } : f))
    );
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await adminTenantService.updateFeatures(tenantId, features);
      setDirty(false);
      showToast(T("Features updated.", "تم تحديث الميزات.", ar));
    } catch (err) {
      showToast(err instanceof Error ? err.message : T("Failed to update features.", "فشل تحديث الميزات.", ar));
    } finally {
      setSaving(false);
    }
  }

  const featureMeta = (code: string) => KNOWN_FEATURES.find((k) => k.code === code);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <div className="mk-h4 text-mk-ink-900">
            {T("Tenant features", "ميزات المستأجر", ar)} #{tenantId}
          </div>
          <div className="mk-label text-mk-ink-500 mt-1">
            {T(
              "Licensed modules for this tenant. Tajeer credentials are managed in tenant settings.",
              "الوحدات المرخصة لهذا المستأجر. تُدار بيانات اعتماد تاجير في إعدادات المستأجر.",
              ar
            )}
          </div>
        </div>
        <Button variant="primary" onClick={handleSave} disabled={saving || loading || !dirty}>
          {saving ? T("Saving...", "جاري الحفظ...", ar) : T("Save changes", "حفظ التغييرات", ar)}
        </Button>
      </div>

      <div className="rounded-xl overflow-hidden mk-surface divide-y divide-mk-ink-100">
        {loading ? (
          <div className="text-center py-12 text-mk-ink-400">
            <Loader2 size={32} className="animate-spin mx-auto mb-3" />
            {T("Loading...", "جاري التحميل...", ar)}
          </div>
        ) : features.length === 0 ? (
          <div className="text-center py-12 text-mk-ink-400">
            {T("No features available.", "لا توجد ميزات متاحة.", ar)}
          </div>
        ) : (
          features.map((feature) => {
            const meta = featureMeta(feature.featureCode);
            return (
              <div key={feature.featureCode} className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-lg bg-mk-blue-50 flex items-center justify-center shrink-0">
                  <Puzzle size={16} className="text-mk-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="mk-body text-mk-ink-900">
                      {meta ? T(meta.name[0], meta.name[1], ar) : feature.featureCode}
                    </span>
                    <Badge variant={feature.isEnabled ? "success" : "neutral"} dot>
                      {feature.isEnabled ? T("Enabled", "مفعّل", ar) : T("Disabled", "معطّل", ar)}
                    </Badge>
                  </div>
                  <div className="mk-caption text-mk-ink-500 mt-0.5">
                    {meta ? T(meta.description[0], meta.description[1], ar) : feature.featureCode}
                  </div>
                </div>
                <Toggle
                  checked={feature.isEnabled}
                  onChange={(enabled) => toggleFeature(feature.featureCode, enabled)}
                  disabled={saving}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
