"use client";

import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { useAdmin } from "@/contexts/AdminContext";
import { CARS, type Booking } from "@/lib/data";
import { loadGoogleMapsScript, getGoogleMapsStyle, getCarLatLng, createCustomMarker } from "@/lib/maps";
import { IconButton, Modal } from "@/components/ui";

const T = (en: string, ar: string, isAr: boolean) => (isAr ? ar : en);

const MAP_ACTIONS = [
  { key: "engine", icon: "🔴", labelEn: "Stop engine remotely", labelAr: "إيقاف المحرك عن بُعد", style: "danger" },
  { key: "geofence", icon: "🛡️", labelEn: "Lock geofence", labelAr: "قفل النطاق الجغرافي", style: "warning" },
  { key: "notify", icon: "📳", labelEn: "Notify customer (SMS)", labelAr: "إشعار العميل (SMS)", style: "info" },
  { key: "track", icon: "📡", labelEn: "Continuous tracking", labelAr: "تتبع مستمر", style: "success" },
] as const;

const ACT_STYLE: Record<string, { border: string; bg: string; color: string }> = {
  danger: { border: "1px solid rgba(226,65,113,0.35)", bg: "rgba(226,65,113,0.04)", color: "var(--color-mk-danger)" },
  warning: { border: "1px solid rgba(226,163,65,0.35)", bg: "rgba(226,163,65,0.04)", color: "var(--color-mk-warning-700)" },
  info: { border: "1px solid rgba(65,113,226,0.35)", bg: "rgba(65,113,226,0.04)", color: "var(--color-mk-blue-500)" },
  success: { border: "1px solid rgba(63,182,172,0.35)", bg: "rgba(63,182,172,0.04)", color: "var(--color-mk-mint-600)" },
};

