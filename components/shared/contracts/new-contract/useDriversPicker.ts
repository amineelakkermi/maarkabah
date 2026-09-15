import { useEffect, useState } from "react";
import type { DriverProfile } from "@/lib/data";
import { driverService } from "@/lib/api-services";
import { T } from "./constants";
import { mapBackendCustomerToDriver } from "./mappers";

/* ── Backend: load drivers (POST /api/drivers/picker) — authorized / extra driver pickers ── */
export function useDriversPicker(ar: boolean) {
  const [driversList, setDriversList] = useState<DriverProfile[]>([]);
  const [driversLoading, setDriversLoading] = useState(true);
  const [driversError, setDriversError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setDriversLoading(true);
      setDriversError("");
      try {
        const response = await driverService.picker({ search: "", identityType: null, pageNumber: 1, pageSize: 100 });
        if (cancelled) return;
        const items = response.items || response.data || [];
        setDriversList(items.map(mapBackendCustomerToDriver));
      } catch (err) {
        if (cancelled) return;
        console.error("Error loading drivers:", err);
        setDriversError(T("Failed to load drivers", "فشل تحميل قائمة السائقين", ar));
      } finally {
        if (!cancelled) setDriversLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { driversList, setDriversList, driversLoading, driversError };
}
