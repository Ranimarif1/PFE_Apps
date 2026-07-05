from __future__ import annotations

import base64
import datetime as dt
import json
import re
import secrets
from pathlib import Path
from typing import Any, Dict

from bson import ObjectId
from django.conf import settings
from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt

from core.auth import create_access_token, create_refresh_token, decode_token, get_current_user, hash_password, verify_password, jwt_required
from core.mongo import get_collection, serialize_document

from .validators import validate_email_format, validate_password_strength


def _parse_body(request: HttpRequest) -> Dict[str, Any]:
    try:
        data = json.loads(request.body.decode("utf-8"))
        if not isinstance(data, dict):
            return {}
        return data
    except Exception:
        return {}


# ── Avatar storage helpers ────────────────────────────────────────────────
AVATAR_MIME_TO_EXT = {
    "image/jpeg": "jpg",
    "image/jpg":  "jpg",
    "image/png":  "png",
    "image/webp": "webp",
}
AVATAR_MAX_BYTES = 5 * 1024 * 1024  # 5 MB after base64 decode
_DATA_URI_RE = re.compile(r"^data:(?P<mime>image/[a-zA-Z0-9.+-]+);base64,(?P<data>.+)$", re.DOTALL)


def _avatars_dir() -> Path:
    d = settings.MEDIA_ROOT / "avatars"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _save_avatar(user_id: str, data_uri: str) -> str:
    """Decode a base64 data URI and write it to media/avatars/user_<id>.<ext>.

    Returns the public URL (with cache-busting ?v=<timestamp>) to store in MongoDB.
    Raises ValueError on invalid input.
    """
    match = _DATA_URI_RE.match(data_uri.strip())
    if not match:
        raise ValueError("Format de photo invalide.")
    mime = match.group("mime").lower()
    ext = AVATAR_MIME_TO_EXT.get(mime)
    if not ext:
        raise ValueError("Format d'image non supporté (JPEG, PNG ou WebP uniquement).")
    try:
        raw = base64.b64decode(match.group("data"), validate=True)
    except Exception as exc:
        raise ValueError("Photo corrompue.") from exc
    if len(raw) > AVATAR_MAX_BYTES:
        raise ValueError("Photo trop volumineuse (max 5 Mo).")

    avatars_dir = _avatars_dir()
    # Remove any prior avatar for this user (any extension), so a fixed filename is used.
    for old in avatars_dir.glob(f"user_{user_id}.*"):
        try:
            old.unlink()
        except OSError:
            pass

    target = avatars_dir / f"user_{user_id}.{ext}"
    target.write_bytes(raw)
    version = int(dt.datetime.utcnow().timestamp())
    return f"{settings.MEDIA_URL}avatars/user_{user_id}.{ext}?v={version}"


@csrf_exempt
def check_senior_code(request: HttpRequest) -> JsonResponse:
    """GET /api/auth/check-senior-code?code=<code> — public, checks if a senior code is available."""
    if request.method != "GET":
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)
    code = (request.GET.get("code") or "").strip()
    if not code:
        return JsonResponse({"available": False, "detail": "Code vide."}, status=400)
    taken = get_collection("users").find_one({"seniorCode": code}) is not None
    return JsonResponse({"available": not taken})


