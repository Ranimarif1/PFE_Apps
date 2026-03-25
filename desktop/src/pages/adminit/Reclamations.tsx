import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getComplaints, updateComplaint, type Complaint } from "@/services/complaintsService";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

const statusLabel = (s: string) => ({
  pending: "🟡 En attente",
  in_progress: "🔵 En cours",
  resolved: "🟢 Traitée",
}[s] || s);

const statusBadge = (s: string) => ({
  pending: "bg-warning/10 text-warning border border-warning/30",
  in_progress: "bg-primary/10 text-primary border border-primary/30",
  resolved: "bg-success/10 text-success border border-success/30",
}[s] || "bg-muted text-muted-foreground");

const nextStatus = (s: string) => ({ pending: "in_progress", in_progress: "resolved" }[s] || null);

export default function AdminITReclamations() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState("tous");
  const [responses, setResponses] = useState<Record<string, string>>({});

  const { data: complaints = [] } = useQuery<Complaint[]>({
    queryKey: ["complaints"],
    queryFn: getComplaints,
  });

  const mutation = useMutation({
    mutationFn: ({ id, status, response }: { id: string; status: string; response: string }) =>
      updateComplaint(id, { status, response }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["complaints"] }),
  });

  const filtered = filterStatus === "tous" ? complaints : complaints.filter(r => r.status === filterStatus);

  const advance = (r: Complaint) => {
    const next = nextStatus(r.status);
    if (!next) return;
    mutation.mutate({ id: r._id, status: next, response: responses[r._id] || r.response });
  };

  return (
    <AppLayout title="Gestion des réclamations">
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "tous", label: "Tous" },
            { key: "pending", label: "🟡 En attente" },
            { key: "in_progress", label: "🔵 En cours" },
            { key: "resolved", label: "🟢 Traitée" },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFilterStatus(key)}
              className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-all",
                filterStatus === key ? "gradient-hero text-white" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
              {label}
            </button>
          ))}
        </div>

        {complaints.length === 0 && (
          <p className="text-muted-foreground text-sm">Aucune réclamation pour le moment.</p>
        )}

        {/* List */}
        {filtered.map(r => (
          <div key={r._id} className="bg-card rounded-xl border border-border shadow-card p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-semibold text-foreground">{r.title}</p>
                <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("fr-FR")}</p>
              </div>
              <span className={cn("text-xs font-medium px-3 py-1 rounded-full shrink-0", statusBadge(r.status))}>
                {statusLabel(r.status)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{r.description}</p>

            {r.status !== "resolved" && (
              <div className="space-y-3">
                {r.status === "in_progress" && (
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Réponse</label>
                    <textarea value={responses[r._id] || ""}
                      onChange={e => setResponses(prev => ({ ...prev, [r._id]: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none h-20"
                      placeholder="Rédigez votre réponse..." />
                  </div>
                )}
                <button onClick={() => advance(r)} disabled={mutation.isPending}
                  className="flex items-center gap-2 gradient-hero text-white text-sm font-medium px-4 py-2 rounded-xl hover:opacity-90 disabled:opacity-60 transition-all">
                  <ChevronRight size={14} />
                  {r.status === "pending" ? "Prendre en charge" : "Marquer comme traitée"}
                </button>
              </div>
            )}

            {r.response && (
              <div className="mt-3 bg-success/5 border border-success/20 rounded-xl p-3">
                <p className="text-xs font-semibold text-success mb-1">Réponse envoyée :</p>
                <p className="text-sm text-foreground">{r.response}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
