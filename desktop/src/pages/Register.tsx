import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { Sun, Moon, Eye, EyeOff, CheckCircle, Check, X, Mail, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { registerApi, sendVerificationCodeApi, verifyEmailCodeApi } from "@/services/authService";
import { checkPassword, passwordScore, validateEmail, validatePassword } from "@/lib/validation";

type Role = "médecin" | "admin" | "adminIT";

export default function Register() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nom: "",
    prénom: "",
    email: "",
    password: "",
    confirm: "",
    rôle: "médecin" as Role,
    genre: "" as "homme" | "femme" | "",
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Email verification state
  const [codeSending, setCodeSending] = useState(false);
  const [codeVerifying, setCodeVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const codeInputRef = useRef<HTMLInputElement>(null);

  const emailError = useMemo(() => (form.email ? validateEmail(form.email) : null), [form.email]);
  const passwordChecks = useMemo(() => checkPassword(form.password), [form.password]);
  const passwordValid = useMemo(() => validatePassword(form.password) === null, [form.password]);
  const passwordsMatch = form.confirm === "" || form.password === form.confirm;

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(n => Math.max(0, n - 1)), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Reset verification if the email is changed after a code was sent
  useEffect(() => {
    if (codeSent || emailVerified) {
      setCodeSent(false);
      setEmailVerified(false);
      setCode("");
      setCodeError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.email]);

  const handleChange = (field: keyof typeof form, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  const handleSendCode = async () => {
    setError("");
    setCodeError("");
    const err = validateEmail(form.email);
    if (err) { setCodeError(err); return; }
    setCodeSending(true);
    try {
      await sendVerificationCodeApi(form.email.trim().toLowerCase());
      setCodeSent(true);
      setResendCooldown(30);
      setTimeout(() => codeInputRef.current?.focus(), 50);
    } catch (err: unknown) {
      setCodeError(err instanceof Error ? err.message : "Erreur lors de l'envoi du code.");
    } finally {
      setCodeSending(false);
    }
  };

  const handleVerifyCode = async () => {
    setCodeError("");
    if (code.length !== 5) { setCodeError("Le code doit comporter 5 chiffres."); return; }
    setCodeVerifying(true);
    try {
      await verifyEmailCodeApi(form.email.trim().toLowerCase(), code);
      setEmailVerified(true);
    } catch (err: unknown) {
      setCodeError(err instanceof Error ? err.message : "Code invalide.");
    } finally {
      setCodeVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (emailError) { setError(emailError); return; }
    if (!emailVerified) { setError("Veuillez vérifier votre email avant de créer le compte."); return; }
    const pwErr = validatePassword(form.password);
    if (pwErr) { setError(pwErr); return; }
    if (form.password !== form.confirm) { setError("Les mots de passe ne correspondent pas."); return; }

    setLoading(true);
    try {
      const roleMap: Record<Role, string> = { médecin: "doctor", admin: "admin", adminIT: "adminIT" };
      await registerApi({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: roleMap[form.rôle],
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

  const score = passwordScore(passwordChecks);
  const strengthLabel = score === 0 ? "" : score <= 2 ? "Faible" : score <= 3 ? "Moyen" : score <= 4 ? "Fort" : "Très fort";
  const strengthColor = score <= 2 ? "bg-destructive" : score <= 3 ? "bg-warning" : "bg-success";

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

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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

            {/* ── Email + verification ─────────────────────────────── */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => handleChange("email", e.target.value)}
                    required
                    disabled={emailVerified}
                    aria-invalid={!!emailError}
                    className={`w-full px-4 py-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 pr-10 transition-colors disabled:opacity-70 ${
                      emailError
                        ? "border-destructive/60 focus:ring-destructive/25"
                        : emailVerified
                          ? "border-success/60 focus:ring-success/25"
                          : "border-border focus:ring-primary/30"
                    }`}
                    placeholder="jean.dupont@hopital.fr"
                  />
                  {emailVerified && (
                    <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-success" size={16} />
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={!!emailError || !form.email || codeSending || emailVerified || resendCooldown > 0}
                  className="shrink-0 px-4 rounded-xl border border-primary text-primary text-sm font-medium hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {codeSending
                    ? "Envoi..."
                    : emailVerified
                      ? "Vérifié"
                      : resendCooldown > 0
                        ? `${resendCooldown}s`
                        : codeSent ? "Renvoyer" : "Envoyer code"}
                </button>
              </div>
              {emailError && !emailVerified && (
                <p className="text-xs text-destructive mt-1.5">{emailError}</p>
              )}

              {codeSent && !emailVerified && (
                <div className="mt-3 p-3 rounded-xl border border-primary/30 bg-primary/5">
                  <div className="flex items-start gap-2 mb-2">
                    <Mail size={14} className="text-primary mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Un code à 5 chiffres a été envoyé à <span className="font-semibold text-foreground">{form.email}</span>. Il expire dans 10 minutes.
                    </p>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <input
                      ref={codeInputRef}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={5}
                      value={code}
                      onChange={e => {
                        setCodeError("");
                        setCode(e.target.value.replace(/\D/g, "").slice(0, 5));
                      }}
                      placeholder="• • • • •"
                      className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-center text-lg font-mono tracking-[0.6em] focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyCode}
                      disabled={code.length !== 5 || codeVerifying}
                      className="shrink-0 px-4 rounded-xl gradient-hero text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {codeVerifying ? "..." : "Vérifier"}
                    </button>
                  </div>
                  {codeError && <p className="text-xs text-destructive mt-1.5">{codeError}</p>}
                </div>
              )}

              {!codeSent && codeError && (
                <p className="text-xs text-destructive mt-1.5">{codeError}</p>
              )}

              {emailVerified && (
                <p className="text-xs text-success mt-1.5 flex items-center gap-1">
                  <Shield size={12} /> Email vérifié
                </p>
              )}
            </div>

            {/* ── Role ─────────────────────────────────────────────── */}
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

            {/* ── Password with strength meter ─────────────────────── */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={e => handleChange("password", e.target.value)}
                  required
                  autoComplete="new-password"
                  aria-invalid={form.password !== "" && !passwordValid}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 pr-11"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => setShowPass(v => !v)}
                  aria-label={showPass ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {form.password && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${strengthColor} transition-all`} style={{ width: `${(score / 5) * 100}%` }} />
                    </div>
                    <span className="text-[11px] font-semibold text-muted-foreground w-16 text-right">{strengthLabel}</span>
                  </div>
                  <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                    {[
                      { ok: passwordChecks.length,  label: "Min. 8 caractères" },
                      { ok: passwordChecks.upper,   label: "Une majuscule" },
                      { ok: passwordChecks.lower,   label: "Une minuscule" },
                      { ok: passwordChecks.digit,   label: "Un chiffre" },
                      { ok: passwordChecks.special, label: "Un caractère spécial" },
                    ].map(r => (
                      <li key={r.label} className={`flex items-center gap-1 ${r.ok ? "text-success" : "text-muted-foreground"}`}>
                        {r.ok ? <Check size={11} /> : <X size={11} />}
                        {r.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Confirmation mot de passe</label>
              <input
                type="password"
                value={form.confirm}
                onChange={e => handleChange("confirm", e.target.value)}
                required
                aria-invalid={!passwordsMatch}
                className={`w-full px-4 py-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 ${
                  !passwordsMatch
                    ? "border-destructive/60 focus:ring-destructive/25"
                    : "border-border focus:ring-primary/30"
                }`}
                placeholder="••••••••"
              />
              {!passwordsMatch && (
                <p className="text-xs text-destructive mt-1.5">Les mots de passe ne correspondent pas.</p>
              )}
            </div>

            {error && <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-destructive text-sm">{error}</div>}

            <button
              type="submit"
              disabled={loading || !emailVerified || !passwordValid || !passwordsMatch}
              className="w-full gradient-hero text-white font-semibold py-3 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
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
