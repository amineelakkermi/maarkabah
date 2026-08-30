"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Renders its children into `document.body` instead of wherever the caller
 * sits in the tree. Every fixed-position dropdown panel (Select,
 * AccessLevelSelect, DatePicker, DateTimePicker, …) needs this: an
 * `overflow-hidden` ancestor — used throughout this app to round card/
 * table/list corners — clips a plain in-place panel the moment it needs to
 * spill past that ancestor's edge, which is exactly the cut-off dropdown
 * bug this component exists to avoid. Pair with `useDropdownPlacement`,
 * whose `style` output already targets `document.body`'s coordinate space.
 *
 * Waits for mount before portaling since `document` doesn't exist during
 * SSR — the panel simply isn't rendered server-side, same as before this
 * existed (it only ever mattered while `open`, which starts false).
 */
export function DropdownPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}