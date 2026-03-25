import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { RouteGuard } from "@/components/RouteGuard";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useEffect, useState } from "react";

import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import MobileRecord from "./pages/MobileRecord";

// Médecin
import MédecinDashboard from "./pages/medecin/Dashboard";
import NouveauRapport from "./pages/medecin/NouveauRapport";
import RapportDetail from "./pages/medecin/RapportDetail";
import Historique from "./pages/medecin/Historique";
import MédecinReclamations from "./pages/medecin/Reclamations";
import MédecinProfil from "./pages/medecin/Profil";

// Admin
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUtilisateurs from "./pages/admin/Utilisateurs";
import AdminProfil from "./pages/medecin/Profil";

// Admin IT
import AdminITDashboard from "./pages/adminit/Dashboard";
import AdminITReclamations from "./pages/adminit/Reclamations";
import AdminITAdmins from "./pages/adminit/Admins";
import AdminITModele from "./pages/adminit/Modele";
import AdminITExport from "./pages/adminit/Export";
import AdminITProfil from "./pages/adminit/Profil";

const queryClient = new QueryClient();

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.rôle === "admin") return <Navigate to="/admin/dashboard" replace />;
  if (user.rôle === "adminIT") return <Navigate to="/adminit/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
}

function AppWithLoading() {
  const [appLoading, setAppLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setAppLoading(false), 1800);
    return () => clearTimeout(t);
  }, []);

  if (appLoading) return <LoadingScreen />;

  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/mobile/record/:token" element={<MobileRecord />} />

      {/* Médecin */}
      <Route path="/dashboard" element={<RouteGuard allowedRoles={["médecin", "admin"]}><MédecinDashboard /></RouteGuard>} />
      <Route path="/rapport/nouveau" element={<RouteGuard allowedRoles={["médecin", "admin"]}><NouveauRapport /></RouteGuard>} />
      <Route path="/rapport/:id" element={<RouteGuard allowedRoles={["médecin", "admin"]}><RapportDetail /></RouteGuard>} />
      <Route path="/historique" element={<RouteGuard allowedRoles={["médecin", "admin"]}><Historique /></RouteGuard>} />
      <Route path="/reclamations" element={<RouteGuard allowedRoles={["médecin", "admin"]}><MédecinReclamations /></RouteGuard>} />
      <Route path="/profil" element={<RouteGuard allowedRoles={["médecin", "admin"]}><MédecinProfil /></RouteGuard>} />

      {/* Admin */}
      <Route path="/admin/dashboard" element={<RouteGuard allowedRoles={["admin"]}><AdminDashboard /></RouteGuard>} />
      <Route path="/admin/utilisateurs" element={<RouteGuard allowedRoles={["admin"]}><AdminUtilisateurs /></RouteGuard>} />
      <Route path="/admin/profil" element={<RouteGuard allowedRoles={["admin"]}><AdminProfil /></RouteGuard>} />

      {/* Admin IT */}
      <Route path="/adminit/dashboard" element={<RouteGuard allowedRoles={["adminIT"]}><AdminITDashboard /></RouteGuard>} />
      <Route path="/adminit/reclamations" element={<RouteGuard allowedRoles={["adminIT"]}><AdminITReclamations /></RouteGuard>} />
      <Route path="/adminit/admins" element={<RouteGuard allowedRoles={["adminIT"]}><AdminITAdmins /></RouteGuard>} />
      <Route path="/adminit/modele" element={<RouteGuard allowedRoles={["adminIT"]}><AdminITModele /></RouteGuard>} />
      <Route path="/adminit/export" element={<RouteGuard allowedRoles={["adminIT"]}><AdminITExport /></RouteGuard>} />
      <Route path="/adminit/profil" element={<RouteGuard allowedRoles={["adminIT"]}><AdminITProfil /></RouteGuard>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppWithLoading />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;