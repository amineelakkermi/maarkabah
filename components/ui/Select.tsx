"use client";

import { Children, forwardRef, isValidElement, useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { DropdownPortal } from "./DropdownPortal";
import { announceDropdownOpen, useDropdownCoordinator } from "./UseDropdownCoordinator";
import { useDropdownPlacement } from "./useDropdownPlacement";

type SelectSize = "sm" | "md" | "lg";
type SelectVariant = "default" | "muted" | "search";

interface OptionElementProps {
  icon?: ReactNode;
  value?: string | number;
  children?: ReactNode;
  disabled?: boolean;
}

interface SelectProps {
  label?: ReactNode;
  floatingLabel?: boolean;
  segment?: boolean;
  dense?: boolean;
  icon?: ReactNode;
  menuMaxHeight?: number;
  helpText?: string;
  error?: string;
  size?: SelectSize;
  variant?: SelectVariant;
  tray?: boolean;
  fitWidth?: boolean;
  className?: string;
  id?: string;
  value?: string | number | readonly string[];
  defaultValue?: string | number | readonly string[];
  onChange?: (event: { target: { value: string } }) => void;
  disabled?: boolean;
  required?: boolean;
  children?: ReactNode;
}

const sizeClasses: Record<SelectSize, string> = {
  sm: "h-8 px-2.5 mk-body-sm",
  md: "h-10 px-3 mk-body-sm",
  lg: "h-12 px-4 mk-body",
};

const chevronSizes: Record<SelectSize, number> = { sm: 12, md: 14, lg: 16 };
const variantClasses: Record<SelectVariant, string> = {
  default: "bg-white border-mk-ink-200",
  muted: "bg-mk-ink-50 border-mk-ink-100",
  search: "mk-surface rounded-pill! border-transparent",
};

const Select = forwardRef<HTMLButtonElement, SelectProps>(
  ({ label, floatingLabel = false, segment = false, dense = false, icon, menuMaxHeight = 180, helpText, error, size = "md", variant = "default", tray, fitWidth, className = "", id, value, defaultValue, onChange, disabled, children }, ref) => {
    const selectId = id ?? (typeof label === "string" ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const [open, setOpen] = useState(false);
    const [internalValue, setInternalValue] = useState(defaultValue);
    const rootRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const selectedOptionRef = useRef<HTMLButtonElement>(null);
    const controlled = value !== undefined;
    const currentValue = controlled ? value : internalValue;
    const options = Children.toArray(children).filter(isValidElement) as ReactElement<OptionElementProps>[];
    const optionValue = (option: ReactElement<OptionElementProps>) => String(option.props.value ?? (typeof option.props.children === "string" ? option.props.children : ""));
    const selected = options.find((option) => optionValue(option) === String(currentValue ?? ""));
    const { style: panelStyle } = useDropdownPlacement(open, rootRef, panelRef, "start", true);
    const instanceId = useDropdownCoordinator(open, () => setOpen(false));

    useEffect(() => {
      if (!open) return;
      selectedOptionRef.current?.scrollIntoView({ block: "nearest" });
      const handlePointerDown = (event: MouseEvent) => {
        const target = event.target as Node;
        if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
      };
      const handleKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
      document.addEventListener("mousedown", handlePointerDown);
      document.addEventListener("keydown", handleKey);
      return () => {
        document.removeEventListener("mousedown", handlePointerDown);
        document.removeEventListener("keydown", handleKey);
      };
    }, [open]);

    const floated = open || selected !== undefined;
    return <div className="flex flex-col gap-1">
      {label && !floatingLabel && !segment && <label htmlFor={selectId} className="mk-label-muted mk-field-label">{label}</label>}
      <div className="group relative" ref={rootRef}>
        {segment && icon && <span className={`pointer-events-none absolute ${dense ? "start-4" : "start-6"} top-1/2 z-10 -translate-y-1/2 transition-colors duration-base ease-standard group-hover:text-mk-blue-500 ${open ? "text-mk-blue-500" : "text-mk-ink-400"}`}>{icon}</span>}
        {label && segment && <label htmlFor={selectId} className={`pointer-events-none absolute ${dense ? "top-1" : "top-2"} ${icon ? dense ? "start-11" : "start-14" : "start-5"} z-10 truncate mk-caption font-semibold text-mk-ink-900`}>{label}</label>}
        {label && floatingLabel && !segment && <label htmlFor={selectId} className={`pointer-events-none absolute top-0 start-5 z-10 origin-top-left truncate transition-[translate,scale,color] duration-base ease-standard mk-body-sm rtl:origin-top-right ${floated ? "translate-y-[0.4rem] scale-[0.8] text-mk-blue-500" : "translate-y-[1.05rem] text-mk-ink-500"}`}>{label}</label>}
        <button ref={ref} type="button" id={selectId} disabled={disabled} aria-haspopup="listbox" aria-expanded={open} onClick={() => { const next = !open; setOpen(next); if (next) announceDropdownOpen(instanceId); }} className={`font-body flex w-full cursor-pointer items-center justify-between gap-1.5 rounded-md border text-start text-mk-fg-1 transition-[border-color,box-shadow,padding,background-color] duration-base ease-standard focus:outline-none focus:border-mk-blue-500 focus:shadow-focus disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]}${variant === "search" && tray ? " mk-view-toggle--reversed !shadow-none" : ""} ${open ? "border-mk-blue-500 shadow-focus" : ""} ${sizeClasses[size]} ${segment ? `${dense ? "!h-11 !pt-4" : "!h-14 !pt-[1.125rem]"} !rounded-pill ${icon ? dense ? "!ps-11 !pe-4" : "!ps-14 !pe-5" : "!px-5"} !border-transparent !bg-transparent !shadow-none hover:!bg-mk-ink-100 ${open ? "!bg-mk-ink-100" : ""}` : ""} ${floatingLabel && !segment ? `!h-14 !rounded-pill !px-5 ${floated ? "!pt-4" : ""}` : ""} ${error ? "border-mk-danger" : ""} ${className}`}>
          {fitWidth ? <span className="grid flex-1 min-w-0">{options.map((option, index) => <span key={option.key ?? index} aria-hidden={option !== selected} className={`col-start-1 row-start-1 whitespace-nowrap ${option === selected ? "" : "invisible h-0 overflow-hidden"}`}>{option.props.children}</span>)}</span> : <span className="min-w-0 flex-1 truncate">{selected?.props.children}</span>}
          <ChevronDown size={chevronSizes[size]} className={`${segment ? "absolute end-5 top-1/2 -translate-y-1/2" : "shrink-0"} pointer-events-none text-mk-ink-400 transition-transform duration-base ease-standard ${open ? "rotate-180" : ""}`} />
        </button>
        <DropdownPortal><div ref={panelRef} style={panelStyle} className={`z-[250] overflow-hidden rounded-lg mk-surface mk-shadow-menu mk-menu-motion ${open ? "open" : ""}`}><div data-lenis-prevent className="overflow-y-auto overscroll-contain py-1 mk-scrollbar" style={{ maxHeight: menuMaxHeight }} role="listbox">{options.map((option, index) => {
          const nextValue = optionValue(option);
          const active = nextValue === String(currentValue ?? "");
          return <button key={option.key ?? index} ref={active ? selectedOptionRef : undefined} type="button" role="option" aria-selected={active} disabled={option.props.disabled} onClick={() => { if (!controlled) setInternalValue(nextValue); onChange?.({ target: { value: nextValue } }); setOpen(false); }} className={`flex w-full cursor-pointer items-center gap-2 border-0 px-3 py-2 text-start mk-body-sm transition-colors duration-base ease-standard disabled:cursor-not-allowed disabled:opacity-40 ${active ? "bg-mk-blue-50 text-mk-blue-700" : "bg-transparent text-mk-ink-900 hover:bg-mk-ink-50"}`}><span className="flex flex-1 items-center gap-2 whitespace-nowrap">{option.props.icon}{option.props.children}</span>{active && <Check size={13} className="shrink-0 text-mk-blue-500" />}</button>;
        })}</div></div></DropdownPortal>
      </div>
      {error && <p className="mk-caption text-mk-danger">{error}</p>}
      {helpText && !error && <p className="mk-caption text-mk-fg-3">{helpText}</p>}
    </div>;
  },
);

function SelectOption(props: OptionElementProps) { void props; return null; }
Select.displayName = "Select";
export { Select, SelectOption };
export type { SelectProps, SelectSize, SelectVariant };
