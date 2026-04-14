from __future__ import annotations

import datetime as dt
import json
import secrets
from typing import Any, Dict

from bson import ObjectId
from django.conf import settings
from django.core.mail import send_mail
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
    genre = (data.get("genre") or "").strip()

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
        "genre": genre,
        "photo": "",
        "createdAt": now,
    }
    inserted = users_col.insert_one(user_doc)
    created = users_col.find_one({"_id": inserted.inserted_id})

    # ── Notify all admins & adminIT accounts of the new registration ──
    try:
        admins = list(users_col.find(
            {"role": {"$in": ["admin", "adminIT"]}, "status": "validated"},
            {"email": 1}
        ))
        admin_emails = [a["email"] for a in admins if a.get("email")]
        if admin_emails:
            full_name = f"{prenom} {nom}".strip() or email
            send_mail(
                subject="Nouvelle demande d'inscription — ReportEase",
                message=(
                    f"Bonjour,\n\n"
                    f"Une nouvelle demande d'inscription vient d'être soumise sur ReportEase.\n\n"
                    f"Nom complet : {full_name}\n"
                    f"Email       : {email}\n"
                    f"Rôle        : {role}\n\n"
                    f"Veuillez vous connecter à la plateforme pour valider ou refuser ce compte :\n"
                    f"{settings.FRONTEND_URL}/admin/dashboard\n\n"
                    f"— L'équipe ReportEase\n"
                    f"CHU Fattouma-Bourguiba de Monastir"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=admin_emails,
                fail_silently=True,
            )
    except Exception:
        pass  # Never block registration because of a mail failure

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
                "genre": user.get("genre", ""),
                "photo": user.get("photo", ""),
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
            "genre": user.raw.get("genre", ""),
            "photo": user.raw.get("photo", ""),
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

    reason = (data.get("reason") or "").strip()

    users_col = get_collection("users")
    try:
        oid = ObjectId(user_id)
    except Exception:
        return JsonResponse({"detail": "Invalid user id."}, status=400)

    result = users_col.update_one({"_id": oid}, {"$set": {"status": new_status}})
    if result.matched_count == 0:
        return JsonResponse({"detail": "User not found."}, status=404)

    updated = users_col.find_one({"_id": oid})

    # ── Send decision email to the user ──
    mail_error: str | None = None
    if new_status in {"validated", "refused"}:
        try:
            full_name = f"{updated.get('prenom', '')} {updated.get('nom', '')}".strip() or updated["email"]
            if new_status == "validated":
                send_mail(
                    subject="Votre compte ReportEase a été validé ✓",
                    message=(
                        f"Bonjour {full_name},\n\n"
                        f"Votre demande d'inscription sur ReportEase a été examinée et votre compte a été validé.\n\n"
                        f"Vous pouvez maintenant vous connecter à la plateforme :\n"
                        f"{settings.FRONTEND_URL}/login\n\n"
                        f"Bienvenue au service de radiologie du CHU Fattouma-Bourguiba de Monastir.\n\n"
                        f"— L'équipe ReportEase"
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[updated["email"]],
                    fail_silently=False,
                )
            else:
                reason_section = (
                    f"\nMotif du refus :\n{reason}\n"
                    if reason else
                    "\nAucun motif spécifique n'a été indiqué. Vous pouvez contacter l'administration pour plus d'informations.\n"
                )
                send_mail(
                    subject="Votre demande d'inscription — ReportEase",
                    message=(
                        f"Bonjour {full_name},\n\n"
                        f"Après examen de votre dossier, nous avons le regret de vous informer que votre demande "
                        f"d'inscription sur ReportEase n'a pas pu être acceptée.\n"
                        f"{reason_section}\n"
                        f"Pour toute question, veuillez contacter l'administration du service de radiologie.\n\n"
                        f"— L'équipe ReportEase\n"
                        f"CHU Fattouma-Bourguiba de Monastir"
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[updated["email"]],
                    fail_silently=False,
                )
        except Exception as exc:
            mail_error = str(exc)

    response: dict = {"user": serialize_document(updated)}
    if mail_error:
        response["mail_warning"] = f"Statut mis à jour, mais l'email n'a pas pu être envoyé : {mail_error}"
    return JsonResponse(response)


@csrf_exempt
def delete_user(request: HttpRequest, user_id: str) -> JsonResponse:
    if request.method != "DELETE":
        return JsonResponse({"detail": "Method not allowed."}, status=405)

    current = get_current_user(request)
    if not current:
        return JsonResponse({"detail": "Authentication required."}, status=401)

    if current.role not in {"admin", "adminIT"}:
        return JsonResponse({"detail": "Permission denied."}, status=403)

    users_col = get_collection("users")
    try:
        oid = ObjectId(user_id)
    except Exception:
        return JsonResponse({"detail": "Invalid user id."}, status=400)

    user = users_col.find_one({"_id": oid})
    if not user:
        return JsonResponse({"detail": "User not found."}, status=404)

    # Admin can only delete doctors; AdminIT can only delete admins
    if current.role == "admin" and user.get("role") != "doctor":
        return JsonResponse({"detail": "Les admins ne peuvent supprimer que des médecins."}, status=403)
    if current.role == "adminIT" and user.get("role") != "admin":
        return JsonResponse({"detail": "L'Admin IT ne peut supprimer que des comptes admin."}, status=403)

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


@csrf_exempt
def update_profile(request: HttpRequest) -> JsonResponse:
    if request.method not in {"PUT", "PATCH"}:
        return JsonResponse({"detail": "Method not allowed."}, status=405)

    current = get_current_user(request)
    if not current:
        return JsonResponse({"detail": "Authentication required."}, status=401)

    data = _parse_body(request)
    updates: Dict[str, Any] = {}

    nom = (data.get("nom") or "").strip()
    prenom = (data.get("prenom") or "").strip()
    email = (data.get("email") or "").strip().lower()
    photo = data.get("photo")  # base64 data URI string
    password = data.get("password") or ""

    if nom:
        updates["nom"] = nom
    if prenom:
        updates["prenom"] = prenom
    if email:
        users_col_check = get_collection("users")
        existing = users_col_check.find_one({"email": email, "_id": {"$ne": ObjectId(current.id)}})
        if existing:
            return JsonResponse({"detail": "Email already in use."}, status=400)
        updates["email"] = email
    if photo is not None:
        updates["photo"] = photo
    if password:
        if len(password) < 6:
            return JsonResponse({"detail": "Password too short."}, status=400)
        updates["password"] = hash_password(password)

    if not updates:
        return JsonResponse({"detail": "Nothing to update."}, status=400)

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
    })


@csrf_exempt
def change_user_role(request: HttpRequest, user_id: str) -> JsonResponse:
    if request.method not in {"PUT", "PATCH"}:
        return JsonResponse({"detail": "Method not allowed."}, status=405)

    current = get_current_user(request)
    if not current:
        return JsonResponse({"detail": "Authentication required."}, status=401)

    if current.role not in {"admin", "adminIT"}:
        return JsonResponse({"detail": "Permission denied."}, status=403)

    data = _parse_body(request)
    new_role = (data.get("role") or "").strip()

    if new_role not in {"doctor", "admin"}:
        return JsonResponse({"detail": "Invalid role."}, status=400)

    users_col = get_collection("users")
    try:
        oid = ObjectId(user_id)
    except Exception:
        return JsonResponse({"detail": "Invalid user id."}, status=400)

    user = users_col.find_one({"_id": oid})
    if not user:
        return JsonResponse({"detail": "User not found."}, status=404)

    # Admin can only promote doctor → admin
    if current.role == "admin":
        if user.get("role") != "doctor" or new_role != "admin":
            return JsonResponse({"detail": "Les admins ne peuvent que promouvoir un médecin en admin."}, status=400)

    # AdminIT can only demote admin → doctor
    if current.role == "adminIT":
        if user.get("role") != "admin" or new_role != "doctor":
            return JsonResponse({"detail": "L'Admin IT ne peut que rétrograder un admin en médecin."}, status=400)

    users_col.update_one({"_id": oid}, {"$set": {"role": new_role}})
    updated = users_col.find_one({"_id": oid})
    return JsonResponse({"user": serialize_document(updated)})


@csrf_exempt
def forgot_password(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed."}, status=405)

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

    prenom = user.get("prenom", "")
    nom = user.get("nom", "")
    full_name = f"{prenom} {nom}".strip() or email
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"

    try:
        send_mail(
            subject="Réinitialisation de votre mot de passe — ReportEase",
            message=(
                f"Bonjour {full_name},\n\n"
                f"Vous avez demandé la réinitialisation de votre mot de passe ReportEase.\n\n"
                f"Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe :\n\n"
                f"{reset_url}\n\n"
                f"Ce lien est valable pendant 1 heure.\n\n"
                f"Si vous n'avez pas effectué cette demande, ignorez cet email.\n\n"
                f"L'équipe ReportEase\nCHU Fattouma-Bourguiba de Monastir"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
    except Exception as exc:
        return JsonResponse({"detail": f"Erreur SMTP : {exc}"}, status=500)

    return JsonResponse({"detail": success_msg})


@csrf_exempt
def reset_password(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed."}, status=405)

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

