import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { useAuth } from "@/contexts/AuthContext";
import { generateChartData } from "@/data/MockData";
import { getReports, type Report } from "@/services/reportsService";
import { useQuery } from "@tanstack/react-query";
import { FileText, CheckCircle, Clock, Mic, Plus, Eye } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const chartData = generateChartData(30);
const PIE_COLORS = ["hsl(38,95%,50%)", "hsl(210,90%,40%)", "hsl(145,65%,40%)"];

function statusLabel(s: string) {
  return { draft: "brouillon", validated: "validé", saved: "enregistré" }[s] ?? s;
}

function statusBadge(s: string) {
  return (
    { draft: "bg-warning/10 text-warning", validated: "bg-primary/10 text-primary", saved: "bg-success/10 text-success" }[s] ??
    "bg-muted text-muted-foreground"
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const { data: reports = [] } = useQuery<Report[]>({
    queryKey: ["reports"],
    queryFn: getReports,
  });

  const filtered = searchQuery
    ? reports.filter(r => r.ID_Exam.toLowerCase().includes(searchQuery.toLowerCase()))
    : reports.slice(0, 5);

  const total = reports.length;
  const saved = reports.filter(r => r.status === "saved" || r.status === "validated").length;
  const drafts = reports.filter(r => r.status === "draft").length;
  const last = reports[0];

  const pieData = [
    { name: "Brouillon", value: drafts },
    { name: "Validé", value: reports.filter(r => r.status === "validated").length },
    { name: "Enregistré", value: reports.filter(r => r.status === "saved").length },
  ];

  return (
    <AppLayout title="Tableau de bord" showSearch onSearch={setSearchQuery}>
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="gradient-hero rounded-2xl p-6 text-white mb-6 flex items-center justify-between overflow-hidden relative">
        <div className="absolute right-0 top-0 opacity-10 text-[120px] select-none">🩻</div>
        <div className="relative z-10">
          <p className="text-white/70 text-sm mb-1">🩻 Service Radiologie</p>
          <h2 className="text-2xl font-bold">Bienvenue, Dr. {user?.prénom} {user?.nom}</h2>
          <p className="text-white/70 text-sm mt-1">Plateforme de transcription médicale IA</p>
        </div>
        <Link to="/rapport/nouveau"
          className="relative z-10 flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-5 py-3 rounded-xl font-semibold transition-all shrink-0">
          <Plus size={18} /> Nouveau rapport
        </Link>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total rapports" value={total} icon={FileText} color="primary" />
        <StatCard title="Validés ce mois" value={saved} icon={CheckCircle} color="success" />
        <StatCard title="En brouillon" value={drafts} icon={Clock} color="warning" />
        <StatCard title="Dernière transcription" value={last?.ID_Exam || "—"} icon={Mic} color="accent"
          subtitle={last ? new Date(last.createdAt).toLocaleDateString("fr-FR") : undefined} />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-card p-5">
          <h3 className="font-semibold text-foreground mb-4 text-sm">📊 Rapports créés — 30 derniers jours</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="rapports" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <h3 className="font-semibold text-foreground mb-4 text-sm">🍩 Répartition des statuts</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                {pieData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground text-sm">⏱ Activité récente</h3>
          <Link to="/historique" className="text-primary text-xs hover:underline">Voir tout →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["ID Exam", "Date", "Statut", "Action"].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(r => (
                <tr key={r._id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-mono font-medium text-foreground">{r.ID_Exam}</td>
                  <td className="px-5 py-3 text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("fr-FR")}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(r.status)}`}>
                      {statusLabel(r.status)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <button onClick={() => navigate(`/rapport/${r._id}`)}
                      className="flex items-center gap-1.5 text-primary hover:text-primary/80 text-xs font-medium transition-colors">
                      <Eye size={13} /> Voir
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-muted-foreground text-sm">Aucun rapport pour le moment.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
