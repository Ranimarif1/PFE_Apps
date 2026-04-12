import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { getTrainingData, fetchAudioBlob, downloadTrainingZip, type TrainingEntry } from "@/services/audioService";
import { useQuery } from "@tanstack/react-query";
import { FileAudio, FileText, Search, Download, Loader2, Database } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_BADGE: Record<string, string> = {
  saved:     "bg-success/10 text-success",
  validated: "bg-primary/10 text-primary",
  draft:     "bg-warning/10 text-warning",
};
const STATUS_LABELS: Record<string, string> = {
  saved: "enregistré", validated: "validé", draft: "brouillon",
};

const fmt = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminITTraining() {
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("tous");
  const [downloading,  setDownloading]  = useState<string | null>(null);
  const [expanded,     setExpanded]     = useState<string | null>(null);

  const { data: entries = [], isLoading } = useQuery<TrainingEntry[]>({
    queryKey: ["training"],
    queryFn:  getTrainingData,
  });

  const filtered = entries.filter(e => {
    if (filterStatus !== "tous" && e.status !== filterStatus) return false;
    if (search && !e.examId.toLowerCase().includes(search.toLowerCase()) &&
        !e.doctorName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleDownloadAudio = async (e: TrainingEntry) => {
    setDownloading(`audio-${e.audioId}`);
    try {
      const blob = await fetchAudioBlob(e.audioId);
      const ext  = blob.type.includes("webm") ? "webm" : blob.type.includes("mp4") ? "mp4" : "wav";
      downloadBlob(blob, `${e.examId}_audio.${ext}`);
    } catch { /* ignore */ }
    finally { setDownloading(null); }
  };

  const handleDownloadText = (e: TrainingEntry) => {
    const blob = new Blob([e.text], { type: "text/plain;charset=utf-8" });
    downloadBlob(blob, `${e.examId}_transcription.txt`);
  };

  const handleDownloadZip = async (status: "all" | "saved") => {
    setDownloading(`zip-${status}`);
    try {
      await downloadTrainingZip(status);
    } catch { /* ignore */ }
    finally { setDownloading(null); }
  };

  return (
    <AppLayout title="Données d'entraînement">
      <div className="space-y-6">

        {/* Header stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Paires Audio|Texte", value: entries.length, icon: Database, color: "text-primary" },
            { label: "Validés / Enregistrés", value: entries.filter(e => e.status !== "draft").length, icon: FileAudio, color: "text-success" },
            { label: "Durée totale", value: fmt(entries.reduce((s, e) => s + (e.duration || 0), 0)), icon: FileText, color: "text-amber-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-card rounded-xl border border-border shadow-card p-5 flex items-center gap-4">
              <div className={cn("w-10 h-10 rounded-lg bg-muted flex items-center justify-center", color)}>
                <Icon size={18} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex flex-wrap gap-3 items-center">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <FileAudio size={16} className="text-primary" /> Dataset Audio|Texte
            </h3>

            <div className="flex gap-2 ml-4">
              {["tous", "draft", "validated", "saved"].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={cn("px-3 py-1 rounded-lg text-xs font-medium transition-all capitalize",
                    filterStatus === s ? "gradient-hero text-white" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
                  {s === "tous" ? "Tous" : STATUS_LABELS[s]}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="ID Exam, médecin…"
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 w-48" />
              </div>
              <button onClick={() => handleDownloadZip("saved")} disabled={!!downloading || filtered.length === 0}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 disabled:opacity-50 transition-all">
                {downloading === "zip-saved"
                  ? <><Loader2 size={12} className="animate-spin" /> Export…</>
                  : <><Download size={12} /> ZIP enregistrés</>}
              </button>
              <button onClick={() => handleDownloadZip("all")} disabled={!!downloading || filtered.length === 0}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg gradient-hero text-white hover:opacity-90 disabled:opacity-50 transition-all">
                {downloading === "zip-all"
                  ? <><Loader2 size={12} className="animate-spin" /> Export…</>
                  : <><Download size={12} /> ZIP tous</>}
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-primary" size={28} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {["ID Exam", "Médecin", "Date", "Durée", "Statut", "Transcription", "Téléchargement"].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(entry => (
                    <>
                      <tr key={entry.audioId}
                        className="hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => setExpanded(expanded === entry.audioId ? null : entry.audioId)}>
                        <td className="px-5 py-3 font-mono font-semibold text-foreground">{entry.examId}</td>
                        <td className="px-5 py-3 text-muted-foreground">{entry.doctorName || "—"}</td>
                        <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                          {new Date(entry.createdAt).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-5 py-3 font-mono text-muted-foreground">
                          {entry.duration > 0 ? fmt(entry.duration) : "—"}
                        </td>
                        <td className="px-5 py-3">
                          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full capitalize",
                            STATUS_BADGE[entry.status] ?? "bg-muted text-muted-foreground")}>
                            {STATUS_LABELS[entry.status] ?? entry.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 max-w-xs">
                          <p className="text-xs text-muted-foreground truncate">
                            {entry.text.slice(0, 80)}{entry.text.length > 80 ? "…" : ""}
                          </p>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <button onClick={() => handleDownloadAudio(entry)}
                              disabled={!!downloading}
                              title="Télécharger l'audio"
                              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 transition-all">
                              {downloading === `audio-${entry.audioId}`
                                ? <Loader2 size={11} className="animate-spin" />
                                : <FileAudio size={11} />}
                              Audio
                            </button>
                            <button onClick={() => handleDownloadText(entry)}
                              title="Télécharger la transcription"
                              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-all">
                              <FileText size={11} /> Texte
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded transcription */}
                      {expanded === entry.audioId && (
                        <tr key={`${entry.audioId}-expanded`} className="bg-muted/10">
                          <td colSpan={7} className="px-5 py-3">
                            <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-mono bg-muted/40 rounded-lg p-3">
                              {entry.text}
                            </p>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                  {filtered.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                        Aucune paire Audio|Texte disponible.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
