import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Sun, Moon, Eye, EyeOff, CheckCircle, Check, X,
  Mail, Shield, User, Lock, AlertCircle, Loader2, Award, Hash,
} from "lucide-react";
import { motion } from "framer-motion";
import { registerApi, sendVerificationCodeApi, verifyEmailCodeApi, checkSeniorCodeApi } from "@/services/authService";
import { checkPassword, passwordScore, validateEmail, validatePassword } from "@/lib/validation";

type Role = "médecin" | "admin" | "adminIT";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.065, delayChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 13 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.34, ease: [0.25, 0.46, 0.45, 0.94] } },
};

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
    senior: false,
    seniorCode: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [codeSending, setCodeSending] = useState(false);
  const [codeVerifying, setCodeVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const codeInputRef = useRef<HTMLInputElement>(null);

  type CodeStatus = "idle" | "checking" | "available" | "taken";
  const [seniorCodeStatus, setSeniorCodeStatus] = useState<CodeStatus>("idle");
  const seniorDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSeniorForCheck = form.rôle === "admin" || (form.rôle === "médecin" && form.senior);

  useEffect(() => {
    if (!isSeniorForCheck || !form.seniorCode.trim()) {
      setSeniorCodeStatus("idle");
      return;
    }
    setSeniorCodeStatus("checking");
    if (seniorDebounceRef.current) clearTimeout(seniorDebounceRef.current);
    seniorDebounceRef.current = setTimeout(async () => {
      try {
        const { available } = await checkSeniorCodeApi(form.seniorCode.trim());
        setSeniorCodeStatus(available ? "available" : "taken");
      } catch {
        setSeniorCodeStatus("idle");
      }
    }, 400);
    return () => { if (seniorDebounceRef.current) clearTimeout(seniorDebounceRef.current); };
  }, [form.seniorCode, isSeniorForCheck]);

  const emailError = useMemo(() => (form.email ? validateEmail(form.email) : null), [form.email]);
  const passwordChecks = useMemo(() => checkPassword(form.password), [form.password]);
  const passwordValid = useMemo(() => validatePassword(form.password) === null, [form.password]);
  const passwordsMatch = form.confirm === "" || form.password === form.confirm;

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(n => Math.max(0, n - 1)), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

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
    const isSenior = form.rôle === "admin" || (form.rôle === "médecin" && form.senior);
    if (isSenior && !form.seniorCode.trim()) {
      setError("Veuillez saisir votre numéro / code senior.");
      return;
    }
    if (isSenior && seniorCodeStatus === "taken") {
      setError("Ce code senior est déjà utilisé. Veuillez en choisir un autre.");
      return;
    }
    if (isSenior && seniorCodeStatus === "checking") {
      setError("Vérification du code en cours, veuillez patienter.");
      return;
    }
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
        senior: isSenior,
        seniorCode: isSenior ? form.seniorCode.trim() : undefined,
      });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Success screen ─────────────────────────────────────── */
  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <motion.div
          initial={{ scale: 0.88, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.44, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center max-w-sm"
        >
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-success/10 animate-pulse" />
            <div className="relative w-24 h-24 bg-success/15 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-success" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Inscription réussie !</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            {form.rôle === "médecin"
              ? "Votre compte est en attente de validation par un administrateur."
              : "Votre compte est en attente de validation par l'Admin IT."}
            {" "}Vous recevrez une notification dès que votre accès sera activé.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="w-full gradient-hero text-white font-semibold py-3 rounded-xl"
          >
            Retour à la connexion
          </button>
        </motion.div>
      </div>
    );
  }

  const score = passwordScore(passwordChecks);
  const strengthLabel = score === 0 ? "" : score <= 2 ? "Faible" : score <= 3 ? "Moyen" : score <= 4 ? "Fort" : "Très fort";
  const strengthColor = score <= 2 ? "bg-destructive" : score <= 3 ? "bg-warning" : "bg-success";
  const isSenior = form.rôle === "admin" || (form.rôle === "médecin" && form.senior);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-40 -right-40 w-[420px] h-[420px] rounded-full opacity-[0.05] bg-primary blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[420px] h-[420px] rounded-full opacity-[0.04] bg-primary blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        {/* Header bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between mb-8"
        >
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 shrink-0">
              <img src="/logo-icon.png" alt="ReportEase" className="w-full h-full object-contain" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight">ReportEase</span>
          </Link>
          <button
            onClick={toggleTheme}
            aria-label="Basculer le thème"
            className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all duration-200"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.span variants={itemVariants} className="text-eyebrow mb-3 block">
            Portail médical sécurisé
          </motion.span>
          <motion.h2 variants={itemVariants} className="text-2xl font-bold text-foreground mb-1">
            Créer un compte
          </motion.h2>
          <motion.p variants={itemVariants} className="text-muted-foreground text-sm mb-6">
            Rejoignez le service de radiologie
          </motion.p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {/* Prénom / Nom */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Prénom</label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    value={form.prénom}
                    onChange={e => handleChange("prénom", e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 text-sm"
                    placeholder="Jean"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Nom</label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    value={form.nom}
                    onChange={e => handleChange("nom", e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 text-sm"
                    placeholder="Dupont"
                  />
                </div>
              </div>
            </motion.div>

            {/* Genre */}
            <motion.div variants={itemVariants}>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Genre <span className="text-muted-foreground font-normal">(optionnel)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: "homme", label: "👨 Homme" },
                  { value: "femme", label: "👩 Femme" },
                ] as const).map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleChange("genre", form.genre === value ? "" : value)}
                    className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-center ${
                      form.genre === value
                        ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Email + verification */}
            <motion.div variants={itemVariants}>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => handleChange("email", e.target.value)}
                    required
                    disabled={emailVerified}
                    aria-invalid={!!emailError}
                    className="w-full pl-10 pr-10 py-3 text-sm disabled:opacity-70"
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
                  className="shrink-0 px-4 rounded-xl border border-primary text-primary text-sm font-medium hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                >
                  {codeSending
                    ? <Loader2 size={14} className="animate-spin" />
                    : emailVerified
                      ? "Vérifié"
                      : resendCooldown > 0
                        ? `${resendCooldown}s`
                        : codeSent ? "Renvoyer" : "Envoyer code"}
                </button>
              </div>

              {emailError && !emailVerified && (
                <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                  <AlertCircle size={11} className="shrink-0" />
                  {emailError}
                </p>
              )}

              {codeSent && !emailVerified && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                  className="mt-3 p-3 rounded-xl border border-primary/30 bg-primary/5"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <Mail size={14} className="text-primary mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Un code à 5 chiffres a été envoyé à{" "}
                      <span className="font-semibold text-foreground">{form.email}</span>. Il expire dans 10 minutes.
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
                      className="flex-1 py-2.5 text-center text-lg font-mono tracking-[0.6em]"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyCode}
                      disabled={code.length !== 5 || codeVerifying}
                      className="shrink-0 px-4 rounded-xl gradient-hero text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      {codeVerifying && <Loader2 size={13} className="animate-spin" />}
                      {codeVerifying ? "..." : "Vérifier"}
                    </button>
                  </div>
                  {codeError && (
                    <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                      <AlertCircle size={11} className="shrink-0" />
                      {codeError}
                    </p>
                  )}
                </motion.div>
              )}

              {!codeSent && codeError && (
                <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                  <AlertCircle size={11} className="shrink-0" />
                  {codeError}
                </p>
              )}

              {emailVerified && (
                <p className="text-xs text-success mt-1.5 flex items-center gap-1">
                  <Shield size={12} /> Email vérifié
                </p>
              )}
            </motion.div>

            {/* Role */}
            <motion.div variants={itemVariants}>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Rôle</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: "médecin", label: "👨‍⚕️ Médecin", desc: "Radiologue" },
                  { value: "admin", label: "🛡️ Admin", desc: "Administrateur" },
                  { value: "adminIT", label: "💻 Admin IT", desc: "Technique" },
                ] as const).map(({ value, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleChange("rôle", value)}
                    className={`px-3 py-3 rounded-xl border text-sm font-medium transition-all text-center ${
                      form.rôle === value
                        ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    <div>{label}</div>
                    <div className="text-xs mt-0.5 opacity-70">{desc}</div>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Senior status — médecin chooses, admin is senior by default, adminIT excluded */}
            {form.rôle !== "adminIT" && (
              <motion.div variants={itemVariants}>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Statut senior</label>
                {form.rôle === "admin" ? (
                  <div className="flex items-center gap-2 px-3.5 py-3 rounded-xl border border-primary/30 bg-primary/5 text-sm text-foreground">
                    <Award size={15} className="text-primary shrink-0" />
                    <span>En tant qu'administrateur, vous êtes senior par défaut.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: true,  label: "Oui, je suis senior" },
                      { value: false, label: "Non" },
                    ] as const).map(({ value, label }) => (
                      <button
                        key={String(value)}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, senior: value, seniorCode: value ? f.seniorCode : "" }))}
                        className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-center ${
                          form.senior === value
                            ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                            : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Senior code — required whenever the account is senior */}
            {isSeniorForCheck && (
              <motion.div variants={itemVariants}>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Numéro / code senior</label>
                <div className="relative">
                  <Hash size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    value={form.seniorCode}
                    onChange={e => handleChange("seniorCode", e.target.value.replace(/\D/g, ""))}
                    required
                    inputMode="numeric"
                    className={`w-full pl-10 pr-10 py-3 text-sm rounded-xl border bg-background focus:outline-none focus:ring-2 transition-colors ${
                      seniorCodeStatus === "taken"
                        ? "border-destructive/60 focus:ring-destructive/25"
                        : seniorCodeStatus === "available"
                        ? "border-success/60 focus:ring-success/25"
                        : "border-border focus:ring-primary/30"
                    }`}
                    placeholder="Ex : 12345"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    {seniorCodeStatus === "checking"  && <Loader2 size={14} className="text-muted-foreground animate-spin" />}
                    {seniorCodeStatus === "available" && <Check   size={14} className="text-success" />}
                    {seniorCodeStatus === "taken"     && <X       size={14} className="text-destructive" />}
                  </span>
                </div>
                {seniorCodeStatus === "available" && (
                  <p className="text-xs text-success mt-1.5 flex items-center gap-1"><Check size={11} />Code disponible.</p>
                )}
                {seniorCodeStatus === "taken" && (
                  <p className="text-xs text-destructive mt-1.5 flex items-center gap-1"><X size={11} />Ce code est déjà utilisé.</p>
                )}
                {(seniorCodeStatus === "idle" || seniorCodeStatus === "checking") && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Ce code vous identifiera auprès des médecins travaillant sous votre supervision.
                  </p>
                )}
              </motion.div>
            )}

            {/* Password */}
            <motion.div variants={itemVariants}>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Mot de passe</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={e => handleChange("password", e.target.value)}
                  required
                  autoComplete="new-password"
                  aria-invalid={form.password !== "" && !passwordValid}
                  className="w-full pl-10 pr-11 py-3 text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => setShowPass(v => !v)}
                  aria-label={showPass ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {form.password && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${strengthColor} transition-all duration-300`}
                        style={{ width: `${(score / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-muted-foreground w-16 text-right">
                      {strengthLabel}
                    </span>
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
            </motion.div>

            {/* Confirm password */}
            <motion.div variants={itemVariants}>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Confirmation mot de passe
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="password"
                  value={form.confirm}
                  onChange={e => handleChange("confirm", e.target.value)}
                  required
                  aria-invalid={!passwordsMatch}
                  className="w-full pl-10 pr-4 py-3 text-sm"
                  placeholder="••••••••"
                />
              </div>
              {!passwordsMatch && (
                <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                  <AlertCircle size={11} className="shrink-0" />
                  Les mots de passe ne correspondent pas.
                </p>
              )}
            </motion.div>

            {/* Global error */}
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
              disabled={loading || !emailVerified || !passwordValid || !passwordsMatch}
              className="w-full gradient-hero text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Création en cours...</span>
                </>
              ) : (
                "Créer mon compte"
              )}
            </motion.button>
          </form>

          <motion.p variants={itemVariants} className="text-center text-sm text-muted-foreground mt-6">
            Déjà un compte ?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Se connecter
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
