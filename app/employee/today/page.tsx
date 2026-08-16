"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, ParkingCircle, ClockAlert, ShieldCheck, Plus, Undo2, UserSearch, Lightbulb, CarFront, MapPin, CheckCircle2, FileText, AlertCircle, X } from "lucide-react";
import { KpiCard, AlertBanner, Button } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { CARS } from "@/lib/data";
import { MapModal } from "@/components/employee/MapModal";

const T = (en: string, ar: string, isAr: boolean) => isAr ? ar : en;

type FleetAlertKind = "danger" | "warning" | "info" | "success";

const ALERT_KIND_STYLE: Record<FleetAlertKind, { icon: string; border: string }> = {
  danger: { icon: "text-mk-danger", border: "var(--color-mk-danger)" },
  warning: { icon: "text-mk-warning", border: "var(--color-mk-warning)" },
  info: { icon: "text-mk-blue-500", border: "var(--color-mk-blue-500)" },
  success: { icon: "text-mk-mint-600", border: "var(--color-mk-mint-600)" },
};

export default function EmpTodayPage() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const [selectedCarForMap, setSelectedCarForMap] = useState<any>(null);
  const [showAllGarageMap, setShowAllGarageMap] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  const FLEET_ALERTS: {
    id: string; kind: FleetAlertKind; icon: typeof ClockAlert;
    title: string; desc: string; time: string;
    action: { label: string; href?: string; onClick?: () => void };
  }[] = [
      {
        id: "overdue-mk2420", kind: "danger", icon: ClockAlert,
        title: T("Contract Overdue", "عقد متأخر في الإرجاع", ar),
        desc: T("Contract MK-2420 (Fahad Al-Qahtani) is overdue by 2h 14m.", "عقد MK-2420 (فهد القحطاني) متأخر بمقدار ٢س ١٤د.", ar),
        time: T("10m ago", "قبل ١٠ دقائق", ar),
        action: { label: T("Process Return", "استلام الإرجاع", ar), href: "/employee/return?id=MK-2420" },
      },
      {
        id: "istamara-jkl3456", kind: "warning", icon: FileText,
        title: T("License Renewal Alert", "تنبيه تجديد الاستمارة", ar),
        desc: T("Nissan Patrol (JKL 3456) license is expiring soon (in 5 days).", "الاستمارة قاربت على الانتهاء: نيسان باترول (JKL 3456) خلال ٥ أيام.", ar),
        time: T("1h ago", "قبل ساعة", ar),
        action: { label: T("Renew License", "تجديد الاستمارة", ar), href: "/employee/cars" },
      },
      {
        id: "inspection-pqr1357", kind: "danger", icon: CarFront,
        title: T("Periodic Inspection Overdue", "الفحص الدوري منتهي", ar),
        desc: T("Hyundai Elantra (PQR 1357) periodic inspection has expired.", "تنبيه الفحص الدوري: هيونداي إلنترا (PQR 1357) الفحص منتهي.", ar),
        time: T("2h ago", "قبل ساعتين", ar),
        action: { label: T("Inspect Vehicle", "حجز فحص المركبة", ar), href: "/employee/cars" },
      },
      {
        id: "created-mk2422", kind: "info", icon: ShieldCheck,
        title: T("Contract Created", "تم إنشاء عقد جديد", ar),
        desc: T("Contract MK-2422 (Nissan Patrol) created successfully for Mohammed Al-Saadi.", "تم إنشاء العقد رقم MK-2422 (نيسان باترول) للعميل محمد الصاعدي بنجاح.", ar),
        time: T("3h ago", "قبل ٣ ساعات", ar),
        action: { label: T("View Contract", "عرض العقد", ar), href: "/employee/contracts" },
      },
      {
        id: "closed-mk2410", kind: "success", icon: CheckCircle2,
        title: T("Contract Closed", "تم إغلاق عقد واستلام مركبة", ar),
        desc: T("Contract MK-2410 closed and Toyota Camry returned successfully.", "تم إغلاق العقد رقم MK-2410 واستلام تويوتا كامري بنجاح.", ar),
        time: T("5h ago", "قبل ٥ ساعات", ar),
        action: { label: T("View Invoice", "عرض الفاتورة", ar), href: "/employee/contracts" },
      },
    ];

  const visibleAlerts = FLEET_ALERTS.filter((a) => !dismissedAlerts.includes(a.id));
  const dismissAlert = (id: string) => setDismissedAlerts((prev) => [...prev, id]);

  const QUEUE = [
    { t: "09:30", ampm: "AM", who: T("Fahad Al-Qahtani", "فهد القحطاني", ar), sub: T("Returning · Hyundai Sonata · DEF 5678", "إرجاع · هيونداي سوناتا · DEF 5678", ar), ref: "MK-2420", kind: "return" as const, urgent: true, note: T("OVERDUE 2h 14m · auto-charging", "متأخر ٢س ١٤د · خصم تلقائي", ar) },
    { t: "10:00", ampm: "AM", who: T("Reem Al-Dosari", "ريم الدوسري", ar), sub: T("Returning · Mazda CX-5 · MNO 7890", "إرجاع · مازدا CX-5 · MNO 7890", ar), ref: "MK-2423", kind: "return" as const, urgent: false },
    { t: "14:00", ampm: "PM", who: T("Ahmed Al-Otaibi", "أحمد العتيبي", ar), sub: T("Picking up · Toyota Camry · ABC 1234", "تسليم · تويوتا كامري · ABC 1234", ar), ref: "MK-2419", kind: "pickup" as const, urgent: false },
    { t: "16:30", ampm: "PM", who: T("Mohammed Al-Saadi", "محمد السعدي", ar), sub: T("Picking up · Nissan Patrol · JKL 3456", "تسليم · نيسان باترول · JKL 3456", ar), ref: "MK-2422", kind: "pickup" as const, urgent: false, note: T("Contract not signed yet — print it", "العقد لم يُوقّع بعد — اطبعه", ar) },
    { t: "17:00", ampm: "PM", who: T("Saud Al-Ghamdi", "سعود الغامدي", ar), sub: T("Picking up · MG ZS · YZA 5544", "تسليم · MG ZS · YZA 5544", ar), ref: "MK-2425", kind: "pickup" as const, urgent: false, note: T("KYC awaiting verification", "الهوية بانتظار التحقق", ar) },
  ];

  const BRANCH_STATUS = [
    { k: T("Available now", "متاحة الآن", ar), v: 8, colorClass: "bg-mk-mint-600" },
    { k: T("Out on rental", "قيد الإيجار", ar), v: 5, colorClass: "bg-mk-blue-500" },
    { k: T("Reserved · today", "محجوزة · اليوم", ar), v: 3, colorClass: "bg-mk-violet-500" },
    { k: T("In maintenance", "قيد الصيانة", ar), v: 1, colorClass: "bg-mk-warning" },
  ];

  return (
    <div>
      {/* Alert banner */}
      <AlertBanner
        kind="info"
        title={T("Mariam handed you 5 active tasks at shift start", "سلّمتك مريم ٥ مهام نشطة عند بدء الوردية", ar)}
        sub={T("3 pickups, 2 returns scheduled today. 1 KYC waiting on your review.", "٣ تسليمات، ٢ إرجاع مجدولة اليوم. ١ تحقق هوية ينتظر مراجعتك.", ar)}
        action={
          <span className="mk-caption text-mk-ink-600 shrink-0">
            {T("Shift · 09:00 → 17:00", "الوردية · ٠٩:٠٠ ← ١٧:٠٠", ar)}
          </span>
        }
      />

      {/* Main + side columns, aligned from the KPI row down */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        {/* Main column: KPIs + quick actions + queue + tip */}
        <div className="flex flex-col gap-6">
          {/* KPI row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard icon={KeyRound} value="3" label={T("Pickups today", "تسليمات اليوم", ar)} sub={T("Next at 14:00", "التالي في ١٤:٠٠", ar)} kind="default" />
            <KpiCard icon={ParkingCircle} value="2" label={T("Returns today", "إرجاعات اليوم", ar)} sub={T("Earliest 10:00", "الأبكر ١٠:٠٠", ar)} kind="mint" />
            <KpiCard icon={ClockAlert} value="1" label={T("Overdue right now", "متأخر الآن", ar)} sub={"MK-2420 · " + T("2h 14m", "٢س ١٤د", ar)} kind="alert" />
          </div>

          {/* Quick actions */}
          <div className="flex gap-3 flex-wrap hidden">
            {[
              { href: "/employee/new-contract", icon: Plus, bgClass: "bg-mk-blue-50", icClass: "text-mk-blue-500", label: T("New contract", "إنشاء عقد", ar), sub: T("Phone / counter customer", "عميل هاتفي أو مكتبي", ar) },
              { href: "/employee/pickup", icon: KeyRound, bgClass: "bg-mk-mint-600/20", icClass: "text-mk-mint-600", label: T("Start a handover", "بدء تسليم", ar), sub: T("Hand keys & contract", "تسليم المفاتيح والعقد", ar) },
              { href: "/employee/return", icon: Undo2, bgClass: "bg-mk-warning/20", icClass: "text-mk-warning", label: T("Process a return", "معالجة إرجاع", ar), sub: T("Inspect & close", "معاينة وإغلاق", ar) },
              { href: "/employee/customer/inquiry", icon: UserSearch, bgClass: "bg-mk-violet-100", icClass: "text-mk-violet-500", label: T("Customer inquiry", "الاستعلام عن العملاء", ar), sub: T("Check the Dynamics network", "استعلام من شبكة دينامكس", ar) },
            ].map(({ href, icon: Icon, bgClass, icClass, label, sub }) => (
              <Link
                key={href} href={href}
                className="flex items-center gap-3 rounded-lg px-5 py-4 min-w-52 bg-white shadow-[var(--shadow-card)] no-underline transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50"
              >
                <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${bgClass} ${icClass}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <div className="mk-body text-mk-ink-900">{label}</div>
                  <div className="mk-caption text-mk-ink-500">{sub}</div>
                </div>
              </Link>
            ))}
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
              {QUEUE.map((task) => (
                <div
                  key={task.ref}
                  className={`flex flex-wrap items-center gap-3 rounded-lg px-5 py-4 bg-white border border-mk-ink-100 cursor-pointer transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50 ${task.urgent ? "shadow-[var(--shadow-urgent)]" : "shadow-[var(--shadow-card)]"}`}
                >
                  <div className="text-center min-w-14">
                    <div className="mk-body text-mk-ink-900">{task.t}</div>
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
                      {task.who}{" "}
                      <span className="font-mono mk-caption text-mk-blue-600 ms-1.5">
                        {task.ref}
                      </span>
                    </div>
                    <div className="mk-caption text-mk-ink-500">{task.sub}</div>
                    {task.note && (
                      <div className={`mk-caption mt-1 ${task.urgent ? "text-mk-danger" : "text-mk-warning"}`}>
                        {task.note}
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
              ))}
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
              <span className="w-2 h-2 rounded-full bg-mk-danger animate-pulse" />
            </div>

            <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto mk-scrollbar-none">
              {visibleAlerts.length === 0 && (
                <div className="py-6 text-center mk-body-sm text-mk-ink-400">
                  {T("No alerts — you're all caught up.", "لا تنبيهات — كل شيء تحت السيطرة.", ar)}
                </div>
              )}
              {visibleAlerts.map((a) => {
                const style = ALERT_KIND_STYLE[a.kind];
                return (
                  <div
                    key={a.id}
                    className="flex gap-3 p-3 rounded-lg bg-mk-ink-50"
                  >
                    <a.icon size={16} className={`${style.icon} shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="mk-caption text-mk-ink-900 leading-normal">
                          {a.title}
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
                        {a.desc}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <span className="mk-overline text-mk-ink-400 shrink-0">{a.time}</span>
                        {a.action.href ? (
                          <Link href={a.action.href} className="mk-overline text-mk-blue-500 no-underline cursor-pointer hover:text-mk-blue-600 transition-colors shrink-0">
                            {a.action.label}
                          </Link>
                        ) : (
                          <button type="button" onClick={a.action.onClick} className="mk-overline text-mk-blue-500 border-0 bg-transparent cursor-pointer hover:text-mk-blue-600 transition-colors shrink-0 p-0">
                            {a.action.label}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Branch fleet */}
          <div className="rounded-xl p-6 bg-white shadow-[var(--shadow-card)]">
            <div className="mk-h4 mb-4 text-mk-ink-900">
              {T("Cars at this branch", "مركبات هذا الفرع", ar)}
            </div>
            {BRANCH_STATUS.map((x) => (
              <div
                key={x.k}
                className="flex items-center justify-between py-3 border-b border-mk-ink-100 last:border-b-0"
              >
                <span className="flex items-center gap-2 mk-body-sm text-mk-ink-700">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${x.colorClass}`} />
                  {x.k}
                </span>
                <b className="mk-body-sm text-mk-ink-900">{x.v}</b>
              </div>
            ))}
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
