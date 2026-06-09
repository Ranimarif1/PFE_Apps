import { useState } from "react";
import { Settings, ChevronDown, X } from "lucide-react";
import {
  useMicConfig,
  PRESET_LABELS,
  type MicPreset,
  type MicConstraints,
} from "@/hooks/useMicConfig";
import { cn } from "@/lib/utils";

const PRESETS: MicPreset[] = ["sonic", "philips", "generic"];

const CONSTRAINT_LABELS: Record<keyof MicConstraints, string> = {
  echoCancellation: "Annulation d'écho",
  noiseSuppression: "Suppression du bruit",
  autoGainControl:  "Contrôle automatique du gain",
};

interface Props {
  className?: string;
}

export function MicConfigPanel({ className }: Props) {
  const [open, setOpen] = useState(false);

  const {
    devices,
    selectedDeviceId,
    setSelectedDevice,
    getConfig,
    applyPreset,
    updateConstraint,
    refreshDevices,
  } = useMicConfig();

  const cfg = getConfig(selectedDeviceId);
  const c   = cfg.constraints;

  function handleOpen() {
    setOpen(v => !v);
    refreshDevices();
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-1.5 text-[11px] text-muted-foreground border border-border rounded-lg px-3 py-2 hover:border-primary/40 hover:text-primary transition-colors"
      >
        <Settings size={12} className="shrink-0" />
        <span>Paramètres micro</span>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="absolute left-0 bottom-full mb-2 z-50 w-72 rounded-xl border border-border bg-background shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="text-[11px] font-semibold text-foreground">Configuration microphone</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={12} />
              </button>
            </div>

            <div className="p-3 space-y-3">
              {/* Device selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Périphérique
                </label>
                <div className="relative">
                  <select
                    value={selectedDeviceId}
                    onChange={e => setSelectedDevice(e.target.value)}
                    className="w-full text-[11px] border border-border rounded-md px-2 py-1.5 pr-6 bg-background appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/40"
                  >
                    <option value="default">Microphone par défaut</option>
                    {devices.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Micro (${d.deviceId.slice(0, 8)}…)`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
                </div>
              </div>

              {/* Preset selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Profil
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {PRESETS.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => applyPreset(selectedDeviceId, preset)}
                      className={cn(
                        "text-[10px] rounded-md px-1.5 py-1.5 border transition-colors text-center leading-tight",
                        cfg.preset === preset
                          ? "border-primary/50 bg-primary/10 text-primary font-semibold"
                          : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
                      )}
                    >
                      {PRESET_LABELS[preset]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual toggles */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Personnaliser
                </label>
                <div className="space-y-2">
                  {(Object.keys(CONSTRAINT_LABELS) as (keyof MicConstraints)[]).map(key => (
                    <label key={key} className="flex items-center justify-between cursor-pointer gap-2">
                      <span className="text-[11px] text-slate-600 dark:text-slate-400 flex-1">
                        {CONSTRAINT_LABELS[key]}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={c[key]}
                        onClick={() => updateConstraint(selectedDeviceId, key, !c[key])}
                        className={cn(
                          "w-8 h-4 rounded-full transition-colors relative shrink-0",
                          c[key] ? "bg-primary" : "bg-slate-200 dark:bg-slate-700",
                        )}
                      >
                        <span className={cn(
                          "absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform",
                          c[key] ? "translate-x-4" : "translate-x-0.5",
                        )} />
                      </button>
                    </label>
                  ))}
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground/60 pt-0.5">
                Les réglages sont sauvegardés par périphérique.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
