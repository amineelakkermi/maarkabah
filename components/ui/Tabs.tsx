"use client";

import type { ReactNode, CSSProperties } from "react";

export interface TabItem {
  value: string;
  /** Omit to render an icon-only tab (needs `aria-label`) — works in any variant. */
  label?: ReactNode;
  icon?: ReactNode;
  /** Optional count pill rendered after the label — e.g. "Pending 3". Tabs
   * owns the count's styling so a forced `tone` can recolor it too;
   * embedding your own <Badge> in `label` can't. */
  count?: number;
  /** Accessible name for icon-only tabs, since there's no visible label. */
  "aria-label"?: string;
}

type TabsVariant = "default" | "outline" | "tonal";
type TabsTone = "auto" | "light" | "dark";
// Only two sizes — "md" (default) is fixed-height to line up with Input/
// Select's own h-10, so Tabs can sit in the same toolbar row as a search
// field or a status Select without looking mismatched. "sm" is the compact
// counterpart (matches Select's sm, h-8).
type TabsSize = "xs" | "sm" | "md";

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  /** "md" (default) — h-10, same height as Input/Select's own md.
   * "sm" — h-8, same height as Select's sm.
   * "xs" — h-7, compact mini tab. */
  size?: TabsSize;
  /** "default" — the boxed segmented control (surface tray + raised active
   * tab), same `.mk-view-toggle`/`.mk-view-btn` pattern as the map/grid/list
   * view-switcher used across fleet/cars/new-contract — now also carrying
   * labeled tabs, not just icon-only ones.
   * "outline" — bordered chip strip, transparent inactive, filled-dark active.
   * "tonal" — borderless, brand blue-surface tint on the active tab, matching
   * Button's `tonal` variant. */
  variant?: TabsVariant;
  /** "auto" (default) follows the page's own light/dark theme, same as
   * everything else. "light"/"dark" force one literal palette regardless
   * of the ambient theme — for a control that must always look the same
   * (e.g. an overlay on a map). Forcing a tone can't be done by nesting
   * a data-theme attribute — an ancestor further up still carries the
   * page's real theme, and the dark-mode CSS overrides key off "does any
   * ancestor have data-theme=dark", not "the nearest one" — so a forced
   * tone renders with literal colors instead of the theme-reactive
   * mk-ink/mk-blue/mk-chip classes. */
  tone?: TabsTone;
  /** "default"-variant only: the tray/tab corner radius. Pick whichever
   * matches the radius of the elements it sits beside (a pill search bar
   * next to it → "full"; a boxed rounded-lg/xl card → "lg") — deliberately
   * a closed set of exact single classes rather than accepting an arbitrary
   * radius via `className`, since two competing `rounded-*` utilities on
   * the same element race on Tailwind's generated-CSS order, not on
   * source order (the same class of bug `border`/`border-0` had — see
   * Button.tsx). */
  rounded?: "lg" | "full";
  className?: string;
}

const DEFAULT_TONE_CLASSES: Record<Exclude<TabsTone, "auto">, { toggle: string; btn: string }> = {
  light: { toggle: "mk-view-toggle--light", btn: "mk-view-btn--light" },
  dark: { toggle: "mk-view-toggle--dark", btn: "mk-view-btn--dark" },
};

// Literal (non-theme-reactive) colors for the "outline" variant's forced
// tones — "light" mirrors the app's default light-mode Chip look, "dark"
// mirrors the dark-mode .mk-chip--active override in globals.css.
const OUTLINE_TONE_STYLES: Record<Exclude<TabsTone, "auto">, {
  inactiveText: string; inactiveBorder: string; hoverText: string; hoverBorder: string;
  activeBg: string; activeText: string; activeBorder: string;
  countInactiveBg: string; countInactiveText: string;
  countActiveBg: string; countActiveText: string;
}> = {
  light: {
    inactiveText: "#4A4F73", inactiveBorder: "#DEDFE6", hoverText: "#0F1430", hoverBorder: "#BCBFCC",
    activeBg: "#0F1430", activeText: "#FFFFFF", activeBorder: "#0F1430",
    countInactiveBg: "#E1E9FB", countInactiveText: "#1F3F95",
    countActiveBg: "rgba(255,255,255,0.22)", countActiveText: "#FFFFFF",
  },
  dark: {
    inactiveText: "#BCBFCC", inactiveBorder: "rgba(255,255,255,0.15)", hoverText: "#FFFFFF", hoverBorder: "rgba(255,255,255,0.3)",
    activeBg: "rgba(65,113,226,0.18)", activeText: "#7FAAF5", activeBorder: "rgba(65,113,226,0.35)",
    countInactiveBg: "rgba(65,113,226,0.18)", countInactiveText: "#BCBFCC",
    countActiveBg: "rgba(255,255,255,0.22)", countActiveText: "#7FAAF5",
  },
};

