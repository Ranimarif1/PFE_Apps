import { api } from "@/lib/api";

export interface Report {
  _id: string;
  doctorId: string;
  ID_Exam: string;
  content: string;
  status: "draft" | "validated" | "saved";
  createdAt: string;
  updatedAt: string;
  doctorName?: string;
  isOwn?: boolean;
}

export async function getReports(): Promise<Report[]> {
  const data = await api.get<{ results: Report[] }>("/api/reports/");
  return data.results;
}

export async function getReport(id: string): Promise<Report> {
  return api.get<Report>(`/api/reports/${id}`);
}

export async function createReport(payload: {
  ID_Exam: string;
  content: string;
  status?: "draft" | "validated" | "saved";
}): Promise<Report> {
  return api.post<Report>("/api/reports/", payload);
}

export async function updateReport(
  id: string,
  payload: { content?: string; status?: "draft" | "validated" | "saved" }
): Promise<Report> {
  return api.put<Report>(`/api/reports/${id}`, payload);
}
