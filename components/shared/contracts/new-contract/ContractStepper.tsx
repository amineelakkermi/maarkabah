"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/ui";
import { STEPS } from "./constants";

// Desktop stepper (lg+) and mobile/tablet progress card (< lg). Steps already
// completed are clickable to go back; upcoming steps are not.
export function ContractStepper({ ar, step, onStepChange }: { ar: boolean; step: number; onStepChange: (step: number) => void }) {
  return (
    <>
      {/* Desktop Stepper — visible ONLY on desktop (lg:flex) */}
      <div className="hidden lg:flex mk-stepper">
        {STEPS.map((s, i) => (
          <button
            key={i}
            className={`mk-step ${i === step ? "active" : i < step ? "done" : ""}`}
            onClick={() => i <= step && onStepChange(i)}
          >
            <div className="mk-step-num">{i < step ? <Check size={12} /> : i + 1}</div>
            <span>{ar ? s.labelAr : s.labelEn}</span>
          </button>
        ))}
      </div>

      {/* Mobile & Tablet Responsive Progress Stepper — visible on mobile & tablet (< lg) */}
      <div className="lg:hidden rounded-xl p-5 mb-6 bg-white shadow-[var(--shadow-card)]">
        {/* Current Step Title & Step Count Badge */}
        <div className="flex items-center justify-between gap-3">
          <div className="mk-h4 text-mk-ink-900 font-semibold m-0">
            {ar ? STEPS[step].labelAr : STEPS[step].labelEn}
          </div>
          <Badge variant="info">
            {ar ? `الخطوة ${step + 1} من ${STEPS.length}` : `Step ${step + 1} of ${STEPS.length}`}
          </Badge>
        </div>

        {/* Segmented Progress Track */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 my-4">
          {STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => i <= step && onStepChange(i)}
              className={`h-2 rounded-full transition-all duration-300 border-0 p-0 ${i === step
                  ? "bg-mk-blue-500"
                  : i < step
                    ? "bg-mk-success cursor-pointer"
                    : "bg-mk-ink-100 cursor-default"
                }`}
              title={ar ? STEPS[i].labelAr : STEPS[i].labelEn}
            />
          ))}
        </div>

        {/* Footer: Next step preview */}
        {step < STEPS.length - 1 && (
          <div className="flex items-center gap-2 mt-2">
            <span className="mk-caption text-mk-ink-500 shrink-0">
              {ar ? "الخطوة التالية:" : "Next step:"}
            </span>
            <span className="mk-caption text-mk-ink-700 font-medium truncate">
              {ar ? STEPS[step + 1].labelAr : STEPS[step + 1].labelEn}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
