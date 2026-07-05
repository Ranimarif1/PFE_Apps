import { api } from "@/lib/api";

export interface BackendUserRecord {
  _id: string;
  email: string;
  role: string;
  status: string;
  nom: string;
  prenom: string;
  createdAt: string;
  senior?: boolean;
  seniorCode?: string;
}

function capitalizeName(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

function normalizeRecord(u: BackendUserRecord): BackendUserRecord {
  return { ...u, nom: capitalizeName(u.nom || ""), prenom: capitalizeName(u.prenom || "") };
}

export async function getUsers(): Promise<BackendUserRecord[]> {
  const data = await api.get<{ results: BackendUserRecord[] }>("/api/auth/users");
  return data.results.map(normalizeRecord);
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
  return { ...data, user: normalizeRecord(data.user) };
}

export interface UserReportInfo {
  report_count: number;
  auto_senior: { id: string; name: string } | null;
}

export async function getUserReportInfo(userId: string): Promise<UserReportInfo> {
  return api.get<UserReportInfo>(`/api/auth/users/${userId}/report-info`);
}

export async function deleteUser(userId: string): Promise<void> {
  await api.delete(`/api/auth/users/${userId}`);
}

export async function changeUserRole(userId: string, role: "doctor" | "admin", seniorCode?: string): Promise<BackendUserRecord> {
  const body: Record<string, string> = { role };
  if (seniorCode) body.seniorCode = seniorCode;
  const data = await api.put<{ user: BackendUserRecord }>(`/api/auth/users/${userId}/role`, body);
  return normalizeRecord(data.user);
}

export async function updateSeniorCode(userId: string, seniorCode: string): Promise<BackendUserRecord> {
  const data = await api.patch<{ user: BackendUserRecord }>(`/api/auth/users/${userId}/senior-code`, { seniorCode });
  return normalizeRecord(data.user);
}

export async function revokeSenior(userId: string): Promise<BackendUserRecord> {
  const data = await api.patch<{ user: BackendUserRecord }>(`/api/auth/users/${userId}/revoke-senior`, {});
  return normalizeRecord(data.user);
}

export async function grantSenior(userId: string, seniorCode: string): Promise<BackendUserRecord> {
  const data = await api.patch<{ user: BackendUserRecord }>(`/api/auth/users/${userId}/grant-senior`, { seniorCode });
  return normalizeRecord(data.user);
}
