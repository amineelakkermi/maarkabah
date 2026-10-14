"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton, Modal } from "@/components/ui";

const T = (en: string, ar: string, isAr: boolean) => isAr ? ar : en;

export type LightboxPhoto = { src: string; label?: string };

export function PhotoLightbox({ ar, photos, index, onIndex, onClose, title }: {
  ar: boolean;
  photos: LightboxPhoto[];
  index: number | null;
  onIndex: (index: number) => void;
  onClose: () => void;
  title?: string;
}) {
  const current = index == null ? undefined : photos[index];
  const move = (direction: number) => {
    if (index == null || photos.length < 2) return;
    onIndex((index + direction + photos.length) % photos.length);
  };

  return (
    <Modal open={Boolean(current)} onClose={onClose} variant="centered" size="5xl" title={title ?? current?.label ?? ""}>
      {current && (
        <div className="flex flex-col" dir={ar ? "rtl" : "ltr"}>
          <div className="relative h-[72vh] overflow-hidden">
            <img src={current.src} alt={current.label ?? ""} className="block h-full w-full select-none object-contain" />
            {current.label && <div className="absolute inset-x-0 bottom-3 flex justify-center pointer-events-none"><span className="mk-caption rounded-pill bg-black/55 px-3 py-1 text-white">{current.label} · {(index ?? 0) + 1}/{photos.length}</span></div>}
            {photos.length > 1 && <>
              <IconButton size="md" variant="ghost" aria-label={T("Previous photo", "الصورة السابقة", ar)} onClick={() => move(-1)} className="absolute start-3 top-1/2 z-10 -translate-y-1/2 !bg-black/50 !text-white hover:!bg-black/70">{ar ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}</IconButton>
              <IconButton size="md" variant="ghost" aria-label={T("Next photo", "الصورة التالية", ar)} onClick={() => move(1)} className="absolute end-3 top-1/2 z-10 -translate-y-1/2 !bg-black/50 !text-white hover:!bg-black/70">{ar ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}</IconButton>
            </>}
          </div>
          {photos.length > 1 && <div className="flex flex-wrap justify-center gap-2 p-3">{photos.map((photo, photoIndex) => <button key={`${photo.src}-${photoIndex}`} type="button" title={photo.label} onClick={() => onIndex(photoIndex)} className="h-12 w-16 shrink-0 cursor-pointer overflow-hidden rounded-sm border-2 p-0 transition-all" style={{ borderColor: photoIndex === index ? "var(--color-mk-blue-500)" : "var(--color-mk-ink-200)", opacity: photoIndex === index ? 1 : .65 }}><img src={photo.src} alt="" className="h-full w-full object-cover" /></button>)}</div>}
        </div>
      )}
    </Modal>
  );
}
