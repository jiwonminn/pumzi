"""Download the local models required by the FastAPI backend."""

from pathlib import Path

from huggingface_hub import hf_hub_download, snapshot_download

BACKEND_DIR = Path(__file__).resolve().parent
MODELS_DIR = BACKEND_DIR / "models"

TRANSLATION_REPOSITORY = "facebook/nllb-200-distilled-600M"
TRANSLATION_DIRECTORY = MODELS_DIR / "huggingface" / "nllb-200-distilled-600M"

EXTRACTION_REPOSITORY = "Qwen/Qwen2.5-1.5B-Instruct-GGUF"
EXTRACTION_FILENAME = "qwen2.5-1.5b-instruct-q4_k_m.gguf"
EXTRACTION_DIRECTORY = MODELS_DIR / "qwen"


def download_translation_model() -> None:
    TRANSLATION_DIRECTORY.mkdir(parents=True, exist_ok=True)
    config_file = TRANSLATION_DIRECTORY / "config.json"
    if config_file.is_file():
        print(f"Translation model already exists: {TRANSLATION_DIRECTORY}")
        return

    print(f"Downloading translation model: {TRANSLATION_REPOSITORY}")
    try:
        snapshot_download(
            repo_id=TRANSLATION_REPOSITORY,
            local_dir=TRANSLATION_DIRECTORY,
        )
    except Exception as exc:
        raise RuntimeError(
            f"Failed to download translation model '{TRANSLATION_REPOSITORY}'."
        ) from exc
    print(f"Translation model downloaded to {TRANSLATION_DIRECTORY}")


def download_extraction_model() -> None:
    EXTRACTION_DIRECTORY.mkdir(parents=True, exist_ok=True)
    target_file = EXTRACTION_DIRECTORY / EXTRACTION_FILENAME
    if target_file.is_file():
        print(f"Extraction model already exists: {target_file}")
        return

    print(f"Downloading extraction model: {EXTRACTION_REPOSITORY}/{EXTRACTION_FILENAME}")
    try:
        downloaded_file = hf_hub_download(
            repo_id=EXTRACTION_REPOSITORY,
            filename=EXTRACTION_FILENAME,
            local_dir=EXTRACTION_DIRECTORY,
        )
    except Exception as exc:
        raise RuntimeError(
            f"Failed to download extraction model '{EXTRACTION_REPOSITORY}'."
        ) from exc
    print(f"Extraction model downloaded to {downloaded_file}")


def main() -> None:
    print("Setting up local AI models. This runs only when explicitly executed.")
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    download_translation_model()
    download_extraction_model()
    print("Local model setup complete.")


if __name__ == "__main__":
    main()
