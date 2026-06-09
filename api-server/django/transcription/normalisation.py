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
    "A1", "AA", "AAN", "AB", "ABO", "ACA", "ACC", "ACE", "ACFA", "ACI",
    "ACLF", "ACM", "ACP", "ACR", "ADK", "ADO", "ADP", "AEG", "AFC", "AFS",
    "AFSD", "AICA", "AIT", "ALAT", "AMG", "ANCA", "ANS", "AOD", "AOMI", "AP",
    "APC", "ASAT", "ASD", "ATB", "ATCD", "ATFL", "ATS", "AUSP", "AVC", "AVCI",
    "AVK", "AVP", "AZA", "B12", "BAU", "BAV", "BBG", "BC", "BD", "BGSA",
    "BHE", "BILI-IRM", "BLSE", "BM", "BMI", "BPCO", "BSAD", "BT", "BU",
    "C1-C2", "C3-C4", "C4", "C5-C6", "CAE", "CAI", "CC", "CCO", "CCVT",
    "CFL", "CHC", "CHO", "CHU", "CN", "CP", "CPEC", "CPM", "CPRE",
    "CR", "CREAT", "CSC", "CSO", "CSP", "CT", "CTO", "CVC", "D9-D10", "DAI",
    "DAP", "DAPP", "DAPPD", "DAPPG", "DCC", "DD", "DDB", "DDR", "DHD", "DHNN",
    "DID", "DL", "DPC", "DR", "DS", "DSM", "DT1", "DT2", "DT2AVC", "DUPC",
    "DVE", "DVP", "EB", "ECBU", "ECG", "ECGBAV", "ECHO", "ECST", "EDC", "EPP",
    "ESA", "ETF", "ETSA", "ETT", "EU-TIRADS", "EVA", "EVR", "FA", "FAV",
    "FAZEKAS", "FC", "FCP", "FH", "FID", "FIG", "FIT", "FLAIR", "FP", "FS",
    "G2P1A0", "G3P3", "G4P4A0", "GA", "GADO", "GB", "GCS", "GCS15", "GDS",
    "GGT", "GMN", "GP", "GPC", "GR850", "GSG", "GTPC", "H1", "H24", "H3",
    "HAI", "HBP", "HC", "HCD", "HCG", "HD", "HDL", "HDTA", "HED", "HIG",
    "HIV", "HPP", "HR", "HSA", "HSD", "HSF", "HSMG", "HT", "HTA", "HTAP",
    "HTIC", "HTP", "HU", "HVB", "IA", "IB", "ICD", "IDM", "IE", "IIA",
    "ILI", "IM", "IPP", "IPSS", "IR", "IRA", "IRC", "IRCT", "IRM", "ISL",
    "IU", "IUF", "IUM", "IV", "IVA", "IVG", "IVP", "IVV", "JJ", "KH",
    "KHF", "KHP", "KT", "LCH", "LCR", "LCS", "LDH", "LEC", "LEU", "LI",
    "LID", "LIG", "LLE", "LLI", "LN", "LPAC", "LS", "LSD", "LSG", "LT4",
    "LTFA", "LV", "LVBP", "M10", "MAG", "MAG3", "MAL", "MAP", "MAV",
    "MCP", "MCPIPP", "MI", "MID", "MIG", "MLP", "MNICMV", "MRC", "MS", "MSG",
    "MU", "NAA", "NAD", "NASH", "NB", "NBTR", "NFS", "NGC", "NIC",
    "NORB", "NRS", "NSTEMI", "NYHA", "OAP", "OGE", "OHL", "OMC",
    "OMI", "OP", "OPN", "ORADS", "ORL", "PA", "PAC", "PACS", "PAL",
    "PBF", "PBR", "PC", "PCI", "PCR", "PCT", "PDC", "PEC", "PEIC", "PELA",
    "PET-SCAN", "PFIC2", "PFP", "PICA", "PLT", "PN", "PNA", "PNN", "PNP",
    "PR", "PS", "PSA", "PTG", "PTH", "PVVIH", "QSI", "RAC", "RCBV", "RCP",
    "RCT", "RD", "RDP", "RDV", "REZ", "RG", "RGO", "RPM", "RRS", "RV",
    "RVG", "RVU", "S1", "SAM", "SAO2", "SAS", "SB", "SBAU", "SCA",
    "SCM", "SEP", "SG", "SGJ", "SIB", "SIDA", "SJPU", "SLS", "SM", "SMG",
    "SPC", "SPD", "SRM", "SSS", "STB", "STIR", "SVP", "T10-T11", "T1N3M0",
    "T4N0M0", "TA", "TAG", "TAP", "TBC", "TC", "TCD", "TCDS", "TCG", "TDM",
    "TIRADS", "TMS", "TP", "TPO", "TR", "TSA", "TSH", "TT", "TTT", "TVJ",
    "TVP", "TVS", "UCNT", "UGD", "UH", "UI", "UPC", "UQI", "URO-TDM", "US",
    "V3", "V4", "VBIEH", "VBIH", "VBP", "VCI", "VCIA", "VCS", "VL",
    "VLD", "VLG", "VM", "VMI", "VMS", "VR", "VS", "VSH", "VSM",
]

