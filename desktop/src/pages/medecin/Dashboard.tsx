import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { getReports, type Report } from "@/services/reportsService";
import { useQuery } from "@tanstack/react-query";
import {
  FileText, CheckCircle, Clock, Eye, Plus, LayoutGrid,
  Activity, History, Mic, Search,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

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
function rptLabel(s: string) {
  return { draft: "Brouillon", validated: "Validé", saved: "Enregistré" }[s] ?? s;
}
function rptCls(s: string) {
  return {
    draft:     "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    validated: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    saved:     "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  }[s] ?? "bg-muted text-muted-foreground";
}

/* ─── KPI card ─────────────────────────────────────────────────────────────── */
function Kpi({ value, label, delta, iconBg, icon: Icon, valueColor }: {
  value: number | string; label: string; delta?: string;
  iconBg: string; icon: React.ElementType; valueColor?: string;
}) {
  return (
    <div className="bg-card flex items-center gap-3 px-5 py-4">
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
        <Icon size={16} />
      </div>
      <div>
        <p className={cn("text-2xl font-semibold leading-none tracking-tight", valueColor ?? "text-foreground")}>{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
        {delta && (
          <p className="text-[10px] mt-0.5 font-medium"
            style={{ color: delta.startsWith("↑") ? "#16a34a" : "#6b7280" }}>
            {delta}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Tab button ───────────────────────────────────────────────────────────── */
function Tab({ active, onClick, icon: Icon, label, count }: {
  active: boolean; onClick: () => void; icon: React.ElementType; label: string; count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-4 py-3.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap",
        active ? "border-teal-600 text-foreground font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon size={13} />
      {label}
      {count !== undefined && (
        <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-semibold border",
          active ? "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700"
                 : "bg-muted text-muted-foreground border-border")}>
          {count}
        </span>
      )}
    </button>
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
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const [tab, setTab]       = useState<"apercu" | "rapports" | "activite">("apercu");
  const [search, setSearch] = useState("");

  const { data: reports = [] } = useQuery<Report[]>({ queryKey: ["reports"], queryFn: getReports });

  /* ── computed ── */
  const total     = reports.length;
  const validated = reports.filter(r => r.status === "validated").length;
  const drafts    = reports.filter(r => r.status === "draft").length;
  const saved     = reports.filter(r => r.status === "saved").length;
  const last      = reports[0];

  /* ── filtered for rapports tab ── */
  const filtered = search
    ? reports.filter(r => r.ID_Exam.toLowerCase().includes(search.toLowerCase()))
    : reports;

  /* ── recent 5 for apercu ── */
  const recent5 = reports.slice(0, 5);

  return (
    <AppLayout title="Tableau de bord">

      {/* ══ KPI strip ══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border border-b border-border -mx-6 -mt-6">
        <Kpi value={total}     label="Total rapports"         iconBg="bg-blue-100 dark:bg-blue-900/30 text-blue-700"    icon={FileText}    delta={`↑ +${total} au total`} />
        <Kpi value={validated} label="Validés"                iconBg="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700" icon={CheckCircle} delta={`↑ ${validated} validés`} />
        <Kpi value={drafts}    label="Brouillons"             iconBg="bg-amber-100 dark:bg-amber-900/30 text-amber-600"  icon={Clock}       valueColor={drafts > 0 ? "text-amber-600" : undefined} />
        <Kpi value={last?.ID_Exam ?? "—"} label="Dernière transcription" iconBg="bg-purple-100 dark:bg-purple-900/30 text-purple-600" icon={Mic} />
      </div>

      {/* ══ Tabs bar ═══════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-0 border-b border-border -mx-6 px-2 bg-card">
        <Tab active={tab === "apercu"}   onClick={() => setTab("apercu")}   icon={LayoutGrid} label="Aperçu"    />
        <Tab active={tab === "rapports"} onClick={() => setTab("rapports")} icon={History}    label="Rapports" count={total} />
        <Tab active={tab === "activite"} onClick={() => setTab("activite")} icon={Activity}   label="Activité" />
      </div>

      {/* ══ Content ════════════════════════════════════════════════════════ */}
      <div className="pt-5">

        {/* ── Aperçu ─────────────────────────────────────────────────────── */}
        {tab === "apercu" && (
          <div className="space-y-4">

            {/* Row 1: chart + répartition */}
            <div className="grid lg:grid-cols-5 gap-4">
              {/* Activity chart */}
              <div className="lg:col-span-3 bg-card border border-border rounded-xl">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="text-sm font-medium text-foreground">Activité — 30 derniers jours</span>
                  <span className="text-[10px] bg-muted border border-border rounded px-2 py-0.5 text-muted-foreground">rapports</span>
                </div>
                <div className="p-4">
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={buildChartData(reports)} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={4} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }}
                        cursor={{ stroke: "hsl(var(--muted))" }}
                      />
                      <Line type="monotone" dataKey="rapports" stroke="#4cc9c0" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Répartition statuts */}
              <div className="lg:col-span-2 bg-card border border-border rounded-xl">
                <div className="px-4 py-3 border-b border-border">
                  <span className="text-sm font-medium text-foreground">Répartition des rapports</span>
                </div>
                <div className="p-4 space-y-1">
                  <HBar label="Validés"    value={validated} total={total} color="#4cc9c0" />
                  <HBar label="Brouillons" value={drafts}    total={total} color="#f5a828" />
                  <HBar label="Enregistrés"value={saved}     total={total} color="#8b5cf6" />
                  <div className="pt-4 mt-2 border-t border-border flex flex-col gap-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Total rapports</span>
                      <span className="font-semibold text-foreground">{total}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Taux validation</span>
                      <span className="font-semibold text-foreground">{total > 0 ? Math.round((validated / total) * 100) : 0}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: recent + actions */}
            <div className="grid lg:grid-cols-3 gap-4">
              {/* Rapports récents */}
              <div className="lg:col-span-2 bg-card border border-border rounded-xl">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="text-sm font-medium text-foreground">Rapports récents</span>
                  <button onClick={() => setTab("rapports")} className="text-xs text-teal-600 hover:underline">Voir tout →</button>
                </div>
                {recent5.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <FileText size={24} className="opacity-25 mb-2" />
                    <p className="text-xs">Aucun rapport pour le moment</p>
                    <Link to="/rapport/nouveau"
                      className="mt-3 text-xs bg-teal-600 text-white px-3 py-1.5 rounded-lg hover:bg-teal-700 transition-colors">
                      Créer mon premier rapport
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {recent5.map(r => (
                      <div key={r._id} className="flex items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-mono font-medium text-foreground">{r.ID_Exam}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("fr-FR")}</p>
                        </div>
                        <span className={cn("text-[10px] px-2 py-0.5 rounded font-semibold shrink-0", rptCls(r.status))}>
                          {rptLabel(r.status)}
                        </span>
                        <button onClick={() => navigate(`/rapport/${r._id}`)}
                          className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium transition-colors shrink-0">
                          <Eye size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions rapides */}
              <div className="bg-card border border-border rounded-xl">
                <div className="px-4 py-3 border-b border-border">
                  <span className="text-sm font-medium text-foreground">Actions rapides</span>
                </div>
                <div className="p-4 flex flex-col gap-2">
                  <Link to="/rapport/nouveau"
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-sm text-foreground transition-colors">
                    <Plus size={14} className="text-teal-600" />
                    Nouveau rapport →
                  </Link>
                  <button onClick={() => setTab("rapports")}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-sm text-foreground transition-colors text-left">
                    <History size={14} className="text-blue-600" />
                    Voir l'historique →
                  </button>
                  <Link to="/reclamations"
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-sm text-foreground transition-colors">
                    <FileText size={14} className="text-purple-600" />
                    Soumettre une réclamation →
                  </Link>
                </div>

                {/* Today */}
                <div className="px-4 py-3 border-t border-border">
                  <p className="text-[10px] text-muted-foreground">Aujourd'hui</p>
                  <p className="text-xs font-semibold text-foreground mt-0.5 capitalize">
                    {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Bonjour, Dr. {user?.prénom} {user?.nom}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Rapports ─────────────────────────────────────────────────────── */}
        {tab === "rapports" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Mes rapports</p>
                <p className="text-xs text-muted-foreground mt-0.5">{total} comptes rendus radiologiques</p>
              </div>
              <Link to="/rapport/nouveau"
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors"
                style={{ background: "#0c1220", color: "#4cc9c0", borderColor: "rgba(76,201,192,0.3)" }}>
                <Plus size={11} /> Nouveau rapport
              </Link>
            </div>

            {/* 3 mini stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "Validés",     value: validated, color: "text-teal-600"   },
                { label: "Brouillons",  value: drafts,    color: "text-amber-600"  },
                { label: "Enregistrés", value: saved,     color: "text-purple-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-muted/50 border border-border rounded-xl py-3 px-4 text-center">
                  <p className={cn("text-2xl font-semibold tracking-tight leading-none", color)}>{value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 mb-4 bg-card">
              <Search size={13} className="text-muted-foreground shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher par ID Examen..."
                className="flex-1 text-xs bg-transparent text-foreground placeholder:text-muted-foreground outline-none" />
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "30%" }} /><col style={{ width: "25%" }} />
                  <col style={{ width: "20%" }} /><col style={{ width: "15%" }} /><col style={{ width: "10%" }} />
                </colgroup>
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    {["ID Examen", "Date", "Statut", "Score IA", "Action"].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-xs text-muted-foreground">
                      <FileText size={20} className="opacity-25 mb-2 mx-auto" />
                      Aucun rapport trouvé
                    </td></tr>
                  )}
                  {filtered.map(r => (
                    <tr key={r._id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-foreground">{r.ID_Exam}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("fr-FR")}</td>
                      <td className="px-4 py-3">
                        <span className={cn("text-[10px] px-2 py-0.5 rounded font-semibold", rptCls(r.status))}>
                          {rptLabel(r.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">—</td>
                      <td className="px-4 py-3">
                        <button onClick={() => navigate(`/rapport/${r._id}`)}
                          className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium transition-colors">
                          <Eye size={12} /> Voir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Activité ─────────────────────────────────────────────────────── */}
        {tab === "activite" && (
          <div>
            <div className="mb-4">
              <p className="text-sm font-semibold text-foreground">Journal d'activité</p>
              <p className="text-xs text-muted-foreground mt-0.5">Vos dernières actions sur la plateforme</p>
            </div>
            <div className="bg-card border border-border rounded-xl divide-y divide-border">
              {reports.slice(0, 8).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Activity size={24} className="opacity-25 mb-2" />
                  <p className="text-xs">Aucune activité récente</p>
                </div>
              ) : (
                reports.slice(0, 8).map(r => (
                  <div key={r._id} className="flex items-start gap-3 px-4 py-3.5">
                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                      r.status === "validated" ? "bg-emerald-100 dark:bg-emerald-900/30" :
                      r.status === "draft"     ? "bg-amber-100 dark:bg-amber-900/30"    :
                                                 "bg-blue-100 dark:bg-blue-900/30")}>
                      <FileText size={13} className={
                        r.status === "validated" ? "text-emerald-600" :
                        r.status === "draft"     ? "text-amber-600"   : "text-blue-600"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">Rapport {r.ID_Exam}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(r.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} · {rptLabel(r.status)}
                      </p>
                    </div>
                    <button onClick={() => navigate(`/rapport/${r._id}`)}
                      className="text-[10px] text-teal-600 hover:underline shrink-0">Voir</button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
