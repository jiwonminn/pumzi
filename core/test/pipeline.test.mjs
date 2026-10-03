import { test } from "node:test";
import assert from "node:assert/strict";
import { decide } from "../src/pipeline.ts";
import { IMCI_PROTOCOL } from "../src/rules/who-imci.ts";
import { DEMO_FACILITIES, DEMO_ORIGIN } from "../src/navigation/demo-facilities.ts";

const run = (input) => decide(input, IMCI_PROTOCOL, DEMO_FACILITIES, DEMO_ORIGIN);

const CONTRACT_EXAMPLE = {
  age_days: 730,
  symptoms: { fever: true, cannot_drink: true, vomiting_everything: false, convulsions: false, convulsing_now: false, lethargy: null },
  duration_days: 1,
  symptom_days: { fever: 1 },
  breaths_per_minute: null,
  spo2_percent: null,
  missing_fields: ["lethargy"],
  confidence: 0.85,
  confirmed_by_health_worker: false,
  language: "sw",
};

test("contract example -> the packet the handoff screen reads", () => {
  const r = run(CONTRACT_EXAMPLE);
  assert.equal(r.ok, true);
  assert.deepEqual(Object.keys(r.packet).sort(), ["decision", "facility", "language"]);
  assert.equal(r.packet.language, "sw");
  assert.equal(r.packet.decision.decision, "urgent_referral");
  assert.equal(r.packet.facility.name, "District Clinic B");
});

test("the packet survives a JSON round trip, as it does through localStorage", () => {
  const r = run(CONTRACT_EXAMPLE);
  assert.deepEqual(JSON.parse(JSON.stringify(r.packet)), r.packet);
});

test("a case that breaks the contract is refused with the reason, never decided", () => {
  const { age_days, ...rest } = CONTRACT_EXAMPLE;
  const r = run({ ...rest, patient: { age_days } });
  assert.equal(r.ok, false);
  assert.ok(r.errors.includes("age_days must be at the top level, not inside patient."));
});

test("need_more_info and out_of_scope get no facility", () => {
  const noCount = run({
    ...CONTRACT_EXAMPLE,
    symptoms: {
      cannot_drink: false, vomiting_everything: false, convulsions: false, convulsing_now: false, lethargy: false,
      cough_or_difficult_breathing: true, chest_indrawing: false, stridor: false, diarrhoea: false, fever: false,
    },
    confirmed_by_health_worker: true,
  });
  assert.equal(noCount.packet.decision.decision, "need_more_info");
  assert.equal(noCount.packet.facility, null);

  const infant = run({ ...CONTRACT_EXAMPLE, age_days: 30 });
  assert.equal(infant.packet.decision.decision, "out_of_scope");
  assert.equal(infant.packet.facility, null);
});
