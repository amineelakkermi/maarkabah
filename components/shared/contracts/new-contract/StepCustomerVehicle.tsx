"use client";

import { useRef, useEffect, type RefObject } from "react";
import { Search, Check, UserPlus, UserCheck, Shield, Gauge, X, LayoutGrid, List, Map as MapIcon, Loader2 } from "lucide-react";
import { Avatar, Badge, RiyalSymbol, Input, Select, Button, Chip, IconButton, Tabs, DatePicker, DateTimePicker } from "@/components/ui";
import type { Car, CarStatus, DriverProfile } from "@/lib/data";
import { TAJEER_LOOKUPS, type TajeerRentStatus, type SketchItem } from "@/lib/tajeer";
import { FleetAlertBadgeList, FleetAlertImageOverlay } from "@/components/employee/FleetAlertBadges";
import { VehicleTypeIcon } from "@/components/employee/VehicleTypeIcon";
import { getAvailabilityText } from "@/lib/maps";
import { T, getCustomerStatusTag, CUSTOMER_STATUS_META, NEIGHBORING_COUNTRIES } from "./constants";
import { PersonPicker } from "./PersonPicker";
import { CarCardCarousel } from "./CarCardCarousel";
import { VehicleConditionDrawer } from "./VehicleConditionDrawer";

export type StepCustomerVehicleProps = {
  ar: boolean;
  // Customer
  showCustomerSearch: boolean; setShowCustomerSearch: (v: boolean) => void;
  customerQuery: string; setCustomerQuery: (v: string) => void;
  customersLoading: boolean; customersError: string;
  filteredCustomers: DriverProfile[];
  selectedCustomer: DriverProfile | null; setSelectedCustomer: (c: DriverProfile | null) => void;
  setIsNewCustomerOpen: (v: boolean) => void;
  // Rental period
  pickupDateTime: string; setPickupDateTime: (v: string) => void;
  returnDateTime: string; setReturnDateTime: (v: string) => void;
  rentalDurationLabel: string;
  isHourlyRental: boolean;
  days: number;
  // Authorization
  authorizationStartDate: string; setAuthorizationStartDate: (v: string) => void;
  authorizationEndDate: string; setAuthorizationEndDate: (v: string) => void;
  authorizationTypeCode: "internal" | "external"; setAuthorizationTypeCode: (v: "internal" | "external") => void;
  authorizationCountry: string; setAuthorizationCountry: (v: string) => void;
  // Authorized driver
  isRenterDriver: boolean; setIsRenterDriver: (v: boolean) => void;
  filteredAuthDrivers: DriverProfile[];
  authDriverQuery: string; setAuthDriverQuery: (v: string) => void;
  selectedAuthDriver: DriverProfile | null;
  handleSelectAuthDriver: (d: DriverProfile) => void;
  clearAuthDriver: () => void;
  setShowAuthDriverAddNew: (v: boolean) => void;
  driversLoading: boolean; driversError: string;
  // Extra driver
  extraDriverEnabled: boolean; setExtraDriverEnabled: (next: boolean) => void;
  filteredExtraDrivers: DriverProfile[];
  extraDriverQuery: string; setExtraDriverQuery: (v: string) => void;
  selectedExtraDriver: DriverProfile | null;
  handleSelectExtraDriver: (d: DriverProfile) => void;
  clearExtraDriver: () => void;
  setShowExtraDriverAddNew: (v: boolean) => void;
  // Vehicles
  backendCars: Car[];
  availCars: Car[];
  car: Car | undefined;
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
};

