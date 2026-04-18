import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getComplaints, createComplaint, type Complaint } from "@/services/complaintsService";
import { cn } from "@/lib/utils";
import { getStatusBadgeClass, getStatusLabel, getStatusSurfaceClass } from "@/styles/statusSystem";
import { CheckCircle2 } from "lucide-react";

export default function Reclamations() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ titre: "", description: "" });
  const [submitted, setSubmitted] = useState(false);

  const { data: complaints = [] } = useQuery<Complaint[]>({
    queryKey: ["complaints"],
    queryFn: getComplaints,
  });

  const mutation = useMutation({
    mutationFn: () => createComplaint({ title: form.titre, description: form.description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      setForm({ titre: "", description: "" });
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <AppLayout title="Réclamations">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Form */}
        <div className="bg-card rounded-xl border border-border shadow-card p-6">
          <h3 className="font-semibold text-foreground mb-4">Soumettre une réclamation</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Titre</label>
              <input value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} required
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Décrivez le problème en quelques mots" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none h-28"
                placeholder="Décrivez le problème en détail..." />
            </div>
            {submitted && (
              <div className="bg-success/10 border border-success/30 rounded-xl px-4 py-3 text-success text-sm flex items-center gap-2">
                <CheckCircle2 size={16} /> Réclamation soumise avec succès.
              </div>
            )}
            {mutation.isError && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-destructive text-sm">
                {mutation.error instanceof Error ? mutation.error.message : "Erreur lors de l'envoi."}
              </div>
            )}
            <button type="submit" disabled={mutation.isPending}
              className="gradient-hero text-white font-semibold px-6 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-60 transition-all text-sm">
              {mutation.isPending ? "Envoi..." : "Envoyer la réclamation"}
            </button>
          </form>
        </div>

        {/* List */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">Mes réclamations</h3>
          {complaints.length === 0 && (
            <p className="text-muted-foreground text-sm">Aucune réclamation pour le moment.</p>
          )}
          {complaints.map(r => (
            <div key={r._id} className="bg-card rounded-xl border border-border shadow-card p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-semibold text-foreground">{r.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <span className={cn(getStatusBadgeClass(r.status), "shrink-0")}>
                  {getStatusLabel(r.status, "complaint")}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{r.description}</p>
              {r.response && (
                <div className={cn("mt-3 p-3", getStatusSurfaceClass("resolved"))}>
                  <p className="text-xs font-semibold text-[#4D7F67] mb-1">Réponse de l'Admin IT :</p>
                  <p className="text-sm text-foreground">{r.response}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
