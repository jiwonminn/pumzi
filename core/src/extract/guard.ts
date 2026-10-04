// Checks a model's reading against the words actually written. The model can add a sign
// the phrase matcher missed, but it can't say "no" unless the text says no, and it can't
// add a number the text doesn't state. Anything it drops is reported so the worker sees it.

import { SYMPTOM_KEYS, type MainSymptom, type StructuredCase, type SymptomKey } from "../types";
import { DANGER_SIGNS, extractCaseWithEvidence, type Evidence, type ExtractOptions } from "./phrase-matcher";

// What the local backend returns. Every field is optional so a partial reply still works.
export type ModelReading = {
  symptoms?: Partial<Record<string, boolean | null>>;
  duration_days?: number | null;
  symptom_days?: Partial<Record<string, number | null>>;
  breaths_per_minute?: number | null;
  spo2_percent?: number | null;
  confidence?: number;
};

export type Dropped = { field: string; value: boolean | number; why: string };

export type GuardedReading = {
  case: StructuredCase;
  evidence: Evidence[];
  // Signs only the model saw, with no matching words. Worth checking first.
  modelOnly: SymptomKey[];
  dropped: Dropped[];
};

const MAIN_SYMPTOMS: MainSymptom[] = ["cough", "diarrhoea", "fever"];

// 52 counts in "52 breaths" or "about 52", but not inside 152 or 5.2.
const isStated = (value: number, text: string): boolean =>
  new RegExp(`(^|[^\\d.])${String(value).replace(".", "\\.")}(?!\\d|\\.\\d)`).test(text);

export function guardReading(model: ModelReading | null, text: string, options: ExtractOptions): GuardedReading {
  const read = extractCaseWithEvidence(text, options);
  const found = read.case;
  const dropped: Dropped[] = [];
  const modelOnly: SymptomKey[] = [];

  const symptoms: StructuredCase["symptoms"] = { ...found.symptoms };
  for (const key of SYMPTOM_KEYS) {
    const said = model?.symptoms?.[key];
    if (typeof said !== "boolean") continue;
    // A yes from the model is kept for the worker to confirm. A no needs the text to say no.
    if (said && symptoms[key] !== true) {
      symptoms[key] = true;
      modelOnly.push(key);
    }
    if (symptoms[key] !== said) {
      const why = symptoms[key] === undefined ? "Not stated in the description." : "The description says otherwise.";
      dropped.push({ field: key, value: said, why });
    }
  }

  // The phrase matcher only reads a number next to its unit, so its value wins.
  const pick = (field: string, fromText: number | null, fromModel: number | null | undefined): number | null => {
    if (fromModel == null) return fromText;
    if (fromText !== null) {
      if (fromModel !== fromText) dropped.push({ field, value: fromModel, why: `The description says ${fromText}.` });
      return fromText;
    }
    if (isStated(fromModel, text)) return fromModel;
    dropped.push({ field, value: fromModel, why: "Not stated in the description." });
    return null;
  };

  const duration = pick("duration_days", found.duration_days, model?.duration_days);
  const breaths = pick("breaths_per_minute", found.breaths_per_minute ?? null, model?.breaths_per_minute);
  const spo2 = pick("spo2_percent", found.spo2_percent ?? null, model?.spo2_percent);

  const symptomDays: Partial<Record<MainSymptom, number | null>> = {};
  for (const s of MAIN_SYMPTOMS) {
    const days = model?.symptom_days?.[s];
    if (days == null) continue;
    if (days === duration || isStated(days, text)) symptomDays[s] = days;
    else dropped.push({ field: `symptom_days.${s}`, value: days, why: "Not stated in the description." });
  }

  const confidence =
    typeof model?.confidence === "number" && Number.isFinite(model.confidence)
      ? Math.min(1, Math.max(0, model.confidence))
      : found.confidence;

  const result: StructuredCase = {
    ...found,
    symptoms,
    duration_days: duration,
    breaths_per_minute: breaths,
    spo2_percent: spo2,
    missing_fields: DANGER_SIGNS.filter((k) => symptoms[k] == null),
    confidence,
  };
  if (Object.keys(symptomDays).length > 0) result.symptom_days = symptomDays;

  return { case: result, evidence: read.evidence, modelOnly, dropped };
}
