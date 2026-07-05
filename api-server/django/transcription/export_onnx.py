"""
Run this script ONCE to convert the Whisper model to ONNX format.

Usage:
    cd api-server/django
    python -m transcription.export_onnx

Requirements (install before running, can remove torch after):
    pip install torch torchaudio optimum[exporters] transformers
"""
import os
from optimum.exporters.onnx import main_export
from transformers import WhisperProcessor

MODEL_ID      = "amnbk/whisper-medium-medical-fr-v2"
BASE_MODEL_ID = "openai/whisper-medium"
OUTPUT_DIR    = os.path.join(os.path.dirname(__file__), "whisper_onnx")


def export():
    print(f"Exporting {MODEL_ID} to ONNX → {OUTPUT_DIR}")

    main_export(
        model_name_or_path=MODEL_ID,
        output=OUTPUT_DIR,
        task="automatic-speech-recognition",
        opset=17,
    )

    # Ensure the processor config is present (fine-tuned model may lack it)
    try:
        WhisperProcessor.from_pretrained(MODEL_ID).save_pretrained(OUTPUT_DIR)
        print("Processor saved from fine-tuned model.")
    except EnvironmentError:
        WhisperProcessor.from_pretrained(BASE_MODEL_ID).save_pretrained(OUTPUT_DIR)
        print("Processor saved from base model (fallback).")

    print("Export complete. Files are in:", OUTPUT_DIR)
    print("You can now remove torch/torchaudio from your environment.")


if __name__ == "__main__":
    export()
