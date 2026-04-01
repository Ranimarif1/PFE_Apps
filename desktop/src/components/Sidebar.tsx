import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  LayoutDashboard, FileText, History, MessageSquare, User,
  Users, Download, Brain, LogOut, Sun, Moon,
  ChevronLeft, ChevronRight, Radio, TrendingUp,
  AlertCircle, Plus,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ──────────────────────────────────────────────────────────────────────
type NavItem   = { to: string; icon: React.ElementType; label: string };
type Section   = { label: string; links: NavItem[] };

// ── Médecin sections ───────────────────────────────────────────────────────────
const médécinSections: Section[] = [
  {
    label: "PRINCIPAL",
    links: [
      { to: "/dashboard",       icon: LayoutDashboard, label: "Tableau de bord" },
      { to: "/rapport/nouveau", icon: Plus,            label: "Nouveau rapport" },
      { to: "/historique",      icon: History,         label: "Historique"      },
      { to: "/reclamations",    icon: MessageSquare,   label: "Réclamations"    },
      { to: "/profil",          icon: User,            label: "Mon profil"      },
    ],
  },
];

// ── Admin sections ─────────────────────────────────────────────────────────────
const adminSections: Section[] = [
  {
    label: "GÉNÉRAL",
    links: [
      { to: "/admin/dashboard",    icon: LayoutDashboard, label: "Tableau de bord" },
      { to: "/rapport/nouveau",    icon: Plus,            label: "Nouveau rapport"  },
      { to: "/historique",         icon: FileText,        label: "Rapports"         },
      { to: "/reclamations",       icon: MessageSquare,   label: "Réclamations"     },
      { to: "/admin/profil",       icon: User,            label: "Mon profil"       },
    ],
  },
  {
    label: "SYSTÈME",
    links: [
      { to: "/admin/statistiques", icon: TrendingUp, label: "Statistiques" },
    ],
  },
];

// ── Admin IT sections ──────────────────────────────────────────────────────────
const adminITSections: Section[] = [
  {
    label: "PRINCIPAL",
    links: [
      { to: "/adminit/dashboard",    icon: LayoutDashboard, label: "Tableau de bord" },
      { to: "/adminit/reclamations", icon: AlertCircle,     label: "Réclamations"    },
    ],
  },
  {
    label: "GESTION",
    links: [
      { to: "/adminit/admins",  icon: Users,    label: "Comptes Admin" },
      { to: "/adminit/modele",  icon: Brain,    label: "Modèle IA"    },
      { to: "/adminit/export",  icon: Download, label: "Export CSV"   },
    ],
  },
];

