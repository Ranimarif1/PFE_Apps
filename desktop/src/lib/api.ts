const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

let _refreshing: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  if (_refreshing) return _refreshing;
  _refreshing = (async () => {
    const refresh = localStorage.getItem("refresh_token");
    if (!refresh) return null;
    try {
      const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const newAccess: string = data.access;
      localStorage.setItem("access_token", newAccess);
      return newAccess;
    } catch {
      return null;
    } finally {
      _refreshing = null;
    }
  })();
  return _refreshing;
}

function forceLogout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("auth_user");
  window.location.href = "/login";
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  _retry = true
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
    // Public auth endpoints (login, password reset, …) legitimately return 401
    // for bad credentials. Surface the backend message instead of treating it
    // as an expired session and hard-redirecting to /login.
    const isPublicAuth = /\/api\/auth\/(login|register|refresh|forgot-password|reset-password|request-password-reset|send-verification-code|verify-email-code|check-senior-code)/.test(path);
    if (isPublicAuth) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.detail || `Erreur ${res.status}`);
    }

    // Protected endpoint: the access token likely expired. Try a silent refresh
    // once, otherwise log the user out.
    if (_retry) {
      const newToken = await tryRefresh();
      if (newToken) {
        return request<T>(path, options, false);
      }
    }
    forceLogout();
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
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T = void>(path: string, body?: unknown) =>
    request<T>(path, { method: "DELETE", ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }),
};
