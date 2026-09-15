"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function CarCardCarousel({ images, picked }: { images: string[]; picked?: boolean }) {
  const [index, setIndex] = useState(0);
  const [startX, setStartX] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-[170px] flex items-center justify-center mk-caption text-mk-ink-400 bg-mk-ink-50">
        No Photo
      </div>
    );
  }

  const next = () => {
    setIndex((prev) => (prev + 1) % images.length);
  };

  const prev = () => {
    setIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleStart = (clientX: number) => {
    setStartX(clientX);
    setIsDragging(true);
    setHasDragged(false);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || startX === null) return;
    const diff = startX - clientX;
    if (Math.abs(diff) > 5) {
      setHasDragged(true);
    }
    if (diff > 40) {
      next();
      setIsDragging(false);
      setStartX(null);
    } else if (diff < -40) {
      prev();
      setIsDragging(false);
      setStartX(null);
    }
  };

  const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (hasDragged) {
      e.stopPropagation();
      e.preventDefault();
    }
    setIsDragging(false);
    setStartX(null);
  };

  const activeSrc = images[index];
  const activeFlipped = activeSrc?.endsWith("#flipped");
  const cleanActiveSrc = activeFlipped ? activeSrc.replace("#flipped", "") : activeSrc;

  const bg = picked
    ? "linear-gradient(135deg, rgba(65,113,226,0.12), rgba(127,67,221,0.12))"
    : "linear-gradient(135deg, rgba(65,113,226,0.06), rgba(127,67,221,0.06))";

  return (
    <div
      className="relative w-full overflow-hidden select-none group cursor-grab active:cursor-grabbing"
      style={{ height: 170, background: bg }}
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
      onClick={(e) => {
        if (hasDragged) {
          e.stopPropagation();
          e.preventDefault();
        }
      }}
    >
      {images.map((imgUrl, i) => {
        const isImgFlipped = imgUrl.endsWith("#flipped");
        const cleanImgSrc = isImgFlipped ? imgUrl.replace("#flipped", "") : imgUrl;
        return (
          <img
            key={i}
            src={cleanImgSrc}
            alt="Car Photo"
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 pointer-events-none"
            style={{
              opacity: i === index ? 1 : 0,
              transform: isImgFlipped ? "scaleX(-1)" : "none",
              zIndex: i === index ? 10 : 0,
            }}
          />
        );
      })}

      {/* Navigation Arrows & Dots */}
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); prev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/35 text-white flex items-center justify-center border-none cursor-pointer hover:bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity z-20"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); next(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/35 text-white flex items-center justify-center border-none cursor-pointer hover:bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity z-20"
          >
            <ChevronRight size={14} />
          </button>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-20">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex(i);
                }}
                className="rounded-full border-none cursor-pointer p-0 transition-all"
                style={{
                  width: i === index ? 14 : 5,
                  height: 5,
                  background: i === index ? "white" : "rgba(255,255,255,0.5)",
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
