"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KeyRound, ParkingCircle, ClockAlert, ShieldCheck, Undo2, Lightbulb, CarFront, FileText, CheckCircle2, X } from "lucide-react";
import { KpiCard, AlertBanner, Button } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import type { Car as CarType } from "@/lib/data";
import { MapModal } from "@/components/employee/MapModal";
import { dashboardService } from "@/lib/api-services";
import { ApiError } from "@/lib/api-client";
import { normalizeToday, type TodayData } from "@/lib/dashboard";

const T = (en: string, ar: string, isAr: boolean) => isAr ? ar : en;

type FleetAlertKind = "danger" | "warning" | "info" | "success";

const ALERT_KIND_STYLE: Record<FleetAlertKind, { icon: string; border: string }> = {
  danger: { icon: "text-mk-danger", border: "var(--color-mk-danger)" },
  warning: { icon: "text-mk-warning", border: "var(--color-mk-warning)" },
  info: { icon: "text-mk-blue-500", border: "var(--color-mk-blue-500)" },
  success: { icon: "text-mk-mint-600", border: "var(--color-mk-mint-600)" },
};

const ALERT_KIND_ICON = {
  danger: ClockAlert,
  warning: FileText,
  info: ShieldCheck,
  success: CheckCircle2,
} as const;

const BRANCH_FLEET_META: Record<string, { en: string; ar: string; colorClass: string }> = {
  available:   { en: "Available now",   ar: "متاحة الآن",      colorClass: "bg-mk-mint-600" },
  rented:      { en: "Out on rental",   ar: "قيد الإيجار",     colorClass: "bg-mk-blue-500" },
  reserved:    { en: "Reserved · today",ar: "محجوزة · اليوم",  colorClass: "bg-mk-violet-500" },
  maintenance: { en: "In maintenance",  ar: "قيد الصيانة",     colorClass: "bg-mk-warning" },
};

function branchFleetMeta(key: string) {
  const k = key.toLowerCase().replace(/[\s_-]/g, "");
  return BRANCH_FLEET_META[k] ?? { en: key, ar: key, colorClass: "bg-mk-ink-400" };
}

function fmtClock(iso: string | undefined, ar: boolean): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString(ar ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" });
}

