import { Settings, MicOff, CheckCircle, Circle, Loader2, Mic, X, RotateCcw } from "lucide-react";
import { useSonicMic, CALIBRATION_ORDER, type ButtonAction, type HIDDeviceInfo } from "@/hooks/useSonicMic";
import { cn } from "@/lib/utils";

interface Props {
  onRecord?: () => void;
  onStop?:   () => void;
  onPause?:  () => void;
  className?: string;
}

const ACTION_META: Record<ButtonAction, { icon: string; label: string; color: string }> = {
  record: { icon: "⏺", label: "Enregistrer",      color: "text-red-500"   },
  pause:  { icon: "⏸", label: "Pause / Reprendre", color: "text-amber-500" },
  stop:   { icon: "⏹", label: "Arrêter",            color: "text-slate-500" },
};

// ── Single device card ────────────────────────────────────────────────────────

interface DeviceCardProps {
  info:              HIDDeviceInfo;
  onStartCalib:      () => void;
  onCancelCalib:     () => void;
  onReset:           () => void;
}

function DeviceCard({ info, onStartCalib, onCancelCalib, onReset }: DeviceCardProps) {
  // Calibration panel
  if (info.isCalibrating && info.calibratingStep !== null) {
    const currentIdx = CALIBRATION_ORDER.indexOf(info.calibratingStep);
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-blue-100">
          <Loader2 size={11} className="text-blue-500 animate-spin shrink-0" />
          <span className="text-[11px] font-semibold text-blue-700 flex-1 truncate">
            {info.name}
          </span>
          <button type="button" onClick={onCancelCalib}
            className="text-[10px] text-blue-400 hover:text-blue-600 transition-colors shrink-0">
            Annuler
          </button>
        </div>
        <div className="px-3 py-2 space-y-2">
          <p className="text-[10px] text-blue-600">Appuyez sur le bouton physique :</p>
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
                {isCurrent && <span className="text-[9px] font-semibold text-blue-600 animate-pulse shrink-0">Appuyez →</span>}
                {isPending && <Circle size={11} className="text-slate-300 shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Connected card
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
        <span className="text-[11px] font-semibold text-emerald-700 flex-1 truncate">{info.name}</span>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={onStartCalib}
            title={info.hasCalibration ? "Recalibrer" : "Calibrer les boutons"}
            className={cn(
              "rounded p-0.5 transition-colors",
              info.hasCalibration
                ? "text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100"
                : "text-amber-400 hover:text-amber-600 hover:bg-amber-50",
            )}>
            <Settings size={11} />
          </button>
          {info.hasCalibration && (
            <button type="button" onClick={onReset}
              title="Réinitialiser la calibration"
              className="rounded p-0.5 text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors">
              <RotateCcw size={10} />
            </button>
          )}
        </div>
      </div>
      <div className="border-t border-emerald-100 px-3 py-2 space-y-1.5">
        {CALIBRATION_ORDER.map(action => {
          const { icon, label, color } = ACTION_META[action];
          return (
            <div key={action} className="flex items-center gap-2">
              <span className={cn("text-[13px] leading-none shrink-0", color)}>{icon}</span>
              <span className="text-[10px] text-slate-600">{label}</span>
            </div>
          );
        })}
        {!info.hasCalibration && (
          <p className="text-[9px] text-amber-600 pt-0.5">
            ⚠ Non calibré — cliquez ⚙ pour configurer les boutons
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SonicMicButton({ onRecord, onStop, onPause, className }: Props) {
  const supportsHID = typeof navigator !== "undefined" && "hid" in navigator;

  const { deviceInfos, anyConnected, error, connect, startCalibration, cancelCalibration, resetMapping } =
    useSonicMic(supportsHID ? { onRecord, onStop, onPause } : {});

  if (!supportsHID) {
    return (
      <div className={cn(
        "flex items-center gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2",
        className,
      )}>
        <MicOff size={12} className="shrink-0" />
        <span>Micro USB — utilisez Chrome ou Edge</span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* One card per connected device */}
      {deviceInfos.map(info => (
        <DeviceCard
          key={info.physId}
          info={info}
          onStartCalib={() => startCalibration(info.physId)}
          onCancelCalib={() => cancelCalibration(info.physId)}
          onReset={() => resetMapping(info.physId)}
        />
      ))}

      {/* Connect button when no device connected */}
      {!anyConnected && (
        <button
          type="button"
          onClick={connect}
          className="flex items-center gap-2 text-[11px] text-muted-foreground border border-border rounded-lg px-3 py-2 hover:border-primary/40 hover:text-primary transition-colors"
        >
          <Mic size={12} className="shrink-0" />
          <span>Connecter microphone USB</span>
        </button>
      )}

      {/* Add another device when one is already connected */}
      {anyConnected && (
        <button
          type="button"
          onClick={connect}
          className="flex items-center gap-2 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors px-1"
        >
          <Mic size={10} className="shrink-0" />
          <span>Connecter un autre micro USB</span>
        </button>
      )}

      {error && <p className="text-[11px] text-destructive px-1">{error}</p>}
    </div>
  );
}
