"use client";

import { Search, Sun, Moon, Menu, Languages } from "lucide-react";
import { IconButton, Input } from "@/components/ui";
import { NotificationsDropdown } from "@/components/shared/NotificationsDropdown";
import { useAdmin } from "@/contexts/AdminContext";
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
 * language toggle + dark-mode toggle) used by both the admin and employee topbars. */
export function TopbarShell({ onOpenSidebar, titleBlock, searchPlaceholder, isDark, onToggleDark, trailing }: TopbarShellProps) {
  const { dir, toggleDir } = useAdmin();
  const ar = dir === "rtl";
  return (
    <div className="flex items-center gap-3 mb-6 pt-4 lg:pt-0">
      <IconButton size="md" className="lg:hidden" onClick={onOpenSidebar} aria-label="Open menu">
        <Menu size={18} />
      </IconButton>

      <div className="min-w-0 mt-3 gap-3 flex flex-col">{titleBlock}</div>

      <div className="flex-1" />

      {/* Global search collapses to nothing on mobile rather than a dead
          icon trigger — pages with their own search (e.g. the contracts
          list) already surface a working mobile trigger for that field,
          and a second non-functional search icon here was redundant. */}
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

      <NotificationsDropdown />

      <IconButton
        size="md"
        onClick={toggleDir}
        title={ar ? "English" : "العربية"}
        aria-label={ar ? "Switch to English" : "التبديل إلى العربية"}
      >
        <Languages size={18} />
      </IconButton>

      <IconButton size="md" onClick={onToggleDark} title={isDark ? "Light mode" : "Dark mode"}>
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </IconButton>

      {trailing}
    </div>
  );
}
