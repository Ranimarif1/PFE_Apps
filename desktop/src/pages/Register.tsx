import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { Sun, Moon, Eye, EyeOff, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { registerApi } from "@/services/authService";

export default function Register() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nom: "", prénom: "", email: "", password: "", confirm: "", rôle: "médecin" as "médecin" | "admin" | "adminIT", genre: "" as "homme" | "femme" | "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError("Les mots de passe ne correspondent pas."); return; }
    if (form.password.length < 6) { setError("Le mot de passe doit contenir au moins 6 caractères."); return; }
    setLoading(true);
    setError("");
    try {
      const roleMap: Record<string, string> = { médecin: "doctor", admin: "admin", adminIT: "adminIT" };
      await registerApi({
        email: form.email,
        password: form.password,
        role: roleMap[form.rôle] ?? "doctor",
        nom: form.nom,
        prenom: form.prénom,
        genre: form.genre,
      });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-sm">
          <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Inscription réussie !</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            {form.rôle === "médecin"
              ? "Votre compte est en attente de validation par un administrateur."
              : "Votre compte est en attente de validation par l'Admin IT."}
            {" "}Vous recevrez une notification dès que votre accès sera activé.
          </p>
          <button onClick={() => navigate("/login")}
            className="w-full gradient-hero text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-all">
            Retour à la connexion
          </button>
        </motion.div>
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
          <h2 className="text-2xl font-bold text-foreground mb-1">Créer un compte</h2>
          <p className="text-muted-foreground text-sm mb-2">Rejoignez le service de radiologie</p>


          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Prénom</label>
                <input value={form.prénom} onChange={e => handleChange("prénom", e.target.value)} required
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Jean" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Nom</label>
                <input value={form.nom} onChange={e => handleChange("nom", e.target.value)} required
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Dupont" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Genre <span className="text-muted-foreground font-normal">(optionnel)</span></label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: "homme", label: "👨 Homme" },
                  { value: "femme", label: "👩 Femme" },
                ] as const).map(({ value, label }) => (
                  <button key={value} type="button" onClick={() => handleChange("genre", form.genre === value ? "" : value)}
                    className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-center ${
                      form.genre === value
                        ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40"
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
              <input type="email" value={form.email} onChange={e => handleChange("email", e.target.value)} required
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="jean.dupont@hopital.fr" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Rôle</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: "médecin", label: "👨‍⚕️ Médecin", desc: "Radiologue" },
                  { value: "admin", label: "🛡️ Admin", desc: "Administrateur" },
                  { value: "adminIT", label: "💻 Admin IT", desc: "Technique" },
                ] as const).map(({ value, label, desc }) => (
                  <button key={value} type="button" onClick={() => handleChange("rôle", value)}
                    className={`px-3 py-3 rounded-xl border text-sm font-medium transition-all text-center ${
                      form.rôle === value
                        ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40"
                    }`}>
                    <div>{label}</div>
                    <div className="text-xs mt-0.5 opacity-70">{desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Mot de passe</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} value={form.password} onChange={e => handleChange("password", e.target.value)} required
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 pr-11" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Confirmation mot de passe</label>
              <input type="password" value={form.confirm} onChange={e => handleChange("confirm", e.target.value)} required
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="••••••••" />
            </div>

            {error && <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-destructive text-sm">{error}</div>}

            <button type="submit" disabled={loading}
              className="w-full gradient-hero text-white font-semibold py-3 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60">
              {loading ? "Création en cours..." : "Créer mon compte"}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Déjà un compte ?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">Se connecter</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
  