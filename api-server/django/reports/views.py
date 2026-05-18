from __future__ import annotations

import datetime as dt
import difflib
import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

from bson import ObjectId
from django.conf import settings
from django.http import FileResponse, HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt

from core.auth import CurrentUser, jwt_required
from core.mongo import get_collection, serialize_document


REPORT_CATEGORIES = {"scanner", "irm", "radiographie", "echographie"}


def _compute_accuracy(original: Optional[str], final: Optional[str]) -> Optional[float]:
    """
    Similarity ratio between the raw STT transcription and the validated content.
    Returns a float in [0, 1] or None if we can't compute.
    """
    if not original or not final:
        return None
    a = original.strip()
    b = final.strip()
    if not a or not b:
        return None
    return round(difflib.SequenceMatcher(None, a, b).ratio(), 4)


def _parse_body(request: HttpRequest) -> Dict[str, Any]:
    try:
        data = json.loads(request.body.decode("utf-8"))
        if not isinstance(data, dict):
            return {}
        return data
    except Exception:
        return {}


def _user_can_access_report(user: CurrentUser, report: Dict[str, Any]) -> bool:
    if user.role in {"admin", "adminIT"}:
        return True
    return str(report.get("doctorId")) == user.id


def _append_to_global_csv(report: Dict[str, Any], doctor: Dict[str, Any]) -> None:
    """
    Append a validated report to the global CSV archive.
    CSV path: media/exports/transcriptions_globales.csv
    Columns: id_exam | doctor_name | date | time | transcription
    """
    import csv as csvlib  # avoid clash with csv app

    media_root: Path = settings.MEDIA_ROOT
    export_dir = media_root / "exports"
    export_dir.mkdir(parents=True, exist_ok=True)
    csv_path = export_dir / "transcriptions_globales.csv"

    nom = doctor.get("nom") or ""
    prenom = doctor.get("prenom") or ""
    doctor_name = f"{prenom} {nom}".strip() or doctor.get("email", "")
    created_at = report.get("createdAt") or dt.datetime.utcnow().isoformat()
    try:
        dt_obj = dt.datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    except Exception:
        dt_obj = dt.datetime.utcnow()

    date_str = dt_obj.date().isoformat()
    time_str = dt_obj.time().strftime("%H:%M:%S")

    file_exists = csv_path.exists()
    with csv_path.open("a", newline="", encoding="utf-8-sig") as f:
        writer = csvlib.writer(f, delimiter=";")
        if not file_exists:
            writer.writerow(["id_exam", "doctor_name", "date", "time", "transcription"])

        writer.writerow(
            [
                report.get("ID_Exam", ""),
                doctor_name,
                date_str,
                time_str,
                (report.get("content") or "").replace("\n", " ").strip(),
            ]
        )


@csrf_exempt
@jwt_required(roles={"admin", "adminIT"})
def report_stats(request: HttpRequest) -> JsonResponse:
    """GET /api/reports/stats/ — aggregate counts across ALL reports (admin only)."""
    if request.method != "GET":
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)
    reports_col = get_collection("reports")
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    result = {doc["_id"]: doc["count"] for doc in reports_col.aggregate(pipeline)}
    return JsonResponse({
        "draft":     result.get("draft",     0),
        "validated": result.get("validated", 0),
        "saved":     result.get("saved",     0),
        "total":     sum(result.values()),
    })


@csrf_exempt
@jwt_required(roles={"doctor", "admin", "adminIT"})
def check_exam_id(request: HttpRequest) -> JsonResponse:
    """GET /api/reports/check-exam-id/?id=XXX — returns {"available": true/false}"""
    if request.method != "GET":
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)
    exam_id = request.GET.get("id", "").strip()
    if not exam_id:
        return JsonResponse({"detail": "Paramètre 'id' requis."}, status=400)
    reports_col = get_collection("reports")
    taken = reports_col.find_one({"ID_Exam": exam_id}) is not None
    return JsonResponse({"available": not taken})


