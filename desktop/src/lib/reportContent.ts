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
    const cleaned = raw
      .replace(/^(?:de\s+p[a-z]+|d[''][a-z]{0,4}\s+p[a-z]+|et\s+[a-z]{3,6})\s+/, "")
      .replace(/^[-—]+\s*/, "")
      .trim();
    if (/^[-—\s]*$/.test(cleaned)) return "";
    const result = cleaned.length > 0 ? cleaned : raw;
    return result.charAt(0).toUpperCase() + result.slice(1);
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