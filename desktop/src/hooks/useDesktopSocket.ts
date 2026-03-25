import { useEffect, useRef, useState, useCallback } from 'react';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

interface UseDesktopSocketOptions {
  sessionId: string | null;
  enabled?: boolean;
}

export interface DesktopSocketState {
  connected: boolean;
  mobileConnected: boolean;
  recordingActive: boolean;
  audioBlob: Blob | null;
  audioMimeType: string;
  disconnect: () => void;
}

export function useDesktopSocket({ sessionId, enabled = true }: UseDesktopSocketOptions): DesktopSocketState {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const socketRef = useRef<any>(null);
  const [connected, setConnected] = useState(false);
  const [mobileConnected, setMobileConnected] = useState(false);
  const [recordingActive, setRecordingActive] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioMimeType, setAudioMimeType] = useState('');

  useEffect(() => {
    if (!sessionId || !enabled) return;

    // Dynamically import socket.io-client to avoid issues if not installed yet
    import('socket.io-client').then(({ io }) => {
      const socket = io(SOCKET_URL, {
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        transports: ['websocket', 'polling'],
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        setConnected(true);
        socket.emit('desktop:join', { sessionId });
      });

      socket.on('session:status', ({ mobileConnected: mc }: { mobileConnected: boolean }) => {
        setMobileConnected(mc);
      });

      socket.on('mobile:connected', () => setMobileConnected(true));
      socket.on('mobile:disconnected', () => setMobileConnected(false));

      socket.on('recording:start', () => {
        setRecordingActive(true);
        setAudioBlob(null);
      });

      socket.on('recording:stop', () => setRecordingActive(false));

      socket.on('audio:complete', ({ audio, mimeType }: { audio: ArrayBuffer; mimeType: string }) => {
        const blob = new Blob([audio], { type: mimeType });
        setAudioBlob(blob);
        setAudioMimeType(mimeType);
        setRecordingActive(false);
      });

      socket.on('disconnect', () => {
        setConnected(false);
        setMobileConnected(false);
      });
    });

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [sessionId, enabled]);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
  }, []);

  return { connected, mobileConnected, recordingActive, audioBlob, audioMimeType, disconnect };
}
