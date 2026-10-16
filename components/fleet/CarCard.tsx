"use client";

import { useRef, useState } from "react";
import { Car } from "@/lib/data";
import { ChevronLeft, ChevronRight, Edit, Gauge, MapPin, Trash2, Car as CarIcon, ArrowLeft, ArrowRight } from "lucide-react";
import { Badge, Button, IconButton, RiyalSymbol, Td, Tr } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { T, STATUS_BADGE_VARIANT, STATUS_TABS } from "@/lib/fleet";
import { FleetAlertBadgeList, effectiveCarStatus } from "@/components/employee/FleetAlertBadges";
import { CAR_TYPE_AR } from "@/components/shared/contracts/new-contract/mappers";

interface CarCardProps {
  car: Car;
  onEdit: (car: Car) => void;
  onDelete: (car: Car) => void;
  /** Vehicles.Delete — hide the trash action for viewers. Defaults to true. */
  canDelete?: boolean;
  onMapClick?: (car: Car) => void;
}

function statusLabel(car: Car, ar: boolean) {
  const status = STATUS_TABS.find((item) => item.key === effectiveCarStatus(car, ar));
  return status ? (ar ? status.labelAr : status.labelEn) : car.status;
}

export function CarImage({ car, compact = false }: { car: Car; compact?: boolean }) {
  const [index, setIndex] = useState(0);
  const dragStartX = useRef<number | null>(null);
  const images = car.imageUrls ?? [];

  if (!images.length) {
    return <div className="h-full flex items-center justify-center mk-car-thumb-bg"><CarIcon size={compact ? 20 : 28} className="text-mk-ink-300" /></div>;
  }

  const go = (d: 1 | -1) => setIndex((p) => (p + d + images.length) % images.length);

  return (
    <div
      className="relative h-full overflow-hidden cursor-grab select-none"
      onPointerDown={(e) => { dragStartX.current = e.clientX; }}
      onPointerCancel={() => { dragStartX.current = null; }}
      onPointerUp={(e) => {
        if (dragStartX.current == null) return;
        const dx = e.clientX - dragStartX.current;
        dragStartX.current = null;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
      }}
    >
      {images.map((src, i) => (
        <img
          key={i}
          src={src}
          alt={car.name}
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 pointer-events-none"
          style={{ opacity: i === index ? 1 : 0 }}
        />
      ))}
      {!compact && images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); go(-1); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-black/40 text-white flex items-center justify-center border-none cursor-pointer hover:bg-black/60 transition-colors"
          >
            <ChevronLeft size={13} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); go(1); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-black/40 text-white flex items-center justify-center border-none cursor-pointer hover:bg-black/60 transition-colors"
          >
            <ChevronRight size={13} />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-20">
            {images.map((_, imageIndex) => (
              <button
                key={imageIndex}
                type="button"
                aria-label={`Image ${imageIndex + 1}`}
                onClick={(event) => { event.stopPropagation(); setIndex(imageIndex); }}
                className="rounded-full border-0 p-0 transition-all"
                style={{ width: imageIndex === index ? 14 : 5, height: 5, background: imageIndex === index ? "white" : "rgba(255,255,255,.5)" }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function CarCard({ car, onEdit, onDelete, canDelete = true, onMapClick }: CarCardProps) {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const status = effectiveCarStatus(car, ar);
  const rentedOut = status === "rented" || status === "overdue";

  return (
    // Reuses .mk-vehicle-card (the contract screen's vehicle-picker card class)
    // with the --flat variant so list cards and picker cards can't drift apart.
    <div onClick={() => onEdit(car)} className="mk-vehicle-card mk-vehicle-card--flat group/card relative rounded-xl overflow-hidden cursor-pointer flex flex-col h-full">
      <div className="px-4 pt-4 min-h-[7rem]">
        <div className="flex items-start gap-2 mb-0">
          <div className="flex-1 min-w-0">
            <div className="mk-body font-semibold! text-mk-ink-900 truncate">{car.make} {car.model}</div>
            <div className="mk-caption text-mk-ink-500 mt-1">{car.plate} · {T(car.type, CAR_TYPE_AR[car.type] ?? car.type, ar)} · {car.year}</div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge variant={STATUS_BADGE_VARIANT[status]} dot>{statusLabel(car, ar)}</Badge>
            {rentedOut && car.returnTime && (
              <span className="mk-caption mt-1 text-mk-ink-500 shrink-0">{car.returnTime}</span>
            )}
          </div>
        </div>
        {/* Odometer & Allowed KM — same row as the contract screen's vehicle picker */}
        <div className="flex flex-wrap items-center gap-2 mk-caption text-mk-ink-500 mt-2">
          {typeof car.odometerReading === "number" && car.odometerReading > 0 && (
            <>
              <div className="flex items-center gap-1">
                <Gauge size={16} />
                <span>{car.odometerReading.toLocaleString()} {T("km", "كم", ar)}</span>
              </div>
              <div className="w-px h-3 bg-mk-ink-200" />
            </>
          )}
          <div>
            {car.kmCap === "Unlimited"
              ? T("Unlimited km", "كم غير محدود", ar)
              : `${car.kmCap} ${T("km/day", "كم/يوم", ar)}`}
          </div>
        </div>
      </div>

      <div className="relative h-[170px]">
        <CarImage car={car} />
        {/* Edit/delete stay reachable on hover — they sit above the open-file overlay. */}
        <div className="absolute top-2 end-2 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity z-20">
          <IconButton size="sm" variant="surface" aria-label={T("Edit", "تعديل", ar)} onClick={(event) => { event.stopPropagation(); onEdit(car); }}><Edit size={13} /></IconButton>
          {canDelete && <IconButton size="sm" variant="surface" aria-label={T("Delete", "حذف", ar)} onClick={(event) => { event.stopPropagation(); onDelete(car); }}><Trash2 size={13} className="text-mk-danger" /></IconButton>}
        </div>
      </div>

      {/* Alerts sit under the car, on the physical right edge in Arabic and English. */}
      <div className={`px-4 pt-3 flex empty:hidden ${ar ? "justify-start" : "justify-end"}`}>
        <FleetAlertBadgeList car={car} ar={ar} showEmpty={false} />
      </div>

      <div className="px-4 pb-4 pt-3 flex flex-col flex-1">
        <div className={`flex items-center justify-between gap-3 mt-auto ${ar ? "flex-row-reverse" : ""}`}>
          {/* Price is always on the physical left edge (flipped in RTL). */}
          <div className="flex items-center gap-1">
            <RiyalSymbol size={16} />
            <span className="mk-body font-semibold! text-mk-ink-900">{car.dailyRate}</span>
            <span className="mk-caption text-mk-ink-400">{T("per day", "لليوم", ar)}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1 mk-caption text-mk-ink-500"><Gauge size={16} /><span>{car.utilization}%</span></div>
            {onMapClick && (
              <IconButton
                size="sm"
                variant="ghost"
                aria-label={T("Show on map", "عرض على الخريطة", ar)}
                title={T("Show on map", "عرض على الخريطة", ar)}
                onClick={(e) => { e.stopPropagation(); onMapClick(car); }}
              >
                <MapPin size={14} />
              </IconButton>
            )}
          </div>
        </div>
      </div>

      {/* Hover overlay over the whole card (same as the contract screen's vehicle picker): a soft dim fades in and the button rises into the centre. */}
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 opacity-0 pointer-events-none transition-opacity duration-300 ease-out group-hover/card:opacity-100 group-hover/card:pointer-events-auto">
        <Button
          variant="outline"
          size="sm"
          dir={ar ? "rtl" : "ltr"}
          className="group justify-center !bg-white !text-[#0F1430] !border-white hover:!bg-mk-blue-500 hover:!text-white hover:!border-mk-blue-500 transition-[translate,background,color,border-color,scale]! duration-300! ease-out! translate-y-3 group-hover/card:translate-y-0"
          onClick={(e) => { e.stopPropagation(); onEdit(car); }}
        >
          <span>{T("Vehicle file", "ملف المركبة", ar)}</span>
          {ar ? (
            <ArrowLeft size={14} className="shrink-0 transition-transform duration-500 ease-out group-hover:-translate-x-1" />
          ) : (
            <ArrowRight size={14} className="shrink-0 transition-transform duration-500 ease-out group-hover:translate-x-1" />
          )}
        </Button>
      </div>
    </div>
  );
}

export function CarListRow({ car, onEdit, onDelete, canDelete = true, onMapClick }: CarCardProps) {
  const { dir } = useAdmin();
  const ar = dir === "rtl";
  const status = effectiveCarStatus(car, ar);
  const rentedOut = status === "rented" || status === "overdue";

  return (
    <Tr role="button" tabIndex={0} onClick={() => onEdit(car)} onKeyDown={(event) => { if (event.key === "Enter") onEdit(car); }} className="cursor-pointer transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-mk-ink-50">
      <Td><div className="flex items-center gap-3"><div className="w-16 h-12 rounded-sm overflow-hidden shrink-0 mk-car-thumb-bg-sm"><CarImage car={car} compact /></div><div className="min-w-0"><div className="mk-body text-mk-ink-900 truncate">{car.make} {car.model}</div><div className="mk-overline text-mk-ink-500 truncate">{car.plate} · {T(car.type, CAR_TYPE_AR[car.type] ?? car.type, ar)} · {car.year}</div></div></div></Td>
      <Td><div className="flex items-center gap-1"><RiyalSymbol size={16} /><span className="mk-body text-mk-ink-900">{car.dailyRate}</span></div><span className="mk-overline text-mk-ink-400">{T("/day", "/يوم", ar)}</span></Td>
      <Td><span className="mk-caption text-mk-ink-900">{car.utilization}%</span><div className="w-12 h-1 rounded-full bg-mk-ink-100 mt-1 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(car.utilization, 100)}%`, background: car.utilization > 80 ? "var(--color-mk-mint-600)" : "var(--color-mk-blue-500)" }} /></div></Td>
      <Td onClick={(event) => event.stopPropagation()}>{onMapClick && <Button variant="outline" size="sm" className="rounded-full whitespace-nowrap" onClick={() => onMapClick(car)}><MapPin size={12} className="text-mk-blue-500" />{T("Show on map", "عرض على الخريطة", ar)}</Button>}</Td>
      <Td>
        <div className="flex flex-col items-start gap-1">
          <Badge variant={STATUS_BADGE_VARIANT[status]} dot>{statusLabel(car, ar)}</Badge>
          {rentedOut && car.returnTime && (
            <span className="mk-overline mt-1 text-mk-ink-500 shrink-0">{car.returnTime}</span>
          )}
        </div>
      </Td>
      <Td><FleetAlertBadgeList car={car} ar={ar} showEmpty={false} /></Td>
      <Td onClick={(event) => event.stopPropagation()}><div className="flex justify-end gap-1"><IconButton size="sm" variant="ghost" aria-label={T("Edit", "تعديل", ar)} onClick={() => onEdit(car)}><Edit size={14} /></IconButton>{canDelete && <IconButton size="sm" variant="ghost" aria-label={T("Delete", "حذف", ar)} onClick={() => onDelete(car)}><Trash2 size={14} className="text-mk-danger" /></IconButton>}<ChevronRight size={16} className="text-mk-ink-300 self-center" /></div></Td>
    </Tr>
  );
}
