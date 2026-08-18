"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { authService } from "@/lib/api-services";
import { ApiError } from "@/lib/api-client";
import * as Types from "@/lib/api-types";

// ─── JWT Token Claims Model ───────────────────────────────────────────

/**
 * Standard JWT claims plus custom Maarkbh-specific claims
 * Based on the actual id_token payload from the backend
 */
export interface AuthUser {
  // Standard JWT claims
  iss: string;           // Issuer: "http://139.59.140.232/"
  sub: string;           // Subject: User ID (e.g., "1")
  iat: number;           // Issued At: Unix timestamp
  exp: number;           // Expiration: Unix timestamp
  
  // Standard OpenID Connect claims
  name: string;          // Username (e.g., "admin@maarkbh.com")
  email: string;         // Email address
  
  // Custom Maarkbh claims
  full_name: string;     // Full display name (e.g., "System Administrator")
  oi_au_id: string;      // OpenIddict Authorization ID
  at_hash: string;       // Access Token hash
  oi_tkn_id: string;     // OpenIddict Token ID

  // Multi-tenant / role claims
  tenant_id?: number | string;  // Present for tenant users; absent for SuperAdmin
  tenantId?: number | string;   // Alternative claim name
  roles?: string[];             // e.g. ["SuperAdmin"] or ["TenantAdmin"]
  role?: string;
}

interface AuthContextValue {
  isLoggedIn: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  authError: string | null;
  decodedToken: AuthUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  refreshAccessToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  isLoggedIn: false,
  isInitialized: false,
  isLoading: false,
  authError: null,
  decodedToken: null,
  login: async () => {},
  logout: () => {},
  clearError: () => {},
  refreshAccessToken: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [decodedToken, setDecodedToken] = useState<AuthUser | null>(null);

  // Tokens now live only in HttpOnly cookies set by the server — the client
  // can't read them directly. On mount, ask the server for the current
  // session state instead of reading sessionStorage.
  useEffect(() => {
    let cancelled = false;

    authService.getSession()
      .then(({ isLoggedIn: loggedIn, user }) => {
        if (cancelled) return;
        setIsLoggedIn(loggedIn);
        setDecodedToken(loggedIn ? (user as AuthUser) : null);
      })
      .catch(() => {
        if (cancelled) return;
        setIsLoggedIn(false);
        setDecodedToken(null);
      })
      .finally(() => {
        if (!cancelled) setIsInitialized(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    setAuthError(null);

    try {
      const { user } = await authService.login({
        grant_type: 'password',
        username,
        password,
      });

      // Cookies are already set server-side at this point; just reflect the
      // resulting session in React state.
      setIsLoggedIn(true);
      setDecodedToken(user as AuthUser);
    } catch (error) {
      console.error("Login error:", error);
      setIsLoggedIn(false);
      setDecodedToken(null);

      // Translate technical errors to user-friendly Arabic messages
      let userFriendlyMessage = "حدث خطأ غير متوقع";

      setAuthError(userFriendlyMessage);
      // Re-throw the error so the caller can handle it
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setIsLoggedIn(false);
    setDecodedToken(null);
    setAuthError(null);
    authService.logout();
  };

  const refreshAccessToken = async () => {
    setIsLoading(true);
    setAuthError(null);

    try {
      const { user } = await authService.refreshToken();
      setIsLoggedIn(true);
      setDecodedToken(user as AuthUser);
    } catch (error) {
      console.error("Token refresh error:", error);
      // If refresh fails, logout the user
      logout();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setAuthError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        isInitialized,
        isLoading,
        authError,
        decodedToken,
        login,
        logout,
        clearError,
        refreshAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
