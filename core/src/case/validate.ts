// Checks extractor output against the StructuredCase contract before it reaches the engine.

import type { Protocol, StructuredCase } from "../types";

export type ValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  // Optional fields filled in as unknown. null when ok is false.
  value: StructuredCase | null;
};

const MAIN_SYMPTOMS = ["cough", "diarrhoea", "fever"];

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const isNumberOrNull = (v: unknown) => v === null || (typeof v === "number" && Number.isFinite(v));

export function validateCase(input: unknown, protocol: Protocol): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fail = (): ValidationResult => ({ ok: false, errors, warnings, value: null });

  if (!isRecord(input)) {
    errors.push("The case must be a JSON object.");
    return fail();
  }

  if (!("age_days" in input)) {
    if (isRecord(input.patient) && "age_days" in input.patient) {
      errors.push("age_days must be at the top level, not inside patient.");
    } else {
      errors.push("age_days is missing (use null if the age is unknown).");
    }
  } else if (!isNumberOrNull(input.age_days)) {
    errors.push("age_days must be a number of days or null.");
  } else if (typeof input.age_days === "number" && (input.age_days < 0 || !Number.isInteger(input.age_days))) {
    errors.push("age_days must be a whole number of days, 0 or more (2 years = 730).");
  }

  const knownSymptoms = new Set(Object.keys(protocol.labels));
  if (!isRecord(input.symptoms)) {
    errors.push("symptoms must be an object (use {} if nothing is known yet).");
  } else {
    for (const [key, value] of Object.entries(input.symptoms)) {
      if (!knownSymptoms.has(key)) errors.push(`Unknown symptom key "${key}". Use only the contract's symptom keys.`);
      if (value !== true && value !== false && value !== null) {
        errors.push(`symptoms.${key} must be true, false or null (null means unknown).`);
      }
    }
  }

  if (!("duration_days" in input) || !isNumberOrNull(input.duration_days)) {
    errors.push("duration_days must be a number of days or null.");
  }

  if (input.symptom_days !== undefined) {
    if (!isRecord(input.symptom_days)) {
      errors.push("symptom_days must be an object like { \"fever\": 2 }.");
    } else {
      for (const [key, value] of Object.entries(input.symptom_days)) {
        if (!MAIN_SYMPTOMS.includes(key)) errors.push(`symptom_days.${key}: use cough, diarrhoea or fever.`);
        if (!isNumberOrNull(value)) errors.push(`symptom_days.${key} must be a number of days or null.`);
      }
    }
  }

  if (input.breaths_per_minute !== undefined) {
    if (!isNumberOrNull(input.breaths_per_minute)) {
      errors.push("breaths_per_minute must be a number or null.");
    } else if (typeof input.breaths_per_minute === "number" && (input.breaths_per_minute < 5 || input.breaths_per_minute > 150)) {
      warnings.push(`breaths_per_minute ${input.breaths_per_minute} looks unlikely; count again for one full minute.`);
    }
  }

  if (input.spo2_percent !== undefined) {
    if (!isNumberOrNull(input.spo2_percent)) {
      errors.push("spo2_percent must be a number or null.");
    } else if (typeof input.spo2_percent === "number" && (input.spo2_percent < 50 || input.spo2_percent > 100)) {
      warnings.push(`spo2_percent ${input.spo2_percent} looks unlikely; check the pulse oximeter reading.`);
    }
  }

  if (!Array.isArray(input.missing_fields) || !input.missing_fields.every((f) => typeof f === "string")) {
    errors.push("missing_fields must be a list of field names (use [] if none).");
  }

  if (typeof input.confidence !== "number" || input.confidence < 0 || input.confidence > 1) {
    errors.push("confidence must be a number from 0 to 1.");
  }

  if (input.confirmed_by_health_worker !== undefined && typeof input.confirmed_by_health_worker !== "boolean") {
    errors.push("confirmed_by_health_worker must be true or false.");
  }

  if (input.language !== "sw" && input.language !== "en") {
    errors.push('language must be "sw" or "en".');
  }

  if (errors.length > 0) return fail();

  const value: StructuredCase = {
    ...(input as StructuredCase),
    breaths_per_minute: (input.breaths_per_minute as number | null | undefined) ?? null,
    spo2_percent: (input.spo2_percent as number | null | undefined) ?? null,
    confirmed_by_health_worker: (input.confirmed_by_health_worker as boolean | undefined) ?? false,
  };
  return { ok: true, errors, warnings, value };
}
