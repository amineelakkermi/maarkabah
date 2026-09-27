"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Clock,
  Wrench,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Users,
} from "lucide-react";
import { IconButton, Tabs } from "@/components/ui";
import { announceDropdownOpen, useDropdownCoordinator } from "@/components/ui/UseDropdownCoordinator";
import { useAdmin } from "@/contexts/AdminContext";
import { notificationService } from "@/lib/api-services";

export type NotificationCategoryKey =
  | "fleet"
  | "contracts"
  | "pickup_return"
  | "disputes"
  | "people"
  | "system";

export interface TopbarNotification {
  id: string;
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
  createdAt: string;
  category: NotificationCategoryKey;
  read: boolean;
  href?: string;
}

// Backend categories are numeric: 1 Fleet, 2 Contracts, 3 PickupReturn,
// 4 Disputes, 5 People, 6 System — but tolerate string payloads too.
const CATEGORY_KEYS: NotificationCategoryKey[] = [
  "fleet",
  "contracts",
  "pickup_return",
  "disputes",
  "people",
  "system",
];

function normalizeCategory(v: unknown): NotificationCategoryKey {
  const n = Number(v);
  if (n >= 1 && n <= 6) return CATEGORY_KEYS[n - 1];
  const s = String(v ?? "").toLowerCase();
  if (s.includes("fleet") || s.includes("vehicle")) return "fleet";
  if (s.includes("contract")) return "contracts";
  if (s.includes("pickup") || s.includes("return")) return "pickup_return";
  if (s.includes("dispute")) return "disputes";
  if (s.includes("people") || s.includes("customer") || s.includes("driver") || s.includes("user")) return "people";
  return "system";
}

