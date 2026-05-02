import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { getReport, createReport, updateReport } from "@/services/reportsService";
import { CheckCircle, Edit3, Save, FileText, Sparkles, Check, X, Loader2, ArrowLeft, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useRecording } from "@/contexts/RecordingContext";
import { getSuggestion, type OllamaChange } from "@/services/transcriptionService";
import { getStatusBadgeClass, getStatusLabel } from "@/styles/statusSystem";

/* ── Auto-resizing textarea ── */
function AutoTextarea({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const resize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };
  useLayoutEffect(() => resize(ref.current), [value]);
  return (
    <textarea
      ref={el => { (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el; resize(el); }}
      value={value}
      onChange={e => onChange(e.target.value)}
      className={className}
      style={{ overflow: "hidden", resize: "none" }}
    />
  );
}

/* ── Highlight words suggested by Ollama ── */
function HighlightedText({ text, changes }: { text: string; changes: OllamaChange[] }) {
  if (!text) return <span className="text-muted-foreground">—</span>;
  if (!changes.length) return <span>{text}</span>;

  const escaped = changes.map(c => c.original.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");

  const parts: React.ReactNode[] = [];
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const fix = changes.find(c => c.original.toLowerCase() === m![0].toLowerCase());
    parts.push(
      <mark key={m.index} title={`→ ${fix?.corrected}`}
        style={{ background: "rgba(251,191,36,0.30)", borderRadius: "3px", padding: "0 2px", borderBottom: "2px solid rgba(217,119,6,0.6)" }}>
        {m[0]}
      </mark>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

/* ── Content parser / builder ── */
function parseReport(text: string) {
  // Accent-tolerant, colon-optional, paren-tolerant regex matching
  // Whisper sometimes wraps keywords in parentheses: (Conclusion) → consume both parens
  const iMatch = /[({]?\s*indication\s*[)}]?\s*:?/i.exec(text);
  const rMatch = /[({]?\s*r[ée]sultat\s*[)}]?\s*:?/i.exec(text);
  const cMatch = /[({]?\s*conclusion\s*[)}]?\s*:?/i.exec(text);

  const iIdx = iMatch?.index ?? -1;
  const rIdx = rMatch?.index ?? -1;
  const cIdx = cMatch?.index ?? -1;

  // If none of the section keywords are present, put everything in résultat
  if (iIdx === -1 && rIdx === -1 && cIdx === -1) {
    return { indication: "", resultat: text.trim(), conclusion: "" };
  }

  const extract = (match: RegExpExecArray | null, end: number) => {
    if (!match) return "";
    const afterKeyword = match.index + match[0].length;
    const raw = text.slice(afterKeyword, end === -1 ? text.length : end).trim();
    // Strip Whisper noise at section start (mishearings of "deux points à la ligne").
    // Pattern: Whisper mishears "deux"→"de/d'" and "points"→p-word (pont, panne, pan...).
    // No `i` flag: real content always starts uppercase (IRM, Présence, État...).
    const cleaned = raw
      .replace(/^(?:de\s+p[a-z]+|d[''][a-z]{0,4}\s+p[a-z]+|et\s+[a-z]{3,6})\s+/, "")
      .replace(/^[-—]+\s*/, "")  // strip leading dash artifacts from auto-punctuation
      .trim();
    // If only dashes/punctuation remain, treat section as empty
    if (/^[-—\s]*$/.test(cleaned)) return "";
    const result = cleaned.length > 0 ? cleaned : raw;
    return result.charAt(0).toUpperCase() + result.slice(1);
  };

  return {
    indication: extract(iMatch, rIdx !== -1 ? rIdx : cIdx),
    resultat:   extract(rMatch, cIdx),
    conclusion: extract(cMatch, -1),
  };
}
function buildContent(indication: string, resultat: string, conclusion: string) {
  return `Indication: ${indication}\n\nResultat: ${resultat}\n\nConclusion: ${conclusion}`;
}

/* ════════════════════════════════════════ */
export default function RapportDetail() {
  const { id }       = useParams();
  const location     = useLocation();
  const navigate     = useNavigate();
  const { user }          = useAuth();
  const { refreshQueue } = useRecording();

  const fromState = location.state as { ID_Exam?: string; transcription?: string; audioId?: string; _restore?: object } | null;
  const isNew     = id === "new";

  /* ── Report fields ── */
  const initialParsed = parseReport(fromState?.transcription || "");
  const [indication,  setIndication]  = useState(initialParsed.indication);
  const [resultat,    setResultat]    = useState(initialParsed.resultat);
  const [conclusion,  setConclusion]  = useState(initialParsed.conclusion);
  const [examId,      setExamId]      = useState(fromState?.ID_Exam || "");
  const [editingId,   setEditingId]   = useState(false);
  const [examIdInput, setExamIdInput] = useState(fromState?.ID_Exam || "");
  const [examIdError, setExamIdError] = useState("");
  const [status,      setStatus]      = useState<string>("draft");
  const [createdAt,   setCreatedAt]   = useState<string | null>(null);

  /* ── UI states ── */
  const [editing,              setEditing]              = useState(false);
  const [saving,               setSaving]               = useState<"draft" | "validate" | "save" | null>(null);
  const [loading,              setLoading]              = useState(false);
  const [savedAsValidated,     setSavedAsValidated]     = useState<"validate" | "save" | false>(false);
  const [error,                setError]                = useState("");

  /* ── Ollama suggestion banner ── */
  const [ollamaSuggestion,   setOllamaSuggestion]   = useState<string | null>(null);
  const [ollamaChanges,      setOllamaChanges]      = useState<OllamaChange[]>([]);
  const [ollamaDismissed,    setOllamaDismissed]    = useState(false);
  const [ollamaLoading,      setOllamaLoading]      = useState(false);

  const contenu = buildContent(indication, resultat, conclusion);

  /* ── Auto-save as draft when arriving from transcription ── */
  useEffect(() => {
    if (!isNew || !fromState?.transcription) return;
    createReport({ ID_Exam: examId || "—", content: contenu, status: "draft", audioId: fromState?.audioId })
      .then(r => {
        refreshQueue(); // audio now has reportId → remove from sidebar queue
        navigate(`/rapport/${r._id}`, { replace: true, state: { ...fromState } });
      })
      .catch(() => {
        // Auto-save failed (e.g. ID_Exam conflict). Resync the sidebar so the
        // audio reappears if the backend still has no reportId linked — user
        // can see what's pending and save manually.
        refreshQueue();
      });
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Load existing report ── */
  useEffect(() => {
    if (!isNew && id) {
      setLoading(true);
      getReport(id)
        .then(r => {
          const p = parseReport(r.content);
          setIndication(p.indication);
          setResultat(p.resultat);
          setConclusion(p.conclusion);
          setStatus(r.status);
          setCreatedAt(r.createdAt);
        })
        .catch(() => setError("Rapport introuvable."))
        .finally(() => setLoading(false));
    }
  }, [id, isNew]);

  /* ── Toggle edit mode + fire Ollama when entering ── */
  const handleToggleEdit = () => {
    const next = !editing;
    setEditing(next);
    if (next) {
      setOllamaSuggestion(null);
      setOllamaChanges([]);
      setOllamaDismissed(false);
      setOllamaLoading(true);
      const text = buildContent(indication, resultat, conclusion);
      getSuggestion(text)
        .then(({ suggestion, changes }) => {
          if (changes.length > 0) {
            setOllamaSuggestion(suggestion);
            setOllamaChanges(changes);
          }
        })
        .catch(() => {})
        .finally(() => setOllamaLoading(false));
    }
  };

  /* ── Accept Ollama suggestion ── */
  const acceptOllamaSuggestion = () => {
    if (!ollamaSuggestion) return;
    const p = parseReport(ollamaSuggestion);
    setIndication(p.indication);
    setResultat(p.resultat);
    setConclusion(p.conclusion);
    setOllamaSuggestion(null);
    setOllamaDismissed(true);
  };

  /* ── Save ── */
  const handleAction = async (action: "draft" | "validate" | "save") => {
    setSaving(action);
    setError("");
    const newStatus = action === "draft" ? "draft" : action === "validate" ? "validated" : "saved";
    try {
      if (isNew) {
        await createReport({ ID_Exam: examId, content: contenu, status: newStatus, audioId: fromState?.audioId });
        refreshQueue();
      } else if (id) {
        await updateReport(id, { content: contenu, status: newStatus });
      }
      if (action === "validate" || action === "save") {
        setSavedAsValidated(action);
        setTimeout(() => navigate("/historique"), 2000);
      } else {
        navigate("/historique");
      }
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : "";
      if (raw.toLowerCase().includes("id_exam") && raw.toLowerCase().includes("unique")) {
        setError(`L'identifiant d'examen "${examId}" existe déjà. Veuillez utiliser un identifiant différent.`);
      } else if (raw.toLowerCase().includes("id_exam") && raw.toLowerCase().includes("exists")) {
        setError(`L'identifiant d'examen "${examId}" est déjà utilisé par un autre rapport.`);
      } else {
        setError(raw || "Erreur lors de l'enregistrement.");
      }
    } finally {
      setSaving(null);
    }
  };

  /* ── Loading ── */
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
      <div className="max-w-6xl mx-auto">
        {!savedAsValidated && (
          <button
            onClick={() => fromState?._restore ? navigate("/rapport/nouveau", { state: { _restore: fromState._restore } }) : navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft size={16} /> Retour
          </button>
        )}

        {savedAsValidated ? (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-16">
            <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {savedAsValidated === "save" ? "Rapport enregistré" : "Rapport validé"}
            </h2>
            <p className="text-muted-foreground">Redirection vers l'historique…</p>
          </motion.div>
        ) : (
          <div className="space-y-6 animate-fade-in">

            {/* ── Header card ── */}
            <div className="bg-card rounded-xl border border-border shadow-card p-6">
              <div className="flex items-center gap-2 mb-4">
                {!isNew && status && (
                  <span className={`${getStatusBadgeClass(status)} capitalize`}>
                    {getStatusLabel(status, "report")}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">ID Exam</p>
                  {(isNew || status === "draft") && editingId ? (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        value={examIdInput}
                        onChange={e => {
                          const v = e.target.value;
                          setExamIdInput(v);
                          setExamIdError(/^\d*$/.test(v) ? "" : "Chiffres uniquement");
                        }}
                        className="font-mono font-bold text-foreground bg-background border border-border rounded px-1.5 py-0.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <button
                        onClick={() => {
                          if (examIdError) return;
                          setExamId(examIdInput);
                          setEditingId(false);
                        }}
                        className="text-success hover:text-success/80 transition-colors"
                        title="Confirmer"
                      ><Check size={13} /></button>
                      <button
                        onClick={() => { setExamIdInput(examId); setExamIdError(""); setEditingId(false); }}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="Annuler"
                      ><X size={13} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 group">
                      <p className="font-mono font-bold text-foreground">{examId || "—"}</p>
                      {(isNew || status === "draft") && (
                        <button
                          onClick={() => { setExamIdInput(examId); setExamIdError(""); setEditingId(true); }}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all"
                          title="Modifier l'ID Exam"
                        ><Pencil size={11} /></button>
                      )}
                    </div>
                  )}
                  {examIdError && <p className="text-destructive text-[10px] mt-0.5">{examIdError}</p>}
                </div>
                <div><p className="text-muted-foreground text-xs mb-0.5">Médecin</p><p className="font-medium text-foreground">Dr. {user?.prénom} {user?.nom}</p></div>
                <div><p className="text-muted-foreground text-xs mb-0.5">Date</p><p className="font-medium text-foreground">{createdAt ? new Date(createdAt).toLocaleDateString("fr-FR") : new Date().toLocaleDateString("fr-FR")}</p></div>
                <div><p className="text-muted-foreground text-xs mb-0.5">Heure</p><p className="font-medium text-foreground">{createdAt ? new Date(createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p></div>
              </div>
            </div>

            {/* ── Content + Ollama panel side by side ── */}
            <div className="flex gap-4 items-start">

              {/* Transcription card */}
              <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-5 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Transcription</h3>
                  <div className="flex items-center gap-2">
                    {(isNew || status === "draft") && (
                      <button onClick={handleToggleEdit} className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors">
                        <Edit3 size={14} /> {editing ? "Lecture" : "Modifier"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Indication */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Indication</label>
                  {editing && ollamaSuggestion && !ollamaDismissed && !ollamaLoading ? (
                    <p className="text-foreground leading-relaxed text-sm bg-amber-50/60 dark:bg-amber-950/20 rounded-xl p-3 border border-amber-200/50 dark:border-amber-800/30">
                      <HighlightedText text={indication} changes={ollamaChanges} />
                    </p>
                  ) : editing ? (
                    <AutoTextarea value={indication} onChange={setIndication}
                      className="w-full p-3 rounded-xl border border-border bg-background text-foreground text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                  ) : (
                    <p className="text-foreground leading-relaxed text-sm bg-muted/30 rounded-xl p-3">{indication || "—"}</p>
                  )}
                </div>

                {/* Résultat */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Résultat</label>
                  {editing && ollamaSuggestion && !ollamaDismissed && !ollamaLoading ? (
                    <p className="text-foreground leading-relaxed text-sm bg-amber-50/60 dark:bg-amber-950/20 rounded-xl p-3 border border-amber-200/50 dark:border-amber-800/30">
                      <HighlightedText text={resultat} changes={ollamaChanges} />
                    </p>
                  ) : editing ? (
                    <AutoTextarea value={resultat} onChange={setResultat}
                      className="w-full p-3 rounded-xl border border-border bg-background text-foreground text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                  ) : (
                    <p className="text-foreground leading-relaxed text-sm bg-muted/30 rounded-xl p-3">{resultat || "—"}</p>
                  )}
                </div>

                {/* Conclusion */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Conclusion</label>
                  {editing && ollamaSuggestion && !ollamaDismissed && !ollamaLoading ? (
                    <p className="text-foreground leading-relaxed text-sm bg-amber-50/60 dark:bg-amber-950/20 rounded-xl p-3 border border-amber-200/50 dark:border-amber-800/30">
                      <HighlightedText text={conclusion} changes={ollamaChanges} />
                    </p>
                  ) : editing ? (
                    <AutoTextarea value={conclusion} onChange={setConclusion}
                      className="w-full p-3 rounded-xl border border-border bg-background text-foreground text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                  ) : (
                    <p className="text-foreground leading-relaxed text-sm bg-muted/30 rounded-xl p-3">{conclusion || "—"}</p>
                  )}
                </div>
              </div>

              {/* ── Ollama suggestion panel (right) ── */}
              <AnimatePresence>
                {editing && (ollamaLoading || (ollamaSuggestion && !ollamaDismissed)) && (
                  <motion.div
                    initial={{ opacity: 0, x: 40, width: 0 }}
                    animate={{ opacity: 1, x: 0, width: 300 }}
                    exit={{ opacity: 0, x: 40, width: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="flex-shrink-0"
                  >
                    <div className="bg-card rounded-xl border border-border shadow-card p-5 w-[300px]">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(74,123,190,0.10)" }}>
                          {ollamaLoading ? <Loader2 size={14} className="animate-spin" style={{ color: "#4A7BBE" }} /> : <Sparkles size={14} style={{ color: "#4A7BBE" }} />}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm text-foreground">Correction IA</h4>
                          <p className="text-[10px] text-muted-foreground -mt-0.5">
                            {ollamaLoading ? "Analyse en cours…" : `${ollamaChanges.length} correction${ollamaChanges.length > 1 ? "s" : ""} détectée${ollamaChanges.length > 1 ? "s" : ""}`}
                          </p>
                        </div>
                        {!ollamaLoading && (
                          <button onClick={() => { setOllamaSuggestion(null); setOllamaChanges([]); setOllamaDismissed(true); }} className="text-muted-foreground hover:text-foreground">
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {ollamaLoading ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <Loader2 size={24} className="animate-spin text-primary mb-3" />
                          <p className="text-sm text-muted-foreground">Ollama analyse le texte…</p>
                        </div>
                      ) : ollamaSuggestion && !ollamaDismissed ? (
                        <>
                          <div className="space-y-1.5 mb-4 max-h-[320px] overflow-y-auto pr-1">
                            {ollamaChanges.map((c, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md border border-border bg-muted/30">
                                <span className="line-through text-destructive/70 font-mono">{c.original}</span>
                                <span className="text-muted-foreground">→</span>
                                <span className="text-success font-mono font-medium">{c.corrected}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={acceptOllamaSuggestion}
                              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-colors"
                              style={{ background: "rgba(74,123,190,0.12)", color: "#4A7BBE" }}
                            >
                              <Check size={12} /> Accepter
                            </button>
                            <button
                              onClick={() => { setOllamaSuggestion(null); setOllamaChanges([]); setOllamaDismissed(true); }}
                              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                            >
                              <X size={12} /> Ignorer
                            </button>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-destructive text-sm">{error}</div>
            )}

            {/* ── Actions ── */}
            {status === "saved" ? (
              <div className="flex items-center justify-center gap-2 bg-success/10 text-success font-semibold py-3 rounded-xl text-sm border border-success/30">
                <CheckCircle size={16} /> Rapport enregistré
              </div>
            ) : status === "validated" && !isNew ? (
              <button onClick={() => handleAction("save")} disabled={saving !== null}
                className="w-full flex items-center justify-center gap-2 gradient-hero text-white font-semibold py-3 rounded-xl hover:opacity-90 disabled:opacity-60 transition-all text-sm">
                {saving === "save" ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Enregistrer
              </button>
            ) : isNew ? (
              <div className="flex gap-3">
                <button onClick={() => handleAction("draft")} disabled={saving !== null}
                  className="flex-1 flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 text-foreground font-semibold py-3 rounded-xl disabled:opacity-60 transition-all text-sm border border-border">
                  {saving === "draft" ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                  Brouillon
                </button>
                <button onClick={() => handleAction("validate")} disabled={saving !== null}
                  className="flex-1 flex items-center justify-center gap-2 border border-primary text-primary font-semibold py-3 rounded-xl hover:bg-primary/10 disabled:opacity-60 transition-all text-sm">
                  {saving === "validate" ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  Valider
                </button>
                <button onClick={() => handleAction("save")} disabled={saving !== null}
                  className="flex-1 flex items-center justify-center gap-2 gradient-hero text-white font-semibold py-3 rounded-xl hover:opacity-90 disabled:opacity-60 transition-all text-sm">
                  {saving === "save" ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Enregistrer
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button onClick={() => handleAction("validate")} disabled={saving !== null}
                  className="flex-1 flex items-center justify-center gap-2 border border-primary text-primary font-semibold py-3 rounded-xl hover:bg-primary/10 disabled:opacity-60 transition-all text-sm">
                  {saving === "validate" ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  Valider
                </button>
                <button onClick={() => handleAction("save")} disabled={saving !== null}
                  className="flex-1 flex items-center justify-center gap-2 gradient-hero text-white font-semibold py-3 rounded-xl hover:opacity-90 disabled:opacity-60 transition-all text-sm">
                  {saving === "save" ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Enregistrer
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
