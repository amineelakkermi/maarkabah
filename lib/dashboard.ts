// Dashboard payload normalization.
// Real response shapes (observed from the live API):
//
// POST /api/dashboard/overview →
//   { branches[], overdueAlert|null, kpis: { availableCars|activeContracts|
//     lateReturns|todayRevenue|fleetUtilization: { value, average7d,
//     deltaPercent, extraCount } }, todayActivity: { pickupCount, returnCount,
//     pickups[], returns[] }, revenue: { period, total, deltaPercent,
//     points: [{date, value}] }, fleetStatus: [{status: VehicleFleetStatus,
//     count}], oilReminders: [{vehicleId, plateNumber, makeName*, modelName*,
//     status, remainingKm, remainingDays}], kyc: { pendingCount,
//     overSlaCount }, actions: { can* } }
//
// POST /api/dashboard/today →
//   { branches[], briefing: { taskCount, pickupCount, returnCount,
//     pendingKycCount }, kpis: { pickupsToday|returnsToday|overdueNow:
//     {value, ...} }, queue[], alerts: [{id: "Type:Entity:Id", type, severity,
//     entityType, entityId, actionPath, createdAt, params[]}], branchFleet:
//     {available, rented, reserved, maintenance}, actions: { can* } }
//
// Fallbacks stay in place for older/alternative field names.

/* eslint-disable @typescript-eslint/no-explicit-any */

