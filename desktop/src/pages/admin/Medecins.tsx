import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsers, updateUserStatus, deleteUser, changeUserRole, type BackendUserRecord } from "@/services/usersService";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import {
  Search, Check, X, Trash2, AlertTriangle, UserRoundCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getStatusBadgeClass, getStatusLabel } from "@/styles/statusSystem";

export default function AdminMedecins() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const userFilter = (searchParams.get("filter") as "all" | "validated" | "pending" | "refused") ?? "all";
  const setUserFilter = (filter: string) => setSearchParams({ filter });

  const [search,         setSearch]         = useState("");
  const [confirmDelete,  setConfirmDelete]  = useState<BackendUserRecord | null>(null);
  const [confirmPromote, setConfirmPromote] = useState<BackendUserRecord | null>(null);
  const [confirmRefuse,  setConfirmRefuse]  = useState<BackendUserRecord | null>(null);
  const [refuseReason,   setRefuseReason]   = useState("");

  const { data: users = [] } = useQuery<BackendUserRecord[]>({ queryKey: ["users"], queryFn: getUsers });

  const doctors   = users.filter(u => u.role === "doctor");
  const pending   = doctors.filter(u => u.status === "pending").length;
  const validated = doctors.filter(u => u.status === "validated").length;
  const refused   = doctors.filter(u => u.status === "refused").length;

  const statusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: "validated" | "refused"; reason?: string }) =>
      updateUserStatus(id, status, reason),
    onSuccess: (result) => {
      queryClient.setQueryData<BackendUserRecord[]>(["users"], (old) =>
        old?.map(u => u._id === result.user._id ? result.user : u) ?? old
      );
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setConfirmRefuse(null);
      setRefuseReason("");
      if (result.mail_warning) {
        toast.warning("Statut mis à jour", { description: result.mail_warning });
      } else {
        const label = result.user.status === "validated" ? "validé" : "refusé";
        toast.success(`Compte ${label}`, {
          description: `Un email a été envoyé à ${result.user.email}.`,
        });
      }
    },
    onError: () => {
      toast.error("Erreur", { description: "Impossible de mettre à jour le statut." });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); setConfirmDelete(null); },
  });
  const promoteMutation = useMutation({
    mutationFn: (id: string) => changeUserRole(id, "admin"),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); setConfirmPromote(null); },
  });

  const tabDoctors = userFilter === "all" ? doctors : doctors.filter(u => u.status === userFilter);
  const filteredDoctors = tabDoctors.filter(u => {
    const q = search.toLowerCase();
    return !q || (u.prenom || "").toLowerCase().includes(q) || (u.nom || "").toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  return (
    <AppLayout title="Gestion des médecins">
      <div className="flex flex-col min-h-full max-w-full overflow-hidden">
        {/* Segment control */}
        <div className="mb-4 inline-flex max-w-full gap-1 bg-muted border border-border rounded-lg p-1 overflow-x-auto">
          {([
            { key: "all",       label: `Tous (${doctors.length})`   },
            { key: "validated", label: `Acceptés (${validated})`     },
            { key: "pending",   label: `En attente (${pending})`     },
            { key: "refused",   label: `Refusés (${refused})`        },
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
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm table-fixed">
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
                        <div className="w-7 h-7 rounded-full gradient-hero flex items-center justify-center text-white text-[10px] font-bold shrink-0">
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
                      <span className={getStatusBadgeClass(doc.status, "user")}>
                        {getStatusLabel(doc.status, "user")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(doc.createdAt).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {doc.status === "pending" && (
                          <>
                            <button onClick={() => statusMutation.mutate({ id: doc._id, status: "validated" })}
                              disabled={statusMutation.isPending} title="Valider"
                              className="w-6 h-6 rounded-md border border-border bg-muted hover:bg-[rgba(143,211,179,0.14)] hover:border-[rgba(143,211,179,0.4)] hover:text-[#4D7F67] flex items-center justify-center transition-colors">
                              <Check size={11} />
                            </button>
                            <button onClick={() => { setConfirmRefuse(doc); setRefuseReason(""); }}
                              disabled={statusMutation.isPending} title="Refuser"
                              className="w-6 h-6 rounded-md border border-border bg-muted hover:bg-[rgba(227,140,140,0.14)] hover:border-[rgba(227,140,140,0.4)] hover:text-[#8E5555] flex items-center justify-center transition-colors">
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
                          className="w-6 h-6 rounded-md border border-border bg-muted hover:bg-[rgba(227,140,140,0.14)] hover:border-[rgba(227,140,140,0.4)] hover:text-[#8E5555] flex items-center justify-center transition-colors">
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
                Cette action est irréversible. Le compte passera du rôle <strong>Médecin</strong> au rôle <strong>Admin</strong> et obtiendra tous les accès administrateur.
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

      {/* ══ Refuse modal ════════════════════════════════════════════════════ */}
      {confirmRefuse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center shrink-0">
                <X className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Refuser la demande</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Un email sera envoyé au médecin</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Compte concerné :</p>
            <p className="text-sm font-semibold text-foreground mb-0.5">Dr. {confirmRefuse.prenom} {confirmRefuse.nom}</p>
            <p className="text-xs text-muted-foreground mb-4">{confirmRefuse.email}</p>
            <div className="mb-5">
              <label className="text-xs font-medium text-foreground mb-1.5 block">
                Motif du refus <span className="text-muted-foreground font-normal">(optionnel — inclus dans l'email)</span>
              </label>
              <textarea
                value={refuseReason}
                onChange={e => setRefuseReason(e.target.value)}
                placeholder="Ex. : Dossier incomplet, spécialité non correspondante..."
                rows={3}
                className="w-full text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setConfirmRefuse(null); setRefuseReason(""); }}
                className="flex-1 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted transition-all text-sm font-medium">
                Annuler
              </button>
              <button
                onClick={() => statusMutation.mutate({ id: confirmRefuse._id, status: "refused", reason: refuseReason })}
                disabled={statusMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-destructive text-white font-semibold hover:bg-destructive/90 disabled:opacity-60 transition-all text-sm">
                {statusMutation.isPending ? "Envoi..." : "Refuser et notifier"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
