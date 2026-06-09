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
  const idle    = !isRecording && !isPaused;
  const bgColor = idle ? "#0D1119" : isPaused ? "#4A7BBE" : "#DC2626";
  const accent  = idle ? "#475569" : "#ffffff";

  return (
    <div style={{
      fontFamily: "system-ui, -apple-system, sans-serif",
      background: bgColor,
      transition: "background 0.4s ease",
      color: "#f8fafc",
      height: "100vh",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      userSelect: "none",
      overflow: "hidden",
      padding: 16,
    }}>

      {/* Status dot + label */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: accent,
          display: "inline-block", flexShrink: 0,
          transition: "background 0.3s",
          animation: (!idle && !isPaused) ? "pip-pulse 1.2s ease-in-out infinite" : "none",
        }} />
        <span style={{
          fontSize: 11, fontWeight: 600,
          letterSpacing: "0.02em",
          color: accent,
          transition: "color 0.3s",
        }}>
          {idle
            ? "Prêt à enregistrer"
            : isPaused
              ? "En pause"
              : "Enregistrement en cours…"}
        </span>
      </div>

      {/* Timer — always visible, grey when idle */}
      <div style={{
        fontFamily: "ui-monospace, monospace",
        fontSize: 32, fontWeight: 700,
        color: idle ? "#475569" : "#f1f5f9",
        letterSpacing: "0.06em", lineHeight: 1,
        transition: "color 0.3s",
      }}>
        {fmt(seconds)}
      </div>

      {/* Controls — hidden when idle (doctor hasn't started yet) */}
      {!idle && (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onPause}
            style={{
              fontSize: 11, fontWeight: 600,
              padding: "5px 14px", borderRadius: 8, border: "none",
              background: "rgba(255,255,255,0.20)",
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            {isPaused ? "▶ Reprendre" : "⏸ Pause"}
          </button>
          <button
            onClick={onStop}
            style={{
              fontSize: 11, fontWeight: 600,
              padding: "5px 14px", borderRadius: 8, border: "none",
              background: "rgba(255,255,255,0.20)",
              color: "#ffffff", cursor: "pointer",
            }}
          >
            ⏹ Arrêter
          </button>
        </div>
      )}
    </div>
  );
}
