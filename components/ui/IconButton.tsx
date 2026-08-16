import { ButtonHTMLAttributes, forwardRef } from "react";

type IconButtonSize = "sm" | "md" | "lg";
type IconButtonVariant = "surface" | "ghost" | "active";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: IconButtonSize;
  variant?: IconButtonVariant;
}

const sizeClasses: Record<IconButtonSize, string> = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
};

const variantClasses: Record<IconButtonVariant, string> = {
  // Default recurring pattern across topbars/sidebars/modals: a circular
  // white surface with the shared card shadow.
  surface: "bg-white shadow-[var(--shadow-card)] text-mk-ink-600 hover:text-mk-ink-900",
  ghost: "bg-transparent text-mk-ink-500 hover:bg-mk-ink-100 hover:text-mk-ink-900",
  active: "bg-mk-blue-100 text-mk-blue-500",
};

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ size = "md", variant = "surface", className = "", children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={`inline-flex items-center justify-center rounded-full border-0 cursor-pointer transition-colors duration-base ease-standard shrink-0 ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
);

IconButton.displayName = "IconButton";
export { IconButton };
export type { IconButtonProps, IconButtonSize, IconButtonVariant };