# Removed from general list — conflicts with common French words:
#   NON / PAS  → negation particles ("non contributif", "pas de signe de")
#   SA / CE    → possessive / demonstrative adjectives
#   VA         → verb "aller" ("il va bien")
#   LU         → past participle "lire" ("rapport lu")

_ABBREV_RE = re.compile(
    r"\b(" + "|".join(re.escape(a) for a in _MEDICAL_ABBREVS) + r")\b",
    flags=re.IGNORECASE,
)

# CI = contre-indication (medical) but conflicts with "ci-joint", "ci-dessous" etc.
# Only uppercase when NOT followed by a French adverbial suffix.
_CI_RE = re.compile(
    r'\bci\b(?!\s*-\s*(?:joint|apr[eè]s|dessous|dessus|contre|inclus|g[iî]t))',
    re.IGNORECASE,
)

# NO = numéro (medical/admin) only when followed by a number or specific context.
# Avoids "no d'anomalie détectée" false positive.
_NO_RE = re.compile(r'\bno\b(?=\s*\.?\s*\d)', re.IGNORECASE)


def normalize_abbrevs(text: str) -> str:
    """Met en majuscules les abréviations médicales reconnues."""
    text = _ABBREV_RE.sub(lambda m: m.group(0).upper(), text)
    text = _CI_RE.sub('CI', text)
    text = _NO_RE.sub('NO', text)
    return text


# ──────────────────────────────────────────────────────────────────────────────
# 6. SUPPRESSION DES EN-TÊTES DE SECTION DICTÉS
# ──────────────────────────────────────────────────────────────────────────────

_SECTION_HEADER_RE = re.compile(
    r'[({]?\s*(indication|r[eé]sultat|conclusion)\s*[)}]?\s*:?\s*',
    flags=re.IGNORECASE,
)


def strip_section_headers(text: str) -> str:
    """Supprime les mots-clés de section (Indication, Résultat, Conclusion)
    dictés par le médecin et captés par Whisper dans le corps du texte."""
    return _SECTION_HEADER_RE.sub('', text).strip()


# ──────────────────────────────────────────────────────────────────────────────
# 6b. PONCTUATION DICTÉE — "à la ligne" / "deux points à la ligne"
# ──────────────────────────────────────────────────────────────────────────────
# - "à la ligne" (avec ou sans préfixe "deux points") → saut de ligne réel.
# - Whisper mishears "deux points à la ligne" as "de pananalyses" / "de panalyse"
#   etc.  Those phrases are never legitimate medical text → strip them.

# Combinaisons "ponctuation + à la ligne" — traitées AVANT le pattern générique
# pour éviter que "à la ligne" soit consommé seul et que le signe soit perdu.
_POINT_NL_RE   = re.compile(r'\s*\bpoints?\s+[àa1]\s+la\s+ligne\b', re.IGNORECASE)
_VIRGULE_NL_RE = re.compile(r'\s*\bvirgule\s+[àa1]\s+la\s+ligne\b', re.IGNORECASE)

_NEW_LINE_RE = re.compile(
    # "à la ligne" — accepte aussi "a" sans accent et "1" (Whisper mishear fréquent de "à").
    # Le \s* en tête consomme l'espace qui sépare la commande du mot précédent
    # afin qu'on n'ait pas d'espace orphelin avant le point auto-inséré.
    r'\s*(?:\bdeux\s+points?\s+)?\s*[àa1]\s+la\s+ligne',
    flags=re.IGNORECASE,
)


def _replace_newline(match: 're.Match') -> str:
    """Insère un vrai saut de ligne. Si la phrase précédente se termine par un
    caractère alphanumérique (le médecin a oublié de dire « point »), on
    rajoute automatiquement un point devant le \\n. Le nettoyage par
    _DOT_SPACE_NL_RE juste après normalise « . \\n » en « .\\n »."""
    preceding = match.string[:match.start()].rstrip()
    if preceding and preceding[-1].isalnum():
        return '. \n'
    return '\n'

