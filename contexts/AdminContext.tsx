"use client";

import { useContext } from "react";
import { useAuth } from "./AuthContext";
import { useUser } from "./UserContext";
import { useTheme } from "./ThemeContext";
import { useLocale } from "./LocaleContext";
import { useUI } from "./UIContext";

// Backward compatibility types
export type { UserProfile } from "./UserContext";

// Backward compatibility hook that aggregates all contexts
export function useAdmin() {
  const auth = useAuth();
  const user = useUser();
  const theme = useTheme();
  const locale = useLocale();
  const ui = useUI();

  return {
    // Auth
    isLoggedIn: auth.isLoggedIn,
    isLoading: auth.isLoading,
    isInitialized: auth.isInitialized,
    authError: auth.authError,
    login: auth.login,
    logout: auth.logout,

    // User
    currentUser: user.currentUser,

    // Theme
    isDark: theme.isDark,
    toggleDark: theme.toggleDark,

    // Locale
    dir: locale.dir,
    toggleDir: locale.toggleDir,

    // UI
    sidebarOpen: ui.sidebarOpen,
    setSidebarOpen: ui.setSidebarOpen,
    sidebarCollapsed: ui.sidebarCollapsed,
    setSidebarCollapsed: ui.setSidebarCollapsed,
    toggleSidebarCollapsed: ui.toggleSidebarCollapsed,
  };
}
