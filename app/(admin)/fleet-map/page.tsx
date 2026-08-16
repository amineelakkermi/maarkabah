"use client";

import { useState, useEffect, useRef } from "react";
import { CARS, Car } from "@/lib/data";
import { X } from "lucide-react";
import { Tabs, IconButton } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";
import { loadGoogleMapsScript, getGoogleMapsStyle, getCarLatLng, createCustomMarker } from "@/lib/maps";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

const mapCars = CARS.filter((c) => c.mapX > 0);

const STATUS_COLOR: Record<string, string> = {
  rented: "var(--color-mk-mint-600)",
  overdue: "var(--color-mk-danger)",
  maintenance: "var(--color-mk-warning)",
  inactive: "var(--color-mk-ink-400)",
  available: "var(--color-mk-mint-600)",
  reserved: "var(--color-mk-blue-500)",
};

interface LogEntry { time: string; msg: string; }

const ACT_STYLE: Record<string, { border: string; bg: string; text: string }> = {
  danger: { border: "border-mk-danger/35", bg: "bg-mk-danger/4", text: "text-mk-danger" },
  warning: { border: "border-mk-warning/35", bg: "bg-mk-warning/4", text: "text-mk-warning" },
  info: { border: "border-mk-blue-500/35", bg: "bg-mk-blue-500/4", text: "text-mk-blue-500" },
  success: { border: "border-mk-mint-600/35", bg: "bg-mk-mint-600/4", text: "text-mk-mint-600" },
  neutral: { border: "border-mk-ink-200", bg: "bg-transparent", text: "text-mk-ink-600" },
};

