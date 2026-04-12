import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  LayoutDashboard, History, MessageSquare, User,
  Users, Download, Brain, LogOut, Sun, Moon,
  ChevronLeft, ChevronRight, TrendingUp,
  AlertCircle, Plus, FileAudio, Sparkles, Loader2, Database,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RecordingIndicator } from "@/components/RecordingIndicator";
import { useRecording } from "@/contexts/RecordingContext";

// ── Audio Queue ────────────────────────────────────────────────────────────────
function AudioQueue({ collapsed }: { collapsed: boolean }) {
  const recording = useRecording();
  const { audioQueue, transcribeById, isTranscribing } = recording;
  const [transcribingId, setTranscribingId] = useState<string | null>(null);
  const [open, setOpen] = useState(true);

  if (audioQueue.length === 0) return null;

  const handleTranscribe = async (id: string, examId: string) => {
    setTranscribingId(id);
    await transcribeById(id, examId);
    setTranscribingId(null);
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  if (collapsed) {
    return (
      <div className="mx-2 mb-2 relative">
        <div className="w-full flex items-center justify-center p-2 rounded-lg"
          style={{ background: "rgba(76,201,192,0.08)" }}
          title={`${audioQueue.length} audio(s) en attente`}>
          <FileAudio size={15} style={{ color: "#4cc9c0" }} />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
            style={{ background: "#4cc9c0", color: "#0d2137" }}>
            {audioQueue.length}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-2 mb-2 rounded-xl overflow-hidden border" style={{ borderColor: "rgba(76,201,192,0.2)", background: "rgba(76,201,192,0.05)" }}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left">
        <FileAudio size={13} style={{ color: "#4cc9c0" }} />
        <span className="text-[11px] font-bold tracking-wide flex-1" style={{ color: "#4cc9c0" }}>
          AUDIOS EN ATTENTE
        </span>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: "rgba(76,201,192,0.2)", color: "#4cc9c0" }}>
          {audioQueue.length}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            className="overflow-hidden">
            <div className="px-2 pb-2 space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
              {audioQueue.map(audio => {
                const busy = transcribingId === audio._id || isTranscribing;
                return (
                  <div key={audio._id} className="rounded-lg p-2 flex items-center gap-2"
                    style={{ background: "rgba(255,255,255,0.04)" }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-mono font-semibold truncate" style={{ color: "rgba(255,255,255,0.8)" }}>
                        {audio.examId}
                      </p>
                      <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {audio.duration > 0 ? fmt(audio.duration) : "—"} · {new Date(audio.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleTranscribe(audio._id, audio.examId)}
                      disabled={!!busy}
                      className="shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md disabled:opacity-40 transition-all"
                      style={{ background: "rgba(76,201,192,0.15)", color: "#4cc9c0" }}
                    >
                      {transcribingId === audio._id
                        ? <><Loader2 size={10} className="animate-spin" /> …</>
                        : <><Sparkles size={10} /> Transcrire</>}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
      { to: "/historique",         icon: History,         label: "Historique"       },
      { to: "/reclamations",       icon: MessageSquare,   label: "Réclamations"     },
      { to: "/admin/profil",       icon: User,            label: "Mon profil"       },
    ],
  },
  {
    label: "SYSTÈME",
    links: [
      { to: "/admin/statistiques", icon: TrendingUp, label: "Statistiques" },
      { to: "/admin/export",       icon: Download,   label: "Export CSV"   },
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
      { to: "/adminit/admins",    icon: Users,     label: "Comptes Admin"     },
      { to: "/adminit/modele",    icon: Brain,     label: "Modèle IA"         },
      { to: "/adminit/training",  icon: Database,  label: "Données entraîn."  },
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
        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
          <img src="/ReportEase.png" alt="ReportEase" className="w-full h-full object-cover" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden"
            >
              <p className="text-white font-semibold text-[13px] whitespace-nowrap leading-tight">ReportEase</p>
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

      {/* ── Audio queue ── */}
      <AudioQueue collapsed={collapsed} />

      {/* ── Recording indicator ── */}
      <RecordingIndicator collapsed={collapsed} />

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