@csrf_exempt
def register(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)

    data = _parse_body(request)
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    role = (data.get("role") or "doctor").strip()
    nom = (data.get("nom") or "").strip().title()
    prenom = (data.get("prenom") or "").strip().title()
    genre = (data.get("genre") or "").strip()

    if role not in {"doctor", "admin", "adminIT"}:
        return JsonResponse({"detail": "Rôle invalide."}, status=400)

    # ── Senior status & code ──
    # admin & doctor → optional (chosen at registration); adminIT → never senior.
    senior_code = (data.get("seniorCode") or "").strip()
    if role in {"doctor", "admin"}:
        senior = bool(data.get("senior"))
    else:  # adminIT
        senior = False
        senior_code = ""

    if senior:
        if not senior_code:
            return JsonResponse({"detail": "Le numéro / code du senior est requis."}, status=400)
        if not senior_code.isdigit() or len(senior_code) > 3:
            return JsonResponse({"detail": "Le code senior doit être numérique et contenir au maximum 3 chiffres."}, status=400)
        if get_collection("users").find_one({"seniorCode": senior_code}):
            return JsonResponse({"detail": "Ce code senior est déjà utilisé."}, status=400)

    email_err = validate_email_format(email)
    if email_err:
        return JsonResponse({"detail": email_err}, status=400)

    password_err = validate_password_strength(password)
    if password_err:
        return JsonResponse({"detail": password_err}, status=400)

    users_col = get_collection("users")
    if users_col.find_one({"email": email}):
        return JsonResponse({"detail": "Cet email est déjà enregistré."}, status=400)

    now = dt.datetime.utcnow().isoformat()
    status = "pending"
    user_doc = {
        "email": email,
        "password": hash_password(password),
        "role": role,
        "status": status,
        "nom": nom,
        "prenom": prenom,
        "genre": genre,
        "photo": "",
        "senior": senior,
        "seniorCode": senior_code if senior else "",
        "createdAt": now,
    }
    inserted = users_col.insert_one(user_doc)
    created = users_col.find_one({"_id": inserted.inserted_id})
    return JsonResponse({"user": serialize_document(created)}, status=201)


@csrf_exempt
def login_view(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)

    data = _parse_body(request)
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return JsonResponse({"detail": "Identifiants incorrects."}, status=400)

    users_col = get_collection("users")
    user = users_col.find_one({"email": email})
    if not user or not verify_password(password, user["password"]):
        return JsonResponse({"detail": "Identifiants incorrects."}, status=401)

    # Doctors and admins must be validated before login.
    if user["role"] in {"doctor", "admin"} and user.get("status") != "validated":
        return JsonResponse({"detail": "Compte en attente de validation."}, status=403)

    # Capitalize nom/prenom on every login — fixes existing accounts transparently.
    cap_fields = {}
    if user.get("nom")    and user["nom"]    != user["nom"].strip().title():
        cap_fields["nom"]    = user["nom"].strip().title()
    if user.get("prenom") and user["prenom"] != user["prenom"].strip().title():
        cap_fields["prenom"] = user["prenom"].strip().title()
    if cap_fields:
        users_col.update_one({"_id": user["_id"]}, {"$set": cap_fields})
        user = {**user, **cap_fields}

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
                "genre": user.get("genre", ""),
                "photo": user.get("photo", ""),
                "senior": user.get("senior", user["role"] == "admin"),
                "seniorCode": user.get("seniorCode", ""),
                "mustChangePassword": user.get("mustChangePassword", False),
            },
        }
    )


def me(request: HttpRequest) -> JsonResponse:
    if request.method != "GET":
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)

    user = get_current_user(request)
    if not user:
        return JsonResponse({"detail": "Authentification requise."}, status=401)

    return JsonResponse(
        {
            "_id": user.id,
            "email": user.email,
            "role": user.role,
            "status": user.status,
            "nom": user.raw.get("nom", ""),
            "prenom": user.raw.get("prenom", ""),
            "genre": user.raw.get("genre", ""),
            "photo": user.raw.get("photo", ""),
            "senior": user.raw.get("senior", user.role == "admin"),
            "seniorCode": user.raw.get("seniorCode", ""),
        }
    )


@csrf_exempt
def update_user_status(request: HttpRequest, user_id: str) -> JsonResponse:
    if request.method not in {"PUT", "PATCH"}:
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)

    current = get_current_user(request)
    if not current:
        return JsonResponse({"detail": "Authentification requise."}, status=401)

    # Only admins can validate users.
    if current.role not in {"admin", "adminIT"}:
        return JsonResponse({"detail": "Accès refusé."}, status=403)

    data = _parse_body(request)
    new_status = data.get("status")
    if new_status not in {"pending", "validated", "refused"}:
        return JsonResponse({"detail": "Statut invalide."}, status=400)

    reason = (data.get("reason") or "").strip()

    users_col = get_collection("users")
    try:
        oid = ObjectId(user_id)
    except Exception:
        return JsonResponse({"detail": "Identifiant utilisateur invalide."}, status=400)

    result = users_col.update_one({"_id": oid}, {"$set": {"status": new_status}})
    if result.matched_count == 0:
        return JsonResponse({"detail": "Utilisateur introuvable."}, status=404)

    updated = users_col.find_one({"_id": oid})
    return JsonResponse({"user": serialize_document(updated)})


