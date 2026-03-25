import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { getComplaints, type Complaint } from "@/services/complaintsService";
import { getReports, type Report } from "@/services/reportsService";
import { useQuery } from "@tanstack/react-query";
import { FileText, Clock, MessageSquare, CheckCircle, Brain, Download } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import { Link } from "react-router-dom";

const PIE_COLORS = ["hsl(38,95%,50%)", "hsl(210,90%,40%)", "hsl(145,65%,40%)"];

export default function AdminITDashboard() {
  const { data: complaints = [] } = useQuery<Complaint[]>({
    queryKey: ["complaints"],
    queryFn: getComplaints,
  });

  const { data: reports = [] } = useQuery<Report[]>({
    queryKey: ["reports"],
    queryFn: getReports,
  });

  const pending = complaints.filter(r => r.status === "pending").length;
  const inProgress = complaints.filter(r => r.status === "in_progress").length;
  const resolved = complaints.filter(r => r.status === "resolved").length;

  const pieData = [
    { name: "En attente", value: pending },
    { name: "En cours", value: inProgress },
    { name: "Traitées", value: resolved },
  ];

  // group complaints by week for bar chart
  const weeklyMap: Record<string, number> = {};
  complaints.forEach(c => {
    const week = new Date(c.createdAt);
    week.setDate(week.getDate() - week.getDay());
    const key = week.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
    weeklyMap[key] = (weeklyMap[key] || 0) + 1;
  });
  const weeklyData = Object.entries(weeklyMap).map(([date, value]) => ({ date, value })).slice(-6);

  return (
    <AppLayout title="Tableau de bord Admin IT">
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Transcriptions" value={reports.length} icon={FileText} color="primary" />
          <StatCard title="En attente" value={pending} icon={Clock} color="warning" />
          <StatCard title="En cours" value={inProgress} icon={MessageSquare} color="accent" />
          <StatCard title="Traitées" value={resolved} icon={CheckCircle} color="success" />
          <StatCard title="Modèle IA" value="v2.4.1" icon={Brain} color="primary" subtitle="Actif" />
        </div>

        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <h3 className="font-semibold text-foreground mb-4 text-sm">🖥️ Monitoring des services</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { name: "Django API", port: ":8000", status: true },
              { name: "FastAPI IA", port: ":8001", status: true },
              { name: "Modèle IA", port: "v2.4.1", status: true },
            ].map(s => (
              <div key={s.name} className="flex items-center gap-3 bg-muted/40 rounded-xl p-4">
                <div className={`w-3 h-3 rounded-full ${s.status ? "bg-success animate-pulse" : "bg-destructive"}`} />
                <div>
                  <p className="font-semibold text-foreground text-sm">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.port} — {s.status ? "En ligne" : "Hors ligne"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Link to="/adminit/export"
          className="flex items-center gap-3 bg-primary/10 border border-primary/30 rounded-xl px-5 py-4 hover:bg-primary/15 transition-all">
          <Download className="text-primary" size={20} />
          <div>
            <p className="font-semibold text-primary">⬇️ Télécharger le CSV global des transcriptions</p>
            <p className="text-sm text-muted-foreground">{reports.length} transcription{reports.length > 1 ? "s" : ""} disponible{reports.length > 1 ? "s" : ""}</p>
          </div>
        </Link>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-semibold text-foreground mb-4 text-sm">📊 Réclamations par semaine</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card rounded-xl border border-border shadow-card p-5">
            <h3 className="font-semibold text-foreground mb-4 text-sm">🍩 Réclamations par statut</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
