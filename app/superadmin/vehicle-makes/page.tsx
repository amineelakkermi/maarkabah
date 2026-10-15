"use client";

import { LookupCatalogPanel } from "@/components/superadmin/LookupCatalogPanel";
import { adminVehicleMakeService } from "@/lib/api-services";

export default function SuperAdminVehicleMakesPage() {
  return (
    <LookupCatalogPanel
      title={["Vehicle Makes", "ماركات المركبات"]}
      subtitle={[
        "Platform catalog of vehicle makes — every change syncs to all offices.",
        "القائمة العامة لماركات المركبات — كل تعديل يُزامَن مع جميع المكاتب.",
      ]}
      entityName={["vehicle make", "الماركة"]}
      service={adminVehicleMakeService}
    />
  );
}
