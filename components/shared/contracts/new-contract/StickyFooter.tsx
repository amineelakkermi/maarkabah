"use client";

import { ArrowRight, ArrowLeft, CreditCard, FileText, Check } from "lucide-react";
import { Button } from "@/components/ui";
import { T, STEPS } from "./constants";

export type ContractStep = "idle" | "saving" | "pending_signature" | "issued" | "error";

// Sticky bottom navigation bar: Back button, step indicator and the per-step CTA.
export function StickyFooter({
  ar, step, onStepChange, contractStep, otpComplete, canContinueFromStep0,
  payType, advanceAmount, total, onIssue, onCheckSignature, onRetry,
}: {
  ar: boolean;
  step: number;
  onStepChange: (step: number) => void;
  contractStep: ContractStep;
  otpComplete: boolean;
  canContinueFromStep0: boolean;
  payType: "full" | "advance";
  advanceAmount: number;
  total: number;
  onIssue: () => void;
  onCheckSignature: () => void;
  onRetry: () => void;
}) {
  if (!(step < 3 || contractStep === "idle" || contractStep === "pending_signature" || contractStep === "error")) return null;

  return (
    <div className="sticky bottom-0 z-40 mk-surface border border-mk-border py-4 px-6 flex justify-between items-center shadow-[0_4px_20px_rgba(0,0,0,0.08)] rounded-xl mt-6 animate-[fi_0.22s_ease-out]">
      {/* Back Button */}
      {step > 0 && (contractStep === "idle" || contractStep === "error") ? (
        <Button
          variant="outline"
          onClick={() => {
            if (step === 3) {
              onStepChange(2);
            } else {
              onStepChange(step - 1);
            }
          }}
          className="shrink-0 whitespace-nowrap"
        >
          {ar ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
          {T("Back", "رجوع", ar)}
        </Button>
      ) : (
        <div />
      )}

      {/* Step indicator */}
      <div className="hidden sm:flex items-center gap-2 mk-caption text-mk-ink-500">
        <span>{T("Step", "الخطوة", ar)} {step + 1} {T("of", "من", ar)} 4 · </span>
        <span className="text-mk-ink-700">
          {step === 3
            ? (contractStep === "pending_signature"
              ? (otpComplete ? T("Awaiting Signature", "بانتظار التوقيع", ar) : T("Verifying Renter", "التحقق من المستأجر", ar))
              : T("Review & Issue", "مراجعة وإصدار", ar))
            : (ar ? STEPS[step].labelAr : STEPS[step].labelEn)}
        </span>
      </div>

      {/* Action CTAs */}
      <div className="flex items-center gap-2 shrink-0">
        {step === 0 && (
          <Button
            onClick={() => onStepChange(1)}
            disabled={!canContinueFromStep0}
            className="shadow-[var(--shadow-glow-blue)] shrink-0 whitespace-nowrap"
          >
            {T("Continue", "متابعة", ar)}
            {ar ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
          </Button>
        )}
        {step === 1 && (
          <Button variant="primary" onClick={() => onStepChange(2)} className="shadow-[var(--shadow-glow-blue)] shrink-0 whitespace-nowrap">
            {T("Continue to payment", "متابعة إلى الدفع", ar)}
            {ar ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
          </Button>
        )}
        {step === 2 && (
          <Button
            onClick={() => onStepChange(3)}
            className="shadow-[var(--shadow-glow-blue)] shrink-0 whitespace-nowrap"
          >
            <CreditCard size={14} />
            {payType === "advance"
              ? `${T("Capture advance", "تنفيذ الدفع المقدم", ar)} · ${advanceAmount.toLocaleString()} ${T("SAR", "ريال", ar)}`
              : `${T("Capture payment", "تنفيذ الدفع", ar)} · ${total.toLocaleString()} ${T("SAR", "ريال", ar)}`
            }
          </Button>
        )}
        {step === 3 && (
          <>
            {contractStep === "idle" && (
              <Button variant="primary" onClick={onIssue}
                className="shadow-[var(--shadow-glow-blue)] shrink-0 whitespace-nowrap">
                <FileText size={15} />
                {T("Issue Unified Contract", "إصدار العقد الموحد", ar)}
              </Button>
            )}
            {contractStep === "pending_signature" && otpComplete && (
              <Button variant="primary" onClick={onCheckSignature}
                className="shadow-[var(--shadow-glow-blue)] shrink-0 whitespace-nowrap">
                <Check size={14} />
                {T("Check signature status", "التحقق من حالة التوقيع", ar)}
              </Button>
            )}
            {contractStep === "error" && (
              <Button variant="primary" onClick={onRetry}
                className="shadow-[var(--shadow-glow-blue)] shrink-0 whitespace-nowrap">
                {T("Try again", "حاول مرة أخرى", ar)}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
