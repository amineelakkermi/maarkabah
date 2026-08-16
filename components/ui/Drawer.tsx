"use client";

import { useEffect, ReactNode, HTMLAttributes } from "react";
import { X } from "lucide-react";
import { IconButton } from "./IconButton";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Disable the Escape-to-close and backdrop-click-to-close behavior. */
  dismissible?: boolean;
}

/** Backdrop + slide-in panel, built on the existing .mk-drawer /
 * .mk-drawer-backdrop CSS (see app/globals.css) so it matches every
 * hand-rolled drawer already in the app. */
function Drawer({ open, onClose, children, dismissible = true }: DrawerProps) {
  useEffect(() => {
    if (!open || !dismissible) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, dismissible, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="mk-drawer-backdrop" onClick={dismissible ? onClose : undefined} />
      <div className="mk-drawer flex flex-col">{children}</div>
    </>
  );
}

interface DrawerHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  sub?: ReactNode;
  onClose: () => void;
}

function DrawerHeader({ title, sub, onClose, className = "", ...props }: DrawerHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-3 mb-5 shrink-0 ${className}`} {...props}>
      <div className="min-w-0">
        <div className="mk-h4 text-mk-fg-1">{title}</div>
        {sub && <div className="mk-caption text-mk-fg-3 mt-1">{sub}</div>}
      </div>
      <IconButton size="sm" onClick={onClose} aria-label="Close">
        <X size={16} />
      </IconButton>
    </div>
  );
}

interface DrawerFooterProps extends HTMLAttributes<HTMLDivElement> {}

function DrawerFooter({ className = "", children, ...props }: DrawerFooterProps) {
  return (
    <div className={`flex items-center justify-end gap-3 mt-6 pt-5 border-t border-mk-border shrink-0 ${className}`} {...props}>
      {children}
    </div>
  );
}

export { Drawer, DrawerHeader, DrawerFooter };
export type { DrawerProps };
