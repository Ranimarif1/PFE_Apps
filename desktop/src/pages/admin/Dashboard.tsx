import { useState, type CSSProperties } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsers, updateUserStatus, deleteUser, changeUserRole, type BackendUserRecord } from "@/services/usersService";
import { toast } from "sonner";
import { getReports, getReportStats, type Report } from "@/services/reportsService";
import { getComplaints, type Complaint } from "@/services/complaintsService";
import {
  Users, Clock, FileText, AlertTriangle, Check, X, Trash2,
  Search, Eye, Plus, LayoutGrid, MessageSquare, UserRoundCheck, Download,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { DASHBOARD_ACCENTS, type DashboardAccent } from "@/styles/dashboardAccents";
import { getStatusBadgeClass, getStatusLabel } from "@/styles/statusSystem";
/* ─── helpers ─────────────────────────────────────────────────────────────── */
function buildChartData(reports: Report[], days = 30) {
  const map: Record<string, number> = {};
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    map[d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })] = 0;
  }
  reports.forEach(r => {
    const key = new Date(r.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
    if (key in map) map[key]++;
  });
  return Object.entries(map).map(([date, rapports]) => ({ date, rapports }));
}
/* ─── KPI card ─────────────────────────────────────────────────────────────── */
function Kpi({
  value, label, delta, accent, icon: Icon,
}: {
  value: number | string; label: string; delta?: string;
  accent: DashboardAccent; icon: React.ElementType;
}) {
  return (
    <div
      className="dashboard-kpi relative overflow-hidden flex items-center gap-3 px-4 py-3"
      style={
        {
          "--kpi-border": accent.base,
          "--kpi-bg": accent.tint,
          "--kpi-bg-hover": accent.tintHover,
        } as CSSProperties
      }
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: accent.soft, color: accent.text }}>
        <Icon size={17} />
      </div>
      <div>
        <p className="text-xl font-bold leading-none tracking-tight" style={{ color: accent.text }}>{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5 font-medium">{label}</p>
        {delta && <p className="text-[10px] mt-0.5 text-muted-foreground">{delta}</p>}
      </div>
    </div>
  );
}

/* ─── Mini tab button ──────────────────────────────────────────────────────── */
function Tab({ active, onClick, icon: Icon, label, count }: {
  active: boolean; onClick: () => void; icon: React.ElementType; label: string; count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-4 py-3.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap",
        active
          ? "border-primary text-foreground font-semibold"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon size={13} />
      {label}
      {count !== undefined && (
        <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-semibold border",
          active ? "bg-primary/10 text-primary border-primary/20"
                 : "bg-muted text-muted-foreground border-border")}>
          {count}
        </span>
      )}
    </button>
  );
}

