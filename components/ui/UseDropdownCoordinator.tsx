"use client";

import { useEffect, useId, useRef } from "react";

// Every custom dropdown/menu in the app (Select, SidebarRoleSwitcher, …)
// manages its own `open` state independently, closing itself only on an
// outside click. Two independent dropdowns can therefore both end up open
// at once — e.g. opening one via click doesn't dismiss another that was
// left open earlier by a click that landed outside it but before this one
// mounted its own listener. Broadcasting "I just opened" over one shared
// document-level event, and having every dropdown close itself when it
// hears a broadcast that isn't its own, guarantees only one is ever open.
const DROPDOWN_OPEN_EVENT = "mk:dropdown-open";

export function announceDropdownOpen(instanceId: string) {
  document.dispatchEvent(new CustomEvent<string>(DROPDOWN_OPEN_EVENT, { detail: instanceId }));
}

/** Returns a stable id for this dropdown instance and closes it whenever a
 * different dropdown instance announces that it just opened. */
export function useDropdownCoordinator(open: boolean, onCloseOther: () => void): string {
  const instanceId = useId();
  // Callers pass a fresh arrow function every render — reading it through a
  // ref instead of listing it as an effect dependency keeps the listener
  // mounted for the entire time the dropdown is open, rather than tearing
  // down and re-attaching it on every unrelated re-render.
  const onCloseOtherRef = useRef(onCloseOther);
  useEffect(() => {
    onCloseOtherRef.current = onCloseOther;
  });

  useEffect(() => {
    if (!open) return;
    function handleOtherOpen(e: Event) {
      const detail = (e as CustomEvent<string>).detail;
      if (detail !== instanceId) onCloseOtherRef.current();
    }
    document.addEventListener(DROPDOWN_OPEN_EVENT, handleOtherOpen);
    return () => document.removeEventListener(DROPDOWN_OPEN_EVENT, handleOtherOpen);
  }, [open, instanceId]);

  return instanceId;
}