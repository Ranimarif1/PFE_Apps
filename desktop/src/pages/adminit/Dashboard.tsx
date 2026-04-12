import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { getComplaints, type Complaint } from "@/services/complaintsService";
import { getReports, type Report } from "@/services/reportsService";
import { getTrainingData, type TrainingEntry } from "@/services/audioService";
import { useQuery } from "@tanstack/react-query";
import {
  MessageSquare, Clock, CheckCircle,
  LayoutGrid, Activity, Server,
  Database, FileAudio, FileText,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const fmtDuration = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const COMPLAINT_LABEL: Record<string, string> = {
  pending:     "En attente",
  in_progress: "En cours",
  resolved:    "Traitée",
};
const COMPLAINT_CLS: Record<string, string> = {
  pending:     "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  resolved:    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
};

function buildWeeklyData(complaints: Complaint[]) {
  const map: Record<string, number> = {};
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
    map[key] = 0;
  }
  complaints.forEach(c => {
    const key = new Date(c.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
    if (key in map) map[key]++;
  });
  return Object.entries(map).map(([date, value]) => ({ date, value }));
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
        {delta && <p className="text-[10px] mt-0.5 font-medium text-muted-foreground">{delta}</p>}
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
export default function AdminITDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"apercu" | "systeme">("apercu");

  const { data: complaints = [] } = useQuery<Complaint[]>   ({ queryKey: ["complaints"], queryFn: getComplaints   });
  const { data: reports    = [] } = useQuery<Report[]>      ({ queryKey: ["reports"],    queryFn: getReports      });
  const { data: training   = [] } = useQuery<TrainingEntry[]>({ queryKey: ["training"],  queryFn: getTrainingData });

  /* ── computed ── */
  const total      = complaints.length;
  const pending    = complaints.filter(c => c.status === "pending").length;
  const inProgress = complaints.filter(c => c.status === "in_progress").length;
  const resolved   = complaints.filter(c => c.status === "resolved").length;

  const weeklyData        = buildWeeklyData(complaints);
  const recent5           = complaints.slice(0, 5);

  /* ── training stats ── */
  const trainingTotal     = training.length;
  const trainingValidated = training.filter(e => e.status !== "draft").length;
  const trainingDuration  = fmtDuration(training.reduce((s, e) => s + (e.duration || 0), 0));

  /* ── services status ── */
  const services = [
    { name: "Django API",  port: ":8000",  ok: true },
    { name: "Node Server", port: ":4000",  ok: true },
    { name: "Modèle IA",   port: "v2.4.1", ok: true },
  ];

  return (
    <AppLayout title="Tableau de bord">

      {/* ══ KPI strip ══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border border-b border-border -mx-6 -mt-6">
        <Kpi value={total}      label="Total réclamations"  iconBg="bg-blue-100 dark:bg-blue-900/30 text-blue-700"    icon={MessageSquare} delta={`${total} reçues`} />
        <Kpi value={pending}    label="En attente"           iconBg="bg-amber-100 dark:bg-amber-900/30 text-amber-600" icon={Clock}         valueColor={pending > 0 ? "text-amber-600" : undefined} />
        <Kpi value={inProgress} label="En cours"             iconBg="bg-purple-100 dark:bg-purple-900/30 text-purple-600" icon={MessageSquare} />
        <Kpi value={resolved}   label="Traitées"             iconBg="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700" icon={CheckCircle} delta={total > 0 ? `${Math.round((resolved/total)*100)}% du total` : undefined} />
      </div>

      {/* ══ Tabs bar ═══════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-0 border-b border-border -mx-6 px-2 bg-card">
        <Tab active={tab === "apercu"}  onClick={() => setTab("apercu")}  icon={LayoutGrid} label="Aperçu"  />
        <Tab active={tab === "systeme"} onClick={() => setTab("systeme")} icon={Server}     label="Système" />
      </div>

      {/* ══ Content ════════════════════════════════════════════════════════ */}
      <div className="pt-5">

        {/* ── Aperçu ─────────────────────────────────────────────────────── */}
        {tab === "apercu" && (
          <div className="space-y-4">

            {/* Row 1: chart + répartition */}
            <div className="grid lg:grid-cols-5 gap-4">
              {/* Weekly line chart */}
              <div className="lg:col-span-3 bg-card border border-border rounded-xl">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="text-sm font-medium text-foreground">Réclamations — 7 derniers jours</span>
                  <span className="text-[10px] bg-muted border border-border rounded px-2 py-0.5 text-muted-foreground">semaine</span>
                </div>
                <div className="p-4">
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={weeklyData} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                      <Line type="monotone" dataKey="value" stroke="#4cc9c0" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Répartition */}
              <div className="lg:col-span-2 bg-card border border-border rounded-xl">
                <div className="px-4 py-3 border-b border-border">
                  <span className="text-sm font-medium text-foreground">Répartition des réclamations</span>
                </div>
                <div className="p-4 space-y-1">
                  <HBar label="En attente" value={pending}    total={total} color="#f5a828" />
                  <HBar label="En cours"   value={inProgress} total={total} color="#8b5cf6" />
                  <HBar label="Traitées"   value={resolved}   total={total} color="#4cc9c0" />
                  <div className="pt-4 mt-2 border-t border-border flex flex-col gap-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Total réclamations</span>
                      <span className="font-semibold text-foreground">{total}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Taux résolution</span>
                      <span className="font-semibold text-foreground">
                        {total > 0 ? `${Math.round((resolved / total) * 100)}%` : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: training dataset stats */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Database size={14} className="text-primary" /> Dataset d'entraînement
                </span>
                <button onClick={() => navigate("/adminit/training")} className="text-xs text-teal-600 hover:underline">Voir tout →</button>
              </div>
              <div className="grid grid-cols-3 divide-x divide-border">
                <div className="px-5 py-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Database size={15} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">{trainingTotal}</p>
                    <p className="text-[11px] text-muted-foreground">Paires Audio|Texte</p>
                  </div>
                </div>
                <div className="px-5 py-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center text-success shrink-0">
                    <FileAudio size={15} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">{trainingValidated}</p>
                    <p className="text-[11px] text-muted-foreground">Validés / Enregistrés</p>
                  </div>
                </div>
                <div className="px-5 py-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                    <FileText size={15} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">{trainingDuration}</p>
                    <p className="text-[11px] text-muted-foreground">Durée totale</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: recent complaints + actions + services */}
            <div className="grid lg:grid-cols-3 gap-4">
              {/* Réclamations récentes */}
              <div className="lg:col-span-2 bg-card border border-border rounded-xl">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="text-sm font-medium text-foreground">Réclamations récentes</span>
                  <button onClick={() => navigate("/adminit/reclamations")} className="text-xs text-teal-600 hover:underline">Voir tout →</button>
                </div>
                {recent5.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <MessageSquare size={24} className="opacity-25 mb-2" />
                    <p className="text-xs">Aucune réclamation reçue</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {recent5.map((c, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground">{c.title ?? "—"}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{c.description ?? "Sans description"}</p>
                        </div>
                        <span className={cn("text-[10px] px-2 py-0.5 rounded font-semibold shrink-0", COMPLAINT_CLS[c.status] ?? "bg-muted text-muted-foreground")}>
                          {COMPLAINT_LABEL[c.status] ?? c.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions rapides + services */}
              <div className="bg-card border border-border rounded-xl">
                <div className="px-4 py-3 border-b border-border">
                  <span className="text-sm font-medium text-foreground">Actions rapides</span>
                </div>
                <div className="p-4 flex flex-col gap-2">
                  <button onClick={() => navigate("/adminit/reclamations")}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-sm text-foreground transition-colors text-left">
                    <MessageSquare size={14} className="text-teal-600" />
                    Gérer les réclamations →
                  </button>
                  <button onClick={() => navigate("/adminit/admins")}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-sm text-foreground transition-colors text-left">
                    <CheckCircle size={14} className="text-blue-600" />
                    Comptes administrateurs →
                  </button>
                  <button onClick={() => navigate("/adminit/training")}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-sm text-foreground transition-colors text-left">
                    <Database size={14} className="text-primary" />
                    Données d'entraînement →
                  </button>
                </div>

                {/* Services status */}
                <div className="px-4 pb-4">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Services</p>
                  <div className="flex flex-col gap-1.5">
                    {services.map(s => (
                      <div key={s.name} className="flex items-center gap-2">
                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", s.ok ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                        <span className="text-xs text-foreground">{s.name}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground">{s.port}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Système ────────────────────────────────────────────────────── */}
        {tab === "systeme" && (
          <div className="space-y-4">
            <div className="mb-2">
              <p className="text-sm font-semibold text-foreground">Monitoring système</p>
              <p className="text-xs text-muted-foreground mt-0.5">État des services et de l'infrastructure</p>
            </div>

            {/* Services cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {[
                { name: "Django API",   port: ":8000",  ok: true,  detail: "API REST principale" },
                { name: "Node Server",  port: ":4000",  ok: true,  detail: "WebSocket + Socket.io" },
                { name: "Modèle IA",    port: "v2.4.1", ok: true,  detail: "Transcription médicale" },
              ].map(s => (
                <div key={s.name} className="bg-card border border-border rounded-xl px-5 py-4 flex items-center gap-4">
                  <div className={cn("w-3 h-3 rounded-full shrink-0", s.ok ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.detail}</p>
                  </div>
                  <span className={cn("text-[10px] px-2 py-1 rounded font-semibold",
                    s.ok ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400")}>
                    {s.ok ? "En ligne" : "Hors ligne"}
                  </span>
                </div>
              ))}
            </div>

            {/* Model info + transcriptions */}
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-xl">
                <div className="px-4 py-3 border-b border-border">
                  <span className="text-sm font-medium text-foreground">Modèle IA — Informations</span>
                </div>
                <div className="divide-y divide-border">
                  {[
                    { label: "Version",      value: "v2.4.1"             },
                    { label: "Langage",      value: "Français médical"   },
                    { label: "Statut",       value: "Actif"              },
                    { label: "Spécialité",   value: "Radiologie"         },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <span className="text-xs font-semibold text-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl">
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                  <Database size={13} className="text-primary" />
                  <span className="text-sm font-medium text-foreground">Dataset d'entraînement</span>
                </div>
                <div className="divide-y divide-border">
                  {[
                    { label: "Paires Audio|Texte",   value: trainingTotal     },
                    { label: "Validés / Enregistrés", value: trainingValidated },
                    { label: "Durée totale audio",    value: trainingDuration  },
                    { label: "Total rapports",        value: reports.length    },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <span className="text-xs font-semibold text-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
