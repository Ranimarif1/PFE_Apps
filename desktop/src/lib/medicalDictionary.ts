/**
 * French Medical Dictionary — Radiology focus
 * Generated from "termes médicaux dragon.txt" + standard French medical vocabulary.
 * Rebuild with: node desktop/scripts/buildDictionary.mjs
 */

export const MEDICAL_TERMS: readonly string[] = [
  // ── Radiologie & imagerie ──
  "radiographie", "radioscopie", "radiologie", "radiologue", "radiodiagnostic",
  "tomodensitométrie", "tomographie", "scanner", "scanographie",
  "échographie", "échographe", "échographiste",
  "imagerie", "scintigraphie", "mammographie", "ostéodensitométrie",
  "angiographie", "artériographie", "phlébographie", "urographie",
  "cholangiopancréatographie", "cholangiopancréatographie rétrograde",
  "IRM", "IRM cérébrale", "IRM médullaire", "IRM abdominale",
  "fluoroscopie", "densitométrie", "PET-scan", "TEP-scan",
  "SPECT", "coloscopie virtuelle", "coronarographie",
  "myélographie", "sialographie", "dacryocystographie",

  // ── Anatomie générale ──
  "abdomen", "thorax", "crâne", "bassin", "colonne vertébrale",
  "vertèbre", "vertèbres", "cervicale", "cervicales", "thoracique", "thoraciques",
  "lombaire", "lombaires", "sacrum", "coccyx", "pelvis",
  "côte", "côtes", "sternum", "clavicule", "omoplate", "scapula",
  "humérus", "radius", "ulna", "cubitus", "carpe", "métacarpe",
  "phalange", "phalanges", "fémur", "tibia", "fibula", "péroné",
  "rotule", "patella", "tarse", "métatarse",
  "crâne", "mandibule", "maxillaire", "orbite", "sinus",
  "sinus maxillaire", "sinus frontal", "sinus ethmoïdal", "sinus sphénoïdal",

  // ── Organes ──
  "poumon", "poumons", "bronche", "bronches", "trachée", "plèvre",
  "cœur", "aorte", "artère", "artères", "veine", "veines", "capillaire",
  "péricarde", "myocarde", "endocarde", "valvule",
  "foie", "vésicule biliaire", "voie biliaire", "canal cholédoque",
  "pancréas", "rate", "surrénale", "surrénales",
  "rein", "reins", "uretère", "urètre", "vessie", "prostate",
  "utérus", "ovaire", "ovaires", "trompe", "trompes", "vagin",
  "estomac", "duodénum", "jéjunum", "iléon", "côlon", "rectum", "anus",
  "appendice", "mésentère", "péritoine",
  "cerveau", "cervelet", "tronc cérébral", "moelle épinière",
  "méninges", "dure-mère", "pie-mère", "arachnoïde",
  "thyroïde", "parathyroïde", "hypophyse", "épiphyse",
  "ganglion", "ganglions", "lymphatique", "lymphatiques",
  "muscle", "muscles", "tendon", "tendons", "ligament", "ligaments",

  // ── Pathologies générales ──
  "pathologie", "lésion", "lésions", "anomalie", "anomalies",
  "tumeur", "tumeurs", "néoplasme", "néoplasie", "cancer", "carcinome",
  "adénocarcinome", "sarcome", "mélanome", "lymphome", "myélome",
  "métastase", "métastases", "récidive", "envahissement",
  "infection", "inflammation", "nécrose", "ischémie", "infarctus",
  "œdème", "épanchement", "épanchement pleural", "épanchement péricardique",
  "ascite", "hémothorax", "pneumothorax", "atélectasie",
  "fracture", "fractures", "luxation", "entorse", "contusion",
  "hématome", "hémorragie", "thrombose", "embolie", "anévrisme",
  "sténose", "occlusion", "obstruction", "compression",
  "hernie", "hernie discale", "herniation",
  "kyste", "kystes", "abcès", "granulome", "fibrose",
  "calcification", "calcifications", "lithiase", "lithiases",
  "nodule", "nodules", "masse", "masses", "opacité", "opacités",
  "atrophie", "hypertrophie", "hyperplasie", "dysplasie",
  "malformation", "malformations", "agénésie", "aplasie",

  // ── Radiologie pulmonaire ──
  "consolidation", "condensation", "infiltrat", "infiltrats",
  "caverne", "cavitation", "bullage", "emphysème", "bronchectasie",
  "pneumonie", "bronchopneumonie", "pleurésie", "mésothéliome",
  "adénopathie", "adénopathies", "adénopathie hilaire", "adénopathie médiastinale",
  "médiastin", "hile", "hiles", "scissure", "scissures",
  "nodule pulmonaire", "masse pulmonaire", "image en verre dépoli",
  "bande atélectasique", "syndrome interstitiel", "syndrome alvéolaire",

  // ── Pathologies cardiovasculaires ──
  "cardiomégalie", "péricardite", "myocardite", "endocardite",
  "insuffisance cardiaque", "valvulopathie", "cardiopathie",
  "athérosclérose", "artériosclérose", "athérome", "plaque d'athérome",
  "dissection aortique", "coarctation", "malformation vasculaire",
  "thrombophlébite", "phlébothrombose",

  // ── Pathologies digestives ──
  "cirrhose", "hépatite", "stéatose", "hépatomégalie", "splénomégalie",
  "appendicite", "péritonite", "diverticulose", "diverticulite",
  "iléus", "volvulus", "intussusception", "invagination",
  "cholécystite", "cholangite", "pancréatite", "gastrite", "ulcère",

  // ── Pathologies neurologiques ──
  "accident vasculaire cérébral", "AVC", "ischémie cérébrale",
  "hémorragie méningée", "hématome sous-dural", "hématome épidural",
  "hydrocéphalie", "ventriculomégalie", "leucoencéphalopathie",
  "sclérose en plaques", "démyélinisation", "encéphalite", "méningite",
  "tumeur cérébrale", "glioblastome", "méningiome", "neurinome",

  // ── Pathologies ostéoarticulaires ──
  "ostéoporose", "ostéopénie", "ostéomalacie", "ostéomyélite",
  "arthrose", "arthrite", "polyarthrite", "spondylarthrite",
  "discopathie", "spondylose", "spondylolisthésis", "sténose canalaire",
  "nécrose osseuse", "tumeur osseuse", "ostéome", "chondrome",

  // ── Descripteurs d'imagerie ──
  "hyperdense", "hypodense", "isodense", "hypointense", "hyperintense",
  "homogène", "hétérogène", "bien limité", "mal limité", "spiculé",
  "lobulé", "régulier", "irrégulier", "kystique", "solide",
  "rehaussement", "prise de contraste", "rehaussement hétérogène",
  "calcifié", "nécrotique", "hémorragique", "vasculaire",
  "centimètre", "millimètre", "centimètres", "millimètres",
  "diamètre", "dimensions", "mesure", "mesures", "taille",
  "droit", "droite", "gauche", "supérieur", "supérieure",
  "inférieur", "inférieure", "antérieur", "antérieure",
  "postérieur", "postérieure", "latéral", "latérale",
  "médial", "médiale", "proximal", "proximale", "distal", "distale",
  "bilatéral", "bilatérale", "unilatéral", "unilatérale",
  "controlatéral", "homolatéral", "ipsilatéral",

  // ── Termes de rapport ──
  "indication", "résultat", "conclusion", "technique",
  "comparaison", "antérieur", "bilan", "examen",
  "normal", "normale", "normaux", "normales",
  "absence", "présence", "visualisé", "visualisée",
  "suspect", "suspecte", "compatible", "évocateur",
  "recommandation", "surveillance", "contrôle", "suivi",
  "corrélation", "clinique", "cliniques", "paraclinique",
  "diagnostic différentiel", "diagnostic", "diagnostic de certitude",
  "biopsie", "prélèvement", "ponction", "aspiration",
  "traitement", "chirurgie", "chimiothérapie", "radiothérapie",

  // ── Produit de contraste ──
  "produit de contraste", "iode", "iodé", "gadolinium",
  "injection", "intraveineuse", "sans injection", "après injection",
  "réaction allergique", "contre-indication",

  // ── Mots courants français ──
  "le", "la", "les", "un", "une", "des", "de", "du", "et", "en",
  "à", "au", "aux", "par", "pour", "avec", "sans", "sur", "sous",
  "dans", "entre", "vers", "après", "avant", "depuis", "pendant",
  "qui", "que", "dont", "où", "quand", "comment", "comme",
  "ce", "cette", "ces", "mon", "ma", "mes", "son", "sa", "ses",
  "pas", "plus", "très", "bien", "tout", "tous", "toute", "toutes",
  "est", "sont", "était", "ont", "a", "être", "avoir",
  "il", "elle", "ils", "elles", "on", "nous", "vous",
  "ne", "non", "ni", "si", "mais", "ou", "donc", "car",
  "ainsi", "cependant", "notamment", "notamment", "surtout",
  "environ", "environ", "environ", "environ",
];

/** O(1) lookup set — built once at module load */
export const DICTIONARY_SET: ReadonlySet<string> = new Set(
  MEDICAL_TERMS.map(t => t.toLowerCase())
);

/** Normalized form (no accents) for fuzzy matching */
export const NORMALIZED_SET: ReadonlySet<string> = new Set(
  MEDICAL_TERMS.map(t => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
);