@csrf_exempt
def user_report_info(request: HttpRequest, user_id: str) -> JsonResponse:
    """GET /api/auth/users/<id>/report-info — report count + auto-senior for pre-delete modal."""
    if request.method != "GET":
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)

    current = get_current_user(request)
    if not current or current.role not in {"admin", "adminIT"}:
        return JsonResponse({"detail": "Accès refusé."}, status=403)

    users_col = get_collection("users")
    try:
        oid = ObjectId(user_id)
    except Exception:
        return JsonResponse({"detail": "Identifiant invalide."}, status=400)

    user = users_col.find_one({"_id": oid})
    if not user:
        return JsonResponse({"detail": "Utilisateur introuvable."}, status=404)

    reports_col = get_collection("reports")
    report_count = reports_col.count_documents({"doctorId": str(oid)})

    # For a non-senior doctor, try to find their senior automatically from their reports.
    auto_senior = None
    is_senior = user.get("senior") or user.get("role") == "admin"
    if not is_senior and report_count > 0:
        sample = reports_col.find_one({"doctorId": str(oid), "seniorId": {"$nin": [None, ""]}})
        if sample:
            senior_id = sample.get("seniorId")
            try:
                senior_doc = users_col.find_one({"_id": ObjectId(senior_id)})
                if senior_doc:
                    name = f"{senior_doc.get('prenom', '')} {senior_doc.get('nom', '')}".strip()
                    auto_senior = {"id": str(senior_doc["_id"]), "name": name or senior_doc.get("email", senior_id)}
            except Exception:
                pass
            # If senior_doc not found (deleted user), auto_senior stays None → frontend shows dropdown

    return JsonResponse({"report_count": report_count, "auto_senior": auto_senior})


@csrf_exempt
def delete_user(request: HttpRequest, user_id: str) -> JsonResponse:
    if request.method != "DELETE":
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)

    current = get_current_user(request)
    if not current:
        return JsonResponse({"detail": "Authentification requise."}, status=401)

    if current.role not in {"admin", "adminIT"}:
        return JsonResponse({"detail": "Accès refusé."}, status=403)

    users_col = get_collection("users")
    try:
        oid = ObjectId(user_id)
    except Exception:
        return JsonResponse({"detail": "Identifiant utilisateur invalide."}, status=400)

    user = users_col.find_one({"_id": oid})
    if not user:
        return JsonResponse({"detail": "Utilisateur introuvable."}, status=404)

    # Admin can only delete doctors; AdminIT can only delete admins
    if current.role == "admin" and user.get("role") != "doctor":
        return JsonResponse({"detail": "Les admins ne peuvent supprimer que des médecins."}, status=403)
    if current.role == "adminIT" and user.get("role") != "admin":
        return JsonResponse({"detail": "L'Admin IT ne peut supprimer que des comptes admin."}, status=403)

    # Clear seniorId on any reports this user supervised
    reports_col = get_collection("reports")
    reports_col.update_many(
        {"seniorId": str(oid)},
        {"$set": {"seniorId": None, "seniorName": None, "seniorCode": None}},
    )

    users_col.delete_one({"_id": oid})
    return JsonResponse({"detail": "Utilisateur supprimé."})


@csrf_exempt
def list_notifications(request: HttpRequest) -> JsonResponse:
    """GET /api/auth/notifications — returns the logged-in user's notifications."""
    if request.method != "GET":
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)
    current = get_current_user(request)
    if not current:
        return JsonResponse({"detail": "Authentification requise."}, status=401)

    docs = list(get_collection("notifications").find(
        {"userId": current.id},
        sort=[("createdAt", -1)],
        limit=30,
    ))
    return JsonResponse({"results": [serialize_document(d) for d in docs]})


@csrf_exempt
def mark_notifications_read(request: HttpRequest) -> JsonResponse:
    """PATCH /api/auth/notifications/mark-read — marks all notifications as read."""
    if request.method != "PATCH":
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)
    current = get_current_user(request)
    if not current:
        return JsonResponse({"detail": "Authentification requise."}, status=401)

    get_collection("notifications").update_many(
        {"userId": current.id, "read": False},
        {"$set": {"read": True}},
    )
    return JsonResponse({"detail": "Notifications marquées comme lues."})


