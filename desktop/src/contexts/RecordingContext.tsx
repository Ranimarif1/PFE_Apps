import {
  createContext, useContext, useRef, useState,
  useCallback, useEffect, ReactNode,
} from "react";
import { createSession } from "@/services/sessionService";
import { transcribeAudio } from "@/services/transcriptionService";
import { uploadAudio, fetchAudioBlob, getAudios, type AudioRecord } from "@/services/audioService";
import { createReport } from "@/services/reportsService";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:4000";

export type RecMéthode = "navigateur" | "smartphone" | null;

export interface RecordingResult {
  examId:     string;
  text:       string;
  méthode:    RecMéthode;
  audioId:    string | null;
  reportId:   string | null;  // draft report created right after transcription success
  suggestion: string | null;  // Ollama correction — arrives async, null until ready
}

interface RecordingContextType {
  // State
  isRecording:    boolean;
  isPaused:       boolean;
  seconds:        number;
  examId:         string | null;
  méthode:        RecMéthode;
  // Smartphone
  sessionId:      string | null;
  mobileUrl:      string;
  mobileConnected: boolean;
  socketConnected: boolean;
  audioReceived:  boolean;
  // After stop — audio saved
  audioUploading: boolean;
  savedAudio:     AudioRecord | null;   // just-uploaded audio
  audioQueue:     AudioRecord[];        // all pending audios (no reportId yet)
  // Transcription
  isTranscribing: boolean;
  error:          string | null;
  result:         RecordingResult | null;
  // Actions
  startMicRecording:      (examId: string) => Promise<void>;
  togglePause:            () => void;
  stopRecording:          () => void;
  startSmartphoneSession: (examId: string) => Promise<void>;
  transcribeFile:         (examId: string, file: File) => Promise<void>;
  transcribeById:         (id: string, examId: string) => Promise<void>; // re-transcribe from server (risk fallback)
  cancelRecording:        () => void;
  clearResult:            () => void;
  clearSavedAudio:        () => void;
  clearError:             () => void;
  refreshQueue:           () => void;
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
  const [audioUploading,  setAudioUploading]  = useState(false);
  const [savedAudio,      setSavedAudio]      = useState<AudioRecord | null>(null);
  const [audioQueue,      setAudioQueue]      = useState<AudioRecord[]>([]);
  const [isTranscribing,  setIsTranscribing]  = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [result,          setResult]          = useState<RecordingResult | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingBlobRef   = useRef<Blob | null>(null);   // kept in memory after stop
  const pendingEidRef    = useRef<string | null>(null);
  const pendingMRef      = useRef<RecMéthode>(null);
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

  // ── Reset hardware ─────────────────────────────────────────────────────────
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

  // ── Load audio queue (risk fallback — pending audios without a report) ──────
  const refreshQueue = useCallback(() => {
    getAudios().then(all => setAudioQueue(all.filter(a => !a.reportId))).catch(() => {});
  }, []);

  useEffect(() => { refreshQueue(); }, [refreshQueue]);
  useEffect(() => { if (savedAudio) refreshQueue(); }, [savedAudio, refreshQueue]);

