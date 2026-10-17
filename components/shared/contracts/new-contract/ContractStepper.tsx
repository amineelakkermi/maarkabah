"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { STEPS, T } from "./constants";
import { DropdownPortal } from "@/components/ui/DropdownPortal";
import { useDropdownPlacement } from "@/components/ui/useDropdownPlacement";
import { useDropdownCoordinator } from "@/components/ui/UseDropdownCoordinator";

// Clickable stepper: every step already reached (maxStep) can be reopened;
// later steps stay locked until Continue is used. Locked entirely while the
// contract is being saved / awaiting the renter, since the form can no longer
// change. Desktop shows pill steps; mobile shows a progress ring that opens
// a portal dropdown of all steps.
export function ContractStepper({
  ar,
  step,
  onStepChange,
  locked = false,
}: {
  ar: boolean;
  step: number;
  onStepChange: (step: number) => void;
  /** True while the contract is saving / pending signature — navigation is frozen. */
  locked?: boolean;
}) {
  const [maxStep, setMaxStep] = useState(0);
  useEffect(() => { setMaxStep((m) => Math.max(m, step)); }, [step]);

  const [stepsOpen, setStepsOpen] = useState(false);
  const stepsRootRef = useRef<HTMLDivElement>(null);
  const stepsPanelRef = useRef<HTMLDivElement>(null);
  const { style: stepsPanelStyle } = useDropdownPlacement(stepsOpen, stepsRootRef, stepsPanelRef);
  useDropdownCoordinator(stepsOpen, () => setStepsOpen(false));

  useEffect(() => {
    if (!stepsOpen) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (stepsRootRef.current?.contains(t) || stepsPanelRef.current?.contains(t)) return;
      setStepsOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setStepsOpen(false); }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [stepsOpen]);

  // Labels stay put so nothing shifts.
  return (
    <nav aria-label={T("Contract steps", "خطوات العقد", ar)} className="-mt-1 mb-5 mk-surface rounded-xl p-3 flex items-center gap-4">
      {/* Mobile: progress ring that fills one quarter per step, with the current
          step's name and what's next */}
      <div ref={stepsRootRef} className="relative min-w-0 md:hidden">
        <button
          type="button"
          disabled={locked}
          onClick={() => setStepsOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={stepsOpen}
          aria-label={T("Jump to step", "الانتقال إلى خطوة", ar)}
          className="flex items-center gap-4 min-w-0 max-w-full bg-transparent border-0 p-0 text-start cursor-pointer disabled:cursor-default"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div
              className="relative h-14 w-14 shrink-0"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={STEPS.length}
              aria-valuenow={step + 1}
              aria-label={T(`Step ${step + 1} of ${STEPS.length}`, `الخطوة ${step + 1} من ${STEPS.length}`, ar)}
            >
              <svg viewBox="0 0 56 56" className="block h-full w-full -rotate-90" aria-hidden>
                <circle cx="28" cy="28" r="24" fill="none" strokeWidth="5" stroke="var(--color-mk-ink-200)" />
                <circle
                  cx="28" cy="28" r="24" fill="none" strokeWidth="5" strokeLinecap="round"
                  stroke="var(--color-mk-blue-500)"
                  pathLength={100}
                  strokeDasharray={`${((step + 1) / STEPS.length) * 100} 100`}
                  style={{ transition: "stroke-dasharray 400ms var(--ease-standard)" }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center mk-label text-mk-ink-900" dir="ltr">
                {step + 1}<span className="text-mk-ink-400">/{STEPS.length}</span>
              </span>
            </div>
            <div className="min-w-0">
              <h2 className="mk-h4 text-mk-ink-900 m-0 truncate">{ar ? STEPS[step].labelAr : STEPS[step].labelEn}</h2>
              <p className="mk-caption text-mk-ink-500 mt-1 m-0 truncate">
                {step < STEPS.length - 1
                  ? T(`Next: ${STEPS[step + 1].labelEn}`, `التالي: ${STEPS[step + 1].labelAr}`, ar)
                  : T("Last step", "الخطوة الأخيرة", ar)}
              </p>
            </div>
          </div>
          {!locked && <ChevronDown size={18} className={`shrink-0 text-mk-ink-400 transition-transform ${stepsOpen ? "rotate-180" : ""}`} />}
        </button>
        <DropdownPortal>
          <div
            ref={stepsPanelRef}
            style={{ ...stepsPanelStyle, minWidth: 0, width: "max-content" }}
            className={`z-[250] rounded-lg mk-surface mk-shadow-menu overflow-hidden mk-menu-motion ${stepsOpen && !locked ? "open" : ""}`}
          >
            <ul role="listbox" className="m-0 p-1 list-none whitespace-nowrap">
              {STEPS.map((st, i) => {
                const reachable = i <= maxStep;
                const current = i === step;
                return (
                  <li key={st.labelEn} role="option" aria-selected={current}>
                    <button
                      type="button"
                      disabled={!reachable}
                      onClick={() => { onStepChange(i); setStepsOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md border-0 text-start mk-body-sm transition-colors duration-base ease-standard ${
                        current ? "bg-mk-blue-surface text-mk-blue-500 cursor-default"
                          : reachable ? "bg-transparent text-mk-ink-900 cursor-pointer hover:bg-mk-ink-50"
                          : "bg-transparent text-mk-ink-300 cursor-not-allowed"
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mk-caption ${
                        current ? "bg-mk-blue-500 text-white" : reachable ? "bg-mk-mint-surface text-mk-mint-600" : "bg-mk-ink-50 text-mk-ink-400"
                      }`}>
                        {reachable && !current ? <Check size={13} /> : i + 1}
                      </span>
                      {ar ? st.labelAr : st.labelEn}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </DropdownPortal>
      </div>

      {/* Desktop: clickable steps */}
      <ol className="hidden md:flex flex-1 items-center gap-6 min-w-0 m-0 p-0 list-none">
        {STEPS.map((st, i) => {
          const reachable = !locked && i <= maxStep;
          const current = i === step;
          const done = i < step || (i <= maxStep && !current);
          return (
            <li key={st.labelEn} className="flex items-center min-w-0">
              <button
                type="button"
                disabled={!reachable || current}
                onClick={() => onStepChange(i)}
                aria-current={current ? "step" : undefined}
                className={`flex items-center gap-2.5 min-w-0 rounded-pill border-0 bg-transparent p-0 text-start ${reachable && !current ? "cursor-pointer" : "cursor-default"}`}
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mk-label transition-colors ${
                  current ? "bg-mk-blue-surface text-mk-blue-500"
                    : done ? "bg-mk-mint-surface text-mk-mint-600"
                    : "bg-mk-ink-50 text-mk-ink-400"
                }`}>
                  {done ? <Check size={15} /> : i + 1}
                </span>
                <span className={`mk-label !font-normal truncate ${current ? "text-mk-ink-900" : ""} ${!current && reachable ? "text-mk-ink-600 hover:text-mk-ink-900" : ""} ${!current && !reachable ? "text-mk-ink-400" : ""}`}>
                  {ar ? st.labelAr : st.labelEn}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