@csrf_exempt
@jwt_required(roles={"doctor", "admin", "adminIT"})
def list_or_create_reports(request: HttpRequest) -> JsonResponse:
    reports_col = get_collection("reports")

    user: CurrentUser = request.user  # type: ignore[assignment]

    if request.method == "GET":
        if user.role == "doctor":
            # Doctors see all their own reports
            query: Dict[str, Any] = {"doctorId": user.id}
        else:
            # Admins see: all their own reports + only "saved" reports from others
            query = {
                "$or": [
                    {"doctorId": user.id},
                    {"doctorId": {"$ne": user.id}, "status": "saved"},
                ]
            }

        docs: List[Dict[str, Any]] = list(reports_col.find(query).sort("createdAt", -1))
        serialized = [serialize_document(d) for d in docs]

        # For admin: also fetch "my reports" flag and doctor name
        if user.role == "admin":
            users_col = get_collection("users")
            doctor_cache: Dict[str, str] = {}
            for r in serialized:
                did = r.get("doctorId", "")
                if did not in doctor_cache:
                    try:
                        doc = users_col.find_one({"_id": ObjectId(did)}, {"nom": 1, "prenom": 1, "email": 1})
                        if doc:
                            nom = doc.get("nom") or ""
                            prenom = doc.get("prenom") or ""
                            doctor_cache[did] = f"{prenom} {nom}".strip() or doc.get("email", did)
                        else:
                            doctor_cache[did] = did
                    except Exception:
                        doctor_cache[did] = did
                r["doctorName"] = doctor_cache[did]
                r["isOwn"] = did == user.id

        return JsonResponse({"results": serialized}, safe=False)

    if request.method == "POST":
        import re
        data = _parse_body(request)
        exam_id = data.get("ID_Exam")
        content = data.get("content") or ""
        status = data.get("status") or "draft"
        category = (data.get("category") or "").strip().lower()

        if not exam_id or not content:
            return JsonResponse({"detail": "L'identifiant d'examen et le contenu sont requis."}, status=400)

        if not category:
            return JsonResponse({"detail": "La catégorie est requise."}, status=400)
        if category not in REPORT_CATEGORIES:
            return JsonResponse({"detail": "Catégorie invalide."}, status=400)

        exam_id_str = str(exam_id)
        if not re.fullmatch(r"\d{5,}", exam_id_str):
            return JsonResponse({"detail": "L'identifiant d'examen doit être composé de chiffres commençant par l'année (ex : 20260001)."}, status=400)

        utcnow = dt.datetime.utcnow()
        current_year = utcnow.year
        current_month = utcnow.month
        year_part = int(exam_id_str[:4])
        allowed_years = {current_year}
        if current_month == 1:
            allowed_years.add(current_year - 1)

        if year_part not in allowed_years:
            if current_month == 1:
                return JsonResponse(
                    {"detail": f"L'identifiant doit commencer par {current_year} ou {current_year - 1} (exception janvier)."},
                    status=400,
                )
            return JsonResponse(
                {"detail": f"L'identifiant doit commencer par {current_year}."},
                status=400,
            )

        if reports_col.find_one({"ID_Exam": exam_id_str}):
            return JsonResponse({"detail": "Cet identifiant d'examen existe déjà. Il doit être unique."}, status=400)

        if status not in {"draft", "validated", "saved"}:
            return JsonResponse({"detail": "Statut invalide."}, status=400)

        audio_id = data.get("audioId") or None
        original_content = data.get("originalContent") or None

        now = utcnow.isoformat()
        doc = {
            "doctorId": user.id,
            "ID_Exam": exam_id_str,
            "content": content,
            "originalContent": original_content,
            "status": status,
            "category": category,
            "audioId": audio_id,
            "createdAt": now,
            "updatedAt": now,
        }
        # If the report is created directly as "validated", compute accuracy now
        if status == "validated":
            acc = _compute_accuracy(original_content, content)
            if acc is not None:
                doc["accuracy"] = acc
        inserted = reports_col.insert_one(doc)
        created = reports_col.find_one({"_id": inserted.inserted_id})

        # Link audio → report
        if audio_id:
            try:
                audios_col = get_collection("audios")
                audios_col.update_one(
                    {"_id": ObjectId(audio_id)},
                    {"$set": {"reportId": str(inserted.inserted_id)}}
                )
            except Exception:
                pass

        # If report is saved (final archival), push to CSV.
        if created and created.get("status") == "saved":
            users_col = get_collection("users")
            doctor_doc = users_col.find_one({"_id": ObjectId(user.id)})
            if doctor_doc:
                _append_to_global_csv(created, doctor_doc)

        return JsonResponse(serialize_document(created), status=201)

    return JsonResponse({"detail": "Méthode non autorisée."}, status=405)


