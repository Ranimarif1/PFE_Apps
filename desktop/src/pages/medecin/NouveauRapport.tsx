import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, Upload, Smartphone, QrCode, CheckCircle, Loader2,
  Play, Pause, Square, ArrowLeft, Wifi, WifiOff, RefreshCw,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { createSession } from "@/services/sessionService";
import { useDesktopSocket } from "@/hooks/useDesktopSocket";
import { mockRapportTranscription } from "@/data/mockData";

type Etape = 1 | 2 | 3;
type Méthode = "navigateur" | "import" | "smartphone" | null;

function getAllowedYears(): Set<number> {
  const now = new Date();
  const allowed = new Set([now.getFullYear()]);
  if (now.getMonth() + 1 === 1) allowed.add(now.getFullYear() - 1);
  return allowed;
}

function isValidExamId(id: string): boolean {
  if (!/^\d{5,}$/.test(id)) return false;
  return getAllowedYears().has(parseInt(id.slice(0, 4), 10));
}

function examIdError(id: string): string | null {
  if (id.length === 0) return null;
  if (!/^\d+$/.test(id)) return "L'identifiant doit contenir uniquement des chiffres.";
  if (id.length < 5) return null;
  const yearPart = parseInt(id.slice(0, 4), 10);
  const allowed = getAllowedYears();
  if (!allowed.has(yearPart)) {
    const currentYear = new Date().getFullYear();
    if (new Date().getMonth() + 1 === 1)
      return `L'identifiant doit commencer par ${currentYear} ou ${currentYear - 1} (exception janvier).`;
    return `L'identifiant doit commencer par ${currentYear}.`;
  }
  return null;
}