# Nettoyage de l'espace résiduel quand Whisper a déjà auto-ponctué "point" → "."
# avant que la partie "à la ligne" soit convertie en \n  (". \n" → ".\n")
_DOT_SPACE_NL_RE = re.compile(r'\.\s+\n')

_WHISPER_MISHEAR_RE = re.compile(
    r'\bde\s+pan[a-z]*lyses?\b[\s,]*',
    flags=re.IGNORECASE,
)

# Whisper misheards de "à la ligne" — noms propres ou mots phonétiquement proches
_LADIGNE_RE = re.compile(
    r'\s*\b(?:la\s*digne|ladigne|adeline|adeligne|adelyn|adelina|la\s*ligne(?!\s+(?:de|du|des|en|est|les|la|le)))\b\s*',
    flags=re.IGNORECASE,
)

# "deux points" non suivi de "à la ligne" → ":"  (le médecin dicte simplement
# le séparateur entre l'intitulé d'une section et son contenu, par exemple
# « Indication deux points HTA »).
#
# La règle ne s'applique que si la suite commence par une majuscule, un
# chiffre, un saut de ligne ou la fin du texte — afin d'éviter les faux
# positifs sur des phrases du type « les deux points de cicatrice ».
# (Volontairement sans `re.IGNORECASE` : la classe de caractères de la
# lookahead doit rester strictement en majuscules.)
_COLON_CMD_RE = re.compile(
    r'\b[Dd]eux\s+[Pp]oints?\b'
    r'(?=\s*(?:[A-ZÀ-ÖØ-ÞŒ0-9]|\n|\Z))',
)


# ──────────────────────────────────────────────────────────────────────────────
# 6c. ALIAS DE SECTIONS — variantes dictées → noms canoniques
# ──────────────────────────────────────────────────────────────────────────────
# "renseignement clinique" / "renseignements cliniques" sont synonymes de
# "Indication" dans les rapports de radiologie tunisiens.

_SECTION_ALIASES: list[tuple[re.Pattern, str]] = [
    # "Renseignement(s) clinique(s)" — pattern générique qui capture toutes les
    # variantes Whisper : Renseignement, Réseignement, Enségnement, Enseignement…
    # Le mot varie mais se termine toujours par "gnement" suivi de "clinique".
    (re.compile(r'\b\w*gnements?\s+cliniques?\b\s*:?', re.IGNORECASE), 'Indication:'),
    # Technique variants (Whisper mishears / alternate dictation forms)
    (re.compile(r'\btechniques?\s+utilis[eé]e?s?\b\s*:?', re.IGNORECASE), 'Technique:'),
    (re.compile(r'\ben\s+technique\b\s*:?', re.IGNORECASE), 'Technique:'),
    (re.compile(r'\bprotocole\s+technique\b\s*:?', re.IGNORECASE), 'Technique:'),
    # Conclusion variants
    (re.compile(r'\ben\s+conclusion\b\s*:?', re.IGNORECASE), 'Conclusion:'),
    (re.compile(r'\bconclusions\b\s*:?', re.IGNORECASE), 'Conclusion:'),
    (re.compile(r'\bconclure\b\s*:?', re.IGNORECASE), 'Conclusion:'),
    (re.compile(r'\bà\s+conclure\b\s*:?', re.IGNORECASE), 'Conclusion:'),
    # Résultat variants
    (re.compile(r'\br[eé]sultats\b\s*:?', re.IGNORECASE), 'Resultat:'),
    (re.compile(r'\bconstata(?:tion|tions)\b\s*:?', re.IGNORECASE), 'Resultat:'),
    (re.compile(r'\bdescription\b\s*:?', re.IGNORECASE), 'Resultat:'),
]


def normalize_section_aliases(text: str) -> str:
    """Remplace les alias de sections par leurs noms canoniques."""
    for pattern, canonical in _SECTION_ALIASES:
        text = pattern.sub(canonical, text)
    return text


# ──────────────────────────────────────────────────────────────────────────────
# 6d. COMMANDE "EFFACE ÇA" — supprime la dernière phrase
# ──────────────────────────────────────────────────────────────────────────────
# Le médecin dit "efface ça" (ou "effacer ça", "effacez ça"…) pour annuler la
# dernière phrase dictée.  Whisper accepte aussi "ca" sans cédille.
# Exemple : "première phrase. deuxième phrase efface ça" → "première phrase."

_EFFACE_CMD_RE = re.compile(
    r'effac(?:er|ez|es|ée?|e)\s+[çcs]a\b[,.]?\s*',
    flags=re.IGNORECASE,
)


