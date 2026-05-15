from __future__ import annotations

import datetime as dt
import json
from typing import Any, Dict, List

from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt

from core.auth import CurrentUser, jwt_required
from core.mongo import get_collection, serialize_document


def _parse_body(request: HttpRequest) -> Dict[str, Any]:
    try:
        data = json.loads(request.body.decode("utf-8"))
        if not isinstance(data, dict):
            return {}
        return data
    except Exception:
        return {}


@csrf_exempt
def list_avis(request: HttpRequest):
    """Public endpoint — anyone can read all submitted avis."""
    if request.method != "GET":
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)

    col = get_collection("avis")
    docs: List[Dict[str, Any]] = list(col.find({}).sort("createdAt", -1))
    return JsonResponse({"results": [serialize_document(d) for d in docs]}, safe=False)


@csrf_exempt
@jwt_required(roles={"doctor"})
def create_avis(request: HttpRequest):
    """Authenticated doctors can submit an avis (one per doctor)."""
    if request.method != "POST":
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)

    user: CurrentUser = request.user  # type: ignore[assignment]

    col = get_collection("avis")

    if col.find_one({"doctorId": user.id}):
        return JsonResponse({"detail": "Vous avez déjà soumis un avis."}, status=409)

    data = _parse_body(request)

    content = (data.get("content") or "").strip()
    if not content:
        return JsonResponse({"detail": "Le contenu de l'avis est requis."}, status=400)

    rating = data.get("rating")
    if rating is not None:
        try:
            rating = int(rating)
            if not (1 <= rating <= 5):
                raise ValueError
        except (ValueError, TypeError):
            return JsonResponse({"detail": "La note doit être entre 1 et 5."}, status=400)

    doctor_name = (data.get("doctorName") or "").strip() or user.id

    doc = {
        "doctorId": user.id,
        "doctorName": doctor_name,
        "content": content,
        "rating": rating,
        "createdAt": dt.datetime.utcnow().isoformat(),
    }
    inserted = col.insert_one(doc)
    created = col.find_one({"_id": inserted.inserted_id})
    return JsonResponse(serialize_document(created), status=201)
