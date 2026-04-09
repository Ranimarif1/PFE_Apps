import {
  createContext, useContext, useRef, useState,
  useCallback, useEffect, ReactNode,
} from "react";
import { createSession } from "@/services/sessionService";
import { transcribeAudio } from "@/services/transcriptionService";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:4000";

export type RecMéthode = "navigateur" | "smartphone" | null;

export interface RecordingResult {
  examId: string;
  text: string;
  méthode: RecMéthode;
}

interface RecordingContextType {
  // State
  isRecording: boolean;
  isPaused: boolean;
  seconds: number;
  examId: string | null;
  méthode: RecMéthode;
  // Smartphone
  sessionId: string | null;
  mobileUrl: string;
  mobileConnected: boolean;
  socketConnected: boolean;
  audioReceived: boolean;
  // Transcription
  isTranscribing: boolean;
  error: string | null;
  result: RecordingResult | null;
  // Actions
  startMicRecording: (examId: string) => Promise<void>;
  togglePause: () => void;
  stopRecording: () => void;
  startSmartphoneSession: (examId: string) => Promise<void>;
  transcribeFile: (examId: string, file: File) => Promise<void>;
  cancelRecording: () => void;
  clearResult: () => void;
  clearError: () => void;
}

const RecordingContext = createContext<RecordingContextType | null>(null);

export function RecordingProvider({ children }: { children: ReactNode }) {
  const [isRecording,     setIsRecording]     = useState(false);
  const [isPaused,        setIsPaused]        = useState(false);
  const [seconds,         setSeconds]         = useState(0);
  const [examId,          setExamId]          = useState<string | null>(null);
  const [méthode,         setMéthode]         = useState<RecMéthode>(null);
  const [sessionId,       setSessionId]       = useState<string | null>(null);
  const [mobileUrl,       setMobileUrl]       = useState("");
  const [mobileConnected, setMobileConnected] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [audioReceived,   setAudioReceived]   = useState(false);
  const [isTranscribing,  setIsTranscribing]  = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [result,          setResult]          = useState<RecordingResult | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const socketRef        = useRef<any>(null);

  // ── Timer ──────────────────────────────────────────────────────────────────
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  // ── Reset hardware state (keeps result intact) ─────────────────────────────
  const resetHardware = useCallback(() => {
    stopTimer();
    if (mediaRecorderRef.current) {
      try { mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop()); } catch { /* */ }
      mediaRecorderRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsRecording(false);
    setIsPaused(false);
    setSeconds(0);
    setSessionId(null);
    setMobileUrl("");
    setMobileConnected(false);
    setSocketConnected(false);
    setAudioReceived(false);
  }, []);

  // ── Transcribe ─────────────────────────────────────────────────────────────
  const doTranscribe = useCallback(async (
    blob: Blob, eid: string, m: RecMéthode
  ) => {
    resetHardware();
    setIsTranscribing(true);
    setError(null);
    try {
      const text = await transcribeAudio(blob);
      setResult({ examId: eid, text, méthode: m });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de transcription.");
    } finally {
      setIsTranscribing(false);
    }
  }, [resetHardware]);

  // ── Browser mic ────────────────────────────────────────────────────────────
  const startMicRecording = async (eid: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setExamId(eid);
      setMéthode("navigateur");
      setSeconds(0);
      setIsRecording(true);
      setIsPaused(false);
      startTimer();
    } catch {
      setError("Impossible d'accéder au microphone. Vérifiez les permissions.");
    }
  };

  const togglePause = () => {
    if (!isRecording && !isPaused) return;
    if (!isPaused) {
      mediaRecorderRef.current?.pause();
      stopTimer();
      setIsPaused(true);
    } else {
      mediaRecorderRef.current?.resume();
      startTimer();
      setIsPaused(false);
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    const eid = examId;
    const m   = méthode;
    if (!recorder || !eid) return;
    stopTimer();
    setIsRecording(false);
    recorder.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
      try { recorder.stream.getTracks().forEach(t => t.stop()); } catch { /* */ }
      mediaRecorderRef.current = null;
      doTranscribe(blob, eid, m);
    };
    recorder.stop();
  };

  const cancelRecording = useCallback(() => {
    resetHardware();
    setExamId(null);
    setMéthode(null);
    setError(null);
  }, [resetHardware]);

  // ── Smartphone session ─────────────────────────────────────────────────────
  const startSmartphoneSession = async (eid: string) => {
    const { sessionId: sid, mobileUrl: url } = await createSession();
    setSessionId(sid);
    setMobileUrl(url);
    setExamId(eid);
    setMéthode("smartphone");

    const { io } = await import("socket.io-client");
    const socket = io(SOCKET_URL, {
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
      socket.emit("desktop:join", { sessionId: sid });
    });
    socket.on("session:status", ({ mobileConnected: mc }: { mobileConnected: boolean }) => {
      setMobileConnected(mc);
    });
    socket.on("mobile:connected",    () => setMobileConnected(true));
    socket.on("mobile:disconnected", () => setMobileConnected(false));
    socket.on("recording:start",     () => { setIsRecording(true); startTimer(); });
    socket.on("recording:stop",      () => { setIsRecording(false); stopTimer(); });
    socket.on("audio:complete", ({ audio, mimeType }: { audio: ArrayBuffer; mimeType: string }) => {
      const blob = new Blob([audio], { type: mimeType });
      setAudioReceived(true);
      socket.disconnect();
      socketRef.current = null;
      doTranscribe(blob, eid, "smartphone");
    });
    socket.on("disconnect", () => {
      setSocketConnected(false);
      setMobileConnected(false);
    });
  };

  // ── Import file ────────────────────────────────────────────────────────────
  const transcribeFile = async (eid: string, file: File) => {
    setExamId(eid);
    setMéthode(null);
    await doTranscribe(file, eid, null);
  };

  const clearResult = useCallback(() => {
    setResult(null);
    setExamId(null);
    setMéthode(null);
  }, []);

  const clearError = () => setError(null);

  useEffect(() => {
    return () => {
      stopTimer();
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  return (
    <RecordingContext.Provider value={{
      isRecording, isPaused, seconds, examId, méthode,
      sessionId, mobileUrl, mobileConnected, socketConnected, audioReceived,
      isTranscribing, error, result,
      startMicRecording, togglePause, stopRecording,
      startSmartphoneSession, transcribeFile,
      cancelRecording, clearResult, clearError,
    }}>
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecording() {
  const ctx = useContext(RecordingContext);
  if (!ctx) throw new Error("useRecording must be used inside RecordingProvider");
  return ctx;
}
