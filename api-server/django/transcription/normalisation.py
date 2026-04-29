"""
Normalisation des transcriptions médicales :
  - Dates littérales → JJ/MM/AAAA
  - Noms d'unités → abréviations (mg, mL, mmHg, °C…)
  - Unités composées verbales → notation slash (mg/dL)
  - Nombres en lettres → chiffres (0-9999)
"""
from __future__ import annotations

import re
import sys

# ──────────────────────────────────────────────────────────────────────────────
# 1. DATES
# ──────────────────────────────────────────────────────────────────────────────

MOIS = {
    "janvier":   "01",
    "janv":      "01",
    "février":   "02",
    "fevrier":   "02",
    "mars":      "03",
    "avril":     "04",
    "mai":       "05",
    "juin":      "06",
    "juillet":   "07",
    "août":      "08",
    "aout":      "08",
    "septembre": "09",
    "octobre":   "10",
    "novembre":  "11",
    "décembre":  "12",
    "decembre":  "12",
}

_MOIS_PAT = "|".join(MOIS.keys())
_DATE_RE  = re.compile(
    rf"\b(\d{{1,2}})\s+({_MOIS_PAT})\s+(\d{{4}})\b",
    flags=re.IGNORECASE,
)


def normalize_dates(text: str) -> str:
    """Convertit les dates littérales en format JJ/MM/AAAA."""
    def _replace(m: re.Match) -> str:
        day   = m.group(1).zfill(2)
        month = MOIS.get(m.group(2).lower(), "??")
        year  = m.group(3)
        return f"{day}/{month}/{year}"
    return _DATE_RE.sub(_replace, text)


# ──────────────────────────────────────────────────────────────────────────────
# 2. UNITÉS MÉDICALES
# ──────────────────────────────────────────────────────────────────────────────

UNIT_MAP = [
    # Fréquence cardiaque / respiratoire
    (r"\bbattements?\s+par\s+minutes?\b",           "bpm"),
    (r"\bpulsations?\s+par\s+minutes?\b",           "bpm"),
    (r"\brespiration[s]?\s+par\s+minutes?\b",       "rpm"),
    (r"\bcycles?\s+par\s+minutes?\b",               "rpm"),

    # Pression → mmHg
    (r"\bmilli[\s\-]?m[eè]tres?\s+de\s+mercure\b", "mmHg"),
    (r"\bmm\s+de\s+mercure\b",                      "mmHg"),
    (r"\bmm\s+de\s+maire\s+cure\b",                 "mmHg"),
    (r"\bmm\s+de\s+m[eè]re\s+cure\b",               "mmHg"),
    (r"\bmm[\s\-]+hg\b",                             "mmHg"),

    # Température
    (r"\bdegrés?\s+celsius\b",                      "°C"),
    (r"\bdegrés?\s+centigrade[s]?\b",               "°C"),
    (r"\bdegres?\s+celsius\b",                      "°C"),
    (r"\bdegres?\s+centigrade[s]?\b",               "°C"),

    # Masse
    (r"\bmicrogrammes?\b",                          "µg"),
    (r"\bnanogrammes?\b",                           "ng"),
    (r"\bmilli[\s\-]grammes?\b",                    "mg"),
    (r"\bmille\s+grammes?\b",                       "mg"),
    (r"\bmilligrammes?\b",                          "mg"),
    (r"\bkilogrammes?\b",                           "kg"),
    (r"\bgrammes?\b",                               "g"),

    # Volume
    (r"\bmicro[\s\-]?litres?\b",                   "µL"),
    (r"\bmilli[\s\-]?litres?\b",                    "mL"),
    (r"\bdéci[\s\-]?litres?\b",                     "dL"),
    (r"\bdeci[\s\-]?litres?\b",                     "dL"),
    (r"\bcenti[\s\-]?litres?\b",                    "cL"),
    (r"\blitres?\b",                                "L"),

    # Longueur
    (r"\bmilli[\s\-]?mètres?\b",                    "mm"),
    (r"\bmilli[\s\-]?metres?\b",                    "mm"),
    (r"\bcenti[\s\-]?mètres?\b",                    "cm"),
    (r"\bcenti[\s\-]?metres?\b",                    "cm"),
    (r"\bmètres?\b",                                "m"),
    (r"\bmetres?\b",                                "m"),

    # Quantité de matière
    (r"\bmilli[\s\-]?moles?\b",                     "mmol"),
    (r"\bmicro[\s\-]?moles?\b",                     "µmol"),
    (r"\bnano[\s\-]?moles?\b",                      "nmol"),

    # Équivalents
    (r"\bmilli[\s\-]?équivalents?\b",               "mEq"),
    (r"\bmilli[\s\-]?equivalents?\b",               "mEq"),

    # Activité / UI
    (r"\bunités?\s+internationales?\b",             "UI"),
    (r"\bunités?\b",                                "U"),

    # Temps (avec nombre)
    (r"\b(\d+)\s+secondes?\b",                      r"\1 s"),
    (r"\b(\d+)\s+minutes?\b",                       r"\1 min"),
    (r"\b(\d+)\s+heures?\b",                        r"\1 h"),

    # Autres
    (r"\bdegrés?\b",                                "°"),
    (r"\bpour[\s\-]cent\b",                         "%"),
    (r"\bpourcent\b",                               "%"),
    (r"\bkilocalories?\b",                          "kcal"),
    (r"\bcalories?\b",                              "cal"),
    (r"\bjoules?\b",                                "J"),
    (r"\bmégahertz\b",                              "MHz"),
    (r"\bkilohertz\b",                              "kHz"),
    (r"\bhertz\b",                                  "Hz"),
    (r"\bwatts?\b",                                 "W"),
]


