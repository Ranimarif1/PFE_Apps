from __future__ import annotations

import datetime as dt
import os
import shutil
import subprocess
from pathlib import Path
from typing import Any, Dict

from django.conf import settings
from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt

from core.auth import jwt_required
from core.mongo import get_collection, serialize_document

CORPUS_ROOT  = Path(getattr(settings, "LIFECYCLE_CORPUS_ROOT", "/opt/corpus"))
MEDIA_AUDIOS = settings.MEDIA_ROOT / "audios"


def _dir_size_bytes(path: Path) -> int:
    if not path.exists():
        return 0
    total = 0
    try:
        for f in path.rglob("*"):
            if f.is_file():
                try:
                    total += f.stat().st_size
                except OSError:
                    pass
    except Exception:
        pass
    return total


def _corpus_file_stats() -> Dict[str, int]:
    if not CORPUS_ROOT.exists():
        return {"flac_count": 0, "corpus_size_bytes": 0, "frozen_testset_count": 0}

    flac_count = corpus_size = 0
    frozen_dir = CORPUS_ROOT / "frozen_testset"

    for f in CORPUS_ROOT.rglob("*.flac"):
        if frozen_dir in f.parents or f.parent == frozen_dir:
            continue
        flac_count += 1
        try:
            corpus_size += f.stat().st_size
        except OSError:
            pass

    frozen_count = 0
    if frozen_dir.exists():
        frozen_count = sum(1 for f in frozen_dir.glob("*.flac"))

    return {
        "flac_count":          flac_count,
        "corpus_size_bytes":   corpus_size,
        "frozen_testset_count": frozen_count,
    }


@csrf_exempt
@jwt_required(roles={"adminIT"})
def lifecycle_stats(request: HttpRequest) -> JsonResponse:
    if request.method != "GET":
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)

    grace_days     = getattr(settings, "LIFECYCLE_GRACE_PERIOD_DAYS",    30)
    draft_max_days = getattr(settings, "LIFECYCLE_DRAFT_MAX_AGE_DAYS",   365)
    retention_days = getattr(settings, "LIFECYCLE_CORPUS_RETENTION_DAYS", 1460)
    testset_size   = getattr(settings, "LIFECYCLE_FROZEN_TESTSET_SIZE",  500)

    reports_col = get_collection("reports")

    status_pipeline = [
        {"$match": {"source": {"$ne": "note"}}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    status_counts: Dict[str, int] = {
        doc["_id"]: doc["count"]
        for doc in reports_col.aggregate(status_pipeline)
    }

    phase1_pending = reports_col.count_documents({
        "status":     {"$in": ["saved", "validated"]},
        "audioId":    {"$ne": None, "$exists": True},
        "corpusPath": {"$exists": False},
    })
    phase2_pending = reports_col.count_documents({
        "status":              "draft",
        "audioId":             {"$ne": None, "$exists": True},
        "draftAudioDeletedAt": {"$exists": False},
    })
    phase3_pending = reports_col.count_documents({
        "status":           {"$in": ["saved", "validated"]},
        "corpusPath":       {"$ne": None, "$exists": True},
        "pinnedForCorpus":  {"$ne": True},
    })

    corpus_stats    = _corpus_file_stats()
    media_aud_size  = _dir_size_bytes(MEDIA_AUDIOS)
    corpus_dir_size = _dir_size_bytes(CORPUS_ROOT)

    runs_col = get_collection("lifecycle_runs")
    last_run_doc = runs_col.find_one({}, sort=[("startedAt", -1)])
    last_run: Any = None
    if last_run_doc:
        last_run = {
            "startedAt":  last_run_doc.get("startedAt"),
            "endedAt":    last_run_doc.get("endedAt"),
            "durationS":  last_run_doc.get("durationS"),
            "phase":      last_run_doc.get("phase"),
            "stats":      last_run_doc.get("stats"),
        }

    return JsonResponse({
        "report_counts": {
            "draft":     status_counts.get("draft",     0),
            "saved":     status_counts.get("saved",     0),
            "validated": status_counts.get("validated", 0),
            "total":     sum(status_counts.values()),
        },
        "phase_pending": {
            "phase1": phase1_pending,
            "phase2": phase2_pending,
            "phase3": phase3_pending,
        },
        "corpus": {
            **corpus_stats,
            "corpus_dir_size_bytes": corpus_dir_size,
        },
        "disk": {
            "media_audios_size_bytes": media_aud_size,
        },
        "last_run": last_run,
        "settings": {
            "grace_period_days":     grace_days,
            "draft_max_age_days":    draft_max_days,
            "corpus_retention_days": retention_days,
            "frozen_testset_size":   testset_size,
        },
    })


@csrf_exempt
@jwt_required(roles={"adminIT"})
def lifecycle_run(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)

    import json as _json
    try:
        body = _json.loads(request.body.decode("utf-8"))
    except Exception:
        body = {}

    dry_run = bool(body.get("dry_run", True))
    phase   = str(body.get("phase", "all"))
    if phase not in ("1", "2", "3", "all"):
        return JsonResponse({"detail": "Phase invalide. Valeurs: 1, 2, 3, all."}, status=400)

    cmd = [
        "python", str(settings.BASE_DIR / "manage.py"),
        "lifecycle_cleanup",
        f"--phase={phase}",
    ]
    if dry_run:
        cmd.append("--dry-run")

    env = {**os.environ, "DJANGO_SETTINGS_MODULE": "settings"}

    try:
        result = subprocess.run(
            cmd,
            capture_output=True, text=True,
            timeout=300,
            cwd=str(settings.BASE_DIR),
            env=env,
        )
    except subprocess.TimeoutExpired:
        return JsonResponse(
            {"detail": "Timeout (> 5 min). Utilisez le timer systemd pour les gros volumes."},
            status=504,
        )
    except Exception as exc:
        return JsonResponse({"detail": str(exc)}, status=500)

    output = (result.stdout or "") + (result.stderr or "")
    return JsonResponse({
        "success":     result.returncode == 0,
        "dry_run":     dry_run,
        "phase":       phase,
        "return_code": result.returncode,
        "output":      output,
    })


@csrf_exempt
@jwt_required(roles={"adminIT"})
def lifecycle_config(request: HttpRequest) -> JsonResponse:
    config_col = get_collection("lifecycle_config")

    if request.method == "GET":
        doc = config_col.find_one({"key": "auto_enabled"})
        return JsonResponse({"auto_enabled": doc.get("value", True) if doc else True})

    if request.method == "POST":
        import json as _json
        try:
            body = _json.loads(request.body.decode("utf-8"))
        except Exception:
            body = {}
        enabled = bool(body.get("auto_enabled", True))
        config_col.update_one(
            {"key": "auto_enabled"},
            {"$set": {
                "key":       "auto_enabled",
                "value":     enabled,
                "updatedAt": dt.datetime.utcnow().isoformat(),
            }},
            upsert=True,
        )
        return JsonResponse({"auto_enabled": enabled})

    return JsonResponse({"detail": "Methode non autorisee."}, status=405)


@csrf_exempt
@jwt_required(roles={"adminIT"})
def lifecycle_history(request: HttpRequest) -> JsonResponse:
    if request.method != "GET":
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)

    runs = list(
        get_collection("lifecycle_runs")
        .find({})
        .sort("startedAt", -1)
        .limit(20)
    )
    return JsonResponse({"results": [serialize_document(r) for r in runs]})
