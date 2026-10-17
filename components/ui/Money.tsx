import type { ReactNode } from "react";
import { RiyalSymbol } from "./RiyalSymbol";

// Riyal amount: symbol + value inline — the icon inherits currentColor and the
// figure stays LTR so it reads the same in both layouts.
export function Money({ size = 12, className, children }: { size?: number; className?: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ""}`} dir="ltr">
      <RiyalSymbol size={size} />
      <span>{children}</span>
    </span>
  );
}
