"use client";

import { InputHTMLAttributes, forwardRef, ReactNode } from "react";

type InputVariant = "default" | "search" | "muted";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  helpText?: string;
  error?: string;
  variant?: InputVariant;
  /** Icon shown at the start of the field (e.g. a search glyph). */
  icon?: ReactNode;
  /** Trailing content inside the field — a clear button, a ⌘K hint, etc.
   * Only rendered for variant="search", which owns the whole pill as one
   * focus target instead of the bare `<input>` owning its own ring. */
  suffix?: ReactNode;
}

// Split so an error state can swap just the border color without losing
// the variant's own radius/background (both live in the same "border-*"
// utility group, so mixing them in one string left the winner to
// Tailwind's arbitrary class order instead of this component's intent).
const variantShapeClasses: Record<InputVariant, string> = {
  default: "bg-white rounded-md",
  search: "bg-transparent rounded-pill",
  // Filled well look used in drawers/forms (e.g. registration, OTP).
  muted: "bg-mk-ink-50 rounded-md",
};

const variantBorderClasses: Record<InputVariant, string> = {
  default: "border-mk-ink-200",
  search: "border-transparent",
  muted: "border-mk-ink-100",
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helpText, error, variant = "default", icon, suffix, className = "", id, ...props }, ref) => {
    const inputId = id ?? (typeof label === "string" ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    // Search fields put the pill itself (icon + input + suffix) behind one
    // focus-within ring — previously the bare <input> carried its own
    // focus:border/shadow, which (since it has no border/bg of its own)
    // rendered as a small ring hugging just the text caret area instead of
    // the whole search bar the user actually sees as "the field".
    if (variant === "search") {
      return (
        <div className="flex flex-col gap-2">
          {label && (
            <label htmlFor={inputId} className="mk-body-sm text-mk-fg-1">
              {label}
            </label>
          )}
          <div
            className={`
              flex items-center gap-3 h-10 px-5 rounded-pill mk-surface text-mk-ink-500
              border border-transparent
              transition-[border-color,box-shadow] duration-base ease-standard
              focus-within:border-mk-blue-500 focus-within:shadow-[var(--shadow-focus)]
              ${className}
            `}
          >
            {icon && <span className="shrink-0 flex items-center">{icon}</span>}
            <input
              ref={ref}
              id={inputId}
              className="flex-1 min-w-0 bg-transparent border-0 outline-none mk-body-sm text-mk-ink-900 placeholder:text-mk-ink-400 font-[family-name:var(--font-body)]"
              {...props}
            />
            {suffix}
          </div>
          {error && <p className="mk-caption text-mk-danger">{error}</p>}
          {helpText && !error && <p className="mk-caption text-mk-fg-3">{helpText}</p>}
        </div>
      );
    }

    const field = (
      <input
        ref={ref}
        id={inputId}
        className={`
          font-[family-name:var(--font-body)] mk-body-sm h-10 px-3
          border text-mk-fg-1 w-full
          placeholder:text-mk-ink-400
          transition-[border-color,box-shadow] duration-base ease-standard
          focus:outline-none focus:border-mk-blue-500 focus:shadow-[var(--shadow-focus)]
          ${variantShapeClasses[variant]}
          ${error ? "border-mk-danger" : variantBorderClasses[variant]}
          ${icon ? "ps-9" : ""}
          ${suffix ? "pe-9" : ""}
          ${className}
        `}
        {...props}
      />
    );

    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label htmlFor={inputId} className="mk-body-sm text-mk-fg-1">
            {label}
          </label>
        )}
        {icon || suffix ? (
          <div className="relative flex items-center">
            {icon && <span className="absolute start-3 text-mk-ink-400 pointer-events-none flex items-center">{icon}</span>}
            {field}
            {suffix && <span className="absolute end-3 flex items-center">{suffix}</span>}
          </div>
        ) : (
          field
        )}
        {error && <p className="mk-caption text-mk-danger">{error}</p>}
        {helpText && !error && <p className="mk-caption text-mk-fg-3">{helpText}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export { Input };
export type { InputProps, InputVariant };
