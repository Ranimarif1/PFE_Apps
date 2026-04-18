export type DashboardAccentTone = "highlight" | "positive" | "info";

export interface DashboardAccent {
  base: string;
  text: string;
  tint: string;
  tintHover: string;
  soft: string;
}

export const DASHBOARD_ACCENTS: Record<DashboardAccentTone, DashboardAccent> = {
  highlight: {
    base: "#D97706",
    text: "var(--accent-highlight-text)",
    tint: "rgba(217, 119, 6, 0.10)",
    tintHover: "rgba(217, 119, 6, 0.16)",
    soft: "rgba(217, 119, 6, 0.18)",
  },
  positive: {
    base: "#059669",
    text: "var(--accent-positive-text)",
    tint: "rgba(5, 150, 105, 0.10)",
    tintHover: "rgba(5, 150, 105, 0.16)",
    soft: "rgba(5, 150, 105, 0.18)",
  },
  info: {
    base: "#4A7BBE",
    text: "var(--accent-info-text)",
    tint: "rgba(74, 123, 190, 0.10)",
    tintHover: "rgba(74, 123, 190, 0.16)",
    soft: "rgba(74, 123, 190, 0.18)",
  },
};
