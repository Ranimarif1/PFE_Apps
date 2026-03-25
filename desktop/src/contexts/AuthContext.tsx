import React, { createContext, useContext, useState, useEffect } from "react";
import { loginApi, getMeApi } from "@/services/authService";

export type UserRole = "médecin" | "admin" | "adminIT";

export interface User {
  id: string;
  nom: string;
  prénom: string;
  email: string;
  rôle: UserRole;
  statut: "en_attente" | "validé" | "refusé";
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("auth_user");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
