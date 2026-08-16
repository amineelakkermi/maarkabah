import { HTMLAttributes } from "react";

type BadgeVariant =
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "violet"
  | "neutral"
  | "solid"
  | "inverse";

type BadgeSize = "sm" | "md" | "lg";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  info:    "bg-mk-blue-50      text-mk-blue-700",
  success: "bg-mk-success-100  text-mk-success-700",
  warning: "bg-mk-warning-100  text-mk-warning-700",
  danger:  "bg-mk-danger-100   text-mk-danger-700",
  violet:  "bg-mk-violet-100   text-mk-violet-700",
  neutral: "bg-mk-ink-100      text-mk-ink-700",
  solid:   "bg-mk-blue-500     text-white",
  // For use on a colored/solid background (e.g. active sidebar nav item,
  // active tab) where a regular light-bg badge would disappear.
  inverse: "bg-white/[0.22]    text-white",
};

// Same rule as Button: sm/md share one type-scale rung (only padding grows),
// lg steps up one rung — never mixed independently of the size prop.
const sizeClasses: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 mk-caption",
  md: "px-3 py-1 mk-caption",
  lg: "px-4 py-1.5 mk-label",
};

const dotSizeClasses: Record<BadgeSize, string> = {
  sm: "w-1 h-1",
  md: "w-1.5 h-1.5",
  lg: "w-2 h-2",
};

function Badge({ variant = "neutral", size = "md", dot = false, className = "", children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-pill ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {dot && (
        <span className={`rounded-full bg-current shrink-0 ${dotSizeClasses[size]}`} />
      )}
      {children}
    </span>
  );
}

export { Badge };
export type { BadgeProps, BadgeVariant, BadgeSize };