export default function NouveauRapport() {
  const navigate = useNavigate();
  const location = useLocation();
  const restore = location.state as { _restore?: { etape: Etape; examId: string; méthode: Méthode } } | null;

  const [etape, setEtape] = useState<Etape>(restore?._restore?.etape ?? 1);
  const [examId, setExamId] = useState(restore?._restore?.examId ?? "");
  const [méthode, setMéthode] = useState<Méthode>(restore?._restore?.méthode ?? null);

  // Browser mic recording state
  const [recordingState, setRecordingState] = useState<"idle" | "recording" | "paused">("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Transcription
  const [transcribing, setTranscribing] = useState(false);

  // Smartphone session
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mobileUrl, setMobileUrl] = useState<string>("");
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [audioReceived, setAudioReceived] = useState(false);

  // QR expiry countdown (15 min)
  const [timer, setTimer] = useState(900);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Desktop socket — only active during smartphone step
  const { connected, mobileConnected, recordingActive, audioBlob } = useDesktopSocket({
    sessionId,
    enabled: méthode === "smartphone" && etape === 3,
  });

  // ── Create session when entering smartphone step ───────────────────────
  useEffect(() => {
    if (méthode !== "smartphone" || etape !== 3) return;
    if (sessionId || sessionLoading) return;

    setSessionLoading(true);
    setSessionError(null);
    createSession()
      .then(({ sessionId: id, mobileUrl: url }) => {
        setSessionId(id);
        setMobileUrl(url);
      })
      .catch(() => setSessionError("Impossible de créer la session. Vérifiez que le serveur est démarré."))
      .finally(() => setSessionLoading(false));
  }, [méthode, etape, sessionId, sessionLoading]);

  // ── Start QR countdown once mobileUrl is ready ────────────────────────
  useEffect(() => {
    if (!mobileUrl) return;
    setTimer(900);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) { clearInterval(timerIntervalRef.current!); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [mobileUrl]);

  // ── Audio received from mobile ────────────────────────────────────────
  useEffect(() => {
    if (!audioBlob || audioReceived) return;
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setAudioReceived(true);
    triggerTranscription();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBlob]);

  // ── Cleanup on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const triggerTranscription = async () => {
    setTranscribing(true);
    await new Promise(r => setTimeout(r, 3000));
    setTranscribing(false);
    navigate("/rapport/new", {
      state: {
        ID_Exam: examId,
        transcription: mockRapportTranscription,
        _restore: { etape: 3, examId, méthode },
      },
    });
  };

  const refreshSession = () => {
    setSessionId(null);
    setMobileUrl("");
    setAudioReceived(false);
    setSessionError(null);
  };

  // Browser mic handlers
  const handleMicStart = () => {
    setRecordingState("recording");
    recordingIntervalRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
  };
  const handleMicPause = () => {
    setRecordingState("paused");
    if (recordingIntervalRef.current) { clearInterval(recordingIntervalRef.current); recordingIntervalRef.current = null; }
  };
  const handleMicResume = () => {
    setRecordingState("recording");
    recordingIntervalRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
  };
  const handleMicStop = () => {
    if (recordingIntervalRef.current) { clearInterval(recordingIntervalRef.current); recordingIntervalRef.current = null; }
    setRecordingState("idle");
    setRecordingSeconds(0);
    triggerTranscription();
  };

  const formatTimer = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  const timerProgress = (timer / 900) * 100;

  const handleBack = () => {
    if (etape === 1) {
      navigate(-1);
    } else if (etape === 2) {
      setEtape(1);
    } else {
      // Reset smartphone session when going back from step 3
      if (méthode === "smartphone") {
        setSessionId(null);
        setMobileUrl("");
        setAudioReceived(false);
        setSessionError(null);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      }
      if (recordingIntervalRef.current) { clearInterval(recordingIntervalRef.current); recordingIntervalRef.current = null; }
      setRecordingState("idle");
      setRecordingSeconds(0);
      setMéthode(null);
      setEtape(2);
    }
  };

  return (
    <AppLayout title="Nouveau rapport">
      <div className="max-w-2xl mx-auto">
        {/* Back button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Retour
        </button>

        {/* Steps indicator */}
        <div className="flex items-center gap-0 mb-8">
          {[1, 2, 3].map((s, idx) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                etape >= s ? "gradient-hero text-white" : "bg-muted text-muted-foreground"
              )}>{s}</div>
              <div className={cn("flex-1 h-0.5 transition-all", idx < 2 ? (etape > s ? "bg-primary" : "bg-border") : "hidden")} />
            </div>
          ))}
          <div className="ml-4 text-sm text-muted-foreground">
            {etape === 1 ? "ID Exam" : etape === 2 ? "Méthode" : "Enregistrement"}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* ── ÉTAPE 1 ─────────────────────────────────────────────────── */}
          {etape === 1 && (
            <motion.div key="e1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="bg-card rounded-2xl border border-border shadow-card p-8">
              <h2 className="text-xl font-bold text-foreground mb-2">Identification de l'examen</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Entrez l'identifiant de l'examen au format <span className="font-mono font-semibold">{new Date().getFullYear()}N…</span>
              </p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">ID Exam</label>
                  <input value={examId} onChange={e => setExamId(e.target.value.replace(/\D/g, ""))}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border bg-background text-foreground font-mono focus:outline-none focus:ring-2 transition-all",
                      examIdError(examId) ? "border-destructive focus:ring-destructive/30" : "border-border focus:ring-primary/30"
                    )}
                    placeholder={`${new Date().getFullYear()}1`} />
                  {examId.length > 0 && examIdError(examId) && (
                    <p className="text-destructive text-xs mt-1">{examIdError(examId)}</p>
                  )}
                </div>
                <button onClick={() => isValidExamId(examId) && setEtape(2)} disabled={!isValidExamId(examId)}
                  className="w-full gradient-hero text-white font-semibold py-3 rounded-xl hover:opacity-90 disabled:opacity-40 transition-all">
                  Continuer →
                </button>
              </div>
            </motion.div>
          )}

          {/* ── ÉTAPE 2 ─────────────────────────────────────────────────── */}
          {etape === 2 && (
            <motion.div key="e2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="bg-card rounded-2xl border border-border shadow-card p-8 mb-4">
                <h2 className="text-xl font-bold text-foreground mb-2">Méthode d'enregistrement</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  ID Exam : <span className="font-mono font-semibold text-primary">{examId}</span>
                </p>
                <div className="grid gap-4">
                  {[
                    { id: "navigateur", icon: Mic, title: "Enregistrer depuis le navigateur", desc: "Utilisez le micro de votre ordinateur" },
                    { id: "import", icon: Upload, title: "Importer un fichier audio", desc: "MP3, WAV, M4A acceptés" },
                    { id: "smartphone", icon: Smartphone, title: "Enregistrer via smartphone", desc: "Scannez un QR code pour continuer sur mobile" },
                  ].map(({ id, icon: Icon, title, desc }) => (
                    <button key={id} onClick={() => { setMéthode(id as Méthode); setEtape(3); }}
                      className={cn(
                        "flex items-center gap-4 p-5 rounded-xl border-2 text-left transition-all hover:border-primary",
                        méthode === id ? "border-primary bg-primary/5" : "border-border bg-background"
                      )}>
                      <div className="w-12 h-12 gradient-hero rounded-xl flex items-center justify-center shrink-0">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{title}</p>
                        <p className="text-sm text-muted-foreground">{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => setEtape(1)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                ← Modifier l'ID Exam
              </button>
            </motion.div>
          )}

          {/* ── ÉTAPE 3 ─────────────────────────────────────────────────── */}
          {etape === 3 && (
            <motion.div key="e3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>

              {/* ── SMARTPHONE ── */}
              {méthode === "smartphone" && (
                <div className="bg-card rounded-2xl border border-border shadow-card p-8 text-center">
                  <h2 className="text-xl font-bold text-foreground mb-2">Enregistrement via smartphone</h2>
                  <p className="text-muted-foreground text-sm mb-6">
                    ID Exam : <span className="font-mono font-semibold text-primary">{examId}</span>
                  </p>

                  {/* Loading session */}
                  {sessionLoading && (
                    <div className="flex flex-col items-center gap-4 py-8">
                      <Loader2 className="animate-spin w-10 h-10 text-primary" />
                      <p className="text-sm text-muted-foreground">Création de la session…</p>
                    </div>
                  )}

                  {/* Session error */}
                  {sessionError && !sessionLoading && (
                    <div className="space-y-4 py-4">
                      <p className="text-destructive text-sm">{sessionError}</p>
                      <button onClick={refreshSession}
                        className="flex items-center gap-2 mx-auto gradient-hero text-white font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-all text-sm">
                        <RefreshCw size={15} /> Réessayer
                      </button>
                    </div>
                  )}

                  {/* Audio received + transcribing */}
                  {audioReceived && !sessionLoading && (
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-4 py-4">
                      <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="w-8 h-8 text-success" />
                      </div>
                      <p className="text-success font-semibold">Audio reçu depuis votre smartphone ✅</p>
                      {transcribing && (
                        <div className="flex items-center gap-2 justify-center text-primary">
                          <Loader2 className="animate-spin" size={18} />
                          <span className="text-sm">Transcription en cours par le modèle IA…</span>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* QR code + waiting */}
                  {!sessionLoading && !sessionError && !audioReceived && mobileUrl && (
                    <div className="space-y-6">
                      {/* Connection status */}
                      <div className="flex items-center justify-center gap-2">
                        {connected ? (
                          <Wifi size={14} className="text-success" />
                        ) : (
                          <WifiOff size={14} className="text-muted-foreground" />
                        )}
                        <span className={cn("text-xs font-medium", connected ? "text-success" : "text-muted-foreground")}>
                          {connected ? (mobileConnected ? "Mobile connecté" : "En attente du mobile…") : "Connexion au serveur…"}
                        </span>
                        {mobileConnected && (
                          <span className="text-xs text-muted-foreground ml-2">
                            {recordingActive ? "⏺ Enregistrement en cours…" : "Prêt"}
                          </span>
                        )}
                      </div>

                      {/* Real QR code */}
                      <div className="flex justify-center">
                        <div className="w-44 h-44 bg-white/65 backdrop-blur-md rounded-2xl border-4 border-primary/20 p-3 shadow-card flex items-center justify-center">
                          <QRCodeSVG
                            value={mobileUrl}
                            size={152}
                            bgColor="#ffffff"
                            fgColor="#0d2137"
                            level="M"
                          />
                        </div>
                      </div>

                      {/* Timer */}
                      {timer > 0 ? (
                        <>
                          <div className="flex items-center gap-2 justify-center">
                            <QrCode className="text-primary" size={16} />
                            <span className="text-sm text-muted-foreground">Expire dans</span>
                            <span className="font-mono font-bold text-primary">{formatTimer(timer)}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div className="gradient-hero h-2 rounded-full transition-all duration-1000" style={{ width: `${timerProgress}%` }} />
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <p className="text-sm text-destructive font-medium">Session expirée</p>
                          <button onClick={refreshSession}
                            className="flex items-center gap-2 gradient-hero text-white font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-all text-sm">
                            <RefreshCw size={15} /> Nouvelle session
                          </button>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground">
                        {mobileConnected
                          ? "Mobile connecté — appuyez sur Envoyer depuis le mobile une fois l'enregistrement terminé."
                          : "Scannez ce QR code avec votre smartphone pour démarrer l'enregistrement."}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── NAVIGATEUR (MIC) ── */}
              {méthode === "navigateur" && (
                <div className="bg-card rounded-2xl border border-border shadow-card p-8 text-center">
                  <h2 className="text-xl font-bold text-foreground mb-6">Enregistrement depuis le navigateur</h2>
                  {transcribing ? (
                    <div className="space-y-4">
                      <Loader2 className="animate-spin w-12 h-12 text-primary mx-auto" />
                      <p className="text-primary font-medium">Transcription en cours par le modèle IA…</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className={cn(
                        "w-24 h-24 rounded-full mx-auto flex items-center justify-center transition-all",
                        recordingState === "recording" ? "gradient-hero animate-pulse-ring" :
                        recordingState === "paused" ? "bg-amber-500" : "bg-muted"
                      )}>
                        <Mic className={cn("w-10 h-10", recordingState === "idle" ? "text-muted-foreground" : "text-white")} />
                      </div>
                      <p className="font-mono text-2xl font-bold text-foreground">{formatTimer(recordingSeconds)}</p>
                      <p className="text-muted-foreground text-sm">
                        {recordingState === "idle" && "Prêt à enregistrer"}
                        {recordingState === "recording" && "Enregistrement en cours…"}
                        {recordingState === "paused" && "Enregistrement en pause"}
                      </p>
                      <div className="flex items-center justify-center gap-4">
                        {recordingState === "idle" && (
                          <button onClick={handleMicStart}
                            className="flex items-center gap-2 gradient-hero text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-all">
                            <Play className="w-5 h-5" /> Démarrer
                          </button>
                        )}
                        {recordingState === "recording" && (
                          <button onClick={handleMicPause}
                            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-3 rounded-xl transition-all">
                            <Pause className="w-5 h-5" /> Pause
                          </button>
                        )}
                        {recordingState === "paused" && (
                          <button onClick={handleMicResume}
                            className="flex items-center gap-2 gradient-hero text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-all">
                            <Play className="w-5 h-5" /> Reprendre
                          </button>
                        )}
                        {recordingState !== "idle" && (
                          <button onClick={handleMicStop}
                            className="flex items-center gap-2 bg-destructive hover:bg-destructive/90 text-white font-semibold px-6 py-3 rounded-xl transition-all">
                            <Square className="w-5 h-5" /> Arrêter
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── IMPORT ── */}
              {méthode === "import" && (
                <div className="bg-card rounded-2xl border border-border shadow-card p-8 text-center">
                  <h2 className="text-xl font-bold text-foreground mb-6">Importer un fichier audio</h2>
                  {transcribing ? (
                    <div className="space-y-4">
                      <Loader2 className="animate-spin w-12 h-12 text-primary mx-auto" />
                      <p className="text-primary font-medium">Transcription en cours par le modèle IA…</p>
                    </div>
                  ) : (
                    <label className="block cursor-pointer">
                      <div className="border-2 border-dashed border-primary/40 rounded-2xl p-12 hover:border-primary hover:bg-primary/5 transition-all">
                        <Upload className="w-12 h-12 text-primary/60 mx-auto mb-4" />
                        <p className="font-semibold text-foreground mb-1">Cliquez pour importer</p>
                        <p className="text-sm text-muted-foreground">MP3, WAV, M4A — Max 50 Mo</p>
                      </div>
                      <input type="file" accept=".mp3,.wav,.m4a" className="hidden" onChange={() => triggerTranscription()} />
                    </label>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
