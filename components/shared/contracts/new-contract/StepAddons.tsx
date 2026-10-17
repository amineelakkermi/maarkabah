"use client";

import type { Dispatch, RefObject, SetStateAction } from "react";
import { Search, Check, Gauge, CircleDot, List, LayoutGrid, Map as MapIcon, Loader2, ArrowLeft, ArrowRight, Tag } from "lucide-react";
import { Badge, Button, Input, Money, Select, Tabs } from "@/components/ui";
import type { Car, CarStatus } from "@/lib/data";
import type { TajeerRentStatus, SketchItem } from "@/lib/tajeer";
import { FleetAlertBadgeList, effectiveCarStatus } from "@/components/employee/FleetAlertBadges";
import { STATUS_BADGE_VARIANT, STATUS_TABS } from "@/lib/fleet";
import { VehicleTypeIcon } from "@/components/employee/VehicleTypeIcon";
import { getAvailabilityText } from "@/lib/maps";
import { T, ADD_ONS } from "./constants";
import type { ContractAdditionalService, LookupItem } from "./useContractLookups";
import { CAR_TYPE_AR } from "./mappers";
import { CarCardCarousel } from "./CarCardCarousel";
import { PriceBreakdown, type PriceRow } from "./PriceBreakdown";
import type { Pricing } from "./pricing";
import { VehicleConditionDrawer } from "./VehicleConditionDrawer";

export type Addons = Record<string, boolean>;

// Design-system tonal icon pairing (same tokens as the Pricing page's office-policy editor).
const ADDON_TONES = {
  blue:    { bg: "bg-mk-blue-50",    fg: "text-mk-blue-700" },
  mint:    { bg: "bg-mk-mint-100",   fg: "text-mk-mint-600" },
  violet:  { bg: "bg-mk-violet-100", fg: "text-mk-violet-700" },
  warning: { bg: "bg-mk-warning-100",fg: "text-mk-warning-700" },
  danger:  { bg: "bg-mk-danger-100", fg: "text-mk-danger-700" },
} as const;

// Per-service icon tone — same colours as the Pricing settings table. Services
// without an entry fall back to blue.
const DEFAULT_ADDON_TONE: Record<string, keyof typeof ADDON_TONES> = {
  child: "violet", delivery: "violet", return_agent: "violet", perfume: "violet",
  navigation: "mint",
  special_needs: "warning", fuel: "warning",
};
const addonToneOf = (k: string): keyof typeof ADDON_TONES => DEFAULT_ADDON_TONE[k] ?? "blue";

export type StepAddonsProps = {
  ar: boolean;
  car: Car | undefined;
  days: number;
  total: number;
  // Vehicles
  branches: LookupItem[];
  receiveBranchId: number;
  backendCars: Car[];
  availCars: Car[];
  vehiclesLoading: boolean; vehiclesError: string;
  carSearch: string; setCarSearch: (v: string) => void;
  carStatusTab: "all" | CarStatus; setCarStatusTab: (v: "all" | CarStatus) => void;
  carStatusCounts: Record<string, number>;
  viewMode: "card" | "list" | "map"; setViewMode: (v: "card" | "list" | "map") => void;
  carFilter: string; setCarFilter: (v: string) => void;
  pickedPlate: string; setPickedPlate: (v: string) => void;
  carMapRef: RefObject<HTMLDivElement | null>;
  carMapsLoaded: boolean;
  // Condition drawer
  showConditionModal: boolean; setShowConditionModal: (v: boolean) => void;
  conditionView: "sketch" | "photos"; setConditionView: (v: "sketch" | "photos") => void;
  sketchItems: SketchItem[]; setSketchItems: (items: SketchItem[]) => void;
  rentStatus: Partial<TajeerRentStatus>;
  // Add-ons
  addons: Addons; setAddons: Dispatch<SetStateAction<Addons>>;
  additionalServices: ContractAdditionalService[];
  tajeerEnabled?: boolean;
  /** Tajeer additional-coverage cap check (non-basic services ÷ days vs daily rate × 2). */
  coverage?: { perDay: number; maxPerDay: number; exceeds: boolean };
  // Live price breakdown (drives the summary card)
  pricing: Pricing;
  rentDayCost: number;
  rentHourCost: number;
  isHourlyRental: boolean;
  totalHours: number;
};

