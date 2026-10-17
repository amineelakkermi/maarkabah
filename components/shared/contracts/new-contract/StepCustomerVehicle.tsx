"use client";

import { useRef, useEffect } from "react";
import { Search, UserPlus, UserCheck, Shield, X, Loader2 } from "lucide-react";
import { Avatar, Select, Button, Chip, IconButton, DatePicker, DateTimePicker } from "@/components/ui";
import type { DriverProfile } from "@/lib/data";
import { TAJEER_LOOKUPS } from "@/lib/tajeer";
import { T, getCustomerStatusTag, CUSTOMER_STATUS_META, NEIGHBORING_COUNTRIES, RENTAL_POLICY_OPTIONS } from "./constants";
import { PersonPicker } from "./PersonPicker";
import type { LookupItem, ContractRentPolicy, ContractCancellationPolicy } from "./useContractLookups";
import { isTajeerSyncedPolicy } from "./useContractLookups";

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
  // Handover branches
  branches: LookupItem[];
  receiveBranchId: number; setReceiveBranchId: (v: number) => void;
  returnBranchId: number; setReturnBranchId: (v: number) => void;
  setWorkingBranchId: (v: number) => void;
  // Rental & cancellation policies — selecting a rent policy auto-applies the
  // office's extension/early-return/accident/fuel/breakdown sub-policies.
  rentPolicies: ContractRentPolicy[];
  rentPolicyId: number; setRentPolicyId: (v: number) => void;
  tajeerEnabled?: boolean;
  cancellationPolicies: ContractCancellationPolicy[];
  cancellationPolicyId: number; setCancellationPolicyId: (v: number) => void;
  extensionPolicy: string; setExtensionPolicy: (v: string) => void;
  earlyReturnPolicy: string; setEarlyReturnPolicy: (v: string) => void;
  accidentReportPolicy: string; setAccidentReportPolicy: (v: string) => void;
  fuelReturnPolicy: string; setFuelReturnPolicy: (v: string) => void;
  breakdownReportPolicy: string; setBreakdownReportPolicy: (v: string) => void;
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
};

