import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Pause, Play, Square, X, Loader2 } from "lucide-react";
import { useRecording } from "@/contexts/RecordingContext";
import { SonicMicButton } from "@/components/SonicMicButton";
import { useRecordingPiP } from "@/hooks/useRecordingPiP";
import { cn } from "@/lib/utils";

function fmt(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

interface Props {
  collapsed: boolean;
}

export function RecordingIndicator({ collapsed }: Props) {
  const recording = useRecording();
  const navigate  = useNavigate();
  useRecordingPiP();

  const active = recording.isRecording
    || recording.isPaused
    || recording.isTranscribing
    || !!recording.audioReceived;

  // Navigate when transcription result is ready
  useEffect(() => {
    if (!recording.result) return;
    const { examId, category, text, méthode, audioId, reportId } = recording.result;
    recording.clearResult();
    if (reportId) {
      // Draft already persisted in the RecordingContext — go straight to it.
      navigate(`/rapport/${reportId}`, {
        state: {
          ID_Exam: examId,
          transcription: text,
          audioId,
          category,
          _restore: { etape: 3, examId, category, méthode },
        },
      });
    } else {
      // Fallback: draft creation failed — let RapportDetail retry via its auto-save.
      navigate("/rapport/new", {
        state: {
          ID_Exam: examId,
          transcription: text,
          audioId,
          category,
          _restore: { etape: 3, examId, category, méthode },
        },
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording.result]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className={cn(
            "mx-2 mb-2 rounded-xl border overflow-hidden",
            recording.isTranscribing || recording.audioReceived
              ? "border-slate-700 bg-[#0D1119]"
              : recording.isPaused
                ? "border-[#4A7BBE] bg-[#4A7BBE]"
                : "border-[#DC2626] bg-[#DC2626]"
          )}
        >
          {/* Top bar — status + timer */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-2",
            collapsed && "justify-center px-2"
          )}>
            {recording.isTranscribing || recording.audioReceived ? (
              <Loader2 size={12} className="animate-spin text-white shrink-0" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
            )}

            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="overflow-hidden flex-1 min-w-0"
                >
                  {recording.isTranscribing || recording.audioReceived ? (
                    <p className="text-[11px] font-medium text-white whitespace-nowrap">
                      Transcription…
                    </p>
                  ) : (
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[11px] font-medium text-white whitespace-nowrap truncate">
                        {recording.isPaused ? "En pause" : "Enregistrement"}
                      </p>
                      <span className="font-mono text-[11px] text-white/80 shrink-0">
                        {fmt(recording.seconds)}
                      </span>
                    </div>
                  )}
                  {recording.examId && (
                    <p className="text-[9px] text-white/50 font-mono truncate">
                      #{recording.examId}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Controls — only when recording/paused */}
          <AnimatePresence>
            {!collapsed && !recording.isTranscribing && !recording.audioReceived && recording.méthode === "navigateur" && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-1 px-2 pb-1">
                  {/* Pause / Resume */}
                  <button
                    onClick={recording.togglePause}
                    title={recording.isPaused ? "Reprendre" : "Pause"}
                    className="flex-1 flex items-center justify-center gap-1 text-[10px] font-medium py-1 rounded-md bg-white/20 text-white hover:bg-white/30 transition-colors"
                  >
                    {recording.isPaused
                      ? <><Play size={10} /> Reprendre</>
                      : <><Pause size={10} /> Pause</>
                    }
                  </button>

                  {/* Stop → transcribe */}
                  <button
                    onClick={recording.stopRecording}
                    title="Arrêter et transcrire"
                    className="flex-1 flex items-center justify-center gap-1 text-[10px] font-medium py-1 rounded-md bg-white/20 text-white hover:bg-white/30 transition-colors"
                  >
                    <Square size={10} /> Arrêter
                  </button>

                  {/* Cancel */}
                  <button
                    onClick={recording.cancelRecording}
                    title="Annuler"
                    className="w-6 h-6 flex items-center justify-center rounded-md text-white/50 hover:text-white hover:bg-white/20 transition-colors"
                  >
                    <X size={10} />
                  </button>
                </div>

                {/* SonicMic hardware buttons — stop/pause work even when navigated away */}
                <SonicMicButton
                  onStop={recording.stopRecording}
                  onPause={recording.togglePause}
                  className="mx-2 mb-1"
                />
              </motion.div>
            )}

            {/* Smartphone — only cancel while waiting / recording */}
            {!collapsed && !recording.isTranscribing && !recording.audioReceived && recording.méthode === "smartphone" && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-1 px-2 pb-2">
                  <div className="flex-1 text-[10px] text-slate-500 truncate">
                    {recording.mobileConnected ? "Mobile connecté" : "En attente du mobile…"}
                  </div>
                  <button
                    onClick={recording.cancelRecording}
                    title="Annuler"
                    className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
                  >
                    <X size={10} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {!collapsed && recording.error && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="px-3 pb-2 flex items-start gap-1.5">
                  <p className="text-[10px] text-destructive flex-1">{recording.error}</p>
                  <button
                    onClick={recording.clearError}
                    className="text-slate-400 hover:text-slate-600 shrink-0"
                  >
                    <X size={10} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
