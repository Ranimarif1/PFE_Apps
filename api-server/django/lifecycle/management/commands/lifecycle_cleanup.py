from __future__ import annotations

import datetime as dt
import hashlib
import json
import shutil
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Set

from django.conf import settings
from django.core.management.base import BaseCommand

from core.mongo import get_collection

# ── Module-level constants (patchable in tests) ───────────────────────────────
GRACE      = getattr(settings, "LIFECYCLE_GRACE_PERIOD_DAYS",    30)
DRAFT_MAX  = getattr(settings, "LIFECYCLE_DRAFT_MAX_AGE_DAYS",   365)
RETENTION  = getattr(settings, "LIFECYCLE_CORPUS_RETENTION_DAYS", 1460)
TESTSET_SIZE = getattr(settings, "LIFECYCLE_FROZEN_TESTSET_SIZE", 500)
CORPUS_ROOT  = Path(getattr(settings, "LIFECYCLE_CORPUS_ROOT", "/opt/corpus"))
MEDIA_AUDIOS = settings.MEDIA_ROOT / "audios"

FINALIZED_STATUSES = {"saved", "validated"}


# ── Pure helpers ──────────────────────────────────────────────────────────────

def _parse_dt(value: str) -> dt.datetime:
    if not value:
        return dt.datetime.utcnow()
    try:
        return dt.datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
    except (ValueError, AttributeError):
        return dt.datetime.utcnow()


def _finalized_at(report: Dict[str, Any]) -> dt.datetime:
    """Return the best available finalization timestamp for a report."""
    for field in ("finalizedAt", "updatedAt", "createdAt"):
        val = report.get(field)
        if val:
            return _parse_dt(val)
    return dt.datetime.utcnow()


def _doctor_id_hash(doctor_id: str) -> str:
    return hashlib.sha256(doctor_id.encode()).hexdigest()[:16]


def _convert_to_flac(src: Path, dst: Path) -> bool:
    """Convert src audio to 16 kHz mono FLAC at dst. Returns True only if dst is valid."""
    dst.parent.mkdir(parents=True, exist_ok=True)
    convert = subprocess.run(
        ["ffmpeg", "-y", "-i", str(src),
         "-ar", "16000", "-ac", "1", "-compression_level", "8", str(dst)],
        capture_output=True, timeout=300,
    )
    if convert.returncode != 0:
        return False
    verify = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(dst), "-f", "null", "-"],
        capture_output=True, timeout=60,
    )
    return verify.returncode == 0


def _read_metadata(year: int) -> List[Dict[str, Any]]:
    path = CORPUS_ROOT / str(year) / "metadata.jsonl"
    if not path.exists():
        return []
    entries = []
    with path.open("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                try:
                    entries.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
    return entries


def _write_metadata(year: int, entries: List[Dict[str, Any]]) -> None:
    path = CORPUS_ROOT / str(year) / "metadata.jsonl"
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        for entry in entries:
            fh.write(json.dumps(entry, ensure_ascii=False) + "\n")


def _append_metadata(year: int, entry: Dict[str, Any]) -> None:
    path = CORPUS_ROOT / str(year) / "metadata.jsonl"
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry, ensure_ascii=False) + "\n")


def _load_testset_ids() -> Set[str]:
    idx = CORPUS_ROOT / "frozen_testset" / "index.json"
    if not idx.exists():
        return set()
    try:
        with idx.open("r", encoding="utf-8") as fh:
            return set(json.load(fh).get("report_ids", []))
    except Exception:
        return set()


# ── Command ───────────────────────────────────────────────────────────────────

