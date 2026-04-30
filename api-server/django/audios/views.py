from __future__ import annotations

import datetime as dt
import uuid
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt

from core.auth import CurrentUser, jwt_required
from core.mongo import get_collection, serialize_document


def _audios_dir() -> Path:
    d = settings.MEDIA_ROOT / "audios"
    d.mkdir(parents=True, exist_ok=True)
    return d


@csrf_exempt
@jwt_required(roles={"doctor", "admin", "adminIT"})
def list_or_upload(request: HttpRequest) -> JsonResponse:
    col = get_collection("audios")
    user: CurrentUser = request.user  # type: ignore[assignment]

    if request.method == "GET":
        docs = list(col.find({"doctorId": user.id}).sort("createdAt", -1))
        return JsonResponse({"results": [serialize_document(d) for d in docs]}, safe=False)

    if request.method == "POST":
        audio_file = request.FILES.get("audio")
        exam_id    = request.POST.get("examId", "").strip()
        duration   = request.POST.get("duration", "0")

        if not audio_file or not exam_id:
            return JsonResponse({"detail": "Le fichier audio et l'identifiant d'examen sont requis."}, status=400)

        ext      = Path(audio_file.name).suffix or ".webm"
        filename = f"{exam_id}_{uuid.uuid4().hex}{ext}"
        filepath = _audios_dir() / filename

        with open(filepath, "wb") as f:
            for chunk in audio_file.chunks():
                f.write(chunk)

        now = dt.datetime.utcnow().isoformat()
        doc = {
            "doctorId":  user.id,
            "examId":    exam_id,
            "filename":  filename,
            "mimeType":  audio_file.content_type or "audio/webm",
            "size":      audio_file.size,
            "duration":  int(float(duration)),
            "createdAt": now,
        }
        inserted = col.insert_one(doc)
        saved    = col.find_one({"_id": inserted.inserted_id})
        return JsonResponse(serialize_document(saved), status=201)

    return JsonResponse({"detail": "Méthode non autorisée."}, status=405)


@csrf_exempt
@jwt_required(roles={"adminIT"})
def training_dataset(request: HttpRequest) -> JsonResponse:
    """GET /api/audios/training/ — Audio|Text pairs for model retraining (adminIT only)."""
    if request.method != "GET":
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)

    from bson import ObjectId as ObjId

    audios_col  = get_collection("audios")
    reports_col = get_collection("reports")
    users_col   = get_collection("users")

    # All audios that have a linked report
    audio_docs = list(audios_col.find({"reportId": {"$exists": True, "$ne": None}}))

    results = []
    for audio in audio_docs:
        report_id = audio.get("reportId")
        if not report_id:
            continue
        try:
            report = reports_col.find_one({"_id": ObjId(report_id)})
        except Exception:
            continue
        if not report:
            continue

        # Fetch doctor name
        doctor_id = report.get("doctorId", "")
        doctor_name = ""
        try:
            doc = users_col.find_one({"_id": ObjId(doctor_id)}, {"nom": 1, "prenom": 1})
            if doc:
                doctor_name = f"{doc.get('prenom', '')} {doc.get('nom', '')}".strip()
        except Exception:
            pass

        results.append({
            "audioId":    str(audio["_id"]),
            "reportId":   report_id,
            "examId":     audio.get("examId", ""),
            "doctorName": doctor_name,
            "duration":   audio.get("duration", 0),
            "mimeType":   audio.get("mimeType", "audio/webm"),
            "createdAt":  audio.get("createdAt", ""),
            "status":     report.get("status", ""),
            "text":       report.get("content", ""),
        })

    return JsonResponse({"results": results}, safe=False)


