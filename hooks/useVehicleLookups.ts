// ─────────────────────────────────────────────────────────────
//  Hook: Load vehicle lookup data (makes, models, branches...)
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import {
  vehicleMakeService,
  vehicleModelService,
  branchService,
  plateTypeService,
  insuranceCompanyService,
  insuranceTypeService,
} from "@/lib/api-services";

export function useVehicleLookups(makeId?: string | number) {
  const [makes, setMakes] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [plateTypes, setPlateTypes] = useState<any[]>([]);
  const [insuranceCompanies, setInsuranceCompanies] = useState<any[]>([]);
  const [insuranceTypes, setInsuranceTypes] = useState<any[]>([]);

  // Load main lookups once on mount
  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [makesRes, branchesRes, plateTypesRes, insuranceCompaniesRes, insuranceTypesRes] =
          await Promise.all([
            vehicleMakeService.search({ pageNumber: 1, pageSize: 100 }),
            branchService.search({ pageNumber: 1, pageSize: 100 }),
            plateTypeService.search({ pageNumber: 1, pageSize: 100 }),
            insuranceCompanyService.search({ pageNumber: 1, pageSize: 100 }),
            insuranceTypeService.search({ pageNumber: 1, pageSize: 100 }),
          ]);

        setMakes(makesRes.items || makesRes.data || []);
        setBranches(branchesRes.items || branchesRes.data || []);
        setPlateTypes(plateTypesRes.items || plateTypesRes.data || []);
        setInsuranceCompanies(insuranceCompaniesRes.items || insuranceCompaniesRes.data || []);
        setInsuranceTypes(insuranceTypesRes.items || insuranceTypesRes.data || []);
      } catch (error) {
        console.error("Error loading vehicle lookups:", error);
      }
    };

    loadLookups();
  }, []);

  // Load models whenever the selected make changes
  useEffect(() => {
    if (!makeId) {
      setModels([]);
      return;
    }

    vehicleModelService
      .search({ parentId: Number(makeId), pageNumber: 1, pageSize: 100 } as any)
      .then((res: any) => setModels(res.items || res.data || []))
      .catch((error: any) => console.error("Error loading vehicle models:", error));
  }, [makeId]);

  return {
    makes,
    models,
    branches,
    plateTypes,
    insuranceCompanies,
    insuranceTypes,
  };
}
