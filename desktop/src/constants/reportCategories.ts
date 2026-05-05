export const REPORT_CATEGORIES = [
  { value: "scanner",       label: "Scanner" },
  { value: "irm",           label: "IRM" },
  { value: "radiographie",  label: "Radiographie" },
  { value: "echographie",   label: "Échographie" },
  { value: "mammographie",  label: "Mammographie" },
  { value: "autre",         label: "Autre" },
] as const;

export type ReportCategory = typeof REPORT_CATEGORIES[number]["value"];

export const CATEGORY_VALUES = REPORT_CATEGORIES.map(c => c.value) as readonly ReportCategory[];

export function getCategoryLabel(value: string | undefined | null): string {
  if (!value) return "—";
  return REPORT_CATEGORIES.find(c => c.value === value)?.label ?? value;
}
