import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { downloadCSV } from "@/services/csvService";
import { Download, Loader2 } from "lucide-react";

export default function AdminITExport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDownload = async () => {
    setLoading(true);
    setError("");
    try {
      await downloadCSV();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors du téléchargement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout title="Export CSV">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-card rounded-xl border border-border shadow-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground mb-1">Transcriptions globales</p>
              <p className="text-muted-foreground text-sm">
                Fichier : <code className="bg-muted px-2 py-0.5 rounded text-xs">/media/exports/transcriptions_globales.csv</code>
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                Contient toutes les transcriptions validées par les médecins.
              </p>
            </div>
            <button onClick={handleDownload} disabled={loading}
              className="flex items-center gap-2 gradient-hero text-white font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-60 transition-all shrink-0">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Télécharger le CSV global
            </button>
          </div>
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
                    Séparateur : <code>|</code> — Encodage : UTF-8
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
