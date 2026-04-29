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
_OLLAMA_MODEL = "qwen2:0.5b"

_SYSTEM_PROMPT = (
    "Tu es un correcteur orthographique pour des transcriptions automatiques "
    "de comptes rendus radiologiques en français. "
    "Tu corriges UNIQUEMENT les fautes d'orthographe et les accents manquants. "
    "Tu ne changes JAMAIS un mot correct. "
    "Tu ne modifies JAMAIS le sens médical. "
    "Si un mot te semble étrange mais pourrait être correct, laisse-le tel quel. "
    "Retourne UNIQUEMENT le texte corrigé sans explication."
)


def correct_with_ollama(text: str) -> tuple:
    """Returns (corrected_text, changes_list). Full-text correction via Ollama."""
    import json
    import urllib.request

    payload = json.dumps({
        "model": _OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user",   "content": text},
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
            corrected = data.get("message", {}).get("content", "").strip()
            if not corrected:
                return text, []
            changes = diff_corrections(text, corrected)
            return corrected, changes
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
