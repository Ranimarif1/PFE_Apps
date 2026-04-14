import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { getReports, type Report } from "@/services/reportsService";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, Search, FileAudio, ArrowUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  draft: "brouillon",
  validated: "validé",
  saved: "enregistré",
};

const STATUS_BADGES: Record<string, string> = {
  draft: "bg-warning/10 text-warning",
  validated: "bg-primary/10 text-primary",
  saved: "bg-success/10 text-success",
};

export default function Historique() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.rôle === "admin";

  const [filterStatut, setFilterStatut] = useState("tous");
  const [filterYear, setFilterYear] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [searchId, setSearchId] = useState("");
  const [viewMode, setViewMode] = useState<"all" | "mine">(isAdmin ? "all" : "mine");

  const { data: reports = [] } = useQuery<Report[]>({
    queryKey: ["reports"],
    queryFn: getReports,
  });

  const visibleReports = isAdmin && viewMode === "mine"
    ? reports.filter(r => r.isOwn)
    : reports;

  const availableYears = useMemo(() => {
    const years = new Set(visibleReports.map(r => new Date(r.createdAt).getFullYear().toString()));
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [visibleReports]);

  const availableDays = useMemo(() => {
    if (!filterYear || !filterMonth) return [];
    const days = new Set(
      visibleReports
        .filter(r => {
          const d = new Date(r.createdAt);
          return (
            d.getFullYear().toString() === filterYear &&
            String(d.getMonth() + 1).padStart(2, "0") === filterMonth
          );
        })
        .map(r => String(new Date(r.createdAt).getDate()).padStart(2, "0"))
    );
    return Array.from(days).sort();
  }, [visibleReports, filterYear, filterMonth]);

  const hasActiveFilters = filterStatut !== "tous" || filterYear || filterMonth || filterDay || searchId;

  const clearFilters = () => {
    setFilterStatut("tous");
    setFilterYear("");
    setFilterMonth("");
    setFilterDay("");
    setSearchId("");
  };

  const filtered = useMemo(() => {
    const result = visibleReports.filter(r => {
      if (filterStatut !== "tous" && r.status !== filterStatut) return false;
      if (filterYear) {
        const d = new Date(r.createdAt);
        if (d.getFullYear().toString() !== filterYear) return false;
        if (filterMonth) {
          if (String(d.getMonth() + 1).padStart(2, "0") !== filterMonth) return false;
          if (filterDay) {
            if (String(d.getDate()).padStart(2, "0") !== filterDay) return false;
          }
        }
      }
      if (searchId && !r.ID_Exam.toLowerCase().includes(searchId.toLowerCase())) return false;
      return true;
    });
    result.sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortOrder === "asc" ? diff : -diff;
    });
    return result;
  }, [visibleReports, filterStatut, filterYear, filterMonth, filterDay, searchId, sortOrder]);

  const showDoctorCol = isAdmin && viewMode === "all";

  return (
    <AppLayout title="Historique des rapports">
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex flex-wrap gap-3 items-center">

          {/* Admin: toggle all / mine */}
          {isAdmin && (
            <div className="flex gap-1 bg-muted p-1 rounded-lg mr-2">
              <button onClick={() => setViewMode("all")}
                className={cn("px-3 py-1 rounded-md text-sm font-medium transition-all",
                  viewMode === "all" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                Tous les rapports
              </button>
              <button onClick={() => setViewMode("mine")}
                className={cn("px-3 py-1 rounded-md text-sm font-medium transition-all",
                  viewMode === "mine" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                Mes rapports
              </button>
            </div>
          )}

          {/* Status filter */}
          <div className="flex gap-2">
            {[
              { key: "tous", label: "tous" },
              { key: "draft", label: "brouillon" },
              { key: "validated", label: "validé" },
              { key: "saved", label: "enregistré" },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setFilterStatut(key)}
                className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize",
                  filterStatut === key ? "gradient-hero text-white" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
                {label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {/* Sort toggle */}
            <button
              onClick={() => setSortOrder(o => o === "desc" ? "asc" : "desc")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              title={sortOrder === "desc" ? "Plus récent en premier" : "Plus ancien en premier"}
            >
              <ArrowUpDown size={13} />
              {sortOrder === "desc" ? "Plus récent" : "Plus ancien"}
            </button>

            {/* Year filter */}
            <select
              value={filterYear}
              onChange={e => { setFilterYear(e.target.value); setFilterMonth(""); }}
              className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Toutes les années</option>
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            {/* Month filter — only when year is selected */}
            {filterYear && (
              <select
                value={filterMonth}
                onChange={e => { setFilterMonth(e.target.value); setFilterDay(""); }}
                className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Tous les mois</option>
                {[
                  ["01", "Janvier"], ["02", "Février"], ["03", "Mars"], ["04", "Avril"],
                  ["05", "Mai"], ["06", "Juin"], ["07", "Juillet"], ["08", "Août"],
                  ["09", "Septembre"], ["10", "Octobre"], ["11", "Novembre"], ["12", "Décembre"],
                ].map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            )}

            {/* Day filter — only when year + month are selected */}
            {filterYear && filterMonth && availableDays.length > 0 && (
              <select
                value={filterDay}
                onChange={e => setFilterDay(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Tous les jours</option>
                {availableDays.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            )}

            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-sm text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-all"
                title="Supprimer les filtres"
              >
                <X size={13} /> Effacer
              </button>
            )}

            {/* Search by exam ID */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchId}
                onChange={e => setSearchId(e.target.value)}
                placeholder="Rechercher par ID Exam…"
                className="pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 w-52"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">ID Exam</th>
                {showDoctorCol && (
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Médecin</th>
                )}
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none hover:text-foreground transition-colors"
                  onClick={() => setSortOrder(o => o === "desc" ? "asc" : "desc")}>
                  Date {sortOrder === "desc" ? "↓" : "↑"}
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Statut</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Audio</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(r => (
                <tr key={r._id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-mono font-medium text-foreground">{r.ID_Exam}</td>
                  {showDoctorCol && (
                    <td className="px-6 py-4 text-foreground">
                      {r.doctorName || "—"}
                      {r.isOwn && (
                        <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">moi</span>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-4 text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGES[r.status] ?? "bg-muted text-muted-foreground"}`}>
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {r.audioId
                      ? <span className="flex items-center gap-1 text-xs text-primary"><FileAudio size={13} /> Oui</span>
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => navigate(`/rapport/${r._id}`)}
                      className="flex items-center gap-1.5 text-primary hover:text-primary/80 text-xs font-medium">
                      <Eye size={13} /> Voir
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={showDoctorCol ? 6 : 5} className="px-6 py-10 text-center text-muted-foreground">
                    Aucun rapport trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
