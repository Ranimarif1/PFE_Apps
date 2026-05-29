import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Star, MessageSquarePlus, CheckCircle } from "lucide-react";
import { submitAvis, getMyAvis } from "@/services/avisService";
import { useAuth } from "@/contexts/AuthContext";

export default function Avis() {
  const { user } = useAuth();

  const [content, setContent] = useState("");
  const [rating, setRating] = useState<number>(5);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyAvis()
      .then(existing => setAlreadySubmitted(existing !== null))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await submitAvis({
        doctorName: user ? `${user.prénom} ${user.nom}` : "Médecin",
        content: content.trim(),
        rating,
      });
      setAlreadySubmitted(true);
      setSuccess(true);
      setContent("");
      setRating(5);
    } catch (err) {
      toast.error("Échec de l'envoi de l'avis", {
        description: err instanceof Error ? err.message : "Veuillez réessayer.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout title="Laisser un avis">
      <div className="max-w-xl mx-auto">
        <div className="bg-card rounded-2xl border border-border shadow-card p-6">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Chargement…</div>
          ) : success || alreadySubmitted ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle size={28} className="text-green-500" />
              </div>
              <p className="text-base font-semibold text-foreground">
                {success ? "Merci pour votre avis !" : "Avis déjà soumis"}
              </p>
              <p className="text-sm text-muted-foreground text-center">
                {success
                  ? "Votre retour a été publié sur la page d'accueil."
                  : "Vous avez déjà partagé votre retour sur ReportEase."}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <MessageSquarePlus size={18} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-bold leading-none">Laisser un avis</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Votre retour apparaîtra sur la page d'accueil.</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Note</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        size={26}
                        className={n <= rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Votre avis</label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  required
                  rows={5}
                  placeholder="Partagez votre expérience avec ReportEase…"
                  className="w-full px-4 py-2.5 text-sm resize-none rounded-xl border border-border bg-background"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !content.trim()}
                className="w-full gradient-hero text-white font-semibold py-2.5 rounded-xl inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting ? "Envoi…" : "Publier mon avis"}
              </button>
            </form>
          )}
        </div>
      </div>
    </AppLayout>
  );
}