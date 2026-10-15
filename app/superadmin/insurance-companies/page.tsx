"use client";

import { LookupCatalogPanel } from "@/components/superadmin/LookupCatalogPanel";
import { adminInsuranceCompanyService } from "@/lib/api-services";

export default function SuperAdminInsuranceCompaniesPage() {
  return (
    <LookupCatalogPanel
      title={["Insurance Companies", "شركات التأمين"]}
      subtitle={[
        "Platform catalog of insurance companies — every change syncs to all offices.",
        "القائمة العامة لشركات التأمين — كل تعديل يُزامَن مع جميع المكاتب.",
      ]}
      entityName={["insurance company", "شركة التأمين"]}
      service={adminInsuranceCompanyService}
    />
  );
}
