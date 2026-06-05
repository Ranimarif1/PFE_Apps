const FR_LOWER = "a-zàâäéèêëîïôùûüçœæ";

function capitalizeAfterPunctuation(text: string): string {
  if (!text) return text;
  // First character of the section
  text = text.charAt(0).toUpperCase() + text.slice(1);
  // After . ? !
  text = text.replace(
    new RegExp(`([.?!])( +)([${FR_LOWER}])`, "g"),
    (_, punct, space, letter) => punct + space + letter.toUpperCase()
  );
  // After newline
  text = text.replace(
    new RegExp(`(\\n)([${FR_LOWER}])`, "g"),
    (_, nl, letter) => nl + letter.toUpperCase()
  );
  return text;
}

export interface ParsedReport {
  indication: string;
  technique: string;
  resultat: string;
  conclusion: string;
}

export function parseReport(text: string): ParsedReport {
  const iMatch = /[({]?\s*(?:indication|renseignements?\s+cliniques?)\s*[)}]?\s*:?/i.exec(text);
  const tMatch = /[({]?\s*technique\s*[)}]?\s*:?/i.exec(text);
  const rMatch = /[({]?\s*r[ée]sultat\s*[)}]?\s*:?/i.exec(text);
  const cMatch = /[({]?\s*conclusion\s*[)}]?\s*:?/i.exec(text);

  const iIdx = iMatch?.index ?? -1;
  const tIdx = tMatch?.index ?? -1;
  const rIdx = rMatch?.index ?? -1;
  const cIdx = cMatch?.index ?? -1;

  if (iIdx === -1 && tIdx === -1 && rIdx === -1 && cIdx === -1) {
    return { indication: "", technique: "", resultat: text.trim(), conclusion: "" };
  }

  const extract = (match: RegExpExecArray | null, end: number) => {
    if (!match) return "";
    const afterKeyword = match.index + match[0].length;
    const raw = text.slice(afterKeyword, end === -1 ? text.length : end).trim();
    // Preserve intentional \n from verbal commands (à la ligne, etc.) — only collapse spaces/tabs.
    const normalized = raw.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    // Strip Whisper noise at section start (mishearings of "deux points à la ligne").
    const cleaned = normalized
      .replace(/^(?:de\s+p[a-z]+|d[''][a-z]{0,4}\s+p[a-z]+|et\s+[a-z]{3,6})\s+/, "")
      .replace(/^[-—]+\s*/, "")
      .trim();
    if (/^[-—\s]*$/.test(cleaned)) return "";
    const result = cleaned.length > 0 ? cleaned : normalized;
    return capitalizeAfterPunctuation(result);
  };

  const nextAfter = (afterIdx: number, ...candidates: number[]) => {
    const valid = candidates.filter(idx => idx > afterIdx);
    return valid.length === 0 ? -1 : Math.min(...valid);
  };

  return {
    indication: extract(iMatch, nextAfter(iIdx, tIdx, rIdx, cIdx)),
    technique:  extract(tMatch, nextAfter(tIdx, rIdx, cIdx)),
    resultat:   extract(rMatch, nextAfter(rIdx, cIdx)),
    conclusion: extract(cMatch, -1),
  };
}

export function buildContent(indication: string, technique: string, resultat: string, conclusion: string): string {
  const parts = [
    `Indication: ${indication}`,
    technique.trim() ? `Technique: ${technique}` : null,
    `Resultat: ${resultat}`,
    `Conclusion: ${conclusion}`,
  ].filter(Boolean);
  return parts.join("\n\n");
}