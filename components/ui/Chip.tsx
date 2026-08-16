import { ButtonHTMLAttributes } from "react";

type ChipSize = "sm" | "md" | "lg";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  size?: ChipSize;
}

// Same rule as Button: sm/md share one type-scale rung (only padding grows),
// lg steps up one rung.
const sizeClasses: Record<ChipSize, string> = {
  sm: "px-2.5 py-1 mk-body-sm",
  md: "px-3 py-2 mk-body-sm",
  lg: "px-4 py-2.5 mk-body",
};

function Chip({ active = false, size = "md", className = "", children, ...props }: ChipProps) {
  return (
    <button
      className={`
        inline-flex items-center rounded-pill cursor-pointer
        border transition-[background,color,border-color] duration-base ease-standard
        ${sizeClasses[size]}
        ${active
          ? "mk-chip--active bg-mk-ink-900 text-white border-mk-ink-900"
          : "bg-transparent text-mk-ink-600 border-mk-ink-200 hover:border-mk-ink-300 hover:text-mk-ink-900"
        }
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}

export { Chip };
export type { ChipProps, ChipSize };
