import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { getReport, createReport, updateReport, deleteReport } from "@/services/reportsService";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Edit3, Save, FileText, Check, X, Loader2, ArrowLeft, Pencil, Wand2, CloudUpload, AlertTriangle, Trash2, ClipboardCopy, RotateCcw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useRecording } from "@/contexts/RecordingContext";
import { analyseReport, type SentenceAnalysis } from "@/services/transcriptionService";
import { SentenceCorrector } from "@/components/SentenceCorrector";
import { getStatusBadgeClass, getStatusLabel } from "@/styles/statusSystem";
import { REPORT_CATEGORIES, type ReportCategory } from "@/constants/reportCategories";
import { parseReport, buildContent } from "@/lib/reportContent";

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


/* ════════════════════════════════════════ */
export default function RapportDetail() {
  const { id }       = useParams();
  const location     = useLocation();
  const navigate     = useNavigate();
  const { user }          = useAuth();
  const { refreshQueue } = useRecording();
  const queryClient      = useQueryClient();

  const fromState = location.state as { ID_Exam?: string; transcription?: string; audioId?: string; category?: ReportCategory; _restore?: object } | null;
  const isNew     = id === "new";

  /* ── Report fields ── */
  const initialParsed = parseReport(fromState?.transcription || "");
  const [indication,  setIndication]  = useState(initialParsed.indication);
  const [technique,   setTechnique]   = useState(initialParsed.technique);
  const [resultat,    setResultat]    = useState(initialParsed.resultat);
  const [conclusion,  setConclusion]  = useState(initialParsed.conclusion);
  const [examId,      setExamId]      = useState(fromState?.ID_Exam || "");
  const [editingId,   setEditingId]   = useState(false);
  const [examIdInput, setExamIdInput] = useState(fromState?.ID_Exam || "");
  const [examIdError, setExamIdError] = useState("");
  const [status,      setStatus]      = useState<string>("draft");
  const [createdAt,   setCreatedAt]   = useState<string | null>(null);
  const [category,    setCategory]    = useState<ReportCategory | "">(fromState?.category ?? "");
  const [seniorName,  setSeniorName]  = useState<string>("");
  const [seniorCode,  setSeniorCode]  = useState<string>("");

  /* ── UI states ── */
  const [editing,              setEditing]              = useState(false);
  const [saving,               setSaving]               = useState<"draft" | "validate" | "save" | null>(null);
  const [loading,              setLoading]              = useState(false);
  const [savedAsValidated,     setSavedAsValidated]     = useState<"validate" | "save" | false>(false);
  const [error,                setError]                = useState("");

  /* ── Delete ── */
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError,   setDeleteError]   = useState("");
  const [deleting,      setDeleting]      = useState(false);

  /* ── Unvalidate (back to draft) ── */
  const [confirmUnvalidate, setConfirmUnvalidate] = useState(false);
  const [unvalidating,      setUnvalidating]      = useState(false);

  /* ── Sentence-level correction ── */
  const [analyseSentences,   setAnalyseSentences]   = useState<SentenceAnalysis[] | null>(null);
  const [analyseLoading,     setAnalyseLoading]     = useState(false);
  const [analyseError,       setAnalyseError]       = useState<string | null>(null);
  const [ollamaUnavailable,  setOllamaUnavailable]  = useState(false);

  /* ── Copy for Oracle (plain DOM popup) ── */
  const [oracleIndex, setOracleIndex] = useState(-1);
  const pipWinRef = useRef<Window | null>(null);

  const closePiP = useCallback(() => {
    try { pipWinRef.current?.close(); } catch { /* */ }
    pipWinRef.current = null;
    setOracleIndex(-1);
  }, []);

  useEffect(() => () => { closePiP(); }, [closePiP]);

  const handleCopyForOracle = useCallback(() => {
    if (pipWinRef.current) { closePiP(); return; }

    const sections = [
      { label: "Indication", text: indication },
      { label: "Technique",  text: technique  },
      { label: "Résultat",   text: resultat   },
      { label: "Conclusion", text: conclusion },
    ].filter(s => s.text.trim() !== "");
    if (sections.length === 0) return;

    const win = window.open("", "oracle-pip",
      "width=320,height=180,top=40,left=40,toolbar=no,menubar=no,location=no,status=no,scrollbars=no,resizable=no");
    if (!win) return;

    pipWinRef.current = win;
    win.addEventListener("beforeunload", () => { pipWinRef.current = null; setOracleIndex(-1); });

    function renderStep(idx: number) {
      if (!win) return;
      const current = sections[idx];
      const next    = idx + 1 < sections.length ? sections[idx + 1] : null;

      // Copy current section from the popup window (it has focus)
      const ta = win.document.createElement("textarea");
      ta.value = current.text;
      ta.style.cssText = "position:fixed;opacity:0;top:0;left:0;";
      win.document.body.appendChild(ta);
      ta.focus(); ta.select();
      win.document.execCommand("copy");
      win.document.body.removeChild(ta);

      // Render UI
      win.document.body.style.cssText = "margin:0;padding:0;background:#0f172a;";
      win.document.body.innerHTML = `
        <style>
          * { box-sizing: border-box; }
          #cancel-btn:hover { background: #1e293b !important; }
          #next-btn:hover   { opacity: 0.88; }
          #cancel-btn, #next-btn { transition: opacity .15s, background .15s; }
        </style>
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                    background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);
                    color:#f8fafc;height:100vh;display:flex;flex-direction:column;
                    align-items:center;justify-content:center;gap:14px;
                    padding:20px;box-sizing:border-box;">

          <!-- Progress bar -->
          <div style="display:flex;gap:5px;margin-bottom:2px;">
            ${sections.map((s, i) => `
              <div title="${s.label}" style="width:${Math.floor(220/sections.length)-5}px;height:3px;border-radius:999px;
                background:${i < idx ? '#34d399' : i === idx ? '#60a5fa' : '#1e3a5f'};
                transition:background .3s;"></div>
            `).join("")}
          </div>

          <!-- Icon + label -->
          <div style="text-align:center;line-height:1.4;">
            <div style="font-size:22px;margin-bottom:4px;">✓</div>
            <div style="font-size:13px;font-weight:700;color:#f1f5f9;letter-spacing:.01em;">
              ${current.label}
            </div>
            <div style="font-size:11px;color:#64748b;margin-top:3px;">
              copiée — collez dans Oracle
            </div>
          </div>

          <!-- Buttons -->
          <div style="display:flex;gap:8px;width:100%;">
            <button id="cancel-btn"
              style="flex:1;padding:9px 0;border-radius:10px;
                     border:1px solid #1e3a5f;background:#111827;
                     color:#64748b;font-size:11px;font-weight:600;cursor:pointer;">
              Annuler
            </button>
            <button id="next-btn"
              style="flex:2;padding:9px 0;border-radius:10px;border:none;
                     background:${next ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : 'linear-gradient(135deg,#10b981,#059669)'};
                     color:#fff;font-size:12px;font-weight:700;cursor:pointer;
                     box-shadow:0 2px 8px ${next ? 'rgba(59,130,246,.4)' : 'rgba(16,185,129,.4)'};">
              ${next ? `Suivant &rarr; ${next.label}` : '✓ Terminer'}
            </button>
          </div>

          <span style="font-size:10px;color:#334155;font-variant-numeric:tabular-nums;">
            ${idx + 1} / ${sections.length}
          </span>
        </div>`;

      win.document.getElementById("cancel-btn")!.onclick = () => { win!.close(); };
      win.document.getElementById("next-btn")!.onclick = () => {
        if (!next) { win!.close(); return; }
        renderStep(idx + 1);
      };

      setOracleIndex(idx);
    }

    renderStep(0);
  }, [indication, technique, resultat, conclusion, closePiP]);

  /* ── Auto-save ── */
  const autoSaveTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoAnalyseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [autoSaving,  setAutoSaving]  = useState(false);
  const [autoSavedAt, setAutoSavedAt] = useState<Date | null>(null);

  /* ── Category auto-save (for already-saved/validated reports) ── */
  const [categorySaving,     setCategorySaving]     = useState(false);
  const [categorySaved,      setCategorySaved]      = useState(false);

  const handleCategoryChange = async (next: ReportCategory) => {
    setCategory(next);
    setCategorySaved(false);
    // For new and draft reports, the category is persisted via the main save buttons.
    if (isNew || !id || status === "draft") return;
    setCategorySaving(true);
    try {
      await updateReport(id, { category: next });
      setCategorySaved(true);
      setTimeout(() => setCategorySaved(false), 1800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour du type.");
    } finally {
      setCategorySaving(false);
    }
  };

  const contenu = buildContent(indication, technique, resultat, conclusion);

  /* ── Auto-save on every change (draft reports only, while editing) ── */
  const doAutoSave = useCallback(async (content: string, cat: string, reportId: string) => {
    setAutoSaving(true);
    try {
      await updateReport(reportId, { content, status: "draft", category: cat as ReportCategory });
      setAutoSavedAt(new Date());
    } catch {
      // silently ignore — user can still save manually
    } finally {
      setAutoSaving(false);
    }
  }, []);

  useEffect(() => {
    if (isNew || !id || status !== "draft" || !editing) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      doAutoSave(contenu, category || "autre", id);
    }, 1500);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contenu, editing]);

  /* ── Auto-analyse: trigger suggestions 3s after last change (edit mode only) ── */
  useEffect(() => {
    if (!editing || !contenu.trim() || ollamaUnavailable) return;
    if (autoAnalyseTimer.current) clearTimeout(autoAnalyseTimer.current);
    autoAnalyseTimer.current = setTimeout(() => {
      handleAnalyse();
    }, 3000);
    return () => { if (autoAnalyseTimer.current) clearTimeout(autoAnalyseTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contenu, editing, ollamaUnavailable]);

  /* ── Auto-save as draft when arriving from transcription ── */
  useEffect(() => {
    if (!isNew || !fromState?.transcription) return;
    const cat = (fromState?.category ?? "autre") as ReportCategory;
    createReport({ ID_Exam: examId || "—", content: contenu, category: cat, status: "draft", audioId: fromState?.audioId })
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
          setTechnique(p.technique);
          setResultat(p.resultat);
          setConclusion(p.conclusion);
          setStatus(r.status);
          setCreatedAt(r.createdAt);
          setExamId(r.ID_Exam);
          setExamIdInput(r.ID_Exam);
          if (r.category) setCategory(r.category);
          setSeniorName(r.seniorName || "");
          setSeniorCode(r.seniorCode || "");
        })
        .catch(() => setError("Rapport introuvable."))
        .finally(() => setLoading(false));
    }
  }, [id, isNew]);

  /* ── Toggle edit mode ── */
  const handleToggleEdit = () => setEditing(prev => !prev);

  /* ── Apply a single word correction across all sections ── */
  const applyCorrection = (original: string, suggestion: string) => {
    const escaped = original.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?<![A-Za-zÀ-ÖØ-öø-ÿ])${escaped}(?![A-Za-zÀ-ÖØ-öø-ÿ])`, "");
    const sub = (t: string) => t.replace(re, suggestion);
    setIndication(p => sub(p));
    setTechnique(p => sub(p));
    setResultat(p => sub(p));
    setConclusion(p => sub(p));
  };

  /* ── Trigger sentence-level analysis ── */
  const handleAnalyse = async () => {
    console.log("[Analyse] bouton cliqué");
    setAnalyseLoading(true);
    setAnalyseSentences(null);
    setAnalyseError(null);
    setOllamaUnavailable(false);
    const text = buildContent(indication, technique, resultat, conclusion).trim();
    console.log("[Analyse] texte envoyé :", text.slice(0, 120));
    if (!text) {
      setAnalyseError("Le rapport est vide.");
      setAnalyseLoading(false);
      return;
    }
    try {
      const result = await analyseReport(text);
      console.log("[Analyse] réponse :", result);
      setAnalyseSentences(result.sentences ?? []);
      setOllamaUnavailable(!!result.ollama_unavailable);
    } catch (err) {
      console.error("[Analyse] erreur :", err);
      setAnalyseError(err instanceof Error ? err.message : "Erreur lors de l'analyse.");
    } finally {
      setAnalyseLoading(false);
    }
  };

  /* ── Save ── */
  const handleAction = async (action: "draft" | "validate" | "save") => {
    if (!category) {
      setError("Veuillez sélectionner un type d'examen.");
      return;
    }
    setSaving(action);
    setError("");
    const newStatus = action === "draft" ? "draft" : action === "validate" ? "validated" : "saved";
    try {
      if (isNew) {
        await createReport({ ID_Exam: examId, content: contenu, category, status: newStatus, audioId: fromState?.audioId });
        refreshQueue();
      } else if (id) {
        await updateReport(id, { content: contenu, status: newStatus, category });
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

  /* ── Unvalidate ── */
  const handleUnvalidate = async () => {
    if (!id) return;
    setUnvalidating(true);
    try {
      await updateReport(id, { status: "draft" });
      setStatus("draft");
      setConfirmUnvalidate(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la remise en brouillon.");
    } finally {
      setUnvalidating(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteReport(id);
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      refreshQueue();
      navigate("/historique");
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Erreur lors de la suppression.");
      setDeleting(false);
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
      {/* ══ Delete confirmation modal ══════════════════════════════════════════ */}
      <AlertDialog open={confirmDelete} onOpenChange={open => { if (!open) { setConfirmDelete(false); setDeleteError(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le rapport ?</AlertDialogTitle>
            <AlertDialogDescription>
              Rapport <span className="font-mono font-semibold text-foreground">{examId || "—"}</span> — cette action est{" "}
              <span className="font-semibold text-destructive">définitive</span>. L'audio associé restera dans la file d'attente.
              {deleteError && <span className="block mt-2 text-destructive text-sm">{deleteError}</span>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting
                ? <><Loader2 size={13} className="animate-spin mr-1.5" /> Suppression…</>
                : <><Trash2 size={13} className="mr-1.5" /> Supprimer</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ══ Unvalidate confirmation modal ════════════════════════════════════ */}
      <AlertDialog open={confirmUnvalidate} onOpenChange={open => { if (!open) setConfirmUnvalidate(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remettre en brouillon ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le rapport <span className="font-mono font-semibold text-foreground">{examId || "—"}</span> repassera au statut{" "}
              <span className="font-semibold text-foreground">Brouillon</span> et pourra être modifié à nouveau par le médecin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unvalidating}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnvalidate}
              disabled={unvalidating}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {unvalidating
                ? <><Loader2 size={13} className="animate-spin mr-1.5" /> Traitement…</>
                : <><RotateCcw size={13} className="mr-1.5" /> Remettre en brouillon</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <div className="bg-card rounded-xl border border-border shadow-card p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  {!isNew && status && (
                    <span className={`${getStatusBadgeClass(status)} capitalize`}>
                      {getStatusLabel(status, "report")}
                    </span>
                  )}
                </div>
                {!isNew && (
                  <button
                    onClick={() => { setConfirmDelete(true); setDeleteError(""); }}
                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors"
                    title="Supprimer le rapport"
                  >
                    <Trash2 size={14} /> Supprimer
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-sm">
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
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Type d'examen</p>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={category}
                      onChange={e => handleCategoryChange(e.target.value as ReportCategory)}
                      disabled={categorySaving}
                      className="font-medium text-foreground bg-background border border-border rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                    >
                      <option value="" disabled>Sélectionner…</option>
                      {REPORT_CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    {categorySaving && <Loader2 size={11} className="animate-spin text-muted-foreground" />}
                    {categorySaved && !categorySaving && <Check size={11} className="text-success" />}
                  </div>
                </div>
                <div><p className="text-muted-foreground text-xs mb-0.5">Médecin</p><p className="font-medium text-foreground">Dr. {user?.prénom} {user?.nom}</p></div>
                {(seniorName || seniorCode) && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Senior référent</p>
                    <p className="font-medium text-foreground">{seniorCode ? `${seniorCode} · ` : ""}{seniorName || "—"}</p>
                  </div>
                )}
                <div><p className="text-muted-foreground text-xs mb-0.5">Date</p><p className="font-medium text-foreground">{createdAt ? new Date(createdAt).toLocaleDateString("fr-FR") : new Date().toLocaleDateString("fr-FR")}</p></div>
                <div><p className="text-muted-foreground text-xs mb-0.5">Heure</p><p className="font-medium text-foreground">{createdAt ? new Date(createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p></div>
              </div>
            </div>

            {/* ── Content + AI Sidebar ── */}
            <div className="flex flex-col lg:flex-row gap-4 items-start">

              {/* Transcription card */}
              <div className="bg-card rounded-xl border border-border shadow-card p-4 sm:p-6 space-y-5 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-foreground">Transcription</h3>
                    {/* Auto-save indicator */}
                    {!isNew && status === "draft" && editing && (
                      <span className="flex items-center gap-1 text-[11px]">
                        {autoSaving ? (
                          <><Loader2 size={10} className="animate-spin text-muted-foreground" /><span className="text-muted-foreground">Sauvegarde…</span></>
                        ) : autoSavedAt ? (
                          <><CloudUpload size={10} className="text-success" /><span className="text-success">Sauvegardé à {autoSavedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span></>
                        ) : null}
                      </span>
                    )}
                  </div>
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
                  {editing ? (
                    <AutoTextarea value={indication} onChange={setIndication}
                      className="w-full p-3 rounded-xl border border-border bg-background text-foreground text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                  ) : (
                    <p className="text-foreground leading-relaxed text-sm bg-muted/30 rounded-xl p-3 whitespace-pre-wrap break-words min-h-[2.75rem]">{indication || "—"}</p>
                  )}
                </div>

                {/* Technique — IRM / Scanner only */}
                {(category === "irm" || category === "scanner") && (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Technique</label>
                    {editing ? (
                      <AutoTextarea value={technique} onChange={setTechnique}
                        className="w-full p-3 rounded-xl border border-border bg-background text-foreground text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                    ) : (
                      <p className="text-foreground leading-relaxed text-sm bg-muted/30 rounded-xl p-3 whitespace-pre-wrap break-words min-h-[2.75rem]">{technique || "—"}</p>
                    )}
                  </div>
                )}

                {/* Résultat */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Résultat</label>
                  {editing ? (
                    <AutoTextarea value={resultat} onChange={setResultat}
                      className="w-full p-3 rounded-xl border border-border bg-background text-foreground text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                  ) : (
                    <p className="text-foreground leading-relaxed text-sm bg-muted/30 rounded-xl p-3 whitespace-pre-wrap break-words min-h-[2.75rem]">{resultat || "—"}</p>
                  )}
                </div>

                {/* Conclusion */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Conclusion</label>
                  {editing ? (
                    <AutoTextarea value={conclusion} onChange={setConclusion}
                      className="w-full p-3 rounded-xl border border-border bg-background text-foreground text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                  ) : (
                    <p className="text-foreground leading-relaxed text-sm bg-muted/30 rounded-xl p-3 whitespace-pre-wrap break-words min-h-[2.75rem]">{conclusion || "—"}</p>
                  )}
                </div>
              </div>

              {/* ── AI Suggestions Sidebar ── */}
              <AnimatePresence>
                {editing && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ type: "spring", damping: 30, stiffness: 260 }}
                    className="w-full lg:w-[22rem] lg:shrink-0 lg:sticky lg:top-4"
                  >
                    <div className="w-full bg-card rounded-xl border border-border shadow-card overflow-hidden">

                      {/* Sidebar header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-border"
                        style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, transparent 100%)" }}>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-violet-500/10 flex items-center justify-center">
                            <Wand2 size={13} className="text-violet-500" />
                          </div>
                          <span className="text-sm font-semibold text-foreground">Assistant IA</span>
                          {analyseSentences !== null && (() => {
                            const seen = new Set<string>();
                            const count = analyseSentences.flatMap(s => s.corrections).filter(c => {
                              if (seen.has(c.mot_original)) return false;
                              seen.add(c.mot_original);
                              return true;
                            }).length;
                            return count > 0 ? (
                              <span className="text-[10px] bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium px-1.5 py-0.5 rounded-full">
                                {count} correction{count > 1 ? "s" : ""}
                              </span>
                            ) : null;
                          })()}
                        </div>
                        <button
                          onClick={handleAnalyse}
                          disabled={analyseLoading}
                          title="Relancer l'analyse"
                          className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-violet-500 hover:bg-violet-500/10 transition-all disabled:opacity-40"
                        >
                          {analyseLoading
                            ? <Loader2 size={12} className="animate-spin text-violet-500" />
                            : <Wand2 size={12} />}
                        </button>
                      </div>

                      {/* Sidebar body */}
                      <div className="p-3 space-y-2 max-h-[45vh] lg:max-h-[70vh] overflow-y-auto scrollbar-thin">

                        {/* Loading skeleton */}
                        {analyseLoading && (
                          <div className="space-y-2 py-2">
                            {[1, 2, 3].map(i => (
                              <div key={i} className="rounded-lg bg-muted/60 animate-pulse h-14" style={{ opacity: 1 - i * 0.2 }} />
                            ))}
                            <p className="text-[11px] text-center text-muted-foreground pt-1">Analyse du texte en cours…</p>
                          </div>
                        )}

                        {/* Error */}
                        {!analyseLoading && analyseError && (
                          <div className="flex items-start gap-2 bg-destructive/8 border border-destructive/20 rounded-lg px-3 py-2.5">
                            <X size={13} className="text-destructive mt-0.5 shrink-0" />
                            <p className="text-xs text-destructive">{analyseError}</p>
                          </div>
                        )}

                        {/* Waiting for first analysis */}
                        {!analyseLoading && !analyseError && analyseSentences === null && (
                          <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                            <div className="w-10 h-10 rounded-xl bg-violet-500/8 flex items-center justify-center">
                              <Wand2 size={18} className="text-violet-400" />
                            </div>
                            <p className="text-xs text-muted-foreground">L'analyse démarrera automatiquement<br />après 3 secondes d'inactivité.</p>
                          </div>
                        )}

                        {/* Ollama unavailable */}
                        {!analyseLoading && !analyseError && analyseSentences !== null && ollamaUnavailable && (
                          <div className="flex items-start gap-3 bg-amber-500/8 border border-amber-500/30 rounded-lg px-3 py-3">
                            <div className="w-7 h-7 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                              <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Problème de connexion à l'assistant IA</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">Impossible de joindre Ollama. Vérifiez que le service est démarré, puis réessayez.</p>
                            </div>
                          </div>
                        )}

                        {/* All clean */}
                        {!analyseLoading && !analyseError && !ollamaUnavailable && analyseSentences !== null && analyseSentences.every(s => s.corrections.length === 0) && (
                          <div className="flex items-center gap-3 bg-success/8 border border-success/20 rounded-lg px-3 py-3">
                            <div className="w-7 h-7 rounded-full bg-success/15 flex items-center justify-center shrink-0">
                              <Check size={14} className="text-success" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-success">Aucune correction détectée</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">Le texte semble correct.</p>
                            </div>
                          </div>
                        )}

                        {/* Corrections list */}
                        {!analyseLoading && !analyseError && analyseSentences !== null && analyseSentences.some(s => s.corrections.length > 0) && (
                          <SentenceCorrector
                            corrections={(() => {
                              const seen = new Set<string>();
                              return analyseSentences
                                .flatMap(s => s.corrections)
                                .filter(c => {
                                  if (seen.has(c.mot_original)) return false;
                                  seen.add(c.mot_original);
                                  return true;
                                });
                            })()}
                            onAccept={applyCorrection}
                          />
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-destructive text-sm">{error}</div>
            )}

            {/* ── Copy for Oracle (PiP floating window) ── */}
            <button
              type="button"
              onClick={handleCopyForOracle}
              className={`w-full flex items-center justify-center gap-2 border rounded-xl py-2.5 text-sm font-medium transition-all ${
                oracleIndex >= 0
                  ? "border-primary/40 bg-primary/5 text-primary"
                  : "border-border hover:border-primary/40 hover:text-primary hover:bg-primary/5"
              }`}
            >
              {oracleIndex >= 0
                ? <><Check size={15} className="text-emerald-500" /><span className="text-emerald-600">Oracle en cours…</span></>
                : <><ClipboardCopy size={15} /><span>Copier pour Oracle</span></>
              }
            </button>

            {/* ── Actions ── */}
            {status === "saved" ? (
              <div className="flex items-center justify-center gap-2 bg-success/10 text-success font-semibold py-3 rounded-xl text-sm border border-success/30">
                <CheckCircle size={16} /> Rapport enregistré
              </div>
            ) : status === "validated" && !isNew ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => setConfirmUnvalidate(true)} disabled={saving !== null || unvalidating}
                  className="flex-1 flex items-center justify-center gap-2 border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 font-semibold py-3 rounded-xl disabled:opacity-60 transition-all text-sm dark:border-amber-700 dark:text-amber-400 dark:bg-amber-900/20 dark:hover:bg-amber-900/30">
                  <RotateCcw size={16} /> Remettre en brouillon
                </button>
                <button onClick={() => handleAction("save")} disabled={saving !== null || unvalidating}
                  className="flex-1 flex items-center justify-center gap-2 gradient-hero text-white font-semibold py-3 rounded-xl hover:opacity-90 disabled:opacity-60 transition-all text-sm">
                  {saving === "save" ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Enregistrer
                </button>
              </div>
            ) : isNew ? (
              <div className="flex flex-col sm:flex-row gap-3">
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
              <div className="flex flex-col sm:flex-row gap-3">
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
