"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Clock, HelpCircle, Loader2, CheckCircle2, XCircle, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { Avatar, Badge, Button, Input, Select, Toggle, Table, Th, Td, Tabs } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { Permission, type PermissionRequirement } from "@/lib/permissions";
import { tajeerVerifyOffice } from "@/lib/tajeer";
import { BranchesPanel } from "@/components/admin/BranchesPanel";
import { StaffRolesPanel } from "@/components/admin/StaffRolesPanel";
import { RolesPermissionsPanel } from "@/components/admin/RolesPermissionsPanel";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

type SettingsTab = "profile" | "system" | "branches" | "staff" | "roles";
const SETTINGS_TABS: SettingsTab[] = ["profile", "system", "branches", "staff", "roles"];

// Same permissions the standalone /branches, /staff and /roles routes
// required — a tab is only offered when its old page would have been.
const TAB_PERMISSION: Partial<Record<SettingsTab, PermissionRequirement>> = {
  branches: Permission.Branches.View,
  staff: Permission.Users.View,
  roles: Permission.Roles.View,
};

function isSettingsTab(v: string | null): v is SettingsTab {
  return !!v && (SETTINGS_TABS as string[]).includes(v);
}

const TIMEZONE_OPTIONS = [
  { value: "Asia/Riyadh", en: "Arabia Standard Time (AST) · UTC+03:00", ar: "توقيت السعودية (AST) · UTC+03:00" },
  { value: "Asia/Dubai", en: "Gulf Standard Time (GST) · UTC+04:00", ar: "توقيت الخليج (GST) · UTC+04:00" },
];

function SettingsRow({ title, sub, hint, children }: { title: string; sub?: string; hint?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-3 md:gap-6 py-5 border-b border-mk-ink-100 last:border-none">
      <div>
        <div className="flex items-center gap-1.5 mk-label text-mk-ink-900">
          {title}
          {hint && <HelpCircle size={13} className="text-mk-ink-300" />}
        </div>
        {sub && <p className="mk-caption text-mk-ink-400 mt-1">{sub}</p>}
      </div>
      <div className="max-w-[520px]">{children}</div>
    </div>
  );
}

