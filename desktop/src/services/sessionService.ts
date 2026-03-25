const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

export interface SessionResponse {
  sessionId: string;
  mobileUrl: string;
}

export async function createSession(): Promise<SessionResponse> {
  const res = await fetch(`${SOCKET_SERVER_URL}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Impossible de créer la session d\'enregistrement.');
  return res.json();
}
