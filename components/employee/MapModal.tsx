"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { loadGoogleMapsScript, getGoogleMapsStyle, getCarLatLng, createCustomMarker, getAvailabilityText } from "@/lib/maps";
import { useAdmin } from "@/contexts/AdminContext";
import { CARS, Car as CarType } from "@/lib/data";
import { Modal, IconButton } from "@/components/ui";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

const STATUS_MAP: Record<string, { labelEn: string; labelAr: string }> = {
  available:   { labelEn: "Available",   labelAr: "متاح"        },
  rented:      { labelEn: "Rented",      labelAr: "مؤجر"        },
  overdue:     { labelEn: "Overdue",     labelAr: "متأخر"       },
  maintenance: { labelEn: "Maintenance", labelAr: "تحت الصيانة" },
};

const CAT_AR: Record<string, string> = {
  Sedan: "سيدان", SUV: "دفع رباعي", Luxury: "فاخرة", Economy: "اقتصادية",
};

export function MapModal({ ar, car, showAll, onClose }: { ar: boolean; car?: CarType | null; showAll?: boolean; onClose: () => void }) {
  const { isDark } = useAdmin();
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [selectedMarkerCar, setSelectedMarkerCar] = useState<CarType | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    loadGoogleMapsScript()
      .then(() => setMapsLoaded(true))
      .catch(err => console.error("Error loading Google Maps SDK:", err));
  }, []);

  useEffect(() => {
    if (!mapsLoaded || !mapRef.current) return;

    // Centered at Riyadh Olaya or the target car's location
    const targetLatLng = car && car.mapX > 0 ? getCarLatLng(car.mapX, car.mapY) : { lat: 24.7136, lng: 46.6753 };

    const mapOptions = {
      center: targetLatLng,
      zoom: car && !showAll ? 14 : 13,
      styles: getGoogleMapsStyle(isDark),
      disableDefaultUI: true,
      zoomControl: true,
    };

    const map = new (window as any).google.maps.Map(mapRef.current, mapOptions);
    mapInstanceRef.current = map;

    // Click map canvas to clear selection
    map.addListener("click", () => {
      setSelectedMarkerCar(null);
    });

    // Clear old markers
    markersRef.current.forEach(m => m && m.setMap(null));
    markersRef.current = [];

    if (car && !showAll) {
      if (car.mapX > 0) {
        // Create the single target marker
        const marker = createCustomMarker(
          map,
          targetLatLng.lat,
          targetLatLng.lng,
          "var(--color-mk-danger)", // theme color for target / warning
          car.name.split(" ")[0],
          true,
          () => {}
        );
        if (marker) markersRef.current.push(marker);
      }
    } else {
      // Show all active fleet vehicles on the map
      const mapCars = CARS.filter(c => c.mapX > 0);
      mapCars.forEach(c => {
        const { lat, lng } = getCarLatLng(c.mapX, c.mapY);
        const color = c.status === "available" ? "var(--color-mk-mint-600)" : c.status === "overdue" ? "var(--color-mk-danger)" : "var(--color-mk-blue-500)";
        const marker = createCustomMarker(
          map,
          lat,
          lng,
          color,
          c.name.split(" ")[0],
          false,
          () => {
            setSelectedMarkerCar(c);
          }
        );
        if (marker) markersRef.current.push(marker);
      });
    }

    return () => {
      markersRef.current.forEach(m => m && m.setMap(null));
      markersRef.current = [];
      mapInstanceRef.current = null;
    };
  }, [mapsLoaded, car, showAll]);

  // Dynamically update Google Map theme style when isDark changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setOptions({ styles: getGoogleMapsStyle(isDark) });
    }
  }, [isDark, mapsLoaded]);

  // Determine headers
  const titleText = showAll 
    ? T("Garage Fleet Map", "خريطة أسطول الكراج", ar)
    : T("Vehicle Location Map", "خريطة موقع المركبة", ar);
    
  const subtitleText = showAll
    ? `${CARS.length} ${T("vehicles in garage", "مركبة في الكراج", ar)}`
    : car ? `${car.make} ${car.model} · ${car.plate}` : "";

  const titleNode = (
    <div>
      <div>{titleText}</div>
      {subtitleText && <div className="mk-caption text-mk-fg-3 mt-1 font-normal">{subtitleText}</div>}
    </div>
  );

  return (
    <Modal open={true} onClose={onClose} title={titleNode}>

      {/* Map Body */}
      <div className="flex-1 relative overflow-hidden bg-mk-bg-muted">
        {showAll || (car && car.mapX > 0) ? (
          <>
            <div ref={mapRef} className="w-full h-full" />
            {!mapsLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-mk-bg-muted text-mk-fg-3 mk-body-sm">
                {T("Loading Google Maps...", "جاري تحميل خريطة جوجل...", ar)}
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-mk-bg-muted">
            <div className="bg-mk-bg border border-mk-border rounded-2xl p-8 shadow-sm text-center max-w-sm">
              <span className="mk-display">📍</span>
              <div className="mk-body text-mk-fg-1 mt-3">{T("GPS signal unavailable", "إشارة GPS غير متوفرة", ar)}</div>
              <div className="mk-label text-mk-fg-3 mt-2">{T("No live coordinates for this vehicle", "لا إحداثيات حية لهذه المركبة", ar)}</div>
            </div>
          </div>
        )}

        {/* Selected Car details overlay card */}
        {showAll && selectedMarkerCar && (
          <div className="absolute bottom-6 start-6 end-6 lg:start-auto lg:end-6 lg:w-[360px] z-[210] rounded-lg bg-mk-bg border border-mk-border shadow-lg p-5 flex flex-col gap-4 transition-all duration-200">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="mk-body text-mk-fg-1">{selectedMarkerCar.make} {selectedMarkerCar.model}</div>
                <div className="mk-caption text-mk-fg-3 mt-1">{selectedMarkerCar.plate} · {T(selectedMarkerCar.type, CAT_AR[selectedMarkerCar.type] ?? selectedMarkerCar.type, ar)} · {selectedMarkerCar.year}</div>
              </div>
              <IconButton size="sm" className="bg-mk-border hover:bg-mk-border-strong text-mk-fg-1" onClick={() => setSelectedMarkerCar(null)}>
                <X size={14} />
              </IconButton>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-3 gap-3 bg-mk-bg-muted p-4 rounded-xl border border-mk-border">
              {[
                { label: T("Odometer", "العداد", ar), value: `${(12450 + selectedMarkerCar.id * 3150).toLocaleString()} km` },
                { label: T("Daily Rate", "السعر اليومي", ar), value: `${selectedMarkerCar.dailyRate} ${T("SAR", "ر.س", ar)}` },
                { label: T("Utilization", "الاستخدام", ar), value: `${selectedMarkerCar.utilization}%` },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-1">
                  <span className="mk-overline text-mk-fg-3 uppercase">{label}</span>
                  <span className="mk-caption text-mk-fg-1">{value}</span>
                </div>
              ))}
            </div>

            {/* Rental details if active */}
            {(selectedMarkerCar.status === "rented" || selectedMarkerCar.status === "overdue") && (
              <div className="flex flex-col gap-2 p-3 bg-mk-bg-muted rounded-xl border border-mk-border mk-caption">
                <div className="flex justify-between">
                  <span className="text-mk-fg-3">{T("Tenant:", "المستأجر:", ar)}</span>
                  <span className="mk-label text-mk-fg-1">{selectedMarkerCar.customer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-mk-fg-3">{T("Return scheduled:", "موعد الإرجاع:", ar)}</span>
                  <span className="mk-label text-mk-fg-1">{selectedMarkerCar.returnTime}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-mk-fg-3">{T("Contract status:", "حالة العقد:", ar)}</span>
                  <span className="mk-caption text-mk-fg-3 shrink-0">
                    {getAvailabilityText(selectedMarkerCar.status, selectedMarkerCar.id, ar)}
                  </span>
                </div>
              </div>
            )}

            {/* Status and Location */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  selectedMarkerCar.status === "available" ? "bg-mk-mint-600" : selectedMarkerCar.status === "overdue" ? "bg-mk-danger" : "bg-mk-blue-500"
                }`} />
                <span className="mk-label text-mk-fg-2">
                  {T(STATUS_MAP[selectedMarkerCar.status]?.labelEn || selectedMarkerCar.status, STATUS_MAP[selectedMarkerCar.status]?.labelAr || selectedMarkerCar.status, ar)}
                </span>
              </span>
              <span className="mk-caption text-mk-fg-3 flex items-center gap-1">
                📍 {selectedMarkerCar.location || T("Riyadh", "الرياض", ar)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {!showAll && car && (
        <div className="px-6 py-4 bg-mk-bg-muted border-t border-mk-border flex items-center justify-between shrink-0">
          <span className="mk-label text-mk-fg-2">
            {T("Location: ", "الموقع: ", ar)}
            <strong className="text-mk-fg-1">{car.location || T("Unknown", "غير معروف", ar)}</strong>
          </span>
          {car.speed != null && (
            <span className="mk-label text-mk-fg-2">
              {T("Speed: ", "السرعة: ", ar)}
              <strong className="text-mk-fg-1">{car.speed} {T("km/h", "كم/س", ar)}</strong>
            </span>
          )}
        </div>
      )}
      
      {showAll && (
        <div className="px-6 py-4 bg-mk-bg-muted border-t border-mk-border flex items-center gap-6 shrink-0 mk-label text-mk-fg-2">
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-mk-mint-600" />
            {T("Available", "متاح", ar)}
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-mk-blue-500" />
            {T("Rented", "مؤجر", ar)}
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-mk-danger" />
            {T("Overdue", "متأخر", ar)}
          </span>
        </div>
      )}
    </Modal>
  );
}