export function StepCustomerVehicle({
  ar,
  showCustomerSearch, setShowCustomerSearch, customerQuery, setCustomerQuery, customersLoading, customersError,
  filteredCustomers, selectedCustomer, setSelectedCustomer, setIsNewCustomerOpen,
  pickupDateTime, setPickupDateTime, returnDateTime, setReturnDateTime, rentalDurationLabel, isHourlyRental,
  branches, receiveBranchId, setReceiveBranchId, returnBranchId, setReturnBranchId, setWorkingBranchId,
  rentPolicies, rentPolicyId, setRentPolicyId, tajeerEnabled, cancellationPolicies, cancellationPolicyId, setCancellationPolicyId,
  extensionPolicy, setExtensionPolicy, earlyReturnPolicy, setEarlyReturnPolicy,
  accidentReportPolicy, setAccidentReportPolicy, fuelReturnPolicy, setFuelReturnPolicy,
  breakdownReportPolicy, setBreakdownReportPolicy,
  authorizationStartDate, setAuthorizationStartDate, authorizationEndDate, setAuthorizationEndDate,
  authorizationTypeCode, setAuthorizationTypeCode, authorizationCountry, setAuthorizationCountry,
  isRenterDriver, setIsRenterDriver, filteredAuthDrivers, authDriverQuery, setAuthDriverQuery, selectedAuthDriver,
  handleSelectAuthDriver, clearAuthDriver, setShowAuthDriverAddNew, driversLoading, driversError,
  extraDriverEnabled, setExtraDriverEnabled, filteredExtraDrivers, extraDriverQuery, setExtraDriverQuery,
  selectedExtraDriver, handleSelectExtraDriver, clearExtraDriver, setShowExtraDriverAddNew,
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
        <div className="mk-surface rounded-xl p-4 sm:p-6">
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
                    <div className="absolute z-30 top-full inset-x-0 mt-2 rounded-xl border border-mk-ink-100 bg-white shadow-lg max-h-[280px] overflow-y-auto mk-scrollbar">
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
                         <span dir="ltr" className={`${ar ? 'ml-3' : 'mr-3'}`}> {selectedCustomer.phone} </span>· {selectedCustomer.bookings} {T("past contracts · ★", "عقود سابقة · ★", ar)} {selectedCustomer.rating}
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

            {/* Handover branches — chosen up front with the renter/terms, like
                the designer's step 0 (vehicle picker stays below on this step). */}
            <div className="mt-5 pt-5 border-t border-mk-ink-100">
              <div className="mk-label text-mk-ink-900">{T("Handover Branches", "فروع الاستلام والتسليم", ar)}</div>
              <p className="mk-caption mt-1 mb-4 text-mk-ink-500">
                {T("Choose where the customer picks up and returns the vehicle.", "اختر أين يستلم العميل المركبة ويسلّمها.", ar)}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label={T("Pickup Branch", "فرع الاستلام", ar)}
                  variant="muted"
                  value={String(receiveBranchId)}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setReceiveBranchId(val);
                    setWorkingBranchId(val);
                  }}
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {ar ? b.nameAr : b.nameEn}
                    </option>
                  ))}
                </Select>

                <Select
                  label={T("Return Branch", "فرع التسليم", ar)}
                  variant="muted"
                  value={String(returnBranchId)}
                  onChange={(e) => setReturnBranchId(Number(e.target.value))}
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {ar ? b.nameAr : b.nameEn}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

          </div>
        </div>

        {/* Right column — drivers + rental policy */}
        <div className="flex flex-col gap-4">

        {/* Drivers card */}
        <div className="mk-surface rounded-xl p-4 sm:p-6">
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

        {/* Rental policy — office-selectable, auto-reflected on the contract */}
        <div className="mk-surface rounded-xl p-4 sm:p-6">
          <div className="mk-h4 mb-6 text-mk-ink-900">{T("Rental policies", "سياسات التأجير", ar)}</div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="mk-overline mb-2 block text-mk-ink-600">{T("Rental policy", "سياسة التأجير", ar)}</label>
              <Select value={rentPolicyId} onChange={(e) => {
                const policy = rentPolicies.find((item) => item.id === Number(e.target.value));
                if (!policy) return;
                setRentPolicyId(policy.id);
                if (policy.extensionPolicy) setExtensionPolicy(RENTAL_POLICY_OPTIONS.extension[policy.extensionPolicy - 1]?.key ?? extensionPolicy);
                if (policy.earlyReturnPolicy) setEarlyReturnPolicy(RENTAL_POLICY_OPTIONS.earlyReturn[policy.earlyReturnPolicy - 1]?.key ?? earlyReturnPolicy);
                if (policy.accidentReportPolicy) setAccidentReportPolicy(RENTAL_POLICY_OPTIONS.accidentReport[policy.accidentReportPolicy - 1]?.key ?? accidentReportPolicy);
                if (policy.fuelReturnPolicy) setFuelReturnPolicy(RENTAL_POLICY_OPTIONS.fuelReturn[policy.fuelReturnPolicy - 1]?.key ?? fuelReturnPolicy);
                if (policy.breakdownReportPolicy) setBreakdownReportPolicy(RENTAL_POLICY_OPTIONS.breakdownReport[policy.breakdownReportPolicy - 1]?.key ?? breakdownReportPolicy);
              }}>
                {rentPolicies.map((policy) => (
                  <option key={policy.id} value={policy.id}>
                    {ar ? policy.nameAr : policy.nameEn}{isTajeerSyncedPolicy(policy) ? " · Tajeer ✓" : ""}
                  </option>
                ))}
              </Select>
              {tajeerEnabled && rentPolicyId > 0 && !isTajeerSyncedPolicy(rentPolicies.find((p) => p.id === rentPolicyId) ?? {}) && (
                <p className="mk-caption mt-2 flex items-center gap-1.5" style={{ color: "#B45309" }}>
                  ⚠ {T(
                    "This policy isn't synced with Tajeer — issuance will fail. Sync policies from Pricing → Sync Tajeer, or pick a Tajeer ✓ policy.",
                    "هذه السياسة غير مزامنة مع تاجير — سي فشل الإصدار. زامن السياسات من الأسعار ← مزامنة تاجير، أو اختر سياسة Tajeer ✓.",
                    ar
                  )}
                </p>
              )}
            </div>
            <div>
              <label className="mk-overline mb-2 block text-mk-ink-600">{T("Cancellation policy", "سياسة الإلغاء", ar)}</label>
              <Select value={cancellationPolicyId} onChange={(e) => setCancellationPolicyId(Number(e.target.value))}>
                {cancellationPolicies.map((policy) => (
                  <option key={policy.id} value={policy.id}>{ar ? policy.nameAr : policy.nameEn}</option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        </div>
      </div>

      {/* Vehicle selection moved to step 2 (StepAddons) — vehicle picking now
          sits next to the add-ons, like the designer's "Vehicle & add-ons" step. */}
    </div>
  );
}
