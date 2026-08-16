"use client";

import { useContext } from "react";
import { useAuth } from "./AuthContext";
import { useUser, AdminRole } from "./UserContext";
import { useTheme } from "./ThemeContext";
import { useLocale } from "./LocaleContext";
import { useUI } from "./UIContext";

// Re-export types for backward compatibility
export type { AdminRole } from "./UserContext";
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
    authError: auth.authError,
    login: async (username: string, password: string, role: AdminRole) => {
      await auth.login(username, password);
      user.setRole(role);
    },
    logout: auth.logout,

    // User
    currentUser: user.currentUser,
    role: user.role,
    setRole: user.setRole,

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
