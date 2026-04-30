import { useState, type CSSProperties } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { getUsers, type BackendUserRecord } from "@/services/usersService";
import { getReports, getReportStats, type Report } from "@/services/reportsService";
import { getComplaints, type Complaint } from "@/services/complaintsService";
import {
  Users, Clock, FileText, Plus, MessageSquare, Download,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { DASHBOARD_ACCENTS, type DashboardAccent } from "@/styles/dashboardAccents";

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

/* ─── Report calendar ─────────────────────────────────────────────────────── */
function ReportCalendar({ reports }: { reports: Report[] }) {
  const [viewDate, setViewDate] = useState(new Date());
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date();

  const dayCounts: Record<string, number> = {};
  reports.forEach(r => {
    const d = new Date(r.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    dayCounts[key] = (dayCounts[key] || 0) + 1;
  });

  const firstDow    = new Date(year, month, 1).getDay();
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
      <div className="flex items-center justify-between mb-2">
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

      <div className="grid grid-cols-7 mb-1">
        {["Di","Lu","Ma","Me","Je","Ve","Sa"].map((d, i) => (
          <div key={i} className="text-center text-[10px] text-muted-foreground font-medium py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map(({ day, type }, i) => {
          const isCur   = type === 'cur';
          const key     = isCur ? `${year}-${month}-${day}` : '';
          const count   = dayCounts[key] || 0;
          const isTod   = isCur && today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
          const hasRpt  = isCur && count > 0;
          const opacity = hasRpt ? Math.min(0.25 + (count / maxCount) * 0.6, 0.9) : 0;

          return (
            <div key={i} className="flex items-center justify-center py-0.5">
              <div className="w-7 h-7 flex items-center justify-center rounded-lg relative"
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

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  useAuth();
  const navigate = useNavigate();

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

  const statsValidated = rptStats?.validated ?? 0;
  const statsDraft     = rptStats?.draft     ?? 0;
  const statsSaved     = rptStats?.saved     ?? 0;
  const statsTotal     = rptStats?.total     ?? 0;

  const userPieData = [
    { name: "Acceptés",   value: validated || 1 },
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

  return (
    <AppLayout title="Tableau de bord — Admin">
      <div className="flex flex-col min-h-full max-w-full overflow-hidden">

        {/* ══ KPI strip ══════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-x sm:divide-y-0 divide-border border border-border rounded-xl bg-card overflow-hidden">
          <Kpi value={doctors.length} label="Total médecins"       accent={DASHBOARD_ACCENTS.info}      icon={Users}         delta={`↑ ${doctors.length} inscrits`} />
          <Kpi value={pending}        label="En attente"           accent={DASHBOARD_ACCENTS.highlight} icon={Clock}         delta={pending > 0 ? `${pending} nécessitent une action` : "Aucun en attente"} />
          <Kpi value={statsTotal}     label="Total rapports"       accent={DASHBOARD_ACCENTS.info}      icon={FileText} />
          <Kpi value={reclamations}   label="Réclamations"         accent={DASHBOARD_ACCENTS.positive}  icon={MessageSquare} delta={`${resolvedComplaints} traitée${resolvedComplaints > 1 ? "s" : ""}`} />
        </div>

        {/* ══ Aperçu ═════════════════════════════════════════════════════════ */}
        <div className="pt-3">
          <div className="space-y-3">

            {/* Row 1: chart + calendrier */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-3 items-stretch">
              <div className="lg:col-span-3 bg-card border border-border rounded-xl flex flex-col">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
                  <span className="text-sm font-medium text-foreground">Activité — 30 derniers jours</span>
                  <span className="text-[10px] bg-muted border border-border rounded px-2 py-0.5 text-muted-foreground">rapports</span>
                </div>
                <div className="p-3 flex-1 min-h-0">
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

              <div className="lg:col-span-2 bg-card border border-border rounded-xl">
                <div className="px-4 py-2.5 border-b border-border">
                  <span className="text-sm font-medium text-foreground">Calendrier des rapports</span>
                </div>
                <div className="px-4 py-2">
                  <ReportCalendar reports={reports} />
                </div>
              </div>
            </div>

            {/* Row 2: pies + actions rapides */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
              <div className="bg-card border border-border rounded-xl flex flex-col">
                <div className="px-4 py-2 border-b border-border shrink-0">
                  <span className="text-sm font-medium text-foreground">Répartition des médecins</span>
                </div>
                <div className="p-2 flex items-center gap-2 flex-1 min-h-0">
                  <div className="w-[40%] h-28 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={userPieData} cx="50%" cy="50%" innerRadius="55%" outerRadius="95%" dataKey="value" paddingAngle={3}>
                          {userPieData.map((_, i) => (
                            <Cell key={i} fill={["#4A7BBE", "#D97706", "#E38C8C"][i]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-1 flex-1 min-w-0 justify-center">
                    {[
                      { label: "Acceptés",   value: validated, color: "#4A7BBE" },
                      { label: "En attente", value: pending,   color: "#D97706" },
                      { label: "Refusés",    value: refused,   color: "#E38C8C" },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                        <span className="text-[11px] text-muted-foreground">{item.label}</span>
                        <strong className="ml-auto text-xs text-foreground">{item.value}</strong>
                      </div>
                    ))}
                    <div className="pt-1 mt-0.5 border-t border-border text-[11px] text-muted-foreground">
                      Total: <strong className="text-foreground">{doctors.length}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl flex flex-col">
                <div className="px-4 py-2 border-b border-border shrink-0 flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Répartition des rapports</span>
                  {statsError && <span className="text-[10px] text-destructive">Erreur de chargement</span>}
                </div>
                <div className="p-2 flex items-center gap-2 flex-1 min-h-0">
                  <div className="w-[40%] h-28 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={rptPieData.some(d => d.value > 0) ? rptPieData : [{ name: "Aucun", value: 1 }]}
                          cx="50%" cy="50%" innerRadius="55%" outerRadius="95%" dataKey="value" paddingAngle={3}
                        >
                          {rptPieData.map((_, i) => (
                            <Cell key={i} fill={[DASHBOARD_ACCENTS.positive.base, "#D97706", DASHBOARD_ACCENTS.info.base][i]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-1 flex-1 min-w-0 justify-center">
                    {[
                      { label: "Validés",     value: statsValidated, color: DASHBOARD_ACCENTS.positive.base },
                      { label: "Brouillons",  value: statsDraft,     color: "#D97706" },
                      { label: "Enregistrés", value: statsSaved,     color: DASHBOARD_ACCENTS.info.base },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                        <span className="text-[11px] text-muted-foreground">{item.label}</span>
                        <strong className="ml-auto text-xs text-foreground">{item.value}</strong>
                      </div>
                    ))}
                    <div className="pt-1 mt-0.5 border-t border-border text-[11px] text-muted-foreground">
                      Total: <strong className="text-foreground">{statsTotal}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl flex flex-col">
                <div className="px-4 py-2.5 border-b border-border">
                  <span className="text-sm font-medium text-foreground">Actions rapides</span>
                </div>
                <div className="p-3 flex flex-col gap-1.5">
                  <button onClick={() => navigate("/rapport/nouveau")}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border bg-muted/40 hover:bg-muted text-sm text-foreground transition-colors text-left">
                    <Plus size={14} className="text-primary" /> Nouveau rapport →
                  </button>
                  <button onClick={() => navigate("/admin/medecins")}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border bg-muted/40 hover:bg-muted text-sm text-foreground transition-colors text-left">
                    <Users size={14} className="text-primary" /> Gérer les médecins →
                  </button>
                  <button onClick={() => navigate("/admin/export")}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border bg-muted/40 hover:bg-muted text-sm text-foreground transition-colors text-left">
                    <Download size={14} className="text-primary" /> Exporter les rapports →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
