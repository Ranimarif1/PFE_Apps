import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Radio, Sun, Moon, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

export default function Login() {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await login(email, password);
    setLoading(false);
    if (!result.success) {
      setError(result.message || "Erreur de connexion.");
      return;
    }
    const user = JSON.parse(localStorage.getItem("auth_user") || "{}");
    if (user.rôle === "admin") navigate("/admin/dashboard");
    else if (user.rôle === "adminIT") navigate("/adminit/dashboard");
    else navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col w-1/2 gradient-hero p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="absolute rounded-full border border-white"
              style={{ width: `${(i + 1) * 80}px`, height: `${(i + 1) * 80}px`, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
          ))}
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl">RadioAI</span>
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Transcription Médicale<br />Intelligente
            </h1>
            <p className="text-white/70 text-lg leading-relaxed mb-8">
              Plateforme IA dédiée au service de radiologie. Transcription automatique, gestion des rapports et collaboration en temps réel.
            </p>
            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-3 w-fit">
              <span className="text-2xl">🩻</span>
              <div>
                <p className="text-white font-semibold text-sm">Service Radiologie</p>
                <p className="text-white/60 text-xs">Accès sécurisé & certifié</p>
              </div>
            </div>
          </motion.div>
        </div>
        <div className="mt-auto relative z-10 grid grid-cols-3 gap-4">
          {[["📋", "Rapports IA", "Transcription auto"], ["📱", "Multi-appareils", "QR Code sync"], ["🔒", "Sécurisé", "JWT + RBAC"]].map(([icon, title, sub]) => (
            <div key={title} className="bg-white/10 rounded-xl p-3">
              <div className="text-2xl mb-1">{icon}</div>
              <p className="text-white text-sm font-medium">{title}</p>
              <p className="text-white/60 text-xs">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 lg:hidden">
              <div className="w-9 h-9 rounded-xl gradient-hero flex items-center justify-center">
                <Radio className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg">RadioAI</span>
            </div>
            <button onClick={toggleTheme} className="ml-auto w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-2xl font-bold text-foreground mb-1">Connexion</h2>
            <p className="text-muted-foreground text-sm mb-8">Accédez à votre espace radiologie sécurisé</p>

            {/* Demo credentials */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 text-sm">
              <p className="font-semibold text-primary mb-2">🔑 Comptes de démonstration :</p>
              <div className="space-y-1 text-muted-foreground">
                <p><strong>Médecin :</strong> medecin@radio.fr / password</p>
                <p><strong>Admin :</strong> admin@radio.fr / password</p>
                <p><strong>Admin IT :</strong> it@radio.fr / password</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  placeholder="votre@email.fr"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all pr-11"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-destructive text-sm">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full gradient-hero text-white font-semibold py-3 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60">
                {loading ? "Connexion en cours..." : "Se connecter"}
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Pas encore de compte ?{" "}
              <Link to="/register" className="text-primary font-medium hover:underline">Créer un compte</Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}