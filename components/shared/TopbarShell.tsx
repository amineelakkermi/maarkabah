"use client";

import { Search, Bell, Sun, Moon, Menu } from "lucide-react";
import { IconButton, Input } from "@/components/ui";
import type { ReactNode } from "react";

interface TopbarShellProps {
  onOpenSidebar: () => void;
  titleBlock: ReactNode;
  searchPlaceholder: string;
  isDark: boolean;
  onToggleDark: () => void;
  /** Extra content rendered after the dark-mode toggle (e.g. the admin "New contract" CTA). */
  trailing?: ReactNode;
}

/** Shared topbar chrome (hamburger + title slot + search pill + bell +
 * dark-mode toggle) used by both the admin and employee topbars. */
export function TopbarShell({ onOpenSidebar, titleBlock, searchPlaceholder, isDark, onToggleDark, trailing }: TopbarShellProps) {
  return (
    <div className="flex items-center gap-3 mb-6 pt-4 lg:pt-0">
      <IconButton size="md" className="lg:hidden" onClick={onOpenSidebar} aria-label="Open menu">
        <Menu size={18} />
      </IconButton>

      <div className="min-w-0">{titleBlock}</div>

      <div className="flex-1" />

      <div className="hidden md:block w-[260px] xl:w-[320px] shrink-0">
        <Input
          variant="search"
          icon={<Search size={14} />}
          placeholder={searchPlaceholder}
          suffix={
            <kbd className="mk-overline normal-case tracking-normal font-mono px-2 py-1 rounded-xs bg-mk-ink-100 text-mk-ink-600 hidden lg:inline shrink-0">
              ⌘K
            </kbd>
          }
        />
      </div>

      <IconButton size="md" className="md:hidden">
        <Search size={18} />
      </IconButton>

      <IconButton size="md" className="relative">
        <Bell size={18} />
        <span className="absolute top-3 end-[11px] w-2 h-2 rounded-full border-2 border-white bg-mk-danger" />
      </IconButton>

      <IconButton size="md" onClick={onToggleDark} title={isDark ? "Light mode" : "Dark mode"}>
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </IconButton>

      {trailing}
    </div>
  );
}
