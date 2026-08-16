"use client";

import Link from "next/link";
import Image from "next/image";
import { createPortal } from "react-dom";
import { useState, useRef, useEffect } from "react";
import { X, ChevronDown, Check, LogOut, PanelLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";

/** Shared aside shell (brand header + mobile close + scroll area + footer
 * slot) used by both the admin and employee sidebars, so the structural
 * markup and mobile/desktop responsive behavior live in one place.
 * Reads sidebarCollapsed straight from context (rather than a prop) so
 * SidebarNavLink/SidebarUserCard usages in Sidebar.tsx/EmployeeSidebar.tsx
 * can do the same without threading it through here first. */
export function SidebarShell({
  dir,
  sidebarOpen,
  onCloseSidebar,
  brandAr,
  brandEn,
  children,
  footer,
}: {
  dir: "rtl" | "ltr";
  sidebarOpen: boolean;
  onCloseSidebar: () => void;
  brandAr: string;
  brandEn: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  const ar = dir === "rtl";
  const hiddenTranslate = dir === "rtl" ? "translate-x-full" : "-translate-x-full";
  const { sidebarCollapsed, toggleSidebarCollapsed } = useAdmin();

  return (
    <aside
      className={[
        "fixed inset-y-0 start-0 z-50 w-[272px]",
        "transition-[transform,width] duration-300 ease-in-out",
        sidebarOpen ? "translate-x-0" : hiddenTranslate,
        "lg:sticky lg:top-5 lg:z-auto lg:translate-x-0",
        "lg:h-[calc(100vh-36px)] lg:inset-y-auto lg:start-auto",
        sidebarCollapsed ? "lg:w-auto" : "lg:w-[272px]",
        "flex flex-col overflow-y-auto bg-white rounded-none lg:rounded-2xl shadow-card gap-1 mk-scrollbar-none p-4",
      ].join(" ")}
    >
      <div className={`flex items-center gap-3 pb-4 ${sidebarCollapsed ? "lg:flex-col lg:gap-2" : ""}`}>
        <button
          type="button"
          onClick={toggleSidebarCollapsed}
          className="w-11 h-11 rounded-md flex items-center justify-center shrink-0 p-2 bg-mk-blue-50 border-0 cursor-pointer transition-transform active:scale-95"
          aria-label={sidebarCollapsed ? (ar ? "توسيع القائمة" : "Expand sidebar") : (ar ? "طي القائمة" : "Collapse sidebar")}
          title={sidebarCollapsed ? (ar ? "توسيع القائمة" : "Expand sidebar") : (ar ? "طي القائمة" : "Collapse sidebar")}
        >
          <Image src="/assets/logo-symbol-v2.png" alt="Maarkbh" width={28} height={12} className="object-contain" />
        </button>
        <div className={sidebarCollapsed ? "flex-1 lg:hidden" : "flex-1"}>
          <div className="mk-h4 leading-none text-mk-ink-900 tracking-tight">{ar ? brandAr : brandEn}</div>
          <div className="mk-overline mt-1 text-mk-ink-400 tracking-brand font-arabic normal-case tracking-wide">
            {ar ? brandEn : brandAr}
          </div>
        </div>
        <button
          onClick={onCloseSidebar}
          className="lg:hidden w-8 h-8 rounded-full flex items-center justify-center text-mk-ink-500 hover:text-mk-ink-900 hover:bg-mk-ink-100 border-0 cursor-pointer transition-colors"
          aria-label="Close sidebar"
        >
          <X size={18} />
        </button>
        {/* Collapse-only trigger — expanding back relies on clicking the
            logo instead (see the button wrapping it above), so this only
            needs to render while expanded. */}
        {!sidebarCollapsed && (
          <button
            onClick={toggleSidebarCollapsed}
            className="hidden lg:flex w-8 h-8 -me-1 rounded-full items-center justify-center text-mk-ink-500 hover:text-mk-ink-900 hover:bg-mk-ink-100 border-0 cursor-pointer transition-colors shrink-0"
            aria-label={ar ? "طي القائمة" : "Collapse sidebar"}
            title={ar ? "طي القائمة" : "Collapse sidebar"}
          >
            <PanelLeft size={18} className={dir === "rtl" ? "-scale-x-100" : ""} />
          </button>
        )}
      </div>

      {children}

      <div className="flex-1" />

      {footer}
    </aside>
  );
}

interface SidebarNavLinkProps {
  href: string;
  icon: LucideIcon;
  label: string;
  labelAr: string;
  ar: boolean;
  active: boolean;
  dir: "rtl" | "ltr";
  badge?: number;
  onClick?: () => void;
  /** Icon-only rail mode (desktop-only — see SidebarShell). Label and full
   * badge count hide; the badge collapses to a small dot so "something
   * needs attention" still reads without the number. */
  collapsed?: boolean;
}

export function SidebarNavLink({ href, icon: Icon, label, labelAr, ar, active, dir, badge, onClick, collapsed }: SidebarNavLinkProps) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // The sidebar rail scrolls (overflow-y-auto), and CSS forces overflow-x
  // to auto the moment overflow-y isn't visible — there's no pure-CSS way
  // to scroll one axis while letting the other paint outside the box. A
  // portal + position:fixed (computed from the link's own screen rect)
  // sidesteps that clipping entirely instead of fighting it.
  function showTooltip() {
    if (!collapsed) return;
    const rect = linkRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltipPos({
      top: rect.top + rect.height / 2,
      left: dir === "rtl" ? rect.left - 10 : rect.right + 10,
    });
    setTooltipVisible(true);
  }

  return (
    <>
      <Link
        ref={linkRef}
        href={href}
        onClick={onClick}
        onMouseEnter={showTooltip}
        onMouseLeave={() => setTooltipVisible(false)}
        aria-label={collapsed ? (ar ? labelAr : label) : undefined}
        className={`group mk-nav-item flex items-center gap-3 px-3 py-2.5 rounded-md mk-body-sm transition-all duration-fast relative mb-1 no-underline ${collapsed ? "lg:w-11 lg:h-11 lg:justify-center lg:p-0 lg:mx-auto" : ""} ${active ? "mk-nav-active bg-mk-blue-surface text-mk-blue-500" : "bg-transparent text-mk-ink-600 hover:bg-mk-ink-50"
          }`}
      >
        {collapsed && badge !== undefined && (
          <span className="hidden lg:block absolute top-1 end-1 w-2 h-2 rounded-full bg-mk-danger ring-2 ring-[color:var(--bg-elevated)]" />
        )}
        <span className="relative shrink-0 flex items-center justify-center">
          <Icon size={18} />
        </span>
        <span className={collapsed ? "flex-1 lg:hidden" : "flex-1"}>{ar ? labelAr : label}</span>
        {badge !== undefined && (
          <Badge variant="danger" size="sm" className={`min-w-5 justify-center uppercase tracking-wide ${collapsed ? "lg:hidden" : ""}`}>
            {badge}
          </Badge>
        )}
      </Link>

      {/* Animated tooltip — icon-only rail mode only, portaled to <body> so
          the sidebar's own overflow-y-auto can clip it. Fade + slide,
          driven by hover state rather than CSS :hover since position is
          computed in JS. Fixed dark literal (not a --mk-ink-* token) since
          ink-900 flips to white in dark mode, which would erase a tooltip
          built on that token. */}
      {collapsed && mounted && createPortal(
        <span
          className={`mk-sidebar-tooltip hidden lg:block fixed z-[100] px-2.5 py-1.5 rounded-md bg-[#1A1D2E] text-white mk-caption text-[13px] whitespace-nowrap shadow-lg pointer-events-none transition-[opacity,transform] duration-200 ease-standard ${tooltipVisible ? "opacity-100" : "opacity-0"
            }`}
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
            // RTL anchors the tooltip's *right* edge to `left`, so its own
            // box is shifted back by -100% first; the extra few px on top
            // of that (in either direction) is just the hover slide-in.
            transform: `translateY(-50%) translateX(calc(${dir === "rtl" ? "-100%" : "0%"} ${tooltipVisible ? "+ 0px" : dir === "rtl" ? "+ 4px" : "- 4px"}))`,
          }}
        >
          {ar ? labelAr : label}
          {/* Pointer arrow — always on the tooltip's right edge (not
              dir-conditional), sharing the tooltip's own background
              classes so it never drifts out of sync with its color. */}
          <span
            className="mk-sidebar-tooltip absolute top-1/2 w-1.5 h-1.5 rotate-45 bg-[#1A1D2E]"
            style={{ right: -3, marginTop: -3 }}
          />
        </span>,
        document.body
      )}
    </>
  );
}

