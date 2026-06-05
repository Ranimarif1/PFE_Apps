"""
Traitement de la ponctuation pour les transcriptions médicales.
  - Commandes verbales → symboles
  - Restauration automatique (deepmultilingualpunctuation, optionnel)
  - Correction intelligente via Ollama (mistral, local)
"""
from __future__ import annotations

import os
import re
import sys

# ──────────────────────────────────────────────────────────────────────────────
# 1. COMMANDES VERBALES
# ──────────────────────────────────────────────────────────────────────────────

VERBAL_COMMANDS = [
    # ── Sauts de ligne combinés — AVANT les règles individuelles ──────────────
    (r"\bpoints?\s+à\s+la\s+ligne\b",                   ".\n"),
    (r"\bpoints?\s+(?:et\s+)?(?:nouveau|nouvelle)\s+paragraphe\b", ".\n\n"),
    (r"\bpoints?\s+(?:et\s+)?(?:nouvelle|nouveau)\s+ligne\b",      ".\n"),
    (r"\bvirgule\s+à\s+la\s+ligne\b",                   ",\n"),

    # ── Sauts de ligne seuls ───────────────────────────────────────────────────
    (r"\bnouveau paragraphe\b",                         "\n\n"),
    (r"\bnouvelle ligne\b",                             "\n"),
    (r"\bà la ligne\b",                                 "\n"),
    (r"\bsaut de ligne\b",                              "\n"),
    (r"\bretour à la ligne\b",                          "\n"),

    # ── Ponctuation de fin — AVANT "point" seul pour éviter collision ─────────
    (r"\bpoints? d[' ]interrogation\b",                 "?"),
    (r"\bpoints? d[' ]exclamation\b",                   "!"),
    (r"\bpoints? virgule\b",                            ";"),
    (r"\bpoints? de suspension\b",                      "..."),

    # "deux points" → deux-points (:)
    (r"\b(?:deux|de|des|2)\s+pointe?s?\b",              ":"),

    # "point" ou "points" seul → point final
    (r"\bpoints?\b",                                    "."),

    # ── Ponctuation interne ────────────────────────────────────────────────────
    (r"\bvirgule\b",                                    ","),
    (r"\btiret\b",                                      "-"),
    (r"\bslash\b",                                      "/"),

    # ── Parenthèses / guillemets ───────────────────────────────────────────────
    (r"\bouvr(?:ez|ir) (?:la )?parenth[èe]se\b",       "("),
    (r"\bferm(?:ez|er) (?:la )?parenth[èe]se\b",       ")"),
    (r"\bparenth[èe]se (?:ouvrante|ouverte)\b",         "("),
    (r"\bparenth[èe]se fermante\b",                     ")"),
    (r"\bouvr(?:ez|ir) (?:les )?guillemets\b",          '"'),
    (r"\bferm(?:ez|er) (?:les )?guillemets\b",          '"'),
]


def strip_whisper_punctuation(text: str) -> str:
    """Supprime la ponctuation automatique ajoutée par Whisper avant traitement."""
    result = re.sub(r"(?<!\d)[.,!?;](?!\d)", " ", text)
    result = re.sub(r"[^\S\n]{2,}", " ", result)
    return result.strip()


def apply_verbal_commands(text: str) -> str:
    """Remplace les commandes verbales par les symboles de ponctuation.

    Toute la ponctuation auto de Whisper est supprimée d'abord, puis les mots
    de ponctuation dictés (virgule, point, à la ligne…) sont convertis en
    symboles réels.
    """
    result = strip_whisper_punctuation(text)
    result = result.lower()

    for pattern, replacement in VERBAL_COMMANDS:
        result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)

    result = re.sub(r"\s+([.,;:?!])", r"\1", result)
    result = re.sub(r"([.,;:?!])(?=[^\s\n])", r"\1 ", result)

    result = re.sub(r",\s*,+", ",", result)
    result = re.sub(r"\.\s*\.+", ".", result)
    result = re.sub(r";\s*;+", ";", result)
    result = re.sub(r":\s*:+", ":", result)
    result = re.sub(r",\s*\.", ".", result)
    result = re.sub(r"\.\s*,", ".", result)

    result = re.sub(r" *\n *", "\n", result)
    result = re.sub(r"[^\S\n]{2,}", " ", result)
    result = result.strip()

    result = _capitalize_sentences(result)
    return result


