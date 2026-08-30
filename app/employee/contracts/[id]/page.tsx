"use client";

import ContractDetailPage from "@/components/shared/contracts/ContractDetailPage";

export default function EmployeeContractDetailPage() {
  return (
    <ContractDetailPage
      contractsListPath="/employee/contracts"
      pickupPath={(id) => `/employee/pickup?id=${id}`}
      returnPath={(id) => `/employee/return?id=${id}`}
      role="frontdesk"
    />
  );
}
