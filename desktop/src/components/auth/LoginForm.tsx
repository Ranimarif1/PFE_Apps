import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff } from "lucide-react";

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
  onForgotPassword?: () => void;
  hideHeader?: boolean;
}

export function LoginForm({ onSuccess, onSwitchToRegister, onForgotPassword, hideHeader }: LoginFormProps) {
  const { login } = useAuth();
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
    onSuccess?.();
    const user = JSON.parse(localStorage.getItem("auth_user") || "{}");
    const dest = user.rôle === "admin" ? "/admin/dashboard"
      : user.rôle === "adminIT" ? "/adminit/dashboard"
      : "/dashboard";
    navigate(dest);
  };

  return (
    <div>
      {!hideHeader && (
        <>
          <h2 className="text-2xl font-bold text-foreground mb-1">Connexion</h2>
          <p className="text-muted-foreground text-sm mb-7">
            Accédez à votre espace radiologie sécurisé
          </p>
        </>
      )}

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
          {onForgotPassword ? (
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Mot de passe oublié ?
            </button>
          ) : (
            <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              Mot de passe oublié ?
            </Link>
          )}
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
        {onSwitchToRegister ? (
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-primary font-medium hover:underline"
          >
            Créer un compte
          </button>
        ) : (
          <Link to="/register" className="text-primary font-medium hover:underline">
            Créer un compte
          </Link>
        )}
      </p>
    </div>
  );
}
