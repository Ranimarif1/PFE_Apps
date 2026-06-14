"""
Unit tests for lifecycle_cleanup management command.

All MongoDB and filesystem operations are mocked — no real DB or files needed.
Run with: python manage.py test lifecycle
"""
from __future__ import annotations

import datetime as dt
import json
import os
import sys
from pathlib import Path
from unittest import TestCase
from unittest.mock import MagicMock, patch, call

# ── Helpers to build fake documents ──────────────────────────────────────────

def _oid():
    from bson import ObjectId
    return ObjectId()


def _report(status: str, age_days: int, *, has_audio=True, has_corpus=False,
             finalized_age_days: int | None = None, source: str | None = None):
    now = dt.datetime.utcnow()
    created = now - dt.timedelta(days=age_days)
    fin_dt  = now - dt.timedelta(days=finalized_age_days) if finalized_age_days is not None else created
    doc = {
        "_id":             _oid(),
        "status":          status,
        "doctorId":        "doctor_abc",
        "category":        "scanner",
        "content":         "Rapport final",
        "originalContent": "Rapport brut",
        "createdAt":       created.isoformat(),
        "updatedAt":       created.isoformat(),
        "finalizedAt":     fin_dt.isoformat(),
    }
    if has_audio:
        doc["audioId"] = str(_oid())
    if has_corpus:
        doc["corpusPath"] = f"/opt/corpus/2024/audio/{doc['_id']}.flac"
    if source:
        doc["source"] = source
    return doc


def _audio(filename: str = "exam_abc.webm", duration: int = 90):
    return {"_id": _oid(), "filename": filename, "duration": duration, "mimeType": "audio/webm"}


def _make_cmd():
    """Instantiate the management command with muted output."""
    import django
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "settings")
    try:
        django.setup()
    except RuntimeError:
        pass

    from lifecycle.management.commands.lifecycle_cleanup import Command
    cmd = Command()
    cmd.stdout = MagicMock()
    cmd.stdout.write = MagicMock()
    mock_style = MagicMock()
    mock_style.NOTICE  = lambda x: x
    mock_style.SUCCESS = lambda x: x
    mock_style.ERROR   = lambda x: x
    mock_style.WARNING = lambda x: x
    cmd.style = mock_style
    return cmd


# ── Phase 1 ───────────────────────────────────────────────────────────────────

class TestPhase1GracePeriod(TestCase):

    @patch("lifecycle.management.commands.lifecycle_cleanup.get_collection")
    def test_report_within_grace_not_processed(self, mock_gc):
        """Reports younger than GRACE days must not enter the corpus."""
        cmd = _make_cmd()
        rep = _report("saved", age_days=10)  # 10 < 30 days grace
        col = MagicMock()
        col.find.return_value = [rep]
        mock_gc.return_value = col

        with patch("lifecycle.management.commands.lifecycle_cleanup.GRACE", 30):
            result = cmd._phase1(dry_run=False)

        self.assertEqual(result["skipped"], 1)
        self.assertEqual(result.get("processed", 0), 0)
        col.update_one.assert_not_called()


class TestPhase1FfmpegFailure(TestCase):

    @patch("lifecycle.management.commands.lifecycle_cleanup.get_collection")
    @patch("lifecycle.management.commands.lifecycle_cleanup._convert_to_flac", return_value=False)
    def test_ffmpeg_failure_preserves_source(self, mock_ffmpeg, mock_gc):
        """If ffmpeg fails the source file must NOT be deleted."""
        cmd = _make_cmd()
        rep = _report("saved", age_days=100)
        aud = _audio()
        rep["audioId"] = str(aud["_id"])

        reports_col = MagicMock()
        audios_col  = MagicMock()
        reports_col.find.return_value = [rep]
        audios_col.find_one.return_value = aud

        mock_gc.side_effect = lambda name: reports_col if name == "reports" else audios_col

        mock_src = MagicMock()
        mock_src.exists.return_value = True

        with patch("lifecycle.management.commands.lifecycle_cleanup.MEDIA_AUDIOS") as mad:
            mad.__truediv__ = MagicMock(return_value=mock_src)
            result = cmd._phase1(dry_run=False)

        mock_src.unlink.assert_not_called()
        self.assertEqual(result["errors"], 1)
        self.assertEqual(result.get("processed", 0), 0)


