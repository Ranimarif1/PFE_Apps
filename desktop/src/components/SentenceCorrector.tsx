import { useState } from "react";
import { Check } from "lucide-react";
import type { SentenceAnalysis, SentenceCorrection } from "@/services/transcriptionService";

interface SentenceCorrectorProps {
  data: SentenceAnalysis;
  onAcceptWord: (original: string, suggestion: string) => void;
  onAcceptAll: () => void;
}

export function SentenceCorrector({ data, onAcceptWord, onAcceptAll }: SentenceCorrectorProps) {
  const [accepted, setAccepted] = useState<Set<number>>(new Set());

  const pendingCount = data.corrections.length - accepted.size;

  // For a given word (by index in the sentence), find its first unaccepted correction.
  // Match by position first; fall back to mot_original string match.
  const correctionAt = (
    word: string,
    wordIdx: number,
  ): { corrIdx: number; corr: SentenceCorrection } | null => {
    const cleanWord = word.replace(/^[^\wÀ-ÿ]+|[^\wÀ-ÿ]+$/g, "");
    for (let i = 0; i < data.corrections.length; i++) {
      if (accepted.has(i)) continue;
      const c = data.corrections[i];
      if (c.position === wordIdx && cleanWord.toLowerCase() === c.mot_original.toLowerCase()) {
        return { corrIdx: i, corr: c };
      }
    }
    // Fallback: match by mot_original only (when position is off)
    for (let i = 0; i < data.corrections.length; i++) {
      if (accepted.has(i)) continue;
      const c = data.corrections[i];
      if (cleanWord.toLowerCase() === c.mot_original.toLowerCase()) {
        return { corrIdx: i, corr: c };
      }
    }
    return null;
  };

  const handleAcceptWord = (corrIdx: number, original: string, suggestion: string) => {
    setAccepted(prev => new Set([...prev, corrIdx]));
    onAcceptWord(original, suggestion);
  };

  const handleAcceptAll = () => {
    setAccepted(new Set(data.corrections.map((_, i) => i)));
    onAcceptAll();
  };

  const words = data.sentence.split(/\s+/).filter(Boolean);

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
      {/* Sentence rendered word-by-word */}
      <div className="flex flex-wrap gap-x-1 gap-y-1 leading-relaxed">
        {words.map((word, idx) => {
          const match = correctionAt(word, idx);
          if (!match) {
            return (
              <span key={idx} className="text-sm text-foreground">
                {word}
              </span>
            );
          }
          const { corrIdx, corr } = match;
          // Preserve punctuation attached to the token (e.g. "masse,")
          const prefix = word.match(/^[^\wÀ-ÿ]*/)?.[0] ?? "";
          const suffix = word.match(/[^\wÀ-ÿ]*$/)?.[0] ?? "";
          return (
            <span key={idx} className="inline-flex items-baseline gap-0.5">
              {prefix && <span className="text-sm text-foreground">{prefix}</span>}
              <span className="text-sm line-through text-destructive/70 font-mono">
                {corr.mot_original}
              </span>
              <button
                onClick={() => handleAcceptWord(corrIdx, corr.mot_original, corr.suggestion)}
                title="Cliquer pour accepter la correction"
                className="text-sm text-emerald-600 dark:text-emerald-400 font-medium font-mono hover:underline transition-colors"
              >
                {corr.suggestion}
              </button>
              {suffix && <span className="text-sm text-foreground">{suffix}</span>}
            </span>
          );
        })}
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between pt-1 border-t border-border/40">
        <span className="text-[11px] text-muted-foreground">
          {pendingCount > 0
            ? `${pendingCount} correction${pendingCount > 1 ? "s" : ""} en attente`
            : "Toutes les corrections acceptées"}
        </span>
        {pendingCount > 0 && (
          <button
            onClick={handleAcceptAll}
            className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <Check size={11} />
            Corriger tout
          </button>
        )}
      </div>
    </div>
  );
}
