import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Sun, Moon, Eye, EyeOff } from "lucide-react";
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
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8 sm:py-12">
      <button
        onClick={toggleTheme}
        aria-label="Basculer le thème"
        className="fixed top-4 right-4 z-10 w-9 h-9 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-5xl bg-card rounded-3xl overflow-hidden grid lg:grid-cols-2"
        style={{ boxShadow: "var(--shadow-xl)" }}
      >
        {/* Left — clean photo */}
        <div className="hidden lg:block relative min-h-[560px]">
          <img
            src={hospitalImg}
            alt="Hôpital Fattouma-Bourguiba"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D1119]/45 via-transparent to-transparent" />

          <Link to="/" className="absolute top-6 left-6 flex items-center gap-2.5 z-10">
            <div className="w-10 h-10 rounded-xl overflow-hidden ring-1 ring-white/30">
              <img src="/ReportEase.png" alt="ReportEase" className="w-full h-full object-cover" />
            </div>
            <span className="text-white font-bold text-base tracking-tight">ReportEase</span>
          </Link>
        </div>

        {/* Right — form */}
        <div className="px-6 sm:px-10 py-10 sm:py-12 flex flex-col justify-center">
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl overflow-hidden ring-1 ring-border">
              <img src="/ReportEase.png" alt="ReportEase" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-lg text-foreground">ReportEase</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">Connexion</h2>
          <p className="text-muted-foreground text-sm mb-7">
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
                className="w-full px-4 py-3 text-sm"
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
                  className="w-full px-4 py-3 text-sm pr-11"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end -mt-1">
              <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                Mot de passe oublié ?
              </Link>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-destructive text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full gradient-hero text-white font-semibold py-3 rounded-xl"
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
        </div>
      </motion.div>
    </div>
  );
}