class TestPhase1DryRun(TestCase):

    @patch("lifecycle.management.commands.lifecycle_cleanup.get_collection")
    def test_dry_run_makes_no_changes(self, mock_gc):
        """--dry-run must not write to MongoDB or the filesystem."""
        cmd = _make_cmd()
        rep = _report("validated", age_days=100)
        aud = _audio()
        rep["audioId"] = str(aud["_id"])

        reports_col = MagicMock()
        audios_col  = MagicMock()
        reports_col.find.return_value = [rep]
        audios_col.find_one.return_value = aud

        mock_gc.side_effect = lambda name: reports_col if name == "reports" else audios_col

        mock_src = MagicMock()
        mock_src.exists.return_value = True

        with patch("lifecycle.management.commands.lifecycle_cleanup.MEDIA_AUDIOS") as mad:
            mad.__truediv__ = MagicMock(return_value=mock_src)
            result = cmd._phase1(dry_run=True)

        reports_col.update_one.assert_not_called()
        audios_col.update_one.assert_not_called()
        mock_src.unlink.assert_not_called()
        self.assertEqual(result["processed"], 1)


class TestPhase1CorpusEntry(TestCase):

    @patch("lifecycle.management.commands.lifecycle_cleanup.get_collection")
    @patch("lifecycle.management.commands.lifecycle_cleanup._convert_to_flac", return_value=True)
    @patch("lifecycle.management.commands.lifecycle_cleanup._append_metadata")
    def test_saved_report_enters_corpus(self, mock_meta, mock_ffmpeg, mock_gc):
        """'saved' report 30–730 days old must be converted and added to corpus."""
        cmd = _make_cmd()
        rep = _report("saved", age_days=200)
        aud = _audio()
        rep["audioId"] = str(aud["_id"])

        reports_col = MagicMock()
        audios_col  = MagicMock()
        reports_col.find.return_value = [rep]
        audios_col.find_one.return_value = aud
        mock_gc.side_effect = lambda name: reports_col if name == "reports" else audios_col

        mock_src = MagicMock()
        mock_src.exists.return_value = True

        with patch("lifecycle.management.commands.lifecycle_cleanup.MEDIA_AUDIOS") as mad:
            mad.__truediv__ = MagicMock(return_value=mock_src)
            with patch("lifecycle.management.commands.lifecycle_cleanup.CORPUS_ROOT"):
                result = cmd._phase1(dry_run=False)

        mock_ffmpeg.assert_called_once()
        mock_meta.assert_called_once()
        self.assertEqual(result["processed"], 1)

    @patch("lifecycle.management.commands.lifecycle_cleanup.get_collection")
    @patch("lifecycle.management.commands.lifecycle_cleanup._convert_to_flac", return_value=True)
    @patch("lifecycle.management.commands.lifecycle_cleanup._append_metadata")
    def test_validated_report_enters_corpus(self, mock_meta, mock_ffmpeg, mock_gc):
        """'validated' report 30–730 days old must also enter corpus."""
        cmd = _make_cmd()
        rep = _report("validated", age_days=365)
        aud = _audio()
        rep["audioId"] = str(aud["_id"])

        reports_col = MagicMock()
        audios_col  = MagicMock()
        reports_col.find.return_value = [rep]
        audios_col.find_one.return_value = aud
        mock_gc.side_effect = lambda name: reports_col if name == "reports" else audios_col

        mock_src = MagicMock()
        mock_src.exists.return_value = True

        with patch("lifecycle.management.commands.lifecycle_cleanup.MEDIA_AUDIOS") as mad:
            mad.__truediv__ = MagicMock(return_value=mock_src)
            with patch("lifecycle.management.commands.lifecycle_cleanup.CORPUS_ROOT"):
                result = cmd._phase1(dry_run=False)

        mock_ffmpeg.assert_called_once()
        mock_meta.assert_called_once()
        self.assertEqual(result["processed"], 1)


# ── Phase 2 ───────────────────────────────────────────────────────────────────

