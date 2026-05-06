import { Mic2, MicOff } from "lucide-react";
import { useSonicMic } from "@/hooks/useSonicMic";
import { cn } from "@/lib/utils";

interface Props {
  onRecord?: () => void;
  onStop?:   () => void;
  onPause?:  () => void;
  className?: string;
}

const COMMANDS = [
  { icon: "⏺", btn: "REC", label: "Démarrer",         color: "text-red-500"    },
  { icon: "⏸", btn: "EOL", label: "Pause / Reprendre", color: "text-amber-500" },
  { icon: "⏹", btn: "F2",  label: "Arrêter",           color: "text-slate-500"  },
] as const;

export function SonicMicButton({ onRecord, onStop, onPause, className }: Props) {
  const supportsHID = typeof navigator !== "undefined" && "hid" in navigator;

  const { connected, connect, error } = useSonicMic(
    supportsHID ? { onRecord, onStop, onPause } : {},
  );

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

  if (connected) {
    return (
      <div className={cn("rounded-lg border border-emerald-200 bg-emerald-50 overflow-hidden", className)}>
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-[11px] font-semibold text-emerald-700">SonicMic connecté</span>
        </div>

        {/* Command legend */}
        <div className="border-t border-emerald-100 px-3 py-2 space-y-1.5">
          {COMMANDS.map(({ icon, btn, label, color }) => (
            <div key={label} className="flex items-center gap-2">
              <span className={cn("text-[13px] leading-none shrink-0", color)}>{icon}</span>
              <span className="text-[10px] font-mono font-bold text-slate-500 shrink-0">{btn}</span>
              <span className="text-[10px] text-slate-600">{label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <button
        type="button"
        onClick={connect}
        className="flex items-center gap-2 text-[11px] text-muted-foreground border border-border rounded-lg px-3 py-2 hover:border-primary/40 hover:text-primary transition-colors"
      >
        <Mic2 size={12} className="shrink-0" />
        <span>Connecter SonicMic</span>
      </button>
      {error && (
        <p className="text-[11px] text-destructive px-1">{error}</p>
      )}
    </div>
  );
}
