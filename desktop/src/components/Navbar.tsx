import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Bell, Sun, Moon, Search, Menu } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getComplaints, type Complaint } from "@/services/complaintsService";
import { getUsers, type BackendUserRecord } from "@/services/usersService";
import { getNotifications, markNotificationsRead, type AppNotification } from "@/services/notificationsService";

const READ_NOTIFS_STORAGE_KEY = "notifications.readIds";

function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_NOTIFS_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

function persistReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(READ_NOTIFS_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    /* storage unavailable — silently degrade */
  }
}

interface NavbarProps {
  title?: string;
  showSearch?: boolean;
  onSearch?: (q: string) => void;
  onToggleSidebar?: () => void;
  isMobile?: boolean;
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

export function Navbar({ title, showSearch, onSearch, onToggleSidebar, isMobile }: NavbarProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadIds());

  // Persist read state across reloads — once you've opened the dropdown,
  // those IDs stay marked read until a new notification with a new ID arrives.
  useEffect(() => {
    persistReadIds(readIds);
  }, [readIds]);

  const role      = user?.rôle;
  const isAdminIT = role === "adminIT";
  const isAdminR  = role === "admin";
  const isMédecinR = role === "médecin";

  // Live data — only the queries relevant to the current role.
  const { data: complaints = [] } = useQuery<Complaint[]>({
    queryKey: ["complaints"],
    queryFn: getComplaints,
    enabled: !!user && (isMédecinR || isAdminIT),
  });
  const { data: users = [] } = useQuery<BackendUserRecord[]>({
    queryKey: ["users"],
    queryFn: getUsers,
    enabled: !!user && (isAdminR || isAdminIT),
  });
  const { data: dbNotifications = [], refetch: refetchNotifications } = useQuery<AppNotification[]>({
    queryKey: ["notifications"],
    queryFn: getNotifications,
    enabled: !!user && isMédecinR,
    refetchInterval: 30_000,
  });

  const allNotifications = useMemo<Notification[]>(() => {
    if (isMédecinR) {
      const resolved = complaints
        .filter(c => c.status === "resolved")
        .map(c => ({
          id: `complaint-${c._id}`,
          text: `Votre réclamation « ${c.title} » a été traitée`,
          createdAt: c.createdAt,
          link: "/reclamations",
        }));
      const fromDb = dbNotifications.map(n => ({
        id: `db-${n._id}`,
        text: n.text,
        createdAt: n.createdAt,
        link: n.link,
      }));
      return [...resolved, ...fromDb];
    }
    if (isAdminR) {
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
  }, [isMédecinR, isAdminR, isAdminIT, complaints, users])
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 12);

  const dbUnread = dbNotifications.filter(n => !n.read).length;
  const computedUnread = allNotifications.filter(n => !n.id.startsWith("db-") && !readIds.has(n.id)).length;
  const unread = computedUnread + dbUnread;

  const openNotifs = () => {
    setShowNotifs(v => {
      if (!v) {
        setReadIds(prev => new Set([...prev, ...allNotifications.map(n => n.id)]));
        if (isMédecinR && dbNotifications.some(n => !n.read)) {
          markNotificationsRead().then(() => refetchNotifications());
        }
      }
      return !v;
    });
  };

  const handleNotifClick = (notif: Notification) => {
    setShowNotifs(false);
    navigate(notif.link);
  };

  const isAdmin   = user?.rôle === "admin";
  const isMédecin = user?.rôle === "médecin";
  const isDark    = theme === "dark";

