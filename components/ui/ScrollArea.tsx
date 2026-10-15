"use client";

import type { CSSProperties, ReactNode } from "react";

interface ScrollAreaProps {
  /** Classes for the scrolling viewport itself (overflow lives here). */
  className?: string;
  /** Classes for the inner content wrapper (padding / layout of the items). */
  contentClassName?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * Native scroll container that bleeds its scrollbar to the panel's own edge:
 * give the viewport negative margins via `className` and put the matching
 * padding back on `contentClassName`, so the scrollbar sits on the card's
 * border instead of against the rows. Uses the app's themed scrollbar.
 */
export function ScrollArea({ className = "", contentClassName = "", style, children }: ScrollAreaProps) {
  return (
    <div className={`overflow-y-auto min-h-0 ${className}`} style={style}>
      <div className={contentClassName}>{children}</div>
    </div>
  );
}