export default function FleetMapPage() {
  const { dir, isDark } = useAdmin();
  const ar = dir === "rtl";

  const FILTERS = [
    { key: "all", labelEn: "All", labelAr: "الكل" },
    { key: "rented", labelEn: "Active", labelAr: "نشطة" },
    { key: "overdue", labelEn: "Overdue", labelAr: "متأخرة" },
  ];

  const ACTIONS = [
    { key: "engine", icon: "🔴", labelOnEn: "Stop engine remotely", labelOnAr: "إيقاف المحرك عن بُعد", labelOffEn: "Start engine", labelOffAr: "تشغيل المحرك", style: "danger" },
    { key: "geofence", icon: "🛡️", labelEn: "Lock geofence", labelAr: "قفل النطاق الجغرافي", style: "warning" },
    { key: "notify", icon: "📳", labelEn: "Notify customer (SMS)", labelAr: "إشعار العميل (SMS)", style: "info" },
    { key: "track", icon: "📡", labelEn: "Continuous tracking", labelAr: "تتبع مستمر", style: "success" },
    { key: "wrench", icon: "🔧", labelEn: "Maintenance mode", labelAr: "وضع صيانة", style: "neutral" },
  ];

  const LEGEND = ar
    ? [["var(--color-mk-mint-600)", "نشطة"], ["var(--color-mk-danger)", "متأخر"], ["var(--color-mk-warning)", "تحذير"], ["var(--color-mk-ink-400)", "بدون GPS"]]
    : [["var(--color-mk-mint-600)", "Active"], ["var(--color-mk-danger)", "Overdue"], ["var(--color-mk-warning)", "Warning"], ["var(--color-mk-ink-400)", "No GPS"]];

  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Car | null>(null);
  const [engines, setEngines] = useState<Record<number, boolean>>(
    Object.fromEntries(mapCars.map((c) => [c.id, true]))
  );
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Google Maps State & Refs
  const [mapsLoaded, setMapsLoaded] = useState(false);
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

    // Centered at Riyadh Olaya/King Fahd road area
    const mapOptions = {
      center: { lat: 24.7136, lng: 46.6753 },
      zoom: 13,
      styles: getGoogleMapsStyle(isDark),
      disableDefaultUI: true,
      zoomControl: true,
    };

    const map = new (window as any).google.maps.Map(mapRef.current, mapOptions);
    mapInstanceRef.current = map;

    return () => {
      mapInstanceRef.current = null;
    };
  }, [mapsLoaded]);

  // Dynamically update Google Map theme style when isDark changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setOptions({ styles: getGoogleMapsStyle(isDark) });
    }
  }, [isDark, mapsLoaded]);

  // Pan to selected car dynamically
  useEffect(() => {
    if (!mapInstanceRef.current || !selected) return;
    const { lat, lng } = getCarLatLng(selected.mapX, selected.mapY);
    mapInstanceRef.current.panTo({ lat, lng });
  }, [selected]);

  const visible = filter === "all" ? mapCars : mapCars.filter((c) => c.status === filter);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach(m => m && m.setMap(null));
    markersRef.current = [];

    visible.forEach(car => {
      const { lat, lng } = getCarLatLng(car.mapX, car.mapY);
      const color = STATUS_COLOR[car.status] ?? "var(--color-mk-ink-400)";
      const isSelected = selected?.id === car.id;

      const marker = createCustomMarker(
        map,
        lat,
        lng,
        color,
        car.name.split(" ")[0],
        isSelected,
        () => {
          setSelected(car);
        }
      );
      if (marker) {
        markersRef.current.push(marker);
      }
    });

    return () => {
      markersRef.current.forEach(m => m && m.setMap(null));
      markersRef.current = [];
    };
  }, [mapsLoaded, visible, selected]);

  function addLog(msg: string) {
    const time = new Date().toLocaleTimeString(ar ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" });
    setLogs((prev) => [{ time, msg }, ...prev].slice(0, 6));
  }

  function handleAction(key: string) {
    if (!selected) return;
    if (key === "engine") {
      const next = !engines[selected.id];
      setEngines((p) => ({ ...p, [selected.id]: next }));
      addLog(ar
        ? `${next ? "🟢 تم تشغيل" : "🔴 تم إيقاف"} محرك ${selected.name}`
        : `${next ? "🟢 Started" : "🔴 Stopped"} engine — ${selected.name}`
      );
    } else {
      const labels: Record<string, string> = ar ? {
        geofence: `🛡️ تم قفل النطاق — ${selected.name}`,
        notify: `📳 تم إرسال SMS — ${selected.customer}`,
        track: `📡 تم تفعيل التتبع — ${selected.name}`,
        wrench: `🔧 وضع صيانة — ${selected.name}`,
      } : {
        geofence: `🛡️ Geofence locked — ${selected.name}`,
        notify: `📳 SMS sent — ${selected.customer}`,
        track: `📡 Tracking enabled — ${selected.name}`,
        wrench: `🔧 Maintenance mode — ${selected.name}`,
      };
      addLog(labels[key] ?? key);
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Map */}
      <div className="relative flex-1 overflow-hidden bg-[var(--color-mk-ink-50)]">
        {/* Google Map Container */}
        <div ref={mapRef} className="w-full h-full" />
        {!mapsLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-mk-ink-50)] text-mk-ink-500 mk-label">
            {T("Loading Google Maps...", "جاري تحميل خريطة جوجل...", ar)}
          </div>
        )}

        {/* Filters */}
        <Tabs
          variant="default"
          rounded="full"
          className="absolute top-3 start-3 z-10 shadow-sm"
          value={filter}
          onChange={setFilter}
          items={FILTERS.map((f) => ({ value: f.key, label: ar ? f.labelAr : f.labelEn }))}
        />

        {/* Hint */}
        {!selected && (
          <div className="absolute top-3 right-3 left-3 md:left-auto md:right-3 flex flex-col items-center gap-2 pointer-events-none z-10">
            <span className="mk-caption px-4 py-2 rounded-full bg-white/90 text-mk-ink-600 shadow-sm border border-mk-ink-100">
              {T("Click any car pin to view options", "اضغط على أي سيارة للتحكم فيها", ar)}
            </span>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-3 end-3 flex gap-3 mk-overline border border-mk-ink-200 px-3 py-2 rounded-sm bg-white/90 z-10 shadow-sm">
          {LEGEND.map(([c, l]) => (
            <span key={l} className="flex items-center gap-2 text-mk-ink-700">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: c }} />{l}
            </span>
          ))}
        </div>
      </div>

      {/* Control panel */}
      <div className="w-[280px] flex-shrink-0 flex flex-col overflow-y-auto border-s border-mk-border bg-mk-bg">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center text-mk-fg-3">
            <span className="mk-display opacity-20">🚗</span>
            <div className="mk-label">
              {T("Click a car to view\ncontrol options", "اضغط على سيارة\nلعرض خيارات التحكم", ar)}
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 p-4 relative bg-mk-bg-muted border-b border-mk-border">
              <div className="w-8 h-8 rounded-full bg-mk-border flex items-center justify-center text-mk-fg-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                  <circle cx="7" cy="17" r="2" />
                  <path d="M9 17h6" />
                  <circle cx="17" cy="17" r="2" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="mk-body text-mk-fg-1">{selected.name}</div>
                <div className="mk-overline text-mk-fg-3">{selected.plate}</div>
              </div>
              <span
                className="mk-overline px-2 py-1 rounded-full"
                style={{
                  background: `color-mix(in srgb, ${STATUS_COLOR[selected.status]} 20%, transparent)`,
                  color: STATUS_COLOR[selected.status],
                }}
              >
                {selected.status === "overdue"
                  ? T("Overdue", "متأخر", ar)
                  : selected.status === "rented"
                    ? T("Active", "نشطة", ar)
                    : T("Warning", "تحذير", ar)}
              </span>
              <IconButton size="sm" variant="ghost" onClick={() => setSelected(null)}>
                <X size={14} />
              </IconButton>
            </div>

            {/* Info */}
            <div className="px-4 py-3 mk-caption border-b border-mk-border">
              {[
                [T("Customer", "العميل", ar), selected.customer ?? "—"],
                [T("Return", "الإرجاع", ar), selected.returnTime ?? "—"],
                [T("Speed", "السرعة", ar), selected.speed != null ? `${selected.speed} ${T("km/h", "كم/س", ar)}` : T("N/A", "غير متاح", ar)],
                [T("Location", "الموقع", ar), selected.location ?? "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2 border-b border-mk-border">
                  <span className="text-mk-fg-3">{k}</span>
                  <span className="mk-label text-mk-fg-1">{v}</span>
                </div>
              ))}

              {/* Speed bar */}
              {selected.speed != null && (
                <div className="flex justify-between items-center py-2 border-b border-mk-border">
                  <span className="text-mk-fg-3">{T("Speed bar", "شريط السرعة", ar)}</span>
                  <div className="w-18 h-1.5 rounded-full overflow-hidden bg-mk-border">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(Math.round((selected.speed / 140) * 100), 100)}%`,
                        background: selected.speed > 120
                          ? "var(--color-mk-danger)"
                          : selected.speed > 80
                            ? "var(--color-mk-warning)"
                            : "var(--color-mk-mint-600)",
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center py-2">
                <span className="text-mk-fg-3">{T("Engine", "المحرك", ar)}</span>
                <span className="flex items-center gap-1 mk-label text-mk-fg-1">
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ background: engines[selected.id] ? "var(--color-mk-mint-600)" : "var(--color-mk-danger)" }}
                  />
                  {engines[selected.id] ? T("Running", "يعمل", ar) : T("Stopped", "متوقف", ar)}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="px-4 py-3 flex flex-col gap-2">
              <div className="mk-overline uppercase tracking-wider mb-1 text-mk-fg-3">
                {T("Car controls", "التحكم في السيارة", ar)}
              </div>
              {ACTIONS.map((a) => {
                const s = ACT_STYLE[a.style];
                let label: string;
                if (a.key === "engine") {
                  label = ar
                    ? (engines[selected.id] ? a.labelOnAr : a.labelOffAr) ?? ""
                    : (engines[selected.id] ? a.labelOnEn : a.labelOffEn) ?? "";
                } else {
                  label = ar ? (a.labelAr ?? "") : (a.labelEn ?? "");
                }
                return (
                  <button
                    key={a.key}
                    onClick={() => handleAction(a.key)}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-sm border mk-label transition-all text-start cursor-pointer hover:brightness-95 active:scale-98 ${s.bg} ${s.border} ${s.text}`}
                  >
                    <span className="text-lg">{a.icon}</span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Action log */}
            <div className="px-4 py-3 border-t border-mk-border flex-1">
              <div className="mk-overline uppercase tracking-wider mb-2 text-mk-fg-3">
                {T("Action log", "سجل الإجراءات", ar)}
              </div>
              {logs.length === 0 ? (
                <div className="mk-caption text-mk-fg-3">
                  {T("No activity yet", "لا يوجد نشاط حتى الآن", ar)}
                </div>
              ) : (
                logs.map((l, i) => (
                  <div key={i} className="mk-overline py-1 border-b border-mk-border text-mk-fg-2">
                    <span className="me-2 text-mk-fg-3">{l.time}</span>
                    {l.msg}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
