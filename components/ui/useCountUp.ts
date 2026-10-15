"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

// One number, optional prefix/suffix ("4,820", "68%", "SAR 84K", "1.4 d").
// Anything with a second number ("1h 38m") or non-Latin digits ("3٫6 يوم")
// isn't animated — it's rendered as-is.
const SINGLE_NUMBER = /^(\D*?)(\d[\d,]*(?:\.\d+)?)(\D*)$/;

function parse(value: string | number) {
  const str = String(value);
  const m = str.match(SINGLE_NUMBER);
  if (!m) return null;
  const [, prefix, num, suffix] = m;
  const decimals = num.includes(".") ? num.split(".")[1].length : 0;
  return { prefix, suffix, target: parseFloat(num.replace(/,/g, "")), decimals, grouped: num.includes(",") };
}

function format(n: number, p: NonNullable<ReturnType<typeof parse>>) {
  const fixed = n.toFixed(p.decimals);
  const body = p.grouped
    ? Number(fixed).toLocaleString("en-US", { minimumFractionDigits: p.decimals, maximumFractionDigits: p.decimals })
    : fixed;
  return `${p.prefix}${body}${p.suffix}`;
}

const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

// Resolved start time of the entering card this element sits in — the
// registered --enter-delay custom property from the page's entrance
// sequence (globals.css), so the count starts when its card lands.
function enterDelayOf(el: Element | null) {
  if (!el) return 0;
  const raw = getComputedStyle(el).getPropertyValue("--enter-delay").trim();
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return 0;
  return raw.endsWith("ms") ? n : n * 1000;
}

/**
 * Counts a displayed metric up from 0 (or from its previous value when it
 * changes) to its target with an ease-out-expo curve, via rAF. Keeps the
 * value's own prefix/suffix/grouping/decimals. Respects
 * prefers-reduced-motion (jumps straight to the final value). Pass the
 * element's ref to line the start up with its card's entrance.
 */
export function useCountUp(
  value: string | number,
  { duration = 1100, delay = 0, ref }: { duration?: number; delay?: number; ref?: RefObject<Element | null> } = {},
) {
  const parsed = parse(value);
  const [display, setDisplay] = useState(() => (parsed ? format(0, parsed) : String(value)));
  const fromRef = useRef(0);

  useEffect(() => {
    const p = parse(value);
    if (!p) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const from = fromRef.current;
    // Only wait for the entrance on the first count, not on later updates.
    const wait = reduce ? 0 : delay + (from === 0 ? enterDelayOf(ref?.current ?? null) + 150 : 0);
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = reduce ? 1 : Math.min(1, (now - start - wait) / duration);
      if (t >= 0) {
        const v = from + (p.target - from) * easeOutExpo(t);
        setDisplay(format(v, p));
        fromRef.current = v;
      }
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, delay, ref]);

  // Values that can't be counted (two numbers, Arabic digits) render as-is.
  return parsed ? display : String(value);
}