// Literal tones for "tonal" — same blue-surface/blue-500 pairing the token
// classes resolve to per theme, just hardcoded so a forced tone holds.
const TONAL_TONE_STYLES: Record<Exclude<TabsTone, "auto">, {
  inactiveText: string; hoverText: string; activeBg: string; activeText: string;
  countInactiveBg: string; countInactiveText: string; countActiveBg: string; countActiveText: string;
}> = {
  light: {
    inactiveText: "#4A4F73", hoverText: "#0F1430",
    activeBg: "#EEF3FC", activeText: "#4171E2",
    countInactiveBg: "#EFF0F4", countInactiveText: "#4A4F73",
    countActiveBg: "rgba(65,113,226,0.15)", countActiveText: "#4171E2",
  },
  dark: {
    inactiveText: "#BCBFCC", hoverText: "#FFFFFF",
    activeBg: "rgba(65,113,226,0.18)", activeText: "#5D8BF4",
    countInactiveBg: "rgba(255,255,255,0.08)", countInactiveText: "#BCBFCC",
    countActiveBg: "rgba(255,255,255,0.18)", countActiveText: "#5D8BF4",
  },
};

// Standalone pill buttons (outline/tonal) — fixed height to match Input/Select.
const pillSizeClasses: Record<TabsSize, string> = {
  xs: "h-7 px-2.5 text-[12px] gap-1.5",
  sm: "h-8 px-3 mk-body-sm gap-1.5",
  md: "h-10 px-4 mk-body-sm gap-2",
};

// Boxed tray (default variant) — tray height matches Input/Select; a fixed
// p-1 inset leaves the tab itself 8px shorter than the tray on every size.
const traySizeClasses: Record<TabsSize, string> = { xs: "h-7 p-0.5", sm: "h-8 p-1", md: "h-10 p-1" };
const trayTabSizeClasses: Record<TabsSize, string> = { xs: "h-6 px-2 text-[12px] gap-1", sm: "h-6 px-2.5 mk-body-sm gap-1.5", md: "h-8 px-3 mk-body-sm gap-2" };
const trayTabSquareClasses: Record<TabsSize, string> = { xs: "w-6 h-6", sm: "w-6 h-6", md: "w-8 h-8" };

