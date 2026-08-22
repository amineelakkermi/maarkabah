"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAuth, AuthUser } from "./AuthContext";
import { mapAuthUserToProfile } from "@/lib/user-mapper";

export interface UserProfile {
  name: string;
  initials: string;
  phone: string;
  branch: string;
  branchAr: string;
  roleLabel?: string;
  roleLabelAr?: string;
  operatorId: string;
}

interface UserContextValue {
  currentUser: UserProfile | null;
}

const UserContext = createContext<UserContextValue>({
  currentUser: null,
});

export function UserProvider({ children }: { children: ReactNode }) {
  const { decodedToken, isLoggedIn } = useAuth();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Update user profile when decoded token changes
  useEffect(() => {
    if (decodedToken && isLoggedIn) {
      setCurrentUser(mapAuthUserToProfile(decodedToken));
    } else {
      setCurrentUser(null);
    }
  }, [decodedToken, isLoggedIn]);

  return (
    <UserContext.Provider
      value={{
        currentUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
