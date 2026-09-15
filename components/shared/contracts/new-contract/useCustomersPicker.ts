import { useEffect, useState } from "react";
import type { DriverProfile } from "@/lib/data";
import { customerService } from "@/lib/api-services";
import { T } from "./constants";
import { mapBackendCustomerToDriver } from "./mappers";

/* ── Backend: load customers (POST /api/customers/search) ─────────────── */
// `clientId` (query param) preselects a customer; the page is notified through
// `onPreselected` so it can select it and collapse the search box, as before.
export function useCustomersPicker(ar: boolean, clientId: string | null, onPreselected?: (customer: DriverProfile) => void) {
  const [customersList, setCustomersList] = useState<DriverProfile[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customersError, setCustomersError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCustomersLoading(true);
      setCustomersError("");
      try {
        const response = await customerService.search({ pageNumber: 1, pageSize: 100 });
        if (cancelled) return;
        const items = response.items || response.data || [];
        const mapped: DriverProfile[] = items.map(mapBackendCustomerToDriver);
        setCustomersList(mapped);

        // Handle preselection from clientId query param
        if (clientId) {
          const numericId = Number(clientId);
          let preselected = mapped.find((c) => c.id === clientId || c.id === String(numericId));
          if (!preselected && !isNaN(numericId)) {
            try {
              const detail = await customerService.getById(numericId);
              if (detail) {
                preselected = mapBackendCustomerToDriver(detail?.data ?? detail);
                setCustomersList((prev) => [preselected!, ...prev.filter((c) => c.id !== preselected!.id)]);
              }
            } catch { /* customer not found — leave unselected */ }
          }
          if (preselected) onPreselected?.(preselected);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Error loading customers:", err);
        setCustomersError(T("Failed to load customers", "فشل تحميل قائمة العملاء", ar));
      } finally {
        if (!cancelled) setCustomersLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { customersList, setCustomersList, customersLoading, customersError };
}
