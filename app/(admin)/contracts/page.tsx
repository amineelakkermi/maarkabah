"use client";

import ContractsListPage from "@/components/shared/contracts/ContractsListPage";

export default function AdminContractsPage() {
  return (
    <ContractsListPage
      newContractPath="/new-contract"
      contractDetailPath={(id) => `/contracts/${id}`}
    />
  );
}
