import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsers, updateUserStatus, type BackendUserRecord } from "@/services/usersService";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_MAP: Record<string, string> = {
  pending: "en_attente",
  validated: "validé",
  refused: "refusé",
};

const BADGE: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  validated: "bg-success/10 text-success",
  refused: "bg-destructive/10 text-destructive",
};

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-primary/10 text-primary",
  adminIT: "bg-accent text-accent-foreground",
};

export default function AdminITAdmins() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("tous");

  const { data: users = [] } = useQuery<BackendUserRecord[]>({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "validated" | "refused" }) =>
      updateUserStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const admins = users.filter(u => u.role === "admin" || u.role === "adminIT");
  const filtered = activeTab === "tous" ? admins : admins.filter(u => u.status === activeTab);
  const pending = admins.filter(u => u.status === "pending").length;

  return (
    <AppLayout title="Comptes Administrateurs">
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex gap-2 flex-wrap">
          {[
            { key: "tous", label: "Tous" },
            { key: "pending", label: `🟡 En attente${pending > 0 ? ` (${pending})` : ""}` },
            { key: "validated", label: "✅ Validés" },
            { key: "refused", label: "❌ Refusés" },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-all",
                activeTab === key ? "gradient-hero text-white" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
              {label}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Prénom", "Nom", "Email", "Rôle", "Statut", "Inscription", "Actions"].map(h => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(a => (
                <tr key={a._id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-foreground">{a.prenom || "—"}</td>
                  <td className="px-6 py-4 font-medium text-foreground">{a.nom || "—"}</td>
                  <td className="px-6 py-4 text-muted-foreground">{a.email}</td>
                  <td className="px-6 py-4">
                    <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", ROLE_BADGE[a.role] ?? "bg-muted text-muted-foreground")}>
                      {a.role === "admin" ? "Admin" : "Admin IT"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", BADGE[a.status] ?? "bg-muted text-muted-foreground")}>
                      {STATUS_MAP[a.status] ?? a.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {new Date(a.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {a.status === "pending" && (
                        <>
                          <button onClick={() => mutation.mutate({ id: a._id, status: "validated" })}
                            disabled={mutation.isPending}
                            className="w-8 h-8 bg-success/10 text-success rounded-lg flex items-center justify-center hover:bg-success/20 disabled:opacity-50 transition-colors" title="Accepter">
                            <Check size={14} />
                          </button>
                          <button onClick={() => mutation.mutate({ id: a._id, status: "refused" })}
                            disabled={mutation.isPending}
                            className="w-8 h-8 bg-destructive/10 text-destructive rounded-lg flex items-center justify-center hover:bg-destructive/20 disabled:opacity-50 transition-colors" title="Refuser">
                            <X size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">Aucun compte trouvé.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
