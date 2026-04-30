from __future__ import annotations

import csv as csvlib
import datetime as dt
import io
from pathlib import Path
from typing import Optional

from bson import ObjectId
from django.conf import settings
from django.http import FileResponse, HttpRequest, HttpResponse, JsonResponse

from core.auth import jwt_required
from core.mongo import get_collection


def _parse_date(value: str) -> Optional[dt.date]:
    value = (value or "").strip()
    if not value:
        return None
    try:
        return dt.date.fromisoformat(value)
    except ValueError:
        return None


def _build_filtered_csv(start: dt.date, end: dt.date) -> bytes:
    """Generate CSV on the fly from MongoDB for reports saved in [start, end]."""
    reports_col = get_collection("reports")
    users_col = get_collection("users")

    # createdAt is stored as ISO string; lexical range filtering works for ISO-8601.
    start_iso = dt.datetime.combine(start, dt.time.min).isoformat()
    end_iso = dt.datetime.combine(end, dt.time.max).isoformat()

    cursor = reports_col.find({
        "status": "saved",
        "createdAt": {"$gte": start_iso, "$lte": end_iso},
    }).sort("createdAt", 1)

    buf = io.StringIO()
    buf.write("﻿")  # UTF-8 BOM for Excel compatibility
    writer = csvlib.writer(buf, delimiter=";")
    writer.writerow(["id_exam", "doctor_name", "date", "time", "transcription"])

    for report in cursor:
        doctor_name = ""
        try:
            doctor = users_col.find_one(
                {"_id": ObjectId(report.get("doctorId", ""))},
                {"nom": 1, "prenom": 1, "email": 1},
            )
            if doctor:
                doctor_name = (
                    f"{doctor.get('prenom', '')} {doctor.get('nom', '')}".strip()
                    or doctor.get("email", "")
                )
        except Exception:
            pass

        created_at = report.get("createdAt") or ""
        try:
            dt_obj = dt.datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        except Exception:
            dt_obj = dt.datetime.utcnow()

        writer.writerow([
            report.get("ID_Exam", ""),
            doctor_name,
            dt_obj.date().isoformat(),
            dt_obj.time().strftime("%H:%M:%S"),
            (report.get("content") or "").replace("\n", " ").strip(),
        ])

    return buf.getvalue().encode("utf-8")


@jwt_required(roles={"adminIT"})
def download_global_csv(request: HttpRequest):
    start = _parse_date(request.GET.get("start", ""))
    end = _parse_date(request.GET.get("end", ""))

    # No date filter → stream the pre-built archive (fast path, preserves history).
    if not start and not end:
        media_root: Path = settings.MEDIA_ROOT
        csv_path = media_root / "exports" / "transcriptions_globales.csv"
        if not csv_path.exists():
            return JsonResponse({"detail": "CSV archive not found."}, status=404)
        return FileResponse(
            open(csv_path, "rb"),
            as_attachment=True,
            filename="transcriptions_globales.csv",
        )

    # Default missing bound to a wide-open range.
    if not start:
        start = dt.date(1970, 1, 1)
    if not end:
        end = dt.date.today()

    if start > end:
        return JsonResponse({"detail": "start must be before end."}, status=400)

    payload = _build_filtered_csv(start, end)
    filename = f"transcriptions_{start.isoformat()}_{end.isoformat()}.csv"
    response = HttpResponse(payload, content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response
