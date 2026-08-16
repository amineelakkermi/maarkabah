"use client";

import { useState } from "react";
import { Car, CAR_STATUS_LABEL } from "@/lib/data";
import { MapPin, Wrench, Edit, Trash2 } from "lucide-react";
import { Badge, Button, RiyalSymbol } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { VehicleTypeIcon } from "@/components/employee/VehicleTypeIcon";
import { T, STATUS_BADGE_VARIANT, TYPE_ICON } from "@/lib/fleet";

interface CarCardProps {
  car: Car;
  onEdit: (car: Car) => void;
  onDelete: (car: Car) => void;
}

export function CarCard({ car, onEdit, onDelete }: CarCardProps) {
  const { dir } = useAdmin();
  const ar = dir === "rtl";

  const typeIcon = TYPE_ICON[car.type] ?? "🚗";

  const images = car.imageUrls?.length ? car.imageUrls : [];
  const [index, setIndex] = useState(0);
  const [startX, setStartX] = useState<number | null>(null);
  const [isDragging, setDragging] = useState(false);

  const handleStart = (x: number) => {
    setStartX(x);
    setDragging(true);
  };

  const handleMove = (x: number) => {
    if (!isDragging || startX === null || images.length <= 1) return;
    const diff = startX - x;
    if (diff > 45) {
      setIndex((p) => (p + 1) % images.length);
      setDragging(false);
      setStartX(null);
    } else if (diff < -45) {
      setIndex((p) => (p - 1 + images.length) % images.length);
      setDragging(false);
      setStartX(null);
    }
  };

  const handleEnd = () => {
    setDragging(false);
    setStartX(null);
  };

  const speedColor =
    car.speed != null
      ? car.speed > 120
        ? "var(--color-mk-danger)"
        : car.speed > 80
          ? "var(--color-mk-warning)"
          : "var(--color-mk-mint-600)"
      : undefined;

  return (
    <div
      className="rounded-md border border-mk-ink-100 flex flex-col overflow-hidden transition-shadow hover:shadow-md bg-white cursor-pointer"
      onClick={() => onEdit(car)}
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-mk-ink-100">
        <div className="flex items-center gap-2">
          <VehicleTypeIcon type={car.type} size={18} className="w-9 h-9" />
          <div>
            <div className="mk-label text-mk-ink-900">{car.name}</div>
            <div className="font-mono mk-overline text-mk-ink-400">{car.plate}</div>
          </div>
        </div>
        <Badge variant={STATUS_BADGE_VARIANT[car.status]} dot>
          {CAR_STATUS_LABEL[car.status]}
        </Badge>
      </div>

      {/* Swipeable carousel */}
      <div
        className="relative w-full overflow-hidden select-none group cursor-grab active:cursor-grabbing"
        style={{
          height: 192,
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--color-mk-blue-500) 6%, transparent), color-mix(in srgb, var(--color-mk-violet-500) 6%, transparent)), var(--color-mk-ink-50)",
        }}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
        onMouseDown={(e) => handleStart(e.clientX)}
        onMouseMove={(e) => {
          if (isDragging) {
            e.preventDefault();
            handleMove(e.clientX);
          }
        }}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
      >
        {images.length > 0 ? (
          images.map((imgUrl, i) => {
            const isFlipped = imgUrl.endsWith("#flipped");
            const src = isFlipped ? imgUrl.replace("#flipped", "") : imgUrl;
            return (
              <img
                key={i}
                src={src}
                alt="Car"
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 pointer-events-none"
                style={{
                  opacity: i === index ? 1 : 0,
                  transform: isFlipped ? "scaleX(-1)" : "none",
                  zIndex: i === index ? 10 : 0,
                }}
              />
            );
          })
        ) : (
          <div className="w-full h-full flex items-center justify-center mk-overline text-mk-ink-400">
            No Photo
          </div>
        )}

        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {images.map((_, idx) => (
              <div
                key={idx}
                className={`w-1.5 h-1.5 rounded-full ${idx === index ? "bg-white" : "bg-white/40"}`}
              />
            ))}
          </div>
        )}

        {images.length > 0 && (
          <span className="absolute bottom-2 start-2 mk-overline px-2 py-1 rounded-xs text-white bg-black/60 z-10">
            {[T("Front", "أمامي", ar), T("Right Side", "جانبي يمين", ar), T("Left Side", "جانبي يسار", ar), T("Back", "خلفي", ar)][index]}
          </span>
        )}
      </div>

      {/* Details */}
      <div className="px-4 py-3 flex flex-col gap-2 flex-1 mk-caption">
        <div className="flex justify-between">
          <span className="text-mk-ink-400">{T("Type", "النوع", ar)}</span>
          <span className="text-mk-ink-700">
            {typeIcon} {car.type} · {car.year}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-mk-ink-400">{T("Color", "اللون", ar)}</span>
          <span className="text-mk-ink-700">{car.color}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-mk-ink-400">{T("Daily rate", "السعر اليومي", ar)}</span>
          <span className="mk-label text-mk-ink-900 flex items-center gap-1">
            <RiyalSymbol size={12} className="text-mk-ink-900" />
            <span>{car.dailyRate}</span>
          </span>
        </div>
        {car.customer && (
          <div className="flex justify-between">
            <span className="text-mk-ink-400">{T("Customer", "العميل", ar)}</span>
            <span className="mk-label text-mk-ink-900">{car.customer}</span>
          </div>
        )}
        {car.returnTime && (
          <div className="flex justify-between">
            <span className="text-mk-ink-400">{T("Return", "الإرجاع", ar)}</span>
            <span className={`mk-label ${car.status === "overdue" ? "text-mk-danger" : "text-mk-ink-900"}`}>
              ⏰ {car.returnTime}
            </span>
          </div>
        )}
        {car.speed != null && (
          <div className="flex items-center justify-between">
            <span className="text-mk-ink-400">{T("Speed", "السرعة", ar)}</span>
            <div className="flex items-center gap-2">
              <div className="w-13 h-1 rounded-full overflow-hidden bg-mk-ink-100">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(Math.round((car.speed / 140) * 100), 100)}%`,
                    background: speedColor,
                  }}
                />
              </div>
              <span className="text-mk-ink-700">
                {car.speed} {T("km/h", "كم/س", ar)}
              </span>
            </div>
          </div>
        )}
        {car.location && (
          <div className="flex items-center justify-between">
            <span className="text-mk-ink-400">{T("Location", "الموقع", ar)}</span>
            <span className="flex items-center gap-1 text-mk-ink-700">
              <MapPin size={11} />
              {car.location}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-4 py-3 border-t border-mk-ink-100" onClick={(e) => e.stopPropagation()}>
        {car.status === "available" ? (
          <Button variant="primary" size="sm" className="flex-1 justify-center">
            {T("Quick book", "حجز سريع", ar)}
          </Button>
        ) : car.status === "overdue" ? (
          <Button variant="danger" size="sm" className="flex-1 justify-center">
            {T("Notify customer", "إشعار عميل", ar)}
          </Button>
        ) : car.status === "maintenance" ? (
          <Button variant="outline" size="sm" className="flex-1 justify-center text-mk-warning border-mk-warning/30 hover:bg-mk-warning/8">
            {T("Update status", "تحديث الحالة", ar)}
          </Button>
        ) : (
          <Button variant="secondary" size="sm" className="flex-1 justify-center" onClick={() => onEdit(car)}>
            {T("View details", "عرض التفاصيل", ar)}
          </Button>
        )}
        <Button variant="outline" size="sm" title={T("Maintenance", "صيانة", ar)}>
          <Wrench size={13} className="text-mk-ink-400" />
        </Button>
        <Button variant="outline" size="sm" title={T("Edit", "تعديل", ar)} onClick={() => onEdit(car)}>
          <Edit size={13} className="text-mk-ink-400" />
        </Button>
        <Button variant="outline" size="sm" title={T("Delete", "حذف", ar)} onClick={() => onDelete(car)}>
          <Trash2 size={13} className="text-mk-danger" />
        </Button>
      </div>
    </div>
  );
}
