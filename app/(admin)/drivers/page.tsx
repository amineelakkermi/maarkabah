"use client";

import DriverListPage from "@/components/shared/drivers/DriverListPage";

export default function AdminDriversListPage() {
  const driverDetailPath = (id: string | number | null | undefined) =>
    `/drivers/${id ?? ""}`;

  return <DriverListPage driverDetailPath={driverDetailPath} />;
}
