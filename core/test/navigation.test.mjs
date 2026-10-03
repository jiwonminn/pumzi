import { test } from "node:test";
import assert from "node:assert/strict";
import { recommendFacility, distanceKm } from "../src/navigation/match.ts";
import { DEMO_FACILITIES, DEMO_ORIGIN } from "../src/navigation/demo-facilities.ts";

test("picks the closest facility that offers everything, not just the nearest", () => {
  const { best } = recommendFacility(["pediatric_emergency", "iv_rehydration"], DEMO_ORIGIN, DEMO_FACILITIES);
  const nearest = [...DEMO_FACILITIES].sort((a, b) => distanceKm(DEMO_ORIGIN, a) - distanceKm(DEMO_ORIGIN, b))[0];
  assert.notEqual(nearest.id, "fac-003", "the nearest facility should not be the right one in this demo");
  assert.equal(best.name, "District Clinic B");
  assert.deepEqual(best.missing_services, []);
  assert.match(best.why, /offers everything needed/);
});

test("oxygen is only at the district hospital", () => {
  const { best } = recommendFacility(["pediatric_emergency", "oxygen"], DEMO_ORIGIN, DEMO_FACILITIES);
  assert.equal(best.name, "Ondera District Hospital");
});

test("no full match: says so honestly and lists what's missing", () => {
  const limited = DEMO_FACILITIES.filter((f) => !f.services.includes("oxygen"));
  const { best } = recommendFacility(["oxygen"], DEMO_ORIGIN, limited);
  assert.deepEqual(best.missing_services, ["oxygen"]);
  assert.match(best.why, /No facility in the offline list offers everything needed/);
});

test("home care: nearest facility for follow-up", () => {
  const { best } = recommendFacility([], DEMO_ORIGIN, DEMO_FACILITIES);
  assert.equal(best.name, "Ondera Health Post");
  assert.match(best.why, /for follow-up/);
});

test("every demo facility is labelled as synthetic", () => {
  assert.ok(DEMO_FACILITIES.every((f) => f.source === "synthetic demo data"));
});
