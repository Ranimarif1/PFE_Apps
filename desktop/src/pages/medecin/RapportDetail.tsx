import { useState, useEffect, useCallback, useLayoutEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { getReport, createReport, updateReport } from "@/services/reportsService";
import { CheckCircle, Edit3, Save, FileText, Sparkles, Check, X, Loader2, ArrowLeft, BookOpen, Pencil, Mic, Ruler, Stethoscope, type LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useRecording } from "@/contexts/RecordingContext";
import { checkText, loadDictionary, isDictionaryReady, getDictionaryCount } from "@/lib/spellChecker";
import type { Suggestion } from "@/lib/spellChecker";
import { getStatusBadgeClass, getStatusLabel } from "@/styles/statusSystem";

/* ── Suggestion type styling ── */
const TYPE_STYLE: Record<string, { label: string; Icon: LucideIcon; classes: string }> = {
  stt:     { label: "STT",     Icon: Mic,         classes: "bg-[rgba(100,116,139,0.22)] text-[#334155] border border-[rgba(100,116,139,0.4)]" },
  ortho:   { label: "Ortho",   Icon: Pencil,      classes: "bg-[rgba(217,119,6,0.22)] text-[#7C4A08] border border-[rgba(217,119,6,0.5)]" },
  accord:  { label: "Accord",  Icon: Ruler,       classes: "bg-[rgba(143,188,230,0.25)] text-[#2F4C6E] border border-[rgba(143,188,230,0.5)]" },
  medical: { label: "Médical", Icon: Stethoscope, classes: "bg-[rgba(143,211,179,0.25)] text-[#2F5A46] border border-[rgba(143,211,179,0.5)]" },
};

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

/* ── Content parser / builder ── */
function parseReport(text: string) {
  // Accent-tolerant, colon-optional regex matching
  const iMatch = /indication\s*:?/i.exec(text);
  const rMatch = /r[ée]sultat\s*:?/i.exec(text);
  const cMatch = /conclusion\s*:?/i.exec(text);

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
    return text.slice(afterKeyword, end === -1 ? text.length : end).trim();
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
  const { refreshQueue }  = useRecording();

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

  /* ── Dictionary state ── */
  const [dictReady, setDictReady] = useState(isDictionaryReady());
  const [dictLoading, setDictLoading] = useState(false);

  /* ── Suggestion states ── */
  const [suggestions,          setSuggestions]          = useState<Suggestion[]>([]);
  const [loadingSuggestions,   setLoadingSuggestions]   = useState(false);
  const [showSuggestions,      setShowSuggestions]      = useState(false);
  const [appliedSuggestions,   setAppliedSuggestions]   = useState<Set<number>>(new Set());
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<number>>(new Set());

  const contenu = buildContent(indication, resultat, conclusion);

  /* ── Auto-load dictionary on mount ── */
  useEffect(() => {
    if (!isDictionaryReady()) {
      setDictLoading(true);
      loadDictionary().then(() => {
        setDictReady(isDictionaryReady());
        setDictLoading(false);
      });
    }
  }, []);

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

  /* ── Analyze text ── */
  const analyzeText = useCallback(() => {
    setLoadingSuggestions(true);
    setShowSuggestions(true);
    setAppliedSuggestions(new Set());
    setDismissedSuggestions(new Set());
    setTimeout(() => {
      setSuggestions(checkText(contenu));
      setLoadingSuggestions(false);
    }, 400);
  }, [contenu]);

  /* ── Auto-analyze when entering edit mode ── */
  const handleToggleEdit = () => {
    const next = !editing;
    setEditing(next);
    if (next) {
      analyzeText();
    } else {
      setShowSuggestions(false);
    }
  };

  /* ── Apply / dismiss suggestions ── */
  const applySuggestion = (s: Suggestion, idx: number) => {
    const updated = buildContent(indication, resultat, conclusion).replace(s.original, s.correction);
    const p = parseReport(updated);
    setIndication(p.indication);
    setResultat(p.resultat);
    setConclusion(p.conclusion);
    setAppliedSuggestions(prev => new Set(prev).add(idx));
  };

  const applyAll = () => {
    let updated = contenu;
    suggestions.forEach((s, i) => {
      if (!appliedSuggestions.has(i) && !dismissedSuggestions.has(i)) {
        updated = updated.replace(s.original, s.correction);
        setAppliedSuggestions(prev => new Set(prev).add(i));
      }
    });
    const p = parseReport(updated);
    setIndication(p.indication);
    setResultat(p.resultat);
    setConclusion(p.conclusion);
  };

  const visibleSuggestions = suggestions.filter((_, i) => !appliedSuggestions.has(i) && !dismissedSuggestions.has(i));

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
      <div className="max-w-5xl mx-auto">
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

                {/* Dictionary status badge */}
                <span
                  className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${!dictReady && !dictLoading ? "bg-muted text-muted-foreground" : ""}`}
                  style={
                    dictReady
                      ? { background: "rgba(143,211,179,0.14)", color: "#4D7F67" }
                      : dictLoading
                        ? { background: "rgba(143,188,230,0.14)", color: "#4C6F91" }
                        : undefined
                  }
                >
                  {dictLoading ? (
                    <><Loader2 size={10} className="animate-spin" /> Chargement dictionnaire…</>
                  ) : dictReady ? (
                    <><BookOpen size={10} /> {getDictionaryCount().toLocaleString()} termes médicaux</>
                  ) : (
                    <>Mode règles uniquement</>
                  )}
                </span>
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

            {/* ── Content + Suggestions side by side ── */}
            <div className="flex gap-4 items-start">

              {/* Transcription card */}
              <div className={`bg-card rounded-xl border border-border shadow-card p-6 space-y-5 transition-all ${showSuggestions && visibleSuggestions.length > 0 ? "flex-1" : "w-full"}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Transcription</h3>
                  <div className="flex items-center gap-2">
                    {editing && (
                      <button
                        onClick={analyzeText}
                        disabled={loadingSuggestions}
                        className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50" style={{ background: "rgba(74,123,190,0.10)", color: "#4A7BBE" }}
                      >
                        {loadingSuggestions ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        {loadingSuggestions ? "Analyse..." : "Re-analyser"}
                      </button>
                    )}
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

              {/* ── Suggestions panel ── */}
              <AnimatePresence>
                {showSuggestions && editing && (
                  <motion.div
                    initial={{ opacity: 0, x: 40, width: 0 }}
                    animate={{ opacity: 1, x: 0, width: 340 }}
                    exit={{ opacity: 0, x: 40, width: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="flex-shrink-0"
                  >
                    <div className="bg-card rounded-xl border border-border shadow-card p-5 w-[340px]">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(74,123,190,0.10)" }}>
                            <Sparkles size={14} style={{ color: "#4A7BBE" }} />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm text-foreground">MedCorrect</h4>
                            <p className="text-[10px] text-muted-foreground -mt-0.5">
                              {dictReady ? "Dictionnaire + Règles + STT" : "Règles + STT"}
                            </p>
                          </div>
                        </div>
                        <button onClick={() => setShowSuggestions(false)} className="text-muted-foreground hover:text-foreground">
                          <X size={14} />
                        </button>
                      </div>

                      {loadingSuggestions ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                          <Loader2 size={28} className="animate-spin text-primary mb-3" />
                          <p className="text-sm text-muted-foreground">Analyse du texte…</p>
                          <p className="text-xs text-muted-foreground mt-1">Vérification orthographique & grammaticale</p>
                        </div>
                      ) : visibleSuggestions.length === 0 ? (
                        <div className="text-center py-10">
                          <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
                            <CheckCircle size={20} className="text-success" />
                          </div>
                          <p className="text-sm font-medium text-foreground mb-1">Aucune correction nécessaire</p>
                          <p className="text-xs text-muted-foreground">Le texte semble correct ✓</p>
                        </div>
                      ) : (
                        <>
                          {/* Stats summary */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs text-muted-foreground">{visibleSuggestions.length} suggestion{visibleSuggestions.length > 1 ? "s" : ""}</p>
                              {Object.entries(
                                visibleSuggestions.reduce<Record<string, number>>((acc, s) => {
                                  const t = s.type || "ortho";
                                  acc[t] = (acc[t] || 0) + 1;
                                  return acc;
                                }, {})
                              ).map(([type, count]) => {
                                const ts = TYPE_STYLE[type] || TYPE_STYLE.ortho;
                                return (
                                  <span key={type} className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${ts.classes}`}>
                                    <ts.Icon size={9} /> {count}
                                  </span>
                                );
                              })}
                            </div>
                            <button onClick={applyAll} className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                              Tout appliquer
                            </button>
                          </div>

                          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
                            {suggestions.map((s, i) => {
                              if (appliedSuggestions.has(i) || dismissedSuggestions.has(i)) return null;
                              const ts = TYPE_STYLE[s.type || "ortho"] || TYPE_STYLE.ortho;
                              return (
                                <motion.div key={i}
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  transition={{ delay: i * 0.03 }}
                                  className="bg-muted/40 rounded-lg p-3 border border-border"
                                >
                                  {/* Type badge + confidence */}
                                  <div className="flex items-center gap-1.5 mb-1.5">
                                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${ts.classes}`}>
                                      <ts.Icon size={10} /> {ts.label}
                                    </span>
                                    {s.confidence && (
                                      <div className="flex items-center gap-1 ml-auto">
                                        <div className="w-8 h-1 rounded-full bg-border overflow-hidden">
                                          <div
                                            className={`h-full rounded-full ${
                                              s.confidence > 0.85 ? "bg-[#8FD3B3]" : s.confidence > 0.6 ? "bg-[#F59E0B]" : "bg-[#E38C8C]"
                                            }`}
                                            style={{ width: `${s.confidence * 100}%` }}
                                          />
                                        </div>
                                        <span className="text-[9px] text-muted-foreground tabular-nums">{Math.round(s.confidence * 100)}%</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Original → Correction */}
                                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                    <span className="text-xs line-through text-destructive/70 font-mono">{s.original}</span>
                                    <span className="text-muted-foreground text-xs">→</span>
                                    <span className="text-xs font-semibold text-success font-mono">{s.correction}</span>
                                  </div>

                                  <p className="text-[11px] text-muted-foreground mb-2">{s.reason}</p>

                                  {/* Alternatives */}
                                  {s.alternatives && s.alternatives.length > 0 && (
                                    <div className="flex gap-1 flex-wrap mb-2">
                                      {s.alternatives.map((alt, ai) => (
                                        <button key={ai}
                                          onClick={() => {
                                            const updated = contenu.replace(s.original, alt);
                                            const p = parseReport(updated);
                                            setIndication(p.indication);
                                            setResultat(p.resultat);
                                            setConclusion(p.conclusion);
                                            setAppliedSuggestions(prev => new Set(prev).add(i));
                                          }}
                                          className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-background text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                                        >
                                          {alt}
                                        </button>
                                      ))}
                                    </div>
                                  )}

                                  {/* Action buttons */}
                                  <div className="flex gap-1.5">
                                    <button onClick={() => applySuggestion(s, i)}
                                      className="flex-1 flex items-center justify-center gap-1 text-xs font-medium py-1.5 rounded-md bg-success/10 text-success hover:bg-success/20 transition-colors">
                                      <Check size={12} /> Appliquer
                                    </button>
                                    <button onClick={() => setDismissedSuggestions(prev => new Set(prev).add(i))}
                                      className="flex-1 flex items-center justify-center gap-1 text-xs font-medium py-1.5 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors">
                                      <X size={12} /> Ignorer
                                    </button>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </>
                      )}
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
