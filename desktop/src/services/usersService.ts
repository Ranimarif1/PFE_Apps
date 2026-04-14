import { api } from "@/lib/api";

export interface BackendUserRecord {
  _id: string;
  email: string;
  role: string;
  status: string;
  nom: string;
  prenom: string;
  createdAt: string;
}

export async function getUsers(): Promise<BackendUserRecord[]> {
  const data = await api.get<{ results: BackendUserRecord[] }>("/api/auth/users");
  return data.results;
}

export interface UpdateStatusResult {
  user: BackendUserRecord;
  mail_warning?: string;
}

export async function updateUserStatus(
  userId: string,
  status: "pending" | "validated" | "refused",
  reason?: string
): Promise<UpdateStatusResult> {
  const body: Record<string, string> = { status };
  if (reason) body.reason = reason;
  const data = await api.put<UpdateStatusResult>(
    `/api/auth/users/${userId}/status`,
    body
  );
  return data;
}

export async function deleteUser(userId: string): Promise<void> {
  await api.delete(`/api/auth/users/${userId}`);
}

export async function changeUserRole(userId: string, role: "doctor" | "admin"): Promise<BackendUserRecord> {
  const data = await api.put<{ user: BackendUserRecord }>(`/api/auth/users/${userId}/role`, { role });
  return data.user;
}
