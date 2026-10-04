import { test } from "node:test";
import assert from "node:assert/strict";
import { extractCase, extractCaseWithEvidence } from "../src/extract/phrase-matcher.ts";
import { validateCase } from "../src/case/validate.ts";
import { decide } from "../src/pipeline.ts";
import { IMCI_PROTOCOL } from "../src/rules/who-imci.ts";
import { DEMO_FACILITIES, DEMO_ORIGIN } from "../src/navigation/demo-facilities.ts";

const en = (text, extra = {}) => extractCase(text, { language: "en", ...extra });
const sw = (text, extra = {}) => extractCase(text, { language: "sw", ...extra });

test("the team's example sentence", () => {
  const c = en("My child has a fever and cannot drink anything.");
  assert.equal(c.symptoms.fever, true);
  assert.equal(c.symptoms.cannot_drink, true);
  assert.equal(c.symptoms.lethargy, undefined);
});

test("age and duration from the translated backend sentence", () => {
  const c = en("My two-year-old has a fever and has been unable to drink anything since yesterday.");
  assert.equal(c.age_days, 730);
  assert.equal(c.duration_days, 1);
  assert.equal(c.symptoms.cannot_drink, true);
});

test("never invents numbers: 'breathing fast' gives no breath count or oxygen", () => {
  const c = en("My child has a cough and is breathing fast.");
  assert.equal(c.symptoms.cough_or_difficult_breathing, true);
  assert.equal(c.breaths_per_minute, null);
  assert.equal(c.spo2_percent, null);
});

test("numbers count when they're actually stated", () => {
  const c = en("She is breathing 52 breaths per minute and her oxygen is 88%.");
  assert.equal(c.breaths_per_minute, 52);
  assert.equal(c.spo2_percent, 88);
});

test("negation: no fever, not lethargic, no convulsions", () => {
  const c = en("No fever. He is not lethargic and has not had any convulsions.");
  assert.equal(c.symptoms.fever, false);
  assert.equal(c.symptoms.lethargy, false);
  assert.equal(c.symptoms.convulsions, false);
});

test("negation stays inside its clause", () => {
  const c = en("No fever, but she has had diarrhoea for 3 days and her eyes are sunken.");
  assert.equal(c.symptoms.fever, false);
  assert.equal(c.symptoms.diarrhoea, true);
  assert.equal(c.symptoms.sunken_eyes, true);
  assert.equal(c.duration_days, 3);
});

test("doesn't stretch: 'hasn't eaten' is not 'can't drink'", () => {
  const c = en("My son has not eaten for 24 hours.");
  assert.equal(c.symptoms.cannot_drink, undefined);
  assert.equal(c.duration_days, 1);
});

test("'not drinking much' is drinking poorly, not a danger sign", () => {
  const c = en("He has diarrhoea and is not drinking much.");
  assert.equal(c.symptoms.drinking_poorly, true);
  assert.equal(c.symptoms.cannot_drink, undefined);
});

test("'fit and healthy' is not a convulsion", () => {
  assert.equal(en("She was fit and healthy until today.").symptoms.convulsions, undefined);
});

test("Swahili: the original sentence, without translation", () => {
  const c = sw("Mtoto wangu wa miaka miwili ana homa na hawezi kunywa chochote tangu jana.");
  assert.equal(c.age_days, 730);
  assert.equal(c.symptoms.fever, true);
  assert.equal(c.symptoms.cannot_drink, true);
  assert.equal(c.duration_days, 1);
});

test("Swahili: cough and fast breathing, and 'hana homa' means no fever", () => {
  const c = sw("Mtoto ana kikohozi na anapumua haraka. Hana homa.");
  assert.equal(c.symptoms.cough_or_difficult_breathing, true);
  assert.equal(c.symptoms.fever, false);
});

test("the age box on the form wins over the text", () => {
  assert.equal(en("My 2 year old has a fever.", { ageDays: 1095 }).age_days, 1095);
});

test("nothing recognised: low confidence, every danger sign still to ask", () => {
  const c = en("Hello, can someone help?");
  assert.deepEqual(c.symptoms, {});
  assert.equal(c.confidence, 0.2);
  assert.deepEqual(c.missing_fields, ["cannot_drink", "vomiting_everything", "convulsions", "lethargy"]);
});

test("evidence shows which words set each field", () => {
  const { evidence } = extractCaseWithEvidence("My child cannot drink.", { language: "en" });
  assert.deepEqual(evidence, [{ field: "cannot_drink", phrase: "cannot drink", value: true }]);
});

test("output always passes the contract check and goes straight into decide()", () => {
  const sentences = [
    "My child has a fever and cannot drink anything.",
    "My child has a cough and is breathing fast.",
    "Hello, can someone help?",
  ];
  for (const s of sentences) {
    const c = en(s, { ageDays: 730 });
    assert.equal(validateCase(c, IMCI_PROTOCOL).ok, true, s);
  }
  const r = decide(en("My child has a fever and cannot drink anything.", { ageDays: 730 }), IMCI_PROTOCOL, DEMO_FACILITIES, DEMO_ORIGIN);
  assert.equal(r.ok, true);
  assert.equal(r.packet.decision.decision, "urgent_referral");
  assert.equal(r.packet.facility.name, "Good Samaritan ACK Medical Clinic");
  assert.deepEqual(r.packet.facility.missing_services, ["pediatric_emergency"]);
});
