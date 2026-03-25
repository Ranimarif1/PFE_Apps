import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Mic, StopCircle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function MobileRecord() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"valid" | "expired" | "loading">("loading");
  const [recording, setRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Simulate token validation
    setTimeout(() => {
      if (token === "expired") setStatus("expired");
      else setStatus("valid");
    }, 1000);
  }, [token]);

  const startRecording = () => {
    setRecording(true);
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return interval;
  };

  let recordingInterval: ReturnType<typeof setInterval>;

  const handleStart = () => {
    recordingInterval = startRecording();
  };

  const handleStop = async () => {
    clearInterval(recordingInterval);
    setRecording(false);
    setUploading(true);
    await new Promise(r => setTimeout(r, 2000));
    setUploading(false);
    setDone(true);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground">Session expirée</h2>
          <p className="text-muted-foreground text-sm mt-2">Ce QR code a expiré. Veuillez en générer un nouveau depuis l'application.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🩻</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">RadioAI Mobile</h1>
          <p className="text-primary text-sm font-medium mt-1">🩻 Service Radiologie</p>
          <div className="bg-muted/50 rounded-xl px-4 py-2 mt-3 text-sm text-muted-foreground">
            <span>Patient : <strong className="text-foreground font-mono">PAT-001</strong></span>
            <span className="mx-2">|</span>
            <span>Dr. Martin</span>
          </div>
        </div>

        {done ? (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-4">
            <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Audio envoyé avec succès ✅</h2>
            <p className="text-muted-foreground text-sm">Vous pouvez fermer cette page.</p>
          </motion.div>
        ) : uploading ? (
          <div className="text-center space-y-4">
            <Loader2 className="animate-spin w-12 h-12 text-primary mx-auto" />
            <p className="text-primary font-medium">Envoi de l'audio en cours...</p>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="gradient-hero h-2 rounded-full animate-pulse" style={{ width: "75%" }} />
            </div>
          </div>
        ) : (
          <div className="space-y-8 text-center">
            {recording && (
              <div className="text-4xl font-mono font-bold text-destructive">{formatTime(timer)}</div>
            )}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={recording ? handleStop : handleStart}
              className={`w-28 h-28 rounded-full mx-auto flex items-center justify-center text-white shadow-elevated transition-all ${
                recording ? "bg-destructive" : "gradient-hero"
              }`}
            >
              {recording ? <StopCircle size={48} /> : <Mic size={48} />}
            </motion.button>
            <p className="text-sm text-muted-foreground">
              {recording ? "⏹️ Appuyez pour terminer et envoyer" : "🔴 Appuyez pour démarrer l'enregistrement"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}