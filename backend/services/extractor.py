import json
import re
from functools import lru_cache
from pathlib import Path

from llama_cpp import Llama

from ..config import (
    EXTRACTION_CONTEXT_SIZE,
    EXTRACTION_MODEL_PATH,
    EXTRACTION_TEMPERATURE,
)
from ..schemas import ClinicalFactors

EXTRACTION_PROMPT = """You are an information extraction system for a pediatric clinic intake form.

Extract only facts explicitly stated in the text.

Do not diagnose.
Do not recommend treatment.
Do not determine referral urgency.
Do not infer symptoms that are not mentioned.

true = explicitly present
false = explicitly denied
null = not mentioned or uncertain

Convert age to days when possible. Only populate breaths_per_minute and
spo2_percent if explicitly stated.

Return valid JSON only. Do not return markdown, explanations, or code fences.
Use exactly this shape:
{
  "age_days": null,
  "symptoms": {
    "fever": null,
    "cannot_drink": null,
    "vomiting_everything": null,
    "convulsions": null,
    "convulsing_now": null,
    "lethargy": null
  },
  "duration_days": null,
  "symptom_days": {"fever": null},
  "breaths_per_minute": null,
  "spo2_percent": null,
  "missing_fields": [],
  "confidence": 0.5,
  "confirmed_by_health_worker": false,
  "language": "en"
}

Text:
"""


@lru_cache(maxsize=1)
def _load_extraction_model() -> Llama:
    model_path = Path(EXTRACTION_MODEL_PATH)
    if not model_path.is_file():
        raise RuntimeError(
            "Extraction model not found. Place the GGUF model in "
            "backend/models/qwen/qwen2.5-1.5b-instruct-q4_k_m.gguf or "
            "update EXTRACTION_MODEL_PATH."
        )
    print("Loading local extraction model...")
    model = Llama(
        model_path=str(model_path),
        n_ctx=EXTRACTION_CONTEXT_SIZE,
        verbose=False,
    )
    print("Extraction model loaded.")
    return model


def _parse_json(content: str) -> dict:
    cleaned = re.sub(r"^\s*```(?:json)?\s*", "", content.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```\s*$", "", cleaned)
    try:
        value = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise RuntimeError("The extraction model returned invalid JSON.") from exc
    if not isinstance(value, dict):
        raise RuntimeError("The extraction model returned a JSON value, not an object.")
    return value


def _missing_fields(factors: ClinicalFactors) -> list[str]:
    required = ("cannot_drink", "vomiting_everything", "convulsions", "lethargy")
    return [field for field in required if getattr(factors.symptoms, field) is None]


def extract_clinical_factors(text: str, language: str) -> ClinicalFactors:
    model = _load_extraction_model()
    result = model.create_chat_completion(
        messages=[
            {"role": "system", "content": EXTRACTION_PROMPT},
            {"role": "user", "content": text},
        ],
        temperature=EXTRACTION_TEMPERATURE,
        max_tokens=500,
        response_format={"type": "json_object"},
    )
    content = result["choices"][0]["message"]["content"]
    factors = ClinicalFactors.model_validate(_parse_json(content))
    factors.confirmed_by_health_worker = False
    factors.language = language
    factors.confidence = max(0.0, min(1.0, factors.confidence))
    factors.missing_fields = _missing_fields(factors)
    return factors
