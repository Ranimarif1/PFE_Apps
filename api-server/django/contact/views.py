from __future__ import annotations

import json
import re
from typing import Any, Dict

from django.conf import settings
from django.core.mail import EmailMessage
from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt

CONTACT_RECIPIENT = "contact.reportease@gmail.com"
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _parse_body(request: HttpRequest) -> Dict[str, Any]:
    try:
        data = json.loads(request.body.decode("utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


@csrf_exempt
def send_contact(request: HttpRequest) -> JsonResponse:
    """Public endpoint — sends a contact-form message to the team inbox via SMTP."""
    if request.method != "POST":
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)

    data = _parse_body(request)
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    message = (data.get("message") or "").strip()

    if not name or not email or not message:
        return JsonResponse({"detail": "Nom, email et message sont requis."}, status=400)
    if not _EMAIL_RE.match(email):
        return JsonResponse({"detail": "Adresse email invalide."}, status=400)

    try:
        EmailMessage(
            subject=f"[ReportEase] Message de {name}",
            body=f"Nom : {name}\nEmail : {email}\n\n{message}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[CONTACT_RECIPIENT],
            reply_to=[email],
        ).send(fail_silently=False)
    except Exception as exc:
        return JsonResponse({"detail": f"Erreur d'envoi de l'email : {exc}"}, status=500)

    return JsonResponse({"detail": "Message envoyé."}, status=201)