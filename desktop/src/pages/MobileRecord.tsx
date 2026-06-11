import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

const SOCKET_URL = `${window.location.protocol}//${window.location.host}`;
const SOCKET_TIMEOUT_MS = 10000;
const DB_NAME  = "reportease";
const DB_STORE = "audio";
const DB_KEY   = "pending";

type State = "connecting" | "ready" | "recording" | "stopped" | "uploading" | "done" | "error";

// ── IndexedDB helpers ────────────────────────────────────────────────────────
async function dbOpen(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(DB_STORE);
    r.onsuccess = () => res(r.result);
    r.onerror   = () => rej(r.error);
  });
}
async function dbSave(blob: Blob, mime: string, secs: number) {
  try {
    const db = await dbOpen();
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).put({ blob, mime, secs }, DB_KEY);
      tx.oncomplete = () => res();
      tx.onerror    = () => rej();
    });
  } catch { /* silent */ }
}
async function dbLoad(): Promise<{ blob: Blob; mime: string; secs: number } | null> {
  try {
    const db = await dbOpen();
    return new Promise((res, rej) => {
      const tx  = db.transaction(DB_STORE, "readonly");
      const req = tx.objectStore(DB_STORE).get(DB_KEY);
      req.onsuccess = () => res(req.result ?? null);
      req.onerror   = () => rej();
    });
  } catch { return null; }
}
async function dbClear() {
  try {
    const db = await dbOpen();
    await new Promise<void>(res => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).delete(DB_KEY);
      tx.oncomplete = () => res();
      tx.onerror    = () => res();
    });
  } catch { /* silent */ }
}