// ── Vehicle Map Panel — split map/control-panel view, shared across the pickup, return, and contract-detail screens ──
export function VehicleMapPanel({ ar, contract, onClose }: { ar: boolean; contract: Booking; onClose: () => void }) {
  const { isDark } = useAdmin();
  const carObj = CARS.find(c => c.plate === contract.plate) || null;
  const [logs, setLogs] = useState<string[]>([]);
  const [engineOn, setEngineOn] = useState(true);

  const [mapsLoaded, setMapsLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    loadGoogleMapsScript()
      .then(() => setMapsLoaded(true))
      .catch(err => console.error("Error loading Google Maps SDK:", err));
  }, []);

  useEffect(() => {
    if (!mapsLoaded || !mapRef.current) return;

    const targetLatLng = carObj ? getCarLatLng(carObj.mapX, carObj.mapY) : { lat: 24.7136, lng: 46.6753 };

    const mapOptions = {
      center: targetLatLng,
      zoom: 13,
      styles: getGoogleMapsStyle(isDark),
      disableDefaultUI: true,
      zoomControl: true,
    };

    const map = new (window as any).google.maps.Map(mapRef.current, mapOptions);
    mapInstanceRef.current = map;

    if (carObj) {
      markerRef.current = createCustomMarker(map, targetLatLng.lat, targetLatLng.lng, "var(--color-mk-blue-500)", carObj.name.split(" ")[0], true, () => { });
    }

    return () => {
      if (markerRef.current) { markerRef.current.setMap(null); markerRef.current = null; }
      mapInstanceRef.current = null;
    };
  }, [mapsLoaded]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setOptions({ styles: getGoogleMapsStyle(isDark) });
    }
  }, [isDark, mapsLoaded]);

  function doAction(key: string) {
    if (!carObj) return;
    const now = new Date().toLocaleTimeString(ar ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" });
    const msgs: Record<string, string> = ar ? {
      engine: engineOn ? `🔴 تم إيقاف محرك ${carObj.name}` : `🟢 تم تشغيل محرك ${carObj.name}`,
      geofence: `🛡️ تم قفل النطاق — ${carObj.name}`,
      notify: `📳 تم إرسال SMS — ${contract.customer}`,
      track: `📡 تم تفعيل التتبع — ${carObj.name}`,
    } : {
      engine: engineOn ? `🔴 Engine stopped — ${carObj.name}` : `🟢 Engine started — ${carObj.name}`,
      geofence: `🛡️ Geofence locked — ${carObj.name}`,
      notify: `📳 SMS sent — ${contract.customer}`,
      track: `📡 Tracking enabled — ${carObj.name}`,
    };
    if (key === "engine") setEngineOn(p => !p);
    setLogs(p => [`${now}  ${msgs[key]}`, ...p].slice(0, 5));
  }

  const titleNode = carObj ? (
    <div className="flex items-center gap-3">
      <span>{carObj.name}</span>
      <span className="mk-caption text-mk-fg-3 font-mono">({carObj.plate})</span>
    </div>
  ) : T("Vehicle Location & Tracking", "موقع وتتبع المركبة", ar);

  return (
    <Modal open={true} onClose={onClose} title={titleNode}>
      <div className="w-full h-full flex flex-row bg-mk-bg">
        {/* ── MAP side ── */}
        <div className="relative flex-1 overflow-hidden bg-mk-bg-muted">
          <div ref={mapRef} className="w-full h-full" />
          {!mapsLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-mk-bg-muted text-mk-fg-3 mk-body-sm">
              {T("Loading Google Maps...", "جاري تحميل خريطة جوجل...", ar)}
            </div>
          )}



          {/* Legend */}
          <div className="absolute bottom-5 end-5 z-30 flex gap-4 mk-overline border border-mk-border px-4 py-2 rounded-md bg-mk-bg-elevated shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
            {[
              ["var(--color-mk-mint-600)", T("Active", "نشطة", ar)],
              ["var(--color-mk-danger)", T("Overdue", "متأخر", ar)],
              ["var(--color-mk-blue-500)", T("Selected", "محدد", ar)],
            ].map(([c, l]) => (
              <span key={l} className="flex items-center gap-2 text-mk-fg-2">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: c }} />
                {l}
              </span>
            ))}
          </div>
        </div>

        {/* ── CONTROL PANEL side ── */}
        <div className="w-80 shrink-0 flex flex-col overflow-y-auto border-s border-mk-border bg-mk-bg-elevated">
          {carObj ? (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 p-4 bg-mk-bg-muted border-b border-mk-border">
                <div className="w-8 h-8 rounded-full bg-mk-border flex items-center justify-center mk-body text-mk-fg-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                    <circle cx="7" cy="17" r="2" />
                    <path d="M9 17h6" />
                    <circle cx="17" cy="17" r="2" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-mk-fg-1 mk-h4">{carObj.name}</div>
                  <div className="text-mk-fg-3 mk-overline font-mono">{carObj.plate}</div>
                </div>
                <span className="mk-overline px-2 py-1 rounded-full" style={{ background: "rgba(65,113,226,0.12)", color: "var(--color-mk-blue-500)" }}>
                  {T("Active", "نشطة", ar)}
                </span>
              </div>

              {/* Info rows */}
              <div className="px-4 pt-2 pb-3 mk-caption border-b border-mk-border">
                {[
                  [T("Customer", "العميل", ar), contract.customer],
                  [T("Return", "الإرجاع", ar), contract.dropoff ?? "—"],
                  [T("Speed", "السرعة", ar), carObj.speed != null ? `${carObj.speed} ${T("km/h", "كم/س", ar)}` : T("N/A", "غير متاح", ar)],
                  [T("Location", "الموقع", ar), carObj.location ?? "—"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2 border-b border-mk-border">
                    <span className="text-mk-fg-3">{k}</span>
                    <span className="mk-label text-mk-fg-1">{v}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center py-2">
                  <span className="text-mk-fg-3 mk-caption">{T("Engine", "المحرك", ar)}</span>
                  <span className="flex items-center gap-2 text-mk-fg-1 mk-caption">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: engineOn ? "var(--color-mk-mint-600)" : "var(--color-mk-danger)" }} />
                    {engineOn ? T("Running", "يعمل", ar) : T("Stopped", "متوقف", ar)}
                  </span>
                </div>
              </div>

              {/* Controls */}
              <div className="p-4 flex flex-col gap-2">
                <div className="mk-overline uppercase tracking-widest text-mk-fg-3 mb-1">
                  {T("Car controls", "التحكم في السيارة", ar)}
                </div>
                {MAP_ACTIONS.map(a => {
                  const s = ACT_STYLE[a.style];
                  const label = a.key === "engine"
                    ? (engineOn ? T("Stop engine remotely", "إيقاف المحرك عن بُعد", ar) : T("Start engine", "تشغيل المحرك", ar))
                    : (ar ? a.labelAr : a.labelEn);
                  return (
                    <button key={a.key} onClick={() => doAction(a.key)}
                      className="flex items-center gap-3 w-full px-4 py-3 rounded-md mk-label cursor-pointer text-start transition-opacity duration-200 ease-[ease] hover:opacity-80 active:scale-98"
                      style={{ border: s.border, background: s.bg, color: s.color }}>
                      <span className="mk-body">{a.icon}</span>
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Action log */}
              <div className="p-4 border-t border-mk-border flex-1">
                <div className="mk-overline uppercase tracking-widest text-mk-fg-3 mb-2">
                  {T("Action log", "سجل الإجراءات", ar)}
                </div>
                {logs.length === 0
                  ? <div className="mk-caption text-mk-fg-3">{T("No activity yet", "لا يوجد نشاط حتى الآن", ar)}</div>
                  : logs.map((l, i) => <div key={i} className="mk-overline py-2 border-b border-mk-border text-mk-fg-2">{l}</div>)
                }
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center text-mk-fg-3">
              <span className="mk-display opacity-20">📍</span>
              <div className="mk-label">{T("GPS signal unavailable for this vehicle", "إشارة GPS غير متوفرة لهذه المركبة", ar)}</div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
