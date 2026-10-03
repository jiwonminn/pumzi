from functools import lru_cache

import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

from ..config import TRANSLATION_MODEL_DIR


@lru_cache(maxsize=1)
def _load_translation_model():
    print("Loading NLLB translation model...")
    tokenizer = AutoTokenizer.from_pretrained(
        TRANSLATION_MODEL_DIR,
        local_files_only=True,
        src_lang="swh_Latn",
    )
    model = AutoModelForSeq2SeqLM.from_pretrained(
        TRANSLATION_MODEL_DIR,
        local_files_only=True,
    )
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model.to(device)
    model.eval()
    print(f"NLLB model loaded on {device}.")
    return tokenizer, model, device


def translate_swahili_to_english(text: str) -> str:
    tokenizer, model, device = _load_translation_model()
    tokenizer.src_lang = "swh_Latn"
    encoded = tokenizer(text, return_tensors="pt").to(device)
    forced_bos_token_id = tokenizer.convert_tokens_to_ids("eng_Latn")
    generated = model.generate(
        **encoded,
        forced_bos_token_id=forced_bos_token_id,
        max_new_tokens=256,
    )
    return tokenizer.batch_decode(generated, skip_special_tokens=True)[0].strip()
