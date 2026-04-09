import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsers, updateUserStatus, deleteUser, changeUserRole, type BackendUserRecord } from "@/services/usersService";
import { getReports, type Report } from "@/services/reportsService";
import { getComplaints } from "@/services/complaintsService";
import {
  Users, Clock, FileText, AlertTriangle, Check, X, Trash2,
  Search, Eye, Plus, LayoutGrid, Activity, MessageSquare, UserRoundCheck, Download,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

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
const STATUS_LABEL: Record<string, string> = { pending: "En attente", validated: "Validé", refused: "Refusé" };
const STATUS_CLS: Record<string, string>   = {
  pending:   "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  validated: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  refused:   "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

function rptLabel(s: string) { return { draft: "Brouillon", validated: "Validé", saved: "Enregistré" }[s] ?? s; }
function rptCls(s: string) {
  return { draft: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
           validated: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
           saved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" }[s]
    ?? "bg-muted text-muted-foreground";
}

/* ─── KPI card ─────────────────────────────────────────────────────────────── */
function Kpi({
  value, label, delta, iconBg, icon: Icon, valueColor,
}: {
  value: number; label: string; delta?: string; iconBg: string;
  icon: React.ElementType; valueColor?: string;
}) {
  return (
    <div className="bg-card flex items-center gap-3 px-5 py-4">
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
        <Icon size={16} />
      </div>
      <div>
        <p className={cn("text-2xl font-semibold leading-none tracking-tight", valueColor ?? "text-foreground")}>{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
        {delta && <p className="text-[10px] mt-0.5 font-medium" style={{ color: delta.startsWith("↑") ? "#16a34a" : delta.startsWith("!") ? "#dc2626" : "#6b7280" }}>{delta}</p>}
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
          ? "border-teal-600 text-foreground font-semibold"
          : "border-transparent text-muted-foreground hover:text-foreground"
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

  const mainTab    = (searchParams.get("tab")    as "apercu" | "medecins" | "rapports" | "activite") ?? "apercu";
  const userFilter = (searchParams.get("filter") as "all" | "validated" | "pending" | "refused")     ?? "all";

  const setMainTab    = (tab: string) => setSearchParams({ tab });
  const setUserFilter = (filter: string) => setSearchParams({ tab: mainTab, filter });

  const [search,        setSearch]        = useState("");
  const [confirmDelete, setConfirmDelete] = useState<BackendUserRecord | null>(null);
  const [confirmPromote, setConfirmPromote] = useState<BackendUserRecord | null>(null);

  /* ── data ── */
  const { data: users      = [] } = useQuery<BackendUserRecord[]>({ queryKey: ["users"],      queryFn: getUsers      });
  const { data: reports    = [] } = useQuery<Report[]>           ({ queryKey: ["reports"],    queryFn: getReports    });
  const { data: complaints = [] } = useQuery                    ({ queryKey: ["complaints"], queryFn: getComplaints });

  /* ── computed ── */
  const doctors   = users.filter(u => u.role === "doctor");
  const pending   = doctors.filter(u => u.status === "pending").length;
  const validated = doctors.filter(u => u.status === "validated").length;
  const refused   = doctors.filter(u => u.status === "refused").length;

  const totalReports  = reports.length;
  const draftReports  = reports.filter(r => r.status === "draft").length;
  const validRpts     = reports.filter(r => r.status === "validated").length;
  const savedRpts     = reports.filter(r => r.status === "saved").length;
  const recentReports = reports.slice(0, 5);

  const reclamations = complaints.length;

  /* ── mutations ── */
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "validated" | "refused" }) => updateUserStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
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

  /* ── recent doctors (real data) ── */
  const recentConnections = doctors.slice(0, 5).map(d => ({
    initials: `${(d.prenom?.[0] ?? "").toUpperCase()}${(d.nom?.[0] ?? "").toUpperCase()}`,
    bg: d.status === "validated" ? "bg-emerald-100 dark:bg-emerald-900/30" : d.status === "pending" ? "bg-amber-100 dark:bg-amber-900/30" : "bg-red-100 dark:bg-red-900/30",
    color: d.status === "validated" ? "text-emerald-700" : d.status === "pending" ? "text-amber-700" : "text-red-700",
    name: `Dr. ${d.prenom} ${d.nom}`,
    sub: d.status === "pending" ? "En attente de validation" : d.status === "validated" ? `Validé — inscrit le ${new Date(d.createdAt).toLocaleDateString("fr-FR")}` : "Refusé",
    iconBg: "", iconColor: "",
  }));

  return (
    <AppLayout title="Tableau de bord">
      {/* ══ KPI strip ══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border border-b border-border -mx-6 -mt-6">
        <Kpi value={doctors.length} label="Total médecins"  iconBg="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700" icon={Users}         delta={`↑ +${doctors.length} ce mois`} />
        <Kpi value={pending}        label="En attente"       iconBg="bg-amber-100 dark:bg-amber-900/30 text-amber-600"       icon={Clock}          delta={pending > 0 ? `! ${pending} en attente` : "— aucun en attente"} valueColor={pending > 0 ? "text-amber-600" : undefined} />
        <Kpi value={totalReports}   label="Total rapports"   iconBg="bg-blue-100 dark:bg-blue-900/30 text-blue-700"          icon={FileText}       delta="— aucun ce mois" />
        <Kpi value={reclamations}   label="Réclamations soumises" iconBg="bg-purple-100 dark:bg-purple-900/30 text-purple-600" icon={MessageSquare}  delta="Réclamations envoyées" />
      </div>

      {/* ══ Tabs bar ═══════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-0 border-b border-border -mx-6 px-2 bg-card">
        <Tab active={mainTab === "apercu"}    onClick={() => setMainTab("apercu")}    icon={LayoutGrid}  label="Aperçu global" />
        <Tab active={mainTab === "medecins"}  onClick={() => setMainTab("medecins")}  icon={Users}       label="Médecins"  count={doctors.length} />
        <Tab active={mainTab === "rapports"}  onClick={() => setMainTab("rapports")}  icon={FileText}    label="Rapports"  count={totalReports} />
        <Tab active={mainTab === "activite"}  onClick={() => setMainTab("activite")}  icon={Activity}    label="Activité" />
      </div>

      {/* ══ Tab content ════════════════════════════════════════════════════ */}
      <div className="pt-5">

        {/* ── Aperçu global ────────────────────────────────────────────── */}
        {mainTab === "apercu" && (
          <div className="space-y-4">

            {/* Row 1: chart + répartition */}
            <div className="grid lg:grid-cols-5 gap-4">
              {/* Activity line chart */}
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

              {/* Répartition médecins */}
              <div className="lg:col-span-2 bg-card border border-border rounded-xl">
                <div className="px-4 py-3 border-b border-border">
                  <span className="text-sm font-medium text-foreground">Répartition médecins</span>
                </div>
                <div className="p-4 space-y-1">
                  <HBar label="Validés"    value={validated} total={doctors.length} color="#4cc9c0" />
                  <HBar label="En attente" value={pending}   total={doctors.length} color="#f5a828" />
                  <HBar label="Refusés"    value={refused}   total={doctors.length} color="#ef4444" />

                  <div className="pt-3 mt-3 border-t border-border">
                    <p className="text-xs font-medium text-foreground mb-3">Rapports par statut</p>
                    <div className="flex gap-3">
                      {/* Mini donut SVG */}
                      <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0">
                        {totalReports === 0 ? (
                          <circle cx="32" cy="32" r="24" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                        ) : (() => {
                          const segs = [
                            { value: validRpts,  color: "#4cc9c0" },
                            { value: draftReports, color: "#f5a828" },
                            { value: savedRpts,  color: "#8b5cf6" },
                          ].filter(s => s.value > 0);
                          const r = 24, circ = 2 * Math.PI * r;
                          let offset = -Math.PI / 2;
                          return segs.map((seg, i) => {
                            const pct = seg.value / totalReports;
                            const dash = pct * circ;
                            const rot = (offset / Math.PI) * 180 + 90;
                            offset += pct * 2 * Math.PI;
                            return (
                              <circle key={i} cx="32" cy="32" r={r} fill="none" stroke={seg.color}
                                strokeWidth="10" strokeDasharray={`${dash} ${circ - dash}`}
                                strokeDashoffset={0} transform={`rotate(${rot} 32 32)`} />
                            );
                          });
                        })()}
                      </svg>
                      <div className="flex flex-col gap-2 justify-center text-xs">
                        {[
                          { label: "Validés",    color: "#4cc9c0", val: validRpts   },
                          { label: "Brouillons", color: "#f5a828", val: draftReports },
                          { label: "En cours",   color: "#8b5cf6", val: savedRpts   },
                        ].map(item => (
                          <div key={item.label} className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                            {item.label}
                            <strong className="ml-auto pl-2 text-foreground">{item.val}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: connexions + rapports récents + actions rapides */}
            <div className="grid lg:grid-cols-3 gap-4">
              {/* Connexions récentes */}
              <div className="bg-card border border-border rounded-xl">
                <div className="px-4 py-3 border-b border-border">
                  <span className="text-sm font-medium text-foreground">Connexions récentes</span>
                </div>
                <div className="divide-y divide-border">
                  {recentConnections.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0", c.bg, c.color)}>
                        {c.initials}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{c.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rapports récents */}
              <div className="bg-card border border-border rounded-xl">
                <div className="px-4 py-3 border-b border-border">
                  <span className="text-sm font-medium text-foreground">Rapports récents</span>
                </div>
                {recentReports.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <FileText size={24} className="opacity-25 mb-2" />
                    <p className="text-xs">Aucun rapport pour l'instant</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {recentReports.map(r => (
                      <div key={r._id} className="flex items-center gap-3 px-4 py-3">
                        <div>
                          <p className="text-xs font-mono font-medium text-foreground">{r.ID_Exam}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("fr-FR")}</p>
                        </div>
                        <span className={cn("ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium", rptCls(r.status))}>
                          {rptLabel(r.status)}
                        </span>
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
                  <button
                    onClick={() => setMainTab("medecins")}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-sm text-foreground transition-colors text-left"
                  >
                    <Plus size={14} className="text-teal-600" />
                    Ajouter un médecin →
                  </button>
                  <button
                    onClick={() => setMainTab("rapports")}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-sm text-foreground transition-colors text-left"
                  >
                    <FileText size={14} className="text-blue-600" />
                    Voir tous les rapports →
                  </button>
                  <button
                    onClick={() => navigate("/reclamations")}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-sm text-foreground transition-colors text-left"
                  >
                    <MessageSquare size={14} className="text-purple-600" />
                    Soumettre une réclamation →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Médecins ─────────────────────────────────────────────────── */}
        {mainTab === "medecins" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Gestion des médecins</p>
                <p className="text-xs text-muted-foreground mt-0.5">{doctors.length} médecins enregistrés dans le service radiologie</p>
              </div>
              <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors"
                style={{ background: "#0c1220", color: "#4cc9c0", borderColor: "rgba(76,201,192,0.3)" }}>
                <Plus size={11} /> Nouveau médecin
              </button>
            </div>

            {/* Segment control */}
            <div className="inline-flex gap-1 bg-muted border border-border rounded-lg p-1 mb-4">
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
              <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
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
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
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
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold", STATUS_CLS[doc.status] ?? "bg-muted text-muted-foreground")}>
                          <span className="w-1 h-1 rounded-full bg-current" />
                          {STATUS_LABEL[doc.status] ?? doc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(doc.createdAt).toLocaleDateString("fr-FR")}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {doc.status === "pending" && (
                            <>
                              <button onClick={() => statusMutation.mutate({ id: doc._id, status: "validated" })}
                                disabled={statusMutation.isPending} title="Valider"
                                className="w-6 h-6 rounded-md border border-border bg-muted hover:bg-emerald-100 hover:border-emerald-300 hover:text-emerald-700 flex items-center justify-center transition-colors">
                                <Check size={11} />
                              </button>
                              <button onClick={() => statusMutation.mutate({ id: doc._id, status: "refused" })}
                                disabled={statusMutation.isPending} title="Refuser"
                                className="w-6 h-6 rounded-md border border-border bg-muted hover:bg-red-100 hover:border-red-300 hover:text-red-700 flex items-center justify-center transition-colors">
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
                            className="w-6 h-6 rounded-md border border-border bg-muted hover:bg-red-100 hover:border-red-300 hover:text-red-700 flex items-center justify-center transition-colors">
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
        )}

        {/* ── Rapports ─────────────────────────────────────────────────── */}
        {mainTab === "rapports" && (
          <div>
            <div className="mb-4">
              <p className="text-sm font-semibold text-foreground">Gestion des rapports</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tous les comptes rendus radiologiques de la plateforme</p>
            </div>

            {/* 3 mini stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "Validés",    value: validRpts,    color: "text-teal-600"  },
                { label: "Brouillons", value: draftReports, color: "text-amber-600" },
                { label: "En cours",   value: savedRpts,    color: "text-purple-600"},
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-muted/50 border border-border rounded-xl py-3 px-4 text-center">
                  <p className={cn("text-2xl font-semibold tracking-tight leading-none", color)}>{value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1.5">{label}</p>
                </div>
              ))}
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
              <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
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

        {/* ── Activité ─────────────────────────────────────────────────── */}
        {mainTab === "activite" && (
          <div>
            <div className="mb-4">
              <p className="text-sm font-semibold text-foreground">Journal d'activité</p>
              <p className="text-xs text-muted-foreground mt-0.5">Toutes les actions sur la plateforme</p>
            </div>
            <div className="bg-card border border-border rounded-xl divide-y divide-border">
              {reports.slice(0, 5).map(r => (
                <div key={r._id} className="flex items-start gap-3 px-4 py-3.5">
                  <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                    r.status === "saved" ? "bg-emerald-100 dark:bg-emerald-900/30" : r.status === "draft" ? "bg-amber-100 dark:bg-amber-900/30" : "bg-blue-100 dark:bg-blue-900/30")}>
                    <FileText size={13} className={r.status === "saved" ? "text-emerald-600" : r.status === "draft" ? "text-amber-600" : "text-blue-600"} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">Rapport {r.ID_Exam}{r.doctorName ? ` — Dr. ${r.doctorName}` : ""}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(r.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} · {rptLabel(r.status)}
                    </p>
                  </div>
                </div>
              ))}
              {reports.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Activity size={24} className="opacity-25 mb-2" />
                  <p className="text-xs">Aucune activité récente</p>
                </div>
              )}
            </div>
          </div>
        )}
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
                ⚠️ Cette action est irréversible. Le compte passera du rôle <strong>Médecin</strong> au rôle <strong>Admin</strong> et obtiendra tous les accès administrateur.
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
    </AppLayout>
  );
}
