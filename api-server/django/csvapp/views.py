from __future__ import annotations

from pathlib import Path

from django.conf import settings
from django.http import FileResponse, HttpRequest, JsonResponse

from core.auth import jwt_required


@jwt_required(roles={"adminIT", "admin"})
def download_global_csv(request: HttpRequest):
    media_root: Path = settings.MEDIA_ROOT
    csv_path = media_root / "exports" / "transcriptions_globales.csv"

    if not csv_path.exists():
        return JsonResponse({"detail": "CSV archive not found."}, status=404)

    response = FileResponse(open(csv_path, "rb"), as_attachment=True, filename="transcriptions_globales.csv")
    return response