def list_seniors(request: HttpRequest) -> JsonResponse:
    """GET /api/auth/seniors — validated seniors a non-senior can work under.

    Includes senior médecins and senior admins. Admins who explicitly opted out
    of senior status (senior == False) are excluded; legacy admins without the
    flag still count as seniors.
    """
    if request.method != "GET":
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)

    current = get_current_user(request)
    if not current:
        return JsonResponse({"detail": "Authentification requise."}, status=401)

    users_col = get_collection("users")
    docs = list(users_col.find(
        {
            "status": "validated",
            "$or": [
                {"role": "doctor", "senior": True},
                {"role": "admin", "senior": {"$ne": False}},
            ],
        },
        {"nom": 1, "prenom": 1, "seniorCode": 1, "role": 1},
    ).sort([("nom", 1), ("prenom", 1)]))

    results = [
        {
            "id": str(d["_id"]),
            "nom": d.get("nom", ""),
            "prenom": d.get("prenom", ""),
            "seniorCode": d.get("seniorCode", ""),
            "role": d.get("role", ""),
        }
        for d in docs
    ]
    return JsonResponse({"results": results})


def list_users(request: HttpRequest) -> JsonResponse:
    if request.method != "GET":
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)

    current = get_current_user(request)
    if not current:
        return JsonResponse({"detail": "Authentification requise."}, status=401)

    if current.role not in {"admin", "adminIT"}:
        return JsonResponse({"detail": "Accès refusé."}, status=403)

    users_col = get_collection("users")
    docs = list(users_col.find({}, {"password": 0}).sort("createdAt", -1))
    return JsonResponse({"results": [serialize_document(d) for d in docs]})


@csrf_exempt
def update_profile(request: HttpRequest) -> JsonResponse:
    if request.method not in {"PUT", "PATCH"}:
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)

    current = get_current_user(request)
    if not current:
        return JsonResponse({"detail": "Authentification requise."}, status=401)

    data = _parse_body(request)
    updates: Dict[str, Any] = {}

    # nom and prenom are immutable after account creation — silently ignored if sent.
    email = (data.get("email") or "").strip().lower()
    photo = data.get("photo")
    password = data.get("password") or ""

    if email:
        users_col_check = get_collection("users")
        existing = users_col_check.find_one({"email": email, "_id": {"$ne": ObjectId(current.id)}})
        if existing:
            return JsonResponse({"detail": "Cet email est déjà utilisé."}, status=400)
        updates["email"] = email
    # Only persist a new photo when the client sends a fresh base64 data URI.
    # Existing URLs (e.g. "/media/avatars/...") are no-ops to avoid clobbering on every save.
    if isinstance(photo, str) and photo.startswith("data:"):
        try:
            updates["photo"] = _save_avatar(current.id, photo)
        except ValueError as exc:
            return JsonResponse({"detail": str(exc)}, status=400)
    # Senior code — only senior accounts (admin, or doctor flagged senior) may set it.
    senior_code = data.get("seniorCode")
    if senior_code is not None:
        senior_code = senior_code.strip()
        is_senior = current.raw.get("role") == "admin" or (current.raw.get("role") == "doctor" and current.raw.get("senior"))
        if not is_senior:
            return JsonResponse({"detail": "Seuls les seniors peuvent définir un code."}, status=403)
        if not senior_code:
            return JsonResponse({"detail": "Le code senior ne peut pas être vide."}, status=400)
        if not senior_code.isdigit() or len(senior_code) > 3:
            return JsonResponse({"detail": "Le code senior doit être numérique et contenir au maximum 3 chiffres."}, status=400)
        clash = get_collection("users").find_one({"seniorCode": senior_code, "_id": {"$ne": ObjectId(current.id)}})
        if clash:
            return JsonResponse({"detail": "Ce code senior est déjà utilisé."}, status=400)
        updates["seniorCode"] = senior_code
    if password:
        if len(password) < 6:
            return JsonResponse({"detail": "Mot de passe trop court."}, status=400)
        updates["password"] = hash_password(password)

    if not updates:
        return JsonResponse({"detail": "Aucune modification à effectuer."}, status=400)

    users_col = get_collection("users")
    users_col.update_one({"_id": ObjectId(current.id)}, {"$set": updates})
    updated = users_col.find_one({"_id": ObjectId(current.id)})
    return JsonResponse({
        "_id": str(updated["_id"]),
        "email": updated["email"],
        "role": updated["role"],
        "status": updated["status"],
        "nom": updated.get("nom", ""),
        "prenom": updated.get("prenom", ""),
        "genre": updated.get("genre", ""),
        "photo": updated.get("photo", ""),
        "senior": updated.get("senior", updated["role"] == "admin"),
        "seniorCode": updated.get("seniorCode", ""),
    })


