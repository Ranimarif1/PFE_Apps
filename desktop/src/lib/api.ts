const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("access_token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

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

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T = void>(path: string) =>
    request<T>(path, { method: "DELETE" }),
};