export function StepAddons({
  ar, car, days, total,
  branches, receiveBranchId,
  backendCars, availCars, vehiclesLoading, vehiclesError,
  carSearch, setCarSearch, carStatusTab, setCarStatusTab, carStatusCounts,
  viewMode, setViewMode, carFilter, setCarFilter, pickedPlate, setPickedPlate,
  carMapRef, carMapsLoaded,
  showConditionModal, setShowConditionModal, conditionView, setConditionView, sketchItems, setSketchItems, rentStatus,
  addons, setAddons, additionalServices, tajeerEnabled, coverage,
  pricing, rentDayCost, rentHourCost, isHourlyRental, totalHours,
}: StepAddonsProps) {
  const resolvedAdditionalServices = additionalServices.map((service) => {
    const key = service.key.toLowerCase().replace(/[-\s]+/g, "_");
    const fallback = ADD_ONS.find((addon) => addon.k === key);
    const perDay = service.billingUnit === 2;
    return {
      ...service,
      k: key,
      Icon: fallback?.Icon ?? CircleDot,
      nameAr: service.nameAr || fallback?.nameAr || key,
      nameEn: service.nameEn || fallback?.nameEn || key,
      descAr: service.descriptionAr || fallback?.descAr || "",
      descEn: service.descriptionEn || fallback?.descEn || "",
      price: service.unitPrice,
      unit: service.billingUnit === 2 ? "/ day" : service.billingUnit === 3 ? "/ Km" : "· once",
      unitAr: service.billingUnit === 2 ? "/ يوم" : service.billingUnit === 3 ? "/ كم" : "· مرة واحدة",
      perDay,
    };
  });
  // Backend `type`: 1 = basic, 2 = supplementary (same split as the pricing
  // admin badge). Rows without a type fall back to the legacy key list.
  const legacySupplementaryKeys = new Set(["fuel", "return_agent"]);
  const isBasic = (service: { type?: number; k: string }) =>
    service.type != null ? service.type === 1 : !legacySupplementaryKeys.has(service.k);
  // The extra-driver choice lives on step 1 (drivers card) — the picker needs
  // the driver list anyway, so no duplicate card here.
  const pickable = resolvedAdditionalServices.filter((service) => service.k !== "driver");
  const serviceGroups = [
    { key: "basic", labelEn: "Essential services", labelAr: "خدمات أساسية", items: pickable.filter(isBasic) },
    { key: "supplementary", labelEn: "Supplementary services", labelAr: "الخدمات التكميلية", items: pickable.filter((service) => !isBasic(service)) },
  ].filter((group) => group.items.length > 0);

  // Live-summary lines — amounts come from the shared pricing computation so
  // the card can't drift from what step 2 (payment) will show.
  const breakdownLines = (items: typeof pickable): PriceRow[] =>
    items
      .filter((s) => !!addons[s.k])
      .map((s) => ({
        key: s.k,
        label: ar ? s.nameAr : s.nameEn,
        sub: ar ? s.unitAr : s.unit,
        amount: pricing.addonPrices[s.k] ?? (s.perDay ? s.price * days : s.price),
      }));
  const breakdownFees: PriceRow[] = ([
    pricing.extraDriverFare > 0 && { key: "extra_driver", label: T("Additional driver", "سائق إضافي", ar), amount: pricing.extraDriverFare },
    pricing.transferFare > 0 && { key: "transfer", label: T("Branch transfer", "نقل المركبة بين الفروع", ar), amount: pricing.transferFare },
    pricing.authorizationFare > 0 && { key: "authorization", label: T("International authorization", "تفويض دولي", ar), amount: pricing.authorizationFare },
  ] as const).filter((r): r is PriceRow => Boolean(r));

  // One add-on line: flat, no surface of its own (it sits inside the add-ons card). Selecting fills the price and the check.
  function renderService(a: (typeof resolvedAdditionalServices)[number]) {
    const on = !!addons[a.k];
    const Icon = a.k === "unlimited_km" ? Gauge : a.Icon;
    const tone = ADDON_TONES[addonToneOf(a.k)];
    return (
      <li key={a.k} className="border-b border-mk-border">
        <button
          type="button"
          aria-pressed={on}
          onClick={() => setAddons((s) => ({ ...s, [a.k]: !s[a.k] }))}
          className="flex w-full items-center gap-3 py-3 text-start bg-transparent border-0 cursor-pointer"
        >
          <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${on ? `${tone.bg} ${tone.fg} border border-current` : "bg-mk-ink-50 text-mk-ink-400"}`}>
            <Icon size={16} />
          </div>
          <span className="flex-1 min-w-0">
            <span className="block mk-label text-mk-ink-900">{ar ? a.nameAr : a.nameEn}</span>
            <span className="block mk-caption text-mk-ink-400">{ar ? a.descAr : a.descEn}</span>
          </span>
          <span className="text-end shrink-0">
            <span className={`block mk-label ${on ? "text-mk-blue-500" : "text-mk-ink-900"}`}>{a.price} {T("SAR", "ريال", ar)}</span>
            <span className="block mk-overline text-mk-ink-400">{ar ? a.unitAr : a.unit}</span>
          </span>
          <span className={`w-5 h-5 rounded-xs flex items-center justify-center shrink-0 border ${on ? "bg-mk-blue-500 border-mk-blue-500" : "bg-transparent border-mk-ink-300"}`}>
            {on && <Check size={11} className="text-white" />}
          </span>
        </button>
      </li>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[7fr_5fr] items-start gap-4">

      {/* ── Column 1 — vehicle selection; condition & diagram open in a modal per vehicle ── */}
      <div className="mk-surface rounded-xl p-4 sm:p-6">
        {/* Header: title + count at the start; search and status at the end */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="mk-h4 text-mk-ink-900">{T("Vehicle Selection", "اختيار المركبة", ar)}</div>
            <div className="mk-caption mt-1 text-mk-ink-500">
              {availCars.filter(c => effectiveCarStatus(c, ar) === "available").length} {T("vehicles available for selected dates", "مركبة متاحة للتواريخ المحددة", ar)}
              {branches.find((b) => b.id === receiveBranchId) && ` · ${T("pickup branch", "فرع الاستلام", ar)}: ${ar ? branches.find((b) => b.id === receiveBranchId)!.nameAr : branches.find((b) => b.id === receiveBranchId)!.nameEn}`}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="flex-1 min-w-[200px] sm:max-w-[320px]">
              <Input
                variant="search"
                className="!rounded-md !border-mk-ink-200 !shadow-none"
                icon={<Search size={14} />}
                value={carSearch}
                onChange={(e) => setCarSearch(e.target.value)}
                placeholder={T("Search by make, model, plate…", "بحث عن ماركة, طراز, لوحة...", ar)}
              />
            </div>

            {/* Status filter */}
            <div className="shrink-0 w-[150px]">
              <Select
                value={carStatusTab}
                onChange={(e) => setCarStatusTab(e.target.value as "all" | CarStatus)}
                className="!rounded-md !border-mk-ink-200"
              >
                {([
                  { key: "all", labelEn: "All statuses", labelAr: "كل الحالات" },
                  { key: "available", labelEn: "Available", labelAr: "متاحة" },
                  { key: "rented", labelEn: "Rented", labelAr: "مؤجرة" },
                  { key: "overdue", labelEn: "Overdue", labelAr: "متأخر" },
                  { key: "maintenance", labelEn: "Maintenance", labelAr: "صيانة" },
                  { key: "reserved", labelEn: "Reserved", labelAr: "محجوزة" },
                ] as { key: "all" | CarStatus; labelEn: string; labelAr: string }[]).map((t) => (
                  <option key={t.key} value={t.key}>
                    {ar ? t.labelAr : t.labelEn}
                    {t.key !== "all" ? ` (${carStatusCounts[t.key] ?? 0})` : ""}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {/* Type tabs at the start, view toggle at the end */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="min-w-0 max-w-full overflow-x-auto mk-scrollbar-none">
            <Tabs
              variant="default"
              rounded="full"
              className="flex-nowrap! w-max"
              value={carFilter}
              onChange={setCarFilter}
              items={[
                { value: "all", label: T("All", "الكل", ar) },
                { value: "Sedan", label: T("Sedan", "سيدان", ar) },
                { value: "SUV", label: T("SUV", "دفع رباعي", ar) },
                { value: "Luxury", label: T("Luxury", "فاخرة", ar) },
                { value: "Economy", label: T("Economy", "اقتصادية", ar) },
              ]}
            />
          </div>

          <div className="shrink-0">
            <Tabs
              variant="default"
              value={viewMode}
              onChange={(v) => setViewMode(v as typeof viewMode)}
              items={[
                { value: "list", icon: <List size={15} />, "aria-label": "List view" },
                { value: "card", icon: <LayoutGrid size={15} />, "aria-label": "Card view" },
                { value: "map", icon: <MapIcon size={15} />, "aria-label": "Map view" },
              ]}
            />
          </div>
        </div>

        {/* Vehicle loading/error states */}
        {vehiclesLoading && (
          <div className="flex items-center justify-center gap-2 py-16">
            <Loader2 size={20} className="animate-spin text-mk-blue-500" />
            <span className="mk-label text-mk-ink-500">{T("Loading vehicles…", "جاري تحميل المركبات…", ar)}</span>
          </div>
        )}
        {vehiclesError && !vehiclesLoading && (
          <div className="text-center py-12">
            <div className="mk-label text-mk-danger mb-2">{vehiclesError}</div>
          </div>
        )}
        {!vehiclesLoading && !vehiclesError && backendCars.length === 0 && (
          <div className="text-center py-12 mk-label text-mk-ink-400">
            {T("No vehicles available", "لا توجد مركبات متاحة", ar)}
          </div>
        )}

        {/* Vehicle cards grid */}
        {!vehiclesLoading && !vehiclesError && viewMode === "card" && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] gap-3">
            {availCars
              .map((c) => {
                const picked = c.plate === pickedPlate;
                const effStatus = effectiveCarStatus(c, ar);
                const rentedOut = effStatus === "rented" || effStatus === "overdue";
                const statusMeta = STATUS_TABS.find((item) => item.key === effStatus);
                const statusLabel = statusMeta ? (ar ? statusMeta.labelAr : statusMeta.labelEn) : c.status;
                return (
                  // Same card as the fleet page (components/fleet/CarCard.tsx): identical
                  // header, image, alerts row and footer — click selects instead of
                  // opening the vehicle file, the overlay button opens the condition drawer.
                  <div
                    key={c.plate}
                    onClick={() => setPickedPlate(c.plate)}
                    className={`mk-vehicle-card ${picked ? "mk-vehicle-card--on" : ""} group/card relative flex flex-col rounded-xl overflow-hidden text-start select-none cursor-pointer h-full`}
                  >
                    <div className="px-4 pt-4 min-h-[7rem]">
                      <div className="flex items-start gap-2 mb-0">
                        <div className="flex-1 min-w-0">
                          <div className="mk-body font-semibold! text-mk-ink-900 truncate">{c.make} {c.model}</div>
                          <div className="mk-caption text-mk-ink-500 mt-1">{c.plate} · {T(c.type, CAR_TYPE_AR[c.type] ?? c.type, ar)} · {c.year}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge variant={STATUS_BADGE_VARIANT[effStatus]} dot>{statusLabel}</Badge>
                          {rentedOut && c.returnTime && (
                            <span className="mk-caption mt-1 text-mk-ink-500 shrink-0">{c.returnTime}</span>
                          )}
                        </div>
                      </div>
                      {/* Odometer & Allowed KM */}
                      <div className="flex flex-wrap items-center gap-2 mk-caption text-mk-ink-500 mt-1">
                        <div className="flex items-center gap-1">
                          <Gauge size={16} />
                          <span>{(c.odometerReading ?? 0).toLocaleString()} {T("km", "كم", ar)}</span>
                        </div>
                        <div className="w-px h-3 bg-mk-ink-200" />
                        <div>
                          {c.kmCap === "Unlimited"
                            ? T("Unlimited km", "كم غير محدود", ar)
                            : `${c.kmCap} ${T("km/day", "كم/يوم", ar)}`}
                        </div>
                      </div>
                    </div>

                    <div className="w-full relative">
                      <CarCardCarousel images={c.imageUrls || []} picked={picked} />
                    </div>

                    {/* Details */}
                    <div className="px-4 pb-4 pt-3 flex flex-col flex-1">
                      {/* mt-auto: when a neighbouring card is taller (alerts row), the slack lands
                          above the price, not between price and button. */}
                      <div className={`flex items-center justify-between mt-auto ${ar ? "" : "flex-row-reverse"}`}>
                        {/* Alerts on the physical right; the rental total on the left is the figure to read first. */}
                        <div className="min-w-0 flex justify-end">
                          <FleetAlertBadgeList car={c} ar={ar} showEmpty={false} />
                        </div>
                        <div className="text-end">
                          <Money size={16} className={`mk-body font-semibold! justify-end ${picked ? "text-mk-blue-500" : "text-mk-ink-900"}`}>{(c.dailyRate * days).toLocaleString()}</Money>
                          <div className="mk-caption text-mk-ink-400 mt-0.5">{days} {T("days total", "أيام إجمالي", ar)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Hover overlay over the whole card (same as the fleet card): a soft dim fades in and the button rises into the centre. */}
                    <div className={`absolute inset-0 z-10 flex items-center justify-center bg-black/40 transition-opacity duration-300 ease-out group-hover/card:opacity-100 group-hover/card:pointer-events-auto ${picked ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        dir={ar ? "rtl" : "ltr"}
                        className={`group justify-center !bg-white !text-[#0F1430] !border-white hover:!bg-mk-blue-500 hover:!text-white hover:!border-mk-blue-500 transition-[translate,background,color,border-color,scale]! duration-300! ease-out! group-hover/card:translate-y-0 ${picked ? "translate-y-0" : "translate-y-3"}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPickedPlate(c.plate);
                          setShowConditionModal(true);
                        }}
                      >
                        <span>{T("Condition", "حالة السيارة", ar)}</span>
                        {ar ? (
                          <ArrowLeft size={14} className="shrink-0 transition-transform duration-500 ease-out group-hover:-translate-x-1" />
                        ) : (
                          <ArrowRight size={14} className="shrink-0 transition-transform duration-500 ease-out group-hover:translate-x-1" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* LIST VIEW */}
        {!vehiclesLoading && !vehiclesError && viewMode === "list" && (
          <div className="flex flex-col gap-2">
            {availCars
              .map((c) => {
                const picked = c.plate === pickedPlate;
                const odometer = c.odometerReading ?? 0;
                const effStatus = effectiveCarStatus(c, ar);
                const statusColor: Record<string, string> = {
                  available: "var(--color-mk-mint-600)", rented: "var(--color-mk-blue-500)", overdue: "var(--color-mk-danger)",
                  maintenance: "var(--color-mk-warning)", reserved: "var(--color-mk-violet-500)",
                };
                return (
                  <div
                    key={c.plate}
                    role="button"
                    tabIndex={0}
                    onClick={() => setPickedPlate(c.plate)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPickedPlate(c.plate); } }}
                    className={`mk-option ${picked ? "mk-option--on" : ""} flex flex-wrap sm:flex-nowrap items-center gap-3 p-3 rounded-lg text-start w-full border-0 cursor-pointer`}
                  >
                    <div className={`w-12 h-12 rounded-md overflow-hidden flex items-center justify-center text-[24px] shrink-0`}>
                      {(() => {
                        const images = c.imageUrls;
                        if (images && images.length > 0) {
                          const src = images[0];
                          return (
                            <img
                              src={src}
                              alt={c.model}
                              className="w-[full] h-[full] object-cover"
                            />
                          );
                        }
                        return <VehicleTypeIcon type={c.type} size={20} className="w-full h-full" />;
                      })()}
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="mk-body text-mk-ink-900">{c.make} {c.model} · {c.year}</div>
                        <span className="mk-overline px-2 py-1 rounded-full"
                          style={{ background: `${statusColor[effStatus] ?? "var(--color-mk-ink-400)"}18`, color: statusColor[effStatus] ?? "var(--color-mk-ink-400)" }}>
                          {effStatus === "available" ? T("Free", "متاحة", ar) :
                            effStatus === "rented" ? T("Rented", "مؤجرة", ar) :
                              effStatus === "overdue" ? T("Overdue", "متأخرة", ar) :
                                effStatus === "maintenance" ? T("Maintenance", "صيانة", ar) :
                                T(effStatus, effStatus, ar)}
                        </span>
                        {(effStatus === "rented" || effStatus === "overdue") && (
                          <span className="mk-overline text-mk-ink-500">
                            · {getAvailabilityText(effStatus, c.id, ar)}
                          </span>
                        )}
                        <FleetAlertBadgeList car={c} ar={ar} showEmpty={false} />
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="mk-caption text-mk-ink-500">{c.plate}</span>
                        <span className="mk-caption text-mk-ink-500">{T(c.type, CAR_TYPE_AR[c.type] ?? c.type, ar)}</span>
                        <span className="flex items-center gap-1 mk-caption text-mk-ink-500">
                          <Gauge size={11} />{odometer.toLocaleString()} {T("km", "كم", ar)}
                        </span>
                        <span className="mk-caption text-mk-ink-500">
                          {c.kmCap === "Unlimited" ? T("Unlimited km", "كم غير محدود", ar) : `${c.kmCap} ${T("km/day", "كم/يوم", ar)}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                      <div className="text-end shrink-0">
                        <div className={`${picked ? "text-mk-blue-500" : "text-mk-ink-900"} flex items-center justify-end gap-1`}>
                          <Money size={16} className="mk-body">{c.dailyRate}</Money>
                          <span className="mk-caption text-mk-ink-400">{T("/d", "/يوم", ar)}</span>
                        </div>
                        <div className="mk-caption mt-1 text-mk-ink-400">
                          {T("est.", "تقدير", ar)} {(c.dailyRate * days).toLocaleString()} {T("SAR", "ريال", ar)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPickedPlate(c.plate);
                          setShowConditionModal(true);
                        }}
                        className="flex items-center gap-1 px-3 py-2 rounded-pill mk-overline bg-mk-ink-100 hover:bg-mk-ink-200 text-mk-ink-600 border-0 cursor-pointer shrink-0"
                      >
                        <Gauge size={12} />
                        {T("Condition", "حالة السيارة", ar)}
                      </button>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${picked ? "bg-mk-blue-500 border-0" : "bg-transparent border-2 border-mk-ink-200"}`}>
                        {picked && <Check size={11} className="text-white" />}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* MAP VIEW */}
        {!vehiclesLoading && !vehiclesError && viewMode === "map" && (
          <div className="relative w-full rounded-md overflow-hidden border border-mk-ink-100 h-[420px]">
            <div ref={carMapRef} className="w-full h-full" />
            {!carMapsLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-mk-ink-50 text-mk-ink-500 mk-label">
                {T("Loading Google Maps...", "جاري تحميل خريطة جوجل...", ar)}
              </div>
            )}

            {/* Hint */}
            <div className="absolute top-3 start-3 end-3 flex justify-center pointer-events-none z-10">
              <span className="mk-caption px-4 py-2 rounded-pill bg-white/90 text-mk-ink-600 shadow-sm border border-mk-ink-100">
                {T("Click any car pin to select it", "اضغط على أي سيارة لاختيارها", ar)}
              </span>
            </div>

            {/* Legend */}
            <div className="absolute bottom-3 end-3 flex gap-3 mk-overline border border-mk-ink-200 px-3 py-2 rounded-sm bg-white/90 z-10 shadow-sm">
              {(ar
                ? [["var(--color-mk-mint-600)", "متاحة"], ["var(--color-mk-blue-500)", "مؤجرة"], ["var(--color-mk-danger)", "متأخر"], ["var(--color-mk-warning)", "صيانة"]]
                : [["var(--color-mk-mint-600)", "Available"], ["var(--color-mk-blue-500)", "Rented"], ["var(--color-mk-danger)", "Overdue"], ["var(--color-mk-warning)", "Maintenance"]]
              ).map(([c, l]) => (
                <span key={l} className="flex items-center gap-2 text-mk-ink-700">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: c }} />{l}
                </span>
              ))}
            </div>

            {/* Selected car chip */}
            {car && (
              <div className="absolute bottom-3 start-3 flex items-center gap-2 px-3 py-2 rounded-md bg-white/95 border border-mk-ink-100 shadow-sm z-10">
                <VehicleTypeIcon type={car.type} size={16} className="w-7 h-7" />
                <div>
                  <div className="mk-label text-mk-ink-900">{car.make} {car.model}</div>
                  <div className="mk-caption text-mk-ink-400">{car.plate}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConditionModal(true)}
                  className="flex items-center gap-1 px-3 py-2 rounded-pill mk-overline bg-mk-ink-100 hover:bg-mk-ink-200 text-mk-ink-600 border-0 cursor-pointer"
                >
                  <Gauge size={12} />
                  {T("Condition", "حالة السيارة", ar)}
                </button>
              </div>
            )}
          </div>
        )}

        {availCars.length === 0 && viewMode !== "map" && (
          <div className="text-center py-12 mk-label text-mk-ink-400">
            {T("No matching vehicles", "لا توجد مركبات مطابقة", ar)}
          </div>
        )}
      </div>

      {/* ══ RIGHT COLUMN: Add-ons + Live Summary — sticky ════════════════════ */}
      <div className="flex flex-col gap-5 lg:sticky lg:top-[18px]">

        {/* 1. ADDITIONAL SERVICES / ADD-ONS CARD */}
        <div className="mk-surface rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="mk-h4 flex-1 text-mk-ink-900">{T("Add-ons", "الخدمات الإضافية", ar)}</div>
            <span className="mk-caption text-mk-ink-400">{T("Optional", "اختياري", ar)}</span>
          </div>
          <div className="flex flex-col">

            {pickable.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Tag size={22} className="text-mk-ink-300" />
                <p className="mk-caption text-mk-ink-400 max-w-[220px]">
                  {T("No add-on services are currently active. Manage them from Pricing settings.", "لا توجد خدمات إضافية مفعّلة حاليًا. يمكن إدارتها من إعدادات الأسعار.", ar)}
                </p>
              </div>
            )}

            {serviceGroups.map((group, i) => (
              <div key={group.key} className="flex flex-col">
                <div className={`mk-overline uppercase mb-1 text-mk-ink-400 mk-tracking-wide ${i > 0 ? "mt-4" : ""}`}>
                  {T(group.labelEn, group.labelAr, ar)}
                </div>
                {/* Two columns while the card spans the page, one once it is the narrow side column */}
                <ul className="list-none p-0 m-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 md:gap-x-8 [&>li:last-child]:border-b-0 md:max-lg:[&>li:nth-last-child(2):nth-child(odd)]:border-b-0">
                  {group.items.map(renderService)}
                </ul>
                {group.key === "supplementary" && tajeerEnabled && coverage?.exceeds && (
                  <p className="mk-caption px-3 py-2 mt-2 rounded-lg bg-mk-danger-100 text-mk-danger-700">
                    {T(
                      `Additional coverage ${coverage.perDay.toLocaleString()} SAR/day exceeds the Tajeer maximum of ${coverage.maxPerDay.toLocaleString()} SAR/day (daily rate × 2). Remove a supplementary service to continue.`,
                      `التغطية الإضافية ${coverage.perDay.toLocaleString()} ريال/يوم تتجاوز الحد الأقصى في تاجير ${coverage.maxPerDay.toLocaleString()} ريال/يوم (السعر اليومي × 2). أزل خدمة تكميلية للمتابعة.`,
                      ar
                    )}
                  </p>
                )}
              </div>
            ))}

          </div>
        </div>

        {/* 2. LIVE SUMMARY CARD — compact total only */}
        <div className="mk-surface rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="mk-h4 flex-1 text-mk-ink-900">{T("Live summary", "ملخص مباشر", ar)}</div>
            <Badge variant="warning" dot>MK-2428</Badge>
          </div>
          <PriceBreakdown
            ar={ar}
            rental={{
              name: car ? `${car.make} ${car.model}` : undefined,
              days,
              dailyRate: rentDayCost || car?.dailyRate || 0,
              subtotal: pricing.base,
            }}
            hourly={isHourlyRental ? { rate: rentHourCost, hours: totalHours } : undefined}
            essential={breakdownLines(serviceGroups.find((g) => g.key === "basic")?.items ?? [])}
            supplementary={breakdownLines(serviceGroups.find((g) => g.key === "supplementary")?.items ?? [])}
            fees={breakdownFees}
            discountAmount={pricing.discountAmount}
            vatAmount={pricing.vat}
            total={total}
          />
        </div>
      </div>

      {/* VEHICLE CONDITION DRAWER — opens when a vehicle is clicked */}
      {car && (
        <VehicleConditionDrawer
          ar={ar}
          car={car}
          showConditionModal={showConditionModal}
          setShowConditionModal={setShowConditionModal}
          conditionView={conditionView}
          setConditionView={setConditionView}
          sketchItems={sketchItems}
          setSketchItems={setSketchItems}
          rentStatus={rentStatus}
        />
      )}
    </div>
  );
}
