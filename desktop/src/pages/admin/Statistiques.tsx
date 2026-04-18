import { AppLayout } from "@/components/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { getUsers, type BackendUserRecord } from "@/services/usersService";
import { getReports, type Report } from "@/services/reportsService";
import { generateChartData } from "@/data/MockData";
import { Users, FileText, CheckCircle, Clock } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";
import { cn } from "@/lib/utils";
import { getStatusBadgeClass, getStatusLabel } from "@/styles/statusSystem";

const chartData  = generateChartData(30);
const chartData7 = generateChartData(7);

/* ─── Chart palette — aligned with calendar markers ─── */
const INFO      = "#4A7BBE";   // darkest calendar blue
const HIGHLIGHT = "#D97706";   // calendar "today" orange
const POSITIVE  = "#059669";   // emerald that pairs with blue + orange
const CARAMEL   = "#4A7BBE";   // kept name for backcompat; same as INFO
const BRICK     = "#DC2626";   // semantic red for charts

/* ─── KPI ─── */
function Kpi({ value, label, icon: Icon, iconBg, iconColor, sub }: {
  value: number | string; label: string; icon: React.ElementType; iconBg: string; iconColor: string; sub?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl flex items-center gap-4 px-5 py-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
           style={{ background: iconBg, color: iconColor }}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-semibold leading-none tracking-tight text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
        {sub && <p className="text-[10px] text-primary mt-0.5 font-medium">{sub}</p>}
      </div>
    </div>
  );
}