@csrf_exempt
def change_user_role(request: HttpRequest, user_id: str) -> JsonResponse:
    if request.method not in {"PUT", "PATCH"}:
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)

    current = get_current_user(request)
    if not current:
        return JsonResponse({"detail": "Authentification requise."}, status=401)

    if current.role not in {"admin", "adminIT"}:
        return JsonResponse({"detail": "Accès refusé."}, status=403)

    data = _parse_body(request)
    new_role = (data.get("role") or "").strip()

    if new_role not in {"doctor", "admin"}:
        return JsonResponse({"detail": "Rôle invalide."}, status=400)

    users_col = get_collection("users")
    try:
        oid = ObjectId(user_id)
    except Exception:
        return JsonResponse({"detail": "Identifiant utilisateur invalide."}, status=400)

    user = users_col.find_one({"_id": oid})
    if not user:
        return JsonResponse({"detail": "Utilisateur introuvable."}, status=404)

    # Admin can only promote doctor → admin
    if current.role == "admin":
        if user.get("role") != "doctor" or new_role != "admin":
            return JsonResponse({"detail": "Les admins ne peuvent que promouvoir un médecin en admin."}, status=400)

    # AdminIT can only demote admin → doctor
    if current.role == "adminIT":
        if user.get("role") != "admin" or new_role != "doctor":
            return JsonResponse({"detail": "L'Admin IT ne peut que rétrograder un admin en médecin."}, status=400)

    # Promoting to admin requires a senior code (admins are senior by default)
    senior_code = (data.get("seniorCode") or "").strip()
    update_fields: Dict[str, Any] = {"role": new_role}
    if new_role == "admin":
        if not senior_code:
            return JsonResponse({"detail": "Un code senior est requis pour promouvoir un médecin en admin."}, status=400)
        if not senior_code.isdigit() or len(senior_code) > 3:
            return JsonResponse({"detail": "Le code senior doit être numérique et contenir au maximum 3 chiffres."}, status=400)
        clash = users_col.find_one({"seniorCode": senior_code, "_id": {"$ne": oid}})
        if clash:
            return JsonResponse({"detail": "Ce code senior est déjà utilisé."}, status=400)
        update_fields["senior"] = True
        update_fields["seniorCode"] = senior_code
    else:
        # Demoting to doctor → remove senior status
        update_fields["senior"] = False
        update_fields["seniorCode"] = ""

    users_col.update_one({"_id": oid}, {"$set": update_fields})
    updated = users_col.find_one({"_id": oid})
    return JsonResponse({"user": serialize_document(updated)})


@csrf_exempt
def update_senior_code(request: HttpRequest, user_id: str) -> JsonResponse:
    """PATCH /api/auth/users/<user_id>/senior-code — admin updates a doctor's senior code."""
    if request.method != "PATCH":
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)

    current = get_current_user(request)
    if not current:
        return JsonResponse({"detail": "Authentification requise."}, status=401)
    if current.role not in {"admin", "adminIT"}:
        return JsonResponse({"detail": "Accès refusé."}, status=403)

    users_col = get_collection("users")
    try:
        oid = ObjectId(user_id)
    except Exception:
        return JsonResponse({"detail": "Identifiant invalide."}, status=400)

    user = users_col.find_one({"_id": oid})
    if not user:
        return JsonResponse({"detail": "Utilisateur introuvable."}, status=404)
    if not user.get("senior"):
        return JsonResponse({"detail": "Ce médecin n'est pas senior."}, status=400)

    data = _parse_body(request)
    code = (data.get("seniorCode") or "").strip()
    if not code:
        return JsonResponse({"detail": "Le code senior ne peut pas être vide."}, status=400)
    if not code.isdigit():
        return JsonResponse({"detail": "Le code senior doit être numérique."}, status=400)

    clash = users_col.find_one({"seniorCode": code, "_id": {"$ne": oid}})
    if clash:
        return JsonResponse({"detail": "Ce code senior est déjà utilisé."}, status=400)

    users_col.update_one({"_id": oid}, {"$set": {"seniorCode": code}})
    updated = users_col.find_one({"_id": oid})
    return JsonResponse({"user": serialize_document(updated)})


