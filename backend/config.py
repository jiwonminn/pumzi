from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
MODELS_DIR = BACKEND_DIR / "models"

TRANSLATION_MODEL_ID = "facebook/nllb-200-distilled-600M"
TRANSLATION_MODEL_DIR = MODELS_DIR / "huggingface" / "nllb-200-distilled-600M"
EXTRACTION_MODEL_PATH = MODELS_DIR / "qwen" / "qwen2.5-1.5b-instruct-q4_k_m.gguf"
EXTRACTION_CONTEXT_SIZE = 2048
EXTRACTION_TEMPERATURE = 0.1
