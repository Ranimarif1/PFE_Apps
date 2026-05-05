import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Sun, Moon, ArrowRight } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";

const navLinks = [
  { href: "/#about",     label: "À propos" },
  { href: "/#features",  label: "Fonctionnalités" },
  { href: "/#studies",   label: "Études" },
  { href: "/#contact",   label: "Contact" },
];

type AuthMode = "login" | "register" | null;

export function PublicNavbar() {
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const onLanding = pathname === "/";
  const [searchParams, setSearchParams] = useSearchParams();
  const [authMode, setAuthMode] = useState<AuthMode>(null);

  // Auto-open the modal when arriving via /?auth=login or /?auth=register
  // (e.g. from RouteGuard redirects, the legacy /login & /register routes,
  // or any link in the app). The query param is stripped so refreshing the
  // page doesn't keep popping the modal.
  useEffect(() => {
    const auth = searchParams.get("auth");
    if (auth === "login" || auth === "register") {
      setAuthMode(auth);
      const next = new URLSearchParams(searchParams);
      next.delete("auth");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <>
      <nav
        className="fixed top-0 inset-x-0 z-50 border-b border-border"
        aria-label="Navigation principale"
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }}
      >
        <div className="w-full px-4 lg:px-6 h-16 flex items-center">
          <div className="flex-1 flex items-center justify-start">
            <Link to="/" className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-xl overflow-hidden shrink-0"
                style={{ boxShadow: "0 0 0 1px hsl(var(--border))" }}
              >
                <img src="/ReportEase.png" alt="ReportEase" className="w-full h-full object-cover" />
              </div>
              <span className="font-bold text-base tracking-tight text-foreground">
                ReportEase
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-7 shrink-0">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={onLanding ? l.href.replace(/^\//, "") : l.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {l.label}
              </a>
            ))}
          </div>

          <div className="flex-1 flex items-center justify-end gap-2">
            <button
              onClick={toggleTheme}
              aria-label="Basculer le thème"
              className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("login")}
              className="hidden sm:inline-flex items-center gradient-hero text-white text-sm font-semibold px-4 py-2 rounded-lg"
            >
              Se connecter
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("register")}
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg border border-border bg-muted text-foreground hover:bg-secondary transition-colors"
            >
              S'inscrire
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </nav>

      <Dialog open={authMode !== null} onOpenChange={(open) => { if (!open) setAuthMode(null); }}>
        <DialogContent
          className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-6 sm:p-8 bg-card border-border rounded-3xl"
          style={{ boxShadow: "var(--shadow-xl)" }}
        >
          {authMode === "login" && (
            <LoginForm
              onSuccess={() => setAuthMode(null)}
              onSwitchToRegister={() => setAuthMode("register")}
            />
          )}
          {authMode === "register" && (
            <RegisterForm
              onSwitchToLogin={() => setAuthMode("login")}
              onAfterSuccess={() => setAuthMode("login")}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
