import { useState } from "react";
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { forgotPasswordApi } from "@/services/authService";

interface ForgotPasswordFormProps {
  onSwitchToLogin?: () => void;
}

export function ForgotPasswordForm({ onSwitchToLogin }: ForgotPasswordFormProps) {
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

  if (sent) {
    return (
      <div className="text-center py-4">
        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-8 h-8 text-success" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Email envoyé</h2>
        <p className="text-muted-foreground text-sm leading-relaxed mb-2">
          Si l'adresse <strong className="text-foreground">{email}</strong> est associée à un compte,
          vous recevrez un lien de réinitialisation valable <strong className="text-foreground">1 heure</strong>.
        </p>
        <p className="text-xs text-muted-foreground mb-8">Pensez à vérifier vos spams.</p>
        {onSwitchToLogin && (
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline"
          >
            <ArrowLeft size={14} /> Retour à la connexion
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-1">Mot de passe oublié</h2>
      <p className="text-muted-foreground text-sm mb-7">
        Entrez votre adresse email et nous vous enverrons un lien de réinitialisation.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
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
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-destructive text-sm flex items-start gap-2.5">
            <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
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
        </button>
      </form>

      {onSwitchToLogin && (
        <p className="text-center text-sm text-muted-foreground mt-6">
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="inline-flex items-center gap-1.5 text-primary font-medium hover:underline"
          >
            <ArrowLeft size={14} /> Retour à la connexion
          </button>
        </p>
      )}
    </div>
  );
}
