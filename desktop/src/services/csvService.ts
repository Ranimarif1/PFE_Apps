const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export async function downloadCSV(): Promise<void> {
  const token = localStorage.getItem("access_token");
  const res = await fetch(`${BASE_URL}/api/csv/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.detail || "Erreur lors du téléchargement.");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "transcriptions_globales.csv";
  a.click();
  URL.revokeObjectURL(url);
}
