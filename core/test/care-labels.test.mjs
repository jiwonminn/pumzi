import { test } from "node:test";
import assert from "node:assert/strict";
import { CARE_NEED_LABELS, careNeedLabel, careNeedList } from "../src/navigation/care-labels.ts";
import { DEMO_FACILITIES } from "../src/navigation/demo-facilities.ts";
import { IMCI_PROTOCOL } from "../src/rules/who-imci.ts";

test("every care need used by the rules or the facilities has a label", () => {
  const used = new Set([
    ...IMCI_PROTOCOL.rules.flatMap((r) => r.required_care),
    ...DEMO_FACILITIES.flatMap((f) => f.services),
  ]);
  for (const need of used) assert.ok(CARE_NEED_LABELS[need], `no label for ${need}`);
});

test("labels read like words, not code", () => {
  for (const label of Object.values(CARE_NEED_LABELS)) assert.doesNotMatch(label, /_/);
});

test("a list of needs becomes one readable line", () => {
  assert.equal(careNeedList(["pediatric_emergency", "iv_rehydration"]), "Emergency care for children, IV fluids");
});

test("an unknown key falls back to itself", () => {
  assert.equal(careNeedLabel("x_ray"), "x_ray");
});
