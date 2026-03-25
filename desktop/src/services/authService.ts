import { api } from "@/lib/api";
import type { User } from "@/contexts/AuthContext";

// Map backend role/status strings to frontend French equivalents
function mapUser(raw: BackendUser): User {
  const roleMap: Record<string, User["rôle"]> = {
    doctor: "médecin",
    admin: "admin",
    adminIT: "adminIT",
  };
  const statusMap: Record<string, User["statut"]> = {
    pending: "en_attente",
    validated: "validé",
    refused: "refusé",
  };
  return {
    id: raw._id,
    email: raw.email,
    nom: raw.nom || "",
    prénom: raw.prenom || "",
    rôle: roleMap[raw.role] ?? "médecin",
    statut: statusMap[raw.status] ?? "en_attente",
  };
}

interface BackendUser {
  _id: string;
  email: string;
  role: string;
  status: string;
  nom: string;
  prenom: string;
}

interface LoginResponse {
  access: string;
  refresh: string;
  user: BackendUser;
}

export async function loginApi(
  email: string,
  password: string
): Promise<{ user: User; access: string; refresh: string }> {
  const data = await api.post<LoginResponse>("/api/auth/login", {
    email,
    password,
  });
  return {
    user: mapUser(data.user),
    access: data.access,
    refresh: data.refresh,
  };
}

export async function registerApi(payload: {
  email: string;
  password: string;
  role: string;
  nom: string;
  prenom: string;
}): Promise<void> {
  await api.post("/api/auth/register", payload);
}

export async function getMeApi(): Promise<User> {
  const raw = await api.get<BackendUser>("/api/auth/me");
  return mapUser(raw);
}
