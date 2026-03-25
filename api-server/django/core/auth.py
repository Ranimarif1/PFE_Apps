from __future__ import annotations

import datetime as dt
from dataclasses import dataclass
from typing import Any, Callable, Dict, Iterable, Optional

import bcrypt
import jwt
from bson import ObjectId
from django.conf import settings
from django.http import HttpRequest, JsonResponse

from .mongo import get_collection


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def _jwt_now() -> dt.datetime:
    return dt.datetime.now(tz=dt.timezone.utc)


def create_access_token(user: Dict[str, Any]) -> str:
    now = _jwt_now()
    payload = {
        "sub": str(user["_id"]),
        "email": user["email"],
        "role": user["role"],
        "status": user["status"],
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int((now + settings.JWT_ACCESS_TOKEN_LIFETIME).timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user: Dict[str, Any]) -> str:
    now = _jwt_now()
    payload = {
        "sub": str(user["_id"]),
        "email": user["email"],
        "role": user["role"],
        "status": user["status"],
        "type": "refresh",
        "iat": int(now.timestamp()),
        "exp": int((now + settings.JWT_REFRESH_TOKEN_LIFETIME).timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None


def get_token_from_request(request: HttpRequest) -> Optional[str]:
    auth_header = request.headers.get("Authorization") or request.META.get("HTTP_AUTHORIZATION")
    if not auth_header:
        return None
    parts = auth_header.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None


@dataclass
class CurrentUser:
    id: str
    email: str
    role: str
    status: str
    raw: Dict[str, Any]

    @property
    def is_validated(self) -> bool:
        return self.status == "validated"


def get_current_user(request: HttpRequest) -> Optional[CurrentUser]:
    token = get_token_from_request(request)
    if not token:
        return None
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None
    users_col = get_collection("users")
    user_doc = users_col.find_one({"_id": ObjectId(payload["sub"])})
    if not user_doc:
        return None
    return CurrentUser(
        id=str(user_doc["_id"]),
        email=user_doc["email"],
        role=user_doc["role"],
        status=user_doc["status"],
        raw=user_doc,
    )


def jwt_required(roles: Optional[Iterable[str]] = None, require_validated: bool = True) -> Callable:
    def decorator(view_func: Callable) -> Callable:
        def _wrapped(request: HttpRequest, *args: Any, **kwargs: Any):
            user = get_current_user(request)
            if not user:
                return JsonResponse({"detail": "Authentication credentials were not provided or invalid."}, status=401)

            if require_validated and not user.is_validated:
                return JsonResponse({"detail": "User is not validated."}, status=403)

            if roles is not None and user.role not in roles:
                return JsonResponse({"detail": "Permission denied."}, status=403)

            request.user = user  # type: ignore[attr-defined]
            return view_func(request, *args, **kwargs)

        return _wrapped

    return decorator

