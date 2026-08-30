"use client";

import ContractsListPage from "@/components/shared/contracts/ContractsListPage";

export default function EmployeeContractsPage() {
  return (
    <ContractsListPage
      newContractPath="/employee/new-contract"
      contractDetailPath={(id) => `/employee/contracts/${id}`}
    />
  );
}
