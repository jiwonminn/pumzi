import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate } from "../src/rules/engine.ts";
import { IMCI_PROTOCOL } from "../src/rules/who-imci.ts";
import { makeCase, NO_DEHYDRATION_SIGNS } from "./helpers.mjs";

const run = (overrides) => evaluate(makeCase(overrides), IMCI_PROTOCOL);
const fields = (decision) => decision.follow_up_questions.map((q) => q.field);

// ---------- age scope ----------

test("unknown age: asks the age first", () => {
  const d = run({ age_days: null });
  assert.equal(d.decision, "need_more_info");
  assert.deepEqual(fields(d), ["age_days"]);
});

test("young infant under 2 months is out of scope", () => {
  const d = run({ age_days: 30 });
  assert.equal(d.decision, "out_of_scope");
  assert.equal(d.citations[0].quote, "SICK CHILD AGE 2 MONTHS UP TO 5 YEARS");
});

test("child of 5 years or more is out of scope", () => {
  assert.equal(run({ age_days: 1826 }).decision, "out_of_scope");
  assert.equal(run({ age_days: 1825 }).decision, "home_care");
});

// ---------- general danger signs (PDF page 5) ----------

test("the team's example: fever and can't drink -> urgent referral, cited to page 5", () => {
  const d = run({ symptoms: { fever: true, cannot_drink: true, stiff_neck: false }, symptom_days: { fever: 1 } });
  assert.equal(d.decision, "urgent_referral");
  assert.ok(d.fired_rules.includes("IMCI-GDS-01"));
  assert.ok(d.reasons.includes("Not able to drink or breastfeed"));
  assert.equal(d.citations.find((x) => x.rule_id === "IMCI-GDS-01").pdf_page, 5);
});

test("each general danger sign alone triggers urgent referral", () => {
  for (const sign of ["cannot_drink", "vomiting_everything", "convulsions", "convulsing_now", "lethargy"]) {
    assert.equal(run({ symptoms: { [sign]: true } }).decision, "urgent_referral", sign);
  }
});

test("unknown danger signs are asked, never treated as no", () => {
  const d = run({ symptoms: { cannot_drink: null, lethargy: null } });
  assert.equal(d.decision, "need_more_info");
  assert.deepEqual(fields(d), ["cannot_drink", "lethargy"]);
});

test("an urgent referral is not delayed by other unknowns", () => {
  const d = run({ symptoms: { convulsing_now: true, lethargy: null, diarrhoea: null } });
  assert.equal(d.decision, "urgent_referral");
  assert.deepEqual(d.follow_up_questions, []);
});

// ---------- cough or difficult breathing (PDF page 6) ----------

test("fast breathing at 8 months is 50 or more", () => {
  const base = {
    age_days: 240,
    symptoms: { cough_or_difficult_breathing: true, chest_indrawing: false, stridor: false },
    symptom_days: { cough: 3 },
  };
  assert.equal(run({ ...base, breaths_per_minute: 52 }).decision, "treat_at_clinic");
  assert.equal(run({ ...base, breaths_per_minute: 45 }).decision, "home_care");
});

test("fast breathing at 2 years is 40 or more", () => {
  const base = {
    age_days: 730,
    symptoms: { cough_or_difficult_breathing: true, chest_indrawing: false, stridor: false },
    symptom_days: { cough: 3 },
  };
  const fast = run({ ...base, breaths_per_minute: 45 });
  assert.equal(fast.decision, "treat_at_clinic");
  assert.deepEqual(fast.classifications, ["PNEUMONIA"]);
  assert.match(fast.reasons[0], /45 breaths per minute \(fast is 40 or more at this age\)/);
  const normal = run({ ...base, breaths_per_minute: 38 });
  assert.equal(normal.decision, "home_care");
  assert.deepEqual(normal.classifications, ["COUGH OR COLD"]);
});

test("cough without a breath count asks to count breaths for one minute", () => {
  const d = run({
    symptoms: { cough_or_difficult_breathing: true, chest_indrawing: false, stridor: false },
    symptom_days: { cough: 3 },
  });
  assert.equal(d.decision, "need_more_info");
  assert.deepEqual(fields(d), ["breaths_per_minute"]);
});

test("cough questions are only asked once cough is known to be present", () => {
  const d = run({ symptoms: { cough_or_difficult_breathing: null } });
  assert.equal(d.decision, "need_more_info");
  assert.deepEqual(fields(d), ["cough_or_difficult_breathing"]);
});

test("stridor in a calm child -> urgent referral needing oxygen", () => {
  const d = run({ symptoms: { cough_or_difficult_breathing: true, stridor: true } });
  assert.equal(d.decision, "urgent_referral");
  assert.ok(d.required_care.includes("oxygen"));
});

test("chest indrawing -> pneumonia, with the HIV note from the chart", () => {
  const d = run({
    symptoms: { cough_or_difficult_breathing: true, chest_indrawing: true, stridor: false },
    breaths_per_minute: 30,
    symptom_days: { cough: 2 },
  });
  assert.equal(d.decision, "treat_at_clinic");
  assert.ok(d.notes.some((n) => n.startsWith("If chest indrawing in HIV exposed/infected child")));
});

test("oxygen saturation below 90% -> urgent; no reading never blocks", () => {
  const cough = { cough_or_difficult_breathing: true, chest_indrawing: false, stridor: false };
  assert.equal(
    run({ symptoms: cough, breaths_per_minute: 30, spo2_percent: 88, symptom_days: { cough: 2 } }).decision,
    "urgent_referral",
  );
  assert.equal(
    run({ symptoms: cough, breaths_per_minute: 30, spo2_percent: null, symptom_days: { cough: 2 } }).decision,
    "home_care",
  );
});

