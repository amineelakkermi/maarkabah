"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Printer } from "lucide-react";
import { AlertBanner, Button, Modal } from "@/components/ui";
import ContractPreview from "./ContractPreview";
import { type DriverProfile, type CarStatus } from "@/lib/data";
import { useAdmin } from "@/contexts/AdminContext";
import {
  T, getCustomerStatusTag, CUSTOMER_STATUS_META,
  SYSTEM_EXTRA_KM_RATE,
  RENTAL_POLICY_OPTIONS,
} from "./new-contract/constants";
import { computeRental, computePricing } from "./new-contract/pricing";
import { buildCreateContractRequest } from "./new-contract/mappers";
import { contractService } from "@/lib/api-services";
import { useContractLookups } from "./new-contract/useContractLookups";
import { useCustomersPicker } from "./new-contract/useCustomersPicker";
import { useVehiclesPicker } from "./new-contract/useVehiclesPicker";
import { useDriversPicker } from "./new-contract/useDriversPicker";
import { ContractStepper } from "./new-contract/ContractStepper";
import { StickyFooter } from "./new-contract/StickyFooter";
import { StepIssue } from "./new-contract/StepIssue";
import { StepPricingPayment } from "./new-contract/StepPricingPayment";
import { StepAddons, type Addons } from "./new-contract/StepAddons";
import { StepCustomerVehicle } from "./new-contract/StepCustomerVehicle";
import {
  TAJEER_LOOKUPS,
  type TajeerSaveContractResponse,
  type TajeerRentStatus, type SketchItem, type TajeerIdType, type TajeerContractType,
} from "@/lib/tajeer";
import { PersonRegistrationDrawer, type NewPersonProfile } from "@/components/employee/PersonRegistrationDrawer";
import { loadGoogleMapsScript, getGoogleMapsStyle, getCarLatLng, createCustomMarker } from "@/lib/maps";

const toLocalDateTimeValue = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

export interface NewContractPageProps {
  /** Route back to the contracts list; reserved for future navigation hooks. */
  contractsListPath?: string;
}

