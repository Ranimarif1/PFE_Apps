import { api } from "@/lib/api";
import type { ReportCategory } from "@/constants/reportCategories";

export interface Report {
  _id: string;
  doctorId: string;
  ID_Exam: string;
  content: string;
  originalContent?: string;   // raw STT transcription, used for accuracy comparison
  accuracy?: number;          // 0..1 similarity ratio computed at validation
  status: "draft" | "validated" | "saved";
  category?: ReportCategory;
  audioId?: string;
  seniorId?: string | null;
  seniorCode?: string | null;
  seniorName?: string | null;
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
  category: ReportCategory;
  status?: "draft" | "validated" | "saved";
  audioId?: string;
  originalContent?: string;
  seniorId?: string;
}): Promise<Report> {
  return api.post<Report>("/api/reports/", payload);
}

export async function checkExamId(id: string): Promise<{ available: boolean }> {
  return api.get<{ available: boolean }>(`/api/reports/check-exam-id/?id=${encodeURIComponent(id)}`);
}

export interface ReportStats {
  draft: number;
  validated: number;
  saved: number;
  total: number;
}

export async function getReportStats(): Promise<ReportStats> {
  return api.get<ReportStats>("/api/reports/stats/");
}

export async function updateReport(
  id: string,
  payload: {
    content?: string;
    status?: "draft" | "validated" | "saved";
    category?: ReportCategory;
    originalContent?: string;
  }
): Promise<Report> {
  return api.put<Report>(`/api/reports/${id}`, payload);
}

export async function deleteReport(id: string): Promise<void> {
  await api.delete(`/api/reports/${id}`);
}