@csrf_exempt
@jwt_required(roles={"doctor", "admin", "adminIT"})
def get_or_update_report(request: HttpRequest, report_id: str):
    reports_col = get_collection("reports")
    user: CurrentUser = request.user  # type: ignore[assignment]

    try:
        oid = ObjectId(report_id)
    except Exception:
        return JsonResponse({"detail": "Identifiant de rapport invalide."}, status=400)

    report = reports_col.find_one({"_id": oid})
    if not report:
        return JsonResponse({"detail": "Rapport introuvable."}, status=404)

    if not _user_can_access_report(user, report):
        return JsonResponse({"detail": "Accès refusé."}, status=403)

    if request.method == "GET":
        return JsonResponse(serialize_document(report))

    if request.method == "PUT":
        data = _parse_body(request)
        content = data.get("content", report.get("content", ""))
        new_status = data.get("status", report.get("status", "draft"))
        old_status = report.get("status", "draft")

        if new_status not in {"draft", "validated", "saved"}:
            return JsonResponse({"detail": "Statut invalide."}, status=400)

        update_doc: Dict[str, Any] = {
            "content": content,
            "status": new_status,
            "updatedAt": dt.datetime.utcnow().isoformat(),
        }

        # Back-fill originalContent if it was missing and caller provides it.
        if not report.get("originalContent") and data.get("originalContent"):
            update_doc["originalContent"] = data["originalContent"]

        if "category" in data:
            new_category = (data.get("category") or "").strip().lower()
            if new_category and new_category not in REPORT_CATEGORIES:
                return JsonResponse({"detail": "Catégorie invalide."}, status=400)
            if new_category:
                update_doc["category"] = new_category

        # Compute accuracy when transitioning into "validated" for the first time
        # or when content changes while already validated.
        if new_status == "validated" and (old_status != "validated" or content != report.get("content")):
            original = update_doc.get("originalContent") or report.get("originalContent")
            acc = _compute_accuracy(original, content)
            if acc is not None:
                update_doc["accuracy"] = acc

        reports_col.update_one({"_id": oid}, {"$set": update_doc})
        updated = reports_col.find_one({"_id": oid})

        # When report is saved (final archival), append to CSV.
        if updated and updated.get("status") == "saved":
            users_col = get_collection("users")
            doctor_doc = users_col.find_one({"_id": ObjectId(updated["doctorId"])})
            if doctor_doc:
                _append_to_global_csv(updated, doctor_doc)

        return JsonResponse(serialize_document(updated))

    if request.method == "DELETE":
        # Unlink any associated audio so it reappears in the pending queue rather
        # than pointing to a now-deleted report.
        audio_id = report.get("audioId")
        if audio_id:
            try:
                audios_col = get_collection("audios")
                audios_col.update_one(
                    {"_id": ObjectId(audio_id)},
                    {"$unset": {"reportId": ""}},
                )
            except Exception:
                pass
        reports_col.delete_one({"_id": oid})
        return JsonResponse({"detail": "Supprimé."}, status=200)

    return JsonResponse({"detail": "Méthode non autorisée."}, status=405)


# ──────────────────────────────────────────────────────────────────────────────
# Analyse par phrase via Ollama mistral — prompt radiologie neurovasculaire
# ──────────────────────────────────────────────────────────────────────────────

_ANALYSE_URL   = "http://localhost:11434/api/chat"
_ANALYSE_MODEL = "mistral:latest"
_ANALYSE_PROMPT = (
    "Tu es un expert en radiologie neurovasculaire francophone.\n"
    "Analyse la phrase et détecte UNIQUEMENT :\n"
    "- fautes d'orthographe médicale (ex: \"athéromateux\" mal orthographié)\n"
    "- termes anatomiques déformés par la transcription vocale (ex: \"vis\" → \"Willis\", \"deff\" → \"diffusion\")\n"
    "- mots incohérents issus d'une transcription vocale automatique\n"
    "- séquences IRM mal écrites (FLAIR, T1, T2, DWI, 3D, écho de gradient...)\n\n"
    "RÈGLES ABSOLUES — violations = réponse invalide :\n"
    "1. Ne JAMAIS remplacer un mot français par un mot anglais ou latin.\n"
    "   Exemples INTERDITS : artères→arteries, spectres→spectra, diffus→distributed, axes→axis, artériels→arterial, calcique→calcified\n"
    "2. Toutes les suggestions doivent être en FRANÇAIS médical uniquement.\n"
    "3. Ne corriger que les vraies fautes de frappe ou erreurs vocales, pas les termes corrects.\n"
    "4. encéphale ≠ cerveau, artères ≠ vaisseaux (ne pas remplacer par synonyme moins précis).\n"
    "5. Si le mot est correct en français médical, NE PAS le signaler.\n\n"
    "Retourne UNIQUEMENT ce JSON, sans markdown, sans explication :\n"
    "{\"corrections\": [{\"mot_original\": \"...\", \"suggestion\": \"...\", \"position\": 0}]}\n"
    "Si aucune erreur : {\"corrections\": []}"
)


