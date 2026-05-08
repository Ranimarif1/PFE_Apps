"""
Script de debug : affiche chaque étape du pipeline de transcription.
Usage :
    python debug_transcription.py <fichier_audio>
    python debug_transcription.py                   # utilise le micro (10 s)
"""
import sys
import os

# ── Chemin vers le dossier django pour importer les modules ───────────────────
DJANGO_DIR = os.path.join(os.path.dirname(__file__), "django")
sys.path.insert(0, DJANGO_DIR)

# ── Imports pipeline ──────────────────────────────────────────────────────────
import numpy as np
import torch
import av
import librosa
from transformers import WhisperForConditionalGeneration, WhisperProcessor

from transcription.normalisation import (
    normalize,
    normalize_spoken_punct,
    normalize_section_aliases,
    fix_asr_accents,
    normalize_dates,
    normalize_units,
    normalize_compound_units,
    normalize_numbers,
    normalize_abbrevs,
)
from transcription.ponctuation import (
    strip_whisper_punctuation,
    apply_verbal_commands,
    process,
)

SAMPLE_RATE   = 16_000
MODEL_ID      = "amnbk/whisper-medium-medical-fr-v2"
BASE_MODEL_ID = "openai/whisper-medium"
_MAX_CHUNK    = 28 * SAMPLE_RATE
_MIN_CHUNK    = SAMPLE_RATE // 2

SEP = "─" * 70


def sep(title: str) -> None:
    print(f"\n{SEP}")
    print(f"  {title}")
    print(SEP)


def load_model():
    print("Chargement du modèle Whisper…")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"  Device : {device}")
    try:
        processor = WhisperProcessor.from_pretrained(MODEL_ID)
    except Exception:
        processor = WhisperProcessor.from_pretrained(BASE_MODEL_ID)
    model = WhisperForConditionalGeneration.from_pretrained(MODEL_ID).to(device)
    model.eval()
    print("  Modèle chargé.")
    return processor, model, device


def load_audio_file(path: str) -> np.ndarray:
    container = av.open(path)
    resampler = av.AudioResampler(format="fltp", layout="mono", rate=SAMPLE_RATE)
    chunks = []
    for frame in container.decode(audio=0):
        for out in resampler.resample(frame):
            chunks.append(out.to_ndarray()[0])
    for out in resampler.resample(None):
        chunks.append(out.to_ndarray()[0])
    container.close()
    if not chunks:
        return np.zeros(SAMPLE_RATE, dtype=np.float32)
    return np.concatenate(chunks).astype(np.float32)


def record_mic(seconds: int = 10) -> np.ndarray:
    import sounddevice as sd
    print(f"Enregistrement micro ({seconds} s)… parlez maintenant !")
    audio = sd.rec(int(seconds * SAMPLE_RATE), samplerate=SAMPLE_RATE,
                   channels=1, dtype="float32")
    sd.wait()
    print("  Enregistrement terminé.")
    return audio.flatten()


def build_chunks(audio: np.ndarray):
    intervals = librosa.effects.split(audio, top_db=35, frame_length=2048, hop_length=512)
    if len(intervals) == 0:
        return [audio] if len(audio) >= _MIN_CHUNK else []
    chunks, seg_start, seg_end = [], int(intervals[0][0]), int(intervals[0][1])
    for iv_start, iv_end in intervals[1:]:
        iv_start, iv_end = int(iv_start), int(iv_end)
        if iv_end - seg_start <= _MAX_CHUNK:
            seg_end = iv_end
        else:
            seg = audio[seg_start:seg_end]
            if len(seg) >= _MIN_CHUNK:
                chunks.append(seg)
            seg_start, seg_end = iv_start, iv_end
    seg = audio[seg_start:seg_end]
    if len(seg) >= _MIN_CHUNK:
        chunks.append(seg)
    return chunks