@csrf_exempt
@jwt_required(roles={"adminIT"})
def training_download(request: HttpRequest):
    """
    GET /api/audios/training/download/?status=all|saved
    Streams a ZIP containing audio files + transcription texts + dataset.csv.
    """
    import csv as csvlib
    import io
    import zipfile

    from bson import ObjectId as ObjId
    from django.http import StreamingHttpResponse

    if request.method != "GET":
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)

    status_filter = request.GET.get("status", "all")  # "all" or "saved"

    # Optional date range — both bounds inclusive, ISO-8601 (YYYY-MM-DD).
    def _parse(value: str):
        value = (value or "").strip()
        if not value:
            return None
        try:
            return dt.date.fromisoformat(value)
        except ValueError:
            return None

    start_date = _parse(request.GET.get("start", ""))
    end_date   = _parse(request.GET.get("end", ""))
    if start_date and end_date and start_date > end_date:
        return JsonResponse({"detail": "start must be before end."}, status=400)

    audios_col  = get_collection("audios")
    reports_col = get_collection("reports")
    users_col   = get_collection("users")

    audio_query: dict = {"reportId": {"$exists": True, "$ne": None}}
    if start_date or end_date:
        created_filter: dict = {}
        if start_date:
            created_filter["$gte"] = dt.datetime.combine(start_date, dt.time.min).isoformat()
        if end_date:
            created_filter["$lte"] = dt.datetime.combine(end_date, dt.time.max).isoformat()
        audio_query["createdAt"] = created_filter

    audio_docs = list(audios_col.find(audio_query))

    # Build pairs
    pairs = []
    for audio in audio_docs:
        report_id = audio.get("reportId")
        if not report_id:
            continue
        try:
            report = reports_col.find_one({"_id": ObjId(report_id)})
        except Exception:
            continue
        if not report:
            continue
        if status_filter == "saved" and report.get("status") != "saved":
            continue

        doctor_name = ""
        try:
            doc = users_col.find_one({"_id": ObjId(report.get("doctorId", ""))}, {"nom": 1, "prenom": 1})
            if doc:
                doctor_name = f"{doc.get('prenom', '')} {doc.get('nom', '')}".strip()
        except Exception:
            pass

        pairs.append({
            "audio":       audio,
            "report":      report,
            "doctor_name": doctor_name,
        })

    # Build ZIP in memory
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        # dataset.csv
        csv_buf = io.StringIO()
        writer  = csvlib.writer(csv_buf, delimiter=";")
        writer.writerow(["exam_id", "doctor", "date", "duration_s", "status", "audio_file", "text_file", "transcription"])
        for p in pairs:
            audio  = p["audio"]
            report = p["report"]
            exam   = audio.get("examId", str(audio["_id"]))
            ext    = Path(audio.get("filename", "audio.webm")).suffix or ".webm"
            writer.writerow([
                exam,
                p["doctor_name"],
                audio.get("createdAt", "")[:10],
                audio.get("duration", 0),
                report.get("status", ""),
                f"{exam}{ext}",
                f"{exam}.txt",
                (report.get("content") or "").replace("\n", " ").strip(),
            ])
        zf.writestr("dataset.csv", "\uFEFF" + csv_buf.getvalue())

        # Audio + text files
        for p in pairs:
            audio  = p["audio"]
            report = p["report"]
            exam   = audio.get("examId", str(audio["_id"]))
            ext    = Path(audio.get("filename", "audio.webm")).suffix or ".webm"
            audio_path = _audios_dir() / audio.get("filename", "")
            if audio_path.exists():
                zf.write(audio_path, f"{exam}{ext}")
            # Text file
            zf.writestr(f"{exam}.txt", report.get("content", ""))

    buf.seek(0)
    label    = "enregistres" if status_filter == "saved" else "tous"
    if start_date or end_date:
        s = start_date.strftime("%Y%m%d") if start_date else "debut"
        e = end_date.strftime("%Y%m%d") if end_date else "fin"
        filename = f"dataset_audio_texte_{label}_{s}_{e}.zip"
    else:
        filename = f"dataset_audio_texte_{label}_{dt.datetime.utcnow().strftime('%Y%m%d')}.zip"

    response = StreamingHttpResponse(buf, content_type="application/zip")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


@csrf_exempt
@jwt_required(roles={"doctor", "admin", "adminIT"})
def audio_detail(request: HttpRequest, audio_id: str) -> JsonResponse | FileResponse:
    from bson import ObjectId
    col  = get_collection("audios")
    user: CurrentUser = request.user  # type: ignore[assignment]

    try:
        oid = ObjectId(audio_id)
    except Exception:
        return JsonResponse({"detail": "Identifiant invalide."}, status=400)

    doc = col.find_one({"_id": oid})
    if not doc:
        return JsonResponse({"detail": "Audio introuvable."}, status=404)
    if doc.get("doctorId") != user.id and user.role not in {"admin", "adminIT"}:
        return JsonResponse({"detail": "Accès refusé."}, status=403)

    if request.method == "GET":
        filepath = _audios_dir() / doc["filename"]
        if not filepath.exists():
            return JsonResponse({"detail": "Fichier audio introuvable."}, status=404)
        return FileResponse(open(filepath, "rb"), content_type=doc.get("mimeType", "audio/webm"))

    if request.method == "DELETE":
        filepath = _audios_dir() / doc["filename"]
        try:
            filepath.unlink(missing_ok=True)
        except Exception:
            pass
        col.delete_one({"_id": oid})
        return JsonResponse({"detail": "Supprimé."})

    return JsonResponse({"detail": "Méthode non autorisée."}, status=405)
