import { useEffect, useState } from "react";
import {
  additionalServiceService,
  branchService,
  cancellationPolicyService,
  extendedCoverageService,
  rentPolicyService,
} from "@/lib/api-services";
import type {
  AdditionalServiceDto,
  CancellationPolicyDto,
  RentPolicyDto,
} from "@/lib/api-types";

export type LookupItem = { id: number; nameAr: string; nameEn: string };
export type ContractRentPolicy = LookupItem & RentPolicyDto;
export type ContractCancellationPolicy = LookupItem & CancellationPolicyDto;
export type ContractAdditionalService = AdditionalServiceDto & {
  key: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  unitPrice: number;
};

type CollectionResponse<T> = T[] | { items?: T[]; data?: T[] | { items?: T[] } };

function itemsFrom<T>(response: CollectionResponse<T>): T[] {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.items)) return response.items;
  if (Array.isArray(response.data)) return response.data;
  return response.data?.items ?? [];
}

export function useContractLookups(
  branchId?: number,
  onLoaded?: (branches: LookupItem[], rentPolicies: ContractRentPolicy[], cancellationPolicies: ContractCancellationPolicy[]) => void,
) {
  const [branches, setBranches] = useState<LookupItem[]>([]);
  const [rentPolicies, setRentPolicies] = useState<ContractRentPolicy[]>([]);
  const [cancellationPolicies, setCancellationPolicies] = useState<ContractCancellationPolicy[]>([]);
  const [extendedCoverage, setExtendedCoverage] = useState<LookupItem[]>([]);
  const [additionalServices, setAdditionalServices] = useState<ContractAdditionalService[]>([]);

  useEffect(() => {
    Promise.allSettled([
      branchService.search({ search: "", isActive: true, pageNumber: 1, pageSize: 200 }),
      rentPolicyService.picker(),
      cancellationPolicyService.picker(),
      extendedCoverageService.picker(),
    ]).then(([branchResult, rentPolicyResult, cancellationPolicyResult, coverageResult]) => {
      const loadedBranches = branchResult.status === "fulfilled"
        ? itemsFrom<{ id: number; nameAr?: string; nameEn?: string }>(branchResult.value)
          .map((item) => ({ id: item.id, nameAr: item.nameAr ?? "", nameEn: item.nameEn ?? "" }))
        : [];
      const loadedRentPolicies = rentPolicyResult.status === "fulfilled"
        ? itemsFrom<RentPolicyDto>(rentPolicyResult.value)
          .map((item) => ({ ...item, nameAr: item.nameAr ?? "", nameEn: item.nameEn ?? "" }))
        : [];
      const loadedCancellationPolicies = cancellationPolicyResult.status === "fulfilled"
        ? itemsFrom<CancellationPolicyDto>(cancellationPolicyResult.value)
          .map((item) => ({ ...item, nameAr: item.nameAr ?? "", nameEn: item.nameEn ?? "" }))
        : [];
      const loadedCoverage = coverageResult.status === "fulfilled"
        ? itemsFrom<{ id: number; nameAr?: string; nameEn?: string }>(coverageResult.value)
          .map((item) => ({ id: item.id, nameAr: item.nameAr ?? "", nameEn: item.nameEn ?? "" }))
        : [];

      if (branchResult.status === "fulfilled") setBranches(loadedBranches);
      else console.error("Error loading branches:", branchResult.reason);
      if (rentPolicyResult.status === "fulfilled") setRentPolicies(loadedRentPolicies);
      else console.error("Error loading rental policies:", rentPolicyResult.reason);
      if (cancellationPolicyResult.status === "fulfilled") setCancellationPolicies(loadedCancellationPolicies);
      else console.error("Error loading cancellation policies:", cancellationPolicyResult.reason);
      if (coverageResult.status === "fulfilled") setExtendedCoverage(loadedCoverage);
      else console.error("Error loading extended coverages:", coverageResult.reason);

      onLoaded?.(loadedBranches, loadedRentPolicies, loadedCancellationPolicies);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!branchId) return;

    additionalServiceService.picker({ branchId }).then((response) => {
      const services = itemsFrom<AdditionalServiceDto>(response)
        .filter((item) => item.isActive !== false)
        .map((item) => ({
          ...item,
          key: item.code || String(item.id),
          nameAr: item.nameAr ?? "",
          nameEn: item.nameEn ?? "",
          descriptionAr: item.descriptionAr ?? "",
          descriptionEn: item.descriptionEn ?? "",
          unitPrice: item.unitPrice ?? 0,
        }));
      setAdditionalServices(services);
    }).catch((error) => {
      console.error("Error loading additional services:", error);
      setAdditionalServices([]);
    });
  }, [branchId]);

  return { branches, rentPolicies, cancellationPolicies, extendedCoverage, additionalServices };
}
