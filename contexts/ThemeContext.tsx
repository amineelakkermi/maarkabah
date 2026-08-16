"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { usePathname } from "next/navigation";

interface ThemeContextValue {
  isDark: boolean;
  toggleDark: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  toggleDark: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(true);
  const pathname = usePathname();

  // Load dark mode preference from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedDark = sessionStorage.getItem("mk_dark_mode");
      if (savedDark !== null) {
        setIsDark(savedDark === "true");
      }
    }
  }, []);

  // Apply dark mode to DOM
  useEffect(() => {
    const html = document.documentElement;
    if (isDark) {
      html.setAttribute("data-theme", "dark");
    } else {
      html.removeAttribute("data-theme");
    }
  }, [isDark]);

  const toggleDark = () => {
    setIsDark((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        sessionStorage.setItem("mk_dark_mode", String(next));
      }
      return next;
    });
  };

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        toggleDark,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