/* ─── Report calendar ─────────────────────────────────────────────────────── */
function ReportCalendar({ reports }: { reports: Report[] }) {
  const [viewDate, setViewDate] = useState(new Date());
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date();

  // Count reports per day (keyed as "Y-M-D")
  const dayCounts: Record<string, number> = {};
  reports.forEach(r => {
    const d = new Date(r.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    dayCounts[key] = (dayCounts[key] || 0) + 1;
  });

  const firstDow    = new Date(year, month, 1).getDay();     // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev  = new Date(year, month, 0).getDate();

  type Cell = { day: number; type: 'prev' | 'cur' | 'next' };
  const cells: Cell[] = [];
  for (let i = firstDow - 1; i >= 0; i--)
    cells.push({ day: daysInPrev - i, type: 'prev' });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, type: 'cur' });
  while (cells.length % 7 !== 0)
    cells.push({ day: cells.length - daysInMonth - firstDow + 1, type: 'next' });

  const maxCount = Math.max(...Object.values(dayCounts), 1);
  const monthLabel = viewDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div>
      {/* nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setViewDate(new Date(year, month - 1))}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors border border-border text-base leading-none">
          ‹
        </button>
        <span className="text-sm font-semibold text-foreground capitalize">{monthLabel}</span>
        <button onClick={() => setViewDate(new Date(year, month + 1))}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors border border-border text-base leading-none">
          ›
        </button>
      </div>

      {/* weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {["Di","Lu","Ma","Me","Je","Ve","Sa"].map((d, i) => (
          <div key={i} className="text-center text-[10px] text-muted-foreground font-medium py-1">{d}</div>
        ))}
      </div>

      {/* day cells */}
      <div className="grid grid-cols-7">
        {cells.map(({ day, type }, i) => {
          const isCur   = type === 'cur';
          const key     = isCur ? `${year}-${month}-${day}` : '';
          const count   = dayCounts[key] || 0;
          const isTod   = isCur && today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
          const hasRpt  = isCur && count > 0;
          const opacity = hasRpt ? Math.min(0.25 + (count / maxCount) * 0.6, 0.9) : 0;

          return (
            <div key={i} className="flex items-center justify-center py-1">
              <div className="w-8 h-8 flex items-center justify-center rounded-lg relative"
                style={{
                  background: isTod ? '#D97706' : hasRpt ? `rgba(74,123,190,${opacity})` : 'transparent',
                  color: isTod ? '#fff' : hasRpt ? (opacity > 0.5 ? '#fff' : 'var(--accent-info-text)') : isCur ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                  opacity: isCur ? 1 : 0.35,
                }}>
                <span className="text-xs font-medium leading-none">{day}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Horizontal bar ───────────────────────────────────────────────────────── */
function HBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold text-foreground">{value}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  useAuth();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const mainTab    = (searchParams.get("tab")    as "apercu" | "medecins" | "rapports") ?? "apercu";
  const userFilter = (searchParams.get("filter") as "all" | "validated" | "pending" | "refused")     ?? "all";

  const setMainTab    = (tab: string) => setSearchParams({ tab });
  const setUserFilter = (filter: string) => setSearchParams({ tab: mainTab, filter });

  const [search,         setSearch]         = useState("");
  const [confirmDelete,  setConfirmDelete]  = useState<BackendUserRecord | null>(null);
  const [confirmPromote, setConfirmPromote] = useState<BackendUserRecord | null>(null);
  const [confirmRefuse,  setConfirmRefuse]  = useState<BackendUserRecord | null>(null);
  const [refuseReason,   setRefuseReason]   = useState("");

  /* ── data ── */
  const { data: users      = [] } = useQuery<BackendUserRecord[]>({ queryKey: ["users"],      queryFn: getUsers      });
  const { data: reports    = [] } = useQuery<Report[]>           ({ queryKey: ["reports"],    queryFn: getReports    });
  const { data: complaints = [] } = useQuery<Complaint[]>        ({ queryKey: ["complaints"], queryFn: getComplaints });
  const { data: rptStats, isError: statsError } = useQuery({ queryKey: ["reportStats"], queryFn: getReportStats });

  /* ── computed ── */
  const doctors   = users.filter(u => u.role === "doctor");
  const pending   = doctors.filter(u => u.status === "pending").length;
  const validated = doctors.filter(u => u.status === "validated").length;
  const refused   = doctors.filter(u => u.status === "refused").length;

  const totalReports = reports.length;

  // Accurate global counts for the pie chart (all doctors, all statuses)
  const statsValidated = rptStats?.validated ?? 0;
  const statsDraft     = rptStats?.draft     ?? 0;
  const statsSaved     = rptStats?.saved     ?? 0;
  const statsTotal     = rptStats?.total     ?? 0;

  const userPieData = [
    { name: "Validés",    value: validated || 1 },
    { name: "En attente", value: pending   || 0 },
    { name: "Refusés",    value: refused   || 0 },
  ].filter(d => d.value > 0);

  const rptPieData = [
    { name: "Validés",     value: statsValidated },
    { name: "Brouillons",  value: statsDraft     },
    { name: "Enregistrés", value: statsSaved     },
  ];

  const reclamations = complaints.length;
  const resolvedComplaints = complaints.filter(c => c.status === "resolved").length;

  /* ── mutations ── */
  const statusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: "validated" | "refused"; reason?: string }) =>
      updateUserStatus(id, status, reason),
    onSuccess: (result) => {
      // Immediately patch the cached list so the row updates without waiting for a refetch
      queryClient.setQueryData<BackendUserRecord[]>(["users"], (old) =>
        old?.map(u => u._id === result.user._id ? result.user : u) ?? old
      );
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setConfirmRefuse(null);
      setRefuseReason("");
      if (result.mail_warning) {
        toast.warning("Statut mis à jour", { description: result.mail_warning });
      } else {
        const label = result.user.status === "validated" ? "validé" : "refusé";
        toast.success(`Compte ${label}`, {
          description: `Un email a été envoyé à ${result.user.email}.`,
        });
      }
    },
    onError: () => {
      toast.error("Erreur", { description: "Impossible de mettre à jour le statut." });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); setConfirmDelete(null); },
  });
  const promoteMutation = useMutation({
    mutationFn: (id: string) => changeUserRole(id, "admin"),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); setConfirmPromote(null); },
  });

  /* ── filtered doctors ── */
  const tabDoctors = userFilter === "all" ? doctors : doctors.filter(u => u.status === userFilter);
  const filteredDoctors = tabDoctors.filter(u => {
    const q = search.toLowerCase();
    return !q || (u.prenom || "").toLowerCase().includes(q) || (u.nom || "").toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });


  return (
    <AppLayout title="Tableau de bord">
      <div className="flex flex-col min-h-full max-w-full overflow-hidden">

      {/* ══ KPI strip ══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-x sm:divide-y-0 divide-border border border-border rounded-xl shrink-0 bg-card overflow-hidden">
        <Kpi value={doctors.length} label="Total médecins"       accent={DASHBOARD_ACCENTS.info}      icon={Users}         delta={`↑ ${doctors.length} inscrits`} />
        <Kpi value={pending}        label="En attente"           accent={DASHBOARD_ACCENTS.highlight} icon={Clock}         delta={pending > 0 ? `${pending} nécessitent une action` : "Aucun en attente"} />
        <Kpi value={statsTotal}     label="Total rapports"       accent={DASHBOARD_ACCENTS.info}      icon={FileText} />
        <Kpi value={reclamations}   label="Réclamations"         accent={DASHBOARD_ACCENTS.positive}  icon={MessageSquare} delta={`${resolvedComplaints} traitée${resolvedComplaints > 1 ? "s" : ""}`} />
      </div>

      {/* ══ Tabs bar ═══════════════════════════════════════════════════════ */}
      <div className="mt-4 flex items-center gap-0 border border-border rounded-xl px-2 bg-card shrink-0 overflow-x-auto">
        <Tab active={mainTab === "apercu"}    onClick={() => setMainTab("apercu")}    icon={LayoutGrid}  label="Statistiques" />
        <Tab active={mainTab === "medecins"}  onClick={() => setMainTab("medecins")}  icon={Users}       label="Médecins"  count={doctors.length} />
        <Tab active={mainTab === "rapports"}  onClick={() => setMainTab("rapports")}  icon={FileText}    label="Rapports"  count={totalReports} />
      </div>

      {/* ══ Tab content ════════════════════════════════════════════════════ */}
      <div className="flex-1 min-h-0 mt-4">

        {/* ── Aperçu global ────────────────────────────────────────────── */}
        {mainTab === "apercu" && (
          <div className="h-full flex flex-col gap-4 overflow-hidden">

            {/* Row 1: chart + répartition */}
            <div className="flex-[3] min-h-0 grid grid-cols-1 xl:grid-cols-5 gap-4 items-stretch">
              {/* Activity line chart */}
              <div className="lg:col-span-3 bg-card border border-border rounded-xl flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                  <span className="text-sm font-medium text-foreground">Activité — 30 derniers jours</span>
                  <span className="text-[10px] bg-muted border border-border rounded px-2 py-0.5 text-muted-foreground">rapports</span>
                </div>
                <div className="p-4 flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={buildChartData(reports)} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={4} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }}
                        cursor={{ stroke: "hsl(var(--muted))" }}
                      />
                      <Line type="monotone" dataKey="rapports" stroke={DASHBOARD_ACCENTS.info.base} strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Calendrier des rapports */}
              <div className="lg:col-span-2 bg-card border border-border rounded-xl">
                <div className="px-4 py-2.5 border-b border-border">
                  <span className="text-sm font-medium text-foreground">Calendrier des rapports</span>
                </div>
                <div className="px-4 py-3">
                  <ReportCalendar reports={reports} />
                </div>
              </div>
            </div>

            {/* Row 2: médecins pie + rapports pie + actions rapides */}
            <div className="flex-[2] min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
              {/* Répartition des médecins */}
              <div className="bg-card border border-border rounded-xl flex flex-col">
                <div className="px-4 py-2 border-b border-border shrink-0">
                  <span className="text-sm font-medium text-foreground">Répartition des médecins</span>
                </div>
                <div className="flex-1 min-h-0 px-4 py-3 flex flex-col sm:flex-row items-center gap-4">
                  <div className="h-40 w-full sm:w-1/2 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={userPieData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" paddingAngle={3}>
                          {userPieData.map((_, i) => (
                            <Cell
                              key={i}
                              fill={[DASHBOARD_ACCENTS.positive.base, DASHBOARD_ACCENTS.highlight.base, DASHBOARD_ACCENTS.info.base][i]}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex w-full flex-col gap-2 min-w-0">
                    {[
                      { label: "Validés",    value: doctors.filter(u => u.status === "validated").length, color: DASHBOARD_ACCENTS.positive.base },
                      { label: "En attente", value: doctors.filter(u => u.status === "pending").length,   color: DASHBOARD_ACCENTS.highlight.base },
                      { label: "Refusés",    value: doctors.filter(u => u.status === "refused").length,   color: DASHBOARD_ACCENTS.info.base },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                        <strong className="ml-auto pl-3 text-sm text-foreground">{item.value}</strong>
                      </div>
                    ))}
                    <div className="pt-1.5 border-t border-border text-xs text-muted-foreground">
                      Total: <strong className="text-foreground">{doctors.length}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Répartition des rapports */}
              <div className="bg-card border border-border rounded-xl flex flex-col">
                <div className="px-4 py-2 border-b border-border shrink-0 flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Répartition des rapports</span>
                  {statsError && <span className="text-[10px] text-destructive">Erreur de chargement</span>}
                </div>
                <div className="flex-1 min-h-0 px-4 py-3 flex flex-col sm:flex-row items-center gap-4">
                  <div className="h-40 w-full sm:w-1/2 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={rptPieData.some(d => d.value > 0) ? rptPieData : [{ name: "Aucun", value: 1 }]}
                          cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" paddingAngle={3}
                        >
                          {rptPieData.map((_, i) => (
                            <Cell
                              key={i}
                              fill={[DASHBOARD_ACCENTS.info.base, DASHBOARD_ACCENTS.highlight.base, DASHBOARD_ACCENTS.positive.base][i]}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex w-full flex-col gap-2 min-w-0">
                    {[
                      { label: "Validés",     value: statsValidated, color: DASHBOARD_ACCENTS.positive.base },
                      { label: "Brouillons",  value: statsDraft,     color: DASHBOARD_ACCENTS.highlight.base },
                      { label: "Enregistrés", value: statsSaved,     color: DASHBOARD_ACCENTS.info.base },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                        <strong className="ml-auto pl-3 text-sm text-foreground">{item.value}</strong>
                      </div>
                    ))}
                    <div className="pt-1.5 border-t border-border text-xs text-muted-foreground">
                      Total: <strong className="text-foreground">{statsTotal}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions rapides */}
              <div className="bg-card border border-border rounded-xl flex flex-col">
                <div className="px-4 py-2 border-b border-border shrink-0">
                  <span className="text-sm font-medium text-foreground">Actions rapides</span>
                </div>
                <div className="flex-1 px-4 py-3 flex flex-col justify-center gap-2">
                  <button onClick={() => navigate("/rapport/nouveau")}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border bg-muted/40 hover:bg-muted text-sm text-foreground transition-colors text-left">
                    <Plus size={13} className="text-primary" /> Nouveau rapport →
                  </button>
                  <button onClick={() => setMainTab("rapports")}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border bg-muted/40 hover:bg-muted text-sm text-foreground transition-colors text-left">
                    <FileText size={13} className="text-primary" /> Voir tous les rapports →
                  </button>
                  <button onClick={() => navigate("/reclamations")}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border bg-muted/40 hover:bg-muted text-sm text-foreground transition-colors text-left">
                    <MessageSquare size={13} className="text-primary" /> Soumettre une réclamation →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Médecins ─────────────────────────────────────────────────── */}
        {mainTab === "medecins" && (
          <div className="h-full overflow-y-auto pr-1 scrollbar-thin">
            <div className="mb-4">
              <p className="text-sm font-semibold text-foreground">Gestion des médecins</p>
            </div>

            {/* Segment control */}
            <div className="mb-4 inline-flex max-w-full gap-1 bg-muted border border-border rounded-lg p-1 overflow-x-auto">
              {([
                { key: "all",       label: `Tous (${doctors.length})`         },
                { key: "validated", label: `Validés (${validated})`            },
                { key: "pending",   label: `En attente (${pending})`           },
                { key: "refused",   label: `Refusés (${refused})`              },
              ] as const).map(({ key, label }) => (
                <button key={key} onClick={() => setUserFilter(key)}
                  className={cn("px-3 py-1.5 text-xs rounded-md transition-all",
                    userFilter === key
                      ? "bg-card border border-border text-foreground font-medium shadow-sm"
                      : "text-muted-foreground hover:text-foreground")}>
                  {label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 mb-4 bg-card">
              <Search size={13} className="text-muted-foreground shrink-0" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher par nom, email..."
                className="flex-1 text-xs bg-transparent text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="w-full overflow-x-auto">
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col style={{ width: "32%" }} /><col style={{ width: "26%" }} />
                  <col style={{ width: "14%" }} /><col style={{ width: "14%" }} /><col style={{ width: "14%" }} />
                </colgroup>
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    {["Médecin", "Email", "Statut", "Inscription", "Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredDoctors.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-xs text-muted-foreground">Aucun médecin trouvé.</td></tr>
                  )}
                  {filteredDoctors.map(doc => (
                    <tr key={doc._id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full gradient-hero flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                            {(doc.prenom || "?")[0]}{(doc.nom || "?")[0]}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-foreground">Dr. {doc.prenom} {doc.nom}</p>
                            <p className="text-[10px] text-muted-foreground">Radiologue</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground truncate">{doc.email}</td>
                      <td className="px-4 py-3">
                        <span className={getStatusBadgeClass(doc.status)}>
                          {getStatusLabel(doc.status, "user")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(doc.createdAt).toLocaleDateString("fr-FR")}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {doc.status === "pending" && (
                            <>
                              <button onClick={() => statusMutation.mutate({ id: doc._id, status: "validated" })}
                                disabled={statusMutation.isPending} title="Valider"
                                className="w-6 h-6 rounded-md border border-border bg-muted hover:bg-[rgba(143,211,179,0.14)] hover:border-[rgba(143,211,179,0.4)] hover:text-[#4D7F67] flex items-center justify-center transition-colors">
                                <Check size={11} />
                              </button>
                              <button onClick={() => { setConfirmRefuse(doc); setRefuseReason(""); }}
                                disabled={statusMutation.isPending} title="Refuser"
                                className="w-6 h-6 rounded-md border border-border bg-muted hover:bg-[rgba(227,140,140,0.14)] hover:border-[rgba(227,140,140,0.4)] hover:text-[#8E5555] flex items-center justify-center transition-colors">
                                <X size={11} />
                              </button>
                            </>
                          )}
                          {doc.status === "validated" && (
                            <button onClick={() => setConfirmPromote(doc)} title="Promouvoir en admin"
                              className="w-6 h-6 rounded-md border border-border bg-muted hover:bg-primary/10 hover:border-primary/30 hover:text-primary flex items-center justify-center transition-colors">
                              <UserRoundCheck size={11} />
                            </button>
                          )}
                          <button onClick={() => setConfirmDelete(doc)} title="Supprimer"
                            className="w-6 h-6 rounded-md border border-border bg-muted hover:bg-[rgba(227,140,140,0.14)] hover:border-[rgba(227,140,140,0.4)] hover:text-[#8E5555] flex items-center justify-center transition-colors">
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Rapports ─────────────────────────────────────────────────── */}
        {mainTab === "rapports" && (
          <div className="h-full overflow-y-auto pr-1 scrollbar-thin">
            <div className="mb-4">
              <p className="text-sm font-semibold text-foreground">Gestion des rapports</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tous les comptes rendus radiologiques de la plateforme</p>
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-medium text-foreground">Tous les rapports</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const header = ["ID Examen", "Médecin", "Date"];
                      const rows = reports.filter(r => r.status === "saved").map(r => [
                        r.ID_Exam,
                        r.doctorName || "",
                        new Date(r.createdAt).toLocaleDateString("fr-FR"),
                      ]);
                      const csv = [header, ...rows]
                        .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";"))
                        .join("\n");
                      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `rapports_${new Date().toISOString().slice(0, 10)}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1 border border-border bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Download size={11} /> Exporter
                  </button>
                </div>
              </div>
              <div className="w-full overflow-x-auto">
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col style={{ width: "28%" }} /><col style={{ width: "34%" }} />
                  <col style={{ width: "24%" }} /><col style={{ width: "14%" }} />
                </colgroup>
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    {["ID Examen", "Médecin", "Date", "Action"].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reports.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-12 text-center text-xs text-muted-foreground">
                      <FileText size={20} className="opacity-25 mb-2 mx-auto" />
                      Aucun rapport pour l'instant
                    </td></tr>
                  )}
                  {reports.filter(r => r.status === "saved").map(r => (
                    <tr key={r._id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-foreground">{r.ID_Exam}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{r.doctorName || "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("fr-FR")}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => navigate(`/rapport/${r._id}`)}
                          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                          <Eye size={12} /> Voir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )}

      </div>
      </div>
      {/* ══ Promote modal ═══════════════════════════════════════════════════ */}
      {confirmPromote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                <UserRoundCheck className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Promouvoir en administrateur</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-2">Vous êtes sur le point de changer le rôle de :</p>
            <p className="text-sm font-semibold text-foreground mb-1">Dr. {confirmPromote.prenom} {confirmPromote.nom}</p>
            <p className="text-xs text-muted-foreground mb-4">{confirmPromote.email}</p>
            <div className="bg-warning/10 border border-warning/30 rounded-xl px-4 py-3 mb-5">
              <p className="text-xs text-warning font-medium">
                Cette action est irréversible. Le compte passera du rôle <strong>Médecin</strong> au rôle <strong>Admin</strong> et obtiendra tous les accès administrateur.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmPromote(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted transition-all text-sm font-medium">
                Annuler
              </button>
              <button onClick={() => promoteMutation.mutate(confirmPromote._id)}
                disabled={promoteMutation.isPending}
                className="flex-1 py-2.5 rounded-xl gradient-hero text-white font-semibold hover:opacity-90 disabled:opacity-60 transition-all text-sm">
                {promoteMutation.isPending ? "Modification..." : "Confirmer le changement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Delete modal ════════════════════════════════════════════════════ */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Supprimer le médecin</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-2">Vous êtes sur le point de supprimer définitivement :</p>
            <p className="text-sm font-semibold text-foreground mb-1">Dr. {confirmDelete.prenom} {confirmDelete.nom}</p>
            <p className="text-xs text-muted-foreground mb-4">{confirmDelete.email}</p>
            <div className="bg-warning/10 border border-warning/30 rounded-xl px-4 py-3 mb-5">
              <p className="text-xs text-warning font-medium">Cette action est irréversible.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted transition-all text-sm font-medium">
                Annuler
              </button>
              <button onClick={() => deleteMutation.mutate(confirmDelete._id)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-destructive text-white font-semibold hover:bg-destructive/90 disabled:opacity-60 transition-all text-sm">
                {deleteMutation.isPending ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Refuse modal ════════════════════════════════════════════════════ */}
      {confirmRefuse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center shrink-0">
                <X className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Refuser la demande</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Un email sera envoyé au médecin</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Compte concerné :</p>
            <p className="text-sm font-semibold text-foreground mb-0.5">Dr. {confirmRefuse.prenom} {confirmRefuse.nom}</p>
            <p className="text-xs text-muted-foreground mb-4">{confirmRefuse.email}</p>
            <div className="mb-5">
              <label className="text-xs font-medium text-foreground mb-1.5 block">
                Motif du refus <span className="text-muted-foreground font-normal">(optionnel — inclus dans l'email)</span>
              </label>
              <textarea
                value={refuseReason}
                onChange={e => setRefuseReason(e.target.value)}
                placeholder="Ex. : Dossier incomplet, spécialité non correspondante..."
                rows={3}
                className="w-full text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setConfirmRefuse(null); setRefuseReason(""); }}
                className="flex-1 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted transition-all text-sm font-medium">
                Annuler
              </button>
              <button
                onClick={() => statusMutation.mutate({ id: confirmRefuse._id, status: "refused", reason: refuseReason })}
                disabled={statusMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-destructive text-white font-semibold hover:bg-destructive/90 disabled:opacity-60 transition-all text-sm">
                {statusMutation.isPending ? "Envoi..." : "Refuser et notifier"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
