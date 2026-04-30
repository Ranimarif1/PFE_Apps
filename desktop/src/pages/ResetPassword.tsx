import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { Sun, Moon, Eye, EyeOff, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { resetPasswordApi } from "@/services/authService";

export default function ResetPassword() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas."); return; }
    if (password.length < 6) { setError("Le mot de passe doit contenir au moins 6 caractères."); return; }
    if (!token) { setError("Lien invalide. Veuillez refaire une demande."); return; }

    setLoading(true);
    try {
      await resetPasswordApi(token, password);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <p className="text-destructive font-medium mb-4">Lien de réinitialisation invalide ou manquant.</p>
          <Link to="/forgot-password" className="text-primary text-sm font-medium hover:underline">
            Refaire une demande
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl overflow-hidden">
              <img src="/ReportEase.png" alt="ReportEase" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-lg">ReportEase</span>
          </div>
          <button onClick={toggleTheme} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Mot de passe modifié</h2>
              <p className="text-muted-foreground text-sm mb-4">
                Votre mot de passe a été réinitialisé avec succès. Redirection vers la connexion…
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-foreground mb-1">Nouveau mot de passe</h2>
              <p className="text-muted-foreground text-sm mb-8">
                Choisissez un nouveau mot de passe pour votre compte.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Nouveau mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 pr-11"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => setShowPass(v => !v)}
                      aria-label={showPass ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Confirmer le mot de passe</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-destructive text-sm">{error}</div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full gradient-hero text-white font-semibold py-3 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60">
                  {loading ? "Enregistrement…" : "Réinitialiser le mot de passe"}
                </button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                <Link to="/login" className="text-primary font-medium hover:underline">
                  Retour à la connexion
                </Link>
              </p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
