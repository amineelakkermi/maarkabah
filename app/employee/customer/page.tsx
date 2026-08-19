"use client";

import CustomerListPage from "@/components/shared/customers/CustomerListPage";

export default function EmployeeCustomerListPage() {
  const customerDetailPath = (id: string | number | null | undefined) =>
    `/employee/customer/${id ?? ""}`;

  return (
    <CustomerListPage
      customerDetailPath={customerDetailPath}
      canBlacklist={true}
      canDelete={true}
    />
  );
}
