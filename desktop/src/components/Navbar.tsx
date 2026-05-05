import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Bell, Sun, Moon, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getComplaints, type Complaint } from "@/services/complaintsService";
import { getUsers, type BackendUserRecord } from "@/services/usersService";

interface NavbarProps {
  title?: string;
  showSearch?: boolean;
  onSearch?: (q: string) => void;
}

interface Notification {
  id: string;
  text: string;
  createdAt: string;
  link: string;
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = Math.max(0, Date.now() - t);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "À l'instant";
  const min = Math.floor(sec / 60);
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `Il y a ${d} j`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

export function Navbar({ title, showSearch, onSearch }: NavbarProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const role      = user?.rôle;
  const isAdmin   = role === "admin";
  const isMédecin = role === "médecin";
  const isAdminIT = role === "adminIT";

  // Live data — only the queries relevant to the current role.
  const { data: complaints = [] } = useQuery<Complaint[]>({
    queryKey: ["complaints"],
    queryFn: getComplaints,
    enabled: !!user && (isMédecin || isAdminIT),
  });
  const { data: users = [] } = useQuery<BackendUserRecord[]>({
    queryKey: ["users"],
    queryFn: getUsers,
    enabled: !!user && (isAdmin || isAdminIT),
  });

  const allNotifications = useMemo<Notification[]>(() => {
    if (isMédecin) {
      // Doctor's resolved complaints — they should know their reclamation got handled.
      return complaints
        .filter(c => c.status === "resolved")
        .map(c => ({
          id: `complaint-${c._id}`,
          text: `Votre réclamation « ${c.title} » a été traitée`,
          createdAt: c.createdAt,
          link: "/reclamations",
        }));
    }
    if (isAdmin) {
      // Doctors awaiting validation.
      return users
        .filter(u => u.role === "doctor" && u.status === "pending")
        .map(u => ({
          id: `user-${u._id}`,
          text: `Médecin Dr. ${u.prenom} ${u.nom} en attente de validation`,
          createdAt: u.createdAt,
          link: "/admin/medecins?filter=pending",
        }));
    }
    if (isAdminIT) {
      const pendingComplaints = complaints
        .filter(c => c.status === "pending")
        .map(c => ({
          id: `complaint-${c._id}`,
          text: `Nouvelle réclamation : ${c.title}`,
          createdAt: c.createdAt,
          link: "/adminit/reclamations",
        }));
      const pendingAdmins = users
        .filter(u => (u.role === "admin" || u.role === "adminIT") && u.status === "pending")
        .map(u => ({
          id: `user-${u._id}`,
          text: `Admin ${u.prenom} ${u.nom} en attente de validation`,
          createdAt: u.createdAt,
          link: "/adminit/admins",
        }));
      return [...pendingComplaints, ...pendingAdmins];
    }
    return [];
  }, [isMédecin, isAdmin, isAdminIT, complaints, users])
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 12);

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

  const isDark = theme === "dark";

  // Theme-aware backgrounds
  const btnBg      = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.60)';
  const dropdownBg = isDark ? 'rgba(22,33,52,0.97)'   : 'rgba(255,255,255,0.92)';
  const hoverBg    = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(74,123,190,0.08)';

  const section = isAdmin ? "Administration" : isMédecin ? "Médecin" : "Admin Système";

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        {/* Breadcrumb for all roles */}
        {title && (
          <nav className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground/70">{section}</span>
            <div className="flex items-center gap-2">
              <h1 className="text-[18px] font-bold tracking-tight text-foreground leading-none">{title}</h1>
            </div>
          </nav>
        )}
        {showSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
            <input
              className="pl-9 pr-4 py-2 text-sm rounded-xl border w-60"
              style={{ background: btnBg, borderColor: 'hsl(var(--border))' }}
              placeholder="Recherche par ID Exam..."
              onChange={e => onSearch?.(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={toggleTheme}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 text-muted-foreground hover:text-foreground"
          style={{ background: btnBg, border: '1px solid hsl(var(--border))' }}>
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <div className="relative">
          <button onClick={openNotifs}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 relative text-muted-foreground hover:text-foreground"
            style={{ background: btnBg, border: '1px solid hsl(var(--border))' }}>
            <Bell size={16} />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                style={{ background: '#4A7BBE' }} />
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-11 rounded-2xl border z-50 overflow-hidden notif-dropdown"
              style={{ width: '300px', background: dropdownBg, borderColor: 'hsl(var(--border))', backdropFilter: 'blur(20px)' }}>
              <div className="px-4 py-3 border-b flex items-center justify-between"
                style={{ borderColor: 'hsl(var(--border))' }}>
                <p className="font-bold text-sm text-foreground">Notifications</p>
                {unread === 0 && <p className="text-xs text-primary">Tout lu ✓</p>}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {allNotifications.length === 0 ? (
                  <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                    Aucune notification.
                  </p>
                ) : allNotifications.map(n => (
                  <button key={n.id} onClick={() => handleNotifClick(n)}
                    className="w-full text-left px-4 py-3 border-b last:border-0 transition-colors"
                    style={{
                      borderColor: 'hsl(var(--border))',
                      background: !readIds.has(n.id) ? 'rgba(74,123,190,0.06)' : 'transparent',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
                    onMouseLeave={e => (e.currentTarget.style.background = !readIds.has(n.id) ? 'rgba(74,123,190,0.06)' : 'transparent')}
                  >
                    <p className="text-sm text-foreground">{n.text}</p>
                    <p className="text-xs mt-0.5 text-muted-foreground">{formatRelative(n.createdAt)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User chip */}
        <div className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl"
          style={{ background: btnBg, border: '1px solid hsl(var(--border))' }}>
          {user?.photo ? (
            <img src={user.photo} alt="Photo de profil" className="w-7 h-7 rounded-full object-cover shrink-0" />
          ) : user?.genre === "femme" ? (
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(244, 167, 185, 0.16)" }}>
              <svg viewBox="0 0 64 64" className="w-4 h-4" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="32" cy="20" r="12" fill="#F4A7B9" />
                <path d="M12 56c0-11.046 8.954-20 20-20s20 8.954 20 20" fill="#F4A7B9" />
                <circle cx="32" cy="20" r="10" fill="#F8C8D4" />
                <ellipse cx="32" cy="56" rx="18" ry="10" fill="#F4A7B9" />
              </svg>
            </div>
          ) : user?.genre === "homme" ? (
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(143, 188, 230, 0.16)" }}>
              <svg viewBox="0 0 64 64" className="w-4 h-4" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="32" cy="20" r="12" fill="#8FBCE6" />
                <path d="M12 56c0-11.046 8.954-20 20-20s20 8.954 20 20" fill="#8FBCE6" />
                <circle cx="32" cy="20" r="10" fill="#B9D4EE" />
                <ellipse cx="32" cy="56" rx="18" ry="10" fill="#8FBCE6" />
              </svg>
            </div>
          ) : (
            <div className="w-7 h-7 rounded-full gradient-hero flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.prénom?.[0]}{user?.nom?.[0]}
            </div>
          )}
          <div className="hidden md:block">
            <p className="text-xs font-bold leading-none text-foreground">
              {user?.prénom} {user?.nom}
            </p>
            <p className="text-xs leading-none mt-0.5 text-muted-foreground">
              {isAdmin ? "Admin" : isMédecin ? "Médecin" : "Admin IT"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
