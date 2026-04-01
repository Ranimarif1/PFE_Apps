/**
 * buildDictionary.mjs
 * Converts "termes médicaux dragon.txt" (Latin-1 mojibake) into
 * desktop/src/lib/medicalDictionary.ts
 *
 * Usage (from desktop/ folder):
 *   node scripts/buildDictionary.mjs <path-to-txt>
 *
 * Example:
 *   node scripts/buildDictionary.mjs "C:/Users/MSI/Downloads/termes médicaux dragon.txt"
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const inputFile = process.argv[2];
if (!inputFile) {
  console.error('Usage: node scripts/buildDictionary.mjs <path-to-txt>');
  process.exit(1);
}

// ── Fix mojibake: the file was saved as UTF-8 but read as Latin-1 ──
// Reading as 'latin1' gives us the raw bytes, then we reinterpret as UTF-8
const latin1Content = fs.readFileSync(inputFile, 'latin1');
const bytes = Buffer.from(latin1Content, 'latin1');
const content = bytes.toString('utf-8');

// ── Parse lines → unique terms ──
const terms = [
  ...new Set(
    content
      .split(/[\r\n]+/)
      .map(line => line.trim())
      .filter(line => line.length >= 3 && !line.startsWith('#'))
  )
].sort((a, b) => a.localeCompare(b, 'fr'));

console.log(`Loaded ${terms.length} unique terms from ${inputFile}`);

// ── Chunk into lines of 4 ──
const chunks = [];
for (let i = 0; i < terms.length; i += 4) {
  const slice = terms.slice(i, i + 4).map(t => JSON.stringify(t)).join(', ');
  chunks.push('  ' + slice + ',');
}

const output = `/**
 * French Medical Dictionary — auto-generated from termes médicaux dragon.txt
 * Generated: ${new Date().toISOString()}
 * Terms: ${terms.length}
 * DO NOT EDIT — regenerate with: node scripts/buildDictionary.mjs <file>
 */

export const MEDICAL_TERMS: readonly string[] = [
${chunks.join('\n')}
];

/** O(1) lookup set — built once at module load */
export const DICTIONARY_SET: ReadonlySet<string> = new Set(
  MEDICAL_TERMS.map(t => t.toLowerCase())
);

/** Normalized form (no accents) for fuzzy matching */
export const NORMALIZED_SET: ReadonlySet<string> = new Set(
  MEDICAL_TERMS.map(t => t.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, ""))
);
`;

const outPath = path.join(__dirname, '../src/lib/medicalDictionary.ts');
fs.writeFileSync(outPath, output, 'utf-8');
console.log(`Written to ${outPath}`);
