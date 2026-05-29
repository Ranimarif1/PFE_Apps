import { Settings, MicOff, CheckCircle, Circle, Loader2 } from "lucide-react";
import { useSonicMic, CALIBRATION_ORDER, type ButtonAction } from "@/hooks/useSonicMic";
import { cn } from "@/lib/utils";

interface Props {
  onRecord?: () => void;
  onStop?:   () => void;
  onPause?:  () => void;
  className?: string;
}

const ACTION_META: Record<ButtonAction, { icon: string; label: string; color: string }> = {
  record: { icon: "⏺", label: "Enregistrer",       color: "text-red-500"    },
  pause:  { icon: "⏸", label: "Pause / Reprendre",  color: "text-amber-500"  },
  stop:   { icon: "⏹", label: "Arrêter",             color: "text-slate-500"  },
};

export function SonicMicButton({ onRecord, onStop, onPause, className }: Props) {
  const supportsHID = typeof navigator !== "undefined" && "hid" in navigator;

  const {
    connected,
    connect,
    error,
    calibrating,
    hasCustomMapping,
    startCalibration,
    cancelCalibration,
  } = useSonicMic(supportsHID ? { onRecord, onStop, onPause } : {});

  if (!supportsHID) {
    return (
      <div className={cn(
        "flex items-center gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2",
        className,
      )}>
        <MicOff size={12} className="shrink-0" />
        <span>SonicMic — utilisez Chrome ou Edge</span>
      </div>
    );
  }

  // ── Calibration panel ──────────────────────────────────────────────────────
  if (calibrating !== null) {
    const currentIdx = CALIBRATION_ORDER.indexOf(calibrating);

    return (
      <div className={cn("rounded-lg border border-blue-200 bg-blue-50 overflow-hidden", className)}>
        <div className="flex items-center gap-2 px-3 py-2 border-b border-blue-100">
          <Loader2 size={11} className="text-blue-500 animate-spin shrink-0" />
          <span className="text-[11px] font-semibold text-blue-700 flex-1">
            Personnalisation des boutons
          </span>
          <button
            type="button"
            onClick={cancelCalibration}
            className="text-[10px] text-blue-400 hover:text-blue-600 transition-colors"
          >
            Annuler
          </button>
        </div>

        <div className="px-3 py-2 space-y-2">
          <p className="text-[10px] text-blue-600 mb-2">
            Appuyez sur le bouton physique pour chaque action :
          </p>

          {CALIBRATION_ORDER.map((action, idx) => {
            const { icon, label, color } = ACTION_META[action];
            const isDone    = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            const isPending = idx > currentIdx;

            return (
              <div key={action} className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
                isCurrent && "bg-blue-100",
                isDone    && "opacity-60",
                isPending && "opacity-30",
              )}>
                <span className={cn("text-[13px] leading-none shrink-0", color)}>{icon}</span>
                <span className="text-[10px] text-slate-700 flex-1">{label}</span>
                {isDone    && <CheckCircle size={11} className="text-emerald-500 shrink-0" />}
                {isCurrent && (
                  <span className="text-[9px] font-semibold text-blue-600 animate-pulse shrink-0">
                    Appuyez →
                  </span>
                )}
                {isPending && <Circle size={11} className="text-slate-300 shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Connected state ────────────────────────────────────────────────────────
  if (connected) {
    return (
      <div className={cn("rounded-lg border border-emerald-200 bg-emerald-50 overflow-hidden", className)}>
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-[11px] font-semibold text-emerald-700 flex-1">SonicMic connecté</span>
          <button
            type="button"
            onClick={startCalibration}
            title="Personnaliser les boutons"
            className={cn(
              "rounded p-0.5 transition-colors",
              hasCustomMapping
                ? "text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100"
                : "text-amber-400 hover:text-amber-600 hover:bg-amber-50",
            )}
          >
            <Settings size={11} />
          </button>
        </div>

        <div className="border-t border-emerald-100 px-3 py-2 space-y-1.5">
          {CALIBRATION_ORDER.map((action) => {
            const { icon, label, color } = ACTION_META[action];
            return (
              <div key={action} className="flex items-center gap-2">
                <span className={cn("text-[13px] leading-none shrink-0", color)}>{icon}</span>
                <span className="text-[10px] text-slate-600">{label}</span>
              </div>
            );
          })}
          {!hasCustomMapping && (
            <p className="text-[9px] text-amber-600 pt-0.5">
              ⚠ Boutons non configurés — cliquez ⚙ pour personnaliser
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Disconnected state ─────────────────────────────────────────────────────
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <button
        type="button"
        onClick={connect}
        className="flex items-center gap-2 text-[11px] text-muted-foreground border border-border rounded-lg px-3 py-2 hover:border-primary/40 hover:text-primary transition-colors"
      >
        <MicOff size={12} className="shrink-0" />
        <span>Connecter SonicMic</span>
      </button>
      {error && (
        <p className="text-[11px] text-destructive px-1">{error}</p>
      )}
    </div>
  );
}
