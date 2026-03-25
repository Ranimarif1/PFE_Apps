import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { getUsers, type BackendUserRecord } from "@/services/usersService";
import { useQuery } from "@tanstack/react-query";
import { Users, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const { data: users = [] } = useQuery<BackendUserRecord[]>({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  const doctors = users.filter(u => u.role === "doctor");
  const pending = doctors.filter(u => u.status === "pending").length;
  const validated = doctors.filter(u => u.status === "validated").length;
  const refused = doctors.filter(u => u.status === "refused").length;

  const barData = [
    { name: "Validés", value: validated },
    { name: "En attente", value: pending },
    { name: "Refusés", value: refused },
  ];

  return (
    <AppLayout title="Tableau de bord Admin">
      <div className="space-y-6">
        {pending > 0 && (
          <div className="bg-warning/10 border border-warning/30 rounded-xl px-5 py-4 flex items-center gap-4">
            <AlertTriangle className="text-warning shrink-0" size={22} />
            <div className="flex-1">
              <p className="font-semibold text-warning">{pending} compte{pending > 1 ? "s" : ""} en attente de validation</p>
              <p className="text-sm text-muted-foreground">Des médecins attendent votre validation pour accéder à la plateforme.</p>
            </div>
            <Link to="/admin/utilisateurs"
              className="gradient-hero text-white text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-all shrink-0">
              Valider maintenant
            </Link>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total médecins" value={doctors.length} icon={Users} color="primary" />
          <StatCard title="En attente" value={pending} icon={Clock} color="warning" />
          <StatCard title="Validés" value={validated} icon={CheckCircle} color="success" />
          <StatCard title="Refusés" value={refused} icon={XCircle} color="destructive" />
        </div>

        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <h3 className="font-semibold text-foreground mb-4 text-sm">📊 Médecins par statut</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </AppLayout>
  );
}
