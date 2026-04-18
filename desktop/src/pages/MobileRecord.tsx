import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

const SOCKET_URL = `http://${window.location.hostname}:4000`;
const SOCKET_TIMEOUT_MS = 10000;

type State = "connecting" | "ready" | "recording" | "uploading" | "done" | "error";

// All styles inline — no Tailwind/CSS variables needed on mobile
const s = {
  page:    { minHeight: "100vh", background: "#F7F8FA", display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "Inter, -apple-system, sans-serif" },
  card:    { background: "#ffffff", borderRadius: "20px", padding: "32px 24px", maxWidth: "360px", width: "100%", boxShadow: "0 8px 32px rgba(80, 59, 44, 0.12)", textAlign: "center" as const, border: "1px solid rgba(199, 191, 178, 0.4)" },
  logo:    { width: "64px", height: "64px", borderRadius: "16px", background: "linear-gradient(135deg,#4A7BBE,#6B97D0)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: "28px" },
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
};

export default function MobileRecord() {
  const { token: sessionId } = useParams<{ token: string }>();
  const [state,    setState]    = useState<State>("connecting");
  const [timer,    setTimer]    = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const socketRef  = useRef<any>(null);
  const mediaRef   = useRef<MediaRecorder | null>(null);
  const chunksRef  = useRef<Blob[]>([]);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setState("error");
      setErrorMsg("Session invalide — scannez un nouveau QR code.");
      return;
    }

    // Connection timeout
    timeoutRef.current = setTimeout(() => {
      if (socketRef.current) socketRef.current.disconnect();
      setState("error");
      setErrorMsg(`Impossible de joindre le serveur (${SOCKET_URL}). Vérifiez que le serveur Node.js est démarré et que PC/téléphone sont sur le même WiFi.`);
    }, SOCKET_TIMEOUT_MS);

    import("socket.io-client").then(({ io }) => {
      const socket = io(SOCKET_URL, {
        transports: ["websocket", "polling"],
        reconnectionAttempts: 3,
        timeout: 8000,
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("mobile:join", { sessionId });
      });

      socket.on("session:ready", () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setState("ready");
      });

      socket.on("connect_error", () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setState("error");
        setErrorMsg(`Serveur injoignable sur ${SOCKET_URL}. Vérifiez que le serveur Node.js tourne sur le port 4000.`);
      });
    }).catch(() => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setState("error");
      setErrorMsg("Erreur de chargement de l'application.");
    });

    return () => {
      socketRef.current?.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      mediaRef.current?.stop();
    };
  }, [sessionId]);

  const handleStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          e.data.arrayBuffer().then(buf =>
            socketRef.current?.emit("audio:chunk", { sessionId, chunk: buf, mimeType, timestamp: Date.now() })
          );
        }
      };

      recorder.start(250);
      setState("recording");
      socketRef.current?.emit("recording:start", { sessionId });
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } catch {
      setState("error");
      setErrorMsg("Accès au microphone refusé. Autorisez le micro dans les réglages de votre navigateur.");
    }
  };

  const handleStop = () => {
    if (!mediaRef.current) return;
    setState("uploading");
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    socketRef.current?.emit("recording:stop", { sessionId });

    mediaRef.current.onstop = () => {
      const mimeType = mediaRef.current?.mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: mimeType });
      blob.arrayBuffer().then(buf => {
        socketRef.current?.emit("audio:complete", { sessionId, audio: buf, mimeType, timestamp: Date.now() });
        setState("done");
      });
      mediaRef.current?.stream.getTracks().forEach(t => t.stop());
    };
    mediaRef.current.stop();
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

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
              <button style={{ ...s.btn, ...s.btnRec }} onClick={handleStart}>
                🎙️
              </button>
              <p style={s.hint}>Appuyez pour démarrer l'enregistrement</p>
            </>
          )}

          {state === "recording" && (
            <>
              <p style={s.timer}>{fmt(timer)}</p>
              <button style={{ ...s.btn, ...s.btnStop }} onClick={handleStop}>
                ⏹️
              </button>
              <p style={s.hint}>Appuyez pour terminer et envoyer</p>
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
