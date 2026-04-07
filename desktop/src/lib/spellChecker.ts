/**
 * spellChecker.ts — MedCorrect Engine (100% offline)
 *
 * Place your `termes_medicaux_dragon.txt` in /public/
 * The dictionary is auto-loaded on first use and cached.
 *
 * Usage:
 *   import { checkText, loadDictionary, isDictionaryReady } from "@/lib/spellChecker";
 *
 *   await loadDictionary();               // optional — call early to pre-warm
 *   const suggestions = checkText(text);  // synchronous after dict is loaded
 */

/* ═══════════════════════════════════════════════════════════
   1. LEVENSHTEIN DISTANCE
   ═══════════════════════════════════════════════════════════ */
function lev(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/* ═══════════════════════════════════════════════════════════
   2. BK-TREE (fast fuzzy search on 26k terms)
   ═══════════════════════════════════════════════════════════ */
interface BKNode {
  word: string;
  children: Record<number, BKNode>;
}

class BKTree {
  root: BKNode | null = null;

  add(word: string) {
    const node: BKNode = { word, children: {} };
    if (!this.root) { this.root = node; return; }
    let cur = this.root;
    while (true) {
      const d = lev(word.toLowerCase(), cur.word.toLowerCase());
      if (d === 0) return; // duplicate
      if (!cur.children[d]) { cur.children[d] = node; return; }
      cur = cur.children[d];
    }
  }

  search(word: string, maxDist = 2): { word: string; distance: number }[] {
    if (!this.root) return [];
    const results: { word: string; distance: number }[] = [];
    const stack: BKNode[] = [this.root];
    const low = word.toLowerCase();

    while (stack.length) {
      const node = stack.pop()!;
      const d = lev(low, node.word.toLowerCase());
      if (d > 0 && d <= maxDist) results.push({ word: node.word, distance: d });
      for (let i = d - maxDist; i <= d + maxDist; i++) {
        if (node.children[i]) stack.push(node.children[i]);
      }
    }

    results.sort((a, b) => a.distance - b.distance);
    return results.slice(0, 5);
  }
}

/* ═══════════════════════════════════════════════════════════
   3. DICTIONARY STATE (singleton, auto-loaded)
   ═══════════════════════════════════════════════════════════ */
let _dictSet: Set<string> | null = null;
let _bkTree: BKTree | null = null;
let _loading: Promise<void> | null = null;
let _dictCount = 0;

export function isDictionaryReady(): boolean {
  return _dictSet !== null && _bkTree !== null;
}

export function getDictionaryCount(): number {
  return _dictCount;
}

export async function loadDictionary(url = "/termes_medicaux_dragon.txt"): Promise<void> {
  if (_dictSet) return;          // already loaded
  if (_loading) return _loading; // already loading

  _loading = (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[MedCorrect] Dictionary not found at ${url} — running with rules only`);
        return;
      }
      const text = await res.text();
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

      _dictSet = new Set(lines.map(l => l.toLowerCase()));
      _dictCount = lines.length;

      const tree = new BKTree();
      for (const line of lines) tree.add(line);
      _bkTree = tree;

      console.log(`[MedCorrect] Dictionary loaded: ${lines.length} terms, BK-Tree ready`);
    } catch (err) {
      console.warn("[MedCorrect] Could not load dictionary:", err);
    }
  })();

  return _loading;
}

/* ═══════════════════════════════════════════════════════════
   4. STOPWORDS
   ═══════════════════════════════════════════════════════════ */
const SKIP = new Set(
  "le la les de du des un une et en au aux ce se ne pas par pour sur dans avec est sont a il elle on nous vous ils elles que qui ou mais son sa ses leur leurs cette ces été être avoir fait sans plus très bien peu aussi après avant d l n s qu c j m y".split(" ")
);

/* ═══════════════════════════════════════════════════════════
   5. KNOWN STT ERRORS (radiology-specific)
   ═══════════════════════════════════════════════════════════ */
const KNOWN_FIXES: Record<string, string> = {
  "paranchyme": "parenchyme",
  "parenchime": "parenchyme",
  "parrenchyme": "parenchyme",
  "lattéraux": "latéraux",
  "lattéral": "latéral",
  "lateraux": "latéraux",
  "médianne": "médiane",
  "medianne": "médiane",
  "cérébralle": "cérébrale",
  "cerebralle": "cérébrale",
  "cerébral": "cérébral",
  "cerebral": "cérébral",
  "postèrieure": "postérieure",
  "posterieure": "postérieure",
  "postèrieur": "postérieur",
  "gadoliniom": "gadolinium",
  "gadoliniun": "gadolinium",
  "gadolinuim": "gadolinium",
  "réhaussement": "rehaussement",
  "rehossement": "rehaussement",
  "réhossement": "rehaussement",
  "ischèmique": "ischémique",
  "ischemique": "ischémique",
  "ischèmiques": "ischémiques",
  "céphallées": "céphalées",
  "cephallées": "céphalées",
  "encephalique": "encéphalique",
  "ventricullaire": "ventriculaire",
  "ventricullair": "ventriculaire",
  "hemmoragie": "hémorragie",
  "hémmoragie": "hémorragie",
  "hemorrhagie": "hémorragie",
  "hémoragie": "hémorragie",
  "calciffication": "calcification",
  "calcifiation": "calcification",
  "oedème": "œdème",
  "oedeme": "œdème",
  "oedéme": "œdème",
  "athérosclèrose": "athérosclérose",
  "atherosclerose": "athérosclérose",
  "sténnose": "sténose",
  "stenose": "sténose",
  "annévrisme": "anévrisme",
  "anevrisme": "anévrisme",
  "anévrysme": "anévrisme",
  "ménninge": "méninge",
  "meninge": "méninge",
  "hipocampe": "hippocampe",
  "hypocampe": "hippocampe",
  "thorascique": "thoracique",
  "toracique": "thoracique",
  "opacitée": "opacité",
  "opacite": "opacité",
  "dillation": "dilatation",
  "dilatataion": "dilatation",
  "infractus": "infarctus",
  "innfarctus": "infarctus",
  "embollie": "embolie",
  "thrombôse": "thrombose",
  "fibrôse": "fibrose",
  "nécrôse": "nécrose",
  "anastomôse": "anastomose",
  "metastase": "métastase",
};

/* ═══════════════════════════════════════════════════════════
   6. GRAMMAR RULES (noun-adjective agreement)
   ═══════════════════════════════════════════════════════════ */
interface AdjRule {
  masc: string; fem: string; mascPl: string; femPl: string;
}

const ADJ_RULES: AdjRule[] = [
  { masc: "cérébral",     fem: "cérébrale",     mascPl: "cérébraux",     femPl: "cérébrales"     },
  { masc: "normal",       fem: "normale",       mascPl: "normaux",       femPl: "normales"       },
  { masc: "vasculaire",   fem: "vasculaire",    mascPl: "vasculaires",   femPl: "vasculaires"    },
  { masc: "latéral",      fem: "latérale",      mascPl: "latéraux",      femPl: "latérales"      },
  { masc: "médian",       fem: "médiane",       mascPl: "médians",       femPl: "médianes"       },
  { masc: "postérieur",   fem: "postérieure",   mascPl: "postérieurs",   femPl: "postérieures"   },
  { masc: "antérieur",    fem: "antérieure",    mascPl: "antérieurs",    femPl: "antérieures"    },
  { masc: "significatif", fem: "significative", mascPl: "significatifs", femPl: "significatives" },
  { masc: "expansif",     fem: "expansive",     mascPl: "expansifs",     femPl: "expansives"     },
  { masc: "ischémique",   fem: "ischémique",    mascPl: "ischémiques",   femPl: "ischémiques"    },
  { masc: "encéphalique", fem: "encéphalique",  mascPl: "encéphaliques", femPl: "encéphaliques"  },
  { masc: "récent",       fem: "récente",       mascPl: "récents",       femPl: "récentes"       },
  { masc: "anormal",      fem: "anormale",      mascPl: "anormaux",      femPl: "anormales"      },
  { masc: "thoracique",   fem: "thoracique",    mascPl: "thoraciques",   femPl: "thoraciques"    },
  { masc: "rachidien",    fem: "rachidienne",   mascPl: "rachidiens",    femPl: "rachidiennes"   },
  { masc: "lombaire",     fem: "lombaire",      mascPl: "lombaires",     femPl: "lombaires"      },
  { masc: "cervical",     fem: "cervicale",     mascPl: "cervicaux",     femPl: "cervicales"     },
  { masc: "proximal",     fem: "proximale",     mascPl: "proximaux",     femPl: "proximales"     },
  { masc: "distal",       fem: "distale",       mascPl: "distaux",       femPl: "distales"       },
  { masc: "bilatéral",    fem: "bilatérale",    mascPl: "bilatéraux",    femPl: "bilatérales"    },
  { masc: "unilatéral",   fem: "unilatérale",   mascPl: "unilatéraux",   femPl: "unilatérales"   },
  { masc: "pulmonaire",   fem: "pulmonaire",    mascPl: "pulmonaires",   femPl: "pulmonaires"    },
  { masc: "hépatique",    fem: "hépatique",     mascPl: "hépatiques",    femPl: "hépatiques"     },
  { masc: "rénal",        fem: "rénale",        mascPl: "rénaux",        femPl: "rénales"        },
  { masc: "coronaire",    fem: "coronaire",     mascPl: "coronaires",    femPl: "coronaires"     },
  { masc: "abdominal",    fem: "abdominale",    mascPl: "abdominaux",    femPl: "abdominales"    },
  { masc: "pelvien",      fem: "pelvienne",     mascPl: "pelviens",      femPl: "pelviennes"     },
];

const MEDICAL_MASC = [
  "parenchyme", "rehaussement", "épanchement", "épaississement", "ventricule",
  "tronc", "corps", "aspect", "signal", "nodule", "examen", "infarctus",
  "diamètre", "calibre", "canal", "sinus", "kyste", "abcès", "thrombus",
  "anévrisme", "ligament", "ménisque", "cartilage", "tendon", "muscle",
  "nerf", "vaisseau", "œdème", "hématome", "pneumothorax", "épithélium",
];

const MEDICAL_FEM = [
  "lésion", "structure", "anomalie", "image", "séquence", "injection",
  "indication", "conclusion", "déviation", "ligne", "fosse", "masse",
  "artère", "veine", "valve", "sténose", "dilatation", "opacité",
  "calcification", "fracture", "luxation", "hernie", "tumeur", "métastase",
  "nécrose", "fibrose", "hémorragie", "embolie", "thrombose", "méninge",
  "vertèbre", "côte", "rate", "prostate", "thyroïde", "surrénale",
  "irm", "tdm",
];

// Plural determiners — more reliable than checking word endings
const PLURAL_DET = new Set(["les", "des", "ces", "aux", "plusieurs", "certains", "certaines", "nombreux", "nombreuses"]);

/* ═══════════════════════════════════════════════════════════
   7. TOKENIZER
   ═══════════════════════════════════════════════════════════ */
interface Token {
  word: string;
  start: number;
  end: number;
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const re = /[\p{L}\p{M}'-]+/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    tokens.push({ word: m[0], start: m.index, end: m.index + m[0].length });
  }
  return tokens;
}

/* ═══════════════════════════════════════════════════════════
   8. SUGGESTION INTERFACE
   ═══════════════════════════════════════════════════════════ */
export interface Suggestion {
  original: string;
  correction: string;
  reason: string;
  index: number;
  type?: "stt" | "ortho" | "accord" | "medical";
  confidence?: number;
  alternatives?: string[];
}

/* ═══════════════════════════════════════════════════════════
   9. MAIN ANALYSIS FUNCTION
   ═══════════════════════════════════════════════════════════ */
export function checkText(text: string): Suggestion[] {
  const tokens = tokenize(text);
  const corrections: Suggestion[] = [];
  const seen = new Set<string>();

  for (let ti = 0; ti < tokens.length; ti++) {
    const t = tokens[ti];
    const w = t.word;
    const lower = w.toLowerCase();

    if (lower.length < 3 || SKIP.has(lower)) continue;
    if (seen.has(lower)) continue;

    /* ── 1) Known STT fixes ── */
    const knownFix = KNOWN_FIXES[lower];
    if (knownFix && knownFix.toLowerCase() !== lower) {
      corrections.push({
        original: w,
        correction: knownFix,
        reason: "Erreur de transcription connue en radiologie",
        index: t.start,
        type: "stt",
        confidence: 0.95,
      });
      seen.add(lower);
      continue;
    }

    /* ── 2) Agreement checks ── */
    let accordFound = false;
    for (const rule of ADJ_RULES) {
      const forms = [rule.masc, rule.fem, rule.mascPl, rule.femPl];
      const match = forms.find(f => f.toLowerCase() === lower);
      if (!match) continue;

      const nearby = tokens.slice(Math.max(0, ti - 5), ti).map(t2 => t2.word.toLowerCase());
      const isFem = nearby.some(n => MEDICAL_FEM.some(f => n.includes(f)));
      const isMasc = nearby.some(n => MEDICAL_MASC.some(f => n.includes(f)));
      const isPlural = nearby.some(n => PLURAL_DET.has(n));

      let expected: string | null = null;
      let reason = "";

      if (isFem && isPlural)       { expected = rule.femPl;  reason = "Accord féminin pluriel attendu"; }
      else if (isFem)              { expected = rule.fem;    reason = "Accord féminin singulier attendu"; }
      else if (isMasc && isPlural) { expected = rule.mascPl; reason = "Accord masculin pluriel attendu"; }
      else if (isMasc)             { expected = rule.masc;   reason = "Accord masculin singulier attendu"; }

      if (expected && expected.toLowerCase() !== lower) {
        corrections.push({
          original: w,
          correction: expected,
          reason,
          index: t.start,
          type: "accord",
          confidence: 0.87,
        });
        seen.add(lower);
        accordFound = true;
      }
      break;
    }
    if (accordFound) continue;

    /* ── 3) Fuzzy check against adjective forms (misspelling) ── */
    let adjFixed = false;
    for (const rule of ADJ_RULES) {
      const allAdj = [rule.masc, rule.fem, rule.mascPl, rule.femPl];
      // Word is already a valid form of this rule → not a typo, skip
      if (allAdj.some(f => f.toLowerCase() === lower)) { adjFixed = true; break; }
      for (const adj of allAdj) {
        const d = lev(lower, adj.toLowerCase());
        if (d === 1) {
          corrections.push({
            original: w,
            correction: adj,
            reason: `Orthographe proche de « ${adj} »`,
            index: t.start,
            type: "ortho",
            confidence: 0.88,
          });
          seen.add(lower);
          adjFixed = true;
          break;
        }
      }
      if (adjFixed) break;
    }
    if (adjFixed) continue;

    /* ── 4) Dictionary fuzzy search (BK-Tree) ── */
    if (_dictSet && !_dictSet.has(lower) && _bkTree) {
      const matches = _bkTree.search(w, 2);
      if (matches.length > 0) {
        corrections.push({
          original: w,
          correction: matches[0].word,
          reason: matches[0].distance === 1
            ? "Correction orthographique (distance: 1)"
            : `Terme médical proche trouvé (distance: ${matches[0].distance})`,
          index: t.start,
          type: matches[0].distance === 1 ? "ortho" : "medical",
          confidence: matches[0].distance === 1 ? 0.88 : 0.68,
          alternatives: matches.slice(1, 4).map(m2 => m2.word),
        });
        seen.add(lower);
      }
    }
  }

  corrections.sort((a, b) => a.index - b.index);
  return corrections;
}
