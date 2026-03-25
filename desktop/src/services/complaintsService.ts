import { api } from "@/lib/api";

export interface Complaint {
  _id: string;
  doctorId: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "resolved";
  response: string;
  createdAt: string;
}

export async function getComplaints(): Promise<Complaint[]> {
  const data = await api.get<{ results: Complaint[] }>("/api/complaints/");
  return data.results;
}

export async function createComplaint(payload: {
  title: string;
  description: string;
}): Promise<Complaint> {
  return api.post<Complaint>("/api/complaints/", payload);
}

export async function updateComplaint(
  id: string,
  payload: { status?: string; response?: string }
): Promise<Complaint> {
  return api.put<Complaint>(`/api/complaints/${id}`, payload);
}