export default function NewContractPage({ contractsListPath = "/employee/contracts" }: NewContractPageProps) {
  const { dir, isDark, currentUser } = useAdmin();
  const ar = dir === "rtl";
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");

  const [step, setStep] = useState(0);
  const [showContractPreview, setShowContractPreview] = useState(false);

  // ── Backend customer state ─────────────────────────────────────
  const [selectedCustomer, setSelectedCustomer] = useState<DriverProfile | null>(null);
  const [customerQuery, setCustomerQuery] = useState("");
  const [showCustomerSearch, setShowCustomerSearch] = useState(true);
  const { customersList, setCustomersList, customersLoading, customersError } = useCustomersPicker(ar, clientId, (preselected) => {
    setSelectedCustomer(preselected);
    setShowCustomerSearch(false);
  });

  // ── Backend vehicle state ─────────────────────────────────────
  const [pickedPlate, setPickedPlate] = useState("");
  const { backendCars, vehiclesLoading, vehiclesError } = useVehiclesPicker(ar, (mapped) => {
    if (mapped.length > 0 && !pickedPlate) {
      setPickedPlate(mapped[0].plate);
    }
  });
  const [carFilter, setCarFilter] = useState("all");
  const [carStatusTab, setCarStatusTab] = useState<"all" | CarStatus>("all");
  const [carSearch, setCarSearch] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "list" | "map">("card");
  const [carMapsLoaded, setCarMapsLoaded] = useState(false);
  const carMapRef = useRef<HTMLDivElement>(null);
  const carMapInstanceRef = useRef<any>(null);
  const carMapMarkersRef = useRef<any[]>([]);
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [conditionView, setConditionView] = useState<"sketch" | "photos">("sketch");
  const [addons, setAddons] = useState<Addons>({
    insurance_comprehensive: true,
    unlimited_km: false,
    driver: false,
    child: false,
    fuel: false,
    internet: false,
    delivery: false,
    return_agent: false,
    navigation: false,
    special_needs: false,
  });
  const [deliveryKm] = useState(15);
  const [otpDigits, setOtpDigits] = useState(["1", "2", "3", "4", "", ""]);
  const [payMethod, setPayMethod] = useState("pos");
  const [payType, setPayType] = useState<"full" | "advance">("full");
  const [signed, setSigned] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [signOtpDigits, setSignOtpDigits] = useState(["", "", "", ""]);
  const signOtpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Add customer drawer state
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [newIdNumber, setNewIdNumber] = useState("");

  // ── Tajeer: contract settings ──────────────────────────────────
  const [idTypeCode, setIdTypeCode] = useState<TajeerIdType>(1);
  const [contractTypeCode, setContractTypeCode] = useState<TajeerContractType>(1);
  const [workingBranchId, setWorkingBranchId] = useState<number>(0);
  const [receiveBranchId, setReceiveBranchId] = useState<number>(0);
  const [returnBranchId, setReturnBranchId] = useState<number>(0);
  const [rentPolicyId, setRentPolicyId] = useState<number>(0);
  const [cancellationPolicyId, setCancellationPolicyId] = useState<number>(0);
  const [allowedLateHours, setAllowedLateHours] = useState<number>(1);
  const [allowedKmPerDay, setAllowedKmPerDay] = useState<number>(200);
  const [allowedKmPerHour, setAllowedKmPerHour] = useState<number>(30);
  const [unlimitedKm, setUnlimitedKm] = useState(false);
  const [isRenterDriver, setIsRenterDriver] = useState(true);

  // ── Rental policy (office-selectable) ───────────────────────
  const [extensionPolicy, setExtensionPolicy] = useState("auto_renew");
  const [earlyReturnPolicy, setEarlyReturnPolicy] = useState("no_refund");
  const [accidentReportPolicy, setAccidentReportPolicy] = useState("police_report_required");
  const [fuelReturnPolicy, setFuelReturnPolicy] = useState("same_level");
  const [breakdownReportPolicy, setBreakdownReportPolicy] = useState("call_office");

  // ── Tajeer: pre-required data ──────────────────────────────────
  const { branches, rentPolicies, cancellationPolicies, extendedCoverage, additionalServices } = useContractLookups(workingBranchId, (b, p, c) => {
    if (b.length > 0) {
      setWorkingBranchId(b[0].id);
      setReceiveBranchId(b[0].id);
      setReturnBranchId(b[0].id);
    }
    if (p.length > 0) {
      const policy = p[0];
      setRentPolicyId(policy.id);
      if (policy.extensionPolicy) setExtensionPolicy(RENTAL_POLICY_OPTIONS.extension[policy.extensionPolicy - 1]?.key ?? "auto_renew");
      if (policy.earlyReturnPolicy) setEarlyReturnPolicy(RENTAL_POLICY_OPTIONS.earlyReturn[policy.earlyReturnPolicy - 1]?.key ?? "no_refund");
      if (policy.accidentReportPolicy) setAccidentReportPolicy(RENTAL_POLICY_OPTIONS.accidentReport[policy.accidentReportPolicy - 1]?.key ?? "police_report_required");
      if (policy.fuelReturnPolicy) setFuelReturnPolicy(RENTAL_POLICY_OPTIONS.fuelReturn[policy.fuelReturnPolicy - 1]?.key ?? "same_level");
      if (policy.breakdownReportPolicy) setBreakdownReportPolicy(RENTAL_POLICY_OPTIONS.breakdownReport[policy.breakdownReportPolicy - 1]?.key ?? "call_office");
    }
    if (c.length > 0) setCancellationPolicyId(c[0].id);
  });

  // ── Backend: load drivers (authorized / extra driver pickers) ──
  const { driversList, setDriversList, driversLoading, driversError } = useDriversPicker(ar);

  // Authorized driver fields (when isRenterDriver = false) — selected from the drivers picker
  const [selectedAuthDriver, setSelectedAuthDriver] = useState<DriverProfile | null>(null);
  const [authorizedDriverId, setAuthorizedDriverId] = useState<number | null>(null);
  const [authDriverIdType, setAuthDriverIdType] = useState<TajeerIdType>(1);
  const [authDriverIdNumber, setAuthDriverIdNumber] = useState("");
  const [authDriverBirthDate, setAuthDriverBirthDate] = useState("");
  const [authDriverMobile, setAuthDriverMobile] = useState("");
  const [authDriverQuery, setAuthDriverQuery] = useState("");
  const [showAuthDriverAddNew, setShowAuthDriverAddNew] = useState(false);

  // Extra driver fields
  const [extraDriverQuery, setExtraDriverQuery] = useState("");
  const [selectedExtraDriver, setSelectedExtraDriver] = useState<DriverProfile | null>(null);
  const [extraDriverId, setExtraDriverId] = useState<number | null>(null);
  const [extraDriverIdType, setExtraDriverIdType] = useState<TajeerIdType>(1);
  const [extraDriverIdNumber, setExtraDriverIdNumber] = useState("");
  const [extraDriverAddress, setExtraDriverAddress] = useState("");
  const [extraDriverBirthDate, setExtraDriverBirthDate] = useState("");
  const [showExtraDriverAddNew, setShowExtraDriverAddNew] = useState(false);

  // ── Tajeer: renter extra fields ────────────────────────────────
  const [renterEmail, setRenterEmail] = useState("");
  const [renterPassport, setRenterPassport] = useState("");
  const [renterHijriBirth, setRenterHijriBirth] = useState("");
  const [renterBirthDate, setRenterBirthDate] = useState("");
  const [renterNationalityCode, setRenterNationalityCode] = useState("");
  const [renterLicenseNumber, setRenterLicenseNumber] = useState("");
  const [renterLicenseExpiry, setRenterLicenseExpiry] = useState("");
  const [renterIdExpiry, setRenterIdExpiry] = useState("");
  const [renterIdCopyNumber, setRenterIdCopyNumber] = useState("");
  const [renterAddress, setRenterAddress] = useState("Riyadh");
  const [renterLicenseIssuePlace, setRenterLicenseIssuePlace] = useState("");
  const [renterBorderNumber, setRenterBorderNumber] = useState("");
  const [pickupDateTime, setPickupDateTime] = useState(() => toLocalDateTimeValue(new Date()));
  const [returnDateTime, setReturnDateTime] = useState(() => toLocalDateTimeValue(new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)));
  const { pickupDate, returnDate, rentalWholeDays, rentalExtraHours, days, totalHours, isHourlyRental } = computeRental(pickupDateTime, returnDateTime);

  // ── Insurance ────────────────────────────────────────────────
  const [insuranceAmount, setInsuranceAmount] = useState<number>(100000);

  // ── Contract terms (authorization window) ───────────────────
  const [authorizationStartDate, setAuthorizationStartDate] = useState("");
  const [authorizationEndDate, setAuthorizationEndDate] = useState("");

  // Authorization window defaults to the rental's pickup date, ending 6 months later
  useEffect(() => {
    const pickupDate = pickupDateTime.split("T")[0];
    if (!pickupDate) return;
    setAuthorizationStartDate(pickupDate);
    const end = new Date(pickupDate);
    end.setMonth(end.getMonth() + 6);
    setAuthorizationEndDate(end.toISOString().split("T")[0]);
  }, [pickupDateTime]);
  const [authorizationTypeCode, setAuthorizationTypeCode] = useState<"internal" | "external">("internal");
  const [authorizationCountry, setAuthorizationCountry] = useState("");

  // ── Financial data ───────────────────────────────────────────
  const [internationalAuthorizationCost, setInternationalAuthorizationCost] = useState<number>(0);

  // ── Tajeer: vehicle condition (rent status) ────────────────────
  const [rentStatus, setRentStatus] = useState<Partial<TajeerRentStatus>>({
    ac: 1, radioStereo: 1, screen: 1, speedometer: 5, keys: 5,
    carSeats: 6, tires: 1, spareTire: 1, safetyTriangle: 8,
    fireExtinguisher: 8, firstAidKit: 8, spareTireTools: 8,
    availableFuel: 1, odometerReading: 0, fuelTypeCode: 1,
    enduranceAmount: 0, oilChangeKmDistance: 5000,
    oilChangeDate: new Date().toISOString().split("T")[0],
    oilType: "", notes: "",
  });
  const [sketchItems, setSketchItems] = useState<SketchItem[]>([]);

  // ── Tajeer: pricing ────────────────────────────────────────────
  const [rentDayCost, setRentDayCost] = useState<number>(0);
  const [rentHourCost, setRentHourCost] = useState<number>(0);
  const [extraKmCost, setExtraKmCost] = useState<number>(SYSTEM_EXTRA_KM_RATE);
  const [fullFuelCost, setFullFuelCost] = useState<number>(0);
  const [lateFeePerHour, setLateFeePerHour] = useState<number>(0);
  const [discountType, setDiscountType] = useState<"percent" | "amount">("percent");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountFlatAmount, setDiscountFlatAmount] = useState<number>(0);
  const [extendedCoverageId, setExtendedCoverageId] = useState<number | undefined>();
  const [additionalCoverageCost, setAdditionalCoverageCost] = useState<number>(0);
  const [driverFarePerDay, setDriverFarePerDay] = useState<number>(0);
  const [driverFarePerHour, setDriverFarePerHour] = useState<number>(0);
  const [vehicleTransferCost, setVehicleTransferCost] = useState<number>(0);

  // Auto-fill renter's fields when selectedCustomer changes — uses selected backend DriverProfile directly
  useEffect(() => {
    if (selectedCustomer) {
      setIdTypeCode(selectedCustomer.idTypeCode as TajeerIdType);
      setNewIdNumber(selectedCustomer.nationalId || "");
      setRenterBirthDate(selectedCustomer.birthDate || "");
      setRenterHijriBirth(selectedCustomer.hijriBirthDate ? String(selectedCustomer.hijriBirthDate) : "");
      setRenterEmail(selectedCustomer.email || "");
      setRenterPassport(selectedCustomer.passportNumber || "");
      setRenterNationalityCode(selectedCustomer.nationalityCode ? String(selectedCustomer.nationalityCode) : "");
      setRenterLicenseNumber(selectedCustomer.licenseNumber || "");
      setRenterLicenseExpiry(selectedCustomer.licenseExpiryDate || "");
      setRenterIdExpiry(selectedCustomer.idExpiryDate || "");
      setRenterAddress(selectedCustomer.personAddress || "Riyadh");
      setRenterIdCopyNumber(selectedCustomer.idCopyNumber || "");
      setRenterLicenseIssuePlace(selectedCustomer.licenseIssuePlace || "");
      setRenterBorderNumber(selectedCustomer.borderNumber || "");
    }
  }, [selectedCustomer]);

  // Auto-fill vehicle details when pickedPlate changes — uses backendCars
  useEffect(() => {
    const selectedCar = backendCars.find((c) => c.plate === pickedPlate);
    if (selectedCar) {
      setRentDayCost(selectedCar.dailyRate);
      setExtraKmCost(selectedCar.extraKmCost);
      setFullFuelCost(selectedCar.fullFuelCost);
      setLateFeePerHour(selectedCar.lateFeePerHour);
      const isUnlimited = selectedCar.kmCap === "Unlimited";
      setUnlimitedKm(isUnlimited);
      setAllowedKmPerDay(isUnlimited ? 200 : Number(selectedCar.kmCap));

      setRentStatus((s) => ({
        ...s,
        odometerReading: 0,
        fuelTypeCode: selectedCar.fuelTypeCode,
        enduranceAmount: selectedCar.enduranceAmount,
      }));

      // Auto-fill insurance amount from vehicle fleet data
      if (selectedCar.insuranceAmount) {
        setInsuranceAmount(selectedCar.insuranceAmount);
      }

      setAddons((s) => ({
        ...s,
        unlimited_km: isUnlimited ? true : s.unlimited_km,
      }));

      // No pre-existing sketch items from backend — start empty
      setSketchItems([]);

    }
  }, [pickedPlate, backendCars]);

  // Contract type follows the extra-driver add-on selection and the explicit daily/hourly toggle
  useEffect(() => {
    setContractTypeCode(addons.driver ? (isHourlyRental ? 4 : 3) : (isHourlyRental ? 2 : 1));
  }, [addons.driver, isHourlyRental]);

  useEffect(() => {
    if (!showConditionModal) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setShowConditionModal(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showConditionModal]);

  // ── Submission state ───────────────────────────────────
  const [contractStep, setContractStep] = useState<"idle" | "saving" | "pending_signature" | "issued" | "error">("idle");
  const [tajeerResponse, setTajeerResponse] = useState<TajeerSaveContractResponse | null>(null);
  const [createdContractId, setCreatedContractId] = useState<number | null>(null);
  const [tajeerError, setTajeerError] = useState<string>("");

  // Automatically confirm client signature 5 seconds after identity verification completes
  useEffect(() => {
    if (contractStep === "pending_signature" && otpDigits.every(d => d !== "")) {
      const timer = setTimeout(() => {
        handleConfirmSignature();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [contractStep, otpDigits]);

  // ── Backend contract creation + Tajeer submission ─────────────
  const handleSubmitToTajeer = async () => {
    setContractStep("saving");
    setTajeerError("");
    try {
      if (createdContractId) {
        await contractService.submitToTajeer(createdContractId);
        setTajeerResponse({ contractNumber: String(createdContractId) } as unknown as TajeerSaveContractResponse);
        setContractStep("issued");
        return;
      }

      const selectedCar = backendCars.find((c) => c.plate === pickedPlate) ?? backendCars[0];
      if (!selectedCustomer) throw new Error(ar ? "لم يتم اختيار عميل" : "No customer selected");
      if (!selectedCar) throw new Error(ar ? "لم يتم اختيار مركبة" : "No vehicle selected");
      if (selectedCar.status !== "available") throw new Error(ar ? "المركبة غير متاحة للإيجار" : "Vehicle is not available for rental");

      const request = buildCreateContractRequest({
        customerId: toBackendDriverId(selectedCustomer) ?? 0,
        vehicle: selectedCar,
        workingBranchId,
        receiveBranchId: receiveBranchId || (branches[0]?.id ?? 0),
        returnBranchId: returnBranchId || (branches[0]?.id ?? 0),
        contractTypeCode,
        pickupDate,
        returnDate,
        rentPolicyId: rentPolicyId || (rentPolicies[0]?.id ?? 0),
        cancellationPolicyId: cancellationPolicyId || (cancellationPolicies[0]?.id ?? 0),
        allowedKmPerDay,
        allowedKmPerHour,
        unlimitedKm: unlimitedKm || addons.unlimited_km,
        allowedLateHours,
        rentDayCost,
        rentHourCost,
        extraKmCost,
        fullFuelCost,
        driverFarePerDay,
        driverFarePerHour,
        vehicleTransferCost,
        addons,
        additionalServices,
        days,
        deliveryKm,
        pricing,
        internationalAuthorizationCost,
        extendedCoverageId,
        payMethod: payMethod as "cash" | "pos",
        payType,
        odometerReading: rentStatus.odometerReading ?? 0,
        fuelLevel: rentStatus.availableFuel ?? 0,
        enduranceAmount: rentStatus.enduranceAmount ?? 0,
        notes: null,
        authorizedDriverId: isRenterDriver ? null : (authorizedDriverId ?? null),
        extraDriverId: addons.driver ? (extraDriverId ?? null) : null,
      });

      console.log("[DEBUG] Selected vehicle:", selectedCar);
      console.log("[DEBUG] Create contract request:", request);
      const created = await contractService.create(request);
      const contractId = typeof created === "number" ? created : (created?.id ?? 0);
      if (!contractId) throw new Error(ar ? "لم يتم إنشاء العقد" : "Contract creation returned no id");

      setCreatedContractId(contractId);
      await contractService.submitToTajeer(contractId);
      setTajeerResponse({ contractNumber: String(contractId) } as unknown as TajeerSaveContractResponse);
      setContractStep("issued");
    } catch (err) {
      setTajeerError(err instanceof Error ? err.message : "خطأ غير متوقع");
      setContractStep("error");
    }
  };

  const handleConfirmSignature = () => {
    setContractStep("saving");
    setTimeout(() => {
      setContractStep("issued");
    }, 1200);
  };

  const handleCheckStatus = async () => {
    if (!createdContractId) return;
    try {
      const contract = await contractService.getById(createdContractId);
      if (contract?.status === 4) {
        setContractStep("issued");
      }
    } catch {
      // show toast in production
    }
  };

  const handleCancelContract = async () => {
    if (!createdContractId) return;
    try {
      await contractService.cancel(createdContractId, { reason: "" });
      setContractStep("idle");
      setTajeerResponse(null);
      setCreatedContractId(null);
    } catch {
      // show toast in production
    }
  };

  const rentalDurationLabel = T(
    `${rentalWholeDays} days · ${rentalExtraHours} hours`,
    `${rentalWholeDays} أيام · ${rentalExtraHours} ساعات`,
    ar
  );
  const car = backendCars.find((c) => c.plate === pickedPlate) || backendCars[0];
  const pricing = computePricing({
    contractTypeCode, days, totalHours, car, rentDayCost, rentHourCost,
    addons, additionalServices, deliveryKm,
    hasExtraDriver: Boolean(addons.driver && selectedExtraDriver),
    driverFarePerDay, driverFarePerHour,
    receiveBranchId, returnBranchId, vehicleTransferCost,
    internationalAuthorizationCost, extendedCoverageId, additionalCoverageCost, fullFuelCost,
    discountType, discountPercent, discountFlatAmount,
  });
  const {
    base, addonPrices, grossSubtotal, discountAmount, subtotal, vat, total, advanceAmount, remaining,
  } = pricing;

  const filteredCustomers = customersList
    .filter((c) => {
      if (customerQuery.trim().length <= 1) return true;
      const query = customerQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(query) ||
        c.phone.includes(query) ||
        (c.nameAr && c.nameAr.includes(query)) ||
        (c.nationalId && c.nationalId.includes(query))
      );
    })
    .slice(0, 5);

  const matchesDriverQuery = (c: DriverProfile, rawQuery: string) => {
    if (rawQuery.trim().length <= 1) return true;
    const query = rawQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(query) ||
      c.phone.includes(query) ||
      (c.nameAr && c.nameAr.includes(query)) ||
      (c.nationalId && c.nationalId.includes(query))
    );
  };

  const filteredAuthDrivers = driversList
    .filter((c) => c.idType === "Saudi ID" || c.idType === "Iqama")
    .filter((c) => !selectedExtraDriver || c.id !== selectedExtraDriver.id)
    .filter((c) => matchesDriverQuery(c, authDriverQuery))
    .slice(0, 5);

  const filteredExtraDrivers = driversList
    .filter((c) => !selectedAuthDriver || c.id !== selectedAuthDriver.id)
    .filter((c) => matchesDriverQuery(c, extraDriverQuery))
    .slice(0, 5);

  const carStatusCounts: Record<string, number> = {
    available: backendCars.filter((c) => c.status === "available").length,
    rented: backendCars.filter((c) => c.status === "rented").length,
    overdue: backendCars.filter((c) => c.status === "overdue").length,
    maintenance: backendCars.filter((c) => c.status === "maintenance").length,
    reserved: backendCars.filter((c) => c.status === "reserved").length,
  };

  const availCars = backendCars.filter((c) => {
    const matchStatus = carStatusTab === "all" || c.status === carStatusTab;
    const matchType = carFilter === "all" || c.type === carFilter;
    const q = carSearch.trim().toLowerCase();
    const matchSearch = !q ||
      c.name.toLowerCase().includes(q) ||
      c.plate.toLowerCase().includes(q) ||
      `${c.make} ${c.model}`.toLowerCase().includes(q);
    return matchStatus && matchType && matchSearch;
  });

  // ── Vehicle selection map view ──────────────────────────────────
  useEffect(() => {
    if (viewMode !== "map") return;
    loadGoogleMapsScript()
      .then(() => setCarMapsLoaded(true))
      .catch((err) => console.error("Error loading Google Maps SDK:", err));
  }, [viewMode]);

  useEffect(() => {
    if (viewMode !== "map" || !carMapsLoaded || !carMapRef.current) return;
    const map = new (window as any).google.maps.Map(carMapRef.current, {
      center: { lat: 24.7136, lng: 46.6753 },
      zoom: 13,
      styles: getGoogleMapsStyle(isDark),
      disableDefaultUI: true,
      zoomControl: true,
    });
    carMapInstanceRef.current = map;
    return () => {
      carMapInstanceRef.current = null;
    };
  }, [viewMode, carMapsLoaded, isDark]);

  useEffect(() => {
    const map = carMapInstanceRef.current;
    if (!map || viewMode !== "map") return;

    carMapMarkersRef.current.forEach((m) => m && m.setMap(null));
    carMapMarkersRef.current = [];

    const statusColor: Record<string, string> = {
      available: "var(--color-mk-mint-600)", rented: "var(--color-mk-blue-500)", overdue: "var(--color-mk-danger)",
      maintenance: "var(--color-mk-warning)", reserved: "var(--color-mk-violet-500)",
    };

    availCars
      .filter((c) => c.mapX > 0)
      .forEach((c) => {
        const { lat, lng } = getCarLatLng(c.mapX, c.mapY);
        const marker = createCustomMarker(
          map,
          lat,
          lng,
          statusColor[c.status] ?? "var(--color-mk-ink-400)",
          c.name.split(" ")[0],
          c.plate === pickedPlate,
          () => setPickedPlate(c.plate)
        );
        if (marker) carMapMarkersRef.current.push(marker);
      });

    return () => {
      carMapMarkersRef.current.forEach((m) => m && m.setMap(null));
      carMapMarkersRef.current = [];
    };
  }, [viewMode, carMapsLoaded, availCars, pickedPlate]);

  const otpComplete = otpDigits.every((d) => d !== "");

  // Picker rows carry the real backend id; locally-created drivers (drawer) have no backend id yet.
  const toBackendDriverId = (d: DriverProfile): number | null => {
    const n = Number(d.id);
    return Number.isFinite(n) ? n : null;
  };

  const handleSelectAuthDriver = (d: DriverProfile) => {
    setSelectedAuthDriver(d);
    setAuthorizedDriverId(toBackendDriverId(d));
    setAuthDriverIdType(d.idTypeCode as TajeerIdType);
    setAuthDriverIdNumber(d.nationalId);
    setAuthDriverMobile(d.phone);
    setAuthDriverBirthDate(d.birthDate || (d.hijriBirthDate ? String(d.hijriBirthDate) : ""));
    setAuthDriverQuery("");
  };

  const clearAuthDriver = () => {
    setSelectedAuthDriver(null);
    setAuthorizedDriverId(null);
    setAuthDriverIdNumber("");
    setAuthDriverBirthDate("");
    setAuthDriverMobile("");
    setAuthDriverQuery("");
  };

  const handleSelectExtraDriver = (d: DriverProfile) => {
    setSelectedExtraDriver(d);
    setExtraDriverId(toBackendDriverId(d));
    setExtraDriverIdType(d.idTypeCode as TajeerIdType);
    setExtraDriverIdNumber(d.nationalId);
    setExtraDriverBirthDate(d.birthDate || (d.hijriBirthDate ? String(d.hijriBirthDate) : ""));
    setExtraDriverAddress(d.personAddress || "Riyadh");
    setExtraDriverQuery("");
  };

  const clearExtraDriver = () => {
    setSelectedExtraDriver(null);
    setExtraDriverId(null);
    setExtraDriverIdNumber("");
    setExtraDriverBirthDate("");
    setExtraDriverAddress("");
    setExtraDriverQuery("");
  };

  // Single switch for "is there an extra driver on this contract?" — shared by the
  // drivers card (نعم / لا) and the Step 2 add-on so fare + contract type stay in sync.
  const setExtraDriverEnabled = (next: boolean) => {
    setAddons((s) => ({ ...s, driver: next }));
    if (next) {
      if (isHourlyRental) setDriverFarePerHour((p) => p || 10);
      else setDriverFarePerDay((p) => p || 45);
    } else {
      clearExtraDriver();
    }
  };


  const ID_TYPE_CODE_MAP: Record<NewPersonProfile["idType"], 1 | 2 | 3 | 4> = {
    "Saudi ID": 1, "Iqama": 2, "Passport": 3, "GCC ID": 4,
  };

  const handleCreateCustomerFromDrawer = (p: NewPersonProfile) => {
    const newCust: DriverProfile = {
      id: `D-${1000 + customersList.length + 1}`,
      name: p.name,
      nameAr: p.nameAr,
      phone: p.phone,
      idType: p.idType,
      idTypeCode: ID_TYPE_CODE_MAP[p.idType],
      nationalId: p.idNumber,
      idExpiryDate: p.idExpiryDate,
      birthDate: p.birthDate,
      hijriBirthDate: p.hijriBirthDate,
      email: p.email,
      nationality: p.nationality,
      personAddress: p.personAddress ?? "Riyadh",
      idCopyNumber: p.idCopyNumber,
      licenseIssuePlace: p.licenseIssuePlace,
      borderNumber: p.borderNumber,
      licenseNumber: p.licenseNumber || `LIC-${Math.floor(10000 + Math.random() * 90000)}`,
      licenseExpiryDate: p.licenseExpiryDate,
      bookings: 0,
      status: "verified",
      lastBooking: null,
      rating: 5.0,
      blacklisted: false,
      joinDate: new Date().toISOString().split("T")[0],
    };

    setCustomersList((prev) => [newCust, ...prev]);
    setSelectedCustomer(newCust);
    setShowCustomerSearch(false);
    setIsNewCustomerOpen(false);
  };

  const handleCreateAuthDriverFromDrawer = (p: NewPersonProfile) => {
    const newDriver: DriverProfile = {
      id: `D-${1000 + customersList.length + 1}`,
      name: p.name,
      nameAr: p.nameAr,
      phone: p.phone,
      idType: p.idType,
      idTypeCode: ID_TYPE_CODE_MAP[p.idType],
      nationalId: p.idNumber,
      idExpiryDate: p.idExpiryDate,
      birthDate: p.birthDate,
      hijriBirthDate: p.hijriBirthDate,
      email: p.email,
      nationality: p.nationality,
      personAddress: p.personAddress ?? "Riyadh",
      idCopyNumber: p.idCopyNumber,
      licenseIssuePlace: p.licenseIssuePlace,
      borderNumber: p.borderNumber,
      licenseNumber: p.licenseNumber || `LIC-${Math.floor(10000 + Math.random() * 90000)}`,
      licenseExpiryDate: p.licenseExpiryDate,
      bookings: 0,
      status: "verified",
      lastBooking: null,
      rating: 5.0,
      blacklisted: false,
      joinDate: new Date().toISOString().split("T")[0],
    };

    setDriversList((prev) => [newDriver, ...prev]);
    handleSelectAuthDriver(newDriver);
    setShowAuthDriverAddNew(false);
  };

  const handleCreateExtraDriverFromDrawer = (p: NewPersonProfile) => {
    const newDriver: DriverProfile = {
      id: `D-${1000 + customersList.length + 1}`,
      name: p.name,
      nameAr: p.nameAr,
      phone: p.phone,
      idType: p.idType,
      idTypeCode: ID_TYPE_CODE_MAP[p.idType],
      nationalId: p.idNumber,
      idExpiryDate: p.idExpiryDate,
      birthDate: p.birthDate,
      hijriBirthDate: p.hijriBirthDate,
      email: p.email,
      nationality: p.nationality,
      personAddress: p.personAddress ?? "Riyadh",
      idCopyNumber: p.idCopyNumber,
      licenseIssuePlace: p.licenseIssuePlace,
      borderNumber: p.borderNumber,
      licenseNumber: p.licenseNumber || `LIC-${Math.floor(10000 + Math.random() * 90000)}`,
      licenseExpiryDate: p.licenseExpiryDate,
      bookings: 0,
      status: "verified",
      lastBooking: null,
      rating: 5.0,
      blacklisted: false,
      joinDate: new Date().toISOString().split("T")[0],
    };

    setDriversList((prev) => [newDriver, ...prev]);
    handleSelectExtraDriver(newDriver);
    setShowExtraDriverAddNew(false);
  };

  // ── Renter identity fields — the required field set depends on idTypeCode ──
  type RenterFieldDef = {
    key: string; labelEn: string; labelAr: string; required: boolean;
    type: "text" | "date" | "email" | "hijri"; value: string; onChange: (v: string) => void;
  };
  function getRenterIdentityFields(): RenterFieldDef[] {
    const idNumberField: RenterFieldDef = { key: "idNumber", labelEn: "Beneficiary ID No.", labelAr: "رقم هوية المستفيد", required: true, type: "text", value: newIdNumber, onChange: setNewIdNumber };
    const addressField: RenterFieldDef = { key: "address", labelEn: "Address", labelAr: "العنوان", required: true, type: "text", value: renterAddress, onChange: setRenterAddress };
    const idCopyNumberField: RenterFieldDef = { key: "idCopyNumber", labelEn: "ID Copy No.", labelAr: "رقم نسخة الهوية", required: true, type: "text", value: renterIdCopyNumber, onChange: setRenterIdCopyNumber };
    if (idTypeCode === 1) {
      return [
        idNumberField,
        addressField,
        { key: "hijriBirth", labelEn: "Date of Birth (Hijri)", labelAr: "تاريخ الميلاد (هجري)", required: true, type: "hijri", value: renterHijriBirth, onChange: setRenterHijriBirth },
        { key: "email", labelEn: "Email (optional)", labelAr: "البريد الإلكتروني (غير إلزامي)", required: false, type: "email", value: renterEmail, onChange: setRenterEmail },
      ];
    }
    if (idTypeCode === 2) {
      return [
        idNumberField,
        addressField,
        { key: "birthDate", labelEn: "Date of Birth", labelAr: "تاريخ الميلاد", required: true, type: "date", value: renterBirthDate, onChange: setRenterBirthDate },
        { key: "email", labelEn: "Email (optional)", labelAr: "البريد الإلكتروني (غير إلزامي)", required: false, type: "email", value: renterEmail, onChange: setRenterEmail },
      ];
    }
    if (idTypeCode === 4) {
      // GCC
      return [
        idNumberField,
        addressField,
        { key: "licenseNumber", labelEn: "License No.", labelAr: "رقم الرخصة", required: true, type: "text", value: renterLicenseNumber, onChange: setRenterLicenseNumber },
        { key: "idExpiry", labelEn: "ID Expiry Date", labelAr: "تاريخ انتهاء الهوية", required: true, type: "date", value: renterIdExpiry, onChange: setRenterIdExpiry },
        { key: "licenseIssuePlace", labelEn: "License Issue Place", labelAr: "مكان إصدار الرخصة", required: true, type: "text", value: renterLicenseIssuePlace, onChange: setRenterLicenseIssuePlace },
        { key: "email", labelEn: "Email", labelAr: "البريد الإلكتروني", required: true, type: "email", value: renterEmail, onChange: setRenterEmail },
        { key: "country", labelEn: "Country", labelAr: "الدولة", required: true, type: "text", value: renterNationalityCode, onChange: setRenterNationalityCode },
        idCopyNumberField,
        { key: "licenseExpiry", labelEn: "License Expiry Date", labelAr: "تاريخ انتهاء الرخصة", required: true, type: "date", value: renterLicenseExpiry, onChange: setRenterLicenseExpiry },
      ];
    }
    // Visitor (3) — no "Beneficiary ID No." field; identity is border/passport number instead
    return [
      addressField,
      { key: "borderNumber", labelEn: "Border No.", labelAr: "رقم الحدود", required: true, type: "text", value: renterBorderNumber, onChange: setRenterBorderNumber },
      { key: "passportNumber", labelEn: "Passport No.", labelAr: "رقم الجواز", required: true, type: "text", value: renterPassport, onChange: setRenterPassport },
      { key: "licenseNumber", labelEn: "License No.", labelAr: "رقم الرخصة", required: true, type: "text", value: renterLicenseNumber, onChange: setRenterLicenseNumber },
      { key: "licenseExpiry", labelEn: "License Expiry Date", labelAr: "تاريخ انتهاء الرخصة", required: true, type: "date", value: renterLicenseExpiry, onChange: setRenterLicenseExpiry },
      { key: "licenseIssuePlace", labelEn: "License Issue Place", labelAr: "مكان إصدار الرخصة", required: true, type: "text", value: renterLicenseIssuePlace, onChange: setRenterLicenseIssuePlace },
      { key: "email", labelEn: "Email", labelAr: "البريد الإلكتروني", required: true, type: "email", value: renterEmail, onChange: setRenterEmail },
      { key: "country", labelEn: "Country", labelAr: "الدولة", required: true, type: "text", value: renterNationalityCode, onChange: setRenterNationalityCode },
      idCopyNumberField,
      { key: "idExpiry", labelEn: "ID Expiry Date", labelAr: "تاريخ انتهاء الهوية", required: true, type: "date", value: renterIdExpiry, onChange: setRenterIdExpiry },
    ];
  }

  /* ── Stepper ─────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col min-h-[calc(100vh-110px)] justify-between">
      <div className="flex-1 pb-8">
        {/* Alert / Notification Banner */}
        <AlertBanner
          title={T("Attention required:", "تنبيه هام للموظف:", ar)}
          sub={T(
            "The Unified Rental Contract form is filled automatically during this creation journey in Maarkbh. Please thoroughly review all customer data, ID details, and branch information before issuing the contract or requesting the customer's signature.",
            "يتم تعبئة نموذج عقد التأجير الموحد تلقائياً خلال رحلة إنشاء العقد الحالية في مركبة. يرجى مراجعة كافة بيانات العميل وتفاصيل الهوية والفروع بدقة لضمان صحتها قبل إصدار العقد أو طلب توقيع العميل.",
            ar
          )}
          kind="success"
        />

        <ContractStepper ar={ar} step={step} onStepChange={setStep} />

        {/* ── Step 0: Customer, Dates & Vehicle ──────────────────── */}
        {step === 0 && (
          <StepCustomerVehicle
            ar={ar}
            showCustomerSearch={showCustomerSearch} setShowCustomerSearch={setShowCustomerSearch}
            customerQuery={customerQuery} setCustomerQuery={setCustomerQuery}
            customersLoading={customersLoading} customersError={customersError}
            filteredCustomers={filteredCustomers}
            selectedCustomer={selectedCustomer} setSelectedCustomer={setSelectedCustomer}
            setIsNewCustomerOpen={setIsNewCustomerOpen}
            pickupDateTime={pickupDateTime} setPickupDateTime={setPickupDateTime}
            returnDateTime={returnDateTime} setReturnDateTime={setReturnDateTime}
            rentalDurationLabel={rentalDurationLabel}
            isHourlyRental={isHourlyRental}
            days={days}
            authorizationStartDate={authorizationStartDate} setAuthorizationStartDate={setAuthorizationStartDate}
            authorizationEndDate={authorizationEndDate} setAuthorizationEndDate={setAuthorizationEndDate}
            authorizationTypeCode={authorizationTypeCode} setAuthorizationTypeCode={setAuthorizationTypeCode}
            authorizationCountry={authorizationCountry} setAuthorizationCountry={setAuthorizationCountry}
            isRenterDriver={isRenterDriver} setIsRenterDriver={setIsRenterDriver}
            filteredAuthDrivers={filteredAuthDrivers}
            authDriverQuery={authDriverQuery} setAuthDriverQuery={setAuthDriverQuery}
            selectedAuthDriver={selectedAuthDriver}
            handleSelectAuthDriver={handleSelectAuthDriver}
            clearAuthDriver={clearAuthDriver}
            setShowAuthDriverAddNew={setShowAuthDriverAddNew}
            driversLoading={driversLoading} driversError={driversError}
            extraDriverEnabled={addons.driver} setExtraDriverEnabled={setExtraDriverEnabled}
            filteredExtraDrivers={filteredExtraDrivers}
            extraDriverQuery={extraDriverQuery} setExtraDriverQuery={setExtraDriverQuery}
            selectedExtraDriver={selectedExtraDriver}
            handleSelectExtraDriver={handleSelectExtraDriver}
            clearExtraDriver={clearExtraDriver}
            setShowExtraDriverAddNew={setShowExtraDriverAddNew}
            backendCars={backendCars}
            availCars={availCars}
            car={car}
            vehiclesLoading={vehiclesLoading} vehiclesError={vehiclesError}
            carSearch={carSearch} setCarSearch={setCarSearch}
            carStatusTab={carStatusTab} setCarStatusTab={setCarStatusTab}
            carStatusCounts={carStatusCounts}
            viewMode={viewMode} setViewMode={setViewMode}
            carFilter={carFilter} setCarFilter={setCarFilter}
            pickedPlate={pickedPlate} setPickedPlate={setPickedPlate}
            carMapRef={carMapRef}
            carMapsLoaded={carMapsLoaded}
            showConditionModal={showConditionModal} setShowConditionModal={setShowConditionModal}
            conditionView={conditionView} setConditionView={setConditionView}
            sketchItems={sketchItems} setSketchItems={setSketchItems}
            rentStatus={rentStatus}
          />
        )}

        {/* ── Step 1: Add-ons & Handover ──────────────────────────── */}
        {step === 1 && (
          <StepAddons
            ar={ar}
            car={car}
            days={days}
            total={total}
            isHourlyRental={isHourlyRental}
            driverFarePerDay={driverFarePerDay}
            driverFarePerHour={driverFarePerHour}
            branches={branches}
            receiveBranchId={receiveBranchId} setReceiveBranchId={setReceiveBranchId}
            returnBranchId={returnBranchId} setReturnBranchId={setReturnBranchId}
            setWorkingBranchId={setWorkingBranchId}
            addons={addons} setAddons={setAddons}
            additionalServices={additionalServices}
            setExtraDriverEnabled={setExtraDriverEnabled}
            rentPolicies={rentPolicies}
            rentPolicyId={rentPolicyId} setRentPolicyId={setRentPolicyId}
            cancellationPolicies={cancellationPolicies}
            cancellationPolicyId={cancellationPolicyId} setCancellationPolicyId={setCancellationPolicyId}
            extensionPolicy={extensionPolicy} setExtensionPolicy={setExtensionPolicy}
            earlyReturnPolicy={earlyReturnPolicy} setEarlyReturnPolicy={setEarlyReturnPolicy}
            accidentReportPolicy={accidentReportPolicy} setAccidentReportPolicy={setAccidentReportPolicy}
            fuelReturnPolicy={fuelReturnPolicy} setFuelReturnPolicy={setFuelReturnPolicy}
            breakdownReportPolicy={breakdownReportPolicy} setBreakdownReportPolicy={setBreakdownReportPolicy}
            filteredExtraDrivers={filteredExtraDrivers}
            extraDriverQuery={extraDriverQuery} setExtraDriverQuery={setExtraDriverQuery}
            selectedExtraDriver={selectedExtraDriver}
            handleSelectExtraDriver={handleSelectExtraDriver}
            clearExtraDriver={clearExtraDriver}
            setShowExtraDriverAddNew={setShowExtraDriverAddNew}
          />
        )}


        {/* ── Step 2: Verification & Payment ────────────────────── */}
        {step === 2 && (
          <StepPricingPayment
            ar={ar}
            car={car}
            contractTypeCode={contractTypeCode}
            days={days}
            totalHours={totalHours}
            addons={addons}
            unlimitedKm={unlimitedKm}
            receiveBranchId={receiveBranchId}
            returnBranchId={returnBranchId}
            extendedCoverageId={extendedCoverageId}
            rentDayCost={rentDayCost} setRentDayCost={setRentDayCost}
            rentHourCost={rentHourCost} setRentHourCost={setRentHourCost}
            extraKmCost={extraKmCost} setExtraKmCost={setExtraKmCost}
            fullFuelCost={fullFuelCost} setFullFuelCost={setFullFuelCost}
            driverFarePerDay={driverFarePerDay} setDriverFarePerDay={setDriverFarePerDay}
            driverFarePerHour={driverFarePerHour} setDriverFarePerHour={setDriverFarePerHour}
            vehicleTransferCost={vehicleTransferCost} setVehicleTransferCost={setVehicleTransferCost}
            internationalAuthorizationCost={internationalAuthorizationCost} setInternationalAuthorizationCost={setInternationalAuthorizationCost}
            additionalCoverageCost={additionalCoverageCost} setAdditionalCoverageCost={setAdditionalCoverageCost}
            allowedKmPerDay={allowedKmPerDay} setAllowedKmPerDay={setAllowedKmPerDay}
            allowedLateHours={allowedLateHours} setAllowedLateHours={setAllowedLateHours}
            lateFeePerHour={lateFeePerHour} setLateFeePerHour={setLateFeePerHour}
            discountType={discountType}
            discountPercent={discountPercent}
            payType={payType} setPayType={setPayType}
            payMethod={payMethod} setPayMethod={setPayMethod}
            pricing={pricing}
          />
        )}

        {/* ── Step 3: Issue via Tajeer ───────────────────────────── */}
        {step === 3 && (
          <StepIssue
            ar={ar}
            contractStep={contractStep}
            tajeerResponse={tajeerResponse}
            tajeerError={tajeerError}
            otpDigits={otpDigits}
            onOtpDigitsChange={setOtpDigits}
            onOpenPreview={() => setShowContractPreview(true)}
            onCancelContract={handleCancelContract}
            selectedCustomer={selectedCustomer}
            idTypeCode={idTypeCode}
            renterIdentityFields={getRenterIdentityFields()}
            isRenterDriver={isRenterDriver}
            authDriverIdNumber={authDriverIdNumber}
            authDriverMobile={authDriverMobile}
            authDriverBirthDate={authDriverBirthDate}
            selectedExtraDriver={selectedExtraDriver}
            extraDriverIdNumber={extraDriverIdNumber}
            extraDriverBirthDate={extraDriverBirthDate}
            days={days}
            pickupDate={pickupDate}
            returnDate={returnDate}
            car={car}
            rentStatus={rentStatus}
            sketchItems={sketchItems}
            branches={branches}
            rentPolicies={rentPolicies}
            receiveBranchId={receiveBranchId}
            returnBranchId={returnBranchId}
            rentPolicyId={rentPolicyId}
            contractTypeCode={contractTypeCode}
            addons={addons}
            additionalServices={additionalServices}
            unlimitedKm={unlimitedKm}
            allowedKmPerDay={allowedKmPerDay}
            allowedKmPerHour={allowedKmPerHour}
            allowedLateHours={allowedLateHours}
            lateFeePerHour={lateFeePerHour}
            pricing={pricing}
            fullFuelCost={fullFuelCost}
            discountType={discountType}
            discountPercent={discountPercent}
            payMethod={payMethod}
          />
        )}

        {/* ── Contract preview overlay modal ───────────────────── */}
        <Modal
          open={showContractPreview}
          onClose={() => setShowContractPreview(false)}
          variant="centered"
          size="5xl"
          title={T("Contract preview", "معاينة العقد", ar)}
          headerActions={
            <div className="flex items-center gap-3">
              <span className="mk-caption text-mk-ink-400">
                {tajeerResponse?.contractNumber ?? T("Draft", "مسودة", ar)} · {T("Tajeer Format", "تنسيق تاجير", ar)}
              </span>
              <Button size="sm" variant="primary" onClick={() => window.print()}>
                <Printer size={13} /> {ar ? "طباعة" : "Print"}
              </Button>
            </div>
          }
        >
          <div className="p-6 bg-mk-bg-muted flex justify-center">
            <ContractPreview
              ar={ar}
              selectedCustomer={selectedCustomer!}
              car={car!}
              idTypeCode={idTypeCode}
              newIdNumber={newIdNumber}
              renterIdExpiry={renterIdExpiry}
              renterLicenseNumber={renterLicenseNumber}
              renterLicenseExpiry={renterLicenseExpiry}
              renterBirthDate={renterBirthDate}
              renterHijriBirth={renterHijriBirth}
              renterIdCopyNumber={renterIdCopyNumber}
              renterAddress={renterAddress}
              renterNationalityCode={renterNationalityCode}
              renterEmail={renterEmail}
              renterPassport={renterPassport}
              renterLicenseIssuePlace={renterLicenseIssuePlace}
              renterBorderNumber={renterBorderNumber}
              contractTypeCode={contractTypeCode}
              contractStartDate={pickupDate.toISOString()}
              contractEndDate={returnDate.toISOString()}
              days={days}
              rentDayCost={rentDayCost}
              rentHourCost={rentHourCost}
              extraKmCost={extraKmCost}
              allowedKmPerDay={allowedKmPerDay}
              allowedKmPerHour={allowedKmPerHour}
              allowedLateHours={allowedLateHours}
              lateFeePerHour={lateFeePerHour}
              unlimitedKm={unlimitedKm || addons.unlimited_km}
              base={base}
              subtotal={subtotal}
              vat={vat}
              total={total}
              advanceAmount={advanceAmount}
              remaining={remaining}
              payType={payType}
              addons={addons}
              addonPrices={addonPrices}
              ADD_ONS={additionalServices.map((service) => ({
                k: service.key.toLowerCase().replace(/[-\s]+/g, "_"),
                nameAr: service.nameAr,
                nameEn: service.nameEn,
              }))}
              rentStatus={rentStatus}
              sketchItems={sketchItems}
              receiveBranchId={receiveBranchId}
              returnBranchId={returnBranchId}
              workingBranchId={workingBranchId}
              branches={branches}
              tajeerResponse={tajeerResponse}
              contractStep={contractStep}
              signed={signed}
              rentPolicies={rentPolicies}
              rentPolicyId={rentPolicyId}
              TAJEER_LOOKUPS={TAJEER_LOOKUPS}
              isRenterDriver={isRenterDriver}
              authDriverIdType={authDriverIdType}
              authDriverIdNumber={authDriverIdNumber}
              authDriverBirthDate={authDriverBirthDate}
              authDriverMobile={authDriverMobile}
              authDriverAddress="الرياض"
              authorizationStartDate={authorizationStartDate}
              authorizationEndDate={authorizationEndDate}
              authorizationTypeCode={authorizationTypeCode}
              authorizationCountry={authorizationCountry}
              selectedExtraDriver={selectedExtraDriver}
              extraDriverIdType={extraDriverIdType}
              extraDriverIdNumber={extraDriverIdNumber}
              extraDriverAddress={extraDriverAddress}
              extraDriverBirthDate={extraDriverBirthDate}
              discountPercent={discountPercent}
              discountAmount={discountAmount}
              payMethod={payMethod}
              employeeId="EMP-102"
              registrationTypeCode={car?.registrationTypeCode ?? 1}
              operationCardNumber={car?.operationCardNumber}
              operationCardExpiry={car?.operationCardExpiryDate}
              vehicleOtherNotes={car?.otherNotes}
              insuranceAmount={insuranceAmount}
              internationalAuthorizationCost={internationalAuthorizationCost}
              fullFuelCost={fullFuelCost}
              driverFarePerDay={driverFarePerDay}
              driverFarePerHour={driverFarePerHour}
              vehicleTransferCost={vehicleTransferCost}
              rentalPolicyText={{
                extension: RENTAL_POLICY_OPTIONS.extension.find((o) => o.key === extensionPolicy) ?? RENTAL_POLICY_OPTIONS.extension[0],
                earlyReturn: RENTAL_POLICY_OPTIONS.earlyReturn.find((o) => o.key === earlyReturnPolicy) ?? RENTAL_POLICY_OPTIONS.earlyReturn[0],
                accidentReport: RENTAL_POLICY_OPTIONS.accidentReport.find((o) => o.key === accidentReportPolicy) ?? RENTAL_POLICY_OPTIONS.accidentReport[0],
                fuelReturn: RENTAL_POLICY_OPTIONS.fuelReturn.find((o) => o.key === fuelReturnPolicy) ?? RENTAL_POLICY_OPTIONS.fuelReturn[0],
                breakdownReport: RENTAL_POLICY_OPTIONS.breakdownReport.find((o) => o.key === breakdownReportPolicy) ?? RENTAL_POLICY_OPTIONS.breakdownReport[0],
              }}
            />
          </div>
        </Modal>
      </div>

      {/* Sticky Bottom Navigation Bar */}
      <StickyFooter
        ar={ar}
        step={step}
        onStepChange={setStep}
        contractStep={contractStep}
        otpComplete={otpDigits.every(d => d !== "")}
        canContinueFromStep0={selectedCustomer !== null && !CUSTOMER_STATUS_META[getCustomerStatusTag(selectedCustomer)].blocking}
        payType={payType}
        advanceAmount={advanceAmount}
        total={total}
        onIssue={handleSubmitToTajeer}
        onCheckSignature={handleConfirmSignature}
        onRetry={handleSubmitToTajeer}
      />

      {/* ── Registration drawers — match the "Register new customer" modal in the customer page ── */}
      <PersonRegistrationDrawer
        open={isNewCustomerOpen}
        onClose={() => setIsNewCustomerOpen(false)}
        onCreate={handleCreateCustomerFromDrawer}
        ar={ar}
        titleEn="Add new customer"
        titleAr="إضافة عميل جديد"
        submitLabelEn="Add Customer"
        submitLabelAr="إضافة عميل"
      />
      <PersonRegistrationDrawer
        open={showAuthDriverAddNew}
        onClose={() => setShowAuthDriverAddNew(false)}
        onCreate={handleCreateAuthDriverFromDrawer}
        ar={ar}
        titleEn="Add new authorized driver"
        titleAr="إضافة مفوض جديد"
        submitLabelEn="Add Authorized Driver"
        submitLabelAr="إضافة مفوض"
        allowedIdTypes={["Saudi ID", "Iqama"]}
      />
      <PersonRegistrationDrawer
        open={showExtraDriverAddNew}
        onClose={() => setShowExtraDriverAddNew(false)}
        onCreate={handleCreateExtraDriverFromDrawer}
        ar={ar}
        titleEn="Add new driver"
        titleAr="إضافة سائق جديد"
        submitLabelEn="Add Driver"
        submitLabelAr="إضافة سائق"
        allowedIdTypes={["Saudi ID", "Iqama", "GCC ID", "Passport"]}
      />
    </div>
  );
}
