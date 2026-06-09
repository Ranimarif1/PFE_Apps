import { api } from "@/lib/api";
import type { User } from "@/contexts/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// Resolve a stored photo value to a URL the <img> tag can load.
// - "" → ""
// - "data:..." (legacy base64) → unchanged
// - "http(s)://..." → unchanged
// - "/media/..." → prefixed with the API origin
function resolvePhotoUrl(photo: string): string {
  if (!photo) return "";
  if (photo.startsWith("data:") || photo.startsWith("http://") || photo.startsWith("https://")) {
    return photo;
  }
  if (photo.startsWith("/")) return `${API_BASE_URL}${photo}`;
  return photo;
}

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
    nom: (raw.nom || "").replace(/\b\w/g, (c: string) => c.toUpperCase()),
    prénom: (raw.prenom || "").replace(/\b\w/g, (c: string) => c.toUpperCase()),
    rôle: roleMap[raw.role] ?? "médecin",
    statut: statusMap[raw.status] ?? "en_attente",
    genre: (raw.genre === "homme" || raw.genre === "femme") ? raw.genre : "",
    photo: resolvePhotoUrl(raw.photo || ""),
    senior: raw.senior ?? raw.role === "admin",
    seniorCode: raw.seniorCode || "",
    mustChangePassword: raw.mustChangePassword ?? false,
  };
}

interface BackendUser {
  _id: string;
  email: string;
  role: string;
  status: string;
  nom: string;
  prenom: string;
  genre: string;
  photo: string;
  senior?: boolean;
  seniorCode?: string;
  mustChangePassword?: boolean;
}

export interface PasswordResetRequest {
  _id: string;
  userId: string;
  email: string;
  role: string;
  nom: string;
  prenom: string;
  status: string;
  createdAt: string;
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

export async function checkSeniorCodeApi(code: string): Promise<{ available: boolean }> {
  const data = await api.get<{ available: boolean }>(`/api/auth/check-senior-code?code=${encodeURIComponent(code)}`);
  return data;
}

export async function registerApi(payload: {
  email: string;
  password: string;
  role: string;
  nom: string;
  prenom: string;
  genre?: string;
  senior?: boolean;
  seniorCode?: string;
}): Promise<void> {
  await api.post("/api/auth/register", payload);
}

export interface Senior {
  id: string;
  nom: string;
  prenom: string;
  seniorCode: string;
  role: string;
}

export async function getSeniorsApi(): Promise<Senior[]> {
  const data = await api.get<{ results: Senior[] }>("/api/auth/seniors");
  return data.results;
}

export async function sendVerificationCodeApi(email: string): Promise<void> {
  await api.post("/api/auth/send-verification-code", { email });
}

export async function verifyEmailCodeApi(email: string, code: string): Promise<void> {
  await api.post("/api/auth/verify-email-code", { email, code });
}

export async function getMeApi(): Promise<User> {
  const raw = await api.get<BackendUser>("/api/auth/me");
  return mapUser(raw);
}

export async function forgotPasswordApi(email: string): Promise<void> {
  await api.post("/api/auth/forgot-password", { email });
}

export async function requestPasswordResetApi(email: string): Promise<void> {
  await api.post("/api/auth/request-password-reset", { email });
}

export async function getPasswordResetRequestsApi(): Promise<PasswordResetRequest[]> {
  const data = await api.get<{ results: PasswordResetRequest[] }>("/api/auth/password-reset-requests");
  return data.results;
}

export async function setTempPasswordApi(userId: string, password: string): Promise<void> {
  await api.post(`/api/auth/set-temp-password/${userId}`, { password });
}

export async function changePasswordApi(password: string): Promise<void> {
  await api.post("/api/auth/change-password", { password });
}

export async function resetPasswordApi(token: string, password: string): Promise<void> {
  await api.post("/api/auth/reset-password", { token, password });
}

export async function updateProfileApi(payload: {
  nom?: string;
  prenom?: string;
  email?: string;
  password?: string;
  photo?: string;
  seniorCode?: string;
}): Promise<User> {
  const raw = await api.patch<BackendUser>("/api/auth/profile", payload);
  return mapUser(raw);
}
