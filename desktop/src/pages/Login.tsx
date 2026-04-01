import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Radio, Sun, Moon, Eye, EyeOff, Mic, ShieldCheck, Activity } from "lucide-react";
import { motion } from "framer-motion";
import hospitalImg from "@/assets/téléchargement.jpeg";

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
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Left panel — Hospital image + overlay */}
      <div className="hidden lg:flex flex-col w-[55%] relative overflow-hidden">
        <img
          src={hospitalImg}
          alt="Hôpital Fatouma Bourguiba Monastir"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/85 via-primary/70 to-blue-900/80" />

        <div className="absolute inset-0 opacity-[0.07]">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border-2 border-white"
              style={{
                width: `${(i + 1) * 120}px`,
                height: `${(i + 1) * 120}px`,
                bottom: "-10%",
                right: "-5%",
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col h-full p-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <Radio className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-white font-bold text-xl tracking-tight">RadioAI</span>
              <p className="text-white/60 text-[11px] -mt-0.5">Speech-to-Text Platform</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center max-w-lg">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6 border border-white/10">
                <span className="text-lg">🩻</span>
                <span className="text-white/90 text-sm font-medium">Service Radiologie</span>
              </div>

              <h1 className="text-[2.6rem] font-extrabold text-white leading-[1.15] mb-4 tracking-tight">
                Transcription<br />
                Médicale<br />
                <span className="text-blue-200">Intelligente</span>
              </h1>

              <p className="text-white/65 text-base leading-relaxed mb-8 max-w-sm">
                Plateforme IA dédiée au service de radiologie de l'Hôpital Fattouma-Bourguiba de Monastir. Dictée vocale, transcription automatique et gestion des comptes rendus.
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="grid grid-cols-3 gap-3"
          >
            {[
              { icon: Mic, title: "Dictée Vocale", desc: "Transcription IA temps réel" },
              { icon: Activity, title: "Multi-appareils", desc: "QR Code sync smartphone" },
              { icon: ShieldCheck, title: "Sécurisé", desc: "JWT + RBAC certifié" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <Icon className="w-5 h-5 text-blue-200 mb-2" />
                <p className="text-white text-sm font-semibold">{title}</p>
                <p className="text-white/50 text-xs">{desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right panel — Login form */}
      <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto p-6 sm:p-10">
        <div className="w-full max-w-[420px]">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-2.5 lg:hidden">
              <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
                <Radio className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-lg text-foreground">RadioAI</span>
                <p className="text-muted-foreground text-[11px] -mt-0.5">Hôpital Fattouma-Bourguiba</p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="ml-auto w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="hidden lg:flex items-center gap-2 mb-6">
              <span className="text-xl">🏥</span>
              <p className="text-sm text-muted-foreground font-medium">
                Hôpital Fattouma-Bourguiba de Monastir
              </p>
            </div>

            <h2 className="text-2xl font-bold text-foreground mb-1">Connexion</h2>
            <p className="text-muted-foreground text-sm mb-8">
              Accédez à votre espace radiologie sécurisé
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-muted-foreground"
                  placeholder="votre@email.com"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all pr-11 placeholder:text-muted-foreground"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-destructive text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full gradient-hero text-white font-semibold py-3 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {loading ? "Connexion en cours..." : "Se connecter"}
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Pas encore de compte ?{" "}
              <Link to="/register" className="text-primary font-medium hover:underline">
                Créer un compte
              </Link>
            </p>

            <div className="mt-10 pt-6 border-t border-border text-center">
              <p className="text-xs text-muted-foreground">
                Service Radiologie — CHU Fattouma-Bourguiba de Monastir
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
