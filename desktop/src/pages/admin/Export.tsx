import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import JSZip from "jszip";
import { getReports, type Report } from "@/services/reportsService";
import { generateReportPdf, pdfFilenameForReport } from "@/lib/reportPdf";
import { parseReport } from "@/lib/reportContent";
import { getCategoryLabel } from "@/constants/reportCategories";
import { Eye, FileText, Download, Calendar, Loader2 } from "lucide-react";

export default function AdminExport() {
  const navigate = useNavigate();
  const [exportStart, setExportStart] = useState("");
  const [exportEnd,   setExportEnd]   = useState("");
  const [exporting,   setExporting]   = useState(false);

  const { data: reports = [] } = useQuery<Report[]>({ queryKey: ["reports"], queryFn: getReports });

  const savedReports = reports.filter(r => r.status === "saved");

  const handleExport = async () => {
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

    setExporting(true);
    try {
      const zip = new JSZip();
      const suffix = exportStart || exportEnd
        ? `${exportStart || "debut"}_${exportEnd || "fin"}`
        : new Date().toISOString().slice(0, 10);
      const folderName = `rapports_${suffix}`;
      const root = zip.folder(folderName)!;
      const pdfsFolder = root.folder("pdfs")!;

      // Build PDF filenames first (need them for CSV + index.html links)
      const seen = new Set<string>();
      const enriched = filtered.map(r => {
        let name = pdfFilenameForReport(r);
        if (seen.has(name)) {
          const base = name.replace(/\.pdf$/, "");
          let n = 2;
          while (seen.has(`${base}_${n}.pdf`)) n++;
          name = `${base}_${n}.pdf`;
        }
        seen.add(name);
        return { report: r, pdfName: name };
      });

      // Generate every PDF
      for (const { report, pdfName } of enriched) {
        const blob = generateReportPdf(report);
        pdfsFolder.file(pdfName, blob);
      }

      // CSV — section columns + a "Fichier" column referencing the PDF path
      const header = ["ID Examen", "Médecin", "Type", "Date", "Indication", "Technique", "Resultat", "Conclusion", "Fichier"];
      const rows = enriched.map(({ report, pdfName }) => {
        const parsed = parseReport(report.content || "");
        return [
          report.ID_Exam,
          report.doctorName || "",
          getCategoryLabel(report.category),
          new Date(report.createdAt).toLocaleDateString("fr-FR"),
          parsed.indication,
          parsed.technique,
          parsed.resultat,
          parsed.conclusion,
          `pdfs/${pdfName}`,
        ];
      });
      const csv = [header, ...rows]
        .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";"))
        .join("\n");
      root.file("rapports.csv", String.fromCharCode(0xFEFF) + csv);

      // index.html — the clickable view recipients will use
      root.file("index.html", buildIndexHtml(enriched, exportStart, exportEnd));

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${folderName}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Export généré", { description: `${filtered.length} rapport${filtered.length > 1 ? "s" : ""} exporté${filtered.length > 1 ? "s" : ""}.` });
    } catch (err) {
      console.error("[Export] échec :", err);
      toast.error("Échec de l'export", { description: err instanceof Error ? err.message : "Erreur inconnue." });
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppLayout title="Exporter Rapports">
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
                disabled={exporting}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 border border-border bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {exporting ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                {exporting ? "Génération…" : "Exporter (ZIP)"}
              </button>
            </div>
          </div>
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildIndexHtml(
  rows: { report: Report; pdfName: string }[],
  exportStart: string,
  exportEnd: string,
): string {
  const periodLabel = exportStart || exportEnd
    ? `Période : ${exportStart || "…"} → ${exportEnd || "…"}`
    : "Tous les rapports enregistrés";

  const tbody = rows.map(({ report, pdfName }) => {
    const date = new Date(report.createdAt).toLocaleDateString("fr-FR");
    return `<tr>
      <td><a href="pdfs/${escapeHtml(pdfName)}" target="_blank" rel="noopener">${escapeHtml(report.ID_Exam)}</a></td>
      <td>${escapeHtml(report.doctorName || "—")}</td>
      <td>${escapeHtml(getCategoryLabel(report.category))}</td>
      <td>${escapeHtml(date)}</td>
    </tr>`;
  }).join("\n");

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Export de rapports radiologiques</title>
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f7f7f9; color: #1f2937; padding: 32px 24px; }
  .wrap { max-width: 1000px; margin: 0 auto; }
  h1 { font-size: 22px; margin: 0 0 4px; color: #111827; }
  .sub { font-size: 13px; color: #6b7280; margin-bottom: 24px; }
  .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  thead tr { background: #f3f4f6; }
  th { text-align: left; padding: 12px 16px; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; font-weight: 600; border-bottom: 1px solid #e5e7eb; }
  td { padding: 12px 16px; border-bottom: 1px solid #f1f3f5; }
  tbody tr:last-child td { border-bottom: 0; }
  tbody tr:hover { background: #fafafa; }
  td a { color: #4f46e5; font-weight: 600; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; text-decoration: none; }
  td a:hover { text-decoration: underline; }
  .footer { margin-top: 16px; font-size: 11px; color: #9ca3af; text-align: center; }
</style>
</head>
<body>
<div class="wrap">
  <h1>Export de rapports radiologiques</h1>
  <div class="sub">${escapeHtml(periodLabel)} · ${rows.length} rapport${rows.length > 1 ? "s" : ""}</div>
  <div class="card">
    <table>
      <thead><tr><th>ID Examen</th><th>Médecin</th><th>Type</th><th>Date</th></tr></thead>
      <tbody>
${tbody}
      </tbody>
    </table>
  </div>
  <div class="footer">Cliquez sur un ID d'examen pour ouvrir le PDF correspondant.</div>
</div>
</body>
</html>`;
}