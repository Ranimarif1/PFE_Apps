import { cn } from "@/lib/utils";

export type StatusTone = "success" | "info" | "warning" | "error" | "neutral";
export type StatusContext = "report" | "complaint" | "user" | "generic";

const STATUS_TONE: Record<string, StatusTone> = {
  // Success / completed
  success: "success",
  resolved: "success",
  completed: "success",
  validated: "success",

  // In progress / pending / review
  info: "info",
  pending: "info",
  in_progress: "info",
  under_review: "info",
  saved: "info",

  // Warning / attention
  warning: "warning",
  draft: "warning",
  delayed: "warning",
  needs_attention: "warning",

  // Error / rejected
  error: "error",
  rejected: "error",
  refused: "error",
  failed: "error",

  // Neutral / unknown
  unknown: "neutral",
  neutral: "neutral",
  archived: "neutral",
};

/** User-context tone override: blue for accepted, yellow for pending, red for refused. */
const USER_TONE: Record<string, StatusTone> = {
  validated: "info",
  pending: "warning",
  refused: "error",
};

const REPORT_LABELS: Record<string, string> = {
  draft: "Brouillon",
  validated: "Validé",
  saved: "Enregistré",
  archived: "Archivé",
};

const COMPLAINT_LABELS: Record<string, string> = {
  pending: "En attente",
  in_progress: "En cours",
  resolved: "Traitée",
};

const USER_LABELS: Record<string, string> = {
  pending: "En attente",
  validated: "Accepté",
  refused: "Refusé",
};

const GENERIC_LABELS: Record<string, string> = {
  success: "Succès",
  info: "En cours",
  warning: "Attention",
  error: "Erreur",
  neutral: "Neutre",
  unknown: "Inconnu",
};

function titleCaseStatus(status: string) {
  const formatted = status.replace(/_/g, " ").trim();
  if (!formatted) return "Inconnu";
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function getStatusTone(status: string, context: StatusContext = "generic"): StatusTone {
  if (context === "user" && USER_TONE[status]) return USER_TONE[status];
  return STATUS_TONE[status] ?? "neutral";
}

export function getStatusLabel(status: string, context: StatusContext = "generic"): string {
  const maps = {
    report: REPORT_LABELS,
    complaint: COMPLAINT_LABELS,
    user: USER_LABELS,
    generic: GENERIC_LABELS,
  };
  return maps[context][status] ?? titleCaseStatus(status);
}

export function getStatusBadgeClass(status: string, context: StatusContext = "generic") {
  const tone = getStatusTone(status, context);
  return cn("status-badge", `status-tone-${tone}`);
}

export function getStatusSurfaceClass(status: string, context: StatusContext = "generic") {
  const tone = getStatusTone(status, context);
  return cn("status-surface", `status-surface-${tone}`);
}

const ACTIVE_TAB_UNDERLINE: Record<StatusTone, string> = {
  success: "border-b-2 border-[#059669] text-[#065F46] font-semibold",
  info:    "border-b-2 border-[#4A7BBE] text-[#1E3A8A] font-semibold",
  warning: "border-b-2 border-[#D97706] text-[#92400E] font-semibold",
  error:   "border-b-2 border-[#DC2626] text-[#991B1B] font-semibold",
  neutral: "border-b-2 border-primary text-foreground font-semibold",
};

export function getActiveFilterTabClass(status: string, context: StatusContext = "generic"): string {
  if (status === "tous" || status === "all") return "border-b-2 border-primary text-foreground font-semibold";
  return ACTIVE_TAB_UNDERLINE[getStatusTone(status, context)];
}

export const INACTIVE_TAB_CLASS = "border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-border";