class Command(BaseCommand):
    help = (
        "Lifecycle cleanup: archive finalized audio to FLAC corpus, purge abandoned "
        "drafts, remove old corpus audio while keeping transcriptions forever."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run", action="store_true",
            help="Simulate without making any changes",
        )
        parser.add_argument(
            "--phase", choices=["1", "2", "3", "all"], default="all",
            help="Which cleanup phase to run (default: all)",
        )
        parser.add_argument(
            "--check-auto", action="store_true",
            help="Abort if auto execution is disabled in settings (used by systemd timer)",
        )

    def handle(self, *args, **options):
        dry_run    = options["dry_run"]
        phase      = options["phase"]
        check_auto = options.get("check_auto", False)

        if check_auto:
            cfg = get_collection("lifecycle_config").find_one({"key": "auto_enabled"})
            if cfg and cfg.get("value") is False:
                self.stdout.write(self.style.WARNING(
                    "[lifecycle] execution automatique desactivee — arret."
                ))
                return

        started = dt.datetime.utcnow()

        self.stdout.write(self.style.NOTICE(
            f"[lifecycle] {'DRY-RUN ' if dry_run else ''}start — "
            f"phase={phase}  {started.isoformat()}"
        ))

        stats: Dict[str, Any] = {}

        if phase in ("1", "all"):
            stats["phase1"] = self._phase1(dry_run)

        if phase in ("2", "all"):
            stats["phase2"] = self._phase2(dry_run)

        if phase in ("3", "all"):
            stats["phase3"] = self._phase3(dry_run)

        if phase in ("1", "all") and not dry_run:
            stats["testset"] = self._build_frozen_testset()

        ended    = dt.datetime.utcnow()
        duration = (ended - started).total_seconds()

        self.stdout.write(self.style.SUCCESS(
            f"[lifecycle] done in {duration:.1f}s — {stats}"
        ))

        if not dry_run:
            self._save_run(started, ended, phase, stats)

    # ─── Phase 1 ─────────────────────────────────────────────────────────────

    def _phase1(self, dry_run: bool) -> Dict[str, int]:
        """Archive finalized audio (30 days – 2 years) to FLAC corpus."""
        from bson import ObjectId

        now       = dt.datetime.utcnow()
        min_age   = dt.timedelta(days=GRACE)
        max_age   = dt.timedelta(days=RETENTION)

        reports_col = get_collection("reports")
        audios_col  = get_collection("audios")

        candidates = list(reports_col.find({
            "status":     {"$in": list(FINALIZED_STATUSES)},
            "audioId":    {"$ne": None, "$exists": True},
            "corpusPath": {"$exists": False},
        }))

        processed = skipped = errors = 0

        for report in candidates:
            rid = str(report["_id"])
            fa  = _finalized_at(report)
            age = now - fa

            if age < min_age:
                self.stdout.write(f"  [p1] skip {rid}: grace ({age.days}d < {GRACE}d)")
                skipped += 1
                continue

            if age > max_age:
                self.stdout.write(
                    f"  [p1] skip {rid}: too old ({age.days}d > {RETENTION}d) — phase 3 territory"
                )
                skipped += 1
                continue

            try:
                audio_doc = audios_col.find_one({"_id": ObjectId(report["audioId"])})
            except Exception:
                audio_doc = None

            if not audio_doc:
                self.stdout.write(f"  [p1] skip {rid}: audio document not found")
                skipped += 1
                continue

            src = MEDIA_AUDIOS / audio_doc.get("filename", "")
            if not src.exists():
                self.stdout.write(f"  [p1] skip {rid}: source file missing ({src.name})")
                skipped += 1
                continue

            year = fa.year
            dst  = CORPUS_ROOT / str(year) / "audio" / f"{rid}.flac"
            self.stdout.write(f"  [p1] {rid}: {src.name} -> {dst.relative_to(CORPUS_ROOT)}")

            if dry_run:
                processed += 1
                continue

            if not _convert_to_flac(src, dst):
                self.stdout.write(self.style.ERROR(
                    f"  [p1] ERROR {rid}: ffmpeg failed — source preserved"
                ))
                errors += 1
                continue

            entry: Dict[str, Any] = {
                "report_id":          rid,
                "status":             report.get("status"),
                "audio_path":         str(dst),
                "raw_transcription":  report.get("originalContent") or "",
                "final_transcription": report.get("content") or "",
                "duration_sec":       audio_doc.get("duration", 0),
                "finalized_at":       fa.isoformat(),
                "specialty":          report.get("category", ""),
                "doctor_id_hash":     _doctor_id_hash(report.get("doctorId", "")),
            }
            _append_metadata(year, entry)

            try:
                src.unlink()
            except Exception as exc:
                self.stdout.write(self.style.WARNING(
                    f"  [p1] WARN {rid}: source not deleted — {exc}"
                ))

            corpus_path_str = str(dst)
            audios_col.update_one(
                {"_id": audio_doc["_id"]},
                {"$set": {"corpusPath": corpus_path_str, "corpusYear": year}},
            )
            reports_col.update_one(
                {"_id": report["_id"]},
                {"$set": {"corpusPath": corpus_path_str}},
            )

            processed += 1
            self.stdout.write(self.style.SUCCESS(f"  [p1] OK {rid}"))

        return {"processed": processed, "skipped": skipped, "errors": errors}

    # ─── Phase 2 ─────────────────────────────────────────────────────────────

    def _phase2(self, dry_run: bool) -> Dict[str, int]:
        """Delete audio for abandoned drafts older than DRAFT_MAX days."""
        from bson import ObjectId

        now    = dt.datetime.utcnow()
        cutoff = dt.timedelta(days=DRAFT_MAX)

        reports_col = get_collection("reports")
        audios_col  = get_collection("audios")

        candidates = list(reports_col.find({
            "status":               "draft",
            "audioId":              {"$ne": None, "$exists": True},
            "draftAudioDeletedAt":  {"$exists": False},
        }))

        deleted = skipped = errors = 0

        for report in candidates:
            rid     = str(report["_id"])
            created = _parse_dt(report.get("createdAt", ""))
            age     = now - created

            if age < cutoff:
                skipped += 1
                continue

            self.stdout.write(
                f"  [p2] {rid}: draft {age.days}d old — deleting audio"
            )

            if dry_run:
                deleted += 1
                continue

            try:
                audio_doc = audios_col.find_one({"_id": ObjectId(report["audioId"])})
                if audio_doc:
                    filepath = MEDIA_AUDIOS / audio_doc.get("filename", "")
                    if filepath.exists():
                        filepath.unlink()
                    audios_col.update_one(
                        {"_id": audio_doc["_id"]},
                        {"$set": {
                            "lifecycleDeleted":   True,
                            "lifecycleDeletedAt": now.isoformat(),
                        }},
                    )
            except Exception as exc:
                self.stdout.write(self.style.ERROR(f"  [p2] ERROR {rid}: {exc}"))
                errors += 1
                continue

            reports_col.update_one(
                {"_id": report["_id"]},
                {"$set": {"draftAudioDeletedAt": now.isoformat()}},
            )
            deleted += 1
            self.stdout.write(self.style.SUCCESS(f"  [p2] OK {rid}"))

        return {"deleted": deleted, "skipped": skipped, "errors": errors}

    # ─── Phase 3 ─────────────────────────────────────────────────────────────

    def _phase3(self, dry_run: bool) -> Dict[str, int]:
        """Delete corpus FLAC files older than RETENTION days (transcription kept forever)."""
        from bson import ObjectId

        now         = dt.datetime.utcnow()
        max_age     = dt.timedelta(days=RETENTION)
        testset_ids = _load_testset_ids()

        reports_col = get_collection("reports")
        audios_col  = get_collection("audios")

        candidates = list(reports_col.find({
            "status":     {"$in": list(FINALIZED_STATUSES)},
            "corpusPath": {"$ne": None, "$exists": True},
        }))

        deleted = skipped = errors = 0

        for report in candidates:
            rid = str(report["_id"])
            fa  = _finalized_at(report)
            age = now - fa

            if age <= max_age:
                skipped += 1
                continue

            if rid in testset_ids:
                self.stdout.write(f"  [p3] skip {rid}: in frozen testset")
                skipped += 1
                continue

            if report.get("pinnedForCorpus"):
                self.stdout.write(f"  [p3] skip {rid}: épinglé pour le corpus (stockage à vie)")
                skipped += 1
                continue

            corpus_path = Path(report["corpusPath"])
            self.stdout.write(
                f"  [p3] {rid}: age={age.days}d — deleting {corpus_path.name}"
            )

            if dry_run:
                deleted += 1
                continue

            if corpus_path.exists():
                try:
                    corpus_path.unlink()
                except Exception as exc:
                    self.stdout.write(self.style.ERROR(f"  [p3] ERROR {rid}: {exc}"))
                    errors += 1
                    continue

            year    = fa.year
            entries = _read_metadata(year)
            for e in entries:
                if e.get("report_id") == rid:
                    e["audio_path"] = None
            _write_metadata(year, entries)

            reports_col.update_one(
                {"_id": report["_id"]},
                {"$set": {"corpusPath": None}},
            )
            audio_id = report.get("audioId")
            if audio_id:
                try:
                    audios_col.update_one(
                        {"_id": ObjectId(audio_id)},
                        {"$set": {"corpusPath": None}},
                    )
                except Exception:
                    pass

            deleted += 1
            self.stdout.write(self.style.SUCCESS(f"  [p3] OK {rid}"))

        return {"deleted": deleted, "skipped": skipped, "errors": errors}

    # ─── Frozen testset ───────────────────────────────────────────────────────

    def _build_frozen_testset(self) -> Dict[str, int]:
        """Sample up to TESTSET_SIZE validated reports into the frozen benchmark set."""
        testset_dir = CORPUS_ROOT / "frozen_testset"
        idx_path    = testset_dir / "index.json"

        existing_ids = _load_testset_ids()
        if len(existing_ids) >= TESTSET_SIZE:
            self.stdout.write(
                f"  [testset] complete ({len(existing_ids)} entries) — nothing to do"
            )
            return {"size": len(existing_ids), "added": 0}

        reports_col = get_collection("reports")
        categories  = ["scanner", "irm", "radiographie", "echographie"]
        per_cat     = TESTSET_SIZE // len(categories)
        remainder   = TESTSET_SIZE - per_cat * len(categories)
        new_ids: List[str] = []

        for i, cat in enumerate(categories):
            quota = per_cat + (1 if i < remainder else 0)
            candidates = list(reports_col.find({
                "status":     "validated",
                "category":   cat,
                "corpusPath": {"$ne": None, "$exists": True},
            }).limit(quota * 3))  # oversample for missing files

            added_cat = 0
            for report in candidates:
                if added_cat >= quota:
                    break
                rid = str(report["_id"])
                if rid in existing_ids or rid in new_ids:
                    continue
                src = Path(report["corpusPath"])
                if not src.exists():
                    continue
                dst = testset_dir / f"{rid}.flac"
                testset_dir.mkdir(parents=True, exist_ok=True)
                try:
                    shutil.copy2(src, dst)
                    new_ids.append(rid)
                    added_cat += 1
                except Exception as exc:
                    self.stdout.write(self.style.WARNING(
                        f"  [testset] WARN {rid}: {exc}"
                    ))

        all_ids = list(existing_ids) + new_ids
        testset_dir.mkdir(parents=True, exist_ok=True)
        with idx_path.open("w", encoding="utf-8") as fh:
            json.dump(
                {"report_ids": all_ids, "built_at": dt.datetime.utcnow().isoformat()},
                fh, ensure_ascii=False,
            )

        self.stdout.write(self.style.SUCCESS(
            f"  [testset] added {len(new_ids)} — total={len(all_ids)}"
        ))
        return {"size": len(all_ids), "added": len(new_ids)}

    # ─── Run history ──────────────────────────────────────────────────────────

    def _save_run(
        self,
        started:  dt.datetime,
        ended:    dt.datetime,
        phase:    str,
        stats:    Dict[str, Any],
    ) -> None:
        try:
            get_collection("lifecycle_runs").insert_one({
                "startedAt":  started.isoformat(),
                "endedAt":    ended.isoformat(),
                "durationS":  (ended - started).total_seconds(),
                "phase":      phase,
                "stats":      stats,
            })
        except Exception as exc:
            self.stdout.write(self.style.WARNING(f"  [run] history not saved: {exc}"))
