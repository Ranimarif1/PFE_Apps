import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

// Always connect to the page's own origin. Vite proxies /socket.io → the Node
// server (port 4000), so this works no matter which LAN IP the phone used to
// load the page — no stale/auto-detected IP to get wrong, and it reuses the
// already-accepted TLS cert of the page (no second cert prompt → no reconnect loop).
const SOCKET_URL = window.location.origin;

/**
 * Manages the Socket.io connection for the mobile recorder.
 *
 * - Connects once on mount.
 * - Emits `mobile:join` on every (re)connect so the session survives
 *   network drops and page refreshes without any extra logic in the caller.
 * - `ready` becomes true when the server confirms the session exists
 *   (`session:ready` event). It resets to false on disconnect.
 *
 * @param {string|null} sessionId
 */
export function useSocket(sessionId) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [ready, setReady]         = useState(false); // server confirmed session
  const [error, setError]         = useState(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setError(null);

      // Re-join the session room on every connect/reconnect
      if (sessionId) {
        socket.emit('mobile:join', { sessionId });
      }
    });

    // Server confirmed this sessionId is valid
    socket.on('session:ready', () => setReady(true));

    // Server rejected the sessionId
    socket.on('session:error', ({ message }) => {
      setError(message);
      setReady(false);
    });

    socket.on('disconnect', () => {
      setConnected(false);
      setReady(false);
    });

    socket.on('connect_error', (err) => {
      setError(`Connection error: ${err.message}`);
    });

    return () => socket.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // sessionId is stable (from URL) – no need to re-run

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  return { connected, ready, error, emit };
}
