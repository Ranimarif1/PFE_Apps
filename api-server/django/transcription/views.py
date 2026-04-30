from __future__ import annotations

import os
import tempfile

import numpy as np
import torch
import av
import librosa
from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from transformers import WhisperForConditionalGeneration, WhisperProcessor

from core.auth import jwt_required
from .normalisation import normalize
from .ponctuation import process, correct_with_ollama, diff_corrections

# ── Constants ─────────────────────────────────────────────────────────────────
MODEL_ID      = "amnbk/whisper-medium-medical-fr-v2"
BASE_MODEL_ID = "openai/whisper-medium"  # fallback for missing preprocessor_config.json
SAMPLE_RATE   = 16_000
_MAX_CHUNK  = 28 * SAMPLE_RATE   # 28 s — Whisper 30 s window with safety margin
_MIN_CHUNK  = SAMPLE_RATE // 2   # ignore segments < 0.5 s

# ── Lazy singleton ─────────────────────────────────────────────────────────────
_processor: WhisperProcessor | None = None
_model: WhisperForConditionalGeneration | None = None
_device: str | None = None


def _load_model():
    global _processor, _model, _device
    if _model is not None:
        return _processor, _model, _device

    # Workaround: this fine-tuned model stores extra_special_tokens as a list
    # in tokenizer_config.json, but some transformers versions expect a dict.
    # The method may not exist in all versions (e.g. 4.46.x), so guard the patch.
    from transformers.tokenization_utils_base import PreTrainedTokenizerBase
    _orig = getattr(PreTrainedTokenizerBase, '_set_model_specific_special_tokens', None)
    if _orig is not None:
        def _patched(self, special_tokens=None):
            if isinstance(special_tokens, list):
                special_tokens = {}
            _orig(self, special_tokens=special_tokens)
        PreTrainedTokenizerBase._set_model_specific_special_tokens = _patched

    try:
        _device = "cuda" if torch.cuda.is_available() else "cpu"

        # The fine-tuned model may lack preprocessor_config.json (feature extractor).
        # Feature extraction doesn't change during fine-tuning, so fall back to the
        # base model's processor when the fine-tuned repo is missing that file.
        try:
            _processor = WhisperProcessor.from_pretrained(MODEL_ID)
        except EnvironmentError:
            _processor = WhisperProcessor.from_pretrained(BASE_MODEL_ID)

        _model = WhisperForConditionalGeneration.from_pretrained(MODEL_ID).to(_device)
        _model.eval()
    finally:
        if _orig is not None:
            PreTrainedTokenizerBase._set_model_specific_special_tokens = _orig

    return _processor, _model, _device


# ── Transcription helpers ──────────────────────────────────────────────────────

def _transcribe_chunk(chunk: np.ndarray, processor, model, device) -> str:
    """Transcribe one audio segment ≤ 30 s."""
    inputs = processor(chunk, sampling_rate=SAMPLE_RATE, return_tensors="pt")
    input_features = inputs.input_features.to(device)
    attention_mask = torch.ones(
        input_features.shape[:2], dtype=torch.long, device=device
    )
    with torch.no_grad():
        predicted_ids = model.generate(
            input_features,
            attention_mask=attention_mask,
            max_new_tokens=444,
            language="fr",
            task="transcribe",
        )[0]
    return processor.tokenizer.decode(predicted_ids, skip_special_tokens=True)


def _build_chunks(audio: np.ndarray) -> list[np.ndarray]:
    """Split audio at natural silences into segments ≤ 28 s."""
    intervals = librosa.effects.split(
        audio, top_db=35, frame_length=2048, hop_length=512
    )
    if len(intervals) == 0:
        return [audio] if len(audio) >= _MIN_CHUNK else []

    chunks: list[np.ndarray] = []
    seg_start = int(intervals[0][0])
    seg_end   = int(intervals[0][1])

    for iv_start, iv_end in intervals[1:]:
        iv_start, iv_end = int(iv_start), int(iv_end)
        if iv_end - seg_start <= _MAX_CHUNK:
            seg_end = iv_end
        else:
            segment = audio[seg_start:seg_end]
            if len(segment) >= _MIN_CHUNK:
                chunks.append(segment)
            seg_start = iv_start
            seg_end   = iv_end

    segment = audio[seg_start:seg_end]
    if len(segment) >= _MIN_CHUNK:
        chunks.append(segment)

    return chunks


def _transcribe(audio: np.ndarray, processor, model, device) -> str:
    """Transcribe audio of any length by splitting at natural silences."""
    chunks = _build_chunks(audio)
    if not chunks:
        return ""
    if len(chunks) == 1:
        return _transcribe_chunk(chunks[0], processor, model, device)

    parts: list[str] = []
    for chunk in chunks:
        text = _transcribe_chunk(chunk, processor, model, device).strip()
        if text:
            parts.append(text)
    return " ".join(parts)


# ── Audio loader (handles webm/opus/wav via PyAV) ─────────────────────────────
def _load_audio(path: str, sample_rate: int) -> np.ndarray:
    container = av.open(path)
    resampler = av.AudioResampler(format="fltp", layout="mono", rate=sample_rate)
    chunks: list[np.ndarray] = []
    for frame in container.decode(audio=0):
        for out in resampler.resample(frame):
            chunks.append(out.to_ndarray()[0])
    for out in resampler.resample(None):  # flush remaining samples
        chunks.append(out.to_ndarray()[0])
    container.close()
    if not chunks:
        return np.zeros(sample_rate, dtype=np.float32)
    return np.concatenate(chunks).astype(np.float32)


# ── Django view ────────────────────────────────────────────────────────────────

@csrf_exempt
@jwt_required(roles={"doctor", "admin", "adminIT"})
def transcribe(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)

    audio_file = request.FILES.get("audio")
    if not audio_file:
        return JsonResponse({"detail": "Aucun fichier audio fourni."}, status=400)

    name = audio_file.name or "audio.webm"
    ext  = os.path.splitext(name)[1] or ".webm"

    tmp_path: str | None = None
    try:
        # Write upload to a temp file
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            for chunk in audio_file.chunks():
                tmp.write(chunk)
            tmp_path = tmp.name

        # Load and resample to 16 kHz mono float32 (handles webm/opus via PyAV)
        audio = _load_audio(tmp_path, SAMPLE_RATE)

        processor, model, device = _load_model()
        raw  = _transcribe(audio, processor, model, device)
        text = process(normalize(raw), auto_punct=True)
        return JsonResponse({"text": text})

    except Exception as exc:
        import traceback
        traceback.print_exc()
        return JsonResponse({"detail": str(exc)}, status=500)

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


# ── Ollama suggestion view ──────────────────────────────────────────────────

@csrf_exempt
@jwt_required(roles={"doctor", "admin", "adminIT"})
def suggest(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"detail": "Méthode non autorisée."}, status=405)

    import json as _json
    try:
        body = _json.loads(request.body)
    except Exception:
        return JsonResponse({"detail": "Corps JSON invalide."}, status=400)

    text = (body.get("text") or "").strip()
    if not text:
        return JsonResponse({"detail": "Champ 'text' manquant."}, status=400)

    suggestion, changes = correct_with_ollama(text)
    return JsonResponse({"suggestion": suggestion, "changes": changes})
