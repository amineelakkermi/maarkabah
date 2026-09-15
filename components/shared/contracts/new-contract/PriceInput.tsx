"use client";

import { RotateCcw } from "lucide-react";
import { Input } from "@/components/ui";
import { T } from "./constants";

// A Pricing Details field with a registered system default — an in-field
// reset icon (Input's `suffix` slot) appears only once the employee's
// value has actually drifted from that default, and clearing the field
// falls straight back to it via `onChange`.
export function PriceInputField({
  value, onChange, defaultValue, ar, min, max, helpText,
}: {
  value: number;
  onChange: (v: number) => void;
  defaultValue: number;
  ar: boolean;
  min?: number;
  max?: number;
  helpText?: string;
}) {
  const changed = value !== defaultValue;
  return (
    <Input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value) || defaultValue)}
      helpText={helpText}
      suffix={changed ? (
        <button
          type="button"
          onClick={() => onChange(defaultValue)}
          title={T("Reset to system default", "استعادة القيمة الافتراضية", ar)}
          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-mk-ink-400 hover:text-mk-blue-500 hover:bg-mk-ink-100 transition-colors cursor-pointer"
        >
          <RotateCcw size={12} />
        </button>
      ) : undefined}
    />
  );
}

// Labeled wrapper around PriceInputField for the common case (label above field).
export function PriceInput({
  label, value, onChange, defaultValue, ar, min, max, helpText,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  defaultValue: number;
  ar: boolean;
  min?: number;
  max?: number;
  helpText?: string;
}) {
  return (
    <div>
      <label className="mk-overline mb-2 block text-mk-ink-600">{label}</label>
      <PriceInputField value={value} onChange={onChange} defaultValue={defaultValue} ar={ar} min={min} max={max} helpText={helpText} />
    </div>
  );
}