def normalize_units(text: str) -> str:
    """Remplace les noms d'unités médicales par leurs abréviations."""
    for pattern, abbrev in UNIT_MAP:
        text = re.sub(pattern, abbrev, text, flags=re.IGNORECASE)
    return text


# ──────────────────────────────────────────────────────────────────────────────
# 3. UNITÉS COMPOSÉES : "X par Y" → "X/Y"
# ──────────────────────────────────────────────────────────────────────────────

_KNOWN_ABBREVS = (
    r"µg|ng|mg|g|kg|µL|mL|cL|dL|L|mm|cm|m|mmol|µmol|nmol|mEq|U|UI|"
    r"mmHg|bpm|rpm|s|min|h|kcal|cal|J|MHz|kHz|Hz|W|°C|°"
)

_COMPOUND_RE = re.compile(
    rf"\b({_KNOWN_ABBREVS})\s+par\s+({_KNOWN_ABBREVS})\b"
)


def normalize_compound_units(text: str) -> str:
    """Convertit les unités composées verbales en notation slash (mg/dL)."""
    return _COMPOUND_RE.sub(r"\1/\2", text)


# ──────────────────────────────────────────────────────────────────────────────
# 4. NOMBRES EN LETTRES → CHIFFRES (français, 0-9999)
# ──────────────────────────────────────────────────────────────────────────────

_ONES_FR = [
    "", "un", "deux", "trois", "quatre", "cinq", "six", "sept",
    "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze",
    "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf",
]
_TENS_FR = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante"]


def _spell_fr(n: int) -> str:
    """Épelle n (0 ≤ n ≤ 9999) en français canonique (avec tirets)."""
    if n == 0:
        return "zéro"
    parts: list[str] = []

    if n >= 1000:
        k, n = divmod(n, 1000)
        parts.append("mille" if k == 1 else _spell_fr(k) + " mille")
        if n == 0:
            return " ".join(parts)

    if n >= 100:
        h, n = divmod(n, 100)
        c = "cent" if h == 1 else _spell_fr(h) + " cent"
        if n == 0 and h > 1:
            c += "s"
        parts.append(c)
        if n == 0:
            return " ".join(parts)

    if n < 20:
        parts.append(_ONES_FR[n])
    elif n < 70:
        t, u = divmod(n, 10)
        if u == 0:
            parts.append(_TENS_FR[t])
        elif u == 1:
            parts.append(_TENS_FR[t] + " et un")
        else:
            parts.append(_TENS_FR[t] + "-" + _ONES_FR[u])
    elif n < 80:
        u = n - 60
        parts.append("soixante et onze" if u == 11 else "soixante-" + _ONES_FR[u])
    else:
        u = n - 80
        if u == 0:
            parts.append("quatre-vingts")
        elif u == 1:
            parts.append("quatre-vingt-un")
        else:
            parts.append("quatre-vingt-" + _ONES_FR[u])

    return " ".join(parts)


