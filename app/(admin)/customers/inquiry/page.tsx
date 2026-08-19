"use client";

import CustomerInquiryPage from "@/components/shared/customers/CustomerInquiryPage";
import { useAdmin } from "@/contexts/AdminContext";

export default function AdminCustomerInquiryPage() {
  const { role } = useAdmin();

  const customerProfilePath = (id: string | number | null | undefined) =>
    role === "owner" ? `/customers/${id ?? ""}` : `/employee/customer/${id ?? ""}`;

  return <CustomerInquiryPage customerProfilePath={customerProfilePath} />;
}
