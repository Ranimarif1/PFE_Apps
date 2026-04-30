import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { downloadCSV } from "@/services/csvService";
import { Download, Loader2, Calendar } from "lucide-react";

type Preset = "all" | "7d" | "30d" | "90d" | "ytd" | "custom";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminITExport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preset, setPreset] = useState<Preset>("all");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const applyPreset = (p: Preset) => {
    setPreset(p);
    if (p === "all")    { setStart(""); setEnd(""); }
    else if (p === "7d")  { setStart(isoDaysAgo(7));  setEnd(isoToday()); }
    else if (p === "30d") { setStart(isoDaysAgo(30)); setEnd(isoToday()); }
    else if (p === "90d") { setStart(isoDaysAgo(90)); setEnd(isoToday()); }
    else if (p === "ytd") { setStart(`${new Date().getFullYear()}-01-01`); setEnd(isoToday()); }
  };

  const handleDownload = async () => {
    setLoading(true);
    setError("");
    try {
      if (start && end && start > end) {
        throw new Error("La date de début doit précéder la date de fin.");
      }
      await downloadCSV({ start: start || undefined, end: end || undefined });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors du téléchargement.");
    } finally {
      setLoading(false);
    }
  };

  const presets: { value: Preset; label: string }[] = [
    { value: "all", label: "Tout" },
    { value: "7d",  label: "7 derniers jours" },
    { value: "30d", label: "30 derniers jours" },
    { value: "90d", label: "90 derniers jours" },
    { value: "ytd", label: "Cette année" },
    { value: "custom", label: "Personnalisé" },
  ];

  return (
    <AppLayout title="Export CSV">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-card rounded-xl border border-border shadow-card p-6">
          <p className="font-semibold text-foreground mb-1">Transcriptions globales</p>
          <p className="text-muted-foreground text-sm mb-5">
            Contient les transcriptions validées par les médecins. Choisissez une période ou téléchargez l'archive complète.
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            {presets.map(p => (
              <button key={p.value} onClick={() => applyPreset(p.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  preset === p.value
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-background text-muted-foreground border-border hover:bg-muted/50"
                }`}>
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Calendar size={12} /> Date de début
              </label>
              <input type="date" value={start}
                onChange={e => { setStart(e.target.value); setPreset("custom"); }}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Calendar size={12} /> Date de fin
              </label>
              <input type="date" value={end}
                onChange={e => { setEnd(e.target.value); setPreset("custom"); }}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          <button onClick={handleDownload} disabled={loading}
            className="flex items-center gap-2 gradient-hero text-white font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-60 transition-all">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {start || end ? "Télécharger pour la période" : "Télécharger l'archive complète"}
          </button>

          {error && (
            <div className="mt-4 bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-destructive text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border shadow-card p-6">
          <h3 className="font-semibold text-foreground text-sm mb-3">Format du fichier</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["id_exam", "doctor_name", "date", "time", "transcription"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-3 font-mono text-muted-foreground text-xs" colSpan={5}>
                    Séparateur : <code>;</code> — Encodage : UTF-8 avec BOM
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