/** Current-role control — a trigger showing the active role that opens a
 * small dropdown to switch to the other one. Used standalone (e.g. in a
 * Topbar), not tied to the sidebar despite the name. */
export function SidebarRoleSwitcher({
  ar,
  activeIsFirst,
  firstLabelAr,
  firstLabelEn,
  secondLabelAr,
  secondLabelEn,
  onSelectOther,
}: {
  ar: boolean;
  activeIsFirst: boolean;
  firstLabelAr: string;
  firstLabelEn: string;
  secondLabelAr: string;
  secondLabelEn: string;
  onSelectOther: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const options = [
    { isFirst: true, labelAr: firstLabelAr, labelEn: firstLabelEn },
    { isFirst: false, labelAr: secondLabelAr, labelEn: secondLabelEn },
  ];
  const activeLabel = activeIsFirst ? (ar ? firstLabelAr : firstLabelEn) : (ar ? secondLabelAr : secondLabelEn);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className={`flex items-center gap-2 h-9 ps-3.5 pe-2.5 rounded-full mk-label border-0 cursor-pointer transition-colors whitespace-nowrap ${open ? "bg-mk-blue-100 text-mk-blue-700" : "bg-mk-ink-50 text-mk-ink-700 hover:bg-mk-ink-100"
          }`}
      >
        {activeLabel}
        <ChevronDown size={14} className={`shrink-0 transition-transform duration-[var(--duration-fast)] ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute z-50 w-[180px] mk-surface rounded-[14px] overflow-hidden py-1 mk-shadow-menu"
          style={{ top: "calc(100% + 6px)", insetInlineEnd: 0 }}
        >
          {options.map((opt) => {
            const active = opt.isFirst === activeIsFirst;
            return (
              <button
                key={opt.isFirst ? "first" : "second"}
                type="button"
                onClick={() => { setOpen(false); if (!active) onSelectOther(); }}
                className={`w-full flex items-center justify-between gap-2.5 px-4 py-[9px] mk-label-muted text-start border-0 bg-transparent cursor-pointer transition-colors ${active ? "text-mk-blue-600 font-semibold" : "text-mk-ink-800 hover:bg-mk-ink-50"
                  }`}
              >
                {ar ? opt.labelAr : opt.labelEn}
                {active && <Check size={14} className="shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SidebarUserCard({
  ar,
  initials,
  gradient,
  name,
  nameAr,
  sub,
  subAr,
  onToggleDir,
  onLogout,
  collapsed,
}: {
  ar: boolean;
  initials: { ar: string; en: string };
  gradient: string;
  name: string;
  nameAr: string;
  sub: string;
  subAr: string;
  onToggleDir: () => void;
  onLogout?: () => void;
  /** Icon-only rail mode (desktop-only — see SidebarShell). Name/sub text
   * and the logout button hide; avatar stays, with the full name as a
   * native tooltip so identity is still one hover away. */
  collapsed?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 px-1 pt-3 mt-1
     ${collapsed ? "lg:justify-center" : ""}`}>
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-white mk-label shrink-0"
        style={{ background: gradient }}
        title={collapsed ? (ar ? nameAr : name) : undefined}
      >
        {ar ? initials.ar : initials.en}
      </div>
      <div className={collapsed ? "min-w-0 flex-1 lg:hidden" : "min-w-0 flex-1"}>
        <div className="mk-label leading-[var(--lh-h2)] truncate text-mk-ink-900">{ar ? nameAr : name}</div>
        <div
          className="mk-overline normal-case tracking-normal truncate text-mk-ink-500 cursor-pointer"
          onClick={onToggleDir}
          title="Toggle language"
        >
          {ar ? subAr : sub}
        </div>
      </div>
      {onLogout && (
        <button
          type="button"
          onClick={onLogout}
          title={ar ? "تسجيل الخروج" : "Log out"}
          aria-label={ar ? "تسجيل الخروج" : "Log out"}
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-0 bg-transparent cursor-pointer text-mk-ink-400 hover:text-mk-danger hover:bg-mk-danger/8 transition-colors ${collapsed ? "lg:hidden" : ""}`}
        >
          <LogOut size={16} />
        </button>
      )}
    </div>
  );
}
