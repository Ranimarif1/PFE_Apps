import { jsPDF } from "jspdf";
import { parseReport } from "@/lib/reportContent";
import { getCategoryLabel } from "@/constants/reportCategories";
import type { Report } from "@/services/reportsService";

const PAGE_W = 210;          // A4 width in mm
const PAGE_H = 297;          // A4 height in mm
const MARGIN_X = 18;
const MARGIN_TOP = 18;
const MARGIN_BOTTOM = 18;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

export function generateReportPdf(report: Report): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const parsed = parseReport(report.content || "");
  const dateStr = new Date(report.createdAt).toLocaleDateString("fr-FR");
  const timeStr = new Date(report.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const showTechnique = report.category === "irm" || report.category === "scanner";

  let y = MARGIN_TOP;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text("Compte rendu radiologique", MARGIN_X, y);
  y += 8;

  // Accent line
  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(0.8);
  doc.line(MARGIN_X, y, MARGIN_X + 30, y);
  y += 6;

  // Metadata block
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);

  const meta: Array<[string, string]> = [
    ["ID Examen",    report.ID_Exam || "—"],
    ["Type",         getCategoryLabel(report.category)],
    ["Médecin",      report.doctorName || "—"],
    ["Date",         `${dateStr} à ${timeStr}`],
  ];

  const labelW = 28;
  meta.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(110, 110, 110);
    doc.text(label, MARGIN_X, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    doc.text(String(value), MARGIN_X + labelW, y);
    y += 5.5;
  });

  y += 4;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y);
  y += 8;

  const renderSection = (title: string, body: string) => {
    const text = (body || "").trim() || "—";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 70);
    ensureSpace(doc, y, 8, () => { y = MARGIN_TOP; });
    doc.text(title.toUpperCase(), MARGIN_X, y);
    y += 5.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(text, CONTENT_W) as string[];
    const lineH = 5.2;
    for (const line of lines) {
      if (y + lineH > PAGE_H - MARGIN_BOTTOM) {
        doc.addPage();
        y = MARGIN_TOP;
      }
      doc.text(line, MARGIN_X, y);
      y += lineH;
    }
    y += 5;
  };

  renderSection("Indication", parsed.indication);
  if (showTechnique) renderSection("Technique", parsed.technique);
  renderSection("Résultat", parsed.resultat);
  renderSection("Conclusion", parsed.conclusion);

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} / ${pageCount}`, PAGE_W - MARGIN_X, PAGE_H - 8, { align: "right" });
    doc.text(`ID ${report.ID_Exam || "—"} · ${dateStr}`, MARGIN_X, PAGE_H - 8);
  }

  return doc.output("blob");
}

function ensureSpace(doc: jsPDF, y: number, needed: number, onNewPage: () => void) {
  if (y + needed > PAGE_H - MARGIN_BOTTOM) {
    doc.addPage();
    onNewPage();
  }
}

export function pdfFilenameForReport(report: Report): string {
  const safeId = (report.ID_Exam || report._id).replace(/[^A-Za-z0-9_-]+/g, "_");
  return `${safeId}.pdf`;
}