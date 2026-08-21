"use client";

import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { CheckCircle, AlertCircle } from "lucide-react";

type ToastType = "success" | "error";

interface ToastState {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

/** Fixed-position confirmation/warning pill + provider. Replaces the one-off
 * toast pattern hand-rolled in customers/page.tsx. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = Date.now();
    setToast({ id, message, type });
    window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 3200);
  }, []);

  const isError = toast?.type === "error";
  const icon = isError ? <AlertCircle size={16} className="text-mk-danger shrink-0" /> : <CheckCircle size={16} className="text-mk-mint-500 shrink-0" />;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className="fixed top-6 inset-x-0 z-[300] flex justify-center pointer-events-none">
          <div className={`flex items-center gap-2 px-5 py-3 rounded-pill text-white mk-body-sm shadow-[var(--shadow-lg)] pointer-events-auto ${isError ? "bg-mk-danger" : "bg-mk-midnight"}`}>
            {icon}
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