def transcribe_chunk(chunk, processor, model, device) -> str:
    inputs = processor(chunk, sampling_rate=SAMPLE_RATE, return_tensors="pt")
    feats = inputs.input_features.to(device)
    mask  = torch.ones(feats.shape[:2], dtype=torch.long, device=device)
    with torch.no_grad():
        ids = model.generate(feats, attention_mask=mask,
                             max_new_tokens=444, language="fr", task="transcribe")[0]
    return processor.tokenizer.decode(ids, skip_special_tokens=True)


def transcribe(audio, processor, model, device) -> str:
    chunks = build_chunks(audio)
    if not chunks:
        return ""
    parts = [transcribe_chunk(c, processor, model, device).strip() for c in chunks]
    return " ".join(p for p in parts if p)


def show(label: str, text: str) -> None:
    sep(label)
    print(text if text.strip() else "(vide)")


def main():
    # ── 1. Charger l'audio ────────────────────────────────────────────────────
    if len(sys.argv) >= 2:
        audio_path = sys.argv[1]
        print(f"Fichier audio : {audio_path}")
        audio = load_audio_file(audio_path)
    else:
        secs = int(sys.argv[2]) if len(sys.argv) >= 3 else 10
        audio = record_mic(secs)

    duration = len(audio) / SAMPLE_RATE
    print(f"Durée audio : {duration:.1f} s")

    # ── 2. Transcrire ─────────────────────────────────────────────────────────
    processor, model, device = load_model()
    raw = transcribe(audio, processor, model, device)

    show("1. TRANSCRIPTION BRUTE (sortie directe Whisper)", raw)

    # ── 3. Pipeline étape par étape ───────────────────────────────────────────
    t = raw

    t = normalize_spoken_punct(t)
    show("2. Après normalize_spoken_punct  (à la ligne / deux points à la ligne)", t)

    t2 = normalize_section_aliases(t)
    if t2 != t:
        show("3. Après normalize_section_aliases  (renseignements cliniques → Indication…)", t2)
    else:
        sep("3. normalize_section_aliases  → aucun changement")
    t = t2

    t2 = fix_asr_accents(t)
    if t2 != t:
        show("4. Après fix_asr_accents  (corrections d'accents Whisper)", t2)
    else:
        sep("4. fix_asr_accents  → aucun changement")
    t = t2

    t2 = normalize_dates(t)
    if t2 != t:
        show("5. Après normalize_dates", t2)
    else:
        sep("5. normalize_dates  → aucun changement")
    t = t2

    t2 = normalize_units(t)
    if t2 != t:
        show("6. Après normalize_units  (milligrammes → mg…)", t2)
    else:
        sep("6. normalize_units  → aucun changement")
    t = t2

    t2 = normalize_compound_units(t)
    if t2 != t:
        show("7. Après normalize_compound_units  (mg par dL → mg/dL)", t2)
    else:
        sep("7. normalize_compound_units  → aucun changement")
    t = t2

    t2 = normalize_numbers(t)
    if t2 != t:
        show("8. Après normalize_numbers  (cent vingt → 120)", t2)
    else:
        sep("8. normalize_numbers  → aucun changement")
    t = t2

    t2 = normalize_abbrevs(t)
    if t2 != t:
        show("9. Après normalize_abbrevs  (irm → IRM…)", t2)
    else:
        sep("9. normalize_abbrevs  → aucun changement")
    t = t2

    show("10. NORMALIZE COMPLET  (même chose que normalize(raw))", normalize(raw))

    # ── 4. Ponctuation ────────────────────────────────────────────────────────
    normalized = normalize(raw)

    stripped = strip_whisper_punctuation(normalized)
    show("11. Après strip_whisper_punctuation  (suppression ponctuation Whisper)", stripped)

    after_verbal = apply_verbal_commands(normalized)
    show("12. Après apply_verbal_commands  (virgule→, point→. etc.)", after_verbal)

    final = process(normalized, auto_punct=True)
    final = normalize_abbrevs(final)
    show("13. RÉSULTAT FINAL  (tel qu'envoyé au frontend)", final)

    print(f"\n{SEP}\nFin du debug.\n")


if __name__ == "__main__":
    main()
