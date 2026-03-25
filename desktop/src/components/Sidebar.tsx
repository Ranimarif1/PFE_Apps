import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  LayoutDashboard, FileText, History, MessageSquare, User,
  Users, Settings, Download, Brain, LogOut, Sun, Moon,
  ChevronLeft, ChevronRight, Radio
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const médécinLinks = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
  { to: "/rapport/nouveau", icon: FileText, label: "Nouveau rapport" },
  { to: "/historique", icon: History, label: "Historique" },
  { to: "/reclamations", icon: MessageSquare, label: "Réclamations" },
  { to: "/profil", icon: User, label: "Mon profil" },
];

const adminLinks = [
  { to: "/admin/dashboard", icon: LayoutDashboard, label: "Tableau de bord Admin" },
  { to: "/admin/utilisateurs", icon: Users, label: "Utilisateurs" },
  { to: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord Médecin" },
  { to: "/rapport/nouveau", icon: FileText, label: "Nouveau rapport" },
  { to: "/historique", icon: History, label: "Historique" },
  { to: "/reclamations", icon: MessageSquare, label: "Réclamations" },
  { to: "/admin/profil", icon: User, label: "Mon profil" },
];

const adminITLinks = [
  { to: "/adminit/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
  { to: "/adminit/reclamations", icon: MessageSquare, label: "Réclamations" },
  { to: "/adminit/admins", icon: Users, label: "Comptes Admin" },
  { to: "/adminit/modele", icon: Brain, label: "Modèle IA" },
  { to: "/adminit/export", icon: Download, label: "Export CSV" },
  { to: "/adminit/profil", icon: User, label: "Mon profil" },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const links = user?.rôle === "médecin" ? médécinLinks
    : user?.rôle === "admin" ? adminLinks
    : adminITLinks;

  const roleLabel = user?.rôle === "médecin" ? "Médecin Radiologue"
    : user?.rôle === "admin" ? "Administrateur"
    : "Admin IT";

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.2 }}
      className="h-screen flex flex-col bg-sidebar border-r border-sidebar-border relative z-20 shrink-0"
    >
      {/* Logo */}
      <div className={cn("flex items-center gap-3 px-4 py-5 border-b border-sidebar-border", collapsed && "justify-center px-2")}>
        <div className="w-9 h-9 rounded-lg gradient-hero flex items-center justify-center shrink-0">
          <Radio className="w-5 h-5 text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden"
            >
              <span className="text-sidebar-foreground font-bold text-base whitespace-nowrap">RadioAI</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User info */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 py-3 border-b border-sidebar-border"
          >
            <p className="text-sidebar-primary text-xs font-semibold">🩻 Service Radiologie</p>
            <p className="text-sidebar-foreground text-sm font-medium truncate mt-0.5">
              {user?.rôle === "médecin" ? `Dr. ${user?.prénom} ${user?.nom}` : `${user?.prénom} ${user?.nom}`}
            </p>
            <p className="text-sidebar-foreground/50 text-xs">{roleLabel}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav links */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto scrollbar-thin">
        <ul className="space-y-1">
          {links.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to || (to !== "/dashboard" && location.pathname.startsWith(to));
            return (
              <li key={to}>
                <Link
                  to={to}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                    collapsed && "justify-center px-2",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                  title={collapsed ? label : undefined}
                >
                  <Icon className="w-4.5 h-4.5 shrink-0" size={18} />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="overflow-hidden whitespace-nowrap"
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom actions */}
      <div className="px-2 py-3 border-t border-sidebar-border space-y-1">
        <button
          onClick={toggleTheme}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-all",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? (theme === "dark" ? "Mode clair" : "Mode sombre") : undefined}
        >
          {theme === "dark" ? <Sun size={18} className="shrink-0" /> : <Moon size={18} className="shrink-0" />}
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="whitespace-nowrap overflow-hidden">
                {theme === "dark" ? "Mode clair" : "Mode sombre"}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
        <button
          onClick={logout}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-all",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "Déconnexion" : undefined}
        >
          <LogOut size={18} className="shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="whitespace-nowrap overflow-hidden">
                Déconnexion
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border shadow-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </motion.aside>
  );
}