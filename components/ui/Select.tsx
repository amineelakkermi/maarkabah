"use client";

import { SelectHTMLAttributes, forwardRef } from "react";
import { ChevronDown } from "lucide-react";

type SelectSize = "sm" | "md" | "lg";

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  label?: string;
  helpText?: string;
  size?: SelectSize;
}

// Same rule as Button: sm/md share one type-scale rung (only padding/height
// grow), lg steps up one rung.
const sizeClasses: Record<SelectSize, string> = {
  sm: "h-8 px-2.5 pe-7 mk-body-sm",
  md: "h-10 px-3 pe-9 mk-body-sm",
  lg: "h-12 px-4 pe-10 mk-body",
};

const chevronSizeClasses: Record<SelectSize, { size: number; className: string }> = {
  sm: { size: 12, className: "end-2.5" },
  md: { size: 14, className: "end-3" },
  lg: { size: 16, className: "end-3.5" },
};

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, helpText, size = "md", className = "", id, children, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    const chevron = chevronSizeClasses[size];

    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label
            htmlFor={selectId}
            className="mk-body-sm text-mk-fg-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`
              font-[family-name:var(--font-body)] w-full
              rounded-md border border-mk-ink-200 bg-white text-mk-fg-1
              transition-[border-color,box-shadow] duration-base ease-standard
              focus:outline-none focus:border-mk-blue-500 focus:shadow-[var(--shadow-focus)]
              appearance-none cursor-pointer
              ${sizeClasses[size]}
              ${className}
            `}
            {...props}
          >
            {children}
          </select>
          <ChevronDown size={chevron.size} className={`absolute top-1/2 -translate-y-1/2 text-mk-ink-400 pointer-events-none ${chevron.className}`} />
        </div>
        {helpText && (
          <p className="mk-caption text-mk-fg-3">{helpText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
export { Select };
export type { SelectProps, SelectSize };
