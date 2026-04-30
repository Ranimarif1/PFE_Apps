"""One-time migration: convert base64 photos stored in MongoDB into files on disk.

Before this migration, the `photo` field on each user was a full base64 data URI
(e.g. "data:image/png;base64,iVBOR..."). After running it, the field becomes a
relative URL like "/media/avatars/user_<id>.png?v=<timestamp>" and the actual
bytes live under api-server/media/avatars/.

Run from api-server/django/:
    python migrate_avatars.py
"""
from __future__ import annotations

import os
import sys

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "settings")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from auth.views import _save_avatar  # noqa: E402
from core.mongo import get_collection  # noqa: E402


def main() -> None:
    users_col = get_collection("users")
    cursor = users_col.find(
        {"photo": {"$regex": "^data:image/"}},
        {"_id": 1, "photo": 1},
    )
    migrated = 0
    failed = 0
    for user in cursor:
        uid = str(user["_id"])
        try:
            url = _save_avatar(uid, user["photo"])
            users_col.update_one({"_id": user["_id"]}, {"$set": {"photo": url}})
            migrated += 1
            print(f"[ok] user {uid} → {url}")
        except Exception as exc:
            failed += 1
            print(f"[FAIL] user {uid}: {exc}")
    print(f"\nDone. Migrated: {migrated}. Failed: {failed}.")


if __name__ == "__main__":
    main()
