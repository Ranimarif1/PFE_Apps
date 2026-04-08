import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsers, updateUserStatus, deleteUser, changeUserRole, type BackendUserRecord } from "@/services/usersService";
import { Check, X, Trash2, AlertTriangle, UserRoundCheck } from "lucide-react";
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

export default function AdminUtilisateurs() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("tous");
  const [confirmDelete, setConfirmDelete] = useState<BackendUserRecord | null>(null);
  const [confirmPromote, setConfirmPromote] = useState<BackendUserRecord | null>(null);

  const { data: users = [] } = useQuery<BackendUserRecord[]>({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "validated" | "refused" }) =>
      updateUserStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setConfirmDelete(null);
    },
  });

  const promoteMutation = useMutation({
    mutationFn: (id: string) => changeUserRole(id, "admin"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setConfirmPromote(null);
    },
  });

  const doctors = users.filter(u => u.role === "doctor");
  const filtered = activeTab === "tous" ? doctors : doctors.filter(u => u.status === activeTab);
  const pending = doctors.filter(u => u.status === "pending").length;

  return (
    <AppLayout title="Gestion des utilisateurs">
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
                {["Prénom", "Nom", "Email", "Statut", "Inscription", "Actions"].map(h => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(u => (
                <tr key={u._id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-foreground">{u.prenom || "—"}</td>
                  <td className="px-6 py-4 font-medium text-foreground">{u.nom || "—"}</td>
                  <td className="px-6 py-4 text-muted-foreground">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full capitalize", BADGE[u.status] ?? "bg-muted text-muted-foreground")}>
                      {STATUS_MAP[u.status] ?? u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {u.status === "pending" && (
                        <>
                          <button onClick={() => statusMutation.mutate({ id: u._id, status: "validated" })}
                            disabled={statusMutation.isPending}
                            className="w-8 h-8 bg-success/10 text-success rounded-lg flex items-center justify-center hover:bg-success/20 disabled:opacity-50 transition-colors" title="Accepter">
                            <Check size={14} />
                          </button>
                          <button onClick={() => statusMutation.mutate({ id: u._id, status: "refused" })}
                            disabled={statusMutation.isPending}
                            className="w-8 h-8 bg-destructive/10 text-destructive rounded-lg flex items-center justify-center hover:bg-destructive/20 disabled:opacity-50 transition-colors" title="Refuser">
                            <X size={14} />
                          </button>
                        </>
                      )}
                      {u.status === "validated" && (
                        <>
                          <button onClick={() => setConfirmPromote(u)}
                            className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center hover:bg-primary/20 transition-colors" title="Promouvoir en admin">
                            <UserRoundCheck size={14} />
                          </button>
                          <button onClick={() => setConfirmDelete(u)}
                            className="w-8 h-8 bg-destructive/10 text-destructive rounded-lg flex items-center justify-center hover:bg-destructive/20 transition-colors" title="Supprimer définitivement">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">Aucun utilisateur trouvé.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Promote confirmation dialog */}
      {confirmPromote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <UserRoundCheck className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Promouvoir en administrateur</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Vous êtes sur le point de changer le rôle de :
            </p>
            <p className="text-sm font-semibold text-foreground mb-1">
              {confirmPromote.prenom} {confirmPromote.nom}
            </p>
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

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Supprimer le médecin</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Vous êtes sur le point de supprimer définitivement le compte de :
            </p>
            <p className="text-sm font-semibold text-foreground mb-1">
              {confirmDelete.prenom} {confirmDelete.nom}
            </p>
            <p className="text-xs text-muted-foreground mb-4">{confirmDelete.email}</p>
            <div className="bg-warning/10 border border-warning/30 rounded-xl px-4 py-3 mb-5">
              <p className="text-xs text-warning font-medium">
                Cette action est irréversible. Le compte sera supprimé de la base de données. Les rapports déjà enregistrés dans le CSV ne seront pas affectés.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted transition-all text-sm font-medium">
                Annuler
              </button>
              <button onClick={() => deleteMutation.mutate(confirmDelete._id)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-destructive text-white font-semibold hover:bg-destructive/90 disabled:opacity-60 transition-all text-sm">
                {deleteMutation.isPending ? "Suppression..." : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