function SettingsContent() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const { hasPermission } = usePermissions();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initialTab = searchParams.get("tab");

  // ── Tabs ─────────────────────────────────────────────────
  // Only offer the tabs whose old standalone route the user could reach.
  const visibleTabs = SETTINGS_TABS.filter((t) => {
    const req = TAB_PERMISSION[t];
    return req === undefined || hasPermission(req);
  });
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    isSettingsTab(initialTab) && visibleTabs.includes(initialTab) ? initialTab : "profile"
  );

  // Keep `?tab=` in sync so the URL is shareable and the old /branches,
  // /roles and /staff redirects land on the right tab.
  useEffect(() => {
    const current = searchParams.get("tab");
    if (current === activeTab || (activeTab === "profile" && !current)) return;
    const params = new URLSearchParams(searchParams.toString());
    if (activeTab === "profile") params.delete("tab"); else params.set("tab", activeTab);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [activeTab, pathname, router, searchParams]);

  // ── Office profile ──────────────────────────────────────
  const [tenantId] = useState("MK-100234");
  const [officeName, setOfficeName] = useState("مركبة — الرياض");
  const [tagline, setTagline] = useState(T("Cloud fleet & rental management for Saudi car rental offices.", "منصة سحابية لإدارة الأسطول والتأجير لمكاتب تأجير السيارات في السعودية.", ar));
  const [adminFirstName, setAdminFirstName] = useState("Abdullah");
  const [adminLastName, setAdminLastName] = useState("Al-Otaibi");
  const [adminEmail, setAdminEmail] = useState("abdullah.otaibi@maarkbh.sa");
  const [timezone, setTimezone] = useState("Asia/Riyadh");
  const [supportEmail, setSupportEmail] = useState("support@maarkbh.sa");
  const [supportAddress, setSupportAddress] = useState(T("Olaya District, Riyadh 12213", "حي العليا، الرياض 12213", ar));
  const [supportPhone, setSupportPhone] = useState("+966 55 000 1234");
  const [supportWhatsapp, setSupportWhatsapp] = useState("+966 55 000 1234");
  const [profileSaved, setProfileSaved] = useState(false);

  // ── System settings ──────────────────────────────────────
  const [taxNumber, setTaxNumber] = useState("310123456700003");
  const [crNumber, setCrNumber] = useState("");
  const [taxRate, setTaxRate] = useState("15");
  // ── Tajeer platform account — every office registers its own app-id/app-key/
  // client-id via the Rabet portal, plus an Authorization token generated
  // from the Tajeer portal itself. See Maarkbh_Tajeer_Integration_Analysis.md.
  const [tajeerClientId, setTajeerClientId] = useState("");
  const [tajeerAppId, setTajeerAppId] = useState("");
  const [tajeerAppKey, setTajeerAppKey] = useState("");
  const [tajeerAuthToken, setTajeerAuthToken] = useState("");
  const [showTajeerSecrets, setShowTajeerSecrets] = useState(false);
  const [tajeerVerifyStatus, setTajeerVerifyStatus] = useState<"idle" | "verifying" | "verified" | "error">("idle");
  const [tajeerVerifyError, setTajeerVerifyError] = useState<string | null>(null);
  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [contractAutoCancel, setContractAutoCancel] = useState("12");
  const [lateFeeGrace, setLateFeeGrace] = useState("1");
  const [otpResendLimit, setOtpResendLimit] = useState("3");
  const [otpLockout, setOtpLockout] = useState("15");
  const [otpValidity, setOtpValidity] = useState("5");
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [senderIds, setSenderIds] = useState([
    { id: "MAARKBH", enabled: true },
    { id: "MAARKBH-AR", enabled: false },
  ]);
  const [systemSaved, setSystemSaved] = useState(false);

  const TAGLINE_MAX = 140;

  function handleSaveProfile() {
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 1800);
  }

  async function handleVerifyTajeer() {
    setTajeerVerifyStatus("verifying");
    setTajeerVerifyError(null);
    const result = await tajeerVerifyOffice({
      crNumber,
      clientId: tajeerClientId,
      appId: tajeerAppId,
      appKey: tajeerAppKey,
      authToken: tajeerAuthToken,
    });
    if (result.verified) {
      setTajeerVerifyStatus("verified");
    } else {
      setTajeerVerifyStatus("error");
      setTajeerVerifyError(result.message ?? null);
    }
  }

  async function handleSaveSystem() {
    // Any Tajeer credential filled in → re-verify the office with Tajeer as
    // part of saving, so a stale/never-checked connection can't silently
    // sit there looking fine.
    if (tajeerClientId || tajeerAppId || tajeerAppKey || tajeerAuthToken) {
      await handleVerifyTajeer();
    }
    setSystemSaved(true);
    setTimeout(() => setSystemSaved(false), 1800);
  }

  function toggleSender(id: string) {
    setSenderIds((prev) => prev.map((s) => s.id === id ? { ...s, enabled: !s.enabled } : s));
  }

  const wide = activeTab === "staff" || activeTab === "roles" || activeTab === "branches";

  const TAB_LABELS: Record<SettingsTab, { en: string; ar: string }> = {
    profile: { en: "General Settings (Not ready)", ar: "إعدادات عامة (غير مكتمل)" },
    system: { en: "System (Not ready)", ar: "النظام (غير مكتمل)" },
    branches: { en: "Branches", ar: "الفروع" },
    staff: { en: "Staff", ar: "الفريق" },
    roles: { en: "Roles & Permissions", ar: "الأدوار والصلاحيات" },
  };

  return (
    <div className={`flex flex-col gap-4 ${wide ? "" : "max-w-[900px]"}`}>
      <div className="overflow-x-auto mk-scrollbar-none">
        <Tabs
          variant="default"
          rounded="full"
          className="w-max mk-view-toggle--reversed flex-nowrap!"
          value={activeTab}
          onChange={(v) => setActiveTab(v as SettingsTab)}
          items={visibleTabs.map((t) => ({ value: t, label: T(TAB_LABELS[t].en, TAB_LABELS[t].ar, ar) }))}
        />
      </div>

      {/* ── Office Profile ──────────────────────────────────── */}
      {activeTab === "profile" && (
      <div className="rounded-card mk-surface overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-mk-ink-100">
          <div>
            <div className="mk-h4 text-mk-ink-900">{T("Office Profile", "ملف المكتب", ar)}</div>
            <p className="mk-caption text-mk-ink-500 mt-1">{T("Update your office details, admin info, and support contacts.", "تحديث بيانات المكتب والمسؤول ووسائل التواصل الخاصة بالدعم.", ar)}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm">{T("Cancel", "إلغاء", ar)}</Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveProfile}
              className={profileSaved ? "bg-mk-mint-500 hover:bg-mk-mint-500" : ""}
            >
              {profileSaved ? T("Saved!", "تم الحفظ!", ar) : T("Save Changes", "حفظ التعديلات", ar)}
            </Button>
          </div>
        </div>

        <div className="px-6">
          <SettingsRow title={T("Tenant ID", "رقم المشترك", ar)} sub={T("Unique number for your subscription", "الرقم الفريد لاشتراكك", ar)}>
            <Input variant="muted" className="font-mono text-mk-ink-400" value={tenantId} readOnly />
          </SettingsRow>

          <SettingsRow title={T("Public Profile", "الملف العام", ar)} sub={T("This will be displayed across the platform.", "سيظهر هذا الاسم عبر المنصة.", ar)}>
            <Input variant="muted" value={officeName} onChange={(e) => setOfficeName(e.target.value)} />
          </SettingsRow>

          <SettingsRow title={T("Tagline", "الوصف المختصر", ar)} sub={T("A quick snapshot of your office.", "نبذة سريعة عن مكتبك.", ar)}>
            <textarea
              rows={3}
              maxLength={TAGLINE_MAX}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full px-3 py-2.5 rounded-md mk-body-sm outline-none bg-white border border-mk-ink-200 text-mk-ink-900 focus:border-mk-blue-500 focus:shadow-[0_0_0_3px_rgba(65,113,226,0.15)] transition-all resize-none"
            />
            <p className="mk-overline text-mk-ink-400 mt-1.5">{T(`${TAGLINE_MAX - tagline.length} characters left`, `${TAGLINE_MAX - tagline.length} حرف متبقي`, ar)}</p>
          </SettingsRow>

          <SettingsRow title={T("Tax Info", "بيانات الضريبة", ar)} sub={T("VAT registration number and rate settings.", "الرقم الضريبي ونسبة ضريبة القيمة المضافة.", ar)}>
            <div className="flex flex-col gap-3">
              <div className="flex items-center rounded-md border border-mk-ink-100 bg-mk-ink-50 overflow-hidden focus-within:border-mk-blue-500 focus-within:shadow-[0_0_0_3px_rgba(65,113,226,0.15)] transition-all">
                <span className="mk-caption text-mk-ink-400 px-3 border-e border-mk-ink-100 shrink-0">{T("VAT Number", "الرقم الضريبي", ar)}</span>
                <input className="flex-1 h-11 px-3 mk-body-sm outline-none border-0 bg-transparent font-mono" value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} />
              </div>
              <div className="flex items-center rounded-md border border-mk-ink-100 bg-mk-ink-50 overflow-hidden focus-within:border-mk-blue-500 focus-within:shadow-[0_0_0_3px_rgba(65,113,226,0.15)] transition-all">
                <span className="mk-caption text-mk-ink-400 px-3 border-e border-mk-ink-100 shrink-0">{T("VAT Rate", "نسبة الضريبة", ar)}</span>
                <input className="flex-1 h-11 px-3 mk-body-sm outline-none border-0 bg-transparent font-mono" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
                <span className="mk-caption text-mk-ink-400 px-3">%</span>
              </div>
              <div className="flex items-center rounded-md border border-mk-ink-100 bg-mk-ink-50 overflow-hidden focus-within:border-mk-blue-500 focus-within:shadow-[0_0_0_3px_rgba(65,113,226,0.15)] transition-all">
                <span className="mk-caption text-mk-ink-400 px-3 border-e border-mk-ink-100 shrink-0">{T("CR Number", "السجل التجاري", ar)}</span>
                <input
                  className="flex-1 h-11 px-3 mk-body-sm outline-none border-0 bg-transparent font-mono"
                  placeholder="7001234567"
                  value={crNumber}
                  onChange={(e) => { setCrNumber(e.target.value); setTajeerVerifyStatus("idle"); }}
                />
              </div>
              <p className="mk-overline text-mk-ink-400">{T("Used to verify your office with Tajeer and fetch its registered branches.", "يُستخدم للتحقق من مكتبك في تاجير وجلب الفروع المسجّلة له.", ar)}</p>
            </div>
          </SettingsRow>

          <SettingsRow title={T("Name", "الاسم", ar)} sub={T("Admin info displayed on your profile.", "بيانات المسؤول المعروضة في ملفك.", ar)}>
            <div className="flex gap-3">
              <div className="flex-1 min-w-0"><Input variant="muted" value={adminFirstName} onChange={(e) => setAdminFirstName(e.target.value)} placeholder={T("First name", "الاسم الأول", ar)} /></div>
              <div className="flex-1 min-w-0"><Input variant="muted" value={adminLastName} onChange={(e) => setAdminLastName(e.target.value)} placeholder={T("Last name", "اسم العائلة", ar)} /></div>
            </div>
          </SettingsRow>

          <SettingsRow title={T("Email", "البريد الإلكتروني", ar)}>
            <div className="relative flex items-center">
              <div className="flex-1 min-w-0">
                <Input
                  type="email"
                  variant="muted"
                  style={{ paddingInlineEnd: 90 }}
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                />
              </div>
              <div className="absolute end-3">
                <Badge variant="success" className="mk-overline py-1 px-2 leading-none">{T("Verified", "موثّق", ar)}</Badge>
              </div>
            </div>
          </SettingsRow>

          <SettingsRow title={T("Role", "الدور", ar)} hint>
            <div className="flex items-center gap-2 h-11 px-3 rounded-md bg-mk-ink-50 text-mk-ink-500 mk-body-sm">
              <Avatar name="Owner" size="sm" />
              {T("Owner · Full access", "المالك · صلاحية كاملة", ar)}
            </div>
          </SettingsRow>

          <SettingsRow title={T("Timezone", "المنطقة الزمنية", ar)} hint>
            <div className="relative">
              <Select value={timezone} onChange={(e) => setTimezone(e.target.value)} variant="muted" className="ps-9">
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz.value} value={tz.value}>{ar ? tz.ar : tz.en}</option>
                ))}
              </Select>
              <Clock size={14} className="absolute top-1/2 -translate-y-1/2 start-3 text-mk-ink-400 pointer-events-none" />
            </div>
          </SettingsRow>

          <SettingsRow title={T("Support Info", "بيانات الدعم", ar)} sub={T("Contact details shown to your team & customers.", "بيانات التواصل الظاهرة لفريقك وعملائك.", ar)}>
            <div className="flex flex-col gap-3">
              <div className="flex items-center rounded-md border border-mk-ink-100 bg-mk-ink-50 overflow-hidden focus-within:border-mk-blue-500 focus-within:shadow-[0_0_0_3px_rgba(65,113,226,0.15)] transition-all">
                <span className="mk-caption text-mk-ink-400 px-3 border-e border-mk-ink-100 shrink-0">{T("Email", "البريد", ar)}</span>
                <input className="flex-1 h-11 px-3 mk-body-sm outline-none border-0 bg-transparent" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
              </div>
              <div className="flex items-center rounded-md border border-mk-ink-100 bg-mk-ink-50 overflow-hidden focus-within:border-mk-blue-500 focus-within:shadow-[0_0_0_3px_rgba(65,113,226,0.15)] transition-all">
                <span className="mk-caption text-mk-ink-400 px-3 border-e border-mk-ink-100 shrink-0">{T("Address", "العنوان", ar)}</span>
                <input className="flex-1 h-11 px-3 mk-body-sm outline-none border-0 bg-transparent" value={supportAddress} onChange={(e) => setSupportAddress(e.target.value)} />
              </div>
              <div className="flex items-center rounded-md border border-mk-ink-100 bg-mk-ink-50 overflow-hidden focus-within:border-mk-blue-500 focus-within:shadow-[0_0_0_3px_rgba(65,113,226,0.15)] transition-all">
                <span className="mk-caption text-mk-ink-400 px-3 border-e border-mk-ink-100 shrink-0">{T("Contact number", "رقم التواصل", ar)}</span>
                <input className="flex-1 h-11 px-3 mk-body-sm outline-none border-0 bg-transparent font-mono" value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} />
              </div>
              <div className="flex items-center rounded-md border border-mk-ink-100 bg-mk-ink-50 overflow-hidden focus-within:border-mk-blue-500 focus-within:shadow-[0_0_0_3px_rgba(65,113,226,0.15)] transition-all">
                <span className="mk-caption text-mk-ink-400 px-3 border-e border-mk-ink-100 shrink-0">{T("WhatsApp", "واتساب", ar)}</span>
                <input className="flex-1 h-11 px-3 mk-body-sm outline-none border-0 bg-transparent font-mono" value={supportWhatsapp} onChange={(e) => setSupportWhatsapp(e.target.value)} />
              </div>
            </div>
          </SettingsRow>
        </div>
      </div>
      )}

      {/* ── System Settings ─────────────────────────────────── */}
      {activeTab === "system" && (
      <div className="rounded-card mk-surface overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-mk-ink-100">
          <div>
            <div className="mk-h4 text-mk-ink-900">{T("System Settings", "إعدادات النظام", ar)}</div>
            <p className="mk-caption text-mk-ink-500 mt-1">{T("Update tax, timing, and platform-wide configuration.", "تحديث الضريبة والتوقيتات وإعدادات المنصة العامة.", ar)}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm">{T("Cancel", "إلغاء", ar)}</Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveSystem}
              className={systemSaved ? "bg-mk-mint-500 hover:bg-mk-mint-500" : ""}
            >
              {systemSaved ? T("Saved!", "تم الحفظ!", ar) : T("Save Changes", "حفظ التعديلات", ar)}
            </Button>
          </div>
        </div>

        <div className="px-6">
          <SettingsRow
            title={T("Tajeer API Connection", "ربط منصة تأجير", ar)}
            sub={T("Every office registers its own credentials via the Rabet portal to issue contracts through Tajeer.", "كل مكتب يسجّل بياناته الخاصة عبر بوابة رابط لإصدار العقود عبر تاجير.", ar)}
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center rounded-md border border-mk-ink-100 bg-mk-ink-50 overflow-hidden focus-within:border-mk-blue-500 focus-within:shadow-[0_0_0_3px_rgba(65,113,226,0.15)] transition-all">
                <span className="mk-caption text-mk-ink-400 px-3 border-e border-mk-ink-100 shrink-0">{T("Client ID", "معرّف العميل", ar)}</span>
                <input className="flex-1 h-11 px-3 mk-body-sm outline-none border-0 bg-transparent font-mono" placeholder="client-id" value={tajeerClientId} onChange={(e) => { setTajeerClientId(e.target.value); setTajeerVerifyStatus("idle"); }} />
              </div>
              <div className="flex items-center rounded-md border border-mk-ink-100 bg-mk-ink-50 overflow-hidden focus-within:border-mk-blue-500 focus-within:shadow-[0_0_0_3px_rgba(65,113,226,0.15)] transition-all">
                <span className="mk-caption text-mk-ink-400 px-3 border-e border-mk-ink-100 shrink-0">{T("App ID", "معرّف التطبيق", ar)}</span>
                <input className="flex-1 h-11 px-3 mk-body-sm outline-none border-0 bg-transparent font-mono" placeholder="app-id" value={tajeerAppId} onChange={(e) => { setTajeerAppId(e.target.value); setTajeerVerifyStatus("idle"); }} />
              </div>
              <div className="flex items-center rounded-md border border-mk-ink-100 bg-mk-ink-50 overflow-hidden focus-within:border-mk-blue-500 focus-within:shadow-[0_0_0_3px_rgba(65,113,226,0.15)] transition-all">
                <span className="mk-caption text-mk-ink-400 px-3 border-e border-mk-ink-100 shrink-0">{T("App Key", "مفتاح التطبيق", ar)}</span>
                <input
                  type={showTajeerSecrets ? "text" : "password"}
                  className="flex-1 h-11 px-3 mk-body-sm outline-none border-0 bg-transparent font-mono"
                  placeholder="app-key"
                  value={tajeerAppKey}
                  onChange={(e) => { setTajeerAppKey(e.target.value); setTajeerVerifyStatus("idle"); }}
                />
                <button
                  type="button"
                  onClick={() => setShowTajeerSecrets((s) => !s)}
                  className="px-3 h-11 flex items-center text-mk-ink-400 hover:text-mk-ink-700 bg-transparent border-0 cursor-pointer transition-colors shrink-0"
                  aria-label={showTajeerSecrets ? T("Hide secrets", "إخفاء البيانات السرية", ar) : T("Show secrets", "إظهار البيانات السرية", ar)}
                >
                  {showTajeerSecrets ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <div className="flex items-center rounded-md border border-mk-ink-100 bg-mk-ink-50 overflow-hidden focus-within:border-mk-blue-500 focus-within:shadow-[0_0_0_3px_rgba(65,113,226,0.15)] transition-all">
                <span className="mk-caption text-mk-ink-400 px-3 border-e border-mk-ink-100 shrink-0">{T("Authorization Token", "رمز التفويض", ar)}</span>
                <input
                  type={showTajeerSecrets ? "text" : "password"}
                  className="flex-1 h-11 px-3 mk-body-sm outline-none border-0 bg-transparent font-mono"
                  placeholder="Basic ••••••••"
                  value={tajeerAuthToken}
                  onChange={(e) => { setTajeerAuthToken(e.target.value); setTajeerVerifyStatus("idle"); }}
                />
              </div>
              <p className="mk-overline text-mk-ink-400">{T("Client ID / App ID / App Key come from the Rabet portal; the Authorization token is generated from the Tajeer portal itself. The CR number is set in General Settings.", "معرّف العميل ومعرّف ورمز التطبيق من بوابة رابط، ورمز التفويض يُولَّد من بوابة تاجير نفسها. رقم السجل التجاري يُضبط في إعدادات عامة.", ar)}</p>

              <div className="flex items-center justify-between gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleVerifyTajeer}
                  disabled={tajeerVerifyStatus === "verifying"}
                >
                  {tajeerVerifyStatus === "verifying" ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      {T("Verifying…", "جارِ التحقق…", ar)}
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} />
                      {T("Verify connection", "تحقّق من الربط", ar)}
                    </>
                  )}
                </Button>

                {tajeerVerifyStatus === "verified" && (
                  <span className="flex items-center gap-1.5 mk-label text-mk-mint-600">
                    <CheckCircle2 size={15} />
                    {T("Connected to Tajeer", "متصل بتاجير", ar)}
                  </span>
                )}
                {tajeerVerifyStatus === "error" && (
                  <span className="flex items-center gap-1.5 mk-label text-mk-danger">
                    <XCircle size={15} />
                    {tajeerVerifyError
                      ? T(`Verification failed — ${tajeerVerifyError}`, `فشل التحقق — ${tajeerVerifyError}`, ar)
                      : T("Verification failed", "فشل التحقق", ar)}
                  </span>
                )}
              </div>
            </div>
          </SettingsRow>

          <SettingsRow title={T("Session Timeout", "مهلة الجلسة", ar)} sub={T("Minutes of inactivity before automatic logout.", "عدد الدقائق قبل تسجيل الخروج التلقائي بسبب عدم النشاط.", ar)}>
            <div className="flex items-center gap-2">
              <Input type="number" variant="muted" className="max-w-[140px] font-mono" value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)} />
              <span className="mk-caption text-mk-ink-400">{T("minutes", "دقيقة", ar)}</span>
            </div>
          </SettingsRow>

          <SettingsRow title={T("Contract Auto-Cancel", "إلغاء العقد التلقائي", ar)} sub={T("Hours before an unsigned Tajeer contract is cancelled automatically.", "عدد الساعات قبل إلغاء عقد تاجير غير الموقّع تلقائياً.", ar)}>
            <div className="flex items-center gap-2">
              <Input type="number" variant="muted" className="max-w-[140px] font-mono" value={contractAutoCancel} onChange={(e) => setContractAutoCancel(e.target.value)} />
              <span className="mk-caption text-mk-ink-400">{T("hours", "ساعة", ar)}</span>
            </div>
          </SettingsRow>

          <SettingsRow title={T("Late Return Grace Period", "مهلة الإرجاع المتأخر", ar)} sub={T("Grace period before the late-return penalty starts accruing.", "المهلة قبل بدء احتساب غرامة التأخير.", ar)}>
            <div className="flex items-center gap-2">
              <Input type="number" variant="muted" className="max-w-[140px] font-mono" value={lateFeeGrace} onChange={(e) => setLateFeeGrace(e.target.value)} />
              <span className="mk-caption text-mk-ink-400">{T("hour(s)", "ساعة", ar)}</span>
            </div>
          </SettingsRow>

          <SettingsRow title={T("OTP Settings", "إعدادات رمز التحقق", ar)} sub={T("Resend limit, lockout, and validity window for customer OTP.", "حد إعادة الإرسال، مدة الإغلاق، وصلاحية رمز التحقق للعميل.", ar)}>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label={T("Resend limit", "حد الإعادة", ar)}
                type="number" variant="muted" className="font-mono" value={otpResendLimit} onChange={(e) => setOtpResendLimit(e.target.value)}
              />
              <Input
                label={T("Lockout (min)", "الإغلاق (د)", ar)}
                type="number" variant="muted" className="font-mono" value={otpLockout} onChange={(e) => setOtpLockout(e.target.value)}
              />
              <Input
                label={T("Validity (min)", "الصلاحية (د)", ar)}
                type="number" variant="muted" className="font-mono" value={otpValidity} onChange={(e) => setOtpValidity(e.target.value)}
              />
            </div>
          </SettingsRow>

          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-3 md:gap-6 py-5">
            <div>
              <div className="mk-label text-mk-ink-900">{T("SMS Control Settings", "إعدادات الرسائل النصية", ar)}</div>
              <p className="mk-caption text-mk-ink-400 mt-1">{T("Choose the sender name that appears on customers' phones.", "اختر اسم المرسل الذي يظهر على جوال العميل.", ar)}</p>
            </div>
            <div className="max-w-[520px] flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="mk-label text-mk-ink-900">{T("SMS Sending", "إرسال الرسائل النصية", ar)}</div>
                  <p className="mk-caption text-mk-ink-400 mt-1">{T("Enable or disable sending SMS messages to customers (payment links, OTP, alerts).", "تفعيل أو تعطيل إرسال الرسائل النصية للعملاء (روابط الدفع، رمز التحقق، التنبيهات).", ar)}</p>
                </div>
                <Toggle checked={smsEnabled} onChange={setSmsEnabled} />
              </div>

              <div className="rounded-md overflow-hidden border border-mk-ink-100">
                <Table>
                  <thead>
                    <tr>
                      <Th>{T("Sender ID", "معرّف المرسل", ar)}</Th>
                      <Th>{T("Status", "الحالة", ar)}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {senderIds.map((s) => (
                      <tr key={s.id}>
                        <Td className="font-mono mk-label text-mk-ink-900">{s.id}</Td>
                        <Td><Toggle checked={s.enabled} onChange={() => toggleSender(s.id)} disabled={!smsEnabled} size="sm" /></Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ── Branches / Staff / Roles — the existing pages, unchanged, rendered as tabs ── */}
      {activeTab === "branches" && <BranchesPanel />}
      {activeTab === "staff" && <StaffRolesPanel />}
      {activeTab === "roles" && <RolesPermissionsPanel />}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-mk-ink-500">Loading…</div>}>
      <SettingsContent />
    </Suspense>
  );
}
