import { useState, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { transcribeAudio } from "@/services/transcriptionService";
import { saveVoiceNote, type NoteCategory, type NoteSection } from "@/services/audioService";
import { REPORT_CATEGORIES } from "@/constants/reportCategories";
import { toast } from "sonner";
import { Mic, Square, Pause, Play, Copy, Trash2, Loader2, ClipboardCheck, Save } from "lucide-react";
import { cn } from "@/lib/utils";

type State = "idle" | "recording" | "paused" | "transcribing" | "saving";

const SECTIONS: { value: NoteSection; label: string }[] = [
  { value: "indication", label: "Indication" },
  { value: "resultat",   label: "Résultat" },
  { value: "technique",  label: "Technique" },
  { value: "conclusion", label: "Conclusion" },
];

export default function Note() {
  const [state,    setState]    = useState<State>("idle");
  const [text,     setText]     = useState("");
  const [copied,   setCopied]   = useState(false);
  const [duration, setDuration] = useState(0);

  const [category, setCategory] = useState<NoteCategory | "">("");
  const [section,  setSection]  = useState<NoteSection | "">("");

  const mediaRef     = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<Blob[]>([]);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  // Last completed recording — kept so it can be saved to the training dataset.
  const lastBlobRef  = useRef<Blob | null>(null);
  const lastDurRef   = useRef<number>(0);

  const startTimer = () => {
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start(200);
      mediaRef.current = recorder;
      setDuration(0);
      startTimer();
      setState("recording");
    } catch {
      toast.error("Impossible d'accéder au microphone.");
    }
  }

  function pauseRecording() {
    const recorder = mediaRef.current;
    if (!recorder || recorder.state !== "recording") return;
    recorder.pause();
    stopTimer();
    setState("paused");
  }

  function resumeRecording() {
    const recorder = mediaRef.current;
    if (!recorder || recorder.state !== "paused") return;
    recorder.resume();
    startTimer();
    setState("recording");
  }

  async function stopRecording() {
    const recorder = mediaRef.current;
    if (!recorder) return;
    stopTimer();

    setState("transcribing");
    recorder.stop();
    recorder.stream.getTracks().forEach(t => t.stop());

    await new Promise<void>(resolve => { recorder.onstop = () => resolve(); });

    const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || "audio/webm" });
    lastBlobRef.current = blob;
    lastDurRef.current  = duration;
    try {
      const result = await transcribeAudio(blob);
      setText(prev => prev ? prev + "\n\n" + result : result);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erreur de transcription.");
    } finally {
      setState("idle");
    }
  }

  async function save() {
    if (!lastBlobRef.current) { toast.error("Aucun enregistrement à sauvegarder."); return; }
    if (!text.trim())        { toast.error("La transcription est vide."); return; }
    if (!category)           { toast.error("Sélectionnez un type d'examen."); return; }
    if (!section)            { toast.error("Sélectionnez une section."); return; }

    setState("saving");
    try {
      await saveVoiceNote(lastBlobRef.current, text.trim(), category, section, lastDurRef.current);
      toast.success("Enregistré dans la base d'entraînement.");
      // Reset for the next note.
      setText("");
      setDuration(0);
      setCategory("");
      setSection("");
      lastBlobRef.current = null;
      lastDurRef.current  = 0;
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erreur lors de l'enregistrement.");
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

  function clearAll() {
    setText("");
    setDuration(0);
    setCategory("");
    setSection("");
    lastBlobRef.current = null;
    lastDurRef.current  = 0;
  }

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const selectClass =
    "px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  const canSave =
    state === "idle" && !!lastBlobRef.current && !!text.trim() && !!category && !!section;

  return (
    <AppLayout title="Bloc-notes vocal">
      <div className="flex flex-col h-full max-w-3xl mx-auto gap-4">

        {/* Metadata: exam type + section */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Type d'examen</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as NoteCategory | "")}
              className={selectClass}
            >
              <option value="">Sélectionner…</option>
              {REPORT_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Section</label>
            <select
              value={section}
              onChange={e => setSection(e.target.value as NoteSection | "")}
              className={selectClass}
            >
              <option value="">Sélectionner…</option>
              {SECTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

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

          {(state === "recording" || state === "paused") && (
            <>
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground hover:opacity-80 active:scale-95 text-background text-sm font-semibold transition-all duration-150 shadow-sm"
              >
                <Square size={13} className="fill-current" />
                Arrêter
              </button>

              {state === "recording" ? (
                <button
                  onClick={pauseRecording}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted active:scale-95 text-foreground text-sm font-semibold transition-all duration-150"
                >
                  <Pause size={14} />
                  Pause
                </button>
              ) : (
                <button
                  onClick={resumeRecording}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-700 text-sm font-semibold transition-all duration-150"
                >
                  <Play size={14} />
                  Reprendre
                </button>
              )}
            </>
          )}

          {state === "transcribing" && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" />
              Transcription…
            </div>
          )}

          {/* Recording indicator */}
          {(state === "recording" || state === "paused") && (
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg border",
              state === "paused" ? "bg-muted border-border" : "bg-red-50 border-red-200"
            )}>
              <span className={cn(
                "w-2 h-2 rounded-full",
                state === "paused" ? "bg-muted-foreground" : "bg-red-500 animate-pulse"
              )} />
              <span className={cn(
                "text-xs font-mono font-semibold",
                state === "paused" ? "text-muted-foreground" : "text-red-600"
              )}>
                {fmt(duration)}{state === "paused" ? " · en pause" : ""}
              </span>
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
                onClick={clearAll}
                title="Effacer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card text-xs font-medium text-muted-foreground hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-all duration-150"
              >
                <Trash2 size={13} />
                Effacer
              </button>
            </div>
          )}

          {state === "saving" && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" />
              Enregistrement…
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
              "w-full h-full min-h-[50vh] resize-none rounded-2xl border bg-card text-sm text-foreground placeholder:text-muted-foreground/50 px-5 py-4 outline-none leading-relaxed transition-all duration-200",
              state === "recording"
                ? "border-red-300 ring-2 ring-red-200/60"
                : "border-border focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
            )}
            style={{ whiteSpace: "pre-wrap" }}
          />

          {/* Transcribing overlay */}
          {state === "transcribing" && (
            <div className="absolute inset-0 rounded-2xl bg-card/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
              <Loader2 size={28} className="animate-spin text-primary" />
              <p className="text-sm text-muted-foreground font-medium">Transcription en cours…</p>
            </div>
          )}
        </div>

        {/* Footer: count + save */}
        <div className="flex items-center gap-3">
          {text && (
            <p className="text-[11px] text-muted-foreground">
              {text.trim().split(/\s+/).filter(Boolean).length} mots · {text.length} caractères
            </p>
          )}
          <div className="flex-1" />
          <button
            onClick={save}
            disabled={!canSave}
            title={
              !lastBlobRef.current ? "Dictez d'abord un enregistrement"
              : !category          ? "Sélectionnez un type d'examen"
              : !section           ? "Sélectionnez une section"
              : "Enregistrer dans la base d'entraînement"
            }
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:opacity-90 active:scale-95 text-primary-foreground text-sm font-semibold transition-all duration-150 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            <Save size={15} />
            Enregistrer
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
