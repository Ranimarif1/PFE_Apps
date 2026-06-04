import { Navigate, useLocation } from "react-router-dom";
import { useAuth, UserRole } from "@/contexts/AuthContext";

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export function RouteGuard({ children, allowedRoles }: RouteGuardProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!user) {
    // After logout / session loss, land on the public home page — not the
    // login form. Users open the login modal themselves from there.
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user.rôle)) {
    const redirectMap: Record<UserRole, string> = {
      médecin: "/dashboard",
      admin: "/admin/dashboard",
      adminIT: "/adminit/dashboard",
    };
    return <Navigate to={redirectMap[user.rôle]} replace />;
  }

  return <>{children}</>;
}