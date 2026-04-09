const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export async function transcribeAudio(audio: Blob | File): Promise<string> {
  const token = localStorage.getItem("access_token");

  const formData = new FormData();
  const filename = audio instanceof File ? audio.name : "audio.webm";
  formData.append("audio", audio, filename);

  const res = await fetch(`${BASE_URL}/api/transcribe/`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (res.status === 401) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("auth_user");
    window.location.href = "/login";
    throw new Error("Session expirée. Veuillez vous reconnecter.");
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.detail || `Erreur ${res.status}`);
  }

  return (data.text as string) || "";
}
