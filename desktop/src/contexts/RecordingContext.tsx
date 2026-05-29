import {
  createContext, useContext, useRef, useState,
  useCallback, useEffect, ReactNode,
} from "react";
import { createSession } from "@/services/sessionService";
import { transcribeAudio } from "@/services/transcriptionService";
import { uploadAudio, fetchAudioBlob, getAudios, type AudioRecord } from "@/services/audioService";
import { createReport } from "@/services/reportsService";
import type { ReportCategory } from "@/constants/reportCategories";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:4000";

function structureContent(text: string, category?: ReportCategory | null): string {
  const iMatch = /[({]?\s*indication\s*[)}]?\s*:?\s*/i.exec(text);
  const tMatch = /[({]?\s*technique\s*[)}]?\s*:?\s*/i.exec(text);
  const rMatch = /[({]?\s*r[eé]sultat\s*[)}]?\s*:?\s*/i.exec(text);
  const cMatch = /[({]?\s*conclusion\s*[)}]?\s*:?\s*/i.exec(text);
  const iIdx = iMatch?.index ?? -1;
  const tIdx = tMatch?.index ?? -1;
  const rIdx = rMatch?.index ?? -1;
  const cIdx = cMatch?.index ?? -1;

  const includeTechnique = category === "irm" || category === "scanner" || tIdx !== -1;

  // No sections detected at all → full text goes to Résultat as fallback
  if (iIdx === -1 && tIdx === -1 && rIdx === -1 && cIdx === -1) {
    return includeTechnique
      ? `Indication: \n\nTechnique: \n\nResultat: ${text}\n\nConclusion: `
      : `Indication: \n\nResultat: ${text}\n\nConclusion: `;
  }

  const extract = (match: RegExpExecArray | null, end: number) => {
    if (!match) return "";
    const raw = text.slice(match.index + match[0].length, end === -1 ? text.length : end).trim();
    const cleaned = raw
      .replace(/^(?:de\s+p[a-z]+|d[''][a-z]{0,4}\s+p[a-z]+|et\s+[a-z]{3,6})\s+/, "")
      .replace(/^[-—]+\s*/, "")
      .trim();
    if (/^[-—\s]*$/.test(cleaned)) return "";
    const result = cleaned.length > 0 ? cleaned : raw;
    return result.charAt(0).toUpperCase() + result.slice(1);
  };
  const nextAfter = (after: number, ...candidates: number[]) => {
    const valid = candidates.filter(idx => idx > after);
    return valid.length === 0 ? -1 : Math.min(...valid);
  };

  // Resolve text before the first detected section
  let indication: string;
  let technique: string;

  if (iMatch) {
    // "Indication" keyword found → extract normally
    indication = extract(iMatch, nextAfter(iIdx, tIdx, rIdx, cIdx));
    technique  = extract(tMatch, nextAfter(tIdx, rIdx, cIdx));
  } else if (tMatch) {
    // No "Indication" but "Technique" found → text before Technique → Indication
    const firstSection = tIdx;
    const raw = text.slice(0, firstSection).trim();
    indication = raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "";
    technique  = extract(tMatch, nextAfter(tIdx, rIdx, cIdx));
  } else {
    // Neither "Indication" nor "Technique" found
    const firstSection = nextAfter(-1, rIdx, cIdx);
    const orphan = firstSection > 0 ? text.slice(0, firstSection).trim() : "";

    if (includeTechnique && orphan) {
      // IRM/Scanner: first line → Indication, rest → Technique (Option C)
      const firstBreak = orphan.search(/\n/);
      if (firstBreak > 0) {
        const firstLine = orphan.slice(0, firstBreak).trim();
        const rest      = orphan.slice(firstBreak + 1).trim();
        indication = firstLine ? firstLine.charAt(0).toUpperCase() + firstLine.slice(1) : "";
        technique  = rest      ? rest.charAt(0).toUpperCase()      + rest.slice(1)      : "";
      } else {
        // Single block, no line break → all to Indication (can't split)
        indication = orphan ? orphan.charAt(0).toUpperCase() + orphan.slice(1) : "";
        technique  = "";
      }
    } else {
      // Écho/Radio/Autre: all orphan text → Indication
      indication = orphan ? orphan.charAt(0).toUpperCase() + orphan.slice(1) : "";
      technique  = "";
    }
  }
  let resultat    = extract(rMatch, nextAfter(rIdx, cIdx));
  let conclusion  = extract(cMatch, -1);

  // ── Safety net ────────────────────────────────────────────────────────────
  // Verify no text was silently lost. Compare total captured characters
  // against the original. Any significant orphaned text is appended to
  // Résultat so the doctor can always see it and move it manually.
  const captured = [indication, technique, resultat, conclusion]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const original = text.replace(/\s+/g, " ").trim();

  if (original.length > 20 && captured.length < original.length * 0.6) {
    // More than 40% of text is unaccounted for — append raw text to Résultat
    const fallback = `[Texte non classifié — à déplacer dans la bonne section]\n${text.trim()}`;
    resultat = resultat ? `${resultat}\n\n${fallback}` : fallback;
  }

  const parts = [
    `Indication: ${indication}`,
    includeTechnique ? `Technique: ${technique}` : null,
    `Resultat: ${resultat}`,
    `Conclusion: ${conclusion}`,
  ].filter(Boolean);
  return parts.join("\n\n");
}