def _call_ollama_analyse(sentence: str) -> List[Dict[str, Any]]:
    """Appelle Ollama avec le prompt radiologie et retourne les corrections validées."""
    import urllib.request as _urllib

    payload = json.dumps({
        "model": _ANALYSE_MODEL,
        "messages": [
            {"role": "system", "content": _ANALYSE_PROMPT},
            {"role": "user",   "content": f"Phrase : {sentence}"},
        ],
        "stream": False,
        "options": {"temperature": 0.0, "seed": 0},
    }).encode("utf-8")

    req = _urllib.Request(
        _ANALYSE_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    with _urllib.urlopen(req, timeout=60) as resp:
        raw = json.loads(resp.read()).get("message", {}).get("content", "").strip()

    if not raw:
        return []

    # Parse JSON avec fallback regex si le modèle ajoute du texte autour
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r'\{.*\}', raw, re.DOTALL)
        parsed = json.loads(m.group()) if m else {}

    # Caractères accentués français — présents dans les termes médicaux français
    _FR_ACCENTS = re.compile(r'[àâäéèêëîïôùûüçæœÀÂÄÉÈÊËÎÏÔÙÛÜÇÆŒ]')
    # Suffixes anglais typiques dans le contexte médical
    _EN_SUFFIXES = re.compile(
        r'(eries|arteries|eries|spectra|spectrums|'
        r'distributed|arterial|supraaortic|calcified|'
        r'measured|circulatory|vertebral|axis|'
        r'atheromatous|axis)$',
        re.IGNORECASE,
    )

    corrections = []
    words = sentence.split()
    for c in parsed.get("corrections", []):
        original   = (c.get("mot_original") or "").strip()
        suggestion = (c.get("suggestion")  or "").strip()
        if not original or not suggestion or original == suggestion:
            continue
        orig_alpha = re.sub(r'[^\w]', '', original,   flags=re.UNICODE)
        corr_alpha = re.sub(r'[^\w]', '', suggestion,  flags=re.UNICODE)
        # Rejeter les anagrammes purs (IRM → MRI)
        if sorted(orig_alpha.lower()) == sorted(corr_alpha.lower()):
            continue
        # Rejeter si le mot original a des accents français mais la suggestion n'en a pas
        # → traduction anglaise déguisée en correction
        if _FR_ACCENTS.search(original) and not _FR_ACCENTS.search(suggestion):
            continue
        # Rejeter explicitement les suffixes anglais courants
        if _EN_SUFFIXES.search(suggestion):
            continue
        # Trouver la position du mot dans la phrase
        position = c.get("position", 0)
        if not isinstance(position, int) or not (0 <= position < len(words)):
            position = 0
            for i, w in enumerate(words):
                clean_w = re.sub(r'^[^\w]+|[^\w]+$', '', w, flags=re.UNICODE)
                if clean_w.lower() == original.lower():
                    position = i
                    break
        corrections.append({
            "mot_original": original,
            "suggestion":   suggestion,
            "position":     int(position),
        })
    return corrections


@csrf_exempt
@jwt_required(roles={"doctor", "admin", "adminIT"})
def analyse_report(request: HttpRequest) -> JsonResponse:
    """POST /api/analyse/ — correction médicale par phrase via Ollama."""
    if request.method != "POST":
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)

    data = _parse_body(request)
    text = (data.get("text") or "").strip()
    if not text:
        return JsonResponse({"detail": "Le champ 'text' est requis."}, status=400)

    # Normaliser : remplacer sauts de ligne et espaces multiples par un seul espace
    text = re.sub(r'\s+', ' ', text).strip()

    raw_parts = re.split(r'(?<=[.!?])\s+', text)
    sentences = [s.strip() for s in raw_parts if s.strip()]

    result_sentences = []
    for idx, sentence in enumerate(sentences):
        corrections: List[Dict[str, Any]] = []
        try:
            corrections = _call_ollama_analyse(sentence)
        except Exception as e:
            print(f"[warn] Ollama analyse phrase {idx}: {e}", file=sys.stderr)
        result_sentences.append({
            "sentence_index": idx,
            "sentence":       sentence,
            "corrections":    corrections,
        })

    return JsonResponse({"sentences": result_sentences})