// ── NavLink ────────────────────────────────────────────────────────────────────
function NavLink({ to, icon: Icon, label, collapsed }: NavItem & { collapsed: boolean }) {
  const location = useLocation();
  const active = location.pathname === to || (to.length > 1 && location.pathname.startsWith(to));

  return (
    <li>
      <Link
        to={to}
        className={cn(
          "flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all duration-150",
          collapsed && "justify-center px-2",
          active
            ? "rounded-r-xl"
            : "rounded-xl hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
        style={
          active
            ? {
                background: 'rgba(0,201,167,0.12)',
                color: '#4cc9c0',
                borderLeft: '2.5px solid #4cc9c0',
                marginLeft: '-8px',
                paddingLeft: collapsed ? '8px' : '19px',
              }
            : { color: 'rgba(255,255,255,0.58)' }
        }
        title={collapsed ? label : undefined}
      >
        <Icon size={16} className="shrink-0" />
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden whitespace-nowrap text-[13px]"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </Link>
    </li>
  );
}

// ── Section block ──────────────────────────────────────────────────────────────
function SectionBlock({ section, collapsed, first }: { section: Section; collapsed: boolean; first: boolean }) {
  return (
    <div className={cn("", !first && "mt-1")}>
      {!first && <div className="mx-3 my-2 border-t border-sidebar-border" />}
      <AnimatePresence>
        {!collapsed && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-3 pt-2 pb-1 text-[9px] font-bold tracking-widest uppercase"
            style={{ color: 'rgba(255,255,255,0.25)', letterSpacing: '0.13em' }}
          >
            {section.label}
          </motion.p>
        )}
      </AnimatePresence>
      <ul className="space-y-0.5">
        {section.links.map(l => (
          <NavLink key={l.to} {...l} collapsed={collapsed} />
        ))}
      </ul>
    </div>
  );
}

// ── Main Sidebar ───────────────────────────────────────────────────────────────
export function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  const isAdmin   = user?.rôle === "admin";
  const isMédecin = user?.rôle === "médecin";

  const sections = isAdmin   ? adminSections
                 : isMédecin ? médécinSections
                 :             adminITSections;

  const subtitle = isAdmin   ? "ADMINISTRATION"
                 : isMédecin ? "SERVICE RADIOLOGIE"
                 :             "ADMIN SYSTÈME";

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 220 }}
      transition={{ duration: 0.2 }}
      className="h-screen flex flex-col bg-sidebar border-r border-sidebar-border relative z-20 shrink-0"
    >
      {/* ── Logo ── */}
      <div className={cn("flex items-center gap-3 px-4 py-4 border-b border-sidebar-border", collapsed && "justify-center px-2")}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(76,201,192,0.18)', border: '1px solid rgba(76,201,192,0.28)' }}>
          <Radio size={15} className="text-[#4cc9c0]" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden"
            >
              <p className="text-white font-semibold text-[13px] whitespace-nowrap leading-tight">RadioAI</p>
              <p className="whitespace-nowrap text-[9px] font-semibold tracking-widest" style={{ color: '#4cc9c0', letterSpacing: '0.09em' }}>
                {subtitle}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Nav sections ── */}
      <nav className="flex-1 py-2 px-2 overflow-y-auto scrollbar-thin">
        {sections.map((section, i) => (
          <SectionBlock key={section.label} section={section} collapsed={collapsed} first={i === 0} />
        ))}
      </nav>

      {/* ── Footer ── */}
      <div className="border-t border-sidebar-border">
        {/* Theme toggle */}
        <div className="px-2 pt-2">
          <button
            onClick={toggleTheme}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] hover:bg-sidebar-accent transition-all",
              collapsed && "justify-center px-2"
            )}
            style={{ color: 'rgba(255,255,255,0.45)' }}
            title={collapsed ? (theme === "dark" ? "Mode clair" : "Mode sombre") : undefined}
          >
            {theme === "dark" ? <Sun size={15} className="shrink-0" /> : <Moon size={15} className="shrink-0" />}
            <AnimatePresence>
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="whitespace-nowrap overflow-hidden">
                  {theme === "dark" ? "Mode clair" : "Mode sombre"}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* User row */}
        <div className={cn("flex items-center gap-2.5 px-3 py-3", collapsed && "justify-center px-2")}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 border"
            style={{ background: 'rgba(76,201,192,0.15)', borderColor: 'rgba(76,201,192,0.3)', color: '#4cc9c0' }}>
            {user?.prénom?.[0]}{user?.nom?.[0]}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="overflow-hidden min-w-0 flex-1">
                <p className="text-[11px] font-medium whitespace-nowrap truncate" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  {isMédecin ? `Dr. ${user?.prénom} ${user?.nom}` : `${user?.prénom} ${user?.nom}`}
                </p>
                <p className="text-[9px] whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.28)' }}>
                  {isAdmin ? "Administrateur" : isMédecin ? "Radiologue" : "Admin IT"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {!collapsed && (
              <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={logout} title="Déconnexion"
                className="text-destructive hover:bg-destructive/10 w-6 h-6 rounded flex items-center justify-center shrink-0 transition-colors">
                <LogOut size={13} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Collapse toggle ── */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-card border border-border shadow-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      >
        {collapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
      </button>
    </motion.aside>
  );
}