function pick(obj: any, ...keys: string[]): any {
  if (obj == null) return undefined;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

function num(v: any, fallback = 0): number {
  if (v != null && typeof v === "object") v = v.value; // KPI cells are {value, ...}
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(v: any, fallback = ""): string {
  return v == null ? fallback : String(v);
}

function arr(v: any): any[] {
  return Array.isArray(v) ? v : [];
}

/** KPI cell → {value, average7d, deltaPercent, extraCount} or a bare number. */
function kpiCell(raw: any): { value: number; deltaPct: number | null; average7d: number | null; extraCount: number | null } {
  if (raw != null && typeof raw === "object") {
    return {
      value: num(pick(raw, "value", "count", "total")),
      deltaPct: pick(raw, "deltaPercent", "deltaPct", "change") ?? null,
      average7d: pick(raw, "average7d", "avg7d", "average") ?? null,
      extraCount: pick(raw, "extraCount", "extra") ?? null,
    };
  }
  return { value: num(raw), deltaPct: null, average7d: null, extraCount: null };
}

export interface DashboardKpi {
  key: string;
  value: number;
  sub?: string;
  deltaPct?: number | null;
}

export interface ScheduleEntry {
  id: string;
  time: string;
  ampm: string;
  scheduledAt?: string;
  customerName: string;
  customerNameAr?: string;
  customerNameEn?: string;
  detail: string;
  detailAr?: string;
  detailEn?: string;
  ref: string;
  contractId?: number | null;
  kind: "pickup" | "return";
  urgent: boolean;
  unsigned?: boolean;
  kycPending?: boolean;
  latenessMinutes?: number | null;
  hourlyPenalty?: number | null;
  note?: string;
}

export interface FleetStatusSlice {
  key: string;
  count: number;
}

export interface RevenuePoint {
  label: string;
  value: number;
}

export interface OverviewData {
  overdueCount: number;
  overdueRefs: string[];
  overdueBannerNote?: string;
  kpis: DashboardKpi[];
  pickups: ScheduleEntry[];
  returns: ScheduleEntry[];
  revenue: RevenuePoint[];
  revenueTotal: number;
  revenueDeltaPct?: number | null;
  fleet: FleetStatusSlice[];
  fleetTotal: number;
  oilReminders: number;
  kycPending: number;
  kycOverdueSla: number;
  flags: Record<string, boolean>;
}

function mapScheduleEntry(item: any, kind: "pickup" | "return"): ScheduleEntry {
  const dt = pick(item, "scheduledAt", "time", "at", "dateTime", "startAt");
  let time = str(pick(item, "timeLabel", "timeText"));
  let ampm = str(pick(item, "ampm", "period"));
  if (!time && dt) {
    const d = new Date(dt);
    if (!isNaN(d.getTime())) {
      const h = d.getHours();
      ampm = h >= 12 ? "PM" : "AM";
      time = `${String(((h + 11) % 12) + 1).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
  }
  // Localized fields: "<make> <model> · <plate>" per language.
  const makeEn = pick(item, "vehicleMakeNameEn", "makeEn", "makeNameEn");
  const modelEn = pick(item, "vehicleModelNameEn", "modelEn", "modelNameEn");
  const makeAr = pick(item, "vehicleMakeNameAr", "makeAr", "makeNameAr");
  const modelAr = pick(item, "vehicleModelNameAr", "modelAr", "modelNameAr");
  const plate = pick(item, "plateNumber", "plate", "vehiclePlate");
  const vehicleEn = [makeEn, modelEn].filter(Boolean).join(" ");
  const vehicleAr = [makeAr, modelAr].filter(Boolean).join(" ");
  const vehicleFallback = str(pick(item, "vehicleName", "vehicle", "car", "carName"));
  const detailEn = [vehicleEn || vehicleFallback, plate].filter(Boolean).map(String).join(" · ");
  const detailAr = [vehicleAr || vehicleFallback, plate].filter(Boolean).map(String).join(" · ");
  return {
    id: str(pick(item, "id", "contractId", "ref", "contractNumber"), `${kind}-${Math.random()}`),
    time: time || "--:--",
    ampm,
    scheduledAt: dt ? str(dt) : undefined,
    customerName: str(pick(item, "customerName", "customerNameEn", "customer", "name", "fullName")),
    customerNameAr: pick(item, "customerNameAr") ?? undefined,
    customerNameEn: pick(item, "customerNameEn") ?? undefined,
    detail: str(pick(item, "detail", "subtitle")) || detailEn || detailAr,
    detailEn: detailEn || undefined,
    detailAr: detailAr || undefined,
    ref: str(pick(item, "contractNumber", "ref", "contractRef", "number")),
    contractId: pick(item, "contractId", "id"),
    kind,
    urgent: Boolean(pick(item, "isUrgent", "isOverdue", "urgent", "isLate", "overdue")),
    unsigned: Boolean(pick(item, "isUnsigned", "unsigned")),
    kycPending: Boolean(pick(item, "isKycPending", "kycPending")),
    latenessMinutes: pick(item, "latenessMinutes", "lateMinutes") ?? null,
    hourlyPenalty: pick(item, "hourlyPenalty", "penaltyPerHour") ?? null,
    note: pick(item, "note", "warning", "hint") ?? undefined,
  };
}

// VehicleFleetStatus enum (api-types): 1 Draft, 2 Available, 3 Rented,
// 4 Overdue, 5 Maintenance, 6 Reserved, 7 Inactive.
const FLEET_STATUS_KEY: Record<number, string> = {
  1: "draft",
  2: "available",
  3: "rented",
  4: "overdue",
  5: "maintenance",
  6: "reserved",
  7: "inactive",
};

function mapFleetSlice(item: any): FleetStatusSlice {
  const statusRaw = pick(item, "status", "key", "name", "label");
  const statusNum = Number(statusRaw);
  const key = Number.isFinite(statusNum) && FLEET_STATUS_KEY[statusNum]
    ? FLEET_STATUS_KEY[statusNum]
    : str(statusRaw).toLowerCase();
  return { key, count: num(pick(item, "count", "value", "total")) };
}

function mapRevenuePoint(item: any): RevenuePoint {
  return {
    label: str(pick(item, "label", "day", "date", "name")),
    value: num(pick(item, "value", "amount", "total", "revenue")),
  };
}

export function normalizeOverview(res: any): OverviewData {
  const root = res?.data ?? res ?? {};
  const kpisRaw = pick(root, "kpis", "kpi", "metrics") ?? root;

  const kpiDefs: { key: string; keys: string[] }[] = [
    { key: "availableCars", keys: ["availableCars", "availableVehicles", "available"] },
    { key: "activeContracts", keys: ["activeContracts", "activeRentals", "active"] },
    { key: "lateReturns", keys: ["lateReturns", "overdueReturns", "overdueCount", "late"] },
    { key: "todayRevenue", keys: ["todayRevenue", "revenueToday", "dailyRevenue"] },
    { key: "fleetUtilization", keys: ["fleetUtilization", "utilization", "utilizationPct", "utilizationPercent"] },
  ];

  const kpis: DashboardKpi[] = kpiDefs.map((d) => {
    const cell = kpiCell(pick(kpisRaw, ...d.keys));
    return { key: d.key, value: cell.value, deltaPct: cell.deltaPct };
  });

  const overdue = pick(root, "overdueAlert", "overdue", "overdueBanner") ?? {};
  const overdueRefs = arr(pick(overdue, "refs", "contractRefs", "contracts", "items", "contractNumbers"))
    .map((x: any) => str(pick(x, "contractNumber", "ref", "number", "id") ?? x))
    .filter(Boolean);

  const revenueRaw = pick(root, "revenue", "revenueSparkline", "sparkline") ?? {};
  const revenuePoints = arr(pick(revenueRaw, "points", "days", "data", "series") ?? revenueRaw)
    .map(mapRevenuePoint);

  const activity = pick(root, "todayActivity", "activity", "schedule") ?? {};

  const fleetRaw = pick(root, "fleetStatus", "fleet", "vehicleStatus") ?? {};
  let fleet: FleetStatusSlice[];
  if (Array.isArray(fleetRaw)) {
    fleet = fleetRaw.map(mapFleetSlice);
  } else {
    fleet = Object.entries(fleetRaw)
      .filter(([, v]) => typeof v === "number")
      .map(([k, v]) => ({ key: k.toLowerCase(), count: v as number }));
  }

  const kyc = pick(root, "kyc", "kycCounts", "verification") ?? {};
  const flags = pick(root, "actions", "actionFlags", "flags", "permissions") ?? {};
  const oilRaw = pick(root, "oilReminders", "oilDue", "oilChangesDue");

  return {
    overdueCount: num(pick(overdue, "count", "total") ?? pick(root, "overdueCount") ?? kpis.find((k) => k.key === "lateReturns")?.value, overdueRefs.length),
    overdueRefs,
    overdueBannerNote: pick(overdue, "note", "message", "description") ?? undefined,
    kpis,
    pickups: arr(pick(activity, "pickups", "pickupsToday") ?? pick(root, "pickups", "todayPickups")).map((x) => mapScheduleEntry(x, "pickup")),
    returns: arr(pick(activity, "returns", "returnsToday") ?? pick(root, "returns", "todayReturns")).map((x) => mapScheduleEntry(x, "return")),
    revenue: revenuePoints,
    revenueTotal: num(pick(revenueRaw, "total", "sum") ?? revenuePoints.reduce((s, p) => s + p.value, 0)),
    revenueDeltaPct: pick(revenueRaw, "deltaPercent", "deltaPct", "changePct", "growth") ?? null,
    fleet,
    fleetTotal: num(pick(root, "totalVehicles", "fleetTotal") ?? fleet.reduce((s, f) => s + f.count, 0)),
    oilReminders: Array.isArray(oilRaw) ? oilRaw.length : num(oilRaw),
    kycPending: num(pick(kyc, "pendingCount", "pending", "count")),
    kycOverdueSla: num(pick(kyc, "overSlaCount", "overdueSla", "slaBreached", "breachedSla")),
    flags: typeof flags === "object" && flags !== null ? flags : {},
  };
}

// ─── Employee "today" payload ──────────────────────────────────

export interface FleetAlert {
  id: string;
  kind: "danger" | "warning" | "info" | "success";
  title: string;
  titleAr?: string;
  desc: string;
  descAr?: string;
  time: string;
  href?: string;
  actionLabel?: string;
}

export interface TodayData {
  briefing?: {
    taskCount: number;
    pickupCount: number;
    returnCount: number;
    pendingKycCount: number;
  };
  pickupsToday: number;
  returnsToday: number;
  overdueNow: number;
  pickupsDeltaPct?: number | null;
  returnsDeltaPct?: number | null;
  nextPickupLabel?: string;
  earliestReturnLabel?: string;
  queue: ScheduleEntry[];
  alerts: FleetAlert[];
  branchFleet: FleetStatusSlice[];
  flags: Record<string, boolean>;
}

function alertKind(v: any): FleetAlert["kind"] {
  const n = Number(v);
  if (Number.isFinite(n)) {
    // NotificationSeverity: 1 info, 2 ?, 3 warning, 4+ critical
    if (n >= 4) return "danger";
    if (n === 3) return "warning";
    if (n === 2) return "info";
    return "info";
  }
  const s = String(v ?? "").toLowerCase();
  if (s.includes("crit") || s.includes("danger") || s.includes("error") || s.includes("overdue")) return "danger";
  if (s.includes("warn")) return "warning";
  if (s.includes("success") || s.includes("ok")) return "success";
  return "info";
}

/** Alert type name from the id's first segment: "RegistrationExpiring:Vehicle:2". */
function alertTypeName(item: any): string {
  const id = str(pick(item, "id"));
  const seg = id.split(":")[0];
  if (seg && seg !== id) return seg;
  return str(pick(item, "typeName", "name"));
}

/**
 * Builds a localized title/desc for backend alerts that ship only
 * `type` + `params[]` (no title/body).
 */
function alertText(item: any): { title: string; titleAr: string; desc: string; descAr: string } {
  const params = arr(pick(item, "params")).map(String);
  const name = alertTypeName(item);
  const [p0, p1, p2, p3] = params;

  switch (name) {
    case "RegistrationExpiring":
      return {
        title: `Registration expiring · ${p0 ?? ""}`.trim(),
        titleAr: `الاستمارة قاربت على الانتهاء · ${p0 ?? ""}`.trim(),
        desc: [p1, p2 != null && p2 !== "" ? `${p2} day(s) left` : ""].filter(Boolean).join(" · "),
        descAr: [p1, p2 != null && p2 !== "" ? `متبقّي ${p2} يوم` : ""].filter(Boolean).join(" · "),
      };
    case "InspectionExpiring":
      return {
        title: `Inspection expiring · ${p0 ?? ""}`.trim(),
        titleAr: `الفحص الدوري قارب على الانتهاء · ${p0 ?? ""}`.trim(),
        desc: [p1, p2 != null && p2 !== "" ? `${p2} day(s) left` : ""].filter(Boolean).join(" · "),
        descAr: [p1, p2 != null && p2 !== "" ? `متبقّي ${p2} يوم` : ""].filter(Boolean).join(" · "),
      };
    case "OilChangeDue":
    case "OilChangeDueSoon":
      return {
        title: `Oil change due · ${p0 ?? ""}`.trim(),
        titleAr: `حان موعد تغيير الزيت · ${p0 ?? ""}`.trim(),
        desc: params.slice(1).filter(Boolean).join(" · "),
        descAr: params.slice(1).filter(Boolean).join(" · "),
      };
    case "ContractCreated":
      return {
        title: `Contract created · ${p0 ?? ""}`.trim(),
        titleAr: `تم إنشاء العقد · ${p0 ?? ""}`.trim(),
        desc: [p2, p1, p3].filter(Boolean).join(" · "),
        descAr: [p2, p1, p3].filter(Boolean).join(" · "),
      };
    default: {
      const humanized = name ? name.replace(/([a-z])([A-Z])/g, "$1 $2") : str(pick(item, "title", "titleEn"));
      return {
        title: humanized || "Notification",
        titleAr: humanized || "تنبيه",
        desc: str(pick(item, "desc", "body", "message", "description")) || params.filter(Boolean).join(" · "),
        descAr: str(pick(item, "descAr", "bodyAr")) || params.filter(Boolean).join(" · "),
      };
    }
  }
}

/** Re-route backend actionPath (admin-style) to the employee portal. */
function employeeHref(path: string | undefined): string | undefined {
  if (!path) return undefined;
  if (/^\/contracts\/\d+/.test(path)) return path.replace(/^\/contracts\//, "/employee/contracts/");
  if (/^\/vehicles\/\d+/.test(path)) return path.replace(/^\/vehicles\//, "/employee/cars/");
  if (path === "/contracts") return "/employee/contracts";
  if (path === "/fleet" || path === "/vehicles") return "/employee/cars";
  return path;
}

function mapAlert(item: any): FleetAlert {
  const text = alertText(item);
  const createdAt = pick(item, "createdAt", "time", "at");
  let time = str(pick(item, "timeLabel"));
  if (!time && createdAt) {
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) {
      time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    }
  }
  return {
    id: str(pick(item, "id", "alertId"), Math.random().toString(36)),
    kind: alertKind(pick(item, "severity", "kind", "level", "type")),
    title: text.title,
    titleAr: text.titleAr || undefined,
    desc: text.desc,
    descAr: text.descAr || undefined,
    time,
    href: employeeHref(pick(item, "actionPath", "href", "url", "link") ?? undefined),
    actionLabel: pick(item, "actionLabel", "action") ?? undefined,
  };
}

export function normalizeToday(res: any): TodayData {
  const root = res?.data ?? res ?? {};
  const kpis = pick(root, "kpis", "metrics") ?? root;
  const briefingRaw = pick(root, "briefing", "shiftBriefing") ?? {};

  const queue = arr(pick(root, "queue", "todayQueue", "tasks", "schedule"))
    .map((x) => mapScheduleEntry(
      x,
      String(pick(x, "kind", "type", "direction") ?? "").toLowerCase().includes("return") ? "return" : "pickup",
    ));

  const branchFleetRaw = pick(root, "branchFleet", "carsAtBranch", "branchStatus") ?? {};
  const branchFleet = Array.isArray(branchFleetRaw)
    ? branchFleetRaw.map(mapFleetSlice)
    : Object.entries(branchFleetRaw)
        .filter(([, v]) => typeof v === "number")
        .map(([k, v]) => ({ key: k.toLowerCase(), count: v as number }));

  const flags = pick(root, "actions", "actionFlags", "flags") ?? {};

  const pickupsCell = kpiCell(pick(kpis, "pickupsToday", "pickups", "pickupCount"));
  const returnsCell = kpiCell(pick(kpis, "returnsToday", "returns", "returnCount"));

  // Earliest scheduled times for the KPI subtitles.
  const earliest = (kind: ScheduleEntry["kind"]) =>
    queue
      .filter((q) => q.kind === kind && q.scheduledAt)
      .sort((a, b) => String(a.scheduledAt).localeCompare(String(b.scheduledAt)))[0];
  const firstPickup = earliest("pickup");
  const firstReturn = earliest("return");

  return {
    briefing: {
      taskCount: num(pick(briefingRaw, "taskCount", "tasks", "total")),
      pickupCount: num(pick(briefingRaw, "pickupCount", "pickups")),
      returnCount: num(pick(briefingRaw, "returnCount", "returns")),
      pendingKycCount: num(pick(briefingRaw, "pendingKycCount", "kycPending")),
    },
    pickupsToday: pickupsCell.value,
    returnsToday: returnsCell.value,
    overdueNow: num(pick(kpis, "overdueNow", "overdue", "overdueCount", "lateNow")),
    pickupsDeltaPct: pickupsCell.deltaPct,
    returnsDeltaPct: returnsCell.deltaPct,
    nextPickupLabel: pick(kpis, "nextPickupAt", "nextPickup") ?? firstPickup?.time ?? undefined,
    earliestReturnLabel: pick(kpis, "earliestReturnAt", "earliestReturn") ?? firstReturn?.time ?? undefined,
    queue,
    alerts: arr(pick(root, "alerts", "fleetAlerts", "notifications")).map(mapAlert),
    branchFleet,
    flags: typeof flags === "object" && flags !== null ? flags : {},
  };
}