class TestPhase2YoungDraft(TestCase):

    @patch("lifecycle.management.commands.lifecycle_cleanup.get_collection")
    def test_young_draft_audio_preserved(self, mock_gc):
        """Draft younger than DRAFT_MAX days must not have its audio deleted."""
        cmd = _make_cmd()
        rep = _report("draft", age_days=180)  # < 365 days

        reports_col = MagicMock()
        audios_col  = MagicMock()
        reports_col.find.return_value = [rep]
        mock_gc.side_effect = lambda name: reports_col if name == "reports" else audios_col

        result = cmd._phase2(dry_run=False)

        audios_col.update_one.assert_not_called()
        reports_col.update_one.assert_not_called()
        self.assertEqual(result["skipped"], 1)


class TestPhase2OldDraft(TestCase):

    @patch("lifecycle.management.commands.lifecycle_cleanup.get_collection")
    def test_old_draft_audio_deleted(self, mock_gc):
        """Draft older than DRAFT_MAX days must have its audio file deleted."""
        cmd = _make_cmd()
        rep = _report("draft", age_days=400)
        aud = _audio()
        rep["audioId"] = str(aud["_id"])

        reports_col = MagicMock()
        audios_col  = MagicMock()
        reports_col.find.return_value = [rep]
        audios_col.find_one.return_value = aud
        mock_gc.side_effect = lambda name: reports_col if name == "reports" else audios_col

        mock_fp = MagicMock()
        mock_fp.exists.return_value = True

        with patch("lifecycle.management.commands.lifecycle_cleanup.MEDIA_AUDIOS") as mad:
            mad.__truediv__ = MagicMock(return_value=mock_fp)
            result = cmd._phase2(dry_run=False)

        mock_fp.unlink.assert_called_once()
        audios_col.update_one.assert_called_once()
        reports_col.update_one.assert_called_once()
        self.assertEqual(result["deleted"], 1)

    @patch("lifecycle.management.commands.lifecycle_cleanup.get_collection")
    @patch("lifecycle.management.commands.lifecycle_cleanup._append_metadata")
    def test_old_draft_not_in_corpus(self, mock_meta, mock_gc):
        """Abandoned drafts must NEVER be added to the training corpus."""
        cmd = _make_cmd()
        rep = _report("draft", age_days=400)
        aud = _audio()
        rep["audioId"] = str(aud["_id"])

        reports_col = MagicMock()
        audios_col  = MagicMock()
        reports_col.find.return_value = [rep]
        audios_col.find_one.return_value = aud
        mock_gc.side_effect = lambda name: reports_col if name == "reports" else audios_col

        mock_fp = MagicMock()
        mock_fp.exists.return_value = True

        with patch("lifecycle.management.commands.lifecycle_cleanup.MEDIA_AUDIOS") as mad:
            mad.__truediv__ = MagicMock(return_value=mock_fp)
            cmd._phase2(dry_run=False)

        mock_meta.assert_not_called()


# ── Phase 3 ───────────────────────────────────────────────────────────────────

class TestPhase3FrozenTestset(TestCase):

    @patch("lifecycle.management.commands.lifecycle_cleanup._load_testset_ids")
    @patch("lifecycle.management.commands.lifecycle_cleanup.get_collection")
    def test_frozen_testset_never_deleted(self, mock_gc, mock_ids):
        """Entries in the frozen testset must be skipped in phase 3."""
        cmd = _make_cmd()
        rep = _report("validated", age_days=800, has_corpus=True)
        rep_id = str(rep["_id"])
        mock_ids.return_value = {rep_id}

        reports_col = MagicMock()
        reports_col.find.return_value = [rep]
        mock_gc.return_value = reports_col

        result = cmd._phase3(dry_run=False)

        reports_col.update_one.assert_not_called()
        self.assertEqual(result.get("skipped", 0), 1)


