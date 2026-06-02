import { useMemo, useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, CheckCircle, Check, X, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { registerApi, checkSeniorCodeApi } from "@/services/authService";
import { checkPassword, passwordScore, validateEmail, validatePassword } from "@/lib/validation";

type Role = "médecin" | "admin" | "adminIT";

interface RegisterFormProps {
  onSwitchToLogin?: () => void;
  /** Called from the success screen's CTA. Default: navigate to /login. */
  onAfterSuccess?: () => void;
  hideHeader?: boolean;
}

export function RegisterForm({ onSwitchToLogin, onAfterSuccess, hideHeader }: RegisterFormProps) {
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

  type CodeStatus = "idle" | "checking" | "available" | "taken";
  const [codeStatus, setCodeStatus] = useState<CodeStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSeniorForCheck = form.rôle === "admin" || (form.rôle === "médecin" && form.senior);

  useEffect(() => {
    if (!isSeniorForCheck || !form.seniorCode.trim()) {
      setCodeStatus("idle");
      return;
    }
    setCodeStatus("checking");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const { available } = await checkSeniorCodeApi(form.seniorCode.trim());
        setCodeStatus(available ? "available" : "taken");
      } catch {
        setCodeStatus("idle");
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [form.seniorCode, isSeniorForCheck]);

  const emailError = useMemo(() => (form.email ? validateEmail(form.email) : null), [form.email]);
  const passwordChecks = useMemo(() => checkPassword(form.password), [form.password]);
  const passwordValid = useMemo(() => validatePassword(form.password) === null, [form.password]);
  const passwordsMatch = form.confirm === "" || form.password === form.confirm;

  const handleChange = (field: keyof typeof form, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (emailError) { setError(emailError); return; }
    const pwErr = validatePassword(form.password);
    if (pwErr) { setError(pwErr); return; }
    if (form.password !== form.confirm) { setError("Les mots de passe ne correspondent pas."); return; }
    const isSenior = form.rôle === "admin" || (form.rôle === "médecin" && form.senior);
    if (isSenior && !form.seniorCode.trim()) {
      setError("Veuillez saisir votre code senior.");
      return;
    }
    if (isSenior && codeStatus === "taken") {
      setError("Ce code senior est déjà utilisé. Veuillez en choisir un autre.");
      return;
    }
    if (isSenior && codeStatus === "checking") {
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

  if (success) {
    return (
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
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
        <button
          onClick={() => {
            if (onAfterSuccess) onAfterSuccess();
            else window.location.assign("/login");
          }}
          className="w-full gradient-hero text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-all"
        >
          Retour à la connexion
        </button>
      </motion.div>
    );
  }

  const score = passwordScore(passwordChecks);
  const strengthLabel = score === 0 ? "" : score <= 2 ? "Faible" : score <= 3 ? "Moyen" : score <= 4 ? "Fort" : "Très fort";
  const strengthColor = score <= 2 ? "bg-destructive" : score <= 3 ? "bg-warning" : "bg-success";

  return (
    <div>
      {!hideHeader && (
        <h2 className="text-2xl font-bold text-foreground mb-6">Inscription</h2>
      )}

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
              { value: "homme", label: "Homme" },
              { value: "femme", label: "Femme" },
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
          <div className="relative">
            <input
              type="email"
              value={form.email}
              onChange={e => handleChange("email", e.target.value)}
              required
              aria-invalid={!!emailError}
              className={`w-full px-4 py-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 pr-10 transition-colors ${
                emailError
                  ? "border-destructive/60 focus:ring-destructive/25"
                  : "border-border focus:ring-primary/30"
              }`}
              placeholder="jean.dupont@hopital.fr"
            />
          </div>
          {emailError && (
            <p className="text-xs text-destructive mt-1.5">{emailError}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Rôle</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: "médecin", label: "Médecin", desc: "Radiologue" },
              { value: "admin", label: "Admin", desc: "Administrateur" },
              { value: "adminIT", label: "Admin IT", desc: "Technique" },
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

        {/* Senior status — médecin chooses, admin senior by default, adminIT excluded */}
        {form.rôle !== "adminIT" && (
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Statut senior</label>
            {form.rôle === "admin" ? (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-primary/30 bg-primary/5 text-sm text-foreground">
                <Shield size={14} className="text-primary shrink-0" />
                <span>En tant qu'administrateur, vous êtes senior par défaut.</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: true,  label: "Oui, je suis senior" },
                  { value: false, label: "Non" },
                ] as const).map(({ value, label }) => (
                  <button key={String(value)} type="button"
                    onClick={() => setForm(f => ({ ...f, senior: value, seniorCode: value ? f.seniorCode : "" }))}
                    className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-center ${
                      form.senior === value
                        ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40"
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Senior code — required whenever the account is senior */}
        {isSeniorForCheck && (
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Numéro / code senior</label>
            <div className="relative">
              <input
                value={form.seniorCode}
                onChange={e => handleChange("seniorCode", e.target.value.replace(/\D/g, ""))}
                required
                inputMode="numeric"
                className={`w-full px-4 py-3 pr-10 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 transition-colors ${
                  codeStatus === "taken"
                    ? "border-destructive/60 focus:ring-destructive/25"
                    : codeStatus === "available"
                    ? "border-success/60 focus:ring-success/25"
                    : "border-border focus:ring-primary/30"
                }`}
                placeholder="Ex : 12345"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                {codeStatus === "checking" && <Loader2 size={14} className="text-muted-foreground animate-spin" />}
                {codeStatus === "available" && <Check size={14} className="text-success" />}
                {codeStatus === "taken"     && <X size={14} className="text-destructive" />}
              </span>
            </div>
            {codeStatus === "available" && (
              <p className="text-xs text-success mt-1.5 flex items-center gap-1"><Check size={11} />Code disponible.</p>
            )}
            {codeStatus === "taken" && (
              <p className="text-xs text-destructive mt-1.5 flex items-center gap-1"><X size={11} />Ce code est déjà utilisé.</p>
            )}
            {codeStatus === "idle" && (
              <p className="text-xs text-muted-foreground mt-1.5">
                Ce code vous identifiera auprès des médecins travaillant sous votre supervision.
              </p>
            )}
          </div>
        )}

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
          disabled={loading}
          className="w-full gradient-hero text-white font-semibold py-3 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Inscription en cours..." : "S'inscrire"}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Déjà un compte ?{" "}
        {onSwitchToLogin ? (
          <button type="button" onClick={onSwitchToLogin} className="text-primary font-medium hover:underline">
            Se connecter
          </button>
        ) : (
          <Link to="/login" className="text-primary font-medium hover:underline">Se connecter</Link>
        )}
      </p>
    </div>
  );
}
