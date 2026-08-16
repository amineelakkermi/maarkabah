"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAuth, AuthUser } from "./AuthContext";
import { mapAuthUserToProfile } from "@/lib/user-mapper";

export type AdminRole = "owner" | "frontdesk";

export interface UserProfile {
  name: string;
  initials: string;
  phone: string;
  branch: string;
  branchAr: string;
  roleLabel: string;
  roleLabelAr: string;
  operatorId: string;
}

interface UserContextValue {
  currentUser: UserProfile | null;
  role: AdminRole;
  setRole: (role: AdminRole) => void;
  updateUserProfile: (decodedToken: AuthUser, selectedRole: AdminRole) => void;
}

const UserContext = createContext<UserContextValue>({
  currentUser: null,
  role: "owner",
  setRole: () => {},
  updateUserProfile: () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const { decodedToken, isLoggedIn } = useAuth();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<AdminRole>("owner");

  // Load role from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedRole = sessionStorage.getItem("mk_role") as AdminRole;
      if (savedRole) {
        setRole(savedRole);
      }
    }
  }, []);

  // Update user profile when decoded token changes
  useEffect(() => {
    if (decodedToken && isLoggedIn) {
      updateUserProfile(decodedToken, role);
    }
  }, [decodedToken, isLoggedIn, role]);

  const updateUserProfile = (decodedToken: AuthUser, selectedRole: AdminRole) => {
    setCurrentUser(mapAuthUserToProfile(decodedToken, selectedRole));
  };

  const handleSetRole = (newRole: AdminRole) => {
    setRole(newRole);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("mk_role", newRole);
    }
    // Update user profile with new role
    if (decodedToken) {
      updateUserProfile(decodedToken, newRole);
    }
  };

  return (
    <UserContext.Provider
      value={{
        currentUser,
        role,
        setRole: handleSetRole,
        updateUserProfile,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
