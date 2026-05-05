import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Bell, Sun, Moon, Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

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
  { id: "1", text: "Nouveau médecin en attente de validation", time: "Il y a 30min", link: "/admin/dashboard?tab=medecins&filter=pending" },
  { id: "2", text: "Nouveau médecin en attente de validation", time: "Il y a 1h",    link: "/admin/dashboard?tab=medecins&filter=pending" },
];

const adminITNotifications: Notification[] = [
  { id: "1", text: "Nouvelle réclamation soumise",        time: "Il y a 15min", link: "/adminit/reclamations" },
  { id: "2", text: "Nouvel admin en attente de validation", time: "Il y a 1h",  link: "/adminit/admins" },
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
  const isDark    = theme === "dark";

  const btnBg      = isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.65)";
  const dropdownBg = isDark ? "rgba(22,33,52,0.97)"   : "rgba(255,255,255,0.94)";

  const section = isAdmin ? "Administration" : isMédecin ? "Médecin" : "Admin Système";

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-10">

      {/* ── Left: breadcrumb + search ── */}
      <div className="flex items-center gap-4">
        {title && (
          <nav className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground/70">
              {section}
            </span>
            <h1 className="text-[18px] font-bold tracking-tight text-foreground leading-none">
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
              className="pl-9 pr-4 py-2 text-sm rounded-xl border w-60 transition-all duration-200"
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
                className="absolute right-0 top-11 rounded-2xl border z-50 overflow-hidden notif-dropdown"
                style={{
                  width: "310px",
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
                    const isUnread = !readIds.has(n.id);
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
                          <p className="text-[11px] mt-1 text-muted-foreground">{n.time}</p>
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