@csrf_exempt
def grant_senior(request: HttpRequest, user_id: str) -> JsonResponse:
    """PATCH /api/auth/users/<user_id>/grant-senior — admin grants senior status with a unique code."""
    if request.method != "PATCH":
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)

    current = get_current_user(request)
    if not current:
        return JsonResponse({"detail": "Authentification requise."}, status=401)
    if current.role not in {"admin", "adminIT"}:
        return JsonResponse({"detail": "Accès refusé."}, status=403)

    users_col = get_collection("users")
    try:
        oid = ObjectId(user_id)
    except Exception:
        return JsonResponse({"detail": "Identifiant invalide."}, status=400)

    user = users_col.find_one({"_id": oid})
    if not user:
        return JsonResponse({"detail": "Utilisateur introuvable."}, status=404)
    if user.get("role") != "doctor":
        return JsonResponse({"detail": "Seuls les médecins peuvent recevoir le statut senior."}, status=400)
    if user.get("senior"):
        return JsonResponse({"detail": "Ce médecin est déjà senior."}, status=400)

    data = _parse_body(request)
    code = (data.get("seniorCode") or "").strip()
    if not code:
        return JsonResponse({"detail": "Le code senior ne peut pas être vide."}, status=400)
    if not code.isdigit():
        return JsonResponse({"detail": "Le code senior doit être numérique."}, status=400)

    clash = users_col.find_one({"seniorCode": code})
    if clash:
        return JsonResponse({"detail": "Ce code senior est déjà utilisé.", "available": False}, status=400)

    users_col.update_one({"_id": oid}, {"$set": {"senior": True, "seniorCode": code}})
    updated = users_col.find_one({"_id": oid})

    get_collection("notifications").insert_one({
        "userId": str(oid),
        "type": "senior_granted",
        "text": "Félicitations ! Votre statut de médecin senior vous a été accordé par un administrateur.",
        "link": "/profil",
        "read": False,
        "createdAt": dt.datetime.utcnow().isoformat(),
    })

    return JsonResponse({"user": serialize_document(updated)})


@csrf_exempt
def revoke_senior(request: HttpRequest, user_id: str) -> JsonResponse:
    """PATCH /api/auth/users/<user_id>/revoke-senior — admin revokes senior status."""
    if request.method != "PATCH":
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)

    current = get_current_user(request)
    if not current:
        return JsonResponse({"detail": "Authentification requise."}, status=401)
    if current.role not in {"admin", "adminIT"}:
        return JsonResponse({"detail": "Accès refusé."}, status=403)

    users_col = get_collection("users")
    try:
        oid = ObjectId(user_id)
    except Exception:
        return JsonResponse({"detail": "Identifiant invalide."}, status=400)

    user = users_col.find_one({"_id": oid})
    if not user:
        return JsonResponse({"detail": "Utilisateur introuvable."}, status=404)
    if not user.get("senior"):
        return JsonResponse({"detail": "Ce médecin n'est pas senior."}, status=400)

    users_col.update_one({"_id": oid}, {"$set": {"senior": False, "seniorCode": ""}})
    updated = users_col.find_one({"_id": oid})

    get_collection("notifications").insert_one({
        "userId": str(oid),
        "type": "senior_revoked",
        "text": "Votre statut de médecin senior a été révoqué par un administrateur.",
        "link": "/profil",
        "read": False,
        "createdAt": dt.datetime.utcnow().isoformat(),
    })

    return JsonResponse({"user": serialize_document(updated)})


