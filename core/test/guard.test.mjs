import { test } from "node:test";
import assert from "node:assert/strict";
import { guardReading } from "../src/extract/guard.ts";
import { extractCase } from "../src/extract/phrase-matcher.ts";
import { validateCase } from "../src/case/validate.ts";
import { decide } from "../src/pipeline.ts";
import { IMCI_PROTOCOL } from "../src/rules/who-imci.ts";
import { DEMO_FACILITIES, DEMO_ORIGIN } from "../src/navigation/demo-facilities.ts";

const options = { language: "en", ageDays: 730 };
const fields = (dropped) => dropped.map((d) => d.field);

test("drops the vitals the model made up for 'breathing fast'", () => {
  // The real reply we saw from the backend: 30 breaths and 95% for a sentence with no numbers.
  const text = "My child has a cough and is breathing fast.";
  const r = guardReading({ breaths_per_minute: 30, spo2_percent: 95 }, text, options);
  assert.equal(r.case.breaths_per_minute, null);
  assert.equal(r.case.spo2_percent, null);
  assert.deepEqual(fields(r.dropped), ["breaths_per_minute", "spo2_percent"]);
});

test("so the engine asks to count the breaths instead of trusting a made-up count", () => {
  const text = "My child has a cough and is breathing fast.";
  const r = guardReading({ breaths_per_minute: 30, spo2_percent: 95 }, text, options);
  const d = decide({ ...r.case, symptoms: { ...r.case.symptoms, chest_indrawing: false, stridor: false } },
    IMCI_PROTOCOL, DEMO_FACILITIES, DEMO_ORIGIN);
  assert.ok(d.packet.decision.follow_up_questions.some((q) => q.field === "breaths_per_minute"));
});

test("a model 'no' with nothing in the text to back it becomes unknown", () => {
  const r = guardReading({ symptoms: { fever: true, lethargy: false, convulsions: false } }, "My child has a fever.", options);
  assert.equal(r.case.symptoms.fever, true);
  assert.equal(r.case.symptoms.lethargy, undefined);
  assert.equal(r.case.symptoms.convulsions, undefined);
  assert.deepEqual(fields(r.dropped), ["convulsions", "lethargy"]);
  assert.ok(r.case.missing_fields.includes("lethargy"));
});

test("a 'no' the text actually says stands", () => {
  const r = guardReading({ symptoms: { convulsions: false, fever: true } }, "No convulsions. He has a fever.", options);
  assert.equal(r.case.symptoms.convulsions, false);
  assert.deepEqual(r.dropped, []);
});

test("the model can add a sign the phrase matcher missed, flagged for the worker", () => {
  const r = guardReading({ symptoms: { lethargy: true } }, "She just lies there and won't really wake up.", options);
  assert.equal(r.case.symptoms.lethargy, true);
  assert.deepEqual(r.modelOnly, ["lethargy"]);
});

test("a number the text states in other words is kept", () => {
  const r = guardReading({ breaths_per_minute: 48 }, "He breathes about 48 times a minute.", options);
  assert.equal(r.case.breaths_per_minute, 48);
  assert.deepEqual(r.dropped, []);
});

test("a number next to its unit beats the model's number", () => {
  const r = guardReading({ breaths_per_minute: 50 }, "Breathing 52 breaths per minute.", options);
  assert.equal(r.case.breaths_per_minute, 52);
  assert.deepEqual(r.dropped, [{ field: "breaths_per_minute", value: 50, why: "The description says 52." }]);
});

test("a number only counts on its own, not inside a bigger one", () => {
  const r = guardReading({ breaths_per_minute: 52 }, "Her temperature was 38.52 this morning.", options);
  assert.equal(r.case.breaths_per_minute, null);
});

test("days per symptom are kept only when the text supports them", () => {
  const kept = guardReading({ symptom_days: { fever: 1 } }, "Fever since yesterday.", options);
  assert.deepEqual(kept.case.symptom_days, { fever: 1 });
  const madeUp = guardReading({ symptom_days: { fever: 3 } }, "She has a fever.", options);
  assert.equal(madeUp.case.symptom_days, undefined);
  assert.deepEqual(fields(madeUp.dropped), ["symptom_days.fever"]);
});

test("with no model reading it's the phrase matcher alone", () => {
  const text = "My child has a fever and cannot drink anything.";
  const r = guardReading(null, text, options);
  assert.deepEqual(r.case, extractCase(text, options));
  assert.deepEqual(r.dropped, []);
  assert.deepEqual(r.modelOnly, []);
});

test("a confidence outside 0 to 1 is clamped, so the case still passes the contract check", () => {
  const r = guardReading({ confidence: 7, symptoms: { fever: true } }, "Fever.", options);
  assert.equal(r.case.confidence, 1);
  assert.equal(validateCase(r.case, IMCI_PROTOCOL).ok, true);
});

test("the backend's example reply goes through the check and on to an urgent referral", () => {
  const text = "My two-year-old has a fever and has been unable to drink anything since yesterday.";
  const reply = {
    symptoms: { fever: true, cannot_drink: true, vomiting_everything: false, convulsions: false, convulsing_now: false, lethargy: false },
    duration_days: 1,
    symptom_days: { fever: 1 },
    breaths_per_minute: null,
    spo2_percent: null,
    confidence: 0.9,
  };
  const r = guardReading(reply, text, options);
  assert.equal(validateCase(r.case, IMCI_PROTOCOL).ok, true);
  const d = decide(r.case, IMCI_PROTOCOL, DEMO_FACILITIES, DEMO_ORIGIN);
  assert.equal(d.packet.decision.decision, "urgent_referral");
  assert.equal(d.packet.facility.name, "Good Samaritan ACK Medical Clinic");
  assert.deepEqual(d.packet.facility.missing_services, ["pediatric_emergency"]);
});
