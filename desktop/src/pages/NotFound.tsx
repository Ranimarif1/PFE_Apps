import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center max-w-md bg-card border border-border rounded-2xl shadow-card px-8 py-10">
        <h1 className="mb-3 text-4xl font-bold text-foreground">404</h1>
        <p className="mb-5 text-base text-muted-foreground">Oups ! Page introuvable.</p>
        <a href="/" className="inline-flex items-center rounded-lg bg-primary/10 px-4 py-2 text-primary hover:bg-primary/15 transition-colors">
          Retour à l'accueil
        </a>
      </div>
    </div>
  );
};

export default NotFound;