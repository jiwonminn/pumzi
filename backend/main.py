from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .schemas import (
    ClinicalFactors,
    ExtractRequest,
    ProcessRequest,
    ProcessResponse,
    TranslateRequest,
    TranslateResponse,
)
@asynccontextmanager
async def lifespan(_: FastAPI):
    print("Pumzi local AI backend ready. Models load lazily on first use.")
    yield


app = FastAPI(title="Pumzi Local AI")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://10.0.0.5:3000",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


def _service_error(error: Exception) -> HTTPException:
    return HTTPException(status_code=503, detail=str(error))


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/translate", response_model=TranslateResponse)
def translate(request: TranslateRequest) -> TranslateResponse:
    from .services.translator import translate_swahili_to_english

    try:
        translated = translate_swahili_to_english(request.text)
    except Exception as error:
        raise _service_error(error) from error
    return TranslateResponse(
        original_text=request.text,
        translated_text=translated,
        source_language=request.source_language,
    )


@app.post("/extract", response_model=ClinicalFactors)
def extract(request: ExtractRequest) -> ClinicalFactors:
    from .services.extractor import extract_clinical_factors

    try:
        return extract_clinical_factors(request.text, request.original_language)
    except Exception as error:
        raise _service_error(error) from error


@app.post("/process", response_model=ProcessResponse)
def process(request: ProcessRequest) -> ProcessResponse:
    from .services.extractor import extract_clinical_factors
    from .services.translator import translate_swahili_to_english

    try:
        translated = (
            translate_swahili_to_english(request.text)
            if request.language == "sw"
            else None
        )
        english_text = translated or request.text
        factors = extract_clinical_factors(english_text, request.language)
    except Exception as error:
        raise _service_error(error) from error
    return ProcessResponse(
        original_text=request.text,
        translated_text=translated,
        clinical_factors=factors,
    )