def _build_fr_num_map() -> dict[str, int]:
    """Construit {orthographe_française: valeur} pour 0-9999."""
    m: dict[str, int] = {}
    for n in range(10000):
        canon = _spell_fr(n)
        m[canon] = n
        space = canon.replace("-", " ")
        if space != canon:
            m[space] = n
        for suffix_m, suffix_f in [(" et un", " et une"), ("-un", "-une")]:
            if canon.endswith(suffix_m):
                fem = canon[: -len(suffix_m)] + suffix_f
                m[fem] = n
                m[fem.replace("-", " ")] = n
    m["zero"] = 0
    return m


_FR_NUM_MAP: dict[str, int] = _build_fr_num_map()
_FR_NUM_WORDS = sorted(_FR_NUM_MAP, key=len, reverse=True)
_STANDALONE_EXCL = {"un", "une"}
_FR_NUM_WORDS_FILT = [w for w in _FR_NUM_WORDS if w not in _STANDALONE_EXCL]

_FR_NUM_RE = re.compile(
    r"\b(" + "|".join(re.escape(w) for w in _FR_NUM_WORDS_FILT) + r")\b",
    flags=re.IGNORECASE,
)


def normalize_numbers(text: str) -> str:
    """Convertit les nombres français en lettres (0-9999) en chiffres."""
    def _repl(m: re.Match) -> str:
        return str(_FR_NUM_MAP[m.group(1).lower()])
    return _FR_NUM_RE.sub(_repl, text)


# ──────────────────────────────────────────────────────────────────────────────
# 5. ABRÉVIATIONS MÉDICALES → MAJUSCULES
# ──────────────────────────────────────────────────────────────────────────────

_MEDICAL_ABBREVS = [
    # Modalités d'imagerie
    "IRM", "TDM", "TEP", "PET", "SPECT", "RX",
    # Séquences IRM
    "FLAIR", "DWI", "ADC", "STIR", "GRE", "TSE", "SPIR", "VIBE", "BLADE",
    # Pondérations IRM
    "T1", "T2", "T3", "T4",
    # Électrophysiologie
    "ECG", "EEG", "EMG",
    # Voies d'administration
    "IV", "IM", "SC", "PO", "VVP", "VVC",
    # Neurologie / cardiologie
    "SNC", "SNP", "AVC", "AIT", "HTA", "HTAP", "TVC",
    # Oncologie
    "PET", "SUV",
]

_ABBREV_RE = re.compile(
    r"\b(" + "|".join(re.escape(a) for a in _MEDICAL_ABBREVS) + r")\b",
    flags=re.IGNORECASE,
)


def normalize_abbrevs(text: str) -> str:
    """Met en majuscules les abréviations médicales reconnues."""
    return _ABBREV_RE.sub(lambda m: m.group(0).upper(), text)


# ──────────────────────────────────────────────────────────────────────────────
# 6. SUPPRESSION DES EN-TÊTES DE SECTION DICTÉS
# ──────────────────────────────────────────────────────────────────────────────

_SECTION_HEADER_RE = re.compile(
    r'\b(indication|r[eé]sultat|conclusion)\s*:?\s*',
    flags=re.IGNORECASE,
)


def strip_section_headers(text: str) -> str:
    """Supprime les mots-clés de section (Indication, Résultat, Conclusion)
    dictés par le médecin et captés par Whisper dans le corps du texte."""
    return _SECTION_HEADER_RE.sub('', text).strip()


# ──────────────────────────────────────────────────────────────────────────────
# 7. PIPELINE COMBINÉ
# ──────────────────────────────────────────────────────────────────────────────


# ──────────────────────────────────────────────────────────────────────────────
# ASR ACCENT FIXES  (deterministic, zero-risk — only unambiguous cases)
# ──────────────────────────────────────────────────────────────────────────────

