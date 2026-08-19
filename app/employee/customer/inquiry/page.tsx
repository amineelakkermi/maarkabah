"use client";

import CustomerInquiryPage from "@/components/shared/customers/CustomerInquiryPage";

export default function EmployeeCustomerInquiryPage() {
  const customerProfilePath = (id: string | number | null | undefined) =>
    `/employee/customer/${id ?? ""}`;

  return <CustomerInquiryPage customerProfilePath={customerProfilePath} />;
}
