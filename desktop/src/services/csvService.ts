const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export async function downloadCSV(opts?: { start?: string; end?: string }): Promise<void> {
  const token = localStorage.getItem("access_token");
  const params = new URLSearchParams();
  if (opts?.start) params.set("start", opts.start);
  if (opts?.end)   params.set("end",   opts.end);
  const qs = params.toString();
  const res = await fetch(`${BASE_URL}/api/csv/download${qs ? `?${qs}` : ""}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.detail || "Erreur lors du téléchargement.");
  }

  const blob = await res.blob();
  const filename =
    res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1]
    ?? (opts?.start || opts?.end
      ? `transcriptions_${opts?.start || "debut"}_${opts?.end || "fin"}.csv`
      : "transcriptions_globales.csv");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
