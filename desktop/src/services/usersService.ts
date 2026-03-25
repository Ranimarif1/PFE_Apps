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

export async function updateUserStatus(
  userId: string,
  status: "pending" | "validated" | "refused"
): Promise<BackendUserRecord> {
  const data = await api.put<{ user: BackendUserRecord }>(
    `/api/auth/users/${userId}/status`,
    { status }
  );
  return data.user;
}

export async function deleteUser(userId: string): Promise<void> {
  await api.delete(`/api/auth/users/${userId}`);
}
