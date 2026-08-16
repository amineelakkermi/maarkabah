"use client";

import { InputHTMLAttributes, ReactNode } from "react";

interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: ReactNode;
  /** Supporting text rendered below the label — switches the layout to
   * top-aligned so the control lines up with the title, not the block. */
  description?: ReactNode;
}

function Radio({ label, description, checked, disabled, className = "", id, ...props }: RadioProps) {
  const radioId = id ?? (typeof label === "string" ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <label
      htmlFor={radioId}
      className={`inline-flex gap-2.5 mk-body-sm text-mk-fg-1 select-none ${description ? "items-start" : "items-center"} ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${className}`}
    >
      <span className={`relative inline-flex w-[18px] h-[18px] shrink-0 ${description ? "mt-0.5" : ""}`}>
        <input
          type="radio"
          id={radioId}
          checked={checked}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed peer"
          {...props}
        />
        <span
          className={`w-full h-full rounded-full border-2 flex items-center justify-center shrink-0 transition-colors duration-base ease-standard
            peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-mk-blue-500/50
            ${checked ? "border-mk-blue-500" : "border-mk-ink-300 bg-white"}`}
        >
          {checked && <span className="w-2 h-2 rounded-full bg-mk-blue-500" />}
        </span>
      </span>
      {(label || description) && (
        <span className="flex flex-col gap-0.5">
          {label && <span className="mk-label text-mk-fg-1">{label}</span>}
          {description && <span className="mk-caption text-mk-fg-3">{description}</span>}
        </span>
      )}
    </label>
  );
}

export { Radio };
export type { RadioProps };