function Tabs({ items, value, onChange, size = "md", variant = "default", tone = "auto", rounded = "lg", className = "" }: TabsProps) {
  // ── "default" — boxed segmented control (surface tray + raised active tab) ──
  if (variant === "default") {
    const toneClasses = tone !== "auto" ? DEFAULT_TONE_CLASSES[tone] : null;
    const toggleClass = toneClasses ? toneClasses.toggle : "mk-view-toggle";
    const btnClass = toneClasses ? toneClasses.btn : "mk-view-btn";
    const activeClass = toneClasses ? "mk-view-btn--tone-active" : "mk-view-btn--active";
    // Tray = --radius-md (12px), tab = --radius-sm (8px) — the standard
    // nested-radius pairing (outer = inner + the 4px tray inset) already
    // used for card-in-card patterns elsewhere, not a one-off number.
    const toggleRadius = rounded === "full" ? "rounded-full" : "rounded-md";
    const btnRadius = rounded === "full" ? "rounded-full" : "rounded-sm";

    return (
      <div className={`${toggleClass} ${toggleRadius} ${traySizeClasses[size]} flex items-center gap-1 w-fit ${className}`} role="tablist">
        {items.map((item) => {
          const active = item.value === value;
          const iconOnly = !!item.icon && !item.label;
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={item["aria-label"]}
              className={`${btnClass} ${btnRadius} ${iconOnly ? trayTabSquareClasses[size] : trayTabSizeClasses[size]} ${active ? activeClass : ""}`}
              onClick={() => onChange(item.value)}
            >
              {item.icon}
              {item.label}
              {item.count !== undefined && (
                <span
                  className={`inline-flex items-center justify-center min-w-5 px-1.5 rounded-pill mk-caption ${
                    active ? "bg-mk-blue-100 text-mk-blue-700" : "bg-mk-ink-100 text-mk-ink-600"
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // ── "outline" — bordered chip strip, forced tone ──
  if (variant === "outline" && tone !== "auto") {
    const t = OUTLINE_TONE_STYLES[tone];
    return (
      <div className={`flex flex-wrap gap-2 ${className}`} role="tablist">
        {items.map((item) => {
          const active = item.value === value;
          const style: CSSProperties = active
            ? { background: t.activeBg, color: t.activeText, borderColor: t.activeBorder }
            : { background: "transparent", color: t.inactiveText, borderColor: t.inactiveBorder };
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={active}
              style={style}
              className={`inline-flex items-center rounded-pill cursor-pointer border transition-[background,color,border-color] duration-base ease-standard ${pillSizeClasses[size]}`}
              onClick={() => onChange(item.value)}
            >
              {item.icon}
              {item.label}
              {item.count !== undefined && (
                <span
                  className="inline-flex items-center justify-center min-w-5 px-1.5 rounded-pill mk-caption"
                  style={{
                    background: active ? t.countActiveBg : t.countInactiveBg,
                    color: active ? t.countActiveText : t.countInactiveText,
                  }}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // ── "outline" — bordered chip strip, auto theme ──
  if (variant === "outline") {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`} role="tablist">
        {items.map((item) => {
          const active = item.value === value;
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={active}
              className={`
                inline-flex items-center rounded-pill cursor-pointer border
                transition-[background,color,border-color] duration-base ease-standard
                ${pillSizeClasses[size]}
                ${active
                  ? "mk-chip--active bg-mk-ink-900 text-white border-mk-ink-900"
                  : "bg-transparent text-mk-ink-600 border-mk-ink-200 hover:border-mk-ink-300 hover:text-mk-ink-900"
                }
              `}
              onClick={() => onChange(item.value)}
            >
              {item.icon}
              {item.label}
              {item.count !== undefined && (
                <span
                  className={`inline-flex items-center justify-center min-w-5 px-1.5 rounded-pill mk-caption ${
                    active ? "bg-white/[0.22] text-white" : "bg-mk-blue-50 text-mk-blue-700"
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // ── "tonal" — borderless, brand blue-surface tint on the active tab ──
  const tonalStyle = tone !== "auto" ? TONAL_TONE_STYLES[tone] : null;
  return (
    <div className={`inline-flex items-center p-0.5 rounded-pill bg-mk-bg-elevated border border-mk-border/50 shadow-xs gap-0.5 ${className}`} role="tablist">
      {items.map((item) => {
        const active = item.value === value;
        const style: CSSProperties | undefined = tonalStyle
          ? {
              background: active ? tonalStyle.activeBg : "transparent",
              color: active ? tonalStyle.activeText : tonalStyle.inactiveText,
            }
          : undefined;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            style={style}
            className={`
              inline-flex items-center rounded-pill cursor-pointer border-0
              transition-[background,color,shadow] duration-200 ease-standard
              ${pillSizeClasses[size]}
              ${!tonalStyle ? (active ? "bg-mk-blue-500 text-white font-medium shadow-xs" : "bg-transparent text-mk-ink-600 hover:text-mk-ink-900") : ""}
            `}
            onClick={() => onChange(item.value)}
          >
            {item.icon}
            {item.label}
            {item.count !== undefined && (
              <span
                className={
                  tonalStyle
                    ? "inline-flex items-center justify-center min-w-5 px-1.5 rounded-pill mk-caption"
                    : `inline-flex items-center justify-center min-w-5 px-1.5 rounded-pill mk-caption ${
                        active ? "bg-white/20 text-white" : "bg-mk-ink-100 text-mk-ink-600"
                      }`
                }
                style={
                  tonalStyle
                    ? { background: active ? tonalStyle.countActiveBg : tonalStyle.countInactiveBg, color: active ? tonalStyle.countActiveText : tonalStyle.countInactiveText }
                    : undefined
                }
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export { Tabs };
export type { TabsProps, TabsVariant, TabsTone, TabsSize };