def _capitalize_sentences(text: str) -> str:
    """Met une majuscule après chaque fin de phrase."""
    text = text[:1].upper() + text[1:] if text else text

    def _upper_match(m):
        return m.group(0)[:-1] + m.group(0)[-1].upper()

    text = re.sub(r"[.?!]\s+[a-zàâäéèêëîïôùûüçœæ]", _upper_match, text)
    text = re.sub(r"\n+[a-zàâäéèêëîïôùûüçœæ]", _upper_match, text)
    return text


# ──────────────────────────────────────────────────────────────────────────────
# 2. RESTAURATION AUTOMATIQUE (deepmultilingualpunctuation, optionnel)
# ──────────────────────────────────────────────────────────────────────────────

def restore_punctuation_auto(text: str) -> str:
    """Ajoute la ponctuation manquante via deepmultilingualpunctuation."""
    try:
        from deepmultilingualpunctuation import PunctuationModel
        model = PunctuationModel(model="kredor/punctuate-all")
        result = model.restore_punctuation(text)
        return _capitalize_sentences(result)
    except ImportError:
        return text
    except Exception as e:
        print(f"  [warn] Restauration auto échouée : {e}", file=sys.stderr)
        return text


# ──────────────────────────────────────────────────────────────────────────────
# 3. CORRECTION ORTHOGRAPHIQUE — Ollama / mistral-small (local)
# ──────────────────────────────────────────────────────────────────────────────

_OLLAMA_URL   = "http://localhost:11434/api/chat"
# Override via OLLAMA_MODEL env var (e.g. "qwen2:0.5b" for offline/small-footprint deployments)
_OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "mistral:latest")

_SYSTEM_PROMPT = (
    "Tu es un correcteur orthographique médical spécialisé en radiologie française.\n\n"
    "Règles STRICTES :\n"
    "- Corrige UNIQUEMENT les vraies fautes d'orthographe et les erreurs de termes médicaux\n"
    "- NE PAS modifier la casse (majuscules/minuscules)\n"
    "- NE PAS ajouter ou modifier la ponctuation\n"
    "- NE PAS reformuler ou restructurer les phrases\n"
    "- NE PAS corriger la grammaire ou les accords\n\n"
    "Réponds UNIQUEMENT avec un JSON de cette forme :\n"
    '{\"corrections\": [{\"original\": \"mot_fautif\", \"corrected\": \"mot_corrigé\"}]}\n\n'
    "Si aucune faute réelle, réponds : {\"corrections\": []}"
)

# Section header pattern — used to strip structure before sending to Ollama so
# small models (qwen2:0.5b) don't rewrite or drop the labels.
_SECTION_RE = re.compile(
    r'\b(indication|r[eé]sultat|conclusion)\s*:?\s*',
    flags=re.IGNORECASE,
)


def _edit_distance(a: str, b: str) -> int:
    """Basic Levenshtein distance between two strings."""
    a, b = a.lower(), b.lower()
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        curr = [i]
        for j, cb in enumerate(b, 1):
            curr.append(min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = curr
    return prev[-1]


def _is_valid_spelling_fix(original: str, corrected: str) -> bool:
    """Accept only genuine single-word spelling/accent fixes. Reject everything else."""
    orig_words = original.strip().split()
    corr_words = corrected.strip().split()

    # Must be single word → single word (no phrase rewrites)
    if len(orig_words) != 1 or len(corr_words) != 1:
        return False

    orig_clean = re.sub(r'[^\w]', '', orig_words[0], flags=re.UNICODE).lower()
    corr_clean = re.sub(r'[^\w]', '', corr_words[0], flags=re.UNICODE).lower()

    if orig_clean == corr_clean:
        return False

    # Reject if edit distance > 3 (synonym replacement, not spelling fix)
    if _edit_distance(orig_clean, corr_clean) > 3:
        return False

    # Reject if the words share less than 60% of characters (completely different word)
    shorter = min(len(orig_clean), len(corr_clean))
    if shorter == 0:
        return False
    common = sum(1 for a, b in zip(sorted(orig_clean), sorted(corr_clean)) if a == b)
    if common / max(len(orig_clean), len(corr_clean)) < 0.6:
        return False

    return True


def correct_with_ollama(text: str) -> tuple:
    """Returns (corrected_text, changes_list). JSON-based correction via Ollama.

    The model returns only a JSON list of {original, corrected} pairs — no free
    text rewriting — so capitalization, punctuation and grammar are never touched.
    """
    import json
    import urllib.request

    if not text.strip():
        return text, []

    user_message = f"Texte à analyser :\n{text}"

    payload = json.dumps({
        "model": _OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user",   "content": user_message},
        ],
        "stream": False,
        "options": {
            "temperature": 0.0,
            "seed": 0,
        },
    }).encode()

    req = urllib.request.Request(
        _OLLAMA_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read())
            raw = data.get("message", {}).get("content", "").strip()
            if not raw:
                return text, []

            # Extract JSON even if the model wraps it in ```json ... ```
            json_match = re.search(r'\{.*\}', raw, re.DOTALL)
            if not json_match:
                return text, []

            parsed = json.loads(json_match.group())
            raw_changes = parsed.get("corrections", [])
            if not raw_changes:
                return text, []

            # Filter: only genuine single-word spelling/accent fixes
            changes = [
                c for c in raw_changes
                if c.get("original") and c.get("corrected")
                and c["original"] != c["corrected"]
                and _is_valid_spelling_fix(c["original"], c["corrected"])
            ]
            if not changes:
                return text, []

            # Apply each correction to the full text (word-boundary aware)
            corrected_full = text
            for change in changes:
                orig = change["original"]
                corr = change["corrected"]
                corrected_full = re.sub(
                    r'(?<![A-Za-zÀ-ÖØ-öø-ÿ])' + re.escape(orig) + r'(?![A-Za-zÀ-ÖØ-öø-ÿ])',
                    corr,
                    corrected_full,
                    count=1,
                )

            return corrected_full, changes

    except Exception as e:
        print(f"  [warn] Ollama indisponible : {e}", file=sys.stderr)
        return text, []


