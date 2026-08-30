"use client";

import ContractDetailPage from "@/components/shared/contracts/ContractDetailPage";

export default function AdminContractDetailPage() {
  return (
    <ContractDetailPage
      contractsListPath="/contracts"
      pickupPath={(id) => `/pickup?id=${id}`}
      returnPath={(id) => `/return?id=${id}`}
      role="owner"
    />
  );
}
