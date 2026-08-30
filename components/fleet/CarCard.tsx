"use client";

import { useState } from "react";
import { Car } from "@/lib/data";
import { ChevronRight, Edit, Gauge, MapPin, Trash2, Car as CarIcon } from "lucide-react";
import { Badge, Button, IconButton, RiyalSymbol, Td, Tr } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { T, STATUS_BADGE_VARIANT, STATUS_TABS } from "@/lib/fleet";

interface CarCardProps {
  car: Car;
  onEdit: (car: Car) => void;
  onDelete: (car: Car) => void;
  onMapClick?: (car: Car) => void;
}

function statusLabel(car: Car, ar: boolean) {
  const status = STATUS_TABS.find((item) => item.key === car.status);
  return status ? (ar ? status.labelAr : status.labelEn) : car.status;
}

export function CarImage({ car, compact = false }: { car: Car; compact?: boolean }) {
  const [index, setIndex] = useState(0);
  const images = car.imageUrls ?? [];

  if (!images.length) {
    return <div className="h-full flex items-center justify-center mk-car-thumb-bg"><CarIcon size={compact ? 20 : 28} className="text-mk-ink-300" /></div>;
  }

  return (
    <div className="relative h-full overflow-hidden">
      <img src={images[index]} alt={car.name} className="w-full h-full object-cover" />
      {!compact && images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
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
      )}
    </div>
  );
}

export function CarCard({ car, onEdit, onDelete }: CarCardProps) {
  const { dir } = useAdmin();
  const ar = dir === "rtl";

  return (
    <div onClick={() => onEdit(car)} className="rounded-lg overflow-hidden mk-surface cursor-pointer transition-colors duration-200 hover:bg-mk-ink-50 mk-shadow-10 group">
      <div className="h-[170px] mk-car-thumb-bg relative">
        <CarImage car={car} />
        <div className="absolute top-2 end-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <IconButton size="sm" variant="surface" aria-label={T("Edit", "تعديل", ar)} onClick={(event) => { event.stopPropagation(); onEdit(car); }}><Edit size={13} /></IconButton>
          <IconButton size="sm" variant="surface" aria-label={T("Delete", "حذف", ar)} onClick={(event) => { event.stopPropagation(); onDelete(car); }}><Trash2 size={13} className="text-mk-danger" /></IconButton>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="mk-body text-mk-ink-900 truncate">{car.make} {car.model}</div>
            <div className="mk-overline text-mk-ink-500 mt-1 truncate">{car.plate} · {car.type} · {car.year}</div>
          </div>
          <Badge variant={STATUS_BADGE_VARIANT[car.status]} dot>{statusLabel(car, ar)}</Badge>
        </div>
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-mk-ink-100">
          <div className="flex items-center gap-1"><RiyalSymbol size={16} /><span className="mk-body text-mk-ink-900">{car.dailyRate}</span><span className="mk-caption text-mk-ink-400">{T("/d", "/يوم", ar)}</span></div>
          <div className="w-px h-3 bg-mk-ink-200" />
          <div className="flex items-center gap-1 mk-caption text-mk-ink-500"><Gauge size={11} className="text-mk-violet-500" /><span>{car.utilization}%</span></div>
        </div>
      </div>
    </div>
  );
}

export function CarListRow({ car, onEdit, onDelete, onMapClick }: CarCardProps) {
  const { dir } = useAdmin();
  const ar = dir === "rtl";

  return (
    <Tr role="button" tabIndex={0} onClick={() => onEdit(car)} onKeyDown={(event) => { if (event.key === "Enter") onEdit(car); }} className="cursor-pointer hover:bg-mk-ink-50">
      <Td><div className="flex items-center gap-3"><div className="w-16 h-12 rounded-sm overflow-hidden shrink-0 mk-car-thumb-bg-sm"><CarImage car={car} compact /></div><div className="min-w-0"><div className="mk-body text-mk-ink-900 truncate">{car.make} {car.model}</div><div className="mk-overline text-mk-ink-500 truncate">{car.plate} · {car.type} · {car.year}</div></div></div></Td>
      <Td><div className="flex items-center gap-1"><RiyalSymbol size={16} /><span className="mk-body text-mk-ink-900">{car.dailyRate}</span></div><span className="mk-overline text-mk-ink-400">{T("/day", "/يوم", ar)}</span></Td>
      <Td><span className="mk-caption text-mk-ink-900">{car.utilization}%</span><div className="w-12 h-1 rounded-full bg-mk-ink-100 mt-1 overflow-hidden"><div className="h-full rounded-full bg-mk-blue-500" style={{ width: `${Math.min(car.utilization, 100)}%` }} /></div></Td>
      <Td onClick={(event) => event.stopPropagation()}>{onMapClick && <Button variant="outline" size="sm" className="rounded-full whitespace-nowrap" onClick={() => onMapClick(car)}><MapPin size={12} className="text-mk-blue-500" />{T("Show on map", "عرض على الخريطة", ar)}</Button>}</Td>
      <Td><Badge variant={STATUS_BADGE_VARIANT[car.status]} dot>{statusLabel(car, ar)}</Badge></Td>
      <Td onClick={(event) => event.stopPropagation()}><div className="flex justify-end gap-1"><IconButton size="sm" variant="ghost" aria-label={T("Edit", "تعديل", ar)} onClick={() => onEdit(car)}><Edit size={14} /></IconButton><IconButton size="sm" variant="ghost" aria-label={T("Delete", "حذف", ar)} onClick={() => onDelete(car)}><Trash2 size={14} className="text-mk-danger" /></IconButton><ChevronRight size={16} className="text-mk-ink-300 self-center" /></div></Td>
    </Tr>
  );
}