def diff_corrections(original: str, corrected: str) -> list:
    """Word-level diff. Only returns genuine spelling corrections, not rewrites."""
    import difflib
    import re

    orig_tokens = re.findall(r'\S+', original)
    corr_tokens = re.findall(r'\S+', corrected)

    if not orig_tokens:
        return []

    changes = []
    matcher = difflib.SequenceMatcher(None, orig_tokens, corr_tokens, autojunk=False)
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'replace':
            for k in range(max(i2 - i1, j2 - j1)):
                orig = orig_tokens[i1 + k] if i1 + k < i2 else ''
                corr = corr_tokens[j1 + k] if j1 + k < j2 else ''
                if orig and corr and orig != corr:
                    # 1. Skip punctuation-only changes (masse → masse.)
                    if re.sub(r'[.,;:!?]+$', '', orig) == re.sub(r'[.,;:!?]+$', '', corr):
                        continue
                    # 1b. Skip quote-wrapping changes (Maladie → "Maladie, IRM → IRM", 48h → "48h")
                    if re.sub(r'[\"\'«»“”‘’]+', '', orig) == re.sub(r'[\"\'«»“”‘’]+', '', corr):
                        continue
                    # 2. Skip number+unit stripping (48h → 48, 12mm → 12)
                    if re.match(r'^\d+[a-zA-Z]+$', orig):
                        num = re.match(r'^\d+', orig).group()
                        if corr == num:
                            continue
                    # 3. Skip gender/number-only changes (urgente → urgent, élevées → élevée, mots → mot)
                    if orig.endswith('e') and corr == orig[:-1]:
                        continue
                    if orig.lower().endswith('ée') and corr.lower().endswith('é') and not corr.lower().endswith('ée'):
                        continue
                    if orig.lower() == corr.lower() + 's':
                        continue
                    # Only keep genuine spelling corrections (words must be similar)
                    similarity = difflib.SequenceMatcher(None, orig.lower(), corr.lower()).ratio()
                    if similarity >= 0.5:
                        changes.append({"original": orig, "corrected": corr})

    # If the model changed too many words it rewrote the text — discard entirely
    if len(changes) > max(5, int(len(orig_tokens) * 0.3)):
        return []

    return changes


# ──────────────────────────────────────────────────────────────────────────────
# 4. PIPELINE COMBINÉ
# ──────────────────────────────────────────────────────────────────────────────

def process(text: str, auto_punct: bool = True) -> str:
    """
    Pipeline de post-traitement :
      1. Commandes verbales  (toujours)
      2. Restauration auto   (si peu de ponctuation détectée)
    La correction Ollama est déclenchée séparément via /api/transcribe/suggest/.
    """
    text = apply_verbal_commands(text)

    if auto_punct:
        punct_ratio = sum(1 for c in text if c in ".,;:?!") / max(len(text), 1)
        if punct_ratio < 0.02:
            text = restore_punctuation_auto(text)

    return text


if __name__ == "__main__":
    raw = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else (
        "le patient présente une fièvre virgule une toux et des céphalées point "
        "à la ligne diagnostic deux points pneumonie bactérienne point virgule "
        "traitement deux points amoxicilline 1g trois fois par jour point"
    )
    print("Texte brut :")
    print(raw)
    print()
    print("Après traitement :")
    print(process(raw, auto_punct=False))
