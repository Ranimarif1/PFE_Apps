from __future__ import annotations

import datetime as dt
import difflib
import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from bson import ObjectId
from django.conf import settings
from django.http import FileResponse, HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt

from core.auth import CurrentUser, jwt_required
from core.mongo import get_collection, serialize_document


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
        return JsonResponse({"detail": "Method not allowed."}, status=405)
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
        return JsonResponse({"detail": "Method not allowed."}, status=405)
    exam_id = request.GET.get("id", "").strip()
    if not exam_id:
        return JsonResponse({"detail": "id param required."}, status=400)
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

        if not exam_id or not content:
            return JsonResponse({"detail": "ID_Exam and content are required."}, status=400)

        exam_id_str = str(exam_id)
        if not re.fullmatch(r"\d{5,}", exam_id_str):
            return JsonResponse({"detail": "ID_Exam must be digits starting with the 4-digit year (e.g. 20260001)."}, status=400)

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
                    {"detail": f"ID_Exam must start with {current_year} or {current_year - 1} (January exception)."},
                    status=400,
                )
            return JsonResponse(
                {"detail": f"ID_Exam must start with {current_year}."},
                status=400,
            )

        if reports_col.find_one({"ID_Exam": exam_id_str}):
            return JsonResponse({"detail": "ID_Exam already exists. It must be unique."}, status=400)

        if status not in {"draft", "validated", "saved"}:
            return JsonResponse({"detail": "Invalid status."}, status=400)

        audio_id = data.get("audioId") or None
        original_content = data.get("originalContent") or None

        now = utcnow.isoformat()
        doc = {
            "doctorId": user.id,
            "ID_Exam": exam_id_str,
            "content": content,
            "originalContent": original_content,
            "status": status,
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

    return JsonResponse({"detail": "Method not allowed."}, status=405)


@csrf_exempt
@jwt_required(roles={"doctor", "admin", "adminIT"})
def get_or_update_report(request: HttpRequest, report_id: str):
    reports_col = get_collection("reports")
    user: CurrentUser = request.user  # type: ignore[assignment]

    try:
        oid = ObjectId(report_id)
    except Exception:
        return JsonResponse({"detail": "Invalid report id."}, status=400)

    report = reports_col.find_one({"_id": oid})
    if not report:
        return JsonResponse({"detail": "Report not found."}, status=404)

    if not _user_can_access_report(user, report):
        return JsonResponse({"detail": "Permission denied."}, status=403)

    if request.method == "GET":
        return JsonResponse(serialize_document(report))

    if request.method == "PUT":
        data = _parse_body(request)
        content = data.get("content", report.get("content", ""))
        new_status = data.get("status", report.get("status", "draft"))
        old_status = report.get("status", "draft")

        if new_status not in {"draft", "validated", "saved"}:
            return JsonResponse({"detail": "Invalid status."}, status=400)

        update_doc: Dict[str, Any] = {
            "content": content,
            "status": new_status,
            "updatedAt": dt.datetime.utcnow().isoformat(),
        }

        # Back-fill originalContent if it was missing and caller provides it.
        if not report.get("originalContent") and data.get("originalContent"):
            update_doc["originalContent"] = data["originalContent"]

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

    return JsonResponse({"detail": "Method not allowed."}, status=405)

