"use client";

import { useState } from "react";
import { PhotoLightbox } from "@/components/employee/PhotoLightbox";

const T = (en: string, ar: string, isAr: boolean) => isAr ? ar : en;

export function ReadonlyCarCarousel({ photos, ar, title, lightbox = true }: { photos: { src: string; label: string }[]; ar: boolean; title?: string; lightbox?: boolean }) {
  const [index, setIndex] = useState(0);
  const [startX, setStartX] = useState<number | null>(null);
  const [moved, setMoved] = useState(false);
  const [open, setOpen] = useState(false);
  if (photos.length === 0) return <div className="flex h-[192px] w-full items-center justify-center bg-mk-ink-50 mk-caption text-mk-ink-400">{T("No photos in the vehicle file", "لا توجد صور في ملف المركبة", ar)}</div>;
  const move = (x: number) => {
    if (startX == null) return;
    const distance = startX - x;
    if (Math.abs(distance) > 5) setMoved(true);
    if (distance > 40) { setIndex((current) => (current + 1) % photos.length); setStartX(null); }
    if (distance < -40) { setIndex((current) => (current - 1 + photos.length) % photos.length); setStartX(null); }
  };
  return <div className="flex w-full flex-col gap-2">
    <div className={`relative h-48 w-full overflow-hidden rounded-md ${lightbox ? "cursor-pointer" : ""}`} onTouchStart={(event) => { setStartX(event.touches[0].clientX); setMoved(false); }} onTouchMove={(event) => move(event.touches[0].clientX)} onTouchEnd={() => setStartX(null)} onMouseDown={(event) => { setStartX(event.clientX); setMoved(false); }} onMouseMove={(event) => { if (startX != null) { event.preventDefault(); move(event.clientX); } }} onMouseUp={() => setStartX(null)} onMouseLeave={() => setStartX(null)} onClick={() => { if (lightbox && !moved) setOpen(true); }}>
      {photos.map((photo, photoIndex) => <div key={`${photo.src}-${photoIndex}`} className="absolute inset-0 h-full w-full transition-opacity duration-300" style={{ opacity: photoIndex === index ? 1 : 0, zIndex: photoIndex === index ? 10 : 0 }}><img src={photo.src} alt={photo.label} className="h-full w-full pointer-events-none object-cover" /><div className="absolute inset-x-0 bottom-2 z-20 flex justify-center pointer-events-none"><span className="mk-caption rounded-pill bg-black/55 px-2.5 py-0.5 text-white">{photo.label}</span></div></div>)}
    </div>
    <div className="flex flex-wrap justify-center gap-2">{photos.map((photo, photoIndex) => <button key={`${photo.src}-${photoIndex}`} type="button" title={photo.label} onClick={(event) => { event.stopPropagation(); setIndex(photoIndex); }} className="h-9 w-12 shrink-0 cursor-pointer overflow-hidden rounded-sm border p-0 transition-all" style={{ borderColor: photoIndex === index ? "var(--color-mk-blue-500)" : "var(--color-mk-ink-200)", opacity: photoIndex === index ? 1 : .6 }}><img src={photo.src} alt="" className="h-full w-full object-cover" /></button>)}</div>
    <PhotoLightbox ar={ar} title={title} photos={photos} index={open ? index : null} onIndex={setIndex} onClose={() => setOpen(false)} />
  </div>;
}
