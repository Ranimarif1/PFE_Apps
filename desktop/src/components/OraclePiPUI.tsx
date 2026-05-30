interface Props {
  currentLabel: string;
  nextLabel:    string | null;
  nextText:     string | null;
  index:        number;
  total:        number;
  onNext:       () => void;  // called AFTER clipboard write succeeds
  onCancel:     () => void;
}

// All styles inline — renders in a separate window with no Tailwind access.
export function OraclePiPUI({ currentLabel, nextLabel, nextText, index, total, onNext, onCancel }: Props) {

  function handleNext() {
    if (nextText === null) { onNext(); return; }
    // Use execCommand — works in any focused window without async clipboard permission
    const ta = document.createElement("textarea");
    ta.value = nextText;
    ta.style.cssText = "position:fixed;opacity:0;top:0;left:0;";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    onNext();
  }

  return (
    <div style={{
      fontFamily: "system-ui, -apple-system, sans-serif",
      background: "#0f172a",
      color: "#f8fafc",
      height: "100vh",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      padding: 16,
      boxSizing: "border-box",
    }}>

      {/* Progress dots */}
      <div style={{ display: "flex", gap: 6 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{
            width: 28, height: 4, borderRadius: 4,
            background: i < index ? "#34d399" : i === index ? "#4A7BBE" : "#334155",
            transition: "background 0.3s",
          }} />
        ))}
      </div>

      {/* Status */}
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 14, color: "#34d399" }}>✓</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>{currentLabel}</span>
        </div>
        <span style={{ fontSize: 11, color: "#64748b" }}>copiée — collez dans Oracle</span>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 8, width: "100%" }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: "7px 0", borderRadius: 8,
          border: "1px solid #334155", background: "transparent",
          color: "#94a3b8", fontSize: 11, fontWeight: 600, cursor: "pointer",
        }}>
          Annuler
        </button>
        <button onClick={handleNext} style={{
          flex: 2, padding: "7px 0", borderRadius: 8,
          border: "none",
          background: nextLabel ? "#4A7BBE" : "#059669",
          color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
        }}>
          {nextLabel ? `Suivant → ${nextLabel}` : "✓ Terminer"}
        </button>
      </div>

      <span style={{ fontSize: 10, color: "#475569" }}>{index + 1} / {total}</span>
    </div>
  );
}
