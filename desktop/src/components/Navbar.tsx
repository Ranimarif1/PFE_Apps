import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Bell, Sun, Moon, Search, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface NavbarProps {
  title?: string;
  showSearch?: boolean;
  onSearch?: (q: string) => void;
}

interface Notification {
  id: string;
  text: string;
  time: string;
  link: string;
}

const médécinNotifications: Notification[] = [
  { id: "1", text: "Votre réclamation a été traitée", time: "Il y a 2h", link: "/reclamations" },
];

const adminNotifications: Notification[] = [
  { id: "1", text: "Nouveau médecin en attente de validation", time: "Il y a 30min", link: "/admin/utilisateurs" },
  { id: "2", text: "Nouveau médecin en attente de validation", time: "Il y a 1h", link: "/admin/utilisateurs" },
];

const adminITNotifications: Notification[] = [
  { id: "1", text: "Nouvelle réclamation soumise", time: "Il y a 15min", link: "/adminit/reclamations" },
  { id: "2", text: "Nouvel admin en attente de validation", time: "Il y a 1h", link: "/adminit/admins" },
];

export function Navbar({ title, showSearch, onSearch }: NavbarProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const allNotifications = user?.rôle === "médecin" ? médécinNotifications
    : user?.rôle === "admin" ? adminNotifications
    : adminITNotifications;

  const unread = allNotifications.filter(n => !readIds.has(n.id)).length;

  const openNotifs = () => {
    setShowNotifs(v => {
      if (!v) setReadIds(new Set(allNotifications.map(n => n.id)));
      return !v;
    });
  };

  const handleNotifClick = (notif: Notification) => {
    setShowNotifs(false);
    navigate(notif.link);
  };

  const isAdmin   = user?.rôle === "admin";
  const isMédecin = user?.rôle === "médecin";
  const isDark = theme === "dark";

  // Theme-aware backgrounds
  const btnBg      = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.60)';
  const dropdownBg = isDark ? 'rgba(22,33,52,0.97)'   : 'rgba(255,255,255,0.92)';
  const hoverBg    = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(10,110,245,0.04)';

  const section = isAdmin ? "Administration" : isMédecin ? "Service Radiologie" : "Admin Système";

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        {/* Breadcrumb for all roles */}
        {title && (
          <nav className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground/60 font-medium text-xs">{section}</span>
            <ChevronRight size={12} className="text-muted-foreground/40" />
            <span className="font-semibold text-foreground text-sm">{title}</span>
          </nav>
        )}
        {showSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
            <input
              className="pl-9 pr-4 py-2 text-sm rounded-xl border w-60"
              style={{ background: btnBg, borderColor: 'var(--nv-border)' }}
              placeholder="Recherche par ID Exam..."
              onChange={e => onSearch?.(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Status badge */}
        <span className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(0,201,167,0.12)', color: 'var(--nv-teal)', border: '1px solid rgba(0,201,167,0.22)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
          Système opérationnel
        </span>

        <button onClick={toggleTheme}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 text-muted-foreground hover:text-foreground"
          style={{ background: btnBg, border: '1px solid var(--nv-border)' }}>
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <div className="relative">
          <button onClick={openNotifs}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 relative text-muted-foreground hover:text-foreground"
            style={{ background: btnBg, border: '1px solid var(--nv-border)' }}>
            <Bell size={16} />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                style={{ background: 'var(--nv-teal)' }} />
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-11 rounded-2xl border z-50 overflow-hidden notif-dropdown"
              style={{ width: '300px', background: dropdownBg, borderColor: 'var(--nv-border)', backdropFilter: 'blur(20px)' }}>
              <div className="px-4 py-3 border-b flex items-center justify-between"
                style={{ borderColor: 'var(--nv-border)' }}>
                <p className="font-bold text-sm text-foreground">Notifications</p>
                {unread === 0 && <p className="text-xs" style={{ color: 'var(--nv-teal)' }}>Tout lu ✓</p>}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {allNotifications.map(n => (
                  <button key={n.id} onClick={() => handleNotifClick(n)}
                    className="w-full text-left px-4 py-3 border-b last:border-0 transition-colors"
                    style={{
                      borderColor: 'var(--nv-border)',
                      background: !readIds.has(n.id) ? 'rgba(0,201,167,0.07)' : 'transparent',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
                    onMouseLeave={e => (e.currentTarget.style.background = !readIds.has(n.id) ? 'rgba(0,201,167,0.07)' : 'transparent')}
                  >
                    <p className="text-sm text-foreground">{n.text}</p>
                    <p className="text-xs mt-0.5 text-muted-foreground">{n.time}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User chip */}
        <div className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl"
          style={{ background: btnBg, border: '1px solid var(--nv-border)' }}>
          <div className="w-7 h-7 rounded-full gradient-hero flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user?.prénom?.[0]}{user?.nom?.[0]}
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-bold leading-none text-foreground">
              {user?.prénom} {user?.nom}
            </p>
            <p className="text-xs leading-none mt-0.5" style={{ color: 'var(--nv-teal)' }}>
              {isAdmin ? "Admin" : isMédecin ? "Médecin" : "Admin IT"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
