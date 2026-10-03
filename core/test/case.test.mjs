import { test } from "node:test";
import assert from "node:assert/strict";
import { validateCase } from "../src/case/validate.ts";
import { applyAnswer, applyAnswers, answerKind, ageDaysFrom } from "../src/case/answers.ts";
import { evaluate } from "../src/rules/engine.ts";
import { IMCI_PROTOCOL } from "../src/rules/who-imci.ts";
import { makeCase } from "./helpers.mjs";

// The contract's own example, exactly as sent to the team.
const CONTRACT_EXAMPLE = {
  age_days: 730,
  symptoms: {
    fever: true,
    cannot_drink: true,
    vomiting_everything: false,
    convulsions: false,
    convulsing_now: false,
    lethargy: null,
  },
  duration_days: 1,
  symptom_days: { fever: 1 },
  breaths_per_minute: null,
  spo2_percent: null,
  missing_fields: ["lethargy"],
  confidence: 0.85,
  confirmed_by_health_worker: false,
  language: "sw",
};

// ---------- validateCase ----------

test("the contract example is valid", () => {
  const r = validateCase(CONTRACT_EXAMPLE, IMCI_PROTOCOL);
  assert.equal(r.ok, true, r.errors.join("; "));
  assert.deepEqual(r.errors, []);
});

test("age nested inside patient is caught with a clear message", () => {
  const { age_days, ...rest } = CONTRACT_EXAMPLE;
  const r = validateCase({ ...rest, patient: { age_days } }, IMCI_PROTOCOL);
  assert.equal(r.ok, false);
  assert.ok(r.errors.includes("age_days must be at the top level, not inside patient."));
});

test("unknown symptom keys and non-boolean values are caught", () => {
  const r = validateCase(
    { ...CONTRACT_EXAMPLE, symptoms: { not_eating: true, fever: "yes" } },
    IMCI_PROTOCOL,
  );
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('Unknown symptom key "not_eating"')));
  assert.ok(r.errors.some((e) => e.includes("symptoms.fever must be true, false or null")));
});

test("missing confidence and bad language are caught", () => {
  const { confidence, ...rest } = CONTRACT_EXAMPLE;
  const r = validateCase({ ...rest, language: "fr" }, IMCI_PROTOCOL);
  assert.ok(r.errors.includes("confidence must be a number from 0 to 1."));
  assert.ok(r.errors.includes('language must be "sw" or "en".'));
});

test("an unlikely breath count is a warning, not an error", () => {
  const r = validateCase({ ...CONTRACT_EXAMPLE, breaths_per_minute: 200 }, IMCI_PROTOCOL);
  assert.equal(r.ok, true);
  assert.equal(r.warnings.length, 1);
});

test("optional fields are filled in as unknown", () => {
  const { breaths_per_minute, spo2_percent, confirmed_by_health_worker, ...rest } = CONTRACT_EXAMPLE;
  const r = validateCase(rest, IMCI_PROTOCOL);
  assert.equal(r.ok, true);
  assert.equal(r.value.breaths_per_minute, null);
  assert.equal(r.value.confirmed_by_health_worker, false);
});

// ---------- the follow-up loop ----------

test("answer kinds: yes/no for signs, numbers for counts and days", () => {
  assert.deepEqual(answerKind("lethargy"), { kind: "yes_no" });
  assert.deepEqual(answerKind("breaths_per_minute"), { kind: "number", unit: "breaths per minute" });
  assert.deepEqual(answerKind("symptom_days.fever"), { kind: "number", unit: "days" });
});

test("ageDaysFrom converts years and months", () => {
  assert.equal(ageDaysFrom(2), 730);
  assert.equal(ageDaysFrom(0, 8), 243);
});

test("applyAnswer records the answer and clears it from missing_fields", () => {
  const c = makeCase({ symptoms: { lethargy: null }, missing_fields: ["lethargy"] });
  const next = applyAnswer(c, "lethargy", false);
  assert.equal(next.symptoms.lethargy, false);
  assert.deepEqual(next.missing_fields, []);
  assert.equal(c.symptoms.lethargy, null, "the original case is not changed");
});

test("applyAnswer rejects the wrong kind of answer", () => {
  assert.throws(() => applyAnswer(makeCase(), "lethargy", 3), TypeError);
  assert.throws(() => applyAnswer(makeCase(), "breaths_per_minute", true), TypeError);
});

test("full loop: cough without a count -> ask -> answer 52 at 8 months -> pneumonia", () => {
  let c = makeCase({
    age_days: 240,
    symptoms: { cough_or_difficult_breathing: true, chest_indrawing: false, stridor: false },
    symptom_days: { cough: 3 },
  });
  let d = evaluate(c, IMCI_PROTOCOL);
  assert.equal(d.decision, "need_more_info");
  assert.equal(d.follow_up_questions[0].field, "breaths_per_minute");

  c = applyAnswer(c, "breaths_per_minute", 52);
  d = evaluate(c, IMCI_PROTOCOL);
  assert.equal(d.decision, "treat_at_clinic");
  assert.deepEqual(d.classifications, ["PNEUMONIA"]);
});

test("full loop from the contract example: answering lethargy keeps the urgent referral", () => {
  const r = validateCase(CONTRACT_EXAMPLE, IMCI_PROTOCOL);
  const first = evaluate(r.value, IMCI_PROTOCOL);
  assert.equal(first.decision, "urgent_referral");

  const answered = applyAnswers(r.value, [
    { field: "lethargy", value: false },
    { field: "stiff_neck", value: false },
  ]);
  assert.equal(evaluate(answered, IMCI_PROTOCOL).decision, "urgent_referral");
});