class TestPhase3OldCorpus(TestCase):

    @patch("lifecycle.management.commands.lifecycle_cleanup._load_testset_ids", return_value=set())
    @patch("lifecycle.management.commands.lifecycle_cleanup._read_metadata", return_value=[])
    @patch("lifecycle.management.commands.lifecycle_cleanup._write_metadata")
    @patch("lifecycle.management.commands.lifecycle_cleanup.get_collection")
    def test_old_corpus_flac_deleted(self, mock_gc, mock_write, mock_read, mock_ids):
        """Corpus FLAC older than RETENTION days must be deleted (transcription kept)."""
        cmd = _make_cmd()
        rep = _report("validated", age_days=800, has_corpus=True)

        reports_col = MagicMock()
        audios_col  = MagicMock()
        reports_col.find.return_value = [rep]
        mock_gc.side_effect = lambda name: reports_col if name == "reports" else audios_col

        mock_flac = MagicMock()
        mock_flac.exists.return_value = True

        with patch("lifecycle.management.commands.lifecycle_cleanup.Path", return_value=mock_flac):
            result = cmd._phase3(dry_run=False)

        mock_flac.unlink.assert_called_once()
        reports_col.update_one.assert_called()
        self.assertGreaterEqual(result.get("deleted", 0), 1)


# ── Settings thresholds ───────────────────────────────────────────────────────

class TestSettingsThresholds(TestCase):

    @patch("lifecycle.management.commands.lifecycle_cleanup.GRACE", 60)
    @patch("lifecycle.management.commands.lifecycle_cleanup.get_collection")
    def test_custom_grace_period_respected(self, mock_gc):
        """With GRACE=60, a 50-day report must be skipped."""
        cmd = _make_cmd()
        rep = _report("saved", age_days=50)
        col = MagicMock()
        col.find.return_value = [rep]
        mock_gc.return_value = col

        result = cmd._phase1(dry_run=False)
        self.assertEqual(result["skipped"], 1)

    @patch("lifecycle.management.commands.lifecycle_cleanup.DRAFT_MAX", 180)
    @patch("lifecycle.management.commands.lifecycle_cleanup.get_collection")
    def test_custom_draft_max_age_respected(self, mock_gc):
        """With DRAFT_MAX=180, a 200-day draft must be cleaned up."""
        cmd = _make_cmd()
        rep = _report("draft", age_days=200)
        aud = _audio()
        rep["audioId"] = str(aud["_id"])

        reports_col = MagicMock()
        audios_col  = MagicMock()
        reports_col.find.return_value = [rep]
        audios_col.find_one.return_value = aud
        mock_gc.side_effect = lambda name: reports_col if name == "reports" else audios_col

        mock_fp = MagicMock()
        mock_fp.exists.return_value = True

        with patch("lifecycle.management.commands.lifecycle_cleanup.MEDIA_AUDIOS") as mad:
            mad.__truediv__ = MagicMock(return_value=mock_fp)
            result = cmd._phase2(dry_run=False)

        self.assertEqual(result["deleted"], 1)


# ── Pure helper functions ─────────────────────────────────────────────────────

class TestHelpers(TestCase):

    def test_doctor_id_hash_length_and_determinism(self):
        from lifecycle.management.commands.lifecycle_cleanup import _doctor_id_hash
        h = _doctor_id_hash("abc123")
        self.assertEqual(len(h), 16)
        self.assertEqual(h, _doctor_id_hash("abc123"))
        self.assertNotEqual(h, _doctor_id_hash("different"))

    def test_parse_dt_fallback(self):
        from lifecycle.management.commands.lifecycle_cleanup import _parse_dt
        result = _parse_dt("")
        self.assertIsInstance(result, dt.datetime)

    def test_parse_dt_iso(self):
        from lifecycle.management.commands.lifecycle_cleanup import _parse_dt
        result = _parse_dt("2024-06-01T12:00:00")
        self.assertEqual(result.year, 2024)
        self.assertEqual(result.month, 6)

    def test_finalized_at_prefers_finalizedAt(self):
        from lifecycle.management.commands.lifecycle_cleanup import _finalized_at
        report = {
            "finalizedAt": "2024-01-01T00:00:00",
            "updatedAt":   "2025-01-01T00:00:00",
            "createdAt":   "2023-01-01T00:00:00",
        }
        result = _finalized_at(report)
        self.assertEqual(result.year, 2024)

    def test_finalized_at_fallback_updatedAt(self):
        from lifecycle.management.commands.lifecycle_cleanup import _finalized_at
        report = {
            "updatedAt": "2025-03-01T00:00:00",
            "createdAt": "2023-01-01T00:00:00",
        }
        result = _finalized_at(report)
        self.assertEqual(result.year, 2025)
