"use client";

import { useState, useLayoutEffect, type CSSProperties, type RefObject } from "react";

export interface DropdownPlacement {
  /** Vertical side the panel opened on — exposed in case a caller wants it
   * for its own animation origin; positioning itself is fully carried by
   * `style` below. */
  placement: "top" | "bottom";
  /** Fixed-position coordinates anchored to the trigger's current on-screen
   * rect. Meant for a panel rendered through a portal (see `DropdownPortal`)
   * so it paints above `document.body` instead of inside whatever card/
   * table/drawer the trigger happens to sit in — an `overflow-hidden`
   * ancestor (used all over this app to round card/table corners) clips any
   * plain `position: absolute` panel that needs to spill past it, which is
   * exactly the cut-off dropdown bug this hook exists to avoid. */
  style: CSSProperties;
}

/**
 * Flips a dropdown/menu panel above its trigger when there isn't enough
 * room below (trigger sitting near the bottom of the screen) but there is
 * enough above — matching every native picker's "collision" behavior — and
 * computes the fixed-position coordinates a portaled panel needs to track
 * the trigger from `document.body`.
 *
 * Measured with the panel's real rendered height, since it stays mounted
 * (opacity/transform only) rather than `display:none` so exit animation
 * can play; `useLayoutEffect` so the initial flip lands before paint, no
 * visible jump from bottom to top.
 *
 * Also keeps recomputing while open: scrolling the page (or a scrollable
 * ancestor, e.g. a drawer body, or the window resizing) can carry the
 * trigger anywhere on screen without ever unmounting it, so both the
 * top/bottom *decision* and the coordinates themselves need to stay live,
 * not just be set once at open-time. Listens on `scroll` with
 * `capture: true` so it catches scroll on any ancestor scroll container,
 * not just window/document.
 */
export function useDropdownPlacement(
  open: boolean,
  rootRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
  align: "start" | "end" = "start"
): DropdownPlacement {
  // `position: fixed` from the very first render, not just once open: the
  // panel stays mounted at all times (see DropdownPortal) so its close
  // animation can play, and it's portaled straight to document.body — a
  // never-yet-opened panel with no `position` set would sit there as a
  // normal (invisible but layout-occupying) block at the end of <body>.
  // With one of these per dropdown on the page, that inflates the page's
  // scrollable height; opening one then applies `position: fixed` and pulls
  // it out of flow, which is what caused the whole page to jump/scroll on
  // that first click.
  const [result, setResult] = useState<DropdownPlacement>({ placement: "bottom", style: { position: "fixed" } });

  useLayoutEffect(() => {
    if (!open) return;

    function update() {
      if (!rootRef.current) return;
      const rect = rootRef.current.getBoundingClientRect();
      const panelHeight = panelRef.current?.offsetHeight ?? 0;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const placement: "top" | "bottom" = spaceBelow < panelHeight && spaceAbove > spaceBelow ? "top" : "bottom";
      const isRtl = document.documentElement.dir === "rtl";
      // "start"/"end" here mean the same logical edges Tailwind's start-*/
      // end-* utilities do — resolved against the page's actual direction
      // since a fixed-position portal has no writing-mode context of its
      // own to resolve them for us.
      const anchorLeft = align === "start" ? !isRtl : isRtl;

      const style: CSSProperties = {
        position: "fixed",
        [placement === "top" ? "bottom" : "top"]: placement === "top" ? window.innerHeight - rect.top + 6 : rect.bottom + 6,
        [anchorLeft ? "left" : "right"]: anchorLeft ? rect.left : window.innerWidth - rect.right,
        minWidth: rect.width,
      };
      setResult({ placement, style });
    }

    update();
    window.addEventListener("scroll", update, { capture: true, passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, { capture: true });
      window.removeEventListener("resize", update);
    };
  }, [open, rootRef, panelRef, align]);

  return result;
}