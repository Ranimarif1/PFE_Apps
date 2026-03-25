import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { getReport, createReport, updateReport } from "@/services/reportsService";
import { CheckCircle, Edit3, Save, FileText, Loader2, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

const STATUS_LABELS: Record<string, string> = {
  draft: "brouillon",
  validated: "validé",
  saved: "enregistré",
};

const STATUS_BADGE: Record<string, string> = {
  saved: "bg-success/10 text-success",
  validated: "bg-primary/10 text-primary",
  draft: "bg-warning/10 text-warning",
};

function AutoTextarea({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={1}
      className={className}
      style={{ overflow: "hidden" }}
    />
  );
}

function parseReport(text: string) {
  const lower = text.toLowerCase();
  const iIdx = lower.indexOf("indication:");
  const rIdx = lower.indexOf("resultat:");
  const cIdx = lower.indexOf("conclusion:");

  const extract = (start: number, end: number) => {
    if (start === -1) return "";
    const colonPos = text.indexOf(":", start) + 1;
    const endPos = end === -1 ? text.length : end;
    return text.slice(colonPos, endPos).trim();
  };

  return {
    indication: extract(iIdx, rIdx !== -1 ? rIdx : cIdx),
    resultat: extract(rIdx, cIdx),
    conclusion: extract(cIdx, -1),
  };
}

function buildContent(indication: string, resultat: string, conclusion: string) {
  return `Indication: ${indication}\n\nResultat: ${resultat}\n\nConclusion: ${conclusion}`;
}

export default function RapportDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [savedAsValidated, setSavedAsValidated] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState<"draft" | "validate" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fromState = location.state as { ID_Exam?: string; transcription?: string; _restore?: object } | null;
  const isNew = id === "new";

  const initialParsed = parseReport(fromState?.transcription || "");
  const [indication, setIndication] = useState(initialParsed.indication);
  const [resultat, setResultat] = useState(initialParsed.resultat);
  const [conclusion, setConclusion] = useState(initialParsed.conclusion);
  const [examId] = useState(fromState?.ID_Exam || "—");
  const [status, setStatus] = useState<string>("draft");
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  const contenu = buildContent(indication, resultat, conclusion);

  useEffect(() => {
    if (!isNew && id) {
      setLoading(true);
      getReport(id)
        .then(r => {
          const parsed = parseReport(r.content);
          setIndication(parsed.indication);
          setResultat(parsed.resultat);
          setConclusion(parsed.conclusion);
          setStatus(r.status);
          setCreatedAt(r.createdAt);
        })
        .catch(() => setError("Rapport introuvable."))
        .finally(() => setLoading(false));
    }
  }, [id, isNew]);

  const handleAction = async (action: "draft" | "validate") => {
    setSaving(action);
    setError("");
    const newStatus = action === "draft" ? "draft" : "validated";
    try {
      if (isNew) {
        await createReport({ ID_Exam: examId, content: contenu, status: newStatus });
      } else if (id) {
        await updateReport(id, { content: contenu, status: newStatus });
      }
      if (action === "validate") {
        setSavedAsValidated(true);
        setTimeout(() => navigate("/historique"), 2000);
      } else {
        navigate("/historique");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Rapport de transcription">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Rapport de transcription">
      <div className="max-w-3xl mx-auto">
        {!savedAsValidated && (
          <button
            onClick={() => fromState?._restore ? navigate("/rapport/nouveau", { state: { _restore: fromState._restore } }) : navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft size={16} /> Retour
          </button>
        )}
        {savedAsValidated ? (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="text-center py-16">
            <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Rapport validé et enregistré ✅</h2>
            <p className="text-muted-foreground">Le rapport a été ajouté au fichier CSV global.</p>
          </motion.div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="bg-card rounded-xl border border-border shadow-card p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🩻</span>
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">Service Radiologie</span>
                {!isNew && status && (
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${STATUS_BADGE[status] ?? "bg-muted text-muted-foreground"}`}>
                    {STATUS_LABELS[status] ?? status}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div><p className="text-muted-foreground text-xs">ID Exam</p><p className="font-mono font-bold text-foreground">{examId}</p></div>
                <div><p className="text-muted-foreground text-xs">Médecin</p><p className="font-medium text-foreground">Dr. {user?.prénom} {user?.nom}</p></div>
                <div><p className="text-muted-foreground text-xs">Date</p>
                  <p className="font-medium text-foreground">
                    {createdAt ? new Date(createdAt).toLocaleDateString("fr-FR") : new Date().toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
            </div>

            {/* Transcription */}
            <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Transcription</h3>
                <button onClick={() => setEditing(e => !e)}
                  className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors">
                  <Edit3 size={14} /> {editing ? "Lecture" : "Modifier"}
                </button>
              </div>

              {/* Indication */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Indication</label>
                {editing ? (
                  <AutoTextarea value={indication} onChange={setIndication}
                    className="w-full p-3 rounded-xl border border-border bg-background text-foreground text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                ) : (
                  <p className="text-foreground leading-relaxed text-sm bg-muted/30 rounded-xl p-3">{indication || "—"}</p>
                )}
              </div>

              {/* Résultat */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Résultat</label>
                {editing ? (
                  <AutoTextarea value={resultat} onChange={setResultat}
                    className="w-full p-3 rounded-xl border border-border bg-background text-foreground text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                ) : (
                  <p className="text-foreground leading-relaxed text-sm bg-muted/30 rounded-xl p-3">{resultat || "—"}</p>
                )}
              </div>

              {/* Conclusion */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Conclusion</label>
                {editing ? (
                  <AutoTextarea value={conclusion} onChange={setConclusion}
                    className="w-full p-3 rounded-xl border border-border bg-background text-foreground text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                ) : (
                  <p className="text-foreground leading-relaxed text-sm bg-muted/30 rounded-xl p-3">{conclusion || "—"}</p>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-destructive text-sm">{error}</div>
            )}

            {/* Actions */}
            {status !== "saved" && (
              <div className="flex gap-3">
                <button onClick={() => handleAction("draft")} disabled={saving !== null}
                  className="flex-1 flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 text-foreground font-semibold py-3 rounded-xl disabled:opacity-60 transition-all text-sm border border-border">
                  {saving === "draft" ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                  Enregistrer en brouillon
                </button>
                <button onClick={() => handleAction("validate")} disabled={saving !== null}
                  className="flex-1 flex items-center justify-center gap-2 gradient-hero text-white font-semibold py-3 rounded-xl hover:opacity-90 disabled:opacity-60 transition-all text-sm">
                  {saving === "validate" ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Valider et enregistrer ✅
                </button>
              </div>
            )}
            {status === "saved" && (
              <div className="flex items-center justify-center gap-2 bg-success/10 text-success font-semibold py-3 rounded-xl text-sm border border-success/30">
                <CheckCircle size={16} /> Rapport enregistré
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
