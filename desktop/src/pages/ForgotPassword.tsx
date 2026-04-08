import { useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { Sun, Moon, ArrowLeft, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { forgotPasswordApi } from "@/services/authService";

export default function ForgotPassword() {
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await forgotPasswordApi(email);
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

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
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Email envoyé</h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                Si l'adresse <strong>{email}</strong> est associée à un compte, vous recevrez un lien de réinitialisation valable <strong>1 heure</strong>.
              </p>
              <p className="text-xs text-muted-foreground mb-6">Pensez à vérifier vos spams.</p>
              <Link to="/login" className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline">
                <ArrowLeft size={14} /> Retour à la connexion
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-foreground mb-1">Mot de passe oublié</h2>
              <p className="text-muted-foreground text-sm mb-8">
                Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="votre@email.com"
                  />
                </div>

                {error && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-destructive text-sm">{error}</div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full gradient-hero text-white font-semibold py-3 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60">
                  {loading ? "Envoi en cours…" : "Envoyer le lien"}
                </button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                <Link to="/login" className="inline-flex items-center gap-1.5 text-primary font-medium hover:underline">
                  <ArrowLeft size={14} /> Retour à la connexion
                </Link>
              </p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
