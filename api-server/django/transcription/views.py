from __future__ import annotations

import os
import tempfile

import numpy as np
from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt

from core.auth import jwt_required
from .normalisation import normalize, normalize_abbrevs
from .ponctuation import process, correct_with_ollama, diff_corrections

# ── Model paths ────────────────────────────────────────────────────────────────
# Set WHISPER_CT2_MODEL to a CTranslate2 model directory for fast inference.
# If not set, falls back to the HuggingFace transformers model (slower).
#
# One-time conversion (run on any machine with internet access):
#   pip install ctranslate2 transformers
#   ct2-transformers-converter \
#     --model amnbk/whisper-medium-medical-fr-v2 \
#     --output_dir /opt/models/whisper-ct2 \
#     --quantization float16
#   scp -r /opt/models/whisper-ct2 radio@server:/opt/models/
#   Then set WHISPER_CT2_MODEL=/opt/models/whisper-ct2 in .env
CT2_MODEL_PATH  = os.getenv("WHISPER_CT2_MODEL", "")          # faster-whisper path
HF_MODEL_ID     = os.getenv("WHISPER_MODEL_ID",  "amnbk/whisper-medium-medical-fr-v2")
HF_BASE_MODEL   = os.getenv("WHISPER_BASE_MODEL_ID", "openai/whisper-medium")
SAMPLE_RATE     = 16_000

# ── Lazy singletons ────────────────────────────────────────────────────────────
_fw_model   = None   # faster-whisper WhisperModel
_hf_proc    = None   # HuggingFace processor
_hf_model   = None   # HuggingFace model
_hf_device  = None


# ══════════════════════════════════════════════════════════════════════════════
# Backend A — faster-whisper (CTranslate2, GPU float16) — PRIMARY
# ══════════════════════════════════════════════════════════════════════════════

def _load_fw():
    global _fw_model
    if _fw_model is not None:
        return _fw_model
    from faster_whisper import WhisperModel
    import torch
    device  = "cuda" if torch.cuda.is_available() else "cpu"
    # int8_float16: weights stored as int8 (low VRAM), compute in float16 — best
    # balance for mid-range GPUs (GTX 1650, etc.). Falls back to int8 on CPU.
    compute = "int8_float16" if device == "cuda" else "int8"
    _fw_model = WhisperModel(CT2_MODEL_PATH, device=device, compute_type=compute,
                             cpu_threads=4, num_workers=2)
    return _fw_model


def _transcribe_fw(audio_path: str) -> str:
    model = _load_fw()
    beam = int(os.getenv("WHISPER_BEAM_SIZE", "1"))
    segments, _ = model.transcribe(
        audio_path,
        language="fr",
        beam_size=beam,
        best_of=beam,
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 500},
    )
    return " ".join(seg.text.strip() for seg in segments)


# ══════════════════════════════════════════════════════════════════════════════
# Backend B — HuggingFace transformers — FALLBACK
# ══════════════════════════════════════════════════════════════════════════════

def _load_hf():
    global _hf_proc, _hf_model, _hf_device
    if _hf_model is not None:
        return _hf_proc, _hf_model, _hf_device

    import torch
    from transformers import WhisperForConditionalGeneration, WhisperProcessor
    from transformers.tokenization_utils_base import PreTrainedTokenizerBase

    # Patch for fine-tuned models with list extra_special_tokens
    _orig = getattr(PreTrainedTokenizerBase, '_set_model_specific_special_tokens', None)
    if _orig is not None:
        def _patched(self, special_tokens=None):
            if isinstance(special_tokens, list):
                special_tokens = {}
            _orig(self, special_tokens=special_tokens)
        PreTrainedTokenizerBase._set_model_specific_special_tokens = _patched

    try:
        _hf_device = "cuda" if torch.cuda.is_available() else "cpu"
        try:
            _hf_proc = WhisperProcessor.from_pretrained(HF_MODEL_ID)
        except EnvironmentError:
            _hf_proc = WhisperProcessor.from_pretrained(HF_BASE_MODEL)
        _hf_model = WhisperForConditionalGeneration.from_pretrained(HF_MODEL_ID).to(_hf_device)
        _hf_model.eval()
    finally:
        if _orig is not None:
            PreTrainedTokenizerBase._set_model_specific_special_tokens = _orig

    return _hf_proc, _hf_model, _hf_device


def _transcribe_hf(audio_path: str) -> str:
    import torch
    import av
    import librosa

    _MAX_CHUNK = 28 * SAMPLE_RATE
    _MIN_CHUNK = SAMPLE_RATE // 2

    def _load_audio(path):
        container  = av.open(path)
        resampler  = av.AudioResampler(format="fltp", layout="mono", rate=SAMPLE_RATE)
        chunks = []
        for frame in container.decode(audio=0):
            for out in resampler.resample(frame):
                chunks.append(out.to_ndarray()[0])
        for out in resampler.resample(None):
            chunks.append(out.to_ndarray()[0])
        container.close()
        return np.concatenate(chunks).astype(np.float32) if chunks else np.zeros(SAMPLE_RATE, dtype=np.float32)

    def _build_chunks(audio):
        intervals = librosa.effects.split(audio, top_db=35, frame_length=2048, hop_length=512)
        if not len(intervals):
            return [audio] if len(audio) >= _MIN_CHUNK else []
        result, s, e = [], int(intervals[0][0]), int(intervals[0][1])
        for iv_s, iv_e in intervals[1:]:
            iv_s, iv_e = int(iv_s), int(iv_e)
            if iv_e - s <= _MAX_CHUNK:
                e = iv_e
            else:
                seg = audio[s:e]
                if len(seg) >= _MIN_CHUNK: result.append(seg)
                s, e = iv_s, iv_e
        seg = audio[s:e]
        if len(seg) >= _MIN_CHUNK: result.append(seg)
        return result

    def _chunk_text(chunk, proc, mdl, dev):
        inputs = proc(chunk, sampling_rate=SAMPLE_RATE, return_tensors="pt")
        feats  = inputs.input_features.to(dev)
        mask   = torch.ones(feats.shape[:2], dtype=torch.long, device=dev)
        with torch.no_grad():
            ids = mdl.generate(feats, attention_mask=mask, max_new_tokens=444, language="fr", task="transcribe")[0]
        return proc.tokenizer.decode(ids, skip_special_tokens=True)

    proc, mdl, dev = _load_hf()
    audio  = _load_audio(audio_path)
    chunks = _build_chunks(audio)
    if not chunks:
        return ""
    return " ".join(_chunk_text(c, proc, mdl, dev).strip() for c in chunks if c is not None)


# ══════════════════════════════════════════════════════════════════════════════
# Router — picks the right backend
# ══════════════════════════════════════════════════════════════════════════════

def _transcribe(audio_path: str) -> str:
    if CT2_MODEL_PATH and os.path.isdir(CT2_MODEL_PATH):
        return _transcribe_fw(audio_path)
    return _transcribe_hf(audio_path)


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
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            for chunk in audio_file.chunks():
                tmp.write(chunk)
            tmp_path = tmp.name

        raw  = _transcribe(tmp_path)
        text = process(normalize(raw), auto_punct=True)
        text = normalize_abbrevs(text)
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
