"use client";

import { useState } from "react";

type ToggleSize = "sm" | "md";

interface ToggleProps {
  label?: string;
  size?: ToggleSize;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}

const TRACK_SIZE: Record<ToggleSize, string> = {
  sm: "w-7 h-4",
  md: "w-9 h-5",
};

const THUMB_SIZE: Record<ToggleSize, string> = {
  sm: "w-3 h-3",
  md: "w-4 h-4",
};

const THUMB_OFFSET: Record<ToggleSize, string> = {
  sm: "left-[13px]",
  md: "left-[18px]",
};

function Toggle({ label, size = "md", defaultChecked = false, checked, onChange, disabled = false }: ToggleProps) {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const isOn = checked !== undefined ? checked : internalChecked;

  function handleClick() {
    if (disabled) return;
    const next = !isOn;
    setInternalChecked(next);
    onChange?.(next);
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      aria-disabled={disabled}
      onClick={handleClick}
      className={`
        inline-flex items-center gap-2 mk-body-sm text-mk-fg-1 cursor-pointer
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <span
        className={`
          relative rounded-pill border transition-colors duration-base ease-standard shrink-0
          ${TRACK_SIZE[size]}
          ${isOn ? "bg-mk-blue-500 border-mk-blue-500" : "bg-mk-ink-300 border-mk-ink-200/60"}
        `}
      >
        <span
          className={`
            absolute top-1/2 -translate-y-1/2 rounded-full bg-white
            shadow-[var(--shadow-thumb)]
            transition-[left] duration-base ease-standard
            ${THUMB_SIZE[size]}
            ${isOn ? THUMB_OFFSET[size] : "left-0.5"}
          `}
        />
      </span>
      {label && <span>{label}</span>}
    </button>
  );
}

export { Toggle };
export type { ToggleProps, ToggleSize };