export function StepCustomerVehicle({
  ar,
  showCustomerSearch, setShowCustomerSearch, customerQuery, setCustomerQuery, customersLoading, customersError,
  filteredCustomers, selectedCustomer, setSelectedCustomer, setIsNewCustomerOpen,
  pickupDateTime, setPickupDateTime, returnDateTime, setReturnDateTime, rentalDurationLabel, isHourlyRental, days,
  authorizationStartDate, setAuthorizationStartDate, authorizationEndDate, setAuthorizationEndDate,
  authorizationTypeCode, setAuthorizationTypeCode, authorizationCountry, setAuthorizationCountry,
  isRenterDriver, setIsRenterDriver, filteredAuthDrivers, authDriverQuery, setAuthDriverQuery, selectedAuthDriver,
  handleSelectAuthDriver, clearAuthDriver, setShowAuthDriverAddNew, driversLoading, driversError,
  extraDriverEnabled, setExtraDriverEnabled, filteredExtraDrivers, extraDriverQuery, setExtraDriverQuery,
  selectedExtraDriver, handleSelectExtraDriver, clearExtraDriver, setShowExtraDriverAddNew,
  backendCars, availCars, car, vehiclesLoading, vehiclesError, carSearch, setCarSearch, carStatusTab, setCarStatusTab,
  carStatusCounts, viewMode, setViewMode, carFilter, setCarFilter, pickedPlate, setPickedPlate, carMapRef, carMapsLoaded,
  showConditionModal, setShowConditionModal, conditionView, setConditionView, sketchItems, setSketchItems, rentStatus,
}: StepCustomerVehicleProps) {
  // Close the floating search panels on outside click — same behavior as the
  // designer's page (outside click cancels back to the default answer).
  const authDriverPanelRef = useRef<HTMLDivElement>(null);
  const extraDriverPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (
        !isRenterDriver && !selectedAuthDriver &&
        authDriverPanelRef.current && !authDriverPanelRef.current.contains(e.target as Node)
      ) {
        clearAuthDriver();
        setIsRenterDriver(true);
      }
      if (
        extraDriverEnabled && !selectedExtraDriver &&
        extraDriverPanelRef.current && !extraDriverPanelRef.current.contains(e.target as Node)
      ) {
        clearExtraDriver();
        setExtraDriverEnabled(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [isRenterDriver, selectedAuthDriver, extraDriverEnabled, selectedExtraDriver,
      clearAuthDriver, clearExtraDriver, setIsRenterDriver, setExtraDriverEnabled]);

  return (
    <div className="flex flex-col gap-4">
      {/* Contract info + Drivers — side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Contract info card */}
        <div className="mk-surface rounded-xl p-6">
          <div className="mk-h4 mb-6 text-mk-ink-900">{T("Renter info", "بيانات المستأجر", ar)}</div>
          <div>

            {/* Renter */}
            <div>


              {showCustomerSearch ? (
                /* Customer search — results as an absolute dropdown */
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-3 rounded-md px-4 h-10 bg-mk-ink-50 border border-mk-ink-100">
                      <Search size={14} className="shrink-0 text-mk-ink-500" />
                      <input className="flex-1 bg-transparent outline-none mk-body-sm text-mk-ink-900"
                        placeholder={T("Search customer by phone, ID, or name…", "ابحث عن العميل بالهاتف أو الهوية أو الاسم…", ar)}
                        value={customerQuery}
                        onChange={(e) => setCustomerQuery(e.target.value)} />
                      {customerQuery && (
                        <IconButton size="sm" variant="ghost" className="shrink-0" onClick={() => setCustomerQuery("")}>
                          <X size={13} />
                        </IconButton>
                      )}
                    </div>
                    <Button
                      variant="tonal"
                      size="sm"
                      className="shrink-0 whitespace-nowrap !rounded-md"
                      onClick={() => setIsNewCustomerOpen(true)}
                    >
                      <UserPlus size={14} />
                      {T("Add new", "إضافة عميل", ar)}
                    </Button>
                  </div>
                  {customersLoading && (
                    <div className="flex items-center justify-center gap-2 p-4 mt-2 rounded-xl border border-mk-ink-100 bg-white">
                      <Loader2 size={16} className="animate-spin text-mk-ink-400" />
                      <span className="mk-caption text-mk-ink-400">{T("Loading customers…", "جاري تحميل العملاء…", ar)}</span>
                    </div>
                  )}
                  {customersError && !customersLoading && (
                    <div className="p-4 mt-2 rounded-xl border border-mk-danger/20 bg-mk-danger/5 mk-caption text-mk-danger">
                      {customersError}
                    </div>
                  )}
                  {!customersLoading && !customersError && customerQuery.trim().length > 0 && (
                    <div className="absolute z-30 top-full inset-x-0 mt-2 rounded-xl border border-mk-ink-100 bg-white shadow-lg max-h-[280px] overflow-y-auto">
                      {filteredCustomers.length === 0 ? (
                        <div className="p-4 text-center mk-caption text-mk-ink-400">{T("No customers found", "لا يوجد عملاء مطابقون", ar)}</div>
                      ) : filteredCustomers.map((c) => {
                        const tag = getCustomerStatusTag(c);
                        const meta = CUSTOMER_STATUS_META[tag];
                        return (
                          <button key={c.id}
                            onClick={() => { setSelectedCustomer(c); setCustomerQuery(""); setShowCustomerSearch(false); }}
                            className="flex items-center gap-3 p-3 w-full text-start border-0 cursor-pointer hover:bg-mk-ink-50 border-b border-mk-ink-50 last:border-none"
                          >
                            <Avatar name={c.name} size="sm" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="mk-label text-mk-ink-900">{ar ? c.nameAr : c.name}</div>
                                <span className="mk-overline px-2 py-1 rounded-full shrink-0 bg-mk-ink-100 text-mk-ink-600">
                                  {ar ? TAJEER_LOOKUPS.idTypes.find(t => t.code === c.idTypeCode)?.ar : TAJEER_LOOKUPS.idTypes.find(t => t.code === c.idTypeCode)?.en}
                                </span>
                              </div>
                              <div className="mk-caption text-mk-ink-500">
                                {c.phone} · {c.bookings} {T("past contracts · ★", "عقود سابقة · ★", ar)} {c.rating}
                              </div>
                            </div>
                            <span className={`mk-overline px-2 py-1 rounded-full shrink-0 ${meta.className}`}>
                              {T(meta.labelEn, meta.labelAr, ar)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : selectedCustomer ? (() => {
                const tag = getCustomerStatusTag(selectedCustomer);
                const meta = CUSTOMER_STATUS_META[tag];
                return (
                  <div>
                    <div className={`flex items-center gap-3 p-3 rounded-lg border ${meta.blocking ? "border-mk-danger/30 bg-mk-danger/5" : "border-mk-blue-500/30 bg-mk-blue-surface"}`}>
                      <Avatar name={selectedCustomer.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="mk-label text-mk-ink-900">{ar ? selectedCustomer.nameAr : selectedCustomer.name}</div>
                          <span className="mk-overline px-2 py-1 rounded-full shrink-0 bg-mk-ink-100 text-mk-ink-600">
                            {ar ? TAJEER_LOOKUPS.idTypes.find(t => t.code === selectedCustomer.idTypeCode)?.ar : TAJEER_LOOKUPS.idTypes.find(t => t.code === selectedCustomer.idTypeCode)?.en}
                          </span>
                        </div>
                        <div className="mk-caption text-mk-ink-500">
                          {selectedCustomer.phone} · {selectedCustomer.bookings} {T("past contracts · ★", "عقود سابقة · ★", ar)} {selectedCustomer.rating}
                        </div>
                      </div>
                      <span className={`mk-overline px-2 py-1 rounded-full shrink-0 ${meta.className}`}>
                        {T(meta.labelEn, meta.labelAr, ar)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowCustomerSearch(true)}
                        title={T("Change customer", "تغيير العميل", ar)}
                        className="bg-transparent border-0 cursor-pointer text-mk-ink-400 flex shrink-0"
                      >
                        <X size={13} />
                      </button>
                    </div>

                    {meta.blocking && (
                      <div className="flex items-center gap-2 mt-2 p-3 rounded-lg mk-caption bg-mk-danger/8 text-mk-danger">
                        <Shield size={13} className="shrink-0" />
                        {tag === "blacklisted"
                          ? T("This customer is blacklisted — a contract cannot be issued.", "هذا العميل ضمن القائمة السوداء — لا يمكن إصدار عقد.", ar)
                          : T("This customer's identity is not verified — a contract cannot be issued.", "هوية هذا العميل غير موثقة — لا يمكن إصدار عقد.", ar)}
                      </div>
                    )}

                    {tag === "debt" && (
                      <div className="mt-2 p-3 rounded-lg mk-caption bg-mk-warning/8 text-mk-warning-700">
                        <div className="mk-label mb-1">
                          {T(`Outstanding debt · ${selectedCustomer.debtAmount} SAR`, `مديونية مستحقة · ${selectedCustomer.debtAmount} ريال`, ar)}
                        </div>
                        <div>{ar ? selectedCustomer.debtNoteAr : selectedCustomer.debtNote}</div>
                      </div>
                    )}

                    {tag === "circular" && (
                      <div className="mt-2 p-3 rounded-lg mk-caption bg-mk-violet-100/60 text-mk-violet-600">
                        <div className="mk-label mb-1">{T("Circular notice", "تعميم", ar)}</div>
                        <div>{ar ? selectedCustomer.circularNoteAr : selectedCustomer.circularNote}</div>
                      </div>
                    )}
                  </div>
                );
              })() : null}
            </div>

            {/* Rental period */}
            <div className="pt-6 mt-6 border-t border-mk-ink-100">


              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <DateTimePicker
                    label={T("Pickup date & time", "تاريخ ووقت التسليم", ar)}
                    value={pickupDateTime}
                    onChange={setPickupDateTime}
                    ar={ar}
                    variant="muted"
                  />
                  <DateTimePicker
                    label={T("Return date & time", "تاريخ ووقت الإرجاع", ar)}
                    value={returnDateTime}
                    onChange={setReturnDateTime}
                    ar={ar}
                    variant="muted"
                  />
                </div>
              </div>

              {/* Rental type — with the (dynamic) duration shown inline */}
              <div className="mt-2 text-start">
                <span className="mk-caption text-mk-ink-700">
                  {rentalDurationLabel} · {isHourlyRental ? T("Hourly", "ساعة", ar) : T("Daily", "يومي", ar)}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Drivers card */}
        <div className="mk-surface rounded-xl p-6">
          <div className="mk-h4 mb-6 text-mk-ink-900">{T("Authorization & Drivers", "بيانات التفويض", ar)}</div>
          <div>

            {/* Authorization window — moved here alongside driver data */}
            <div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DatePicker
                  label={T("Authorization start date", "تاريخ بداية التفويض", ar)}
                  value={authorizationStartDate}
                  onChange={setAuthorizationStartDate}
                  ar={ar}
                  variant="muted"
                />
                <DatePicker
                  label={<>{T("Authorization end date", "تاريخ نهاية التفويض", ar)}<span className="text-mk-danger"> *</span></>}
                  value={authorizationEndDate}
                  onChange={setAuthorizationEndDate}
                  ar={ar}
                  variant="muted"
                />
                <div>
                  <label className="mk-overline mb-2 block text-mk-ink-600">
                    {T("Authorization type", "نوع التفويض", ar)}
                  </label>
                  <Select
                    value={authorizationTypeCode}
                    onChange={(e) => setAuthorizationTypeCode(e.target.value as "internal" | "external")}
                  >
                    <option value="internal">{T("Internal", "داخلي", ar)}</option>
                    <option value="external">{T("External", "خارجي", ar)}</option>
                  </Select>
                </div>
                {authorizationTypeCode === "external" && (
                  <div>
                    <label className="mk-overline mb-2 block text-mk-ink-600">
                      {T("Country", "الدولة", ar)}
                    </label>
                    <Select
                      value={authorizationCountry}
                      onChange={(e) => setAuthorizationCountry(e.target.value)}
                    >
                      <option value="" disabled>{T("Select a country", "اختر دولة", ar)}</option>
                      {NEIGHBORING_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>{ar ? c.ar : c.en}</option>
                      ))}
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {/* Authorized driver + Extra driver — questions side by side; the
                search panel overlays the whole card at 100% width (designer). */}
            <div className="pt-6 mt-6 border-t border-mk-ink-100 relative">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-mk-blue-500/10 flex items-center justify-center shrink-0">
                    <UserCheck size={14} className="text-mk-blue-500" />
                  </div>
                  <span className="mk-label text-mk-ink-900">{T("Authorized driver", "المفوض بالقيادة", ar)}</span>
                </div>
                <p className="mk-caption text-mk-ink-500 mb-4 mt-2">
                  {T("Authorized drivers must hold a valid Saudi National ID or Iqama (residence permit) only.", "المفوضين هوية وطنية أو إقامة سارية فقط.", ar)}
                </p>
                {selectedAuthDriver ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg mk-row-bg border border-mk-blue-500/30">
                    <Avatar name={selectedAuthDriver.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="mk-caption text-mk-ink-900">{ar ? selectedAuthDriver.nameAr : selectedAuthDriver.name}</div>
                      <div className="mk-overline text-mk-ink-500">
                        {selectedAuthDriver.idType} · {selectedAuthDriver.nationalId} · {selectedAuthDriver.phone}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearAuthDriver}
                      className="mk-overline text-mk-ink-500 bg-mk-ink-50 px-2 py-1 rounded-full border-0 cursor-pointer"
                    >
                      {T("Change", "تغيير", ar)}
                    </button>
                  </div>
                ) : (
                  <>
                    <label className="mk-overline mb-2 block text-mk-ink-600">
                      {T("Is the beneficiary the authorized driver?", "هل المستفيد هو نفسه المفوض؟", ar)}
                    </label>
                    <div className="flex gap-2 mb-3 mt-2">
                      <Chip active={isRenterDriver} onClick={() => { setIsRenterDriver(true); clearAuthDriver(); }}>
                        {T("Yes", "نعم", ar)}
                      </Chip>
                      <Chip active={!isRenterDriver} onClick={() => setIsRenterDriver(false)}>
                        {T("No", "لا", ar)}
                      </Chip>
                    </div>
                  </>
                )}
              </div>

              {/* Extra driver */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-mk-blue-500/10 flex items-center justify-center shrink-0">
                    <UserPlus size={14} className="text-mk-blue-500" />
                  </div>
                  <span className="mk-label text-mk-ink-900">{T("Extra driver", "السائق الإضافي", ar)}</span>
                </div>
                <p className="mk-caption text-mk-ink-500 mb-4 mt-2">
                  {T("A second driver authorized on the contract.", "سائق ثانٍ مفوّض على العقد.", ar)}
                </p>
                {selectedExtraDriver ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg mk-row-bg border border-mk-blue-500/30">
                    <Avatar name={selectedExtraDriver.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="mk-caption text-mk-ink-900">{ar ? selectedExtraDriver.nameAr : selectedExtraDriver.name}</div>
                      <div className="mk-overline text-mk-ink-500">
                        {selectedExtraDriver.idType} · {selectedExtraDriver.nationalId} · {selectedExtraDriver.phone}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearExtraDriver}
                      className="mk-overline text-mk-ink-500 bg-mk-ink-50 px-2 py-1 rounded-full border-0 cursor-pointer"
                    >
                      {T("Change", "تغيير", ar)}
                    </button>
                  </div>
                ) : (
                  <>
                    <label className="mk-overline mb-2 block text-mk-ink-600">
                      {T("Is there an extra driver on this contract?", "هل يوجد سائق إضافي على هذا العقد؟", ar)}
                    </label>
                    <div className="flex gap-2 mb-3 mt-2">
                      <Chip active={extraDriverEnabled} onClick={() => setExtraDriverEnabled(true)}>
                        {T("Yes", "نعم", ar)}
                      </Chip>
                      <Chip active={!extraDriverEnabled} onClick={() => setExtraDriverEnabled(false)}>
                        {T("No", "لا", ar)}
                      </Chip>
                    </div>
                  </>
                )}
              </div>
              </div>

              {/* Search Panel for Authorized Driver — 100% width of the card */}
              {!isRenterDriver && !selectedAuthDriver && (
                <div ref={authDriverPanelRef}>
                <PersonPicker
                  overlay
                  ar={ar}
                  label={T("Search customers for the authorized driver:", "ابحث عن العملاء لاختيار المفوض:", ar)}
                  placeholder={T("Search customer by phone, ID, or name…", "ابحث عن العميل بالهاتف أو الهوية أو الاسم…", ar)}
                  items={filteredAuthDrivers}
                  query={authDriverQuery}
                  onQuery={setAuthDriverQuery}
                  selected={selectedAuthDriver}
                  onSelect={handleSelectAuthDriver}
                  onClear={clearAuthDriver}
                  loading={driversLoading}
                  error={driversError}
                  action={
                    <Button
                      type="button"
                      variant="tonal"
                      size="sm"
                      className="shrink-0 whitespace-nowrap !rounded-md"
                      onClick={() => setShowAuthDriverAddNew(true)}
                    >
                      <UserPlus size={14} />
                      {T("Add new authorized driver", "إضافة مفوض جديد", ar)}
                    </Button>
                  }
                />
                </div>
              )}

              {/* Search Panel for Extra Driver — 100% width of the card */}
              {extraDriverEnabled && !selectedExtraDriver && (
                <div ref={extraDriverPanelRef}>
                <PersonPicker
                  overlay
                  ar={ar}
                  label={T("Search drivers for the extra driver:", "ابحث عن السائق الإضافي:", ar)}
                  placeholder={T("Search driver by phone, ID, or name…", "ابحث عن السائق بالهاتف أو الهوية أو الاسم…", ar)}
                  items={filteredExtraDrivers}
                  query={extraDriverQuery}
                  onQuery={setExtraDriverQuery}
                  selected={selectedExtraDriver}
                  onSelect={handleSelectExtraDriver}
                  onClear={clearExtraDriver}
                  loading={driversLoading}
                  error={driversError}
                  action={
                    <Button
                      type="button"
                      variant="tonal"
                      size="sm"
                      className="shrink-0 whitespace-nowrap !rounded-md"
                      onClick={() => setShowExtraDriverAddNew(true)}
                    >
                      <UserPlus size={14} />
                      {T("Add new driver", "إضافة سائق جديد", ar)}
                    </Button>
                  }
                />
                </div>
              )}
            </div>

          </div>

        </div>
      </div>

      {/* Vehicle selection — full width; condition & diagram open in a modal per vehicle */}
      <div className="grid grid-cols-1 gap-4 items-start">
        {/* 1. VEHICLE SELECTOR CARD */}
        <div className="mk-surface rounded-xl p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <div className="flex-1 min-w-[160px]">
              <div className="mk-h4 text-mk-ink-900">{T("Vehicle Selection", "اختيار المركبة", ar)}</div>
              <div className="mk-caption mt-1 text-mk-ink-500">
                {availCars.length} {T("vehicles available for selected dates", "مركبة متاحة للتواريخ المحددة", ar)}
              </div>
            </div>

            {/* Search */}
            <div className="flex-1 min-w-[220px] max-w-[380px]">
              <Input
                variant="default"
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
                className="!mk-caption !pe-8 !rounded-md !border-mk-ink-200"
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

            {/* View toggle */}
            <Tabs
              variant="default"
              className="shrink-0"
              value={viewMode}
              onChange={(v) => setViewMode(v as typeof viewMode)}
              items={[
                { value: "list", icon: <List size={15} />, "aria-label": "List view" },
                { value: "card", icon: <LayoutGrid size={15} />, "aria-label": "Card view" },
                { value: "map", icon: <MapIcon size={15} />, "aria-label": "Map view" },
              ]}
            />
          </div>

          {/* Filter chips */}
          {(() => {
            const activeFilter = carFilter;
            const cats = [
              { k: "all", label: T("All", "الكل", ar) },
              { k: "Sedan", label: T("Sedan", "سيدان", ar) },
              { k: "SUV", label: T("SUV", "دفع رباعي", ar) },
              { k: "Luxury", label: T("Luxury", "فاخرة", ar) },
              { k: "Economy", label: T("Economy", "اقتصادية", ar) },
            ];
            return (
              <Tabs
                variant="default"
                size="sm"
                className="mb-4"
                value={activeFilter}
                onChange={setCarFilter}
                items={cats.map(({ k, label }) => ({ value: k, label }))}
              />
            );
          })()}

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {availCars
                .map((c) => {
                  const picked = c.plate === pickedPlate;
                  const odometer = c.odometerReading ?? 0;
                  return (
                    <div
                      key={c.plate}
                      onClick={() => setPickedPlate(c.plate)}
                      className={`${picked ? "mk-option mk-option--on-glow" : "mk-vehicle-card"} flex flex-col rounded-lg overflow-hidden text-start select-none cursor-pointer`}
                    >
                      {/* Car image area */}
                      <div className="w-full relative">
                        <CarCardCarousel images={c.imageUrls || []} picked={picked} />
                        {/* Selected checkmark */}
                        {picked && (
                          <span className="absolute top-2 end-2 w-5 h-5 rounded-full flex items-center justify-center bg-mk-blue-500 z-30">
                            <Check size={11} className="text-white" />
                          </span>
                        )}
                        <FleetAlertImageOverlay car={c} ar={ar} />
                        {/* View condition & diagram */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPickedPlate(c.plate);
                            setShowConditionModal(true);
                          }}
                          className="absolute bottom-2 end-2 z-30 flex items-center gap-1 px-3 py-2 rounded-full mk-overline bg-black/55 hover:bg-black/70 text-white border-0 cursor-pointer backdrop-blur-sm transition-colors"
                        >
                          <Gauge size={12} />
                          {T("Condition", "حالة السيارة", ar)}
                        </button>
                      </div>

                      {/* Details */}
                      <div className="p-4 flex flex-col justify-between flex-1">
                        {/* Make + model */}
                        <div className="flex items-start gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="mk-body text-mk-ink-900 truncate">
                              {c.make} {c.model}
                            </div>
                            <div className="mk-overline mt-1 text-mk-ink-500">
                              {c.plate} · {T(c.type, c.type === "Sedan" ? "سيدان" : c.type === "SUV" ? "دفع رباعي" : c.type === "Luxury" ? "فاخرة" : "اقتصادية", ar)} · {c.year}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <Badge
                              variant={
                                c.status === "available" ? "success" :
                                  c.status === "rented" ? "info" :
                                    c.status === "overdue" ? "danger" : "warning"
                              }
                              dot
                            >
                              {c.status === "available" ? T("Free", "متاحة", ar) :
                                c.status === "rented" ? T("Rented", "مؤجرة", ar) :
                                  c.status === "overdue" ? T("Overdue", "متأخرة", ar) :
                                    T(c.status, c.status, ar)}
                            </Badge>
                            {(c.status === "rented" || c.status === "overdue") && (
                              <span className="mk-caption mt-1 text-mk-ink-500 shrink-0">
                                {getAvailabilityText(c.status, c.id, ar)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Odometer & Allowed KM */}
                        <div className="flex items-center gap-2 mk-overline text-mk-ink-500 mt-1">
                          <div className="flex items-center gap-1">
                            <Gauge size={11} className="text-mk-violet-500" />
                            <span>{odometer.toLocaleString()} {T("km", "كم", ar)}</span>
                          </div>
                          <div className="w-px h-3 bg-mk-ink-200" />
                          <div>
                            {c.kmCap === "Unlimited"
                              ? T("Unlimited km", "كم غير محدود", ar)
                              : `${c.kmCap} ${T("km/day", "كم/يوم", ar)}`}
                          </div>
                        </div>

                        {/* Divider & Pricing Details */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-mk-ink-100">
                          <div className="flex items-center gap-1">
                            <RiyalSymbol size={16} className={picked ? "text-mk-blue-500" : "text-mk-ink-900"} />
                            <span className={`mk-body ${picked ? "text-mk-blue-500" : "text-mk-ink-900"}`}>{c.dailyRate}</span>
                            <span className="mk-caption text-mk-ink-400">{T("/d", "/يوم", ar)}</span>
                          </div>
                          <div className={`text-end ${picked ? "text-mk-blue-500" : "text-mk-ink-900"}`}>
                            <div className="mk-caption text-mk-ink-400 leading-none">{days} {T("days total", "أيام إجمالي", ar)}</div>
                            <div className="mk-caption mt-1">{(c.dailyRate * days).toLocaleString()} {T("SAR", "ريال", ar)}</div>
                          </div>
                        </div>
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
                      className={`mk-option ${picked ? "mk-option--on" : ""} flex items-center gap-3 p-3 rounded-lg text-start w-full border-0 cursor-pointer`}
                    >
                      <div className={`w-12 h-12 rounded-md overflow-hidden flex items-center justify-center text-[24px] shrink-0 ${picked ? "bg-mk-blue-500/10" : "bg-white"}`}>
                        {(() => {
                          const images = c.imageUrls;
                          if (images && images.length > 0) {
                            const src = images[0];
                            return (
                              <img
                                src={src}
                                alt={c.model}
                                className="w-full h-full object-cover"
                              />
                            );
                          }
                          return <VehicleTypeIcon type={c.type} size={20} className="w-full h-full" />;
                        })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="mk-body text-mk-ink-900">{c.make} {c.model} · {c.year}</div>
                          <span className="mk-overline px-2 py-1 rounded-full"
                            style={{ background: `${statusColor[c.status] ?? "var(--color-mk-ink-400)"}18`, color: statusColor[c.status] ?? "var(--color-mk-ink-400)" }}>
                            {c.status === "available" ? T("Free", "متاحة", ar) :
                              c.status === "rented" ? T("Rented", "مؤجرة", ar) :
                                c.status === "overdue" ? T("Overdue", "متأخرة", ar) :
                                  T(c.status, c.status, ar)}
                          </span>
                          {(c.status === "rented" || c.status === "overdue") && (
                            <span className="mk-overline text-mk-ink-500">
                              · {getAvailabilityText(c.status, c.id, ar)}
                            </span>
                          )}
                          <FleetAlertBadgeList car={c} ar={ar} showEmpty={false} />
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="mk-caption text-mk-ink-500">{c.plate}</span>
                          <span className="mk-caption text-mk-ink-500">{T(c.type, c.type === "Sedan" ? "سيدان" : c.type === "SUV" ? "دفع رباعي" : c.type === "Luxury" ? "فاخرة" : "اقتصادية", ar)}</span>
                          <span className="flex items-center gap-1 mk-caption text-mk-ink-500">
                            <Gauge size={11} />{odometer.toLocaleString()} {T("km", "كم", ar)}
                          </span>
                          <span className="mk-caption text-mk-ink-500">
                            {c.kmCap === "Unlimited" ? T("Unlimited km", "كم غير محدود", ar) : `${c.kmCap} ${T("km/day", "كم/يوم", ar)}`}
                          </span>
                        </div>
                      </div>
                      <div className="text-end shrink-0">
                        <div className={`${picked ? "text-mk-blue-500" : "text-mk-ink-900"} flex items-center justify-end gap-1`}>
                          <RiyalSymbol size={16} />
                          <span className="mk-body">{c.dailyRate}</span>
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
                        className="flex items-center gap-1 px-3 py-2 rounded-full mk-overline bg-mk-ink-100 hover:bg-mk-ink-200 text-mk-ink-600 border-0 cursor-pointer shrink-0"
                      >
                        <Gauge size={12} />
                        {T("Condition", "حالة السيارة", ar)}
                      </button>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${picked ? "bg-mk-blue-500 border-0" : "bg-transparent border-2 border-mk-ink-200"}`}>
                        {picked && <Check size={11} className="text-white" />}
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
                <span className="mk-caption px-4 py-2 rounded-full bg-white/90 text-mk-ink-600 shadow-sm border border-mk-ink-100">
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
                    className="flex items-center gap-1 px-3 py-2 rounded-full mk-overline bg-mk-ink-100 hover:bg-mk-ink-200 text-mk-ink-600 border-0 cursor-pointer"
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

        {/* 2. VEHICLE CONDITION DRAWER — opens when a vehicle is clicked */}
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

        {/* Prompt removed in favor of sticky footer */}
      </div>
    </div>
  );
}
