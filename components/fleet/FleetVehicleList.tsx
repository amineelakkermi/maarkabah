"use client";

import { useState } from "react";
import { Car, CarStatus } from "@/lib/data";
import { Car as CarIcon, LayoutGrid, List as ListIcon, Loader2, Map as MapIcon, Plus, Search, X } from "lucide-react";
import { Button, IconButton, Input, Table, Tabs, Th, Tr } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { Permission } from "@/lib/permissions";
import { STATUS_TABS, T } from "@/lib/fleet";
import { CarCard, CarListRow } from "@/components/fleet/CarCard";

interface FleetVehicleListProps {
  vehicles: Car[];
  visibleVehicles: Car[];
  loading: boolean;
  tab: "all" | CarStatus;
  search: string;
  counts: Record<string, number>;
  onTabChange: (tab: "all" | CarStatus) => void;
  onSearchChange: (search: string) => void;
  onAdd: () => void;
  onEdit: (car: Car) => void;
  onDelete: (car: Car) => void;
  onShowVehicleMap?: (car: Car) => void;
  onShowGarageMap?: () => void;
}

export function FleetVehicleList({
  vehicles,
  visibleVehicles,
  loading,
  tab,
  search,
  counts,
  onTabChange,
  onSearchChange,
  onAdd,
  onEdit,
  onDelete,
  onShowVehicleMap,
  onShowGarageMap,
}: FleetVehicleListProps) {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const { hasPermission } = usePermissions();
  // Save covers create; Delete gates the trash action. Edit stays available —
  // it opens the vehicle details, which render read-only for viewers.
  const canSave = hasPermission(Permission.Vehicles.Save);
  const canDelete = hasPermission(Permission.Vehicles.Delete);
  const [view, setView] = useState<"grid" | "list">("grid");

  return (
    <div>
      {/* Header: status tabs, then search, then the add action, on one row —
          on small screens the tabs wrap to a full-width scrollable row below
          while search and the button share the first line. */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="order-3 sm:order-1 min-w-0 max-w-full overflow-x-auto mk-scrollbar-none mk-view-toggle">
          <Tabs variant="default" rounded="full" className="mk-view-toggle--reversed flex-nowrap! w-max"
          value={tab}
          onChange={(value) => onTabChange(value as "all" | CarStatus)}
          items={STATUS_TABS.map((item) => ({ value: item.key, label: ar ? item.labelAr : item.labelEn, count: item.key === "all" ? vehicles.length || undefined : counts[item.key] || undefined }))} />
        </div>

        <div className="order-1 sm:order-2 flex-1 min-w-[160px] sm:max-w-[400px]">
          <Input variant="search" icon={<Search size={14} />} placeholder={T("Search make, model, plate…", "بحث عن ماركة، طراز، لوحة…", ar)} value={search} onChange={(event) => onSearchChange(event.target.value)} suffix={search && <IconButton size="sm" variant="ghost" onClick={() => onSearchChange("")}><X size={13} /></IconButton>} />
        </div>

        {canSave && (
          <div className="order-2 sm:order-3 ms-auto">
            <Button variant="primary" className="shadow-[0_4px_14px_-4px_rgba(65,113,226,0.4)]" onClick={onAdd}><Plus size={15} />{T("Add vehicle", "إضافة مركبة", ar)}</Button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 my-6">
        <span className="mk-label text-mk-ink-500">{visibleVehicles.length} {T("vehicle", "مركبة", ar)}{visibleVehicles.length !== 1 && !ar ? "s" : ""}</span>
        <div className="flex-1" />
        {/* The map entry acts as an action (opens the garage map modal), not a
            view — selecting it triggers the callback without switching `view`. */}
        <Tabs
          variant="default"
          className="mk-view-toggle--reversed"
          value={view}
          onChange={(value) => {
            if (value === "map") { onShowGarageMap?.(); return; }
            setView(value as "grid" | "list");
          }}
          items={[
            { value: "grid", icon: <LayoutGrid size={15} />, "aria-label": "Grid view" },
            { value: "list", icon: <ListIcon size={15} />, "aria-label": "List view" },
            ...(onShowGarageMap ? [{ value: "map", icon: <MapIcon size={15} />, "aria-label": "Map view" }] : []),
          ]}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 rounded-xl mk-surface"><Loader2 className="animate-spin text-mk-blue-500" size={32} /></div>
      ) : visibleVehicles.length === 0 ? (
        <div className="py-16 text-center text-mk-ink-400 rounded-xl mk-surface"><CarIcon size={32} className="mx-auto mb-3 opacity-30" /><p className="mk-body-sm">{T("No vehicles found", "لا توجد مركبات", ar)}</p></div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{visibleVehicles.map((car) => <CarCard key={car.id} car={car} onEdit={onEdit} onDelete={onDelete} canDelete={canDelete} onMapClick={onShowVehicleMap} />)}</div>
      ) : (
        <div className="rounded-xl overflow-hidden mk-surface mk-shadow-12">
          <Table>
            <thead><Tr><Th>{T("Vehicle", "المركبة", ar)}</Th><Th>{T("Daily rate", "السعر اليومي", ar)}</Th><Th>{T("Utilization", "الاستخدام", ar)}</Th><Th /><Th>{T("Status", "الحالة", ar)}</Th><Th>{T("Alerts", "التنبيهات", ar)}</Th><Th /></Tr></thead>
            <tbody>{visibleVehicles.map((car) => <CarListRow key={car.id} car={car} onEdit={onEdit} onDelete={onDelete} canDelete={canDelete} onMapClick={onShowVehicleMap} />)}</tbody>
          </Table>
        </div>
      )}
    </div>
  );
}
