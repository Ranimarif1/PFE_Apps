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

export interface OllamaChange {
  original:  string;
  corrected: string;
}

export interface OllamaSuggestion {
  suggestion: string;
  changes:    OllamaChange[];
}

export async function getSuggestion(text: string): Promise<OllamaSuggestion> {
  const token = localStorage.getItem("access_token");

  const res = await fetch(`${BASE_URL}/api/transcribe/suggest/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) throw new Error(`Erreur ${res.status}`);

  const data = await res.json().catch(() => ({}));
  return {
    suggestion: (data.suggestion as string) || text,
    changes:    (data.changes    as OllamaChange[]) || [],
  };
}