@csrf_exempt
def forgot_password(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)

    data = _parse_body(request)
    email = (data.get("email") or "").strip().lower()

    if not email:
        return JsonResponse({"detail": "Email requis."}, status=400)

    # Always return the same message to avoid email enumeration
    success_msg = "Si cet email est associé à un compte, un lien de réinitialisation a été envoyé."

    users_col = get_collection("users")
    user = users_col.find_one({"email": email})
    if not user:
        return JsonResponse({"detail": success_msg})

    token = secrets.token_urlsafe(32)
    expires_at = (dt.datetime.utcnow() + dt.timedelta(hours=1)).isoformat()

    tokens_col = get_collection("password_reset_tokens")
    tokens_col.delete_many({"email": email})
    tokens_col.insert_one({"email": email, "token": token, "expires_at": expires_at, "used": False})

    return JsonResponse({"detail": success_msg})


@csrf_exempt
def reset_password(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)

    data = _parse_body(request)
    token = (data.get("token") or "").strip()
    new_password = data.get("password") or ""

    if not token or not new_password:
        return JsonResponse({"detail": "Token et mot de passe requis."}, status=400)

    if len(new_password) < 6:
        return JsonResponse({"detail": "Le mot de passe doit contenir au moins 6 caractères."}, status=400)

    tokens_col = get_collection("password_reset_tokens")
    token_doc = tokens_col.find_one({"token": token, "used": False})

    if not token_doc:
        return JsonResponse({"detail": "Lien invalide ou déjà utilisé."}, status=400)

    try:
        expires_at = dt.datetime.fromisoformat(token_doc["expires_at"])
    except Exception:
        return JsonResponse({"detail": "Lien invalide."}, status=400)

    if dt.datetime.utcnow() > expires_at:
        tokens_col.delete_one({"token": token})
        return JsonResponse({"detail": "Lien expiré. Veuillez refaire une demande."}, status=400)

    users_col = get_collection("users")
    users_col.update_one(
        {"email": token_doc["email"]},
        {"$set": {"password": hash_password(new_password)}}
    )
    tokens_col.update_one({"token": token}, {"$set": {"used": True}})

    return JsonResponse({"detail": "Mot de passe réinitialisé avec succès."})


# ── Password reset request (new flow — no email token) ───────────────────────

@csrf_exempt
def request_password_reset(request: HttpRequest) -> JsonResponse:
    """Doctor/Admin submits a reset request — superior will set a temp password."""
    if request.method != "POST":
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)

    data = _parse_body(request)
    email = (data.get("email") or "").strip().lower()
    if not email:
        return JsonResponse({"detail": "Email requis."}, status=400)

    users_col = get_collection("users")
    user = users_col.find_one({"email": email})
    if not user:
        return JsonResponse({"detail": "Aucun compte associé à cet email."}, status=404)

    col = get_collection("password_reset_requests")
    existing = col.find_one({"userId": str(user["_id"]), "status": "pending"})
    if existing:
        return JsonResponse(
            {"detail": "Votre demande est déjà en cours de traitement. Veuillez patienter que votre administrateur la prenne en charge."},
            status=409
        )

    col.insert_one({
        "userId":   str(user["_id"]),
        "email":    email,
        "role":     user.get("role", "doctor"),
        "nom":      user.get("nom", ""),
        "prenom":   user.get("prenom", ""),
        "status":   "pending",
        "createdAt": dt.datetime.utcnow().isoformat(),
    })
    return JsonResponse({"detail": "Demande enregistrée."})


@csrf_exempt
@jwt_required(roles={"admin", "adminIT"})
def list_password_reset_requests(request: HttpRequest) -> JsonResponse:
    """Admin sees doctor requests. AdminIT sees admin requests."""
    if request.method != "GET":
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)

    caller = get_current_user(request)
    if not caller:
        return JsonResponse({"detail": "Non autorisé."}, status=401)

    target_role = "doctor" if caller.role == "admin" else "admin"
    col = get_collection("password_reset_requests")
    docs = list(col.find({"status": "pending", "role": target_role}).sort("createdAt", 1))
    return JsonResponse({"results": [serialize_document(d) for d in docs]})