  // ── Core transcription ─────────────────────────────────────────────────────
  const doTranscribe = useCallback(async (blob: Blob, eid: string, m: RecMéthode, aid: string | null) => {
    setIsTranscribing(true);
    setError(null);
    try {
      const text = await transcribeAudio(blob);
      // Immediately persist a draft report linked to the audio. This makes the
      // "audios en attente" queue hold only failed transcriptions — successful
      // ones are always backed by a report server-side.
      let draftId: string | null = null;
      try {
        const content = `Indication: \n\nResultat: ${text}\n\nConclusion: `;
        const r = await createReport({ ID_Exam: eid, content, status: "draft", audioId: aid ?? undefined });
        draftId = r._id;
        if (aid) setAudioQueue(q => q.filter(a => a._id !== aid));
      } catch { /* draft save failed — RapportDetail fallback will retry */ }
      setResult({ examId: eid, text, méthode: m, audioId: aid, reportId: draftId, suggestion: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de transcription.");
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  // ── Upload then auto-transcribe ────────────────────────────────────────────
  const doUpload = useCallback(async (blob: Blob, eid: string, m: RecMéthode, duration: number) => {
    resetHardware();
    pendingBlobRef.current = blob;
    pendingEidRef.current  = eid;
    pendingMRef.current    = m;
    setAudioUploading(true);
    setError(null);
    let savedId: string | null = null;
    try {
      const saved = await uploadAudio(eid, blob, duration);
      setSavedAudio(saved);
      savedId = saved._id;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde audio.");
      setAudioUploading(false);
      return; // don't transcribe if upload failed
    }
    setAudioUploading(false);
    // Auto-transcribe immediately using in-memory blob
    await doTranscribe(blob, eid, m, savedId);
  }, [resetHardware, doTranscribe]);

  // ── Public: re-transcribe a queued audio from server (risk fallback) ───────
  const transcribeById = useCallback(async (id: string, eid: string) => {
    setIsTranscribing(true);
    setError(null);
    try {
      const blob = await fetchAudioBlob(id);
      const text = await transcribeAudio(blob);
      // Same pattern as doTranscribe: create the draft server-side so the audio
      // is linked and falls out of the queue. Only a failed transcription leaves
      // the audio orphaned for retry.
      let draftId: string | null = null;
      try {
        const content = `Indication: \n\nResultat: ${text}\n\nConclusion: `;
        const r = await createReport({ ID_Exam: eid, content, status: "draft", audioId: id });
        draftId = r._id;
      } catch { /* draft save failed — RapportDetail fallback will retry */ }
      setResult({ examId: eid, text, méthode: null, audioId: id, reportId: draftId, suggestion: null });
      setAudioQueue(q => q.filter(a => a._id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de transcription.");
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  // ── Browser mic ────────────────────────────────────────────────────────────
  const startMicRecording = async (eid: string) => {
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
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
      setSavedAudio(null);
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

  // Stop → upload (no auto-transcribe)
  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    const eid      = examId;
    const m        = méthode;
    const dur      = seconds;
    if (!recorder || !eid) return;
    stopTimer();
    setIsRecording(false);
    recorder.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
      try { recorder.stream.getTracks().forEach(t => t.stop()); } catch { /* */ }
      mediaRecorderRef.current = null;
      doUpload(blob, eid, m, dur);
    };
    recorder.stop();
  };

  const cancelRecording = useCallback(() => {
    resetHardware();
    pendingBlobRef.current = null;
    pendingEidRef.current  = null;
    pendingMRef.current    = null;
    setSavedAudio(null);
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
    setSavedAudio(null);

    const { io } = await import("socket.io-client");
    const socket = io(SOCKET_URL, {
      reconnectionAttempts: Infinity,
      reconnectionDelay:    1000,
      transports:           ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect",       () => { setSocketConnected(true); socket.emit("desktop:join", { sessionId: sid }); });
    socket.on("session:status", ({ mobileConnected: mc }: { mobileConnected: boolean }) => setMobileConnected(mc));
    socket.on("mobile:connected",    () => setMobileConnected(true));
    socket.on("mobile:disconnected", () => setMobileConnected(false));
    socket.on("recording:start",     () => { setIsRecording(true); startTimer(); });
    socket.on("recording:stop",      () => { setIsRecording(false); stopTimer(); });
    socket.on("audio:complete", ({ audio, mimeType }: { audio: ArrayBuffer; mimeType: string }) => {
      const blob = new Blob([audio], { type: mimeType });
      setAudioReceived(true);
      socket.disconnect();
      socketRef.current = null;
      doUpload(blob, eid, "smartphone", seconds);
    });
    socket.on("disconnect", () => { setSocketConnected(false); setMobileConnected(false); });
  };

  // ── Import file — upload then show list (no auto-transcribe) ───────────────
  const transcribeFile = async (eid: string, file: File) => {
    setExamId(eid);
    setMéthode(null);
    setSavedAudio(null);
    const dur = 0;
    pendingBlobRef.current = file;
    pendingEidRef.current  = eid;
    pendingMRef.current    = null;
    setAudioUploading(true);
    setError(null);
    try {
      const saved = await uploadAudio(eid, file, dur);
      setSavedAudio(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde audio.");
    } finally {
      setAudioUploading(false);
    }
  };

  const clearResult     = useCallback(() => { setResult(null); setExamId(null); setMéthode(null); }, []);
  const clearSavedAudio = useCallback(() => {
    setSavedAudio(null);
    pendingBlobRef.current = null;
    pendingEidRef.current  = null;
    pendingMRef.current    = null;
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
      audioUploading, savedAudio, audioQueue,
      isTranscribing, error, result,
      startMicRecording, togglePause, stopRecording,
      startSmartphoneSession, transcribeFile,
      transcribeById,
      cancelRecording, clearResult, clearSavedAudio, clearError, refreshQueue,
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
