from typing import Literal

from pydantic import BaseModel, Field


class Symptoms(BaseModel):
    fever: bool | None = None
    cannot_drink: bool | None = None
    vomiting_everything: bool | None = None
    convulsions: bool | None = None
    convulsing_now: bool | None = None
    lethargy: bool | None = None


class SymptomDays(BaseModel):
    fever: int | None = None


class ClinicalFactors(BaseModel):
    age_days: int | None = None
    symptoms: Symptoms = Field(default_factory=Symptoms)
    duration_days: int | None = None
    symptom_days: SymptomDays = Field(default_factory=SymptomDays)
    breaths_per_minute: int | None = None
    spo2_percent: float | None = None
    missing_fields: list[str] = Field(default_factory=list)
    confidence: float = 0.5
    confirmed_by_health_worker: bool = False
    language: Literal["en", "sw"] = "en"


class TranslateRequest(BaseModel):
    text: str = Field(min_length=1)
    source_language: Literal["sw"]


class TranslateResponse(BaseModel):
    original_text: str
    translated_text: str
    source_language: Literal["sw"]
    target_language: Literal["en"] = "en"


class ExtractRequest(BaseModel):
    text: str = Field(min_length=1)
    original_language: Literal["en", "sw"]


class ProcessRequest(BaseModel):
    text: str = Field(min_length=1)
    language: Literal["en", "sw"]


class ProcessResponse(BaseModel):
    original_text: str
    translated_text: str | None
    clinical_factors: ClinicalFactors
