import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsers, updateUserStatus, deleteUser, changeUserRole, type BackendUserRecord } from "@/services/usersService";
import { Check, X, Trash2, AlertTriangle, UserRoundCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStatusBadgeClass, getStatusLabel, getActiveFilterTabClass, INACTIVE_TAB_CLASS } from "@/styles/statusSystem";

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-primary/10 text-primary",
  adminIT: "bg-[rgba(143,188,230,0.14)] text-[#4C6F91]",
};

export default function AdminITAdmins() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("tous");
  const [confirmDelete, setConfirmDelete] = useState<BackendUserRecord | null>(null);
  const [confirmDemote, setConfirmDemote] = useState<BackendUserRecord | null>(null);

  const { data: users = [] } = useQuery<BackendUserRecord[]>({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  const mutation = useMutation({
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

  const demoteMutation = useMutation({
    mutationFn: (id: string) => changeUserRole(id, "doctor"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setConfirmDemote(null);
    },
  });

  const admins = users.filter(u => u.role === "admin" || u.role === "adminIT");
  const filtered = activeTab === "tous" ? admins : admins.filter(u => u.status === activeTab);
  const pending = admins.filter(u => u.status === "pending").length;

  return (
    <AppLayout title="Comptes Administrateurs">
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="px-6 pt-4 border-b border-border flex gap-6 flex-wrap">
          {[
            { key: "tous", label: "Tous" },
            { key: "pending", label: `En attente${pending > 0 ? ` (${pending})` : ""}` },
            { key: "validated", label: "Validés" },
            { key: "refused", label: "Refusés" },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={cn("pb-3 -mb-px text-sm transition-all",
                activeTab === key ? getActiveFilterTabClass(key) : INACTIVE_TAB_CLASS)}>
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
                    <span className={getStatusBadgeClass(a.status)}>
                      {getStatusLabel(a.status, "user")}
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
                            className="w-8 h-8 bg-[rgba(143,211,179,0.14)] text-[#4D7F67] rounded-lg flex items-center justify-center hover:bg-[rgba(143,211,179,0.22)] disabled:opacity-50 transition-colors" title="Accepter">
                            <Check size={14} />
                          </button>
                          <button onClick={() => mutation.mutate({ id: a._id, status: "refused" })}
                            disabled={mutation.isPending}
                            className="w-8 h-8 bg-[rgba(227,140,140,0.14)] text-[#8E5555] rounded-lg flex items-center justify-center hover:bg-[rgba(227,140,140,0.22)] disabled:opacity-50 transition-colors" title="Refuser">
                            <X size={14} />
                          </button>
                        </>
                      )}
                      {a.status === "validated" && a.role === "admin" && (
                        <>
                          <button onClick={() => setConfirmDemote(a)}
                            className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center hover:bg-primary/20 transition-colors" title="Rétrograder en médecin">
                            <UserRoundCheck size={14} />
                          </button>
                          <button onClick={() => setConfirmDelete(a)}
                            className="w-8 h-8 bg-[rgba(227,140,140,0.14)] text-[#8E5555] rounded-lg flex items-center justify-center hover:bg-[rgba(227,140,140,0.22)] transition-colors" title="Supprimer définitivement">
                            <Trash2 size={14} />
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
      {confirmDemote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <UserRoundCheck className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Rétrograder en médecin</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Vous êtes sur le point de changer le rôle de :
            </p>
            <p className="text-sm font-semibold text-foreground mb-1">
              {confirmDemote.prenom} {confirmDemote.nom}
            </p>
            <p className="text-xs text-muted-foreground mb-4">{confirmDemote.email}</p>
            <div className="bg-warning/10 border border-warning/30 rounded-xl px-4 py-3 mb-5">
              <p className="text-xs text-warning font-medium">
                ⚠️ Cette action est irréversible. Le compte passera du rôle <strong>Admin</strong> au rôle <strong>Médecin</strong> et perdra tous ses accès administrateur.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDemote(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted transition-all text-sm font-medium">
                Annuler
              </button>
              <button onClick={() => demoteMutation.mutate(confirmDemote._id)}
                disabled={demoteMutation.isPending}
                className="flex-1 py-2.5 rounded-xl gradient-hero text-white font-semibold hover:opacity-90 disabled:opacity-60 transition-all text-sm">
                {demoteMutation.isPending ? "Modification..." : "Confirmer le changement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Supprimer le compte admin</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Vous êtes sur le point de supprimer définitivement le compte de :
            </p>
            <p className="text-sm font-semibold text-foreground mb-1">
              {confirmDelete.prenom} {confirmDelete.nom}
            </p>
            <p className="text-xs text-muted-foreground mb-4">{confirmDelete.email}</p>
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 mb-5">
              <p className="text-xs text-destructive font-medium">
                ⚠️ Cette action est irréversible. Le compte sera définitivement supprimé de la base de données.
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
