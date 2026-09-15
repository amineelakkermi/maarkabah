"use client";

import type { ReactNode } from "react";
import { Search, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui";
import type { DriverProfile } from "@/lib/data";
import { T } from "./constants";

// Shared "search → dropdown → selected card / Change" block used for the
// authorized driver and the extra driver (drivers card + Step 2 add-on).
// `action` is the header-right slot (e.g. "+ Add new driver" link / button).
export function PersonPicker({
  ar, label, placeholder, items, query, onQuery, selected, onSelect, onClear,
  action, loading, error, showRating,
}: {
  ar: boolean;
  label: string;
  placeholder: string;
  items: DriverProfile[];
  query: string;
  onQuery: (q: string) => void;
  selected: DriverProfile | null;
  onSelect: (d: DriverProfile) => void;
  onClear: () => void;
  action?: ReactNode;
  loading?: boolean;
  error?: string;
  showRating?: boolean;
}) {
  return (
    <div className="p-4 rounded-lg bg-mk-ink-50 border border-mk-ink-200 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <label className="mk-overline text-mk-ink-600">{label}</label>
        {action}
      </div>

      {selected ? (
        <div className="flex items-center gap-3 p-3 rounded-lg mk-row-bg border border-mk-blue-500/30">
          <Avatar name={selected.name} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="mk-caption text-mk-ink-900">{ar ? selected.nameAr : selected.name}</div>
            <div className="mk-overline text-mk-ink-500">
              {showRating
                ? <>★ {selected.rating ?? "—"} · {selected.idType} · {selected.nationalId}</>
                : <>{selected.idType} · {selected.nationalId} · {selected.phone}</>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="mk-overline text-mk-ink-500 bg-mk-ink-50 px-2 py-1 rounded-full border-0 cursor-pointer"
          >
            {T("Change", "تغيير", ar)}
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="flex items-center gap-2 rounded-full px-3 h-10 mk-row-bg border border-mk-ink-200">
            <Search size={13} className="shrink-0 text-mk-ink-500" />
            <input
              className="flex-1 bg-transparent outline-none mk-caption text-mk-ink-900"
              placeholder={placeholder}
              value={query}
              onChange={(e) => onQuery(e.target.value)}
            />
          </div>
          <div
            className="absolute top-full inset-x-0 mt-2 z-20 flex flex-col gap-2 max-h-[220px] overflow-y-auto p-2 rounded-lg border border-mk-ink-200 shadow-lg bg-mk-bg-elevated"
          >
            {loading && (
              <div className="flex items-center gap-2 p-3 mk-caption text-mk-ink-500">
                <Loader2 size={14} className="animate-spin" /> {T("Loading drivers…", "جاري تحميل السائقين…", ar)}
              </div>
            )}
            {!loading && error && (
              <div className="p-3 mk-caption text-mk-danger">{error}</div>
            )}
            {loading !== undefined && !loading && !error && items.length === 0 && (
              <div className="p-3 mk-caption text-mk-ink-500">{T("No drivers found", "لا يوجد سائقون", ar)}</div>
            )}
            {items.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => onSelect(d)}
                className="flex items-center gap-3 p-3 rounded-lg bg-mk-ink-100 hover:bg-mk-ink-200 border border-mk-ink-200 text-start w-full cursor-pointer transition-colors"
              >
                <Avatar name={d.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="mk-caption text-mk-ink-900">{ar ? d.nameAr : d.name}</div>
                  <div className="mk-overline text-mk-ink-500">
                    {d.idType} · {d.nationalId}{!showRating && d.phone ? ` · ${d.phone}` : ""}
                  </div>
                </div>
                {showRating && <span className="mk-overline text-mk-warning-700 shrink-0">★ {d.rating ?? "—"}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
