"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Search, Check } from "lucide-react";
import { DropdownPortal } from "./DropdownPortal";
import { useDropdownPlacement } from "./useDropdownPlacement";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

type SearchableSelectSize = "sm" | "md" | "lg";
type SearchableSelectVariant = "default" | "muted";

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  label?: ReactNode;
  helpText?: string;
  /** Shown on the trigger when nothing is selected. */
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  size?: SearchableSelectSize;
  variant?: SearchableSelectVariant;
  className?: string;
  id?: string;
}

// Same rungs as Select so the two line up when placed side by side.
const sizeClasses: Record<SearchableSelectSize, string> = {
  sm: "h-8 px-2.5 pe-7 mk-body-sm",
  md: "h-10 px-3 pe-9 mk-body-sm",
  lg: "h-12 px-4 pe-10 mk-body",
};

const chevronSizeClasses: Record<SearchableSelectSize, { size: number; className: string }> = {
  sm: { size: 12, className: "end-2.5" },
  md: { size: 14, className: "end-3" },
  lg: { size: 16, className: "end-3.5" },
};

const variantClasses: Record<SearchableSelectVariant, string> = {
  default: "rounded-md border-mk-ink-200 bg-white",
  muted: "rounded-md border-mk-ink-100 bg-mk-ink-50",
};

/**
 * A Select look-alike whose panel carries a search field, for long lookup
 * lists (vehicle makes/models, countries…) where a native <select> is
 * painful to scan. Renders the panel through DropdownPortal so it can
 * spill past an overflow-hidden drawer/card, and positions it with
 * useDropdownPlacement.
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  label,
  helpText,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results found",
  disabled = false,
  size = "md",
  variant = "default",
  className = "",
  id,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const { style: panelStyle } = useDropdownPlacement(open, rootRef, panelRef);

  const selected = options.find((o) => o.value === value);
  const chevron = chevronSizeClasses[size];
  const triggerId = id ?? (typeof label === "string" ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLocaleLowerCase().includes(q));
  }, [options, query]);

  // Reset search + focus it each time the panel opens.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHighlight(Math.max(0, options.findIndex((o) => o.value === value)));
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open, options, value]);

  useEffect(() => { setHighlight(0); }, [query]);

  // Close on outside click / Escape. The panel lives in a portal, so check
  // both the trigger root and the panel node.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Keep the highlighted row in view while arrowing through the list.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[highlight] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  function pick(v: string) {
    onChange(v);
    setOpen(false);
  }

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); const o = filtered[highlight]; if (o) pick(o.value); }
  }

  return (
    <div className="flex flex-col gap-2" ref={rootRef}>
      {label && (
        <label htmlFor={triggerId} className="mk-body-sm text-mk-fg-1">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          id={triggerId}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={`
            font-[family-name:var(--font-body)] w-full text-start truncate
            border transition-[border-color,box-shadow] duration-base ease-standard
            focus:outline-none focus:border-mk-blue-500 focus:shadow-[var(--shadow-focus)]
            cursor-pointer disabled:cursor-not-allowed disabled:opacity-60
            ${open ? "border-mk-blue-500 shadow-[var(--shadow-focus)]" : ""}
            ${selected ? "text-mk-fg-1" : "text-mk-ink-400"}
            ${variantClasses[variant]}
            ${sizeClasses[size]}
            ${className}
          `}
        >
          {selected ? selected.label : placeholder}
        </button>
        <ChevronDown size={chevron.size} className={`absolute top-1/2 -translate-y-1/2 text-mk-ink-400 pointer-events-none ${chevron.className}`} />
      </div>
      {helpText && <p className="mk-caption text-mk-fg-3">{helpText}</p>}

      <DropdownPortal>
        {open && (
          <div
            ref={panelRef}
            style={panelStyle}
            className="z-[300] w-max min-w-[220px] max-w-[min(420px,calc(100vw-16px))] rounded-md mk-surface mk-shadow-menu overflow-hidden"
          >
            <div className="flex items-center gap-2 px-3 h-10 border-b border-mk-ink-100 text-mk-ink-500">
              <Search size={14} className="shrink-0" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder={searchPlaceholder}
                className="flex-1 min-w-0 bg-transparent border-0 outline-none mk-body-sm text-mk-fg-1 placeholder:text-mk-ink-400"
              />
            </div>
            <ul ref={listRef} role="listbox" className="max-h-[260px] overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-3 py-6 text-center mk-caption text-mk-ink-400">{emptyText}</li>
              ) : (
                filtered.map((o, i) => {
                  const isSelected = o.value === value;
                  const isActive = i === highlight;
                  return (
                    <li
                      key={o.value}
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setHighlight(i)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(o.value)}
                      className={`
                        flex items-center justify-between gap-3 px-3 h-9 mk-body-sm cursor-pointer
                        ${isActive ? "bg-mk-ink-50" : ""}
                        ${isSelected ? "text-mk-blue-500" : "text-mk-fg-1"}
                      `}
                    >
                      <span className="truncate">{o.label}</span>
                      {isSelected && <Check size={14} className="shrink-0" />}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </DropdownPortal>
    </div>
  );
}

export type { SearchableSelectProps };
