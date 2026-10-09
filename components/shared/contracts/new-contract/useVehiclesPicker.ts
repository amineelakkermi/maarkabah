import { useEffect, useState } from "react";
import type { Car } from "@/lib/data";
import { vehicleService, lookupService, insuranceTypeService } from "@/lib/api-services";
import { T } from "./constants";
import { mapBackendVehicleToCar, type VehicleLookupContext } from "./mappers";

// The vehicle detail response only stores insuranceCompanyId / insuranceTypeId —
// the contract preview needs the resolved names, so load both lookup lists once.
async function fetchInsuranceLookups(): Promise<VehicleLookupContext> {
  const [ctxResult, typesResult] = await Promise.allSettled([
    lookupService.getContext({ sections: ["InsuranceCompanies"] }),
    insuranceTypeService.search({ pageNumber: 1, pageSize: 100 }),
  ]);
  const ctxRoot = ctxResult.status === "fulfilled" ? (ctxResult.value?.data ?? ctxResult.value ?? {}) : {};
  const insuranceCompanies = ctxRoot.insuranceCompanies ?? ctxRoot.InsuranceCompanies ?? [];
  const insuranceTypes = typesResult.status === "fulfilled"
    ? (typesResult.value?.items ?? typesResult.value?.data ?? [])
    : [];
  return { insuranceCompanies, insuranceTypes };
}

/* ── Backend: load vehicles (POST /api/vehicles/search + GET /api/vehicles/{id}) ── */
// `onLoaded` receives the mapped list once so the page can auto-pick the first plate, as before.
export function useVehiclesPicker(ar: boolean, onLoaded?: (cars: Car[]) => void) {
  const [backendCars, setBackendCars] = useState<Car[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [vehiclesError, setVehiclesError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setVehiclesLoading(true);
      setVehiclesError("");
      try {
        const [response, lookups] = await Promise.all([
          vehicleService.search({ pageNumber: 1, pageSize: 100 }),
          fetchInsuranceLookups(),
        ]);
        if (cancelled) return;
        const searchItems = response.items || response.data || [];
        const detailedVehicles = await Promise.all(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          searchItems.map(async (item: any) => {
            try {
              return await vehicleService.getById(item.id);
            } catch {
              return item;
            }
          })
        );
        if (cancelled) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: Car[] = detailedVehicles.map((raw: any) => mapBackendVehicleToCar(raw?.data ?? raw, lookups));
        setBackendCars(mapped);
        onLoaded?.(mapped);
      } catch (err) {
        if (cancelled) return;
        console.error("Error loading vehicles:", err);
        setVehiclesError(T("Failed to load vehicles", "فشل تحميل قائمة المركبات", ar));
      } finally {
        if (!cancelled) setVehiclesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { backendCars, vehiclesLoading, vehiclesError };
}
