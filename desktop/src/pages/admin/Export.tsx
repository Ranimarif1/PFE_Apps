import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getReports, type Report } from "@/services/reportsService";
import { Eye, FileText, Download, Calendar } from "lucide-react";

export default function AdminExport() {
  const navigate = useNavigate();
  const [exportStart, setExportStart] = useState("");
  const [exportEnd,   setExportEnd]   = useState("");

  const { data: reports = [] } = useQuery<Report[]>({ queryKey: ["reports"], queryFn: getReports });

  const savedReports = reports.filter(r => r.status === "saved");

  const handleExport = () => {
    if (exportStart && exportEnd && exportStart > exportEnd) {
      toast.error("Plage de dates invalide", { description: "La date de début doit précéder la date de fin." });
      return;
    }
    const startMs = exportStart ? new Date(exportStart + "T00:00:00").getTime() : -Infinity;
    const endMs   = exportEnd   ? new Date(exportEnd   + "T23:59:59.999").getTime() : Infinity;
    const filtered = savedReports.filter(r => {
      const t = new Date(r.createdAt).getTime();
      return t >= startMs && t <= endMs;
    });
    if (filtered.length === 0) {
      toast.warning("Aucun rapport", { description: "Aucun rapport enregistré dans la période sélectionnée." });
      return;
    }
    const header = ["ID Examen", "Médecin", "Date"];
    const rows = filtered.map(r => [
      r.ID_Exam,
      r.doctorName || "",
      new Date(r.createdAt).toLocaleDateString("fr-FR"),
    ]);
    const csv = [header, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob([String.fromCharCode(0xFEFF) + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const suffix = exportStart || exportEnd
      ? `${exportStart || "debut"}_${exportEnd || "fin"}`
      : new Date().toISOString().slice(0, 10);
    a.download = `rapports_${suffix}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout title="Exporter CSV">
      <div className="flex flex-col min-h-full max-w-full overflow-hidden">
        <div className="mb-4">
          <p className="text-sm font-semibold text-foreground">Exporter les rapports</p>
          <p className="text-xs text-muted-foreground mt-0.5">Tous les comptes rendus radiologiques de la plateforme</p>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border">
            <span className="text-sm font-medium text-foreground">Tous les rapports</span>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                <Calendar size={11} /> Période
              </div>
              <input
                type="date"
                value={exportStart}
                onChange={e => setExportStart(e.target.value)}
                className="px-2 py-1 rounded-md border border-border bg-background text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <span className="text-[11px] text-muted-foreground">→</span>
              <input
                type="date"
                value={exportEnd}
                onChange={e => setExportEnd(e.target.value)}
                className="px-2 py-1 rounded-md border border-border bg-background text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {(exportStart || exportEnd) && (
                <button
                  onClick={() => { setExportStart(""); setExportEnd(""); }}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  Réinitialiser
                </button>
              )}
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 border border-border bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
              >
                <Download size={11} /> Exporter
              </button>
            </div>
          </div>
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col style={{ width: "28%" }} /><col style={{ width: "34%" }} />
                <col style={{ width: "24%" }} /><col style={{ width: "14%" }} />
              </colgroup>
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  {["ID Examen", "Médecin", "Date", "Action"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {savedReports.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-12 text-center text-xs text-muted-foreground">
                    <FileText size={20} className="opacity-25 mb-2 mx-auto" />
                    Aucun rapport pour l'instant
                  </td></tr>
                )}
                {savedReports.map(r => (
                  <tr key={r._id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-foreground">{r.ID_Exam}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.doctorName || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => navigate(`/rapport/${r._id}`)}
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                        <Eye size={12} /> Voir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
