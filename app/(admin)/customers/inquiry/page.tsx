"use client";

import CustomerInquiryPage from "@/components/shared/customers/CustomerInquiryPage";

export default function AdminCustomerInquiryPage() {
  const customerProfilePath = (id: string | number | null | undefined) =>
    `/customers/${id ?? ""}`;

  return <CustomerInquiryPage customerProfilePath={customerProfilePath} />;
}