# Words that Whisper systematically mis-transcribes without accents.
# Each entry is (bare_form, correct_form) — whole-word substitution only.
_ASR_ACCENT_FIXES: list[tuple[str, str]] = [
    # Common French words with accents stripped by ASR
    ("fievre",                      "fièvre"),
    ("fevrier",                     "février"),
    ("hyperleucose",                "hyperleucocytose"),
    # Article "là" used as wrong form of "la"
    # Only replace "là" when NOT preceded by punctuation that introduces an
    # adverb (e.g. "c'est là que") — safest to limit to "là [noun]" patterns.
    # Handled separately below via regex.

    # Accent fixes
    ("epanchement",                 "épanchement"),
    ("epanchements",                "épanchements"),

    # Whisper word-substitution errors (radiologie)
    ("homodensitometrique",         "tomodensitométrique"),
    ("homodensitométrique",         "tomodensitométrique"),
    ("recommente",                  "recommandé"),
    ("recommenté",                  "recommandé"),
    ("recommentes",                 "recommandés"),
    ("hyode",                       "iodé"),
    ("hyodé",                       "iodé"),
    ("hyodes",                      "iodés"),

    # Medical terms
    ("hemiplegie",                  "hémiplégie"),
    ("hemiplegies",                 "hémiplégies"),
    ("hemiplégique",                "hémiplégique"),
    ("splenomegalie",               "splénomégalie"),
    ("hepatomegalie",               "hépatomégalie"),
    ("cholecystite",                "cholécystite"),
    ("pancreatite",                 "pancréatite"),
    ("appendicite",                 "appendicite"),
    ("peritoine",                   "péritoine"),
    ("peritonite",                  "péritonite"),
    ("anemie",                      "anémie"),
    ("leucemie",                    "leucémie"),
    ("diabete",                     "diabète"),
    ("thrombose",                   "thrombose"),
    ("arythmie",                    "arythmie"),
    ("bronchopneumonie",            "bronchopneumonie"),
    ("biliaire",                    "biliaire"),
    ("pyelo-calicielle",            "pyélocalicielle"),
    ("pyelocalicielle",             "pyélocalicielle"),
    ("retro-peritoneale",           "rétropéritonéale"),
    ("retroperitoneale",            "rétropéritonéale"),
    ("perisigmoidienne",            "périsigmoïdienne"),
    ("sigmoidite",                  "sigmoïdite"),
    ("endoluminale",                "endoluminale"),
    ("normodistendue",              "normodistendue"),
]

_ASR_ACCENT_RE: list[tuple[re.Pattern, str]] = [
    (re.compile(r'(?<![A-Za-zÀ-ÖØ-öø-ÿ])' + re.escape(bare) + r'(?![A-Za-zÀ-ÖØ-öø-ÿ])',
                re.IGNORECASE), correct)
    for bare, correct in _ASR_ACCENT_FIXES
    if bare != correct   # skip no-ops
]

# "là" used as definite article (wrong accent) — only when followed by a
# lowercase letter (i.e. not "là-bas", "là-haut", etc.)
_LA_ACCENT_RE = re.compile(r'\blà\s+(?=[a-zàâäéèêëîïôùûüç])')


def fix_asr_accents(text: str) -> str:
    """Fix systematic accent-stripping errors produced by Whisper ASR."""
    for pattern, correct in _ASR_ACCENT_RE:
        text = pattern.sub(correct, text)
    text = _LA_ACCENT_RE.sub('la ', text)
    return text


def normalize(text: str) -> str:
    """
    Applique toutes les normalisations dans l'ordre :
      1. En-têtes     — supprime Indication/Résultat/Conclusion dictés
      2. Accents ASR  — corrections déterministes Whisper
      3. Dates        — avant que les noms de mois soient touchés
      4. Unités       — "mille grammes" → "mg" AVANT "mille" → 1000
      5. Unités comp. — "mg par dL" → "mg/dL"
      6. Nombres      — "cent vingt" → "120"
      7. Abréviations — irm → IRM, flair → FLAIR, t1 → T1 …
    """
    text = strip_section_headers(text)
    text = fix_asr_accents(text)
    text = normalize_dates(text)
    text = normalize_units(text)
    text = normalize_compound_units(text)
    text = normalize_numbers(text)
    text = normalize_abbrevs(text)
    return text


if __name__ == "__main__":
    if len(sys.argv) > 1:
        raw = " ".join(sys.argv[1:])
        print(f"Entrée : {raw}")
        print(f"Sortie : {normalize(raw)}")
