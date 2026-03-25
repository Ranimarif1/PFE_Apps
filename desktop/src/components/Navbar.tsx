import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Bell, Sun, Moon, Search } from "lucide-react";
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

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        {title && <h1 className="text-lg font-semibold text-foreground">{title}</h1>}
        {showSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              className="pl-9 pr-4 py-1.5 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 w-56"
              placeholder="Recherche par ID Exam..."
              onChange={e => onSearch?.(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden sm:flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
          🩻 Service Radiologie
        </span>

        <button onClick={toggleTheme}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <div className="relative">
          <button onClick={openNotifs}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors relative">
            <Bell size={16} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-10 w-72 bg-card rounded-xl border border-border shadow-elevated z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <p className="font-semibold text-sm">Notifications</p>
                {unread === 0 && <p className="text-xs text-muted-foreground">Tout lu ✓</p>}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {allNotifications.map(n => (
                  <button key={n.id} onClick={() => handleNotifClick(n)}
                    className={`w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors ${!readIds.has(n.id) ? "bg-primary/5" : ""}`}>
                    <p className="text-sm text-foreground">{n.text}</p>
                    <p className="text-xs text-muted-foreground mt-1">{n.time}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-8 h-8 rounded-full gradient-hero flex items-center justify-center text-white text-xs font-bold">
          {user?.prénom?.[0]}{user?.nom?.[0]}
        </div>
      </div>
    </header>
  );
}
