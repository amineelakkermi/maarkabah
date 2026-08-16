"use client";

import { useState, InputHTMLAttributes, ReactNode } from "react";
import { Check } from "lucide-react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size" | "onChange"> {
  label?: ReactNode;
  /** Supporting text rendered below the label — switches the layout to
   * top-aligned so the control lines up with the title, not the block. */
  description?: ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
}

function Checkbox({ label, description, checked, defaultChecked = false, onChange, disabled, className = "", id, ...props }: CheckboxProps) {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const isChecked = checked !== undefined ? checked : internalChecked;
  const checkboxId = id ?? (typeof label === "string" ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (checked === undefined) setInternalChecked(e.target.checked);
    onChange?.(e.target.checked);
  }

  return (
    <label
      htmlFor={checkboxId}
      className={`inline-flex gap-2.5 mk-body-sm text-mk-fg-1 select-none ${description ? "items-start" : "items-center"} ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${className}`}
    >
      <span className={`relative inline-flex w-[18px] h-[18px] shrink-0 ${description ? "mt-0.5" : ""}`}>
        <input
          type="checkbox"
          id={checkboxId}
          checked={isChecked}
          onChange={handleChange}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed peer"
          {...props}
        />
        <span
          className={`w-full h-full rounded-xs border flex items-center justify-center shrink-0 transition-colors duration-base ease-standard
            peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-mk-blue-500/50
            ${isChecked ? "bg-mk-blue-500 border-mk-blue-500" : "bg-white border-mk-ink-300"}`}
        >
          {isChecked && <Check size={13} className="text-white" strokeWidth={3} />}
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

export { Checkbox };
export type { CheckboxProps };