// ── Original styles (unchanged) ───────────────────────────────────────────────
const s = {
  page:    { minHeight: "100vh", background: "#F7F8FA", display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "Inter, -apple-system, sans-serif" },
  card:    { background: "#ffffff", borderRadius: "20px", padding: "32px 24px", maxWidth: "360px", width: "100%", boxShadow: "0 8px 32px rgba(80, 59, 44, 0.12)", textAlign: "center" as const, border: "1px solid rgba(199, 191, 178, 0.4)" },
  title:   { fontSize: "22px", fontWeight: 700, color: "#1A1410", margin: "0 0 4px" },
  sub:     { fontSize: "13px", color: "#7A6E61", margin: "0 0 24px" },
  btn:     { width: "110px", height: "110px", borderRadius: "50%", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", fontSize: "48px", boxShadow: "0 8px 24px rgba(74, 123, 190, 0.28)" },
  btnRec:  { background: "linear-gradient(135deg,#4A7BBE,#6B97D0)" },
  btnStop: { background: "#E38C8C" },
  timer:   { fontSize: "42px", fontWeight: 700, color: "#8E5555", fontVariantNumeric: "tabular-nums" as const, margin: "0 0 16px" },
  hint:    { fontSize: "13px", color: "#7A6E61", margin: "12px 0 0" },
  spinner: { width: "48px", height: "48px", border: "4px solid #e2e8f0", borderTopColor: "#4A7BBE", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" },
  ok:      { width: "72px", height: "72px", borderRadius: "50%", background: "rgba(143, 211, 179, 0.16)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: "36px" },
  err:     { width: "72px", height: "72px", borderRadius: "50%", background: "rgba(227, 140, 140, 0.16)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: "36px" },
  errMsg:  { fontSize: "13px", color: "#7A6E61", margin: "8px 0 0", lineHeight: 1.5 },
  badge:   { display: "inline-block", background: "rgba(143, 211, 179, 0.16)", color: "#4D7F67", borderRadius: "20px", padding: "6px 14px", fontSize: "12px", fontWeight: 600, margin: "0 0 20px" },
  warn:    { display: "inline-block", background: "rgba(251,191,36,.15)", color: "#92400e", borderRadius: "20px", padding: "4px 12px", fontSize: "11px", fontWeight: 600, margin: "0 0 12px" },
  dlBtn:   { width: "100%", padding: "14px 0", borderRadius: "12px", border: "none", fontSize: "15px", fontWeight: 700, cursor: "pointer", marginBottom: "10px", background: "linear-gradient(135deg,#4D7F67,#5fa07a)", color: "#fff" } as React.CSSProperties,
  snBtn:   { width: "100%", padding: "12px 0", borderRadius: "12px", border: "none", fontSize: "14px", fontWeight: 600, cursor: "pointer", background: "linear-gradient(135deg,#4A7BBE,#6B97D0)", color: "#fff" } as React.CSSProperties,
  warnBox: { background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.4)", borderRadius: "12px", padding: "10px 12px", margin: "0 0 12px", fontSize: "12px", color: "#92400e", lineHeight: 1.6 } as React.CSSProperties,
};

export default function MobileRecord() {
  const { token: sessionId } = useParams<{ token: string }>();

  const [state,     setState]     = useState<State>("connecting");
  const [timer,     setTimer]     = useState(0);
  const [errorMsg,  setErrorMsg]  = useState("");
  const [connected, setConnected] = useState(false);
  const [saved,     setSaved]     = useState<{ blob: Blob; mime: string; secs: number } | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const socketRef  = useRef<any>(null);
  const mediaRef   = useRef<MediaRecorder | null>(null);
  const chunksRef  = useRef<Blob[]>([]);
  const mimeRef    = useRef("audio/webm");
  const secsRef    = useRef(0);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef   = useRef<State>("connecting");

  const go = (st: State) => { stateRef.current = st; setState(st); };

  useEffect(() => {
    if (!sessionId) {
      go("error");
      setErrorMsg("Session invalide — scannez un nouveau QR code.");
      return;
    }

    // Check IndexedDB first — audio may have been saved before a page reload
    dbLoad().then(entry => {
      if (entry) {
        setSaved(entry);
        go("stopped");
        return;
      }
      startConnect();
    });

    return () => {
      socketRef.current?.disconnect();
      if (timerRef.current)  clearInterval(timerRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      mediaRef.current?.stop();
    };
  }, [sessionId]);

  const startConnect = () => {
    timeoutRef.current = setTimeout(() => {
      if (stateRef.current === "connecting") {
        socketRef.current?.disconnect();
        go("error");
        setErrorMsg(`Impossible de joindre le serveur (${SOCKET_URL}). Vérifiez que le serveur Node.js est démarré et que PC/téléphone sont sur le même WiFi.`);
      }
    }, SOCKET_TIMEOUT_MS);

    import("socket.io-client").then(({ io }) => {
      const socket = io(SOCKET_URL, {
        transports: ["websocket", "polling"],
        reconnectionAttempts: 20,
        reconnectionDelay: 1000,
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        setConnected(true);
        socket.emit("mobile:join", { sessionId });
      });

      socket.on("session:ready", () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (stateRef.current === "connecting") go("ready");
      });

      socket.on("disconnect", () => setConnected(false));

      socket.on("connect_error", () => {
        setConnected(false);
        // Only fail on initial connect — never interrupt recording/stopped
        if (stateRef.current === "connecting") {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          go("error");
          setErrorMsg(`Serveur injoignable sur ${SOCKET_URL}. Vérifiez que le serveur Node.js tourne sur le port 4000.`);
        }
      });
    }).catch(() => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      go("error");
      setErrorMsg("Erreur de chargement de l'application.");
    });
  };

  const handleStart = async () => {
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus" : "audio/webm";
      mimeRef.current   = mimeType;
      chunksRef.current = [];
      secsRef.current   = 0;

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          e.data.arrayBuffer().then(buf =>
            socketRef.current?.emit("audio:chunk", { sessionId, chunk: buf, mimeType, timestamp: Date.now() })
          );
        }
      };

      recorder.start(250);
      go("recording");
      socketRef.current?.emit("recording:start", { sessionId });
      timerRef.current = setInterval(() => {
        setTimer(t => t + 1);
        secsRef.current += 1;
      }, 1000);
    } catch {
      go("error");
      setErrorMsg("Accès au microphone refusé. Autorisez le micro dans les réglages de votre navigateur.");
    }
  };

  const handleStop = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    socketRef.current?.emit("recording:stop", { sessionId });

    const finalize = async () => {
      const mime = mimeRef.current;
      const blob = new Blob(chunksRef.current, { type: mime });
      const secs = secsRef.current;
      await dbSave(blob, mime, secs);
      setSaved({ blob, mime, secs });
      go("stopped");
    };

    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.onstop = () => {
        mediaRef.current?.stream.getTracks().forEach(t => t.stop());
        finalize();
      };
      mediaRef.current.stop();
    } else {
      finalize();
    }
  };

  const handleDownload = () => {
    if (!saved) return;
    const ext  = saved.mime.includes("ogg") ? "ogg" : "webm";
    const name = `dictee_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.${ext}`;
    const url  = URL.createObjectURL(saved.blob);
    const a    = document.createElement("a");
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleSend = async () => {
    if (!saved || !socketRef.current?.connected) return;
    go("uploading");
    const buf = await saved.blob.arrayBuffer();
    socketRef.current.emit("audio:complete", {
      sessionId, audio: buf, mimeType: saved.mime, timestamp: Date.now(),
    });
    await dbClear();
    go("done");
  };

  const handleDiscard = async () => {
    await dbClear();
    setSaved(null);
    go("connecting");
    startConnect();
  };

  const fmt = (n: number) =>
    `${Math.floor(n / 60).toString().padStart(2, "0")}:${(n % 60).toString().padStart(2, "0")}`;

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={s.page}>
        <div style={s.card}>
          <h1 style={s.title}>ReportEase Mobile</h1>

          {state === "connecting" && (
            <>
              <div style={s.spinner} />
              <p style={{ color: "#4A7BBE", fontWeight: 600, margin: 0 }}>Connexion au serveur…</p>
              <p style={s.errMsg}>{SOCKET_URL}</p>
            </>
          )}

          {state === "ready" && (
            <>
              <div style={s.badge}>✅ Connecté — prêt à enregistrer</div>
              <button style={{ ...s.btn, ...s.btnRec }} onClick={handleStart}>🎙️</button>
              <p style={s.hint}>Appuyez pour démarrer l'enregistrement</p>
            </>
          )}

          {state === "recording" && (
            <>
              {!connected && <div style={s.warn}>⚠️ Hors ligne — enregistrement continue</div>}
              <p style={s.timer}>{fmt(timer)}</p>
              <button style={{ ...s.btn, ...s.btnStop }} onClick={handleStop}>⏹️</button>
              <p style={s.hint}>Appuyez pour terminer</p>
            </>
          )}

          {state === "stopped" && saved && (
            <>
              <div style={s.ok}>🎙️</div>
              <h2 style={{ ...s.title, fontSize: "18px", marginBottom: "4px" }}>
                Audio prêt — {fmt(saved.secs)}
              </h2>
              <p style={{ ...s.errMsg, marginBottom: "20px" }}>Sauvegardé sur cet appareil.</p>

              <button style={s.dlBtn} onClick={handleDownload}>
                💾 Télécharger sur ce téléphone
              </button>

              {connected ? (
                <button style={s.snBtn} onClick={handleSend}>
                  📡 Envoyer au desktop
                </button>
              ) : (
                <div style={s.warnBox}>
                  Pas de connexion. Téléchargez le fichier ci-dessus puis importez-le sur le desktop via <strong>Importer un fichier</strong>.
                </div>
              )}

              <button
                onClick={handleDiscard}
                style={{ marginTop: "12px", background: "none", border: "none", color: "#9ca3af", fontSize: "12px", cursor: "pointer" }}
              >
                Supprimer et recommencer
              </button>
            </>
          )}

          {state === "uploading" && (
            <>
              <div style={s.spinner} />
              <p style={{ color: "#4A7BBE", fontWeight: 600, margin: 0 }}>Envoi de l'audio…</p>
            </>
          )}

          {state === "done" && (
            <>
              <div style={s.ok}>✅</div>
              <h2 style={{ ...s.title, fontSize: "18px" }}>Audio envoyé !</h2>
              <p style={s.errMsg}>La transcription démarre sur l'application desktop. Vous pouvez fermer cette page.</p>
            </>
          )}

          {state === "error" && (
            <>
              <div style={s.err}>❌</div>
              <h2 style={{ ...s.title, fontSize: "18px" }}>Erreur</h2>
              <p style={s.errMsg}>{errorMsg}</p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