test("cough for more than 14 days -> referral", () => {
  const d = run({
    symptoms: { cough_or_difficult_breathing: true, chest_indrawing: false, stridor: false },
    breaths_per_minute: 30,
    symptom_days: { cough: 20 },
  });
  assert.equal(d.decision, "referral");
});

// ---------- diarrhoea (PDF page 7) ----------

test("two severe dehydration signs -> urgent referral needing IV rehydration", () => {
  const d = run({
    symptoms: { diarrhoea: true, ...NO_DEHYDRATION_SIGNS, sunken_eyes: true, skin_pinch_very_slow: true },
    symptom_days: { diarrhoea: 2 },
  });
  assert.equal(d.decision, "urgent_referral");
  assert.ok(d.classifications.includes("SEVERE DEHYDRATION"));
  assert.ok(d.required_care.includes("iv_rehydration"));
});

test("two 'some dehydration' signs -> treat at clinic", () => {
  const d = run({
    symptoms: { diarrhoea: true, ...NO_DEHYDRATION_SIGNS, sunken_eyes: true, drinks_eagerly: true },
    symptom_days: { diarrhoea: 2 },
  });
  assert.equal(d.decision, "treat_at_clinic");
  assert.deepEqual(d.classifications, ["SOME DEHYDRATION"]);
});

test("one sign present and the rest unknown: asks, because it could be severe", () => {
  const d = run({ symptoms: { diarrhoea: true, sunken_eyes: true }, symptom_days: { diarrhoea: 2 } });
  assert.equal(d.decision, "need_more_info");
  assert.ok(fields(d).includes("skin_pinch_very_slow"));
});

test("diarrhoea with no dehydration signs -> home care", () => {
  const d = run({ symptoms: { diarrhoea: true, ...NO_DEHYDRATION_SIGNS }, symptom_days: { diarrhoea: 2 } });
  assert.equal(d.decision, "home_care");
  assert.deepEqual(d.classifications, ["NO DEHYDRATION"]);
});

test("blood in the stool -> dysentery, treat at clinic", () => {
  const d = run({
    symptoms: { diarrhoea: true, ...NO_DEHYDRATION_SIGNS, blood_in_stool: true },
    symptom_days: { diarrhoea: 2 },
  });
  assert.equal(d.decision, "treat_at_clinic");
  assert.deepEqual(d.classifications, ["DYSENTERY"]);
});

test("diarrhoea 14 days or more with dehydration -> referral", () => {
  const d = run({
    symptoms: { diarrhoea: true, ...NO_DEHYDRATION_SIGNS, sunken_eyes: true, drinks_eagerly: true },
    symptom_days: { diarrhoea: 15 },
  });
  assert.equal(d.decision, "referral");
  assert.ok(d.classifications.includes("SEVERE PERSISTENT DIARRHOEA"));
});

// ---------- fever (PDF page 8) ----------

test("fever with stiff neck -> urgent referral", () => {
  const d = run({ symptoms: { fever: true, stiff_neck: true }, symptom_days: { fever: 2 } });
  assert.equal(d.decision, "urgent_referral");
  assert.deepEqual(d.classifications, ["VERY SEVERE FEBRILE DISEASE"]);
});

test("fever alone -> clinic for a malaria test", () => {
  const d = run({ symptoms: { fever: true, stiff_neck: false }, symptom_days: { fever: 2 } });
  assert.equal(d.decision, "treat_at_clinic");
  assert.ok(d.required_care.includes("malaria_test"));
});

test("fever for more than 7 days -> referral", () => {
  const d = run({ symptoms: { fever: true, stiff_neck: false }, symptom_days: { fever: 9 } });
  assert.equal(d.decision, "referral");
});

test("a single main symptom uses duration_days when no per-symptom days are given", () => {
  const d = run({ symptoms: { fever: true, stiff_neck: false }, duration_days: 9 });
  assert.equal(d.decision, "referral");
});

// ---------- no danger signs, confidence and safety ----------

test("everything checked and absent -> home care, never called a diagnosis", () => {
  const d = run({});
  assert.equal(d.decision, "home_care");
  assert.deepEqual(d.classifications, ["NO DANGER SIGNS FOUND"]);
  assert.ok(d.notes[0].includes("not a diagnosis"));
});

test("unconfirmed, low confidence, non-urgent -> safe fallback", () => {
  const d = run({ confirmed_by_health_worker: false, confidence: 0.4 });
  assert.equal(d.decision, "safe_fallback");
});

test("low confidence never downgrades an urgent referral", () => {
  const d = run({ confirmed_by_health_worker: false, confidence: 0.4, symptoms: { lethargy: true } });
  assert.equal(d.decision, "urgent_referral");
});

test("a case with no age_days field at all is asked for the age, not let through", () => {
  const c = makeCase();
  delete c.age_days;
  c.patient = { age_days: 730 }; // a nested shape that doesn't match the contract
  const d = evaluate(c, IMCI_PROTOCOL);
  assert.equal(d.decision, "need_more_info");
  assert.deepEqual(fields(d), ["age_days"]);
});

test("a case with no confidence field counts as not confident", () => {
  const c = makeCase({ confirmed_by_health_worker: false });
  delete c.confidence;
  assert.equal(evaluate(c, IMCI_PROTOCOL).decision, "safe_fallback");
});

test("same case, same answer", () => {
  const c = { symptoms: { diarrhoea: true, ...NO_DEHYDRATION_SIGNS, sunken_eyes: true, drinks_eagerly: true } };
  assert.deepEqual(run(c), run(c));
});