@csrf_exempt
@jwt_required(roles={"admin", "adminIT"})
def set_temp_password(request: HttpRequest, user_id: str) -> JsonResponse:
    """Admin/AdminIT sets a temporary password for a user and flags mustChangePassword."""
    if request.method != "POST":
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)

    caller = get_current_user(request)
    if not caller:
        return JsonResponse({"detail": "Non autorisé."}, status=401)

    data = _parse_body(request)
    temp_password = data.get("password") or ""
    if len(temp_password) < 6:
        return JsonResponse({"detail": "Le mot de passe doit contenir au moins 6 caractères."}, status=400)

    from bson import ObjectId
    users_col = get_collection("users")
    try:
        target = users_col.find_one({"_id": ObjectId(user_id)})
    except Exception:
        return JsonResponse({"detail": "Utilisateur introuvable."}, status=404)

    if not target:
        return JsonResponse({"detail": "Utilisateur introuvable."}, status=404)

    # Admin can only reset doctor passwords; AdminIT can only reset admin passwords
    allowed_target = "doctor" if caller.role == "admin" else "admin"
    if target.get("role") != allowed_target:
        return JsonResponse({"detail": "Action non autorisée."}, status=403)

    users_col.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"password": hash_password(temp_password), "mustChangePassword": True}}
    )

    # Mark request as resolved
    col = get_collection("password_reset_requests")
    col.update_many(
        {"userId": user_id, "status": "pending"},
        {"$set": {"status": "resolved", "resolvedAt": dt.datetime.utcnow().isoformat(),
                  "resolvedBy": caller.id}}
    )

    # Notify the user
    notifs_col = get_collection("notifications")
    notifs_col.insert_one({
        "userId":    user_id,
        "type":      "temp_password_set",
        "message":   "Un mot de passe temporaire vous a été attribué. Connectez-vous et changez-le.",
        "link":      "/profil",
        "read":      False,
        "createdAt": dt.datetime.utcnow().isoformat(),
    })

    return JsonResponse({"detail": "Mot de passe temporaire défini avec succès."})


@csrf_exempt
@jwt_required(roles={"doctor", "admin", "adminIT"})
def change_password(request: HttpRequest) -> JsonResponse:
    """Authenticated user changes their own password (clears mustChangePassword flag)."""
    if request.method != "POST":
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)

    caller = get_current_user(request)
    if not caller:
        return JsonResponse({"detail": "Non autorisé."}, status=401)

    data = _parse_body(request)
    new_password = data.get("password") or ""
    if len(new_password) < 8:
        return JsonResponse({"detail": "Le mot de passe doit contenir au moins 8 caractères."}, status=400)

    from bson import ObjectId
    users_col = get_collection("users")
    users_col.update_one(
        {"_id": ObjectId(caller.id)},
        {"$set": {"password": hash_password(new_password), "mustChangePassword": False}}
    )
    return JsonResponse({"detail": "Mot de passe modifié avec succès."})


@csrf_exempt
def refresh_token_view(request: HttpRequest) -> JsonResponse:
    """Renouvelle l'access token à partir d'un refresh token valide."""
    if request.method != "POST":
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)

    data = _parse_body(request)
    refresh = data.get("refresh", "").strip()
    if not refresh:
        return JsonResponse({"detail": "Refresh token manquant."}, status=400)

    payload = decode_token(refresh)
    if not payload or payload.get("type") != "refresh":
        return JsonResponse({"detail": "Refresh token invalide ou expiré."}, status=401)

    blacklist_col = get_collection("token_blacklist")
    if blacklist_col.find_one({"token": refresh}):
        return JsonResponse({"detail": "Session révoquée. Veuillez vous reconnecter."}, status=401)

    users_col = get_collection("users")
    user_doc = users_col.find_one({"_id": ObjectId(payload["sub"])})
    if not user_doc:
        return JsonResponse({"detail": "Utilisateur introuvable."}, status=401)

    new_access = create_access_token(user_doc)
    return JsonResponse({"access": new_access})


@csrf_exempt
def logout_view(request: HttpRequest) -> JsonResponse:
    """Blackliste le refresh token pour invalider la session côté serveur."""
    if request.method != "POST":
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)

    data = _parse_body(request)
    refresh = data.get("refresh", "").strip()
    if refresh:
        payload = decode_token(refresh)
        if payload and payload.get("type") == "refresh":
            blacklist_col = get_collection("token_blacklist")
            blacklist_col.update_one(
                {"token": refresh},
                {"$set": {
                    "token": refresh,
                    "user_id": payload.get("sub"),
                    "exp": payload.get("exp"),
                    "blacklisted_at": dt.datetime.utcnow().isoformat(),
                }},
                upsert=True,
            )
    return JsonResponse({"detail": "Déconnecté."})
