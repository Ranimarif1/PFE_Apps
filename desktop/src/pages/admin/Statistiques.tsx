import { AppLayout } from "@/components/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { getUsers, type BackendUserRecord } from "@/services/usersService";
import { getReports, type Report } from "@/services/reportsService";
import { generateChartData } from "@/data/MockData";
import { Users, FileText, CheckCircle, Clock } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";
import { cn } from "@/lib/utils";

const chartData  = generateChartData(30);
const chartData7 = generateChartData(7);

const TEAL   = "#4cc9c0";
const AMBER  = "#f5a828";
const BLUE   = "#3b82f6";
const PURPLE = "#8b5cf6";
const RED    = "#ef4444";

/* ─── KPI ─── */
function Kpi({ value, label, icon: Icon, iconBg, sub }: {
  value: number | string; label: string; icon: React.ElementType; iconBg: string; sub?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl flex items-center gap-4 px-5 py-4">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-semibold leading-none tracking-tight text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
        {sub && <p className="text-[10px] text-teal-600 mt-0.5 font-medium">{sub}</p>}
      </div>
    </div>
  );
}

/* ─── Section heading ─── */
function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
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
    { name: "Validés",     value: validRpts  || 0 },
    { name: "Brouillons",  value: draftRpts  || 0 },
    { name: "Enregistrés", value: savedRpts  || 0 },
  ];

  const weekBar = chartData7.map((d, i) => ({ ...d, label: ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"][i] }));

  return (
    <AppLayout title="Statistiques">
      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi value={doctors.length}  label="Total médecins"  icon={Users}       iconBg="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700" sub={`↑ ${validated} validés`} />
        <Kpi value={pending}         label="En attente"       icon={Clock}       iconBg="bg-amber-100 dark:bg-amber-900/30 text-amber-600"       sub={pending > 0 ? "Nécessite action" : "Aucun en attente"} />
        <Kpi value={totalRpts}       label="Total rapports"   icon={FileText}    iconBg="bg-blue-100 dark:bg-blue-900/30 text-blue-700"          />
        <Kpi value={validRpts}       label="Rapports validés" icon={CheckCircle} iconBg="bg-teal-100 dark:bg-teal-900/30 text-teal-700"          sub={totalRpts > 0 ? `${Math.round((validRpts/totalRpts)*100)}% du total` : undefined} />
      </div>

      {/* ── Activity charts ── */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* 30-day line */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-medium text-foreground">Rapports — 30 derniers jours</span>
            <span className="text-[10px] bg-muted border border-border rounded px-2 py-0.5 text-muted-foreground">30j</span>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={4} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                <Line type="monotone" dataKey="rapports" stroke={TEAL} strokeWidth={1.8} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 7-day bar */}
        <div className="bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-medium text-foreground">Cette semaine</span>
            <span className="text-[10px] bg-muted border border-border rounded px-2 py-0.5 text-muted-foreground">7j</span>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weekBar} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                <Bar dataKey="rapports" radius={[4, 4, 0, 0]} fill={BLUE} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Pie charts ── */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        {/* Médecins pie */}
        <div className="bg-card border border-border rounded-xl">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-sm font-medium text-foreground">Répartition des médecins</span>
          </div>
          <div className="p-4 flex items-center gap-4">
            <ResponsiveContainer width="50%" height={160}>
              <PieChart>
                <Pie data={userPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                  {userPieData.map((_, i) => <Cell key={i} fill={[TEAL, AMBER, RED][i]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-3">
              {[
                { label: "Validés",    value: validated, color: TEAL  },
                { label: "En attente", value: pending,   color: AMBER },
                { label: "Refusés",    value: refused,   color: RED   },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <strong className="ml-auto pl-4 text-sm text-foreground">{item.value}</strong>
                </div>
              ))}
              <div className="pt-2 border-t border-border text-xs text-muted-foreground">
                Total: <strong className="text-foreground">{doctors.length}</strong> médecins
              </div>
            </div>
          </div>
        </div>

        {/* Rapports pie */}
        <div className="bg-card border border-border rounded-xl">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-sm font-medium text-foreground">Répartition des rapports</span>
          </div>
          <div className="p-4 flex items-center gap-4">
            <ResponsiveContainer width="50%" height={160}>
              <PieChart>
                <Pie data={rptPieData.filter(d => d.value > 0).length > 0 ? rptPieData : [{ name: "Aucun", value: 1 }]}
                  cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                  {rptPieData.map((_, i) => <Cell key={i} fill={[TEAL, AMBER, PURPLE][i]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-3">
              {[
                { label: "Validés",     value: validRpts,  color: TEAL   },
                { label: "Brouillons",  value: draftRpts,  color: AMBER  },
                { label: "Enregistrés", value: savedRpts,  color: PURPLE },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <strong className="ml-auto pl-4 text-sm text-foreground">{item.value}</strong>
                </div>
              ))}
              <div className="pt-2 border-t border-border text-xs text-muted-foreground">
                Total: <strong className="text-foreground">{totalRpts}</strong> rapports
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Summary table ── */}
      <SectionTitle title="Résumé par statut médecin" />
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              {["Statut", "Nombre", "Pourcentage", "Tendance"].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[
              { label: "Validés",    value: validated, color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400", trend: "↑ actif" },
              { label: "En attente", value: pending,   color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",         trend: pending > 0 ? "! action requise" : "—" },
              { label: "Refusés",    value: refused,   color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",                 trend: "—" },
            ].map(row => (
              <tr key={row.label} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <span className={cn("text-[11px] px-2.5 py-1 rounded font-semibold", row.color)}>{row.label}</span>
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-foreground">{row.value}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {doctors.length > 0 ? `${Math.round((row.value / doctors.length) * 100)}%` : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{row.trend}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