export default function EmpTodayPage() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const [selectedCarForMap, setSelectedCarForMap] = useState<CarType | null>(null);
  const [showAllGarageMap, setShowAllGarageMap] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [data, setData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"forbidden" | "generic" | null>(null);

  useEffect(() => {
    let cancelled = false;
    dashboardService
      .today({ branchId: null })
      .then((res) => { if (!cancelled) { setData(normalizeToday(res)); setError(null); } })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError && err.status === 403 ? "forbidden" : "generic");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const visibleAlerts = (data?.alerts ?? []).filter((a) => !dismissedAlerts.includes(a.id));
  const dismissAlert = (id: string) => setDismissedAlerts((prev) => [...prev, id]);

  const queue = data?.queue ?? [];
  const branchFleet = data?.branchFleet ?? [];

  return (
    <div>
      {/* Alert banner — shift briefing built from backend counts */}
      {data?.briefing && data.briefing.taskCount > 0 ? (
        <AlertBanner
          kind="info"
          title={T(
            `${data.briefing.taskCount} task${data.briefing.taskCount > 1 ? "s" : ""} in your queue today`,
            `${data.briefing.taskCount} ${data.briefing.taskCount > 1 ? "مهام" : "مهمة"} في قائمتك اليوم`,
            ar,
          )}
          sub={[
            T(`${data.briefing.pickupCount} pickup${data.briefing.pickupCount !== 1 ? "s" : ""}`, `${data.briefing.pickupCount} تسليم`, ar),
            T(`${data.briefing.returnCount} return${data.briefing.returnCount !== 1 ? "s" : ""}`, `${data.briefing.returnCount} إرجاع`, ar),
            data.briefing.pendingKycCount > 0
              ? T(`${data.briefing.pendingKycCount} pending KYC`, `${data.briefing.pendingKycCount} هوية معلّقة`, ar)
              : null,
          ].filter(Boolean).join(" · ")}
          dismissible={false}
        />
      ) : error === "forbidden" ? (
        <AlertBanner
          kind="warning"
          title={T("You don't have access to the today view", "ليس لديك صلاحية عرض مهام اليوم", ar)}
          sub={T("This endpoint requires the Permissions.Dashboard.View permission — ask an admin to grant it to your role.", "هذا المورد يتطلب صلاحية Permissions.Dashboard.View — اطلب من المسؤول منحها لدورك.", ar)}
        />
      ) : error ? (
        <AlertBanner
          kind="warning"
          title={T("Couldn't load today's briefing", "تعذّر تحميل مهام اليوم", ar)}
          sub={T("Check your connection and try again.", "تحقق من الاتصال ثم أعد المحاولة.", ar)}
        />
      ) : null}

      {/* Main + side columns, aligned from the KPI row down */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        {/* Main column: KPIs + quick actions + queue + tip */}
        <div className="flex flex-col gap-6">
          {/* KPI row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              icon={KeyRound}
              value={loading ? "—" : String(data?.pickupsToday ?? 0)}
              label={T("Pickups today", "تسليمات اليوم", ar)}
              sub={data?.nextPickupLabel ? T(`Next at ${fmtClock(data.nextPickupLabel, ar)}`, `التالي في ${fmtClock(data.nextPickupLabel, ar)}`, ar) : undefined}
              kind="default"
            />
            <KpiCard
              icon={ParkingCircle}
              value={loading ? "—" : String(data?.returnsToday ?? 0)}
              label={T("Returns today", "إرجاعات اليوم", ar)}
              sub={data?.earliestReturnLabel ? T(`Earliest ${fmtClock(data.earliestReturnLabel, ar)}`, `الأبكر ${fmtClock(data.earliestReturnLabel, ar)}`, ar) : undefined}
              kind="mint"
            />
            <KpiCard
              icon={ClockAlert}
              value={loading ? "—" : String(data?.overdueNow ?? 0)}
              label={T("Overdue right now", "متأخر الآن", ar)}
              kind="alert"
            />
          </div>

          {/* Queue */}
          <div className="rounded-xl p-6 bg-white shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="mk-h4 flex-1 text-mk-ink-900 tracking-tight">
                {T("Your queue · today", "المهام · اليوم", ar)}
              </div>
              <span className="mk-caption text-mk-ink-500">{T("Sorted by time", "مرتب حسب الوقت", ar)}</span>
            </div>
            <div className="flex flex-col gap-3">
              {loading ? (
                <div className="py-8 text-center mk-body-sm text-mk-ink-400">{T("Loading…", "جارٍ التحميل…", ar)}</div>
              ) : queue.length === 0 ? (
                <div className="py-8 text-center mk-body-sm text-mk-ink-400">
                  {T("No pickups or returns scheduled today.", "لا تسليمات أو إرجاعات مجدولة اليوم.", ar)}
                </div>
              ) : (
                queue.map((task) => (
                  <div
                    key={task.id}
                    className={`flex flex-wrap items-center gap-3 rounded-lg px-5 py-4 bg-white border border-mk-ink-100 cursor-pointer transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50 ${task.urgent ? "shadow-[var(--shadow-urgent)]" : "shadow-[var(--shadow-card)]"}`}
                  >
                    <div className="text-center min-w-14">
                      <div className="mk-body text-mk-ink-900">{task.time}</div>
                      <div className="mk-caption text-mk-ink-500">{task.ampm}</div>
                    </div>
                    <div
                      className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${task.kind === "pickup"
                        ? "bg-mk-blue-50 text-mk-blue-500"
                        : "bg-mk-warning/20 text-mk-warning"
                        }`}
                    >
                      {task.kind === "pickup" ? <KeyRound size={16} /> : <Undo2 size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="mk-body text-mk-ink-900">
                        {(ar ? task.customerNameAr || task.customerName : task.customerNameEn || task.customerName) || "—"}{" "}
                        {task.ref && (
                          <span className="font-mono mk-caption text-mk-blue-600 ms-1.5">
                            {task.ref}
                          </span>
                        )}
                      </div>
                      <div className="mk-caption text-mk-ink-500">{ar ? task.detailAr || task.detail : task.detailEn || task.detail}</div>
                      {(task.note || task.unsigned || task.kycPending || task.latenessMinutes) && (
                        <div className={`mk-caption mt-1 ${task.urgent ? "text-mk-danger" : "text-mk-warning"}`}>
                          {task.note || [
                            task.unsigned ? T("Unsigned contract", "عقد غير موقّع", ar) : null,
                            task.kycPending ? T("KYC pending", "الهوية قيد المراجعة", ar) : null,
                            task.latenessMinutes ? T(`${task.latenessMinutes} min late`, `متأخر ${task.latenessMinutes} دقيقة`, ar) : null,
                          ].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </div>
                    <Link
                      href={task.kind === "pickup" ? `/employee/pickup?id=${task.ref}` : `/employee/return?id=${task.ref}`}
                      className={`px-3 py-2 rounded-pill mk-body-sm shrink-0 no-underline ${task.urgent
                        ? "bg-mk-danger text-white"
                        : task.kind === "pickup"
                          ? "bg-mk-blue-500 text-white"
                          : "bg-white text-mk-ink-900 border border-mk-ink-200"
                        }`}
                    >
                      {task.urgent ? T("Resolve", "حل", ar) : task.kind === "pickup" ? T("Hand over", "تسليم", ar) : T("Receive", "استلام", ar)}
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          {selectedCarForMap && (
            <MapModal
              ar={ar}
              car={selectedCarForMap}
              onClose={() => setSelectedCarForMap(null)}
            />
          )}

          {/* Tip card */}
          <div className="rounded-xl p-6 bg-mk-midnight">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb size={16} className="text-mk-mint-500" />
              <b className="mk-body-sm text-white">{T("Tip", "نصيحة", ar)}</b>
            </div>
            <p className="mk-body-sm leading-relaxed m-0 text-mk-ink-350">
              {T(
                "Always run the blacklist check before handing over keys — even when KYC is verified. The shared DB syncs every 4 minutes.",
                "شغّل دائماً فحص القائمة السوداء قبل تسليم المفاتيح — حتى عندما تكون الهوية موثّقة. القاعدة المشتركة تتزامن كل ٤ دقائق.",
                ar
              )}
            </p>
          </div>
        </div>

        {/* Side column: Alerts & Activity Log (full length) + Cars at this branch below */}
        <div className="flex flex-col gap-6 w-full lg:sticky lg:top-[88px] self-start">
          <div className="rounded-xl p-6 bg-white shadow-[var(--shadow-card)] flex flex-col gap-4">
            <div className="mk-h4  mb-2 text-mk-ink-900 tracking-tight flex items-center justify-between">
              <span>{T("Fleet Alerts & Notifications", "التنبيهات وسجل النشاط", ar)}</span>
              {visibleAlerts.length > 0 && <span className="w-2 h-2 rounded-full bg-mk-danger animate-pulse" />}
            </div>

            <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto mk-scrollbar-none">
              {loading ? (
                <div className="py-6 text-center mk-body-sm text-mk-ink-400">{T("Loading…", "جارٍ التحميل…", ar)}</div>
              ) : visibleAlerts.length === 0 ? (
                <div className="py-6 text-center mk-body-sm text-mk-ink-400">
                  {T("No alerts — you're all caught up.", "لا تنبيهات — كل شيء تحت السيطرة.", ar)}
                </div>
              ) : (
                visibleAlerts.map((a) => {
                  const style = ALERT_KIND_STYLE[a.kind];
                  const Icon = ALERT_KIND_ICON[a.kind];
                  return (
                    <div
                      key={a.id}
                      className="flex gap-3 p-3 rounded-lg bg-mk-ink-50"
                    >
                      <Icon size={16} className={`${style.icon} shrink-0 mt-0.5`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="mk-caption text-mk-ink-900 leading-normal">
                            {ar ? a.titleAr || a.title : a.title}
                          </div>
                          <button
                            type="button"
                            onClick={() => dismissAlert(a.id)}
                            aria-label={T("Dismiss", "إغلاق", ar)}
                            className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-0 bg-transparent text-mk-ink-400 hover:text-mk-ink-700 hover:bg-mk-ink-100 cursor-pointer transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                        <div className="mk-overline text-mk-ink-600 mt-1 leading-relaxed">
                          {ar ? a.descAr || a.desc : a.desc}
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-2">
                          <span className="mk-overline text-mk-ink-400 shrink-0">{a.time}</span>
                          {a.href && (
                            <Link href={a.href} className="mk-overline text-mk-blue-500 no-underline cursor-pointer hover:text-mk-blue-600 transition-colors shrink-0">
                              {a.actionLabel || T("Open", "فتح", ar)}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Branch fleet */}
          <div className="rounded-xl p-6 bg-white shadow-[var(--shadow-card)]">
            <div className="mk-h4 mb-4 text-mk-ink-900">
              {T("Cars at this branch", "مركبات هذا الفرع", ar)}
            </div>
            {loading ? (
              <div className="py-4 text-center mk-body-sm text-mk-ink-400">{T("Loading…", "جارٍ التحميل…", ar)}</div>
            ) : branchFleet.length === 0 ? (
              <div className="py-4 text-center mk-body-sm text-mk-ink-400">{T("No branch data", "لا بيانات للفرع", ar)}</div>
            ) : (
              branchFleet.map((x) => {
                const meta = branchFleetMeta(x.key);
                return (
                  <div
                    key={x.key}
                    className="flex items-center justify-between py-3 border-b border-mk-ink-100 last:border-b-0"
                  >
                    <span className="flex items-center gap-2 mk-body-sm text-mk-ink-700">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${meta.colorClass}`} />
                      {ar ? meta.ar : meta.en}
                    </span>
                    <b className="mk-body-sm text-mk-ink-900">{x.count}</b>
                  </div>
                );
              })
            )}
            <Button variant="outline" className="w-full justify-center mt-3" onClick={() => setShowAllGarageMap(true)}>
              <CarFront size={14} className="text-mk-blue-500" />
              {T("View garage map", "عرض خريطة الكراج", ar)}
            </Button>
          </div>

          {showAllGarageMap && (
            <MapModal
              ar={ar}
              showAll={true}
              onClose={() => setShowAllGarageMap(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