  const btnBg      = isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.65)";
  const dropdownBg = isDark ? "rgba(22,33,52,0.97)"   : "rgba(255,255,255,0.94)";

  const section = isAdmin ? "Administration" : isMédecin ? "Médecin" : "Admin Système";

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-3 sm:px-6 sticky top-0 z-10">

      {/* ── Left: hamburger (mobile) + breadcrumb + search ── */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Hamburger — only on mobile */}
        {isMobile && (
          <button
            onClick={onToggleSidebar}
            aria-label="Ouvrir le menu"
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 text-muted-foreground hover:text-foreground"
            style={{ background: btnBg, border: "1px solid hsl(var(--border))" }}
          >
            <Menu size={18} />
          </button>
        )}
        {title && (
          <nav className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground/70">
              {section}
            </span>
            <h1 className="text-[15px] sm:text-[18px] font-bold tracking-tight text-foreground leading-none">
              {title}
            </h1>
          </nav>
        )}

        {showSearch && (
          <div className="relative group">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors duration-200"
              size={15}
            />
            <input
              className="pl-9 pr-4 py-2 text-sm rounded-xl border w-32 sm:w-56 transition-all duration-200"
              style={{ background: btnBg, borderColor: "hsl(var(--border))" }}
              placeholder="Recherche par ID Exam..."
              onChange={e => onSearch?.(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* ── Right: actions ── */}
      <div className="flex items-center gap-2.5">

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Basculer le thème"
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 text-muted-foreground hover:text-foreground hover:border-primary/30"
          style={{ background: btnBg, border: "1px solid hsl(var(--border))" }}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={openNotifs}
            aria-label="Notifications"
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 relative text-muted-foreground hover:text-foreground hover:border-primary/30"
            style={{ background: btnBg, border: "1px solid hsl(var(--border))" }}
          >
            <Bell size={16} />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center">
                <span className="absolute w-4 h-4 rounded-full bg-primary/30 animate-ping" style={{ animationDuration: "2s" }} />
                <span className="relative w-4 h-4 rounded-full gradient-hero flex items-center justify-center text-white text-[9px] font-bold leading-none">
                  {unread}
                </span>
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifs && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -6 }}
                transition={{ duration: 0.16, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="absolute right-0 top-11 rounded-2xl border z-50 overflow-hidden notif-dropdown w-[min(310px,90vw)]"
                style={{
                  background: dropdownBg,
                  borderColor: "hsl(var(--border))",
                  backdropFilter: "blur(20px)",
                  transformOrigin: "top right",
                }}
              >
                {/* Header */}
                <div
                  className="px-4 py-3 border-b flex items-center justify-between"
                  style={{ borderColor: "hsl(var(--border))" }}
                >
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-foreground">Notifications</p>
                    {unread === 0 && (
                      <span className="text-[10px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">
                        Tout lu
                      </span>
                    )}
                  </div>
                  {allNotifications.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {allNotifications.length} notification{allNotifications.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {/* Items */}
                <div className="max-h-72 overflow-y-auto scrollbar-thin">
                  {allNotifications.map((n, i) => {
                    const isDbNotif = n.id.startsWith("db-");
                    const dbDoc = isDbNotif ? dbNotifications.find(d => `db-${d._id}` === n.id) : null;
                    const isUnread = isDbNotif ? (dbDoc ? !dbDoc.read : false) : !readIds.has(n.id);
                    return (
                      <motion.button
                        key={n.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.2 }}
                        onClick={() => handleNotifClick(n)}
                        className="w-full text-left px-4 py-3 border-b last:border-0 transition-colors duration-150 flex items-start gap-3 group"
                        style={{
                          borderColor: "hsl(var(--border))",
                          background: isUnread ? "rgba(74,123,190,0.05)" : "transparent",
                          borderLeft: isUnread ? "3px solid hsl(var(--primary))" : "3px solid transparent",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(74,123,190,0.09)")}
                        onMouseLeave={e => (e.currentTarget.style.background = isUnread ? "rgba(74,123,190,0.05)" : "transparent")}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground leading-snug">{n.text}</p>
                          <p className="text-[11px] mt-1 text-muted-foreground">{formatRelative(n.createdAt)}</p>
                        </div>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User chip */}
        <div
          className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl transition-all duration-200 hover:border-primary/30 cursor-default"
          style={{ background: btnBg, border: "1px solid hsl(var(--border))" }}
        >
          {user?.photo ? (
            <img
              src={user.photo}
              alt="Photo de profil"
              className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-border"
            />
          ) : user?.genre === "femme" ? (
            <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 ring-1 ring-border" style={{ background: "rgba(244,167,185,0.16)" }}>
              <svg viewBox="-16 -10 96 96" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="32" cy="20" r="12" fill="#F4A7B9" />
                <path d="M12 56c0-11.046 8.954-20 20-20s20 8.954 20 20" fill="#F4A7B9" />
                <circle cx="32" cy="20" r="10" fill="#F8C8D4" />
                <ellipse cx="32" cy="56" rx="18" ry="10" fill="#F4A7B9" />
              </svg>
            </div>
          ) : user?.genre === "homme" ? (
            <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 ring-1 ring-border" style={{ background: "rgba(143,188,230,0.16)" }}>
              <svg viewBox="-16 -10 96 96" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
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
            <p className="text-[10px] leading-none mt-0.5 text-muted-foreground">
              {isAdmin ? "Admin" : isMédecin ? "Médecin" : "Admin IT"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
