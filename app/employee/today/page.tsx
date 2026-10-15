"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, ParkingCircle, ClockAlert, ShieldCheck, Undo2, Lightbulb, CarFront, FileText, CheckCircle2, X, LayoutGrid, List as ListIcon } from "lucide-react";
import { KpiCard, AlertBanner, Button, Tabs, ScrollArea } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import type { Car as CarType } from "@/lib/data";
import { MapModal } from "@/components/employee/MapModal";
import { TodayDate } from "@/components/employee/TodayDate";
import { dashboardService } from "@/lib/api-services";
import { ApiError } from "@/lib/api-client";
import { normalizeToday, type TodayData, type ScheduleEntry } from "@/lib/dashboard";

const T = (en: string, ar: string, isAr: boolean) => isAr ? ar : en;

type FleetAlertKind = "danger" | "warning" | "info" | "success";

// Tonal icon box per alert kind — same treatment as the bell dropdown's notification icons.
const ALERT_KIND_STYLE: Record<FleetAlertKind, { icon: string }> = {
  danger: { icon: "bg-mk-danger-100 text-mk-danger-700" },
  warning: { icon: "bg-mk-warning-100 text-mk-warning-700" },
  info: { icon: "bg-mk-blue-50 text-mk-blue-700" },
  success: { icon: "bg-mk-mint-100 text-mk-mint-700" },
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

function avgSub(v: number | null | undefined, ar: boolean) {
  return v != null ? T(`7-day avg: ${v}`, `${v} · المتوسط الأسبوعي`, ar) : undefined;
}

function deltaOf(v: number | null | undefined) {
  return v == null ? undefined : { dir: (v >= 0 ? "up" : "down") as "up" | "down", value: `${v > 0 ? "+" : ""}${v}%` };
}

export default function EmpTodayPage() {
  const { dir } = useAdmin();
  const router = useRouter();
  const ar = dir === "rtl";
  const [selectedCarForMap, setSelectedCarForMap] = useState<CarType | null>(null);
  const [showAllGarageMap, setShowAllGarageMap] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [queueView, setQueueView] = useState<"list" | "grid">("list");
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
  const branchFleet = (data?.branchFleet ?? []).filter((x) => x.count > 0);
  const branchTotal = branchFleet.reduce((sum, x) => sum + x.count, 0);
  const branchAvailable = branchFleet.find((x) => x.key.toLowerCase() === "available")?.count ?? 0;

  const noteOf = (task: ScheduleEntry) =>
    task.note || [
      task.unsigned ? T("Unsigned contract", "عقد غير موقّع", ar) : null,
      task.kycPending ? T("KYC pending", "الهوية قيد المراجعة", ar) : null,
      task.latenessMinutes ? T(`${task.latenessMinutes} min late`, `متأخر ${task.latenessMinutes} دقيقة`, ar) : null,
    ].filter(Boolean).join(" · ");

  return (
    <div className="lg:flex lg:flex-col lg:flex-1 lg:min-h-0">
      {/* Alert banner — shift briefing built from backend counts */}
      {data?.briefing && data.briefing.taskCount > 0 ? (
        <div className="mk-enter" style={{ "--o": 0 } as CSSProperties}>
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
        </div>
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

      {/* KPI row */}
      <div className="mk-seq grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6" style={{ "--seq-start": 1 } as CSSProperties}>
        <KpiCard
          icon={KeyRound}
          value={loading ? "—" : String(data?.pickupsToday ?? 0)}
          label={T("Pickups today", "تسليمات اليوم", ar)}
          sub={avgSub(data?.pickupsAvg7d, ar) ?? (data?.nextPickupLabel ? T(`Next at ${fmtClock(data.nextPickupLabel, ar)}`, `التالي في ${fmtClock(data.nextPickupLabel, ar)}`, ar) : undefined)}
          kind="default"
          delta={deltaOf(data?.pickupsDeltaPct)}
        />
        <KpiCard
          icon={ParkingCircle}
          value={loading ? "—" : String(data?.returnsToday ?? 0)}
          label={T("Returns today", "إرجاعات اليوم", ar)}
          sub={avgSub(data?.returnsAvg7d, ar) ?? (data?.earliestReturnLabel ? T(`Earliest ${fmtClock(data.earliestReturnLabel, ar)}`, `الأبكر ${fmtClock(data.earliestReturnLabel, ar)}`, ar) : undefined)}
          kind="mint"
          delta={deltaOf(data?.returnsDeltaPct)}
        />
        <KpiCard
          icon={ClockAlert}
          value={loading ? "—" : String(data?.overdueNow ?? 0)}
          label={T("Overdue right now", "متأخر الآن", ar)}
          sub={avgSub(data?.overdueAvg7d, ar)}
          kind="alert"
        />
        <KpiCard
          icon={CarFront}
          value={loading ? "—" : String(branchTotal)}
          label={T("Branch vehicles", "مركبات الفرع", ar)}
          sub={branchTotal > 0 ? T(`${branchAvailable} available now`, `${branchAvailable} · متاحة الآن`, ar) : undefined}
          kind="violet"
        />
      </div>

      {/* Main + side columns */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] lg:grid-rows-[minmax(0,1fr)] lg:flex-1 lg:min-h-0 gap-6">
        {/* Main column: queue + tip */}
        <div className="flex flex-col gap-6 lg:min-h-0">
          {/* Queue */}
          <div className="mk-enter rounded-xl p-5 mk-panel flex flex-col lg:flex-1 lg:min-h-0" style={{ "--o": 4 } as CSSProperties}>
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 min-w-0">
                <div className="mk-h4 text-mk-ink-900 tracking-tight">{T("Today's tasks", "المهام اليوم", ar)}</div>
                <TodayDate ar={ar} />
              </div>
              <span className="mk-caption text-mk-ink-500">{T("Sorted by time", "مرتب حسب الوقت", ar)}</span>
              <div className="shrink-0">
                <Tabs
                  variant="default"
                  value={queueView}
                  onChange={(v) => setQueueView(v as "list" | "grid")}
                  items={[
                    { value: "list", icon: <ListIcon size={15} />, "aria-label": T("List view", "عرض القائمة", ar) },
                    { value: "grid", icon: <LayoutGrid size={15} />, "aria-label": T("Grid view", "عرض شبكي", ar) },
                  ]}
                />
              </div>
            </div>
            {/* The scroller bleeds out to the panel's own edges (-mx-5 / -mb-5) so its scrollbar sits on the card's border, not against the rows */}
            <ScrollArea className="-mx-5 -mb-5 max-h-[calc(100vh-20rem)] min-h-[320px] lg:max-h-none lg:flex-1 lg:min-h-0" contentClassName="ps-5 pe-3 pb-5 overscroll-contain">
              <div className={`mk-queue-list rounded-xl ${queueView === "grid" ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "flex flex-col gap-3"}`}>
                {loading ? (
                  <div className="py-8 text-center mk-body-sm text-mk-ink-400">{T("Loading…", "جارٍ التحميل…", ar)}</div>
                ) : queue.length === 0 ? (
                  <div className="py-8 text-center mk-body-sm text-mk-ink-400">
                    {T("No pickups or returns scheduled today.", "لا تسليمات أو إرجاعات مجدولة اليوم.", ar)}
                  </div>
                ) : (
                  queue.map((task) => {
                    const grid = queueView === "grid";
                    const custName = (ar ? task.customerNameAr || task.customerName : task.customerNameEn || task.customerName) || "—";
                    const detail = ar ? task.detailAr || task.detail : task.detailEn || task.detail;
                    const note = noteOf(task);
                    const icon = (
                      <div
                        className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 self-start ${task.kind === "pickup"
                          ? "bg-mk-blue-100 text-mk-blue-700"
                          : "bg-mk-warning-100 text-mk-warning-700"
                          }`}
                      >
                        {task.kind === "pickup" ? <KeyRound size={16} /> : <Undo2 size={16} />}
                      </div>
                    );
                    const when = (
                      <div className="flex flex-col gap-0.5">
                        <div dir="ltr" className="flex items-baseline gap-2 self-start">
                          <span className="mk-h4 text-mk-ink-900 leading-tight">{task.time}</span>
                          <span className="mk-h4 text-mk-ink-900 leading-tight">{task.ampm}</span>
                        </div>
                        {task.ref && <span className="font-mono mk-caption text-mk-ink-700">{task.ref}</span>}
                      </div>
                    );
                    const customer = (
                      <div className="min-w-0">
                        <div className="mk-body text-mk-ink-900">{custName}</div>
                        <div className="mk-caption text-mk-ink-500">{detail}</div>
                      </div>
                    );
                    const noteEl = note && (
                      <span className={`mk-caption ${task.urgent ? "text-mk-danger" : "text-mk-warning"}`}>{note}</span>
                    );
                    const action = (
                      <Link
                        href={task.kind === "pickup" ? `/employee/pickup?id=${task.ref}` : `/employee/return?id=${task.ref}`}
                        className="inline-flex items-center px-3 py-2 rounded-full mk-body-sm shrink-0 no-underline bg-white text-mk-ink-900 border border-mk-ink-200"
                      >
                        {task.urgent ? T("Resolve", "حل", ar) : task.kind === "pickup" ? T("Hand over", "تسليم", ar) : T("Receive", "استلام", ar)}
                      </Link>
                    );
                    return (
                      <div
                        key={task.id}
                        className={`relative flex gap-2 rounded-lg p-4 cursor-pointer ${grid ? "flex-col" : "flex-wrap items-end"} ${task.urgent ? "mk-row-urgent" : "mk-row"}`}
                      >
                        {grid ? (
                          <>
                            {/* Card: icon + time on the start side, status at the top end; customer and button share the row below */}
                            <div className="flex items-start gap-2">
                              {icon}
                              <div className="flex-1 min-w-0">{when}</div>
                              {noteEl && <div className="shrink-0">{noteEl}</div>}
                            </div>
                            <div className="flex items-end gap-2">
                              <div className="flex-1 min-w-0">{customer}</div>
                              {action}
                            </div>
                          </>
                        ) : (
                          <>
                            {icon}
                            <div className="flex-1 min-w-0 flex flex-col gap-2">
                              {when}
                              {customer}
                            </div>
                            <div className="shrink-0 flex items-center gap-2">{noteEl && <span className="hidden sm:inline">{noteEl}</span>}{action}</div>
                            {/* On phones the status is pinned to the card's top end corner; from sm up it sits next to the button */}
                            {noteEl && <div className="absolute top-4 end-4 sm:hidden">{noteEl}</div>}
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {selectedCarForMap && (
            <MapModal
              ar={ar}
              car={selectedCarForMap}
              onClose={() => setSelectedCarForMap(null)}
            />
          )}

          {/* Tip card */}
          <div className="mk-enter rounded-xl p-4 sm:p-6 bg-mk-midnight" style={{ "--o": 5 } as CSSProperties}>
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

        {/* Side column: Alerts & Activity Log + Cars at this branch */}
        <div className="flex flex-col gap-6 w-full self-start lg:self-stretch lg:min-h-0 lg:overflow-y-auto mk-scrollbar-none">
          {/* Alerts */}
          <div className="mk-enter rounded-xl p-5 mk-panel flex flex-col" style={{ "--o": 5 } as CSSProperties}>
            <div className="mb-5">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="mk-h4 text-mk-ink-900 tracking-tight truncate">{T("Fleet Alerts & Notifications", "التنبيهات وسجل النشاط", ar)}</div>
                  <TodayDate ar={ar} />
                </div>
                {visibleAlerts.length > 0 && <span className="w-2 h-2 rounded-full bg-mk-danger animate-pulse" />}
              </div>
            </div>

            <div className="flex flex-col divide-y divide-mk-border/60 max-h-[420px] overflow-y-auto mk-scrollbar-none -mx-5">
              {loading ? (
                <div className="py-6 text-center mk-body-sm text-mk-ink-400 px-5">{T("Loading…", "جارٍ التحميل…", ar)}</div>
              ) : visibleAlerts.length === 0 ? (
                <div className="py-6 text-center mk-body-sm text-mk-ink-400 px-5">
                  {T("No alerts — you're all caught up.", "لا تنبيهات — كل شيء تحت السيطرة.", ar)}
                </div>
              ) : (
                visibleAlerts.map((a) => {
                  const style = ALERT_KIND_STYLE[a.kind];
                  const Icon = ALERT_KIND_ICON[a.kind];
                  const title = ar ? a.titleAr || a.title : a.title;
                  const desc = ar ? a.descAr || a.desc : a.desc;
                  const open = () => { if (a.href) router.push(a.href); };
                  return (
                    <div
                      key={a.id}
                      role={a.href ? "link" : undefined}
                      tabIndex={a.href ? 0 : undefined}
                      aria-label={a.actionLabel}
                      onClick={open}
                      onKeyDown={(e) => { if (e.key === "Enter") open(); }}
                      className={`flex gap-3 py-3.5 first:pt-2 last:pb-2 px-5 transition-colors outline-none ${a.href ? "cursor-pointer hover:bg-mk-ink-50 focus-visible:bg-mk-ink-50" : ""}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${style.icon}`}>
                        <Icon size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="mk-caption text-mk-ink-900 leading-normal">
                            {title}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="mk-overline text-mk-ink-400 whitespace-nowrap">{a.time}</span>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); dismissAlert(a.id); }}
                              aria-label={T("Dismiss", "إغلاق", ar)}
                              className="w-5 h-5 rounded-full flex items-center justify-center border-0 bg-transparent text-mk-ink-400 hover:text-mk-ink-700 hover:bg-mk-ink-100 cursor-pointer transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                        <div className="mk-overline text-mk-ink-600 mt-1 leading-relaxed">
                          {desc}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Branch fleet */}
          <div className="mk-enter rounded-xl p-5 mk-panel" style={{ "--o": 6 } as CSSProperties}>
            <div className="mk-h4 mb-6 text-mk-ink-900">
              {T("Cars at this branch", "مركبات هذا الفرع", ar)}
            </div>
            {loading ? (
              <div className="py-4 text-center mk-body-sm text-mk-ink-400">{T("Loading…", "جارٍ التحميل…", ar)}</div>
            ) : branchFleet.length === 0 ? (
              <div className="py-4 text-center mk-body-sm text-mk-ink-400">{T("No branch data", "لا بيانات للفرع", ar)}</div>
            ) : (
              <div className="flex flex-col gap-4">
                {branchFleet.map((x) => {
                  const meta = branchFleetMeta(x.key);
                  const pct = branchTotal > 0 ? Math.round((x.count / branchTotal) * 100) : 0;
                  return (
                    <div key={x.key} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="mk-body-sm text-mk-ink-700">{ar ? meta.ar : meta.en}</span>
                        <span className="flex items-baseline gap-2">
                          <b className="mk-kpi-value mk-body-sm text-mk-ink-900">{x.count}</b>
                          <span className="mk-overline text-mk-ink-500 w-8 text-end">{pct}%</span>
                        </span>
                      </div>
                      <div
                        className="h-1.5 rounded-full bg-mk-ink-100 overflow-hidden"
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={ar ? meta.ar : meta.en}
                      >
                        <div className={`mk-grow-x h-full rounded-full ${meta.colorClass}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <Button variant="outline" className="w-full justify-center mt-4" onClick={() => setShowAllGarageMap(true)}>
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
