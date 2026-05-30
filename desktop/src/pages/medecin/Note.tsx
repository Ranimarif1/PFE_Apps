import { useState, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { transcribeAudio } from "@/services/transcriptionService";
import { toast } from "sonner";
import { Mic, Square, Copy, Trash2, Loader2, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type State = "idle" | "recording" | "transcribing";

export default function Note() {
  const [state,    setState]    = useState<State>("idle");
  const [text,     setText]     = useState("");
  const [copied,   setCopied]   = useState(false);
  const [duration, setDuration] = useState(0);

  const mediaRef    = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef  = useRef<number>(0);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start(200);
      mediaRef.current = recorder;
      startedRef.current = Date.now();
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startedRef.current) / 1000));
      }, 1000);
      setState("recording");
    } catch {
      toast.error("Impossible d'accéder au microphone.");
    }
  }

  async function stopRecording() {
    const recorder = mediaRef.current;
    if (!recorder) return;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    setState("transcribing");
    recorder.stop();
    recorder.stream.getTracks().forEach(t => t.stop());

    await new Promise<void>(resolve => { recorder.onstop = () => resolve(); });

    const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || "audio/webm" });
    try {
      const result = await transcribeAudio(blob);
      setText(prev => prev ? prev + "\n\n" + result : result);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erreur de transcription.");
    } finally {
      setState("idle");
    }
  }

  async function copy() {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <AppLayout title="Bloc-notes vocal">
      <div className="flex flex-col h-full max-w-3xl mx-auto gap-4">

        {/* Controls bar */}
        <div className="flex items-center gap-3">

          {/* Record / Stop button */}
          {state === "idle" && (
            <button
              onClick={startRecording}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 active:scale-95 text-white text-sm font-semibold transition-all duration-150 shadow-sm"
            >
              <Mic size={15} />
              Dicter
            </button>
          )}

          {state === "recording" && (
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground hover:opacity-80 active:scale-95 text-background text-sm font-semibold transition-all duration-150 shadow-sm"
            >
              <Square size={13} className="fill-current" />
              Arrêter
            </button>
          )}

          {state === "transcribing" && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" />
              Transcription…
            </div>
          )}

          {/* Recording indicator */}
          {state === "recording" && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-mono font-semibold text-red-600">{fmt(duration)}</span>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Actions on text */}
          {text && state === "idle" && (
            <div className="flex items-center gap-2">
              <button
                onClick={copy}
                title="Copier"
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all duration-150",
                  copied
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-border/80"
                )}
              >
                {copied ? <ClipboardCheck size={13} /> : <Copy size={13} />}
                {copied ? "Copié" : "Copier"}
              </button>
              <button
                onClick={() => { setText(""); setDuration(0); }}
                title="Effacer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card text-xs font-medium text-muted-foreground hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-all duration-150"
              >
                <Trash2 size={13} />
                Effacer
              </button>
            </div>
          )}
        </div>

        {/* Text area */}
        <div className="flex-1 relative">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={
              state === "recording"
                ? "Parlez maintenant…"
                : "Cliquez sur « Dicter » pour commencer la dictée vocale.\nLe texte transcrit apparaîtra ici brut, tel que reconnu par le modèle."
            }
            className={cn(
              "w-full h-full min-h-[60vh] resize-none rounded-2xl border bg-card text-sm text-foreground placeholder:text-muted-foreground/50 px-5 py-4 outline-none leading-relaxed transition-all duration-200",
              state === "recording"
                ? "border-red-300 ring-2 ring-red-200/60"
                : "border-border focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
            )}
          />

          {/* Transcribing overlay */}
          {state === "transcribing" && (
            <div className="absolute inset-0 rounded-2xl bg-card/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
              <Loader2 size={28} className="animate-spin text-primary" />
              <p className="text-sm text-muted-foreground font-medium">Transcription en cours…</p>
            </div>
          )}
        </div>

        {/* Word / char count */}
        {text && (
          <p className="text-[11px] text-muted-foreground text-right">
            {text.trim().split(/\s+/).filter(Boolean).length} mots · {text.length} caractères
          </p>
        )}
      </div>
    </AppLayout>
  );
}
