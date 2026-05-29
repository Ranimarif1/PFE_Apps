import { useState } from "react";
import { Check, CheckCheck, X, ArrowRight } from "lucide-react";
import type { SentenceCorrection } from "@/services/transcriptionService";

interface SentenceCorrectorProps {
  corrections: SentenceCorrection[];
  onAccept: (original: string, suggestion: string) => void;
}

export function SentenceCorrector({ corrections, onAccept }: SentenceCorrectorProps) {
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [refused,  setRefused]  = useState<Set<string>>(new Set());

  const pending = corrections.filter(c => !accepted.has(c.mot_original) && !refused.has(c.mot_original));

  const handleAccept = (corr: SentenceCorrection) => {
    setAccepted(prev => new Set([...prev, corr.mot_original]));
    onAccept(corr.mot_original, corr.suggestion);
  };

  const handleRefuse = (corr: SentenceCorrection) => {
    setRefused(prev => new Set([...prev, corr.mot_original]));
  };

  const handleAcceptAll = () => {
    pending.forEach(corr => {
      setAccepted(prev => new Set([...prev, corr.mot_original]));
      onAccept(corr.mot_original, corr.suggestion);
    });
  };

  if (pending.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {pending.map(corr => (
        <div
          key={corr.mot_original}
          className="rounded-lg bg-muted/30 border border-border/50 px-2.5 py-2 text-xs space-y-1.5"
        >
          {/* original → suggestion */}
          <div className="flex items-start gap-1.5 flex-wrap">
            <span className="font-mono text-destructive/70 line-through break-all">
              {corr.mot_original}
            </span>
            <ArrowRight size={9} className="text-muted-foreground shrink-0 mt-0.5" />
            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 break-all">
              {corr.suggestion}
            </span>
          </div>

          {/* action buttons */}
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => handleAccept(corr)}
              className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/30 transition-colors"
            >
              <Check size={9} />
              Accepter
            </button>
            <button
              onClick={() => handleRefuse(corr)}
              className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-semibold text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors"
            >
              <X size={9} />
              Refuser
            </button>
          </div>
        </div>
      ))}

      {pending.length > 1 && (
        <button
          onClick={handleAcceptAll}
          className="w-full flex items-center justify-center gap-1.5 text-[11px] font-medium text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10 rounded-lg py-1.5 transition-colors"
        >
          <CheckCheck size={11} />
          Tout accepter ({pending.length})
        </button>
      )}
    </div>
  );
}
