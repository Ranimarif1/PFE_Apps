from __future__ import annotations

import datetime as dt
import json
from typing import Any, Dict, List

from bson import ObjectId
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
@jwt_required(roles={"doctor", "admin", "adminIT"})
def list_or_create_complaints(request: HttpRequest):
    complaints_col = get_collection("complaints")
    user: CurrentUser = request.user  # type: ignore[assignment]

    if request.method == "GET":
        query: Dict[str, Any] = {}
        if user.role in {"doctor", "admin"}:
            query["doctorId"] = user.id

        docs: List[Dict[str, Any]] = list(complaints_col.find(query).sort("createdAt", -1))
        return JsonResponse({"results": [serialize_document(d) for d in docs]}, safe=False)

    if request.method == "POST":
        if user.role not in {"doctor", "admin"}:
            return JsonResponse({"detail": "Only doctors and admins can create complaints."}, status=403)

        data = _parse_body(request)
        title = data.get("title") or ""
        description = data.get("description") or ""
        if not title or not description:
            return JsonResponse({"detail": "title and description are required."}, status=400)

        now = dt.datetime.utcnow().isoformat()
        doc = {
            "doctorId": user.id,
            "title": title,
            "description": description,
            "status": "pending",
            "response": "",
            "createdAt": now,
        }
        inserted = complaints_col.insert_one(doc)
        created = complaints_col.find_one({"_id": inserted.inserted_id})
        return JsonResponse(serialize_document(created), status=201)

    return JsonResponse({"detail": "Method not allowed."}, status=405)


@csrf_exempt
@jwt_required(roles={"adminIT"})
def update_complaint(request: HttpRequest, complaint_id: str):
    if request.method != "PUT":
        return JsonResponse({"detail": "Method not allowed."}, status=405)

    complaints_col = get_collection("complaints")
    try:
        oid = ObjectId(complaint_id)
    except Exception:
        return JsonResponse({"detail": "Invalid complaint id."}, status=400)

    complaint = complaints_col.find_one({"_id": oid})
    if not complaint:
        return JsonResponse({"detail": "Complaint not found."}, status=404)

    data = _parse_body(request)
    new_status = data.get("status", complaint.get("status", "pending"))
    if new_status not in {"pending", "in_progress", "resolved"}:
        return JsonResponse({"detail": "Invalid status."}, status=400)

    response_text = data.get("response", complaint.get("response", ""))

    update_doc = {
        "status": new_status,
        "response": response_text,
    }
    complaints_col.update_one({"_id": oid}, {"$set": update_doc})
    updated = complaints_col.find_one({"_id": oid})
    return JsonResponse(serialize_document(updated))

