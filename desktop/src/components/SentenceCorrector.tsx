import { useState } from "react";
import { Check, CheckCheck, ArrowRight } from "lucide-react";
import type { SentenceAnalysis, SentenceCorrection } from "@/services/transcriptionService";

interface SentenceCorrectorProps {
  data: SentenceAnalysis;
  onAcceptWord: (original: string, suggestion: string) => void;
  onAcceptAll: () => void;
}

export function SentenceCorrector({ data, onAcceptWord, onAcceptAll }: SentenceCorrectorProps) {
  const [accepted, setAccepted] = useState<Set<number>>(new Set());

  const pendingCorrections = data.corrections.filter((_, i) => !accepted.has(i));
  const pendingCount = pendingCorrections.length;

  const handleAcceptWord = (corrIdx: number, corr: SentenceCorrection) => {
    setAccepted(prev => new Set([...prev, corrIdx]));
    onAcceptWord(corr.mot_original, corr.suggestion);
  };

  const handleAcceptAll = () => {
    setAccepted(new Set(data.corrections.map((_, i) => i)));
    onAcceptAll();
  };

  if (pendingCount === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
      {/* Correction chips — one per word to fix */}
      <div className="flex flex-wrap gap-2">
        {data.corrections.map((corr, corrIdx) => {
          if (accepted.has(corrIdx)) return null;
          return (
            <button
              key={corrIdx}
              onClick={() => handleAcceptWord(corrIdx, corr)}
              title="Cliquer pour accepter la correction"
              className="group inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-2.5 py-1.5 hover:bg-destructive/10 transition-colors"
            >
              {/* Original word — strikethrough */}
              <span className="text-xs font-mono text-destructive/70 line-through">
                {corr.mot_original}
              </span>
              <ArrowRight size={10} className="text-muted-foreground shrink-0" />
              {/* Suggestion — highlighted */}
              <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                {corr.suggestion}
              </span>
              {/* Accept tick shown on hover */}
              <Check
                size={11}
                className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              />
            </button>
          );
        })}
      </div>

      {/* Footer */}
      {pendingCount > 1 && (
        <div className="flex justify-end pt-1 border-t border-border/40">
          <button
            onClick={handleAcceptAll}
            className="flex items-center gap-1.5 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <CheckCheck size={12} />
            Tout accepter ({pendingCount})
          </button>
        </div>
      )}
    </div>
  );
}
