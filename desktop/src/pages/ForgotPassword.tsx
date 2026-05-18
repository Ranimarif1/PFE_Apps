import { useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { Sun, Moon, Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { forgotPasswordApi } from "@/services/authService";
import hospitalImg from "@/assets/téléchargement.jpeg";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.36, ease: [0.25, 0.46, 0.45, 0.94] } },
};

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
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8 sm:py-12">
      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-40 -left-40 w-[480px] h-[480px] rounded-full opacity-[0.055] bg-primary blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[480px] h-[480px] rounded-full opacity-[0.045] bg-primary blur-3xl" />
      </div>

      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.25 }}
        onClick={toggleTheme}
        aria-label="Basculer le thème"
        className="fixed top-4 right-4 z-10 w-9 h-9 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all duration-200"
      >
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full max-w-5xl bg-card rounded-3xl overflow-hidden grid lg:grid-cols-2"
        style={{ boxShadow: "var(--shadow-xl)" }}
      >
        {/* Left — photo */}
        <div className="hidden lg:block relative min-h-[520px]">
          <img
            src={hospitalImg}
            alt="Hôpital Fattouma-Bourguiba"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0D1321]/25 via-transparent to-[#0D1321]/55" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D1321]/85 via-[#0D1321]/10 to-transparent" />

          <Link to="/" className="absolute top-6 left-6 flex items-center gap-3 z-10 group">
            <div className="w-11 h-11 shrink-0">
              <img src="/logo-icon.png" alt="ReportEase" className="w-full h-full object-contain" />
            </div>
            <span className="text-white font-extrabold text-2xl tracking-tight drop-shadow">
              ReportEase
            </span>
          </Link>

          <div className="absolute bottom-0 left-0 right-0 p-8 z-10">
            <p className="text-white/55 text-[10px] font-bold uppercase tracking-[0.12em] mb-2.5">
              Hôpital Fattouma-Bourguiba
            </p>
            <h3 className="text-white text-[1.6rem] font-bold leading-tight mb-2.5">
              Imagerie médicale,<br />simplifiée.
            </h3>
            <p className="text-white/60 text-sm leading-relaxed max-w-[260px]">
              Créez, dictez et partagez vos comptes-rendus radiologiques en quelques secondes.
            </p>
            <div className="flex items-center gap-1.5 mt-5">
              <span className="w-7 h-[3px] rounded-full bg-white/80" />
              <span className="w-[6px] h-[3px] rounded-full bg-white/30" />
              <span className="w-[6px] h-[3px] rounded-full bg-white/30" />
            </div>
          </div>
        </div>

        {/* Right — form */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="px-6 sm:px-10 py-10 sm:py-12 flex flex-col justify-center"
        >
          <motion.div variants={itemVariants} className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-11 h-11 shrink-0">
              <img src="/logo-icon.png" alt="ReportEase" className="w-full h-full object-contain" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-foreground">
              ReportEase
            </span>
          </motion.div>

          {sent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Email envoyé</h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-2">
                Si l'adresse <strong className="text-foreground">{email}</strong> est associée à un compte,
                vous recevrez un lien de réinitialisation valable <strong className="text-foreground">1 heure</strong>.
              </p>
              <p className="text-xs text-muted-foreground mb-8">Pensez à vérifier vos spams.</p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline"
              >
                <ArrowLeft size={14} /> Retour à la connexion
              </Link>
            </motion.div>
          ) : (
            <>
              <motion.span variants={itemVariants} className="text-eyebrow mb-3 block">
                Portail médical sécurisé
              </motion.span>

              <motion.h2 variants={itemVariants} className="text-2xl font-bold text-foreground mb-1">
                Mot de passe oublié
              </motion.h2>
              <motion.p variants={itemVariants} className="text-muted-foreground text-sm mb-7">
                Entrez votre adresse email et nous vous enverrons un lien de réinitialisation.
              </motion.p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <motion.div variants={itemVariants}>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 text-sm"
                      placeholder="votre@email.com"
                    />
                  </div>
                </motion.div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22 }}
                    className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-destructive text-sm flex items-start gap-2.5"
                  >
                    <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <motion.button
                  variants={itemVariants}
                  type="submit"
                  disabled={loading}
                  className="w-full gradient-hero text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Envoi en cours…</span>
                    </>
                  ) : (
                    "Envoyer le lien"
                  )}
                </motion.button>
              </form>

              <motion.p variants={itemVariants} className="text-center text-sm text-muted-foreground mt-6">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-primary font-medium hover:underline"
                >
                  <ArrowLeft size={14} /> Retour à la connexion
                </Link>
              </motion.p>
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