// Deepest useful link we can build from the payload: a direct href wins,
// then entity ids, then the category's home page. `base` is the current
// portal prefix so links stay inside admin vs employee routes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveHref(item: any, category: NotificationCategoryKey, base: string): string {
  const direct = item.href ?? item.url ?? item.link ?? item.actionUrl ?? item.deepLink;
  if (typeof direct === "string" && direct.startsWith("/")) return direct;
  if (base === "/superadmin") return "/superadmin";

  const contractId = item.contractId ?? item.contract?.id;
  const customerId = item.customerId ?? item.customer?.id;
  const driverId = item.driverId ?? item.driver?.id;
  const vehicleId = item.vehicleId ?? item.vehicle?.id;

  if (contractId != null) return `${base}/contracts/${contractId}`;
  if (customerId != null) return base === "/employee" ? `/employee/customer/${customerId}` : `/customers/${customerId}`;
  if (driverId != null) return `${base}/drivers/${driverId}`;
  if (vehicleId != null) return base === "/employee" ? "/employee/cars" : "/fleet";

  switch (category) {
    case "fleet": return base === "/employee" ? "/employee/cars" : "/fleet";
    case "contracts": return `${base}/contracts`;
    case "pickup_return": return base === "/employee" ? "/employee/return" : "/late-returns";
    case "disputes": return "/late-returns";
    case "people": return base === "/employee" ? "/employee/drivers" : "/customers";
    default: return "/notifications";
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapNotification(item: any, base: string): TopbarNotification {
  const category = normalizeCategory(item.category ?? item.notificationCategory);
  const titleEn = item.titleEn ?? item.title ?? item.subjectEn ?? item.subject ?? "";
  const titleAr = item.titleAr ?? item.title ?? item.subjectAr ?? item.subject ?? "";
  const messageEn = item.messageEn ?? item.message ?? item.bodyEn ?? item.body ?? "";
  const messageAr = item.messageAr ?? item.message ?? item.bodyAr ?? item.body ?? "";
  return {
    id: String(item.id ?? item.notificationId ?? crypto.randomUUID()),
    titleEn: String(titleEn),
    titleAr: String(titleAr),
    messageEn: String(messageEn),
    messageAr: String(messageAr),
    createdAt: String(item.createdAt ?? item.createdOnUtc ?? item.sentAt ?? item.timestamp ?? ""),
    category,
    read: Boolean(item.isRead ?? item.read ?? (item.unread != null ? !item.unread : false)),
    href: resolveHref(item, category, base),
  };
}

function timeAgo(iso: string, ar: boolean): string {
  const d = new Date(iso);
  if (!iso || isNaN(d.getTime())) return "";
  const mins = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
  if (mins < 1) return ar ? "الآن" : "now";
  if (mins < 60) return ar ? `منذ ${mins} د` : `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return ar ? `منذ ${h} س` : `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return ar ? `منذ ${days} يوم` : `${days}d ago`;
  return d.toLocaleDateString(ar ? "ar-SA" : "en-US", { month: "short", day: "numeric" });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractCount(res: any): number {
  const n = res?.unreadCount ?? res?.count ?? res?.data?.unreadCount ?? res?.data?.count ?? res;
  return Number.isFinite(Number(n)) ? Number(n) : 0;
}

const CATEGORY_ICONS = {
  pickup_return: { icon: Clock, bg: "bg-mk-warning-100 text-mk-warning-700" },
  system: { icon: UserCheck, bg: "bg-mk-blue-50 text-mk-blue-700" },
  fleet: { icon: Wrench, bg: "bg-mk-violet-100 text-mk-violet-700" },
  disputes: { icon: AlertTriangle, bg: "bg-mk-danger-100 text-mk-danger-700" },
  contracts: { icon: CheckCircle2, bg: "bg-mk-mint-100 text-mk-mint-700" },
  people: { icon: Users, bg: "bg-mk-blue-50 text-mk-blue-700" },
};

export function NotificationsDropdown() {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const pathname = usePathname() ?? "";
  const base = pathname.startsWith("/employee") ? "/employee" : pathname.startsWith("/superadmin") ? "/superadmin" : "";
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [notifications, setNotifications] = useState<TopbarNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const instanceId = useDropdownCoordinator(open, () => setOpen(false));

  // Badge count — fetched once on mount so the dot shows without opening,
  // then refreshed every time the dropdown opens.
  useEffect(() => {
    let cancelled = false;
    notificationService
      .getUnreadCount()
      .then((res) => { if (!cancelled) setUnreadCount(extractCount(res)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    notificationService
      .getUnreadCount()
      .then((res) => { if (!cancelled) setUnreadCount(extractCount(res)); })
      .catch(() => {});

    notificationService
      .search({ unreadOnly: filter === "unread", pageNumber: 1, pageSize: 20 })
      .then((res) => {
        if (cancelled) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items: any[] = res?.items ?? res?.data?.items ?? res?.data ?? [];
        setNotifications((Array.isArray(items) ? items : []).map((it) => mapNotification(it, base)));
      })
      .catch(() => { if (!cancelled) setNotifications([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, filter, base]);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      announceDropdownOpen(instanceId);
      setLoading(true);
    }
  };

  // The API has no mark-read verb — dismiss is the lifecycle. Clicking a
  // notification therefore dismisses it (it leaves the inbox) and then
  // navigates to the linked page; the header button clears the whole inbox.
  const dismissNotification = (n: TopbarNotification) => {
    setNotifications((prev) => prev.filter((x) => x.id !== n.id));
    if (!n.read) setUnreadCount((c) => Math.max(0, c - 1));
    notificationService.dismiss(n.id).catch(() => {});
  };

  const dismissAll = () => {
    setNotifications([]);
    setUnreadCount(0);
    notificationService.dismissAll().catch(() => {});
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button */}
      <IconButton
        size="md"
        className={`relative transition-colors ${
          open ? "bg-mk-ink-100 text-mk-ink-900" : ""
        }`}
        onClick={handleToggle}
        aria-label={ar ? "الإشعارات" : "Notifications"}
        aria-expanded={open}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-2.5 end-2.5 w-2 h-2 rounded-full bg-mk-blue-500 pointer-events-none" />
        )}
      </IconButton>

      {/* Popover Dropdown — always mounted; mk-menu-motion + .open drive the
          fade/scale transition in both directions (same pattern as
          Select/DatePicker), instead of a conditional-mount that can only
          animate opening. */}
      <div
        className={`absolute top-full end-0 mt-2.5 w-[360px] sm:w-[420px] max-w-[calc(100vw-24px)] max-sm:fixed max-sm:inset-x-3 max-sm:top-16 max-sm:mt-0 max-sm:w-auto z-50 mk-surface rounded-xl border border-mk-border shadow-dropdown bg-mk-bg-elevated p-0 overflow-hidden flex flex-col mk-menu-motion ${open ? "open" : ""}`}
        role="dialog"
        aria-label={ar ? "قائمة الإشعارات" : "Notifications list"}
      >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-mk-border/50">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-mk-blue-500/10 flex items-center justify-center text-mk-blue-500">
                <Bell size={14} />
              </div>
              <span className="text-sm font-bold text-mk-ink-900">
                {ar ? "الإشعارات" : "Notifications"}
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-pill text-[11px] font-semibold bg-mk-blue-50 text-mk-blue-700">
                  {ar ? `${unreadCount} جديدة` : `${unreadCount} new`}
                </span>
              )}
            </div>

            {notifications.length > 0 && (
              <button
                type="button"
                onClick={dismissAll}
                className="flex items-center gap-1.5 text-xs text-mk-ink-500 hover:text-mk-ink-900 bg-transparent border-0 cursor-pointer py-1 px-1.5 rounded transition-colors"
              >
                <CheckCheck size={13} />
                <span>{ar ? "إخفاء الكل" : "Dismiss all"}</span>
              </button>
            )}
          </div>

          {/* Design System Tabs */}
          <div className="px-4 py-2.5 border-b border-mk-border/50 bg-mk-bg-muted/15 flex justify-center">
            <Tabs
              size="sm"
              rounded="full"
              value={filter}
              onChange={(v) => {
                setFilter(v as "all" | "unread");
                setLoading(true);
              }}
              items={[
                { value: "all", label: ar ? "الكل" : "All", count: notifications.length },
                { value: "unread", label: ar ? "غير مقروء" : "Unread", count: unreadCount },
              ]}
            />
          </div>

          {/* Notifications List */}
          <div className="max-h-[360px] overflow-y-auto mk-scrollbar divide-y divide-mk-border/40">
            {loading ? (
              <div className="py-10 text-center text-xs text-mk-ink-400">
                {ar ? "جارٍ التحميل…" : "Loading…"}
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 px-4 flex flex-col items-center justify-center text-center gap-2 text-mk-ink-400">
                <div className="w-10 h-10 rounded-full bg-mk-ink-100/70 flex items-center justify-center text-mk-ink-400">
                  <Sparkles size={18} />
                </div>
                <div className="text-xs font-semibold text-mk-ink-700">
                  {ar ? "لا توجد إشعارات حالياً" : "No notifications found"}
                </div>
                <div className="text-[11px] text-mk-ink-400 max-w-[220px]">
                  {filter === "unread"
                    ? ar
                      ? "تم قراءة جميع الإشعارات بنجاح"
                      : "All notifications are marked as read"
                    : ar
                    ? "ستظهر هنا التنبيهات وإشعارات النظام"
                    : "System alerts and notifications will appear here"}
                </div>
              </div>
            ) : (
              notifications.map((n) => {
                const catMeta = CATEGORY_ICONS[n.category] || CATEGORY_ICONS.system;
                const IconComponent = catMeta.icon;

                return (
                  <Link
                    key={n.id}
                    href={n.href || "/notifications"}
                    onClick={() => {
                      dismissNotification(n);
                      setOpen(false);
                    }}
                    className={`flex items-start gap-3 p-3.5 transition-colors text-start no-underline block ${
                      !n.read
                        ? "bg-mk-blue-50/25 hover:bg-mk-blue-50/50"
                        : "hover:bg-mk-ink-50/60"
                    }`}
                  >
                    {/* Tonal Category Icon */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${catMeta.bg} mt-0.5`}
                    >
                      <IconComponent size={15} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <span
                          className={`text-[13px] leading-snug truncate ${
                            !n.read
                              ? "font-bold text-mk-ink-900"
                              : "font-medium text-mk-ink-700"
                          }`}
                        >
                          {ar ? n.titleAr : n.titleEn}
                        </span>
                        <span className="text-[11px] font-normal text-mk-ink-400 shrink-0">
                          {timeAgo(n.createdAt, ar)}
                        </span>
                      </div>
                      <p className="text-[12px] leading-relaxed text-mk-ink-600 line-clamp-2 m-0 font-normal">
                        {ar ? n.messageAr : n.messageEn}
                      </p>
                    </div>

                    {/* Unread indicator dot */}
                    {!n.read && (
                      <span
                        className="w-2 h-2 rounded-full bg-mk-blue-500 shrink-0 mt-2"
                        title={ar ? "غير مقروء" : "Unread"}
                      />
                    )}
                  </Link>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-mk-border/50 bg-mk-bg/30 text-center">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-md text-xs font-medium text-mk-ink-500 hover:text-mk-ink-900 transition-colors no-underline"
            >
              <span>{ar ? "عرض جميع الإشعارات والتحكم بالتنبيهات" : "View all notifications & settings"}</span>
              {ar ? <ArrowLeft size={12} /> : <ArrowRight size={12} />}
            </Link>
          </div>
      </div>
    </div>
  );
}
