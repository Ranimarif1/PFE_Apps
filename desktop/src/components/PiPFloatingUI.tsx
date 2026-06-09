interface Props {
  isRecording: boolean;
  isPaused:    boolean;
  seconds:     number;
  onStop:      () => void;
  onPause:     () => void;
}

function fmt(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// All styles are inline — this component renders into a separate window
// (Document PiP or fallback popup) that has no access to Tailwind/CSS modules.
export function PiPFloatingUI({ isRecording, isPaused, seconds, onStop, onPause }: Props) {
  const idle = !isRecording && !isPaused;

  const bg     = idle ? "#0D1119" : isPaused ? "#1E3A6E" : "#7F1D1D";
  const accent = idle ? "#475569" : "#FFFFFF";
  const label  = idle ? "Prêt à enregistrer" : isPaused ? "En pause" : "Enregistrement en cours…";

  const btnBase: Record<string, string | number> = {
    fontSize: 12, fontWeight: 700,
    padding: "6px 16px", borderRadius: 8, cursor: "pointer",
    letterSpacing: "0.01em", transition: "opacity 0.15s",
  };

  return (
    <div style={{
      fontFamily: "system-ui, -apple-system, sans-serif",
      background: bg,
      transition: "background 0.4s ease",
      color: "#FFFFFF",
      height: "100vh",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
      userSelect: "none",
      overflow: "hidden",
      padding: 20,
    }}>

      {/* Status badge */}
      <div style={{
        display: "flex", alignItems: "center", gap: 7,
        background: "rgba(255,255,255,0.10)",
        borderRadius: 20, padding: "4px 12px",
        border: "1px solid rgba(255,255,255,0.18)",
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: "50%",
          background: idle ? "#475569" : isPaused ? "#93C5FD" : "#FCA5A5",
          display: "inline-block", flexShrink: 0,
          boxShadow: (!idle && !isPaused) ? "0 0 6px #FCA5A5" : "none",
          animation: (!idle && !isPaused) ? "pip-pulse 1.2s ease-in-out infinite" : "none",
        }} />
        <span style={{
          fontSize: 11, fontWeight: 700,
          letterSpacing: "0.04em", textTransform: "uppercase",
          color: idle ? "#64748B" : isPaused ? "#BFDBFE" : "#FEE2E2",
        }}>
          {label}
        </span>
      </div>

      {/* Timer */}
      <div style={{
        fontFamily: "ui-monospace, 'Cascadia Code', monospace",
        fontSize: 40, fontWeight: 800,
        color: idle ? "#334155" : "#FFFFFF",
        letterSpacing: "0.08em", lineHeight: 1,
        textShadow: idle ? "none" : "0 2px 12px rgba(0,0,0,0.4)",
        transition: "color 0.3s",
      }}>
        {fmt(seconds)}
      </div>

      {/* Buttons */}
      {!idle && (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onPause}
            style={{
              ...btnBase,
              background: "rgba(255,255,255,0.15)",
              color: "#FFFFFF",
              border: "1px solid rgba(255,255,255,0.30)",
            }}
          >
            {isPaused ? "▶ Reprendre" : "⏸ Pause"}
          </button>
          <button
            onClick={onStop}
            style={{
              ...btnBase,
              background: "rgba(255,255,255,0.95)",
              color: isPaused ? "#1E3A6E" : "#7F1D1D",
              border: "1px solid rgba(255,255,255,0.95)",
            }}
          >
            ⏹ Arrêter
          </button>
        </div>
      )}
    </div>
  );
}
