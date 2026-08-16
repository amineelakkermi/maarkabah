"use client";

import { useEffect, ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton } from "./IconButton";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** Extra controls rendered in the header, before the close button. */
  headerActions?: ReactNode;
  className?: string;
  variant?: "fullscreen" | "centered";
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "full";
}

/** Full-screen overlay or centered modal dialog: backdrop + header (title + close) + body slot. */
function Modal({
  open,
  onClose,
  title,
  children,
  headerActions,
  className = "",
  variant = "fullscreen",
  size = "4xl",
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  if (variant === "centered") {
    const sizeClasses: Record<string, string> = {
      sm: "max-w-sm",
      md: "max-w-md",
      lg: "max-w-lg",
      xl: "max-w-xl",
      "2xl": "max-w-2xl",
      "3xl": "max-w-3xl",
      "4xl": "max-w-4xl",
      "5xl": "max-w-5xl",
      "6xl": "max-w-6xl",
      full: "max-w-[95vw]",
    };

    const maxW = sizeClasses[size] || "max-w-4xl";

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/65 backdrop-blur-md animate-[fi_0.2s_ease-out]">
        <div className="fixed inset-0" onClick={onClose} />
        <div
          className={`relative flex flex-col w-full ${maxW} max-h-[96vh] sm:max-h-[92vh] mk-surface rounded-xl sm:rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.35)] overflow-hidden border border-mk-border ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-mk-border shrink-0 bg-mk-bg-muted gap-2">
            <div className="mk-h4 text-mk-fg-1 truncate min-w-0">{title}</div>
            <div className="flex items-center gap-2 shrink-0">
              {headerActions}
              <IconButton size="sm" onClick={onClose} aria-label="Close">
                <X size={16} />
              </IconButton>
            </div>
          </div>
          <div className="flex-1 min-h-0 relative overflow-y-auto">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col mk-surface">
      <div className={`flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-mk-border shrink-0 gap-2 ${className}`}>
        <div className="mk-h4 text-mk-fg-1 truncate min-w-0">{title}</div>
        <div className="flex items-center gap-2 shrink-0">
          {headerActions}
          <IconButton size="sm" onClick={onClose} aria-label="Close">
            <X size={16} />
          </IconButton>
        </div>
      </div>
      <div className="flex-1 min-h-0 relative">{children}</div>
    </div>
  );
}

export { Modal };
export type { ModalProps };
