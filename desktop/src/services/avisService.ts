import { api } from "@/lib/api";

export interface Avis {
  id: string;
  doctorId: string;
  doctorName: string;
  content: string;
  rating: number | null;
  createdAt: string;
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function normalize(raw: Record<string, unknown>): Avis {
  return {
    id: (raw._id ?? raw.id) as string,
    doctorId: raw.doctorId as string,
    doctorName: raw.doctorName as string,
    content: raw.content as string,
    rating: raw.rating as number | null,
    createdAt: raw.createdAt as string,
  };
}

export async function getMyAvis(): Promise<Avis | null> {
  try {
    const all = await getAvis();
    const token = localStorage.getItem("access_token");
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return all.find(a => a.doctorId === payload.sub) ?? null;
  } catch {
    return null;
  }
}

export async function getAvis(): Promise<Avis[]> {
  const res = await fetch(`${BASE_URL}/api/avis/`);
  if (!res.ok) throw new Error("Impossible de charger les avis.");
  const data = await res.json();
  return (data.results as Record<string, unknown>[]).map(normalize);
}

export async function submitAvis(payload: {
  doctorName: string;
  content: string;
  rating: number | null;
}): Promise<Avis> {
  return api.post<Avis>("/api/avis/create/", payload);
}
