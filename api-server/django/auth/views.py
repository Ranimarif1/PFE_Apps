from __future__ import annotations

import datetime as dt
import json
from typing import Any, Dict

from bson import ObjectId
from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt

from core.auth import create_access_token, create_refresh_token, get_current_user, hash_password, verify_password
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
def register(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed."}, status=405)

    data = _parse_body(request)
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    role = (data.get("role") or "doctor").strip()
    nom = (data.get("nom") or "").strip()
    prenom = (data.get("prenom") or "").strip()

    if not email or not password or role not in {"doctor", "admin", "adminIT"}:
        return JsonResponse({"detail": "Invalid payload."}, status=400)

    users_col = get_collection("users")
    if users_col.find_one({"email": email}):
        return JsonResponse({"detail": "Email already registered."}, status=400)

    now = dt.datetime.utcnow().isoformat()
    status = "pending"
    user_doc = {
        "email": email,
        "password": hash_password(password),
        "role": role,
        "status": status,
        "nom": nom,
        "prenom": prenom,
        "createdAt": now,
    }
    inserted = users_col.insert_one(user_doc)
    created = users_col.find_one({"_id": inserted.inserted_id})
    return JsonResponse({"user": serialize_document(created)}, status=201)


@csrf_exempt
def login_view(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed."}, status=405)

    data = _parse_body(request)
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return JsonResponse({"detail": "Invalid credentials."}, status=400)

    users_col = get_collection("users")
    user = users_col.find_one({"email": email})
    if not user or not verify_password(password, user["password"]):
        return JsonResponse({"detail": "Invalid credentials."}, status=401)

    # Doctors and admins must be validated before login.
    if user["role"] in {"doctor", "admin"} and user.get("status") != "validated":
        return JsonResponse({"detail": "Account not validated yet."}, status=403)

    access = create_access_token(user)
    refresh = create_refresh_token(user)
    return JsonResponse(
        {
            "access": access,
            "refresh": refresh,
            "user": {
                "_id": str(user["_id"]),
                "email": user["email"],
                "role": user["role"],
                "status": user["status"],
                "nom": user.get("nom", ""),
                "prenom": user.get("prenom", ""),
            },
        }
    )


def me(request: HttpRequest) -> JsonResponse:
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed."}, status=405)

    user = get_current_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication required."}, status=401)

    return JsonResponse(
        {
            "_id": user.id,
            "email": user.email,
            "role": user.role,
            "status": user.status,
            "nom": user.raw.get("nom", ""),
            "prenom": user.raw.get("prenom", ""),
        }
    )


@csrf_exempt
def update_user_status(request: HttpRequest, user_id: str) -> JsonResponse:
    if request.method not in {"PUT", "PATCH"}:
        return JsonResponse({"detail": "Method not allowed."}, status=405)

    current = get_current_user(request)
    if not current:
        return JsonResponse({"detail": "Authentication required."}, status=401)

    # Only admins can validate users.
    if current.role not in {"admin", "adminIT"}:
        return JsonResponse({"detail": "Permission denied."}, status=403)

    data = _parse_body(request)
    new_status = data.get("status")
    if new_status not in {"pending", "validated", "refused"}:
        return JsonResponse({"detail": "Invalid status."}, status=400)

    users_col = get_collection("users")
    try:
        oid = ObjectId(user_id)
    except Exception:
        return JsonResponse({"detail": "Invalid user id."}, status=400)

    result = users_col.update_one({"_id": oid}, {"$set": {"status": new_status}})
    if result.matched_count == 0:
        return JsonResponse({"detail": "User not found."}, status=404)

    updated = users_col.find_one({"_id": oid})
    return JsonResponse({"user": serialize_document(updated)})


@csrf_exempt
def delete_user(request: HttpRequest, user_id: str) -> JsonResponse:
    if request.method != "DELETE":
        return JsonResponse({"detail": "Method not allowed."}, status=405)

    current = get_current_user(request)
    if not current:
        return JsonResponse({"detail": "Authentication required."}, status=401)

    if current.role != "admin":
        return JsonResponse({"detail": "Permission denied."}, status=403)

    users_col = get_collection("users")
    try:
        oid = ObjectId(user_id)
    except Exception:
        return JsonResponse({"detail": "Invalid user id."}, status=400)

    user = users_col.find_one({"_id": oid})
    if not user:
        return JsonResponse({"detail": "User not found."}, status=404)

    if user.get("role") != "doctor":
        return JsonResponse({"detail": "Only doctor accounts can be deleted."}, status=403)

    users_col.delete_one({"_id": oid})
    return JsonResponse({"detail": "User deleted."})


def list_users(request: HttpRequest) -> JsonResponse:
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed."}, status=405)

    current = get_current_user(request)
    if not current:
        return JsonResponse({"detail": "Authentication required."}, status=401)

    if current.role not in {"admin", "adminIT"}:
        return JsonResponse({"detail": "Permission denied."}, status=403)

    users_col = get_collection("users")
    docs = list(users_col.find({}, {"password": 0}).sort("createdAt", -1))
    return JsonResponse({"results": [serialize_document(d) for d in docs]})

