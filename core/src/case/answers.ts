// Follow-up loop: on need_more_info, record each answer with applyAnswer() and call evaluate() again.

import type { FollowUpQuestion, MainSymptom, StructuredCase, SymptomKey } from "../types";

export type AnswerKind =
  | { kind: "yes_no" }
  | { kind: "number"; unit: "days" | "breaths per minute" | "days of age" };

export function answerKind(field: string): AnswerKind {
  if (field === "age_days") return { kind: "number", unit: "days of age" };
  if (field === "breaths_per_minute") return { kind: "number", unit: "breaths per minute" };
  if (field.startsWith("symptom_days.")) return { kind: "number", unit: "days" };
  return { kind: "yes_no" };
}

// ageDaysFrom(2) = 730, ageDaysFrom(0, 8) = 243
export function ageDaysFrom(years: number, months = 0): number {
  return Math.round(years * 365 + months * 30.4);
}

const withoutMissing = (c: StructuredCase, field: string): string[] =>
  c.missing_fields.filter((f) => f !== field);

// Returns a new case. Throws if the value is the wrong type for the field.
export function applyAnswer(c: StructuredCase, field: string, value: boolean | number | null): StructuredCase {
  const kind = answerKind(field);
  if (value !== null) {
    if (kind.kind === "yes_no" && typeof value !== "boolean") {
      throw new TypeError(`${field} needs a yes/no answer (true or false).`);
    }
    if (kind.kind === "number" && (typeof value !== "number" || !Number.isFinite(value) || value < 0)) {
      throw new TypeError(`${field} needs a number of ${kind.unit}.`);
    }
  }

  const next: StructuredCase = { ...c, missing_fields: withoutMissing(c, field) };
  if (field === "age_days") {
    next.age_days = value as number | null;
  } else if (field === "breaths_per_minute") {
    next.breaths_per_minute = value as number | null;
  } else if (field.startsWith("symptom_days.")) {
    const symptom = field.slice("symptom_days.".length) as MainSymptom;
    next.symptom_days = { ...c.symptom_days, [symptom]: value as number | null };
  } else {
    next.symptoms = { ...c.symptoms, [field as SymptomKey]: value as boolean | null };
  }
  return next;
}

export function applyAnswers(
  c: StructuredCase,
  answers: { field: FollowUpQuestion["field"]; value: boolean | number | null }[],
): StructuredCase {
  return answers.reduce((acc, a) => applyAnswer(acc, a.field, a.value), c);
}
