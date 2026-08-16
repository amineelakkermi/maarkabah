"use client";

import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { CheckCircle } from "lucide-react";

interface ToastState {
  id: number;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

/** Fixed-position confirmation pill + provider. Replaces the one-off
 * toast pattern hand-rolled in customers/page.tsx. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string) => {
    const id = Date.now();
    setToast({ id, message });
    window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 2600);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className="fixed top-6 inset-x-0 z-[300] flex justify-center pointer-events-none">
          <div className="flex items-center gap-2 px-5 py-3 rounded-pill bg-mk-midnight text-white mk-body-sm shadow-[var(--shadow-lg)] pointer-events-auto">
            <CheckCircle size={16} className="text-mk-mint-500 shrink-0" />
            {toast.message}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
