const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReportCounts {
  draft:     number;
  saved:     number;
  validated: number;
  total:     number;
}

export interface PhasePending {
  phase1: number;
  phase2: number;
  phase3: number;
}

export interface CorpusStats {
  flac_count:             number;
  corpus_size_bytes:      number;
  frozen_testset_count:   number;
  corpus_dir_size_bytes:  number;
}

export interface LifecycleSettings {
  grace_period_days:     number;
  draft_max_age_days:    number;
  corpus_retention_days: number;
  frozen_testset_size:   number;
}

export interface RunStats {
  phase1?: { processed: number; skipped: number; errors: number };
  phase2?: { deleted:   number; skipped: number; errors: number };
  phase3?: { deleted:   number; skipped: number; errors: number };
  testset?: { size: number; added: number };
}

export interface LastRun {
  startedAt: string;
  endedAt:   string;
  durationS: number;
  phase:     string;
  stats:     RunStats;
}

export interface LifecycleStats {
  report_counts:  ReportCounts;
  phase_pending:  PhasePending;
  corpus:         CorpusStats;
  disk:           { media_audios_size_bytes: number };
  last_run:       LastRun | null;
  settings:       LifecycleSettings;
}

export interface RunHistory extends LastRun {
  _id: string;
}

export interface RunResult {
  success:     boolean;
  dry_run:     boolean;
  phase:       string;
  return_code: number;
  output:      string;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function getLifecycleStats(): Promise<LifecycleStats> {
  const res = await fetch(`${BASE_URL}/api/lifecycle/stats/`, {
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || `Erreur ${res.status}`);
  return data as LifecycleStats;
}

export async function triggerLifecycleRun(
  phase: "1" | "2" | "3" | "all",
  dryRun: boolean,
): Promise<RunResult> {
  const res = await fetch(`${BASE_URL}/api/lifecycle/run/`, {
    method:  "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body:    JSON.stringify({ phase, dry_run: dryRun }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || `Erreur ${res.status}`);
  return data as RunResult;
}

export async function getLifecycleAutoConfig(): Promise<{ auto_enabled: boolean }> {
  const res = await fetch(`${BASE_URL}/api/lifecycle/config/`, {
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || `Erreur ${res.status}`);
  return data;
}

export async function setLifecycleAutoConfig(enabled: boolean): Promise<{ auto_enabled: boolean }> {
  const res = await fetch(`${BASE_URL}/api/lifecycle/config/`, {
    method:  "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body:    JSON.stringify({ auto_enabled: enabled }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || `Erreur ${res.status}`);
  return data;
}

export async function getLifecycleHistory(): Promise<RunHistory[]> {
  const res = await fetch(`${BASE_URL}/api/lifecycle/history/`, {
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || `Erreur ${res.status}`);
  return (data.results ?? []) as RunHistory[];
}
