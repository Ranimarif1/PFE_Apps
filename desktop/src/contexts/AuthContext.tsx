import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { loginApi, getMeApi } from "@/services/authService";

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 min
const WARNING_BEFORE_MS     =  1 * 60 * 1000; // avertissement 1 min avant

export type UserRole = "médecin" | "admin" | "adminIT";

export interface User {
  id: string;
  nom: string;
  prénom: string;
  email: string;
  rôle: UserRole;
  statut: "en_attente" | "validé" | "refusé";
  genre: "homme" | "femme" | "";
  photo: string;
  senior: boolean;
  seniorCode: string;
  mustChangePassword: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  loading: boolean;
  updateUser: (updated: User) => void;
  showInactivityWarning: boolean;
  resetInactivityTimer: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("access_token");
    if (storedToken) {
      setToken(storedToken);
      getMeApi()
        .then((u) => setUser(u))
        .catch(() => {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("auth_user");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const doLogout = useCallback((refresh?: string | null) => {
    const r = refresh ?? localStorage.getItem("refresh_token");
    if (r) {
      fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: r }),
      }).catch(() => {});
    }
    setUser(null);
    setToken(null);
    setShowInactivityWarning(false);
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("auth_user");
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (!localStorage.getItem("access_token")) return;
    setShowInactivityWarning(false);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current)  clearTimeout(logoutTimerRef.current);
    warningTimerRef.current = setTimeout(() => {
      setShowInactivityWarning(true);
      logoutTimerRef.current = setTimeout(() => doLogout(), WARNING_BEFORE_MS);
    }, INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS);
  }, [doLogout]);

  // Start/stop inactivity timer based on login state
  useEffect(() => {
    if (!user) {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (logoutTimerRef.current)  clearTimeout(logoutTimerRef.current);
      return;
    }
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    const handle = () => resetInactivityTimer();
    events.forEach(e => window.addEventListener(e, handle));
    resetInactivityTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, handle));
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (logoutTimerRef.current)  clearTimeout(logoutTimerRef.current);
    };
  }, [user, resetInactivityTimer]);

  const login = async (email: string, password: string) => {
    try {
      const { user: u, access, refresh } = await loginApi(email, password);
      setUser(u);
      setToken(access);
      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);
      localStorage.setItem("auth_user", JSON.stringify(u));
      return { success: true };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erreur de connexion.";
      if (
        message.includes("not validated") ||
        message.includes("Doctor account not validated")
      ) {
        return {
          success: false,
          message:
            "Votre compte est en attente de validation par l'administrateur.",
        };
      }
      if (message.includes("refusé") || message.includes("refused")) {
        return {
          success: false,
          message: "Votre compte a été refusé. Contactez l'administrateur.",
        };
      }
      return { success: false, message: "Email ou mot de passe incorrect." };
    }
  };

  const logout = () => doLogout();

  const updateUser = (updated: User) => {
    setUser(updated);
    localStorage.setItem("auth_user", JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, updateUser, showInactivityWarning, resetInactivityTimer }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
