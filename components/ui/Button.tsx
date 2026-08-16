import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "tonal" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-mk-blue-500 text-white border-transparent hover:bg-mk-blue-600 shadow-[var(--shadow-xs)]",
  secondary: "bg-mk-ink-100 text-mk-ink-900 border-transparent hover:bg-mk-ink-200",
  // Medium-emphasis: blue tint tile, matching the logo mark's light/dark
  // surface treatment — for actions that matter but shouldn't compete with
  // primary. bg/text ride the theme-aware blue-surface & blue-500 tokens so
  // it auto-adjusts across light/dark instead of a fixed brand hex.
  tonal: "bg-mk-blue-surface text-mk-blue-500 border-transparent hover:bg-mk-blue-100",
  ghost: "bg-transparent text-mk-blue-500 border-transparent hover:bg-mk-blue-50",
  outline: "bg-white text-mk-ink-900 border-mk-ink-200 hover:border-mk-ink-300",
  danger: "bg-mk-danger text-white border-transparent hover:opacity-90",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-4 h-9 mk-body-sm",
  md: "px-5 py-3 mk-body-sm",
  lg: "px-6 py-3 mk-body",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", disabled, className = "", children, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center gap-2 font-semibold rounded-pill border cursor-pointer transition-[background,color,border-color] duration-base ease-standard active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mk-blue-500/50 select-none";

    const disabledClasses = disabled
      ? "bg-mk-ink-100 text-mk-ink-300 border-transparent cursor-not-allowed pointer-events-none"
      : variantClasses[variant];

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`${base} ${sizeClasses[size]} ${disabledClasses} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export { Button };
export type { ButtonProps, Variant as ButtonVariant, Size as ButtonSize };
