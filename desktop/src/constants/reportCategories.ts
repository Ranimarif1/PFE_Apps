// Active report categories — these are the choices presented in every
// selection UI (NouveauRapport, RapportDetail dropdown, filter chips, etc.).
export const REPORT_CATEGORIES = [
  { value: "scanner",       label: "Scanner" },
  { value: "irm",           label: "IRM" },
  { value: "radiographie",  label: "Radiographie" },
  { value: "echographie",   label: "Échographie" },
] as const;

export type ReportCategory = typeof REPORT_CATEGORIES[number]["value"];

export const CATEGORY_VALUES = REPORT_CATEGORIES.map(c => c.value) as readonly ReportCategory[];

// Labels for retired categories — kept so reports already saved with these
// values still render with a proper French label instead of the raw key.
const LEGACY_CATEGORY_LABELS: Record<string, string> = {
  mammographie: "Mammographie",
  autre:        "Autre",
};

export function getCategoryLabel(value: string | undefined | null): string {
  if (!value) return "—";
  const active = REPORT_CATEGORIES.find(c => c.value === value);
  if (active) return active.label;
  return LEGACY_CATEGORY_LABELS[value] ?? value;
}
