from __future__ import annotations

import os
from functools import lru_cache
from typing import Any, Dict

from django.conf import settings
from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database


@lru_cache(maxsize=1)
def get_mongo_client() -> MongoClient:
    uri = getattr(settings, "MONGODB_URI", os.getenv("MONGODB_URI", "mongodb://localhost:27017"))
    return MongoClient(uri)


def get_db() -> Database:
    client = get_mongo_client()
    db_name = getattr(settings, "MONGODB_DB_NAME", os.getenv("MONGODB_DB_NAME", "radiology_platform"))
    return client[db_name]


def get_collection(name: str) -> Collection:
    return get_db()[name]


def serialize_document(doc: Dict[str, Any]) -> Dict[str, Any]:
    if not doc:
        return doc
    result = dict(doc)
    _id = result.get("_id")
    if _id is not None:
        result["_id"] = str(_id)
    return result

