"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sun, Moon, LayoutDashboard, Users, MoreVertical, ChevronDown, LayoutGrid, List as ListIcon, Check, Car, CalendarDays, Banknote, Clock, AlertTriangle, Search, Bell, Plus, X as XIcon, MapPin, Pencil, Copy, Share2, Trash2, Map, BarChart3 } from "lucide-react";
import {
  Button,
  Badge,
  Chip,
  Card,
  CardHeader,
  CardIcon,
  CardTitle,
  CardMeta,
  CardBody,
  CardFooter,
  Input,
  Select,
  Toggle,
  Avatar,
  KpiCard,
  Spark,
  AlertBanner,
  IconButton,
  Tabs,
  Modal,
  Drawer,
  DrawerHeader,
  DrawerFooter,
  Table,
  Tr,
  Th,
  Td,
  RiyalSymbol,
  HijriDatePicker,
  useToast,
  Checkbox,
  Radio,
} from "@/components/ui";
import { useAdmin } from "@/contexts/AdminContext";

/* ------------------------------------------------------------------ */
/* Section wrapper                                                       */
/* ------------------------------------------------------------------ */
function Section({ id, title, meta, children }: { id: string; title: string; meta?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="flex flex-col gap-6 scroll-mt-20">
      <div className="flex items-baseline justify-between border-b border-mk-border pb-3">
        <h2 className="mk-h4 tracking-tight text-mk-fg-1">{title}</h2>
        {meta && <code className="font-mono mk-caption text-mk-fg-3">{meta}</code>}
      </div>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Usage snippet — import + example, for the component hub            */
/* ------------------------------------------------------------------ */
function Usage({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative mk-surface rounded-lg border border-mk-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-mk-border bg-mk-ink-50">
        <span className="mk-overline uppercase tracking-wider text-mk-ink-400">Usage</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="mk-caption text-mk-blue-500 bg-transparent border-0 cursor-pointer hover:text-mk-blue-600"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="m-0 px-4 py-3 overflow-x-auto"><code className="font-mono mk-caption text-mk-ink-700 whitespace-pre">{code}</code></pre>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hub navigation — grouped sections + scrollspy                       */
/* ------------------------------------------------------------------ */
const NAV_GROUPS: { label: string; items: { id: string; label: string }[] }[] = [
  {
    label: "Foundations",
    items: [
      { id: "colours", label: "Colours" },
      { id: "typography", label: "Typography" },
      { id: "spacing", label: "Spacing" },
      { id: "radius", label: "Radius" },
      { id: "elevation", label: "Elevation" },
      { id: "motion", label: "Motion" },
      { id: "iconography", label: "Iconography" },
    ],
  },
  {
    label: "Components",
    items: [
      { id: "buttons", label: "Buttons" },
      { id: "badges-chips", label: "Badges & Chips" },
      { id: "avatar", label: "Avatar" },
      { id: "view-toggle", label: "View Toggle" },
      { id: "list", label: "List" },
      { id: "data-table", label: "Data Table" },
      { id: "overflow-menu", label: "Overflow Menu" },
      { id: "cards", label: "Cards" },
      { id: "form-inputs", label: "Form Inputs" },
      { id: "checkbox-radio", label: "Checkbox & Radio" },
      { id: "icon-button", label: "Icon Button" },
      { id: "tabs", label: "Tabs" },
      { id: "table", label: "Table" },
      { id: "modal-drawer", label: "Modal & Drawer" },
      { id: "riyal-hijri", label: "Riyal & Hijri Date" },
      { id: "kpi-card", label: "KPI Card" },
      { id: "spark", label: "Spark" },
      { id: "alert-banner", label: "Alert Banner" },
    ],
  },
  {
    label: "Patterns & Audits",
    items: [
      { id: "logo-assets", label: "Logo Assets" },
      { id: "admin-kpi", label: "Admin KPI Cards" },
      { id: "vehicle-status", label: "Vehicle Status" },
    ],
  },
];

function SideNav() {
  const [active, setActive] = useState<string>(NAV_GROUPS[0].items[0].id);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    NAV_GROUPS.forEach((g, idx) => {
      initial[g.label] = idx === 0;
    });
    return initial;
  });

  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ids = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.id));
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          const newActiveId = visible[0].target.id;
          setActive(newActiveId);
          const parentGroup = NAV_GROUPS.find((g) => g.items.some((item) => item.id === newActiveId));
          if (parentGroup) {
            setOpenGroups((prev) => ({ ...prev, [parentGroup.label]: true }));
          }
        }
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!active) return;
    const activeNavEl = document.getElementById(`nav-item-${active}`);
    if (activeNavEl) {
      activeNavEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [active]);

  const toggleGroup = (groupLabel: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupLabel]: !prev[groupLabel] }));
  };

  return (
    <nav
      ref={navRef}
      className="sticky top-20 flex flex-col gap-2.5 max-h-[calc(100vh-6rem)] overflow-y-auto ps-1 pe-2 scrollbar-thin"
    >
      {NAV_GROUPS.map((group) => {
        const isOpen = !!openGroups[group.label];
        const hasActive = group.items.some((i) => i.id === active);
        return (
          <div key={group.label} className="flex flex-col rounded-xl border border-mk-border/60 overflow-hidden bg-mk-surface/60 shadow-xs shrink-0">
            <button
              type="button"
              onClick={() => toggleGroup(group.label)}
              className="flex items-center justify-between px-3 py-2.5 mk-overline uppercase tracking-wider text-mk-fg-3 hover:text-mk-fg-1 hover:bg-mk-ink-50 border-0 bg-transparent cursor-pointer w-full text-start shrink-0"
            >
              <span className={`font-semibold text-[11px] ${hasActive ? "text-mk-blue-600" : ""}`}>
                {group.label} ({group.items.length})
              </span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${isOpen ? "rotate-180 text-mk-fg-1" : "rotate-0 text-mk-fg-3"}`}
              />
            </button>
            {isOpen && (
              <div className="flex flex-col gap-0.5 px-2 pb-2 pt-1 border-t border-mk-border/30 bg-mk-surface">
                {group.items.map((item) => {
                  const isItemActive = active === item.id;
                  return (
                    <a
                      key={item.id}
                      id={`nav-item-${item.id}`}
                      href={`#${item.id}`}
                      className={`mk-body-sm px-2.5 py-1.5 rounded-md no-underline transition-all duration-150 flex items-center justify-between shrink-0 ${
                        isItemActive
                          ? "bg-mk-blue-50 text-mk-blue-700 font-medium shadow-xs"
                          : "text-mk-fg-2 hover:bg-mk-ink-50 hover:text-mk-fg-1"
                      }`}
                    >
                      <span>{item.label}</span>
                      {isItemActive && <span className="w-1.5 h-1.5 rounded-full bg-mk-blue-500 shrink-0" />}
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function MobileNav() {
  return (
    <select
      className="lg:hidden mk-surface border border-mk-border rounded-md px-3 py-2 mk-body-sm text-mk-fg-1 mb-4"
      onChange={(e) => {
        const el = document.getElementById(e.target.value);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
      defaultValue=""
    >
      <option value="" disabled>Jump to section…</option>
      {NAV_GROUPS.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.items.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

/* ------------------------------------------------------------------ */
/* Colour swatch                                                        */
/* ------------------------------------------------------------------ */
function Swatch({ bg, label, hex, light = false }: { bg: string; label: string; hex: string; light?: boolean }) {
  return (
    <div className="flex-1 min-w-20 rounded-md p-4 flex flex-col justify-between min-h-28 border border-black/5" style={{ background: bg }}>
      <span className={`mk-caption ${light ? "text-black/50" : "text-white/70"}`}>{label}</span>
      <span className={`font-mono mk-caption ${light ? "text-mk-blue-700" : "text-white"}`}>{hex}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shadow tile                                                          */
/* ------------------------------------------------------------------ */
function ShadowTile({ shadow, label }: { shadow: string; label: string }) {
  return (
    <div className="flex-1 aspect-[1.5/1] mk-surface rounded-md flex flex-col justify-end px-3 py-3" style={{ boxShadow: shadow }}>
      <span className="font-mono mk-caption text-mk-fg-2">{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Radius tile                                                          */
/* ------------------------------------------------------------------ */
function RadiusTile({ radius, label }: { radius: string; label: string }) {
  return (
    <div className="flex-1 aspect-[1.4/1] bg-mk-blue-500 flex flex-col justify-end px-3 py-3" style={{ borderRadius: radius }}>
      <span className="font-mono mk-caption text-white/90">{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Overflow menu demo                                                   */
/* ------------------------------------------------------------------ */
type MenuTrigger = "icon" | "pill" | "row";

function OverflowMenuDemo() {
  const [open, setOpen] = useState<MenuTrigger | null>(null);
  const refs = {
    icon: useRef<HTMLDivElement>(null),
    pill: useRef<HTMLDivElement>(null),
    row: useRef<HTMLDivElement>(null),
  };

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const ref = refs[open];
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const menuItems = [
    { Icon: Pencil, label: "Edit" },
    { Icon: Copy, label: "Duplicate" },
    { Icon: Share2, label: "Share" },
    { divider: true },
    { Icon: Trash2, label: "Delete", danger: true },
  ];

  const Menu = () => (
    <div className="absolute z-50 w-[180px] mk-surface rounded-md overflow-hidden py-1 top-[calc(100%+6px)] end-0 mk-shadow-menu"
    >
      {menuItems.map((item, i) =>
        item.divider ? (
          <div key={i} className="my-1 border-t border-mk-ink-100" />
        ) : (
          <button key={i}
            className={`w-full flex items-center gap-3 px-4 py-3 mk-label text-start border-0 bg-transparent cursor-pointer transition-colors ${item.danger
 ? "text-mk-danger hover:bg-mk-danger/6"
 : "text-mk-ink-800 hover:bg-mk-ink-50"
 }`}
            onClick={() => setOpen(null)}
          >
            {item.Icon && <item.Icon size={14} />}{item.label}
          </button>
        )
      )}
    </div>
  );

  return (
    <div className="flex flex-wrap gap-8 items-start bg-mk-ink-50 rounded-lg p-6">
      {/* Trigger: icon only */}
      <div className="flex flex-col gap-3">
        <p className="mk-caption">Icon trigger</p>
        <div className="relative" ref={refs.icon}>
          <button
            onClick={() => setOpen(open === "icon" ? null : "icon")}
            className={`w-8 h-8 rounded-full flex items-center justify-center border-0 cursor-pointer transition-colors ${open === "icon" ? "bg-mk-blue-100 text-mk-blue-500" : "bg-mk-ink-100 text-mk-ink-500 hover:bg-mk-ink-200"
              }`}
          >
            <MoreVertical size={15} />
          </button>
          {open === "icon" && <Menu />}
        </div>
      </div>

      {/* Trigger: pill button */}
      <div className="flex flex-col gap-3">
        <p className="mk-caption">Pill trigger</p>
        <div className="relative" ref={refs.pill}>
          <button
            onClick={() => setOpen(open === "pill" ? null : "pill")}
            className="flex items-center gap-2 px-3 py-2 rounded-full mk-label border border-mk-ink-200 text-mk-ink-700 bg-transparent hover:bg-mk-ink-50 cursor-pointer transition-colors"
          >
            Actions <ChevronDown size={13} className={`transition-transform ${open === "pill" ? "rotate-180" : ""}`} />
          </button>
          {open === "pill" && <Menu />}
        </div>
      </div>

      {/* Trigger: row overflow */}
      <div className="flex flex-col gap-3 flex-1">
        <p className="mk-caption">Row overflow (hover to reveal)</p>
        <div className="mk-surface rounded-md overflow-hidden">
          {["Toyota Camry 2024", "Nissan Patrol 2024", "Kia Sportage 2024"].map((car, i, arr) => (
            <div key={car}
              className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-mk-ink-50"
              style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--color-mk-border)" : "none" }}
            >
              <div className="w-7 h-7 rounded-md bg-mk-ink-100 flex items-center justify-center text-mk-ink-500 shrink-0"><Car size={14} /></div>
              <span className="flex-1 mk-label text-mk-ink-900">{car}</span>
              <div className="relative" ref={i === 0 ? refs.row : undefined}>
                <button
                  onClick={() => setOpen(open === "row" && i === 0 ? null : i === 0 ? "row" : null)}
                  className="w-7 h-7 rounded-full flex items-center justify-center border-0 bg-transparent cursor-pointer text-mk-ink-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-mk-ink-100"
                >
                  <MoreVertical size={14} />
                </button>
                {open === "row" && i === 0 && <Menu />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main page                                                            */
/* ------------------------------------------------------------------ */
export default function DesignSystemPage() {
  const { isDark, toggleDark } = useAdmin();
  const [activeChip, setActiveChip] = useState("All");
  const [notify, setNotify] = useState(true);
  const [share, setShare] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState("map");
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hijriDate, setHijriDate] = useState("");
  const { showToast } = useToast();
  const [agree, setAgree] = useState(true);
  const [remember, setRemember] = useState(false);
  const [payMethod, setPayMethod] = useState("card");

  return (
    <div className="min-h-screen bg-mk-bg" dir="ltr">

      {/* ── Header — compact docs bar, sticky (not overlaying content) ── */}
      <header className="sticky top-0 z-50 bg-mk-surface/95 backdrop-blur-lg border-b border-mk-border">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4 px-6 md:px-16 h-16">
          <div className="flex items-center gap-3 min-w-0">
            <Image src="/assets/logo-symbol-v2.png" alt="Maarkbh" width={20} height={9} />
            <div className="flex flex-col leading-none min-w-0">
              <span className="mk-label text-mk-fg-1 truncate">Maarkbh Design System</span>
              <span className="mk-caption text-mk-fg-3">v1.0 · مكوّنات وطريقة الاستخدام</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/dashboard"
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full mk-label text-mk-fg-2 border border-mk-border hover:bg-mk-ink-50 hover:text-mk-fg-1 transition-colors no-underline"
            >
              <LayoutDashboard size={14} />Admin Portal
            </Link>
            <Link
              href="/employee/today"
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full mk-label text-mk-fg-2 border border-mk-border hover:bg-mk-ink-50 hover:text-mk-fg-1 transition-colors no-underline"
            >
              <Users size={14} />Employee Portal
            </Link>
            <IconButton variant="surface" onClick={toggleDark} aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}>
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </IconButton>
          </div>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────── */}
      <main className="max-w-[1440px] mx-auto px-6 md:px-16 py-16">
        <MobileNav />
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-10">
          <div className="flex flex-col gap-16 min-w-0 lg:order-2">
            <div>
              <h1 className="mk-h1 text-mk-fg-1">مركبة · Maarkbh Design System</h1>
              <p className="mk-body text-mk-fg-2 mt-2 max-w-[70ch]">
                مرجع شامل للمكونات، الأنماط، وطريقة استخدامها في الكود — Colours, Typography, Components, وأمثلة Usage جاهزة للنسخ.
              </p>
            </div>

        {/* ── Colours ──────────────────────────────────────── */}
        <Section id="colours" title="Colours" meta="--mk-*">
          <div>
            <p className="mk-caption mb-3">Brand Blue — primary · ~80% brand presence</p>
            <div className="flex gap-3">
              <Swatch bg="var(--color-mk-blue-50)" label="50" hex="#F1F5FE" light />
              <Swatch bg="var(--color-mk-blue-100)" label="100" hex="#E1E9FB" light />
              <Swatch bg="var(--color-mk-blue-500)" label="500 · primary" hex="#4171E2" />
              <Swatch bg="var(--color-mk-blue-600)" label="600 · hover" hex="#2E59BF" />
              <Swatch bg="var(--color-mk-blue-700)" label="700" hex="#1F3F95" />
            </div>
          </div>
          <div>
            <p className="mk-caption mb-3">Violet · Mint · Dark</p>
            <div className="flex gap-3">
              <Swatch bg="var(--color-mk-violet-500)" label="Violet 500" hex="#7F43DD" />
              <Swatch bg="var(--color-mk-violet-100)" label="Violet 100" hex="#ECDFFB" light />
              <Swatch bg="var(--color-mk-mint-500)" label="Mint 500" hex="#69DAD1" />
              <Swatch bg="var(--color-mk-mint-100)" label="Mint 100" hex="#DDF6F3" light />
              <Swatch bg="var(--color-mk-midnight)" label="Midnight" hex="#180D44" />
              <Swatch bg="var(--color-mk-navy)" label="Navy" hex="#1C2C63" />
            </div>
          </div>
          <div>
            <p className="mk-caption mb-3">Ink scale — neutrals</p>
            <div className="flex gap-2">
              {[
                { bg: "var(--color-mk-ink-900)", hex: "#0F1430", l: "900" }, { bg: "var(--color-mk-ink-800)", hex: "#1F2547", l: "800" },
                { bg: "var(--color-mk-ink-700)", hex: "#2D335A", l: "700" }, { bg: "var(--color-mk-ink-600)", hex: "#4A4F73", l: "600" },
                { bg: "var(--color-mk-ink-500)", hex: "#6E738F", l: "500" }, { bg: "var(--color-mk-ink-400)", hex: "#9296AB", l: "400" },
                { bg: "var(--color-mk-ink-300)", hex: "#BCBFCC", l: "300", light: true }, { bg: "var(--color-mk-ink-200)", hex: "#DEDFE6", l: "200", light: true },
                { bg: "var(--color-mk-ink-100)", hex: "#EFF0F4", l: "100", light: true }, { bg: "var(--color-mk-ink-50)", hex: "#f4f5f7", l: "50", light: true },
              ].map(({ bg, hex, l, light }) => (
                <Swatch key={l} bg={bg} label={l} hex={hex} light={light} />
              ))}
            </div>
          </div>
          <div>
            <p className="mk-caption mb-3">Semantic</p>
            <div className="flex gap-3">
              <Swatch bg="var(--color-mk-mint-600)" label="Success" hex="#3FB6AC" />
              <Swatch bg="var(--color-mk-warning)" label="Warning" hex="#E2A341" />
              <Swatch bg="var(--color-mk-danger)" label="Danger" hex="#E24171" />
              <Swatch bg="var(--color-mk-blue-500)" label="Info" hex="#4171E2" />
            </div>
          </div>
        </Section>

        {/* ── Typography ───────────────────────────────────── */}
        <Section id="typography" title="Typography" meta="Madani Arabic · Bold −2% tracking">
          <div className="bg-mk-ink-50 rounded-lg p-6" dir="rtl">
            <p className="font-mono mk-caption text-mk-fg-3 mb-3" dir="ltr">Arabic specimen · Madani Arabic — 3 weights</p>
            <p className="mk-display-xl leading-[var(--lh-display-xl)] text-mk-fg-1 font-arabic">مركبة</p>
            <div className="flex gap-8 mt-4">
              {[["font-normal", "Regular · 400"], ["font-semibold", "SemiBold · 600"], ["font-bold", "Bold · 700"]].map(([cls, lbl]) => (
                <div key={cls}>
                  <p className={`mk-h3 leading-[var(--lh-h3)] ${cls} text-mk-fg-1 font-arabic`}>أبجد هوّز حطي كلمن</p>
                  <code className="font-mono mk-caption text-mk-fg-3" dir="ltr">{lbl}</code>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {[
              { cls: "mk-display-xl", tag: "h1", label: "Compose", meta: "72/1.05", use: "Marketing hero only" },
              { cls: "mk-display-lg", tag: "h1", label: "Maarkbh moves", meta: "56/1.08", use: "Hero, one per page" },
              { cls: "mk-display", tag: "h1", label: "Two taps to start", meta: "44/1.10", use: "Page hero" },
              { cls: "mk-h1", tag: "h1", label: "A vehicle for ideas", meta: "36/1.15", use: "Page title (one per page)" },
              { cls: "mk-h2", tag: "h2", label: "Section header", meta: "28/1.2", use: "Major section header" },
              { cls: "mk-h3", tag: "h3", label: "Subsection", meta: "22/1.3", use: "Subsection header" },
              { cls: "mk-h4", tag: "h4", label: "Card title", meta: "16/1.35", use: "Card / row / dialog title" },
            ].map(({ cls, label, meta, use }) => (
              <div key={cls} className="flex items-baseline justify-between gap-6 border-b border-mk-border pb-2">
                <span className={cls}>{label}</span>
                <span className="text-end shrink-0">
                  <code className="font-mono mk-caption text-mk-fg-3 block" dir="ltr">.{cls} · {meta}</code>
                  <span className="mk-overline text-mk-fg-3">{use}</span>
                </span>
              </div>
            ))}
            {[
              { cls: "mk-body-lg", label: "Body large — 18px Regular", meta: "18/1.55", use: "Lead paragraph" },
              { cls: "mk-body", label: "Body — 16px Regular", meta: "16/1.55", use: "Default body text" },
              { cls: "mk-body-sm", label: "Body small — 14px Regular", meta: "14/1.5", use: "Secondary body text" },
              { cls: "mk-label", label: "Label — 13px SemiBold", meta: "13/1.45", use: "Form labels, table cells" },
              { cls: "mk-label-muted", label: "Label muted — 13px Regular", meta: "13/1.45", use: "Secondary labels" },
              { cls: "mk-caption", label: "CAPTION / EYEBROW — 12PX", meta: "12/1.4 +4%", use: "Metadata, timestamps" },
              { cls: "mk-overline", label: "OVERLINE — 11PX", meta: "11/1.3 +6%", use: "Nav groups, table headers" },
              { cls: "mk-mono", label: "Mono — 14px", meta: "14/1.5", use: "Codes, IDs, plates" },
            ].map(({ cls, label, meta, use }) => (
              <div key={cls} className="flex items-baseline justify-between gap-6 pb-2">
                <span className={cls}>{label}</span>
                <span className="text-end shrink-0">
                  <code className="font-mono mk-caption text-mk-fg-3 block" dir="ltr">.{cls} · {meta}</code>
                  <span className="mk-overline text-mk-fg-3">{use}</span>
                </span>
              </div>
            ))}
          </div>        </Section>

        {/* ── Spacing ──────────────────────────────────────── */}
        <Section id="spacing" title="Spacing" meta="4-px base · --spacing-*">
          <div className="flex gap-4 items-end bg-mk-ink-50 rounded-lg p-6">
            {[{ n: "1", v: "4", h: 4 }, { n: "2", v: "8", h: 8 }, { n: "3", v: "12", h: 12 }, { n: "4", v: "16", h: 16 }, { n: "5", v: "20", h: 20 }, { n: "6", v: "24", h: 24 }, { n: "8", v: "32", h: 32 }, { n: "10", v: "40", h: 40 }, { n: "12", v: "48", h: 48 }, { n: "16", v: "64", h: 64 }, { n: "20", v: "80", h: 80 }, { n: "24", v: "96", h: 96 }].map(({ n, v, h }) => (
              <div key={n} className="flex flex-col items-center gap-2">
                <div className="w-3.5 bg-mk-blue-500 rounded-xs" style={{ height: h }} />
                <span className="font-mono mk-caption text-mk-fg-3">{n}</span>
                <span className="font-mono mk-caption text-mk-fg-3 opacity-70">{v}</span>
              </div>
            ))}
          </div>
          <p className="mk-body-sm">Don&apos;t invent values between steps. Component padding lives in 12–24; section gaps in 32–80.</p>
        </Section>

        {/* ── Radius ───────────────────────────────────────── */}
        <Section id="radius" title="Radius" meta="--radius-*">
          <div className="flex gap-4 bg-mk-ink-50 rounded-lg p-6">
            {[{ r: "4px", l: "xs · 4" }, { r: "8px", l: "sm · 8" }, { r: "12px", l: "md · 12" }, { r: "18px", l: "lg · 18" }, { r: "24px", l: "xl · 24" }, { r: "32px", l: "2xl · 32" }, { r: "999px", l: "pill" }].map(({ r, l }) => (
              <RadiusTile key={r} radius={r} label={l} />
            ))}
          </div>
          <p className="mk-body-sm">The &quot;stadium&quot; pill echoes the rounded-end strokes of the M. Buttons default to it; cards default to lg (18).</p>
        </Section>

        {/* ── Elevation ────────────────────────────────────── */}
        <Section id="elevation" title="Elevation" meta="--shadow-*">
          <div className="flex gap-4 bg-mk-ink-50 rounded-lg p-6">
            <ShadowTile shadow="0 1px 2px rgba(15,20,48,0.06)" label="xs" />
            <ShadowTile shadow="0 2px 6px rgba(15,20,48,0.08)" label="sm" />
            <ShadowTile shadow="0 8px 24px rgba(15,20,48,0.10)" label="md" />
            <ShadowTile shadow="0 18px 48px rgba(15,20,48,0.14)" label="lg" />
            <ShadowTile shadow="0 32px 80px rgba(15,20,48,0.18)" label="xl" />
            <ShadowTile shadow="0 12px 40px -8px rgba(65,113,226,0.45)" label="glow-blue" />
            <ShadowTile shadow="0 12px 40px -8px rgba(105,218,209,0.5)" label="glow-mint" />
          </div>
        </Section>

        {/* ── Motion ───────────────────────────────────────── */}
        <Section id="motion" title="Motion" meta="120 · 220 · 360 ms">
          <div className="flex gap-4 bg-mk-ink-50 rounded-lg p-6">
            {[
              { name: "Standard", ease: "cubic-bezier(0.2, 0.8, 0.2, 1)", dur: "220ms" },
              { name: "Emphasis", ease: "cubic-bezier(0.16, 1, 0.3, 1)", dur: "220ms" },
              { name: "Ease In", ease: "cubic-bezier(0.4, 0, 1, 1)", dur: "220ms" },
              { name: "Ease Out", ease: "cubic-bezier(0, 0, 0.2, 1)", dur: "220ms" },
            ].map(({ name, ease, dur }) => (
              <div key={name} className="flex-1 mk-surface rounded-md p-3 flex flex-col gap-2">
                <span className="mk-body-sm text-mk-fg-1">{name}</span>
                <div className="relative h-6 bg-mk-blue-500/10 rounded-full overflow-hidden">
                  <div className="absolute top-1 left-1 w-3.5 h-3.5 rounded-full bg-mk-blue-500"
                    style={{ animation: `run 2.4s ${ease} infinite` }} />
                </div>
                <code className="font-mono mk-caption text-mk-fg-3">{ease}</code>
                <code className="font-mono mk-caption text-mk-fg-3">{dur}</code>
              </div>
            ))}
          </div>
          <p className="mk-body-sm">Calm and confident — no spring, no bounce. UI affordances translate ≤ 4 px; press scales to 0.98.</p>
        </Section>

        {/* ── Iconography ──────────────────────────────────── */}
        <Section id="iconography" title="Iconography" meta="lucide-react · 14 / 16 / 18 / 20 px · default · outline · tonal · filled">
          <p className="mk-body-sm">
            All icons come from <code className="font-mono mk-caption text-mk-fg-3">lucide-react</code>, stroke-width 2.
            Four presentation styles cover every use case in the app — pick the one that matches the icon&rsquo;s role, not the screen.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {([
              {
                name: "Default",
                desc: "Bare icon, no container. Inline with text/labels, inside buttons, or as a leading glyph in inputs.",
                render: (I: typeof Car, colorClass: string) => (
                  <I size={18} className={colorClass} />
                ),
              },
              {
                name: "Outline",
                desc: "Icon in a bordered box, transparent fill. Secondary actions, toolbar buttons, unselected option cards.",
                render: (I: typeof Car, colorClass: string) => (
                  <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 bg-white border border-mk-ink-200">
                    <I size={16} className={colorClass} />
                  </div>
                ),
              },
              {
                name: "Tonal",
                desc: "Icon in a soft tinted box — bg-{color}-50/100 + matching text color. Feature icons, KPI cards, selected option cards.",
                render: (I: typeof Car, colorClass: string, bgClass?: string) => (
                  <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${bgClass}`}>
                    <I size={16} className={colorClass} />
                  </div>
                ),
              },
              {
                name: "Filled",
                desc: "Icon on a solid colour fill, white icon. Reserved for strong emphasis — mandatory/always-on callouts, confirmed checked states — never for a resting/unselected default.",
                render: (I: typeof Car, colorClass: string, bgClass?: string) => (
                  <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${bgClass}`}>
                    <I size={16} className={colorClass} />
                  </div>
                ),
              },
            ] as const).map((style) => (
              <div key={style.name} className="mk-surface rounded-lg p-5 flex flex-col gap-4">
                <div>
                  <div className="mk-label text-mk-fg-1">{style.name}</div>
                  <p className="mk-caption text-mk-fg-3 mt-1">{style.desc}</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {style.name === "Default"
                    ? [Car, Clock, Banknote, MapPin, Check].map((I, i) => (
                        <div key={i} className="w-9 h-9 rounded-md flex items-center justify-center shrink-0">
                          {style.render(I, "text-mk-ink-700")}
                        </div>
                      ))
                    : style.name === "Filled"
                    ? [
                        { I: Car, bg: "bg-mk-blue-500", fg: "text-white" },
                        { I: Clock, bg: "bg-mk-mint-600", fg: "text-white" },
                        { I: Banknote, bg: "bg-mk-violet-500", fg: "text-white" },
                        { I: MapPin, bg: "bg-mk-warning", fg: "text-white" },
                        { I: Check, bg: "bg-mk-danger", fg: "text-white" },
                      ].map(({ I, bg, fg }, i) => (
                        <div key={i}>{style.render(I, fg, bg)}</div>
                      ))
                    : [
                        { I: Car, bg: "bg-mk-blue-50", fg: "text-mk-blue-500" },
                        { I: Clock, bg: "bg-mk-mint-100", fg: "text-mk-mint-600" },
                        { I: Banknote, bg: "bg-mk-violet-100", fg: "text-mk-violet-500" },
                        { I: MapPin, bg: "bg-mk-warning-100", fg: "text-mk-warning" },
                        { I: Check, bg: "bg-mk-danger-100", fg: "text-mk-danger" },
                      ].map(({ I, bg, fg }, i) => (
                        <div key={i}>{style.render(I, fg, style.name === "Outline" ? undefined : bg)}</div>
                      ))}
                </div>
              </div>
            ))}
          </div>

          <div>
            <div className="mk-label text-mk-fg-1 mb-3">Tonal vs. filled colour pairings</div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { name: "Blue · default", tonalBg: "bg-mk-blue-50", tonalFg: "text-mk-blue-500", filledBg: "bg-mk-blue-500", token: "blue-50/500 · blue-500" },
                { name: "Mint · success", tonalBg: "bg-mk-mint-100", tonalFg: "text-mk-mint-600", filledBg: "bg-mk-mint-600", token: "mint-100/600 · mint-600" },
                { name: "Violet · info", tonalBg: "bg-mk-violet-100", tonalFg: "text-mk-violet-500", filledBg: "bg-mk-violet-500", token: "violet-100/500 · violet-500" },
                { name: "Warning", tonalBg: "bg-mk-warning-100", tonalFg: "text-mk-warning", filledBg: "bg-mk-warning", token: "warning-100/base · warning" },
                { name: "Danger", tonalBg: "bg-mk-danger-100", tonalFg: "text-mk-danger", filledBg: "bg-mk-danger", token: "danger-100/base · danger" },
              ].map((c) => (
                <div key={c.name} className="mk-surface rounded-lg p-4 flex flex-col items-center gap-2 text-center">
                  <div className="flex items-center gap-2">
                    <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${c.tonalBg}`}>
                      <Car size={16} className={c.tonalFg} />
                    </div>
                    <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${c.filledBg}`}>
                      <Car size={16} className="text-white" />
                    </div>
                  </div>
                  <span className="mk-caption text-mk-fg-1">{c.name}</span>
                  <code className="font-mono mk-overline text-mk-fg-3 break-all">{c.token}</code>
                </div>
              ))}
            </div>
          </div>

          <Usage code={`// Default — bare icon, inline
<Car size={18} className="text-mk-ink-700" />

// Outline — bordered box, transparent fill
<div className="w-9 h-9 rounded-md flex items-center justify-center border border-mk-ink-200 bg-white">
  <Car size={16} className="text-mk-ink-700" />
</div>

// Tonal — soft tinted box (matches KpiCard, Badge, option cards)
<div className="w-9 h-9 rounded-md flex items-center justify-center bg-mk-blue-50">
  <Car size={16} className="text-mk-blue-500" />
</div>

// Filled — solid colour, white icon (mandatory callouts, checked states only)
<div className="w-9 h-9 rounded-md flex items-center justify-center bg-mk-blue-500">
  <Car size={16} className="text-white" />
</div>`} />
        </Section>

        {/* ── Buttons ──────────────────────────────────────── */}
        <Section id="buttons" title="Buttons" meta="stadium · 600 weight · scale(0.98) press">
          <div className="flex flex-wrap gap-3 items-center">
            <Button variant="primary">Get started</Button>
            <Button variant="secondary">Learn more</Button>
            <Button variant="tonal">Tonal</Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="danger">Delete trip</Button>
            <Button variant="primary" disabled>Disabled</Button>
          </div>
          <div className="flex gap-3 items-center">
            <Button size="sm">Small</Button>
            <Button size="md">Default</Button>
            <Button size="lg">Large</Button>
          </div>
          <div className="flex gap-3 items-center">
            <Button variant="primary" className="shadow-[var(--shadow-glow-blue)]">CTA with glow</Button>
          </div>
          <Usage code={`import { Button } from "@/components/ui";

<Button variant="primary" size="md">Get started</Button>

// variant: primary · secondary · tonal · ghost · outline · danger
// size:    sm · md · lg`} />
        </Section>

        {/* ── Badges & Chips ───────────────────────────────── */}
        <Section id="badges-chips" title="Badges & Chips" meta="pill · sm/md/lg · same rule as Button">
          <div className="flex flex-wrap gap-3 items-center">
            <Badge variant="info" dot>Info</Badge>
            <Badge variant="success" dot>Active</Badge>
            <Badge variant="warning" dot>Pending</Badge>
            <Badge variant="danger" dot>Failed</Badge>
            <Badge variant="violet">Beta</Badge>
            <Badge variant="neutral">Draft</Badge>
            <Badge variant="solid">3 new</Badge>
          </div>
          <div className="flex gap-2 flex-wrap">
            {["All", "Sedan", "Van", "Premium", "Shared"].map((chip) => (
              <Chip key={chip} active={activeChip === chip} onClick={() => setActiveChip(chip)}>
                {chip}
              </Chip>
            ))}
          </div>
          <div className="flex flex-col gap-4 bg-mk-ink-50 rounded-lg p-6">
            <div className="flex flex-col gap-2">
              <p className="mk-caption">Badge sizes</p>
              <div className="flex flex-wrap items-center gap-3">
                {(["sm", "md", "lg"] as const).map((size) => (
                  <div key={size} className="flex items-center gap-2">
                    <Badge variant="info" dot size={size}>Active</Badge>
                    <code className="font-mono mk-overline text-mk-fg-3">{size}</code>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <p className="mk-caption">Chip sizes</p>
              <div className="flex flex-wrap items-center gap-3">
                {(["sm", "md", "lg"] as const).map((size) => (
                  <div key={size} className="flex items-center gap-2">
                    <Chip size={size}>Sedan</Chip>
                    <code className="font-mono mk-overline text-mk-fg-3">{size}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Usage code={`import { Badge, Chip } from "@/components/ui";

<Badge variant="success" dot>Active</Badge>
<Chip active={selected === "Sedan"} onClick={() => setSelected("Sedan")}>Sedan</Chip>

// Badge variant: info · success · warning · danger · violet · neutral · solid
// size: sm · md · lg`} />
        </Section>

        {/* ── Avatar ───────────────────────────────────────── */}
        <Section id="avatar" title="Avatar" meta="gradient initials · 3 sizes · stack group · status ring">
          <div className="flex flex-wrap gap-10 items-start bg-mk-ink-50 rounded-lg p-6">
            {/* Sizes */}
            <div className="flex flex-col gap-3">
              <p className="mk-caption">Sizes</p>
              <div className="flex items-end gap-4">
                {(["sm", "md", "lg"] as const).map((size) => (
                  <div key={size} className="flex flex-col items-center gap-2">
                    <Avatar name="Khaled Al-Ahmadi" size={size} />
                    <code className="font-mono mk-overline text-mk-fg-3">{size}</code>
                  </div>
                ))}
              </div>
            </div>
            {/* Stack group */}
            <div className="flex flex-col gap-3">
              <p className="mk-caption">Stack group</p>
              <div className="flex items-center">
                {["Sara Al-Qahtani", "Fahad Al-Dosari", "Noura Al-Shammari", "Tariq Al-Mutairi"].map((name, i) => (
                  <div key={name} style={{ marginInlineStart: i === 0 ? 0 : -10, zIndex: 4 - i }}
                    className="relative rounded-full ring-2 ring-mk-bg">
                    <Avatar name={name} size="md" />
                  </div>
                ))}
                <div className="w-9 h-9 rounded-full flex items-center justify-center mk-overline text-mk-ink-500 bg-mk-ink-100 ring-2 ring-mk-bg" style={{ marginInlineStart: -10 }}>
                  +4
                </div>
              </div>
            </div>
            {/* Status rings */}
            <div className="flex flex-col gap-3">
              <p className="mk-caption">Status ring</p>
              <div className="flex items-end gap-4">
                {[
                  { name: "Khaled Al-Ahmadi", ring: "var(--color-mk-mint-600)", label: "Online" },
                  { name: "Sara Al-Qahtani", ring: "var(--color-mk-warning)", label: "Away" },
                  { name: "Tariq Al-Mutairi", ring: "var(--color-mk-danger)", label: "Busy" },
                  { name: "Fahad Al-Dosari", ring: "var(--color-mk-ink-300)", label: "Offline" },
                ].map(({ name, ring, label }) => (
                  <div key={name} className="flex flex-col items-center gap-2">
                    <div className="relative">
                      <Avatar name={name} size="md" />
                      <span className="absolute bottom-0 end-0 w-3 h-3 rounded-full border-2 border-mk-bg" style={{ background: ring }} />
                    </div>
                    <span className="font-mono mk-overline text-mk-fg-3">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Usage code={`import { Avatar } from "@/components/ui";

<Avatar name="Khaled Al-Ahmadi" size="md" />

// size: sm · md · lg — initials derived from name, gradient background`} />
        </Section>

        {/* ── View Toggle ──────────────────────────────────── */}
        <Section id="view-toggle" title="View Toggle" meta="mk-view-toggle · mk-view-btn · light and dark">
          <div className="flex gap-10 items-start flex-wrap bg-mk-ink-50 rounded-lg p-6">
            <div className="flex flex-col gap-3">
              <p className="mk-caption">Light mode</p>
              <div className="mk-view-toggle flex items-center gap-1 w-fit">
                <button className="mk-view-btn mk-view-btn--active" aria-label="Grid view"><LayoutGrid size={15} /></button>
                <button className="mk-view-btn" aria-label="List view"><ListIcon size={15} /></button>
              </div>
            </div>
            <div className="flex flex-col gap-3" data-theme="dark">
              <p className="mk-caption" style={{ color: "var(--color-mk-ink-500)" }}>Dark mode</p>
              <div className="mk-view-toggle flex items-center gap-1 w-fit">
                <button className="mk-view-btn" aria-label="List view"><ListIcon size={15} /></button>
                <button className="mk-view-btn mk-view-btn--active" aria-label="Grid view"><LayoutGrid size={15} /></button>
              </div>
            </div>
          </div>
        </Section>

        {/* ── List ─────────────────────────────────────────── */}
        <Section id="list" title="List" meta="mk-surface · border-mk-border divider · 2 variants">
          <div>
            <p className="mk-caption mb-3">Person list — avatar + metadata + trailing badge</p>
            <div className="mk-surface rounded-lg overflow-hidden">
              {[
                { name: "Khaled Al-Ahmadi", phone: "+966 50 447 1928", status: "verified" as const, bk: 4 },
                { name: "Layla Al-Harbi", phone: "+966 55 881 2344", status: "pending" as const, bk: 2 },
                { name: "Mohammed Al-Otaibi", phone: "+966 56 220 0112", status: "verified" as const, bk: 7 },
                { name: "Fahad Al-Dosari", phone: "+966 50 339 0881", status: "new" as const, bk: 0 },
              ].map((item, i, arr) => (
                <div key={item.name}
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer transition-colors hover:bg-mk-ink-50"
                  style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--color-mk-border)" : "none" }}
                >
                  <Avatar name={item.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="mk-h4 text-mk-ink-900 truncate">{item.name}</div>
                    <div className="mk-caption text-mk-ink-400 mt-px">{item.phone}</div>
                  </div>
                  <Badge
                    variant={item.status === "verified" ? "success" : item.status === "pending" ? "warning" : "neutral"}
                    dot
                  >
                    {item.status === "verified" ? "Verified" : item.status === "pending" ? "Pending" : "New"}
                  </Badge>
                  <span className="mk-label text-mk-ink-500 w-8 text-end">{item.bk > 0 ? item.bk : "—"}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mk-caption mb-3">Vehicle list — icon + label + status badge</p>
            <div className="mk-surface rounded-lg overflow-hidden">
              {[
                { icon: "🚗", name: "Toyota Camry 2024", plate: "ABC 1234", variant: "success" as const, label: "Available" },
                { icon: "🚙", name: "Nissan Patrol 2024", plate: "XYZ 5678", variant: "info" as const, label: "Rented" },
                { icon: "🚗", name: "Hyundai Elantra 2024", plate: "QRS 9012", variant: "warning" as const, label: "Maintenance" },
                { icon: "🚙", name: "Kia Sportage 2024", plate: "LMN 3456", variant: "danger" as const, label: "Overdue" },
              ].map((item, i, arr) => (
                <div key={item.name}
                  className="flex items-center gap-3 px-5 py-4"
                  style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--color-mk-border)" : "none" }}
                >
                  <div className="w-9 h-9 rounded-md bg-mk-ink-100 flex items-center justify-center text-lg shrink-0">{item.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="mk-h4 text-mk-ink-900 truncate">{item.name}</div>
                    <div className="mk-overline font-mono text-mk-ink-400 mt-px">{item.plate}</div>
                  </div>
                  <Badge variant={item.variant} dot>{item.label}</Badge>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Data Table ───────────────────────────────────── */}
        <Section id="data-table" title="Data Table" meta="grid columns · sortable header · avatar rows · badge status">
          <div className="mk-surface rounded-lg overflow-hidden">
            <div
              className="grid px-5 py-3 mk-overline uppercase text-mk-ink-400 tracking-wider border-b border-mk-ink-100 bg-mk-ink-50 grid-cols-[2fr_1.2fr_1fr_0.8fr_0.9fr_90px]"
            >
              <button className="flex items-center gap-1 text-start bg-transparent border-0 cursor-pointer p-0 uppercase mk-overline tracking-wider text-mk-blue-500">
                Customer <ChevronDown size={11} />
              </button>
              <span>Phone</span>
              <span>Vehicle</span>
              <span>Period</span>
              <span>Status</span>
              <span className="text-end">Total</span>
            </div>
            {[
              { name: "Khaled Al-Ahmadi", phone: "+966 50 447", car: "Camry 2024", period: "3 days", status: "active" as const, total: "SAR 1,080" },
              { name: "Layla Al-Harbi", phone: "+966 55 881", car: "Sportage 2024", period: "5 days", status: "pending" as const, total: "SAR 2,100" },
              { name: "Mohammed Al-Otaibi", phone: "+966 56 220", car: "Patrol 2024", period: "7 days", status: "completed" as const, total: "SAR 6,650" },
              { name: "Sara Al-Qahtani", phone: "+966 59 775", car: "Elantra 2024", period: "2 days", status: "completed" as const, total: "SAR 420" },
              { name: "Fahad Al-Dosari", phone: "+966 50 339", car: "MG ZS 2024", period: "4 days", status: "pending" as const, total: "SAR 720" },
            ].map((row, i, arr) => (
              <div key={row.name}
                className="grid items-center px-5 py-4 cursor-pointer transition-colors hover:bg-mk-ink-50 grid-cols-[2fr_1.2fr_1fr_0.8fr_0.9fr_90px]"
                style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--color-mk-border)" : "none" }}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={row.name} size="sm" />
                  <span className="mk-label text-mk-ink-900 truncate">{row.name}</span>
                </div>
                <span className="mk-label text-mk-ink-500">{row.phone}</span>
                <span className="mk-label text-mk-ink-600">{row.car}</span>
                <span className="mk-label text-mk-ink-500">{row.period}</span>
                <div>
                  <Badge variant={row.status === "active" ? "info" : row.status === "completed" ? "success" : "warning"} dot>
                    {row.status === "active" ? "Active" : row.status === "completed" ? "Done" : "Pending"}
                  </Badge>
                </div>
                <span className="mk-label text-mk-blue-500 text-end">{row.total}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Overflow Menu ────────────────────────────────── */}
        <Section id="overflow-menu" title="Overflow Menu" meta="3 trigger styles · auto-close on outside click">
          <OverflowMenuDemo />
        </Section>

        {/* ── Cards ────────────────────────────────────────── */}
        <Section id="cards" title="Cards" meta="18 px · sm shadow · −2 px lift on hover">
          <div className="bg-mk-ink-50 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardIcon gradient="blue-violet" />
                  <div><CardTitle>Route 12 · East loop</CardTitle><CardMeta>7 stops · 22 min</CardMeta></div>
                </CardHeader>
                <CardBody className="mt-3">Composed for evening commuters between the harbour district and the old quarter. Reliable on weekdays, busier after sunset.</CardBody>
                <CardFooter className="mt-3">
                  <Badge variant="success" dot>Active</Badge>
                  <span className="mk-body-sm text-mk-blue-500">View →</span>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardIcon gradient="mint-blue" />
                  <div><CardTitle>Atlas · Operator hub</CardTitle><CardMeta>Updated 2 min ago</CardMeta></div>
                </CardHeader>
                <CardBody className="mt-3">Live status across all vehicles in the fleet. Filters by zone, status, and shift.</CardBody>
                <CardFooter className="mt-3">
                  <Badge variant="success" dot>12 online</Badge>
                  <span className="mk-body-sm text-mk-blue-500">Open →</span>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <div className="w-9 h-9 rounded-md bg-mk-blue-50 flex items-center justify-center shrink-0"><Car size={16} className="text-mk-blue-500" /></div>
                  <div><CardTitle>Fleet overview</CardTitle><CardMeta>Updated just now</CardMeta></div>
                </CardHeader>
                <CardBody className="mt-3">24 vehicles available · 3 on maintenance · 1 overdue return</CardBody>
                <CardFooter className="mt-3">
                  <Badge variant="warning" dot>3 pending</Badge>
                  <span className="mk-body-sm text-mk-blue-500">Manage →</span>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <div className="w-9 h-9 rounded-md bg-mk-mint-100 flex items-center justify-center shrink-0"><BarChart3 size={16} className="text-mk-mint-600" /></div>
                  <div><CardTitle>Revenue · May 2026</CardTitle><CardMeta>Compared to Apr 2026</CardMeta></div>
                </CardHeader>
                <CardBody className="mt-3">
                  <span className="mk-h2 text-mk-fg-1">SAR 84,200</span>
                  <span className="ml-3 text-mk-success mk-body-sm">+12.4%</span>
                </CardBody>
                <CardFooter className="mt-3">
                  <Badge variant="info">B2B + B2C</Badge>
                  <span className="mk-body-sm text-mk-blue-500">Details →</span>
                </CardFooter>
              </Card>
            </div>
          </div>
          <Usage code={`import { Card, CardHeader, CardIcon, CardTitle, CardMeta, CardBody, CardFooter } from "@/components/ui";

<Card hover>
  <CardHeader>
    <CardIcon gradient="blue-violet" />
    <div><CardTitle>Route 12</CardTitle><CardMeta>7 stops</CardMeta></div>
  </CardHeader>
  <CardBody>Composed for evening commuters.</CardBody>
  <CardFooter><Badge variant="success" dot>Active</Badge></CardFooter>
</Card>`} />
        </Section>

        {/* ── Form Inputs ──────────────────────────────────── */}
        <Section id="form-inputs" title="Form Inputs" meta="12 px radius · focus ring blue/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Email address" placeholder="you@example.com" helpText="We'll send a one-time code." type="email" />
            <Input label="Pickup point" defaultValue="Downtown · Bay 4" />
            <Input label="Promo code" defaultValue="EXPIRED2024" error="This code is no longer active." />
            <Select label="Vehicle type">
              <option>Sedan</option><option>Van</option><option>SUV</option><option>Premium</option>
            </Select>
          </div>
          <div className="flex gap-6 items-center">
            <Toggle label="Notify when nearby" checked={notify} onChange={setNotify} />
            <Toggle label="Share live route" checked={share} onChange={setShare} />
          </div>
          <div className="flex flex-col gap-2 bg-mk-ink-50 rounded-lg p-6">
            <p className="mk-caption">Toggle sizes</p>
            <div className="flex flex-wrap items-center gap-6">
              <Toggle size="sm" label="Small" checked={notify} onChange={setNotify} />
              <Toggle size="md" label="Default" checked={share} onChange={setShare} />
            </div>
          </div>
          <div className="flex flex-col gap-2 bg-mk-ink-50 rounded-lg p-6">
            <p className="mk-caption">Dropdown (Select) sizes</p>
            <div className="flex flex-wrap items-end gap-4">
              {(["sm", "md", "lg"] as const).map((size) => (
                <div key={size} className="flex flex-col gap-2 w-44">
                  <Select size={size} aria-label={`Vehicle type — ${size}`}>
                    <option>Sedan</option><option>Van</option><option>SUV</option>
                  </Select>
                  <code className="font-mono mk-overline text-mk-fg-3">{size}</code>
                </div>
              ))}
            </div>
          </div>
          <Usage code={`import { Input, Select, Toggle } from "@/components/ui";

<Input label="Email address" placeholder="you@example.com" helpText="…" />
<Select label="Vehicle type"><option>Sedan</option></Select>
<Toggle label="Notify when nearby" checked={notify} onChange={setNotify} />

// Input / Select support: helpText, error · size sm/md/lg on Select`} />
        </Section>

        {/* ── Checkbox & Radio ─────────────────────────────── */}
        <Section id="checkbox-radio" title="Checkbox & Radio" meta="18px control · focus-visible ring">
          <div className="flex flex-wrap gap-10 items-start bg-mk-ink-50 rounded-lg p-6">
            <div className="flex flex-col gap-3">
              <p className="mk-caption">Checkbox</p>
              <div className="flex flex-col gap-3">
                <Checkbox label="I agree to the terms" checked={agree} onChange={setAgree} />
                <Checkbox label="Remember this device" checked={remember} onChange={setRemember} />
                <Checkbox label="Disabled — checked" checked disabled />
                <Checkbox label="Disabled — unchecked" disabled />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <p className="mk-caption">Radio group</p>
              <div className="flex flex-col gap-3">
                {[
                  { value: "card", label: "Credit / Debit card" },
                  { value: "apple", label: "Apple Pay" },
                  { value: "cash", label: "Cash on pickup" },
                ].map((opt) => (
                  <Radio
                    key={opt.value}
                    name="payment-method"
                    label={opt.label}
                    checked={payMethod === opt.value}
                    onChange={() => setPayMethod(opt.value)}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 bg-mk-ink-50 rounded-lg p-6">
            <p className="mk-caption">With title + supporting text</p>
            <div className="flex flex-col gap-4 max-w-md">
              <Checkbox
                label="Unlimited mileage"
                description="No daily km cap — drive as much as you need."
                checked={agree}
                onChange={setAgree}
              />
              <Radio
                name="insurance-type"
                label="Comprehensive insurance"
                description="Full coverage, zero liability · +80 SAR"
                checked={payMethod === "card"}
                onChange={() => setPayMethod("card")}
              />
              <Radio
                name="insurance-type"
                label="Standard insurance"
                description="Basic coverage · +35 SAR"
                checked={payMethod !== "card"}
                onChange={() => setPayMethod("standard")}
              />
            </div>
          </div>
          <Usage code={`import { Checkbox, Radio } from "@/components/ui";

<Checkbox label="I agree to the terms" checked={agree} onChange={setAgree} />
<Radio name="payment-method" label="Apple Pay" checked={payMethod === "apple"} onChange={() => setPayMethod("apple")} />

// Both accept an optional description for title + supporting text`} />
        </Section>

        {/* ── Icon Button ──────────────────────────────────── */}
        <Section id="icon-button" title="Icon Button" meta="3 sizes · surface/ghost/active variants">
          <div className="flex flex-wrap gap-8 items-start bg-mk-ink-50 rounded-lg p-6">
            <div className="flex flex-col gap-3">
              <p className="mk-caption">Sizes</p>
              <div className="flex items-end gap-3">
                <IconButton size="sm" aria-label="Search"><Search size={13} /></IconButton>
                <IconButton size="md" aria-label="Search"><Search size={15} /></IconButton>
                <IconButton size="lg" aria-label="Search"><Search size={18} /></IconButton>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <p className="mk-caption">Variants</p>
              <div className="flex items-center gap-3">
                <IconButton variant="surface" aria-label="Notifications"><Bell size={15} /></IconButton>
                <IconButton variant="ghost" aria-label="Close"><XIcon size={15} /></IconButton>
                <IconButton variant="active" aria-label="Location"><MapPin size={15} /></IconButton>
              </div>
            </div>
          </div>
          <Usage code={`import { IconButton } from "@/components/ui";

<IconButton variant="surface" size="md" aria-label="Notifications"><Bell size={15} /></IconButton>

// variant: surface · ghost · active   size: sm · md · lg`} />
        </Section>

        {/* ── Tabs ─────────────────────────────────────────── */}
        <Section id="tabs" title="Tabs" meta="default (boxed segmented) · outline (composes Chip) · tonal · tone">
          <div className="flex flex-col gap-4 bg-mk-ink-50 rounded-lg p-6">
            <p className="mk-caption">Default — boxed segmented, with count</p>
            <Tabs
              value={activeTab}
              onChange={setActiveTab}
              items={[
                { value: "all", label: "All", count: 5 },
                { value: "active", label: "Active", count: 2 },
                { value: "pending", label: "Pending", count: 3 },
                { value: "late", label: "Late" },
              ]}
            />
          </div>

          <div className="flex flex-col gap-4 bg-mk-ink-50 rounded-lg p-6">
            <p className="mk-caption">Outline — with count</p>
            <Tabs
              variant="outline"
              value={activeTab}
              onChange={setActiveTab}
              items={[
                { value: "all", label: "All", count: 5 },
                { value: "active", label: "Active", count: 2 },
                { value: "pending", label: "Pending", count: 3 },
                { value: "late", label: "Late" },
              ]}
            />
          </div>

          <div className="flex flex-col gap-4 bg-mk-ink-50 rounded-lg p-6">
            <p className="mk-caption">Tonal — with count</p>
            <Tabs
              variant="tonal"
              value={activeTab}
              onChange={setActiveTab}
              items={[
                { value: "all", label: "All", count: 5 },
                { value: "active", label: "Active", count: 2 },
                { value: "pending", label: "Pending", count: 3 },
                { value: "late", label: "Late" },
              ]}
            />
          </div>

          <div className="flex gap-8 items-start flex-wrap bg-mk-midnight rounded-lg p-6">
            <div className="flex flex-col gap-3">
              <p className="mk-caption" style={{ color: "var(--color-mk-ink-500)" }}>Outline tone=&quot;dark&quot; — forced, ignores ambient theme</p>
              <Tabs
                variant="outline"
                tone="dark"
                value={activeTab}
                onChange={setActiveTab}
                items={[
                  { value: "all", label: "الكل", count: 5 },
                  { value: "pending", label: "معلقة", count: 3 },
                  { value: "active", label: "قيد التنفيذ", count: 2 },
                ]}
              />
            </div>
          </div>
          <div className="flex flex-col gap-4 bg-mk-midnight rounded-lg p-6" data-theme="dark">
            <p className="mk-caption" style={{ color: "var(--color-mk-ink-500)" }}>Default (boxed segmented) · tone=&quot;auto&quot; (follows the page theme)</p>
            <Tabs
              variant="default"
              value={viewMode}
              onChange={setViewMode}
              items={[
                { value: "map", icon: <Map size={15} />, "aria-label": "Map view" },
                { value: "grid", icon: <LayoutGrid size={15} />, "aria-label": "Grid view" },
                { value: "list", icon: <ListIcon size={15} />, "aria-label": "List view" },
              ]}
            />
          </div>

          <div className="flex gap-8 items-start flex-wrap bg-mk-ink-50 rounded-lg p-6">
            <div className="flex flex-col gap-3">
              <p className="mk-caption">tone=&quot;light&quot; — forced, ignores ambient theme</p>
              <Tabs
                variant="default"
                tone="light"
                value={viewMode}
                onChange={setViewMode}
                items={[
                  { value: "map", icon: <Map size={15} />, "aria-label": "Map view" },
                  { value: "grid", icon: <LayoutGrid size={15} />, "aria-label": "Grid view" },
                  { value: "list", icon: <ListIcon size={15} />, "aria-label": "List view" },
                ]}
              />
            </div>
            <div className="flex flex-col gap-3">
              <p className="mk-caption">tone=&quot;dark&quot; — forced, e.g. an overlay on a map</p>
              <Tabs
                variant="default"
                tone="dark"
                value={viewMode}
                onChange={setViewMode}
                items={[
                  { value: "map", icon: <Map size={15} />, "aria-label": "Map view" },
                  { value: "grid", icon: <LayoutGrid size={15} />, "aria-label": "Grid view" },
                  { value: "list", icon: <ListIcon size={15} />, "aria-label": "List view" },
                ]}
              />
            </div>
          </div>
          <Usage code={`import { Tabs } from "@/components/ui";

<Tabs
  value={activeTab}
  onChange={setActiveTab}
  items={[{ value: "all", label: "All", count: 5 }, { value: "active", label: "Active" }]}
/>

// variant: default · outline · tonal   tone: auto · light · dark`} />
        </Section>

        {/* ── Table ────────────────────────────────────────── */}
        <Section id="table" title="Table" meta="Table · Th · Td — shared mk-table styles">
          <div className="rounded-lg overflow-hidden mk-surface">
            <Table>
              <thead>
                <tr>
                  <Th>Customer</Th>
                  <Th>Vehicle</Th>
                  <Th>Status</Th>
                  <Th>Total</Th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "Khaled Al-Ahmadi", car: "Camry 2024", variant: "success" as const, label: "Active", total: "SAR 1,080" },
                  { name: "Layla Al-Harbi", car: "Sportage 2024", variant: "warning" as const, label: "Pending", total: "SAR 2,100" },
                ].map((row) => (
                  <Tr key={row.name} className="hover:bg-mk-ink-50 transition-colors">
                    <Td className="mk-label text-mk-ink-900">{row.name}</Td>
                    <Td className="mk-label text-mk-ink-600">{row.car}</Td>
                    <Td><Badge variant={row.variant} dot>{row.label}</Badge></Td>
                    <Td className="mk-label text-mk-blue-500">{row.total}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Section>

        {/* ── Modal & Drawer ───────────────────────────────── */}
        <Section id="modal-drawer" title="Modal & Drawer" meta="full-screen overlay · slide-in panel">
          <div className="flex gap-3 flex-wrap">
            <Button variant="outline" onClick={() => setModalOpen(true)}>Open modal</Button>
            <Button variant="outline" onClick={() => setDrawerOpen(true)}>Open drawer</Button>
            <Button variant="outline" onClick={() => showToast("🟢 This is a toast notification")}>Show toast</Button>
          </div>
          <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Fleet map">
            <div className="h-full flex items-center justify-center text-mk-fg-3 mk-body-sm">
              Modal body content goes here.
            </div>
          </Modal>
          <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
            <div className="flex flex-col justify-between h-full">
              <div>
                <DrawerHeader title="Add new client" sub="Register a walk-in customer" onClose={() => setDrawerOpen(false)} />
                <div className="flex flex-col gap-4">
                  <Input label="Full name" placeholder="e.g. Ahmed Al-Mutairi" />
                  <Input label="Phone number" placeholder="+966 50 123 4567" />
                </div>
              </div>
              <DrawerFooter>
                <Button variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
                <Button variant="primary" className="flex-1">Save</Button>
              </DrawerFooter>
            </div>
          </Drawer>
          <Usage code={`import { Modal, Drawer, DrawerHeader, DrawerFooter, useToast } from "@/components/ui";

<Modal open={open} onClose={() => setOpen(false)} title="Fleet map">…</Modal>

<Drawer open={open} onClose={() => setOpen(false)}>
  <DrawerHeader title="Add new client" onClose={() => setOpen(false)} />
  <DrawerFooter><Button variant="primary">Save</Button></DrawerFooter>
</Drawer>

const { showToast } = useToast();
showToast("Saved successfully");`} />
        </Section>

        {/* ── Riyal Symbol & Hijri Date Picker ─────────────── */}
        <Section id="riyal-hijri" title="Riyal Symbol & Hijri Date Picker" meta="currency glyph · dual-calendar input">
          <div className="flex flex-wrap gap-8 items-start bg-mk-ink-50 rounded-lg p-6">
            <div className="flex flex-col gap-3">
              <p className="mk-caption">Riyal symbol</p>
              <div className="flex items-end gap-4">
                <span className="flex items-center gap-1 mk-h4 text-mk-ink-900"><RiyalSymbol size={16} /> 1,080</span>
                <span className="flex items-center gap-1 mk-body-sm text-mk-blue-500"><RiyalSymbol size={13} className="text-mk-blue-500" /> 84,200</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 w-64">
              <p className="mk-caption">Hijri date picker</p>
              <HijriDatePicker value={hijriDate} onChange={setHijriDate} ar={false} />
            </div>
          </div>
          <Usage code={`import { RiyalSymbol, HijriDatePicker } from "@/components/ui";

<span className="flex items-center gap-1"><RiyalSymbol size={16} /> 1,080</span>
<HijriDatePicker value={hijriDate} onChange={setHijriDate} ar={false} />`} />
        </Section>

        {/* ── KPI Cards ────────────────────────────────────────── */}
        <Section id="kpi-card" title="KPI Card" meta="5 kinds · delta chip · TrendingUp / TrendingDown">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard icon={Car} label="Active vehicles" value="24" kind="default" delta={{ dir: "up", value: "+2" }} sub="vs last week" />
            <KpiCard icon={CalendarDays} label="Today's bookings" value="37" kind="mint" delta={{ dir: "up", value: "+5" }} sub="vs yesterday" />
            <KpiCard icon={Banknote} label="Revenue (MTD)" value="SAR 84K" kind="violet" delta={{ dir: "up", value: "+12.4%" }} sub="vs Apr 2026" />
            <KpiCard icon={Clock} label="Overdue returns" value="3" kind="alert" delta={{ dir: "down", value: "−1" }} sub="improving" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard icon={Car} label="Fleet utilisation" value="78%" kind="warn" sub="24 of 31 active" />
            <KpiCard icon={AlertTriangle} label="Maintenance due" value="5" kind="alert" />
            <KpiCard icon={Banknote} label="Pending payouts" value="SAR 12K" kind="default" delta={{ dir: "down", value: "−3.1%" }} />
            <KpiCard icon={CalendarDays} label="New sign-ups" value="18" kind="mint" delta={{ dir: "up", value: "+6" }} sub="this week" />
          </div>
          <Usage code={`import { KpiCard } from "@/components/ui";

<KpiCard icon={Car} label="Active vehicles" value="24" kind="default" delta={{ dir: "up", value: "+2" }} sub="vs last week" />

// kind: default · mint · violet · warn · alert`} />
        </Section>

        {/* ── Spark ────────────────────────────────────────────── */}
        <Section id="spark" title="Spark" meta="inline SVG sparkline · fill + stroke · any colour">
          <div className="flex flex-wrap gap-5">
            {([
              { label: "Revenue", data: [12, 18, 14, 22, 19, 28, 25, 32, 30, 38], color: "var(--color-mk-blue-500)" },
              { label: "Bookings", data: [5, 8, 6, 10, 9, 13, 11, 15, 14, 18], color: "var(--color-mk-mint-600)" },
              { label: "Overdue", data: [3, 4, 2, 5, 3, 6, 4, 3, 5, 2], color: "var(--color-mk-danger)" },
              { label: "Utilisation", data: [60, 65, 70, 68, 72, 75, 74, 78, 80, 78], color: "var(--color-mk-violet-500)" },
            ] as { label: string; data: number[]; color: string }[]).map(({ label, data, color }) => (
              <div key={label} className="flex-1 min-w-44 mk-surface rounded-xl p-4 flex flex-col gap-2">
                <span className="mk-overline uppercase tracking-wider text-mk-ink-400">{label}</span>
                <Spark data={data} color={color} />
                <div className="flex justify-between mk-overline font-mono text-mk-ink-400">
                  <span>{Math.min(...data)}</span>
                  <span>{Math.max(...data)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-5">
            <div className="flex-1 min-w-44 mk-surface rounded-xl p-4 flex flex-col gap-2">
              <span className="mk-overline uppercase tracking-wider text-mk-ink-400">No fill</span>
              <Spark data={[5, 9, 6, 12, 8, 15, 11, 18, 14, 20]} fill={false} color="var(--color-mk-blue-500)" />
            </div>
            <div className="flex-1 min-w-44 mk-surface rounded-xl p-4 flex flex-col gap-2">
              <span className="mk-overline uppercase tracking-wider text-mk-ink-400">Flat line</span>
              <Spark data={[10, 10, 10, 10, 10, 10, 10, 10, 10, 10]} color="var(--color-mk-ink-300)" />
            </div>
          </div>
          <Usage code={`import { Spark } from "@/components/ui";

<Spark data={[12, 18, 14, 22, 19, 28]} color="var(--color-mk-blue-500)" fill />`} />
        </Section>

        {/* ── Alert Banner ─────────────────────────────────────── */}
        <Section id="alert-banner" title="Alert Banner" meta="3 kinds: danger · warning · success">
          <div className="flex flex-col gap-0">
            <AlertBanner
              kind="danger"
              title="3 vehicles overdue — action required"
              sub="Toyota Camry ABC-1234 is 4 h 20 min past return time. Penalty accruing."
              action={<Button size="sm" variant="danger">View overdue</Button>}
            />
            <AlertBanner
              kind="warning"
              title="Maintenance due for 2 vehicles this week"
              sub="Nissan Patrol XYZ-5678 · Kia Sportage LMN-3456 — schedule before next rental."
              action={<Button size="sm" variant="outline">Schedule</Button>}
            />
            <AlertBanner
              kind="success"
              title="KYC verified — Khaled Al-Ahmadi is cleared to rent"
              action={<Button size="sm" variant="ghost">Dismiss</Button>}
            />
          </div>
          <Usage code={`import { AlertBanner } from "@/components/ui";

<AlertBanner
  kind="danger"
  title="3 vehicles overdue — action required"
  sub="Toyota Camry ABC-1234 is 4 h 20 min past return time."
  action={<Button size="sm" variant="danger">View overdue</Button>}
/>

// kind: danger · warning · success`} />
        </Section>

        {/* ── Logo assets ──────────────────────────────────── */}
        <Section id="logo-assets" title="Logo Assets" meta="3 lockups — Arabic · Latin · Symbol">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-52 mk-surface rounded-lg border border-mk-border p-8 flex items-center justify-center">
              <Image src="/assets/logo-arabic.png" alt="Maarkbh Arabic lockup" width={160} height={60} className="object-contain" />
            </div>
            <div className="flex-1 min-w-52 mk-surface rounded-lg border border-mk-border p-8 flex items-center justify-center">
              <Image src="/assets/logo-latin.png" alt="Maarkbh Latin lockup" width={160} height={60} className="object-contain" />
            </div>
            <div className="flex-1 min-w-28 mk-surface rounded-lg border border-mk-border p-8 flex items-center justify-center">
              <Image src="/assets/logo-symbol-v2.png" alt="Maarkbh symbol" width={64} height={28} className="object-contain" />
            </div>
            <div className="flex-1 min-w-28 rounded-lg p-8 flex items-center justify-center bg-mk-midnight">
              <Image src="/assets/logo-symbol-white-v2.png" alt="Maarkbh symbol on dark" width={64} height={28} className="object-contain" />
            </div>
          </div>
        </Section>

        {/* ── Admin panel KPI cards ─────────────────────────── */}
        <Section id="admin-kpi" title="Admin Panel — KPI Cards" meta="P3 priority component">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Active vehicles", value: "24", change: "+2", variant: "success" as const, Icon: Car },
              { label: "Today's bookings", value: "37", change: "+5", variant: "info" as const, Icon: CalendarDays },
              { label: "Revenue (MTD)", value: "SAR 84K", change: "+12.4%", variant: "success" as const, Icon: Banknote },
              { label: "Overdue returns", value: "3", change: "−1", variant: "warning" as const, Icon: Clock },
            ].map(({ label, value, change, variant, Icon }) => (
              <Card key={label} hover className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-md bg-mk-blue-500/10 text-mk-blue-500 flex items-center justify-center shrink-0">
                    <Icon size={18} />
                  </div>
                  <Badge variant={variant} dot>{change}</Badge>
                </div>
                <div>
                  <p className="mk-h2 leading-none text-mk-fg-1">{value}</p>
                  <p className="mk-body-sm mt-1">{label}</p>
                </div>
              </Card>
            ))}
          </div>
        </Section>

        {/* ── Vehicle status badges ─────────────────────────── */}
        <Section id="vehicle-status" title="Fleet — Vehicle Status" meta="6-state model">
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Available", variant: "success" as const },
              { label: "Rented", variant: "info" as const },
              { label: "Maintenance", variant: "warning" as const },
              { label: "Overdue", variant: "danger" as const },
              { label: "Reserved", variant: "violet" as const },
              { label: "Inactive", variant: "neutral" as const },
            ].map(({ label, variant }) => (
              <Badge key={label} variant={variant} dot size="lg">{label}</Badge>
            ))}
          </div>
        </Section>

          </div>
          <aside className="hidden lg:block lg:order-1">
            <SideNav />
          </aside>
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-mk-border py-8 px-6 md:px-16">
        <div className="max-w-12xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Image src="/assets/logo-symbol-v2.png" alt="Maarkbh" width={24} height={11} />
            <span className="mk-body-sm text-mk-fg-1">Maarkbh · مركبة</span>
            <Badge variant="neutral">Design System v1.0</Badge>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="mk-body-sm text-mk-fg-3 hover:text-mk-fg-1 transition-colors no-underline">Admin Portal</Link>
            <span className="text-mk-fg-3">·</span>
            <Link href="/employee/today" className="mk-body-sm text-mk-fg-3 hover:text-mk-fg-1 transition-colors no-underline">Employee Portal</Link>
            <span className="text-mk-fg-3">·</span>
            <p className="mk-caption">Prepared by Abdullah · Lead UX Designer · 2026</p>
          </div>
        </div>
      </footer>

      {/* Keyframe for motion demo */}
      <style>{`
        @keyframes run {
          0%, 8%    { left: 4px }
          50%       { left: calc(100% - 18px) }
          92%, 100% { left: 4px }
        }
      `}</style>
    </div>
  );
}
