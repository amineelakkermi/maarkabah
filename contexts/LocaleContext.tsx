"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";

interface LocaleContextValue {
  dir: "rtl" | "ltr";
  toggleDir: () => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  dir: "rtl",
  toggleDir: () => {},
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [dir, setDir] = useState<"rtl" | "ltr">("rtl");

  // Load direction preference from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedDir = sessionStorage.getItem("mk_dir") as "rtl" | "ltr";
      if (savedDir) {
        setDir(savedDir);
      }
    }
  }, []);

  // Apply direction to DOM
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = dir === "rtl" ? "ar" : "en";
  }, [dir]);

  const toggleDir = () => {
    setDir((prev) => {
      const next = prev === "rtl" ? "ltr" : "rtl";
      if (typeof window !== "undefined") {
        sessionStorage.setItem("mk_dir", next);
      }
      return next;
    });
  };

  return (
    <LocaleContext.Provider
      value={{
        dir,
        toggleDir,
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
