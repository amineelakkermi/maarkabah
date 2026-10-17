"use client";

import { RenterVerification } from "@/components/shared/RenterVerification";

export default function EmployeeCustomerInquiryPage() {
  return (
    <RenterVerification
      contractHref={(id) => `/employee/new-contract?clientId=${id}`}
      profileHref={(id) => `/employee/customer/${id}`}
    />
  );
}
