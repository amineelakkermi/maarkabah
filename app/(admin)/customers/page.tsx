"use client";

import CustomerListPage from "@/components/shared/customers/CustomerListPage";

export default function AdminCustomerListPage() {
  const customerDetailPath = (id: string | number | null | undefined) =>
    `/customers/${id ?? ""}`;

  return (
    <CustomerListPage
      customerDetailPath={customerDetailPath}
      canBlacklist={true}
      canDelete={true}
    />
  );
}
