import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  changePassword as changePasswordRequest,
  fetchCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  type AuthUser,
} from "../services/api";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<AuthUser>;
  refresh: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  async function refresh(): Promise<AuthUser | null> {
    try {
      const response = await fetchCurrentUser();
      setUser(response.user);
      setStatus("authenticated");
      return response.user;
    } catch {
      setUser(null);
      setStatus("unauthenticated");
      return null;
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function login(email: string, password: string): Promise<AuthUser> {
    const response = await loginRequest(email, password);
    setUser(response.user);
    setStatus("authenticated");
    return response.user;
  }

  async function logout(): Promise<void> {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
      setStatus("unauthenticated");
    }
  }

  async function changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Promise<AuthUser> {
    const response = await changePasswordRequest(currentPassword, newPassword, confirmPassword);
    setUser(response.user);
    setStatus("authenticated");
    return response.user;
  }

  return (
    <AuthContext.Provider value={{ status, user, login, logout, changePassword, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
