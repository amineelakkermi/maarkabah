"use client";

import { useState } from "react";
import { Camera, Upload, X } from "lucide-react";
import { PhotoLightbox } from "@/components/employee/PhotoLightbox";
import { Badge } from "@/components/ui";

const T = (en: string, ar: string, isAr: boolean) => isAr ? ar : en;

export interface PhotoSlotDefinition { label: string; labelAr?: string | null; labelEn?: string | null }
export interface PhotoSlotValue { file?: File; preview: string }

export function PhotoSlotsPanel({ ar, title, definitions, values, onChange, locked, extra = [], required = 0, viewerTitle }: {
  ar: boolean;
  title: string;
  definitions: PhotoSlotDefinition[];
  values: Record<string, PhotoSlotValue>;
  onChange: (next: Record<string, PhotoSlotValue>) => void;
  locked: boolean;
  extra?: { src: string; label: string; onRemove?: () => void }[];
  required?: number;
  viewerTitle?: string;
}) {
  const [viewing, setViewing] = useState<number | null>(null);
  const filled = Object.keys(values).length;
  const gallery = [...definitions.flatMap((slot) => values[slot.label] ? [{ src: values[slot.label].preview, label: ar ? slot.labelAr ?? slot.label : slot.labelEn ?? slot.label }] : []), ...extra.map((photo) => ({ src: photo.src, label: photo.label }))];
  const read = (slot: PhotoSlotDefinition, file: File) => {
    const reader = new FileReader();
    reader.onload = () => onChange({ ...values, [slot.label]: { file, preview: reader.result as string } });
    reader.readAsDataURL(file);
  };
  return <div className="rounded-xl p-5 mk-surface">
    <div className="mb-4 flex items-center justify-between gap-3"><div className="mk-h4 text-mk-ink-900">{title}</div><Badge variant={filled >= required ? "success" : "warning"} dot>{filled} / {definitions.length}</Badge></div>
    <div className="mb-3 mk-caption text-mk-ink-500">{required > 0 ? T(`Take at least ${required} of the photos below`, `التقط ${required} صور على الأقل من الخانات التالية`, ar) : T("Add return photos by slot", "أضف صور الاستلام حسب الخانة", ar)}</div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{definitions.map((slot) => {
      const value = values[slot.label];
      const label = ar ? slot.labelAr ?? slot.label : slot.labelEn ?? slot.label;
      const galleryIndex = definitions.slice(0, definitions.indexOf(slot)).filter((item) => values[item.label]).length;
      return <div key={slot.label} className="group relative aspect-[4/3]">
        {value ? <button type="button" className="block h-full w-full cursor-pointer border-0 bg-transparent p-0" onClick={() => setViewing(galleryIndex)}><div className="h-full w-full overflow-hidden rounded-md"><img src={value.preview} alt={label} className="h-full w-full object-cover" /></div></button> : <label className={`block h-full w-full ${locked ? "" : "cursor-pointer"}`}><input type="file" accept="image/*" capture="environment" className="hidden" disabled={locked} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) read(slot, file); }} /><div className="flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-md border-[1.5px] border-dashed border-mk-ink-200 bg-mk-ink-50"><div className="flex flex-col items-center gap-1 text-mk-ink-300 transition-colors group-hover:text-mk-blue-500"><Camera size={18} /><span className="px-1 text-center mk-overline">{label}</span></div></div></label>}
        {value && !locked && <div className="absolute end-1 top-1 z-20 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"><label className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white"><Upload size={10} /><input type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) read(slot, file); }} /></label><button type="button" onClick={() => onChange(Object.fromEntries(Object.entries(values).filter(([key]) => key !== slot.label)))} className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border-0 bg-mk-danger text-white"><X size={9} /></button></div>}
        {value && <div className="absolute inset-x-0 bottom-2 z-20 flex justify-center pointer-events-none"><span className="mk-caption rounded-pill bg-black/55 px-2.5 py-0.5 text-white">{label}</span></div>}
      </div>;
    })}</div>
    {extra.length > 0 && <div className="mt-3 grid grid-cols-4 gap-2">{extra.map((photo, index) => <div key={`${photo.src}-${index}`} onClick={() => setViewing(filled + index)} className="relative aspect-square cursor-pointer overflow-hidden rounded-md border border-mk-danger/40"><img src={photo.src} alt="" className="h-full w-full object-cover" /><span className="absolute inset-x-0 bottom-0 truncate bg-mk-danger/85 px-1.5 py-0.5 mk-caption text-white">{photo.label}</span>{!locked && photo.onRemove && <button type="button" onClick={(event) => { event.stopPropagation(); photo.onRemove?.(); }} className="absolute end-1 top-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border-0 bg-black/60 text-white"><X size={10} /></button>}</div>)}</div>}
    <PhotoLightbox ar={ar} title={viewerTitle} photos={gallery} index={viewing} onIndex={setViewing} onClose={() => setViewing(null)} />
  </div>;
}
