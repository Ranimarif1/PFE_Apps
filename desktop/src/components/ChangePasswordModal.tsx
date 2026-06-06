import { useState } from "react";
import { Lock, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { changePasswordApi } from "@/services/authService";
import { useAuth } from "@/contexts/AuthContext";
import { getMeApi } from "@/services/authService";

export function ChangePasswordModal() {
  const { user, updateUser } = useAuth();
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [showConf, setShowConf]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  if (!user?.mustChangePassword) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Le mot de passe doit contenir au moins 8 caractères."); return; }
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas."); return; }
    setLoading(true);
    try {
      await changePasswordApi(password);
      const updated = await getMeApi();
      updateUser(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors du changement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border border-border shadow-xl p-6 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Changement de mot de passe requis</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Un mot de passe temporaire vous a été attribué. Définissez un nouveau mot de passe pour continuer.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New password */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Nouveau mot de passe</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoFocus
                placeholder="••••••••"
                className="w-full pl-10 pr-11 py-2.5 text-sm rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button type="button" tabIndex={-1} onMouseDown={e => e.preventDefault()}
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Minimum 8 caractères.</p>
          </div>

          {/* Confirm */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Confirmer le mot de passe</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type={showConf ? "text" : "password"}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-11 py-2.5 text-sm rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button type="button" tabIndex={-1} onMouseDown={e => e.preventDefault()}
                onClick={() => setShowConf(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showConf ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl gradient-hero text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <><Loader2 size={14} className="animate-spin" /> Enregistrement…</> : "Définir le nouveau mot de passe"}
          </button>
        </form>
      </div>
    </div>
  );
}
