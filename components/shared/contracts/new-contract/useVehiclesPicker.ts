import { useEffect, useState } from "react";
import type { Car } from "@/lib/data";
import { vehicleService } from "@/lib/api-services";
import { T } from "./constants";
import { mapBackendVehicleToCar } from "./mappers";

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
        const response = await vehicleService.search({ pageNumber: 1, pageSize: 100 });
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
        const mapped: Car[] = detailedVehicles.map((raw: any) => mapBackendVehicleToCar(raw?.data ?? raw));
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
