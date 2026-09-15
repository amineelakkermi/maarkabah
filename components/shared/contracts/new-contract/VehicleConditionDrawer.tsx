"use client";

import { Gauge, Fuel, ShieldCheck, Wrench, Wind, Music, Monitor, KeyRound, Armchair, Disc, Heart, Flame, Triangle } from "lucide-react";
import { Tabs, Drawer, DrawerHeader } from "@/components/ui";
import type { Car } from "@/lib/data";
import { TAJEER_LOOKUPS, type TajeerRentStatus, type SketchItem } from "@/lib/tajeer";
import { SketchComponent } from "@/components/employee/SketchComponent";
import { T } from "./constants";
import { CarCardCarousel } from "./CarCardCarousel";

export type VehicleConditionDrawerProps = {
  ar: boolean;
  car: Car;
  showConditionModal: boolean;
  setShowConditionModal: (v: boolean) => void;
  conditionView: "sketch" | "photos";
  setConditionView: (v: "sketch" | "photos") => void;
  sketchItems: SketchItem[];
  setSketchItems: (items: SketchItem[]) => void;
  rentStatus: Partial<TajeerRentStatus>;
};

export function VehicleConditionDrawer({
  ar, car, showConditionModal, setShowConditionModal, conditionView, setConditionView, sketchItems, setSketchItems, rentStatus,
}: VehicleConditionDrawerProps) {
  return (
    <Drawer open={showConditionModal} onClose={() => setShowConditionModal(false)}>
      <div className="flex flex-col h-full max-w-[480px] overflow-y-auto">
        <DrawerHeader
          title={T("Vehicle Condition & Status at Pickup", "حالة السيارة عند الاستلام", ar)}
          sub={`${car.make} ${car.model} · ${car.plate}`}
          onClose={() => setShowConditionModal(false)}
          className="mb-4 pb-4 border-b border-mk-border"
        />

        {/* Damage Sketch / Vehicle Photos — toggle */}
        <div className="flex flex-col gap-2 w-full">
          <div className="flex items-center gap-2 mb-1">
            <div className="mk-caption text-mk-ink-600 flex-1">
              {conditionView === "sketch"
                ? T("Registered Damages Sketch (Read-only)", "مخطط الأضرار والخدوش المسجلة (عرض فقط)", ar)
                : T("Vehicle Photos", "صور السيارة", ar)}
            </div>
            <Tabs
              variant="tonal"
              size="xs"
              className="shrink-0"
              value={conditionView}
              onChange={(v) => setConditionView(v as "sketch" | "photos")}
              items={[
                { value: "sketch", label: T("Diagram", "المخطط", ar) },
                { value: "photos", label: T("Photos", "الصور", ar) },
              ]}
            />
          </div>
          {conditionView === "sketch" ? (
            <>
              <p className="mk-overline text-mk-ink-500">
                {T("Registered damages from the fleet system. Hover to view details.", "الخدوش والأضرار المسجلة مسبقاً من نظام الأسطول. مرر الفأرة لعرض التفاصيل.", ar)}
              </p>
              <div className="rounded-lg flex items-center justify-center w-full">
                <SketchComponent value={sketchItems} onChange={setSketchItems} ar={ar} disabled={true} />
              </div>
            </>
          ) : (
            <>
              <p className="mk-overline text-mk-ink-500">
                {T("Photos captured by the fleet team at the last inspection.", "صور التقطها فريق الأسطول في آخر فحص للمركبة.", ar)}
              </p>
              <div className="rounded-lg overflow-hidden bg-mk-ink-50">
                <CarCardCarousel images={car?.imageUrls || []} />
              </div>
            </>
          )}
        </div>

        {/* Key inspection metrics */}
        <div className="mt-6 pt-6 border-t border-mk-ink-100">
          <div className="mk-body text-mk-ink-900 mb-4">
            {T("Key Inspection Metrics", "المؤشرات الرئيسية للفحص", ar)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-3 rounded-lg px-4 py-3 bg-mk-ink-50 select-none">
              <div className="w-9 h-9 rounded-md bg-mk-blue-500/10 text-mk-blue-500 flex items-center justify-center shrink-0">
                <Gauge size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="mk-caption text-mk-ink-500 truncate">{T("Current Odometer", "العداد الحالي", ar)}</div>
                <div className="mk-label text-mk-ink-900 mt-1 truncate">
                  {(rentStatus.odometerReading ?? 0).toLocaleString()} {T("km", "كم", ar)}
                </div>
              </div>
            </div>
            {(() => {
              const fuelTypeObj = TAJEER_LOOKUPS.fuelTypes.find(f => f.code === rentStatus.fuelTypeCode) ?? TAJEER_LOOKUPS.fuelTypes[0];
              const fuelPct: Record<number, number> = { 1: 100, 2: 75, 3: 50, 4: 25, 5: 0 };
              const pct = fuelPct[rentStatus.availableFuel ?? 1] ?? 100;
              return (
                <div className="flex items-center gap-3 rounded-lg px-4 py-3 bg-mk-ink-50 select-none">
                  <div className="w-9 h-9 rounded-md bg-mk-blue-500/10 text-mk-blue-500 flex items-center justify-center shrink-0">
                    <Fuel size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="mk-caption text-mk-ink-500 truncate">{T("Current Fuel", "الوقود الحالي", ar)}</div>
                    <div className="mk-label text-mk-ink-900 mt-1 truncate">{pct}% · {ar ? fuelTypeObj.ar : fuelTypeObj.en}</div>
                  </div>
                </div>
              );
            })()}

            {/* Endurance amount */}
            <div className="flex items-center gap-3 rounded-lg px-4 py-3 bg-mk-ink-50 select-none">
              <div className="w-9 h-9 rounded-md bg-mk-blue-500/10 text-mk-blue-500 flex items-center justify-center shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="mk-caption text-mk-ink-500 truncate">{T("Insurance Endurance", "مبلغ التحمل للحوادث", ar)}</div>
                <div className="mk-label text-mk-ink-900 mt-1 truncate">{(rentStatus.enduranceAmount ?? 0).toLocaleString()} {T("SAR", "ريال", ar)}</div>
              </div>
            </div>

            {/* Oil change info */}
            <div className="flex items-center gap-3 rounded-lg px-4 py-3 bg-mk-ink-50 select-none">
              <div className="w-9 h-9 rounded-md bg-mk-blue-500/10 text-mk-blue-500 flex items-center justify-center shrink-0">
                <Wrench size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="mk-caption text-mk-ink-500 truncate">{T("Next Oil Change", "صيانة تغيير الزيت القادمة", ar)}</div>
                <div className="mk-label text-mk-ink-900 mt-1 truncate">
                  {rentStatus.oilType || "5W-30"} · {rentStatus.oilChangeKmDistance ?? 5000} {T("km", "كم", ar)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Checklist & Current Status */}
        <div className="mt-6 pt-6 border-t border-mk-ink-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 ">
            {[
              { key: "ac", labelAr: "حالة التكييف", labelEn: "A/C", opts: TAJEER_LOOKUPS.acOptions, Icon: Wind },
              { key: "radioStereo", labelAr: "حالة الراديو/المسجل", labelEn: "Radio/Stereo", opts: TAJEER_LOOKUPS.acOptions, Icon: Music },
              { key: "screen", labelAr: "حالة الشاشة الداخلية", labelEn: "Screen", opts: TAJEER_LOOKUPS.acOptions, Icon: Monitor },
              { key: "speedometer", labelAr: "حالة عداد السرعة", labelEn: "Speedometer", opts: TAJEER_LOOKUPS.workingOptions, Icon: Gauge },
              { key: "keys", labelAr: "حالة المفتاح", labelEn: "Keys", opts: TAJEER_LOOKUPS.workingOptions, Icon: KeyRound },
              { key: "carSeats", labelAr: "المقاعد", labelEn: "Car Seats", opts: TAJEER_LOOKUPS.seatsOptions, Icon: Armchair },
              { key: "tires", labelAr: "حالة العجلات", labelEn: "Tires", opts: TAJEER_LOOKUPS.tiresOptions, Icon: Disc },
              { key: "spareTire", labelAr: "حالة العجلة الاحتياطية", labelEn: "Spare Tire", opts: TAJEER_LOOKUPS.tiresOptions, Icon: Disc },
              { key: "spareTireTools", labelAr: "معدات الكفر الاحتياطية", labelEn: "Spare Tire Tools", opts: TAJEER_LOOKUPS.availableOptions, Icon: Wrench },
              { key: "firstAidKit", labelAr: "حالة حقيبة الاسعافات الأولية", labelEn: "First Aid Kit", opts: TAJEER_LOOKUPS.availableOptions, Icon: Heart },
              { key: "fireExtinguisher", labelAr: "توفر طفاية الحريق", labelEn: "Fire Extinguisher", opts: TAJEER_LOOKUPS.availableOptions, Icon: Flame },
              { key: "safetyTriangle", labelAr: "توفر المثلث العاكس", labelEn: "Safety Triangle", opts: TAJEER_LOOKUPS.availableOptions, Icon: Triangle },
            ].map(({ key, labelAr, labelEn, opts, Icon }) => {
              const codeValue = (rentStatus as Record<string, number>)[key] ?? opts[0].code;
              const statusObj = (opts as readonly any[]).find((o) => o.code === codeValue) ?? opts[0];
              const statusText = ar ? statusObj.ar : statusObj.en;

              return (
                <div key={key} className="flex items-center gap-3 p-3 select-none">
                  <div className="w-9 h-9 rounded-md bg-mk-blue-500/10 text-mk-blue-500 flex items-center justify-center shrink-0">
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="mk-caption text-mk-ink-500 truncate">{ar ? labelAr : labelEn}</div>
                    <div className="mk-caption text-mk-ink-900 mt-1 truncate">
                      {statusText}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
