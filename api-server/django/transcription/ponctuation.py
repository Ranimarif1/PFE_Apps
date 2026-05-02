"""
Traitement de la ponctuation pour les transcriptions médicales.
  - Commandes verbales → symboles
  - Restauration automatique (deepmultilingualpunctuation, optionnel)
  - Correction intelligente via Ollama (mistral, local)
"""
from __future__ import annotations

import re
import sys

# ──────────────────────────────────────────────────────────────────────────────
# 1. COMMANDES VERBALES
# ──────────────────────────────────────────────────────────────────────────────

VERBAL_COMMANDS = [
    # Sauts de ligne
    (r"\bnouveau paragraphe\b",                         "\n\n"),
    (r"\bnouvelle ligne\b",                             "\n"),
    (r"\bà la ligne\b",                                 "\n"),
    (r"\bsaut de ligne\b",                              "\n"),

    # Ponctuation de fin — AVANT "point" seul pour éviter collision
    (r"\bpoints? d[' ]interrogation\b",                 "?"),
    (r"\bpoints? d[' ]exclamation\b",                   "!"),
    (r"\bpoints? virgule\b",                            ";"),
    (r"\bpoints? de suspension\b",                      "..."),

    # "deux points" → deux-points (:)
    (r"\b(?:deux|de|des|2)\s+pointe?s?\b",              ":"),

    # "point" ou "points" seul → point final
    (r"\bpoints?\b",                                    "."),

    # Ponctuation interne
    (r"\bvirgule\b",                                    ","),
    (r"\btiret\b",                                      "-"),
    (r"\bslash\b",                                      "/"),

    # Parenthèses / guillemets
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
    """Remplace les commandes verbales par les symboles de ponctuation."""
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

    text = re.sub(r"[.?!]\s+[a-zàâäéèêëîïôùûüç]", _upper_match, text)
    text = re.sub(r"\n+[a-zàâäéèêëîïôùûüç]", _upper_match, text)
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
_OLLAMA_MODEL = "mistral:latest"

_SYSTEM_PROMPT = (
    "Tu es un correcteur orthographique strict pour des comptes rendus radiologiques en français. "
    "RÈGLES ABSOLUES : "
    "1. Corrige UNIQUEMENT les fautes d'orthographe évidentes et les accents manquants (ex: trés → très, enflammation → inflammation). "
    "2. Ne change JAMAIS la ponctuation, les guillemets, les majuscules ou les chiffres. "
    "3. Ne supprime JAMAIS les unités médicales (48h, 12mm, 2cm restent tels quels). "
    "4. Ne change JAMAIS le genre grammatical d'un mot. "
    "5. Ne change JAMAIS un terme médical même s'il te semble inhabituel. "
    "6. Retourne UNIQUEMENT le texte corrigé, sans guillemets autour, sans explication."
)

# Section header pattern — used to strip structure before sending to Ollama so
# small models (qwen2:0.5b) don't rewrite or drop the labels.
_SECTION_RE = re.compile(
    r'\b(indication|r[eé]sultat|conclusion)\s*:?\s*',
    flags=re.IGNORECASE,
)


def correct_with_ollama(text: str) -> tuple:
    """Returns (corrected_text, changes_list). Full-text correction via Ollama.

    Section headers (Indication/Résultat/Conclusion) are stripped before sending
    to the model — small models tend to rewrite or drop them, which inflates the
    diff and hides real corrections.  Corrections are then applied back to the
    full structured text so the frontend receives the complete content.
    """
    import json
    import urllib.request

    # Work on body text only so the model doesn't touch structural labels.
    stripped = _SECTION_RE.sub(' ', text).strip()
    if not stripped:
        return text, []

    payload = json.dumps({
        "model": _OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user",   "content": stripped},
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
            corrected_stripped = data.get("message", {}).get("content", "").strip()
            if not corrected_stripped:
                return text, []

            # Diff on stripped text only — no structural noise.
            changes = diff_corrections(stripped, corrected_stripped)
            if not changes:
                return text, []

            # Apply word corrections back to the full structured text.
            corrected_full = text
            for change in changes:
                corrected_full = re.sub(
                    r'(?<![A-Za-zÀ-ÖØ-öø-ÿ])' + re.escape(change["original"]) + r'(?![A-Za-zÀ-ÖØ-öø-ÿ])',
                    change["corrected"],
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
