import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsers, updateUserStatus, deleteUser, changeUserRole, type BackendUserRecord } from "@/services/usersService";
import { getPasswordResetRequestsApi, setTempPasswordApi, type PasswordResetRequest } from "@/services/authService";
import { toast } from "sonner";
import { Check, X, Trash2, AlertTriangle, UserRoundCheck, KeyRound } from "lucide-react";
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
  const [tempPwdTarget, setTempPwdTarget] = useState<PasswordResetRequest | null>(null);
  const [tempPwdValue,  setTempPwdValue]  = useState("");

  const { data: users = [] } = useQuery<BackendUserRecord[]>({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  const { data: resetRequests = [] } = useQuery<PasswordResetRequest[]>({
    queryKey: ["password-reset-requests"],
    queryFn: getPasswordResetRequestsApi,
    refetchInterval: 30000,
  });

  const setTempPwdMutation = useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) =>
      setTempPasswordApi(userId, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["password-reset-requests"] });
      setTempPwdTarget(null);
      setTempPwdValue("");
      toast.success("Mot de passe temporaire défini.");
    },
    onError: (err: Error) => toast.error(err.message || "Erreur."),
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
      {/* ── Reset password requests ── */}
      {resetRequests.length > 0 && (
        <div className="mb-5 bg-amber-500/8 border border-amber-500/25 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <KeyRound size={14} className="text-amber-600" />
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              Demandes de réinitialisation de mot de passe ({resetRequests.length})
            </span>
          </div>
          <div className="space-y-2">
            {resetRequests.map(req => (
              <div key={req._id} className="flex items-center justify-between bg-card border border-border rounded-lg px-3 py-2">
                <div>
                  <p className="text-xs font-medium text-foreground">{req.prenom} {req.nom}</p>
                  <p className="text-[11px] text-muted-foreground">{req.email}</p>
                </div>
                <button
                  onClick={() => { setTempPwdTarget(req); setTempPwdValue(""); }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors"
                >
                  Définir mot de passe
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="px-6 pt-4 border-b border-border flex gap-6 flex-wrap">
          {[
            { key: "tous", label: "Tous" },
            { key: "pending", label: `En attente${pending > 0 ? ` (${pending})` : ""}` },
            { key: "validated", label: "Acceptés" },
            { key: "refused", label: "Refusés" },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={cn("pb-3 -mb-px text-sm transition-all",
                activeTab === key ? getActiveFilterTabClass(key, "user") : INACTIVE_TAB_CLASS)}>
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
                    <span className={getStatusBadgeClass(a.status, "user")}>
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

      {/* ══ Set temp password modal ═══════════════════════════════ */}
      {tempPwdTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Mot de passe temporaire</h2>
                <p className="text-xs text-muted-foreground mt-0.5">L'utilisateur devra le changer à la prochaine connexion</p>
              </div>
            </div>
            <p className="text-sm font-semibold text-foreground mb-0.5">{tempPwdTarget.prenom} {tempPwdTarget.nom}</p>
            <p className="text-xs text-muted-foreground mb-4">{tempPwdTarget.email}</p>
            <div className="mb-5">
              <label className="text-xs font-medium text-foreground mb-1.5 block">Nouveau mot de passe temporaire</label>
              <input
                type="text"
                value={tempPwdValue}
                onChange={e => setTempPwdValue(e.target.value)}
                placeholder="Min. 6 caractères"
                autoFocus
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setTempPwdTarget(null); setTempPwdValue(""); }}
                className="flex-1 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted transition-all text-sm font-medium">
                Annuler
              </button>
              <button
                onClick={() => setTempPwdMutation.mutate({ userId: tempPwdTarget.userId, password: tempPwdValue })}
                disabled={!tempPwdValue.trim() || tempPwdValue.length < 6 || setTempPwdMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 disabled:opacity-50 transition-all text-sm">
                {setTempPwdMutation.isPending ? "Enregistrement..." : "Définir le mot de passe"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
