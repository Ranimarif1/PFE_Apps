const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export interface AudioRecord {
  _id: string;
  doctorId: string;
  examId: string;
  filename: string;
  mimeType: string;
  size: number;
  duration: number; // seconds
  createdAt: string;
  reportId?: string;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function uploadAudio(
  examId: string,
  blob: Blob,
  duration: number
): Promise<AudioRecord> {
  const form = new FormData();
  const ext  = blob.type.includes("webm") ? ".webm" : blob.type.includes("mp4") ? ".mp4" : ".wav";
  form.append("audio",    blob, `recording${ext}`);
  form.append("examId",   examId);
  form.append("duration", String(Math.round(duration)));

  const res = await fetch(`${BASE_URL}/api/audios/`, {
    method:  "POST",
    headers: authHeaders(),
    body:    form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || `Erreur ${res.status}`);
  return data as AudioRecord;
}

export async function getAudios(): Promise<AudioRecord[]> {
  const res = await fetch(`${BASE_URL}/api/audios/`, {
    headers: { ...authHeaders() },
  });
  const data = await res.json().catch(() => ({ results: [] }));
  if (!res.ok) throw new Error(data?.detail || `Erreur ${res.status}`);
  return (data.results ?? []) as AudioRecord[];
}

export async function deleteAudio(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/audios/${id}/`, {
    method:  "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.detail || `Erreur ${res.status}`);
  }
}

export interface TrainingEntry {
  audioId:    string;
  reportId:   string;
  examId:     string;
  doctorName: string;
  duration:   number;
  mimeType:   string;
  createdAt:  string;
  status:     string;
  text:       string;
}

export async function downloadTrainingZip(
  status: "all" | "saved",
  opts?: { start?: string; end?: string }
): Promise<void> {
  const params = new URLSearchParams({ status });
  if (opts?.start) params.set("start", opts.start);
  if (opts?.end)   params.set("end",   opts.end);
  const res = await fetch(
    `${BASE_URL}/api/audios/training/download/?${params.toString()}`,
    { headers: authHeaders() }
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.detail || `Erreur ${res.status}`);
  }
  const blob     = await res.blob();
  const filename = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1]
    ?? `dataset_audio_texte_${status}.zip`;
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export async function getTrainingData(): Promise<TrainingEntry[]> {
  const res = await fetch(`${BASE_URL}/api/audios/training/`, {
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => ({ results: [] }));
  if (!res.ok) throw new Error(data?.detail || `Erreur ${res.status}`);
  return (data.results ?? []) as TrainingEntry[];
}

export async function fetchAudioBlob(id: string): Promise<Blob> {
  const res = await fetch(`${BASE_URL}/api/audios/${id}/`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
  return res.blob();
}
