import { useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { getReports, type Report } from "@/services/reportsService";
import { useQuery } from "@tanstack/react-query";
import {
  FileText, CheckCircle, Clock, Plus,
  History, Mic, Pencil, Ruler, Stethoscope, Sparkles,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
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

/* ─── KPI card ─────────────────────────────────────────────────────────────── */
function Kpi({ value, label, delta, accent, icon: Icon }: {
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

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const { data: reports = [] } = useQuery<Report[]>({ queryKey: ["reports"], queryFn: getReports });

  /* ── computed ── */
  const total     = reports.length;
  const validated = reports.filter(r => r.status === "validated").length;
  const drafts    = reports.filter(r => r.status === "draft").length;
  const saved     = reports.filter(r => r.status === "saved").length;
  const last      = reports[0];

  /* ── AI Assistant stats ── */
  const dictated    = reports.filter(r => r.audioId).length;
  const manual      = total - dictated;
  const dictatedPct = total > 0 ? Math.round((dictated / total) * 100) : 0;
  const minsSaved   = dictated * 4;   // conservative ~4 min saved per dictation

  return (
    <AppLayout title="Tableau de bord">
      <div className="flex flex-col min-h-full max-w-full overflow-hidden">

      {/* ══ KPI strip ══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-x sm:divide-y-0 divide-border border border-border rounded-xl bg-card overflow-hidden">
        <Kpi value={total}     label="Total rapports"          accent={DASHBOARD_ACCENTS.info}      icon={FileText}    delta={`${total} rapports créés`} />
        <Kpi value={validated} label="Validés"                 accent={DASHBOARD_ACCENTS.positive}  icon={CheckCircle} delta={total > 0 ? `${Math.round((validated/total)*100)}% du total` : undefined} />
        <Kpi value={drafts}    label="Brouillons"              accent={DASHBOARD_ACCENTS.highlight} icon={Clock}       delta={drafts > 0 ? "À compléter" : "Aucun brouillon"} />
        <Kpi value={last?.ID_Exam ?? "—"} label="Dernière transcription" accent={DASHBOARD_ACCENTS.highlight} icon={Mic} />
      </div>

      {/* ══ Content ════════════════════════════════════════════════════════ */}
      <div className="pt-3">
        <div className="space-y-3">

          {/* Row 1: chart + calendar */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-3 items-stretch">
              {/* Activity chart */}
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
                      <Line
                        type="monotone"
                        dataKey="rapports"
                        stroke={DASHBOARD_ACCENTS.info.base}
                        strokeWidth={1.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Calendrier */}
              <div className="lg:col-span-2 bg-card border border-border rounded-xl">
                <div className="px-4 py-2.5 border-b border-border">
                  <span className="text-sm font-medium text-foreground">Calendrier des rapports</span>
                </div>
                <div className="px-4 py-2">
                  <ReportCalendar reports={reports} />
                </div>
              </div>
            </div>

          {/* Row 2: pie + AI assistant + actions */}
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-3 items-stretch">
              {/* Répartition statuts — pie */}
              <div className="lg:col-span-2 bg-card border border-border rounded-xl flex flex-col">
                <div className="px-4 py-2 border-b border-border shrink-0">
                  <span className="text-sm font-medium text-foreground">Répartition des rapports</span>
                </div>
                <div className="p-2 flex items-center gap-2 flex-1 min-h-0">
                  <div className="w-[40%] h-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={total > 0
                            ? [
                                { name: "Validés",     value: validated },
                                { name: "Brouillons",  value: drafts    },
                                { name: "Enregistrés", value: saved     },
                              ].filter(d => d.value > 0)
                            : [{ name: "Aucun", value: 1 }]
                          }
                          cx="50%" cy="50%" innerRadius="55%" outerRadius="95%" dataKey="value" paddingAngle={3}>
                          {[DASHBOARD_ACCENTS.positive.base, DASHBOARD_ACCENTS.highlight.base, DASHBOARD_ACCENTS.info.base].map((c, i) => (
                            <Cell key={i} fill={total > 0 ? c : "hsl(var(--muted))"} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-1 flex-1 min-w-0 justify-center">
                    {[
                      { label: "Validés",     value: validated, color: DASHBOARD_ACCENTS.positive.base  },
                      { label: "Brouillons",  value: drafts,    color: DASHBOARD_ACCENTS.highlight.base },
                      { label: "Enregistrés", value: saved,     color: DASHBOARD_ACCENTS.info.base      },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                        <span className="text-[11px] text-muted-foreground">{item.label}</span>
                        <strong className="ml-auto text-xs text-foreground">{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Assistant IA — dictation coverage + category chips */}
              <div className="lg:col-span-2 bg-card border border-border rounded-xl flex flex-col">
                <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
                  <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Sparkles size={13} className="text-primary" /> Assistant IA
                  </span>
                  <span className="text-[10px] bg-muted border border-border rounded px-2 py-0.5 text-muted-foreground">{dictatedPct}% dictés</span>
                </div>
                <div className="p-2 flex flex-col gap-1.5 flex-1 min-h-0 justify-between">
                  {/* Sub-stats */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="bg-muted/40 border border-border rounded-lg px-2 py-1.5">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wide font-semibold">Dictés</p>
                      <p className="text-base font-semibold text-foreground">{dictated}</p>
                    </div>
                    <div className="bg-muted/40 border border-border rounded-lg px-2 py-1.5">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wide font-semibold">Manuels</p>
                      <p className="text-base font-semibold text-foreground">{manual}</p>
                    </div>
                    <div className="bg-muted/40 border border-border rounded-lg px-2 py-1.5">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wide font-semibold">Gagné</p>
                      <p className="text-base font-semibold text-foreground">~{minsSaved}<span className="text-[10px] font-normal text-muted-foreground"> m</span></p>
                    </div>
                  </div>

                  {/* AI category chips */}
                  <div className="flex flex-wrap gap-1">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[rgba(100,116,139,0.2)] text-[#334155] border border-[rgba(100,116,139,0.35)] dark:text-[#CBD5E1] dark:border-[rgba(148,163,184,0.4)]">
                      <Mic size={9} /> STT
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[rgba(217,119,6,0.2)] text-[#7C4A08] border border-[rgba(217,119,6,0.4)] dark:text-[#FCD34D] dark:border-[rgba(245,158,11,0.45)]">
                      <Pencil size={9} /> Ortho
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[rgba(74,123,190,0.22)] text-[#1E3A6B] border border-[rgba(74,123,190,0.45)] dark:text-[#93C5FD] dark:border-[rgba(94,151,232,0.45)]">
                      <Ruler size={9} /> Accord
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[rgba(5,150,105,0.2)] text-[#065F46] border border-[rgba(5,150,105,0.4)] dark:text-[#6EE7B7] dark:border-[rgba(56,211,159,0.4)]">
                      <Stethoscope size={9} /> Médical
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions rapides */}
              <div className="lg:col-span-2 bg-card border border-border rounded-xl flex flex-col">
                <div className="px-4 py-2.5 border-b border-border">
                  <span className="text-sm font-medium text-foreground">Actions rapides</span>
                </div>
                <div className="p-3 flex flex-col gap-1.5">
                  <Link to="/rapport/nouveau"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border bg-muted/40 hover:bg-muted text-sm text-foreground transition-colors">
                    <Plus size={14} className="text-primary" />
                    Nouveau rapport →
                  </Link>
                  <Link to="/historique"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border bg-muted/40 hover:bg-muted text-sm text-foreground transition-colors">
                    <History size={14} className="text-primary" />
                    Voir l'historique →
                  </Link>
                  <Link to="/reclamations"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border bg-muted/40 hover:bg-muted text-sm text-foreground transition-colors">
                    <FileText size={14} className="text-muted-foreground" />
                    Soumettre une réclamation →
                  </Link>
                </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </AppLayout>
  );
}