def apply_delete_commands(text: str) -> str:
    """Supprime la phrase précédant chaque occurrence de 'efface ça'."""
    while True:
        m = _EFFACE_CMD_RE.search(text)
        if not m:
            break
        before = text[:m.start()].rstrip()
        # Strip trailing sentence-end punct that Whisper may have auto-inserted
        # at the end of the sentence being deleted (e.g. "phrase deux. efface ça")
        before_no_trail = before.rstrip('.!?')
        last_boundary = max(
            (before_no_trail.rfind(c) for c in '.!?\n'),
            default=-1,
        )
        kept = text[:last_boundary + 1] if last_boundary >= 0 else ''
        rest = text[m.end():].lstrip()
        if kept and rest:
            text = kept + ' ' + rest
        else:
            text = (kept + rest).strip()
    return text


def normalize_spoken_punct(text: str) -> str:
    """Convertit les commandes de ponctuation dictées en sauts de ligne réels
    et supprime les variantes mal entendues par Whisper."""
    text = apply_delete_commands(text)
    # Combinaisons AVANT le pattern générique pour ne pas perdre la ponctuation
    text = _POINT_NL_RE.sub('.\n', text)
    text = _VIRGULE_NL_RE.sub(',\n', text)
    text = _NEW_LINE_RE.sub(_replace_newline, text)
    text = _DOT_SPACE_NL_RE.sub('.\n', text)   # ". \n" → ".\n"
    # "deux points" restant (qui n'était pas suivi de "à la ligne") → ":"
    text = _COLON_CMD_RE.sub(':', text)
    text = _WHISPER_MISHEAR_RE.sub(' ', text)
    # "Ladigne" / "la digne" → saut de ligne (mishear Whisper de "à la ligne")
    text = _LADIGNE_RE.sub('\n', text)
    return text.strip()


# ──────────────────────────────────────────────────────────────────────────────
# 7. PIPELINE COMBINÉ
# ──────────────────────────────────────────────────────────────────────────────


# ──────────────────────────────────────────────────────────────────────────────
# ASR ACCENT FIXES  (deterministic, zero-risk — only unambiguous cases)
# ──────────────────────────────────────────────────────────────────────────────

# Words that Whisper systematically mis-transcribes without accents.
# Each entry is (bare_form, correct_form) — whole-word substitution only.
_ASR_ACCENT_FIXES: list[tuple[str, str]] = [
    # Whisper phonetic misheards — common in radiology
    ("à son particularité",         "sans particularité"),
    ("à son anomalie",              "sans anomalie"),
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
    ("impresence",                  "présence"),
    ("imprésence",                  "présence"),
    ("lithesie",                    "lithiase"),
    ("lithésie",                    "lithiase"),
    ("lithiasie",                   "lithiase"),
    ("récommandée",                 "recommandée"),
    ("récommandés",                 "recommandés"),
    ("récommandé",                  "recommandé"),
    ("récommendée",                 "recommandée"),

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
    # Échographie et dérivés
    ("echographie",                 "échographie"),
    ("echographique",               "échographique"),
    ("echostructure",               "échostructure"),
    ("echogenicite",                "échogénicité"),
    ("echogene",                    "échogène"),
    ("hyperechogene",               "hyperéchogène"),
    ("hypoechogene",                "hypoéchogène"),
    ("isoechogene",                 "isoéchogène"),
    ("anechogene",                  "anéchogène"),
    # Autres termes fréquents sans accent
    ("adenomegalie",                "adénomégalie"),
    ("cholecystite",                "cholécystite"),
    ("choledoque",                  "cholédoque"),
    ("lithiase",                    "lithiase"),
    ("vesiculaire",                 "vésiculaire"),
    ("pericardique",                "péricardique"),
    ("peritoneal",                  "péritonéal"),
    ("peritoneale",                 "péritonéale"),
    ("hepatique",                   "hépatique"),
    ("pancreatique",                "pancréatique"),
    ("uretere",                     "uretère"),
    ("ureterale",                   "urétérale"),
    ("aortique",                    "aortique"),
    ("stenose",                     "sténose"),
    ("oedeme",                      "œdème"),
    ("cecite",                      "cécité"),
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
      1. Accents ASR  — corrections déterministes Whisper
      2. Dates        — avant que les noms de mois soient touchés
      3. Unités       — "mille grammes" → "mg" AVANT "mille" → 1000
      4. Unités comp. — "mg par dL" → "mg/dL"
      5. Nombres      — "cent vingt" → "120"
      6. Abréviations — irm → IRM, flair → FLAIR, t1 → T1 …
    Note: section headers (Indication/Résultat/Conclusion) are preserved
    so the frontend can parse them into separate fields.
    """
    text = normalize_spoken_punct(text)
    text = normalize_section_aliases(text)
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
