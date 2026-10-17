"use client";

import { RenterVerification } from "@/components/shared/RenterVerification";

export default function AdminCustomerInquiryPage() {
  return (
    <RenterVerification
      contractHref={(id) => `/new-contract?clientId=${id}`}
      profileHref={(id) => `/customers/${id}`}
    />
  );
}
