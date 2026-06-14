import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import {
  getLifecycleStats, getLifecycleHistory,
  type LifecycleStats, type RunHistory,
} from "@/services/lifecycleService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  HardDrive, Database, Archive, FlaskConical,
  ChevronDown, ChevronUp, RefreshCw, Timer,
} from "lucide-react";
import { DASHBOARD_ACCENTS } from "@/styles/dashboardAccents";

const ACCENT_BLUE   = { base: "#3B82F6", tint: "rgba(59,130,246,0.08)"  };
const ACCENT_GREEN  = { base: "#059669", tint: "rgba(5,150,105,0.08)"   };
const ACCENT_ORANGE = { base: "#D97706", tint: "rgba(217,119,6,0.08)"   };
const ACCENT_PURPLE = { base: "#7C3AED", tint: "rgba(124,58,237,0.08)"  };

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtBytes(bytes: number): string {
  if (bytes === 0) return "0 o";
  const k = 1024;
  const units = ["o", "Ko", "Mo", "Go", "To"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtDuration(s: number): string {
  if (s < 60) return `${s.toFixed(1)} sec`;
  return `${Math.floor(s / 60)} min ${Math.round(s % 60)} sec`;
}

// ── KPI card ─────────────────────────────────────────────────────────────────

function Kpi({
  icon: Icon, label, value, sub, accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent: { base: string; tint: string };
}) {
  return (
    <div
      className="rounded-xl border px-4 py-3 flex items-center gap-3"
      style={{ borderColor: accent.base, background: accent.tint }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: accent.base + "22" }}
      >
        <Icon size={18} style={{ color: accent.base }} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium" style={{ color: "#64748B" }}>{label}</p>
        <p className="text-lg font-bold leading-tight" style={{ color: "#0F172A" }}>{value}</p>
        {sub && <p className="text-[10px] mt-0.5" style={{ color: "#94A3B8" }}>{sub}</p>}
      </div>
    </div>
  );
}

// ── Phase badge ───────────────────────────────────────────────────────────────

function PhaseBadge({ phase, count }: { phase: 1 | 2 | 3; count: number }) {
  const labels = ["", "Archivage FLAC", "Suppression des brouillons", "Nettoyage du corpus"];
  const descs  = [
    "",
    "Convertit les audios finalisés (30 j – 4 ans) des rapports et notes vocales en FLAC 16 kHz et les archive dans /opt/corpus pour entraîner Whisper.",
    "Supprime les fichiers audio des brouillons abandonnés (rapports et notes vocales) depuis plus d'un an, sans les ajouter au corpus.",
    "Efface les FLAC du corpus âgés de plus de 4 ans tout en conservant la transcription dans MongoDB à vie.",
  ];
  const colors = ["", "#3B82F6", "#F59E0B", "#EF4444"];
  return (
    <div className="py-2.5 border-b last:border-0" style={{ borderColor: "#F1F5F9" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white shrink-0"
            style={{ background: colors[phase] }}
          >
            {phase}
          </span>
          <span className="text-[13px] font-semibold" style={{ color: "#334155" }}>{labels[phase]}</span>
        </div>
        <span
          className="text-[12px] font-bold px-2 py-0.5 rounded-full shrink-0"
          style={{ background: count > 0 ? colors[phase] + "18" : "#F1F5F9", color: count > 0 ? colors[phase] : "#94A3B8" }}
        >
          {count} rapport{count !== 1 ? "s" : ""}
        </span>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed pl-7" style={{ color: "#94A3B8" }}>
        {descs[phase]}
      </p>
    </div>
  );
}

// ── History row ───────────────────────────────────────────────────────────────

function HistoryRow({ run }: { run: RunHistory }) {
  const [open, setOpen] = useState(false);
  const p1 = run.stats?.phase1;
  const p2 = run.stats?.phase2;
  const p3 = run.stats?.phase3;

  return (
    <div className="border rounded-xl overflow-hidden mb-2" style={{ borderColor: "#E2E8F0" }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="text-[12px] font-mono font-semibold" style={{ color: "#64748B" }}>
          {fmtDate(run.startedAt)}
        </span>
        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
          style={{ background: "#EFF6FF", color: "#3B82F6" }}>
          {run.phase === "all" ? "toutes les phases" : `phase ${run.phase}`}
        </span>
        <span className="text-[11px]" style={{ color: "#94A3B8" }}>
          {fmtDuration(run.durationS)}
        </span>
        <span className="ml-auto" style={{ color: "#94A3B8" }}>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-3 grid grid-cols-3 gap-2 border-t" style={{ borderColor: "#F1F5F9" }}>
          {p1 && (
            <div className="text-[11px] p-2 rounded-lg" style={{ background: "#EFF6FF" }}>
              <p className="font-bold" style={{ color: "#3B82F6" }}>Phase 1</p>
              <p style={{ color: "#334155" }}>{p1.processed} traités · {p1.skipped} ignorés · {p1.errors} erreurs</p>
            </div>
          )}
          {p2 && (
            <div className="text-[11px] p-2 rounded-lg" style={{ background: "#FFFBEB" }}>
              <p className="font-bold" style={{ color: "#F59E0B" }}>Phase 2</p>
              <p style={{ color: "#334155" }}>{p2.deleted} supprimés · {p2.skipped} ignorés · {p2.errors} erreurs</p>
            </div>
          )}
          {p3 && (
            <div className="text-[11px] p-2 rounded-lg" style={{ background: "#FEF2F2" }}>
              <p className="font-bold" style={{ color: "#EF4444" }}>Phase 3</p>
              <p style={{ color: "#334155" }}>{p3.deleted} supprimés · {p3.skipped} ignorés · {p3.errors} erreurs</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminITLifecycle() {
  const queryClient = useQueryClient();

  const { data: stats, isLoading, refetch: refetchStats } = useQuery<LifecycleStats>({
    queryKey: ["lifecycle-stats"],
    queryFn:  getLifecycleStats,
    refetchInterval: false,
  });

  const { data: history = [] } = useQuery<RunHistory[]>({
    queryKey: ["lifecycle-history"],
    queryFn:  getLifecycleHistory,
  });


  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: "#0F172A" }}>Cycle de vie des données</h1>
            <p className="text-[13px] mt-0.5" style={{ color: "#64748B" }}>
              Archivage audio vers corpus IA · Purge automatique · Jeu de test figé
            </p>
          </div>
          <button
            onClick={() => { refetchStats(); queryClient.invalidateQueries({ queryKey: ["lifecycle-history"] }); }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium border transition-colors hover:bg-slate-50"
            style={{ borderColor: "#E2E8F0", color: "#64748B" }}
          >
            <RefreshCw size={14} /> Actualiser
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#4A7BBE" }} />
          </div>
        ) : stats ? (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi
                icon={Database}
                label="Rapports total"
                value={stats.report_counts.total}
                sub={`${stats.report_counts.draft} brouillons · ${stats.report_counts.saved} enregistrés · ${stats.report_counts.validated} validés`}
                accent={ACCENT_BLUE}
              />
              <Kpi
                icon={Archive}
                label="Fichiers corpus"
                value={stats.corpus.flac_count}
                sub={fmtBytes(stats.corpus.corpus_size_bytes)}
                accent={ACCENT_GREEN}
              />
              <Kpi
                icon={HardDrive}
                label="Audios originaux"
                value={fmtBytes(stats.disk.media_audios_size_bytes)}
                sub="media/audios"
                accent={ACCENT_ORANGE}
              />
              <Kpi
                icon={FlaskConical}
                label="Jeu de test figé"
                value={`${stats.corpus.frozen_testset_count} / ${stats.settings.frozen_testset_size}`}
                sub="/opt/corpus/frozen_testset"
                accent={ACCENT_PURPLE}
              />
            </div>

            {/* Phases status + planification */}
            <div className="rounded-2xl border p-4" style={{ borderColor: "#E2E8F0", background: "#FFFFFF" }}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <h2 className="text-[13px] font-bold" style={{ color: "#334155" }}>
                  Rapports en attente par phase
                </h2>
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl shrink-0"
                  style={{
                    background: "rgba(5,150,105,0.08)",
                    border: "1px solid rgba(5,150,105,0.2)",
                  }}
                >
                  <Timer size={13} style={{ color: "#059669" }} />
                  <div>
                    <p className="text-[11px] font-semibold" style={{ color: "#059669" }}>
                      Lancement automatique — chaque nuit à 03h00
                    </p>
                    {stats.last_run && (
                      <p className="text-[10px]" style={{ color: "#64748B" }}>
                        Dernière exécution : {fmtDate(stats.last_run.startedAt)} ({fmtDuration(stats.last_run.durationS)})
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <PhaseBadge phase={1} count={stats.phase_pending.phase1} />
                <PhaseBadge phase={2} count={stats.phase_pending.phase2} />
                <PhaseBadge phase={3} count={stats.phase_pending.phase3} />
              </div>

              <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-[11px]" style={{ borderColor: "#F1F5F9", color: "#94A3B8" }}>
                <div className="text-center">
                  <p>Délai de grâce</p>
                  <p className="font-semibold text-[12px]" style={{ color: "#334155" }}>{stats.settings.grace_period_days} jours</p>
                </div>
                <div className="text-center">
                  <p>Rétention brouillons</p>
                  <p className="font-semibold text-[12px]" style={{ color: "#334155" }}>{stats.settings.draft_max_age_days} jours</p>
                </div>
                <div className="text-center">
                  <p>Rétention corpus</p>
                  <p className="font-semibold text-[12px]" style={{ color: "#334155" }}>{stats.settings.corpus_retention_days} jours</p>
                </div>
              </div>
            </div>

            {/* Run history */}
            {history.length > 0 && (
              <div className="rounded-2xl border p-4" style={{ borderColor: "#E2E8F0", background: "#FFFFFF" }}>
                <h2 className="text-[13px] font-bold mb-3" style={{ color: "#334155" }}>
                  Historique des exécutions ({history.length})
                </h2>
                {history.map(run => <HistoryRow key={run._id} run={run} />)}
              </div>
            )}
          </>
        ) : (
          <div className="py-16 text-center text-[13px]" style={{ color: "#94A3B8" }}>
            Impossible de charger les statistiques.
          </div>
        )}
      </div>

    </AppLayout>
  );
}