export type RecMéthode = "navigateur" | "smartphone" | null;

export interface RecordingResult {
  examId:     string;
  category:   ReportCategory | null;
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
  category:       ReportCategory | null;
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
  setCategory:            (category: ReportCategory | null) => void;
  startMicRecording:      (examId: string, category: ReportCategory, seniorId?: string | null) => Promise<void>;
  togglePause:            () => void;
  stopRecording:          () => void;
  startSmartphoneSession: (examId: string, category: ReportCategory, seniorId?: string | null) => Promise<void>;
  transcribeFile:         (examId: string, category: ReportCategory, file: File, seniorId?: string | null) => Promise<void>;
  transcribeById:         (id: string, examId: string, category?: ReportCategory) => Promise<void>; // re-transcribe from server (risk fallback) — category defaults to "autre"
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
  const [category,        setCategory]        = useState<ReportCategory | null>(null);
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
  const pendingCatRef    = useRef<ReportCategory | null>(null);
  const pendingMRef      = useRef<RecMéthode>(null);
  const seniorIdRef      = useRef<string | null>(null);  // supervising senior picked at step 1
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
  const doTranscribe = useCallback(async (blob: Blob, eid: string, cat: ReportCategory, m: RecMéthode, aid: string | null, sid: string | null) => {
    setIsTranscribing(true);
    setError(null);
    try {
      const text = await transcribeAudio(blob);
      // Immediately persist a draft report linked to the audio. This makes the
      // "audios en attente" queue hold only failed transcriptions — successful
      // ones are always backed by a report server-side.
      let draftId: string | null = null;
      try {
        const content = structureContent(text, cat);
        const r = await createReport({ ID_Exam: eid, content, category: cat, status: "draft", audioId: aid ?? undefined, seniorId: sid ?? undefined });
        draftId = r._id;
        if (aid) setAudioQueue(q => q.filter(a => a._id !== aid));
      } catch { /* draft save failed — RapportDetail fallback will retry */ }
      setResult({ examId: eid, category: cat, text, méthode: m, audioId: aid, reportId: draftId, suggestion: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de transcription.");
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  // ── Upload then auto-transcribe ────────────────────────────────────────────
  const doUpload = useCallback(async (blob: Blob, eid: string, cat: ReportCategory, m: RecMéthode, duration: number, sid: string | null) => {
    resetHardware();
    pendingBlobRef.current = blob;
    pendingEidRef.current  = eid;
    pendingCatRef.current  = cat;
    pendingMRef.current    = m;
    setAudioUploading(true);
    setError(null);
    let savedId: string | null = null;
    try {
      const saved = await uploadAudio(eid, blob, duration, sid);
      setSavedAudio(saved);
      savedId = saved._id;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde audio.");
      setAudioUploading(false);
      return; // don't transcribe if upload failed
    }
    setAudioUploading(false);
    // Auto-transcribe immediately using in-memory blob
    await doTranscribe(blob, eid, cat, m, savedId, sid);
  }, [resetHardware, doTranscribe]);

  // ── Public: re-transcribe a queued audio from server (risk fallback) ───────
  // Retry path used by the "audios en attente" queue. The audio document
  // doesn't carry the originally-picked category, so the caller can omit it
  // and we default to "scanner"; the doctor can correct the category in the
  // RapportDetail page after the report opens.
  const transcribeById = useCallback(async (id: string, eid: string, cat: ReportCategory = "scanner") => {
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
        const content = structureContent(text, cat);
        const r = await createReport({ ID_Exam: eid, content, category: cat, status: "draft", audioId: id });
        draftId = r._id;
      } catch { /* draft save failed — RapportDetail fallback will retry */ }
      setResult({ examId: eid, category: cat, text, méthode: null, audioId: id, reportId: draftId, suggestion: null });
      setAudioQueue(q => q.filter(a => a._id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de transcription.");
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  // ── Browser mic ────────────────────────────────────────────────────────────
  const startMicRecording = async (eid: string, cat: ReportCategory, seniorId: string | null = null) => {
    try {
      seniorIdRef.current = seniorId;
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setExamId(eid);
      setCategory(cat);
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
    const cat      = category;
    const m        = méthode;
    const dur      = seconds;
    if (!recorder || !eid || !cat) return;
    stopTimer();
    setIsRecording(false);
    recorder.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
      try { recorder.stream.getTracks().forEach(t => t.stop()); } catch { /* */ }
      mediaRecorderRef.current = null;
      doUpload(blob, eid, cat, m, dur, seniorIdRef.current);
    };
    recorder.stop();
  };

  const cancelRecording = useCallback(() => {
    resetHardware();
    pendingBlobRef.current = null;
    pendingEidRef.current  = null;
    pendingCatRef.current  = null;
    pendingMRef.current    = null;
    seniorIdRef.current    = null;
    setSavedAudio(null);
    setExamId(null);
    setCategory(null);
    setMéthode(null);
    setError(null);
  }, [resetHardware]);

  // ── Smartphone session ─────────────────────────────────────────────────────
  const startSmartphoneSession = async (eid: string, cat: ReportCategory, seniorId: string | null = null) => {
    seniorIdRef.current = seniorId;
    const { sessionId: sid, mobileUrl: url } = await createSession();
    setSessionId(sid);
    setMobileUrl(url);
    setExamId(eid);
    setCategory(cat);
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
      doUpload(blob, eid, cat, "smartphone", seconds, seniorId);
    });
    socket.on("disconnect", () => { setSocketConnected(false); setMobileConnected(false); });
  };

  // ── Import file — upload then show list (no auto-transcribe) ───────────────
  // Import flow — upload then auto-transcribe (mirrors browser mic / smartphone
  // behaviour). The "audios en attente" queue is for failure recovery only:
  // if uploadAudio or doTranscribe fails, the audio sits there for retry.
  const transcribeFile = async (eid: string, cat: ReportCategory, file: File, seniorId: string | null = null) => {
    seniorIdRef.current = seniorId;
    setExamId(eid);
    setCategory(cat);
    setMéthode(null);
    setSavedAudio(null);
    pendingBlobRef.current = file;
    pendingEidRef.current  = eid;
    pendingCatRef.current  = cat;
    pendingMRef.current    = null;
    setAudioUploading(true);
    setError(null);
    let savedId: string | null = null;
    try {
      const saved = await uploadAudio(eid, file, 0, seniorId);
      setSavedAudio(saved);
      savedId = saved._id;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde audio.");
      setAudioUploading(false);
      return; // upload failed — don't transcribe
    }
    setAudioUploading(false);
    // Auto-transcribe immediately using the in-memory file blob.
    await doTranscribe(file, eid, cat, null, savedId, seniorId);
  };

  const clearResult     = useCallback(() => { setResult(null); setExamId(null); setCategory(null); setMéthode(null); }, []);
  const clearSavedAudio = useCallback(() => {
    setSavedAudio(null);
    pendingBlobRef.current = null;
    pendingEidRef.current  = null;
    pendingCatRef.current  = null;
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
      isRecording, isPaused, seconds, examId, category, méthode,
      sessionId, mobileUrl, mobileConnected, socketConnected, audioReceived,
      audioUploading, savedAudio, audioQueue,
      isTranscribing, error, result,
      setCategory,
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