export default function AdminStatistiques() {
  const { data: users   = [] } = useQuery<BackendUserRecord[]>({ queryKey: ["users"],   queryFn: getUsers   });
  const { data: reports = [] } = useQuery<Report[]>           ({ queryKey: ["reports"], queryFn: getReports });

  const doctors   = users.filter(u => u.role === "doctor");
  const validated = doctors.filter(u => u.status === "validated").length;
  const pending   = doctors.filter(u => u.status === "pending").length;
  const refused   = doctors.filter(u => u.status === "refused").length;

  const totalRpts   = reports.length;
  const draftRpts   = reports.filter(r => r.status === "draft").length;
  const validRpts   = reports.filter(r => r.status === "validated").length;
  const savedRpts   = reports.filter(r => r.status === "saved").length;

  const userPieData = [
    { name: "Validés",    value: validated || 1 },
    { name: "En attente", value: pending   || 0 },
    { name: "Refusés",    value: refused   || 0 },
  ].filter(d => d.value > 0);

  const rptPieData = [
    { name: "Validés",     value: validRpts || 0 },
    { name: "Brouillons",  value: draftRpts || 0 },
    { name: "Enregistrés", value: savedRpts || 0 },
  ];

  const weekBar = chartData7.map((d, i) => ({ ...d, label: ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"][i] }));

  return (
    <AppLayout title="Statistiques">
      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <Kpi value={doctors.length}  label="Total médecins"  icon={Users}       iconBg="bg-[rgba(143,188,230,0.14)] text-[#4C6F91]"  sub={`↑ ${validated} validés`} />
        <Kpi value={pending}         label="En attente"       icon={Clock}       iconBg="bg-[rgba(245,158,11,0.14)] text-[#92400E]"  sub={pending > 0 ? "Nécessite action" : "Aucun en attente"} />
        <Kpi value={totalRpts}       label="Total rapports"   icon={FileText}    iconBg="bg-primary/10 text-primary"      />
        <Kpi value={validRpts}       label="Rapports validés" icon={CheckCircle} iconBg="bg-[rgba(143,211,179,0.14)] text-[#4D7F67]"  sub={totalRpts > 0 ? `${Math.round((validRpts/totalRpts)*100)}% du total` : undefined} />
      </div>

      {/* ── Activity charts ── */}
      <div className="grid lg:grid-cols-3 gap-3 mb-3">
        {/* 30-day line */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-sm font-medium text-foreground">Rapports — 30 derniers jours</span>
            <span className="text-[10px] bg-muted border border-border rounded px-2 py-0.5 text-muted-foreground">30j</span>
          </div>
          <div className="px-3 py-2">
            <ResponsiveContainer width="100%" height={110}>
              <LineChart data={chartData} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={4} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                <Line type="monotone" dataKey="rapports" stroke={CARAMEL} strokeWidth={1.8} dot={false} activeDot={{ r: 3, fill: INFO }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 7-day bar */}
        <div className="bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-sm font-medium text-foreground">Cette semaine</span>
            <span className="text-[10px] bg-muted border border-border rounded px-2 py-0.5 text-muted-foreground">7j</span>
          </div>
          <div className="px-3 py-2">
            <ResponsiveContainer width="100%" height={110}>
              <BarChart data={weekBar} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                <Bar dataKey="rapports" radius={[4, 4, 0, 0]} fill={INFO} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Pies + Summary in a single row ── */}
      <div className="grid lg:grid-cols-3 gap-3">
        {/* Médecins pie */}
        <div className="bg-card border border-border rounded-xl">
          <div className="px-3 py-2 border-b border-border">
            <span className="text-sm font-medium text-foreground">Répartition des médecins</span>
          </div>
          <div className="px-3 py-2 flex items-center gap-3">
            <ResponsiveContainer width="45%" height={120}>
              <PieChart>
                <Pie data={userPieData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" paddingAngle={3}>
                  {userPieData.map((_, i) => <Cell key={i} fill={[POSITIVE, HIGHLIGHT, BRICK][i]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              {[
                { label: "Validés",    value: validated, color: POSITIVE   },
                { label: "En attente", value: pending,   color: HIGHLIGHT },
                { label: "Refusés",    value: refused,   color: BRICK     },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                  <span className="text-[11px] text-muted-foreground">{item.label}</span>
                  <strong className="ml-auto text-xs text-foreground">{item.value}</strong>
                </div>
              ))}
              <div className="pt-1.5 mt-0.5 border-t border-border text-[10px] text-muted-foreground">
                Total: <strong className="text-foreground">{doctors.length}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Rapports pie */}
        <div className="bg-card border border-border rounded-xl">
          <div className="px-3 py-2 border-b border-border">
            <span className="text-sm font-medium text-foreground">Répartition des rapports</span>
          </div>
          <div className="px-3 py-2 flex items-center gap-3">
            <ResponsiveContainer width="45%" height={120}>
              <PieChart>
                <Pie data={rptPieData.filter(d => d.value > 0).length > 0 ? rptPieData : [{ name: "Aucun", value: 1 }]}
                  cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" paddingAngle={3}>
                  {rptPieData.map((_, i) => <Cell key={i} fill={[POSITIVE, HIGHLIGHT, CARAMEL][i]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              {[
                { label: "Validés",     value: validRpts, color: POSITIVE  },
                { label: "Brouillons",  value: draftRpts, color: HIGHLIGHT },
                { label: "Enregistrés", value: savedRpts, color: CARAMEL   },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                  <span className="text-[11px] text-muted-foreground">{item.label}</span>
                  <strong className="ml-auto text-xs text-foreground">{item.value}</strong>
                </div>
              ))}
              <div className="pt-1.5 mt-0.5 border-t border-border text-[10px] text-muted-foreground">
                Total: <strong className="text-foreground">{totalRpts}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Summary table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-border">
            <span className="text-sm font-medium text-foreground">Résumé médecins</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                {["Statut", "Nb", "%"].map(h => (
                  <th key={h} className="text-left px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { key: "validated", value: validated },
                { key: "pending",   value: pending   },
                { key: "refused",   value: refused   },
              ].map(row => (
                <tr key={row.key} className="hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-1.5">
                    <span className={cn(getStatusBadgeClass(row.key), "text-[10px]")}>
                      {getStatusLabel(row.key, "user")}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-xs font-semibold text-foreground">{row.value}</td>
                  <td className="px-3 py-1.5 text-xs text-muted-foreground">
                    {doctors.length > 0 ? `${Math.round((row.value / doctors.length) * 100)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
