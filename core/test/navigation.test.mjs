import { test } from "node:test";
import assert from "node:assert/strict";
import { recommendFacility, distanceKm } from "../src/navigation/match.ts";
import { DEMO_FACILITIES, DEMO_ORIGIN, FACILITY_SOURCE } from "../src/navigation/demo-facilities.ts";

// Service tags live only in this fixture. The published list does not include them.
const FIXTURE = [
  {
    id: "fix-1",
    name: "Nearest post",
    lat: -0.425,
    lon: 36.955,
    level: "health_post",
    services: ["oral_rehydration", "malaria_test"],
    source: "matcher fixture",
  },
  {
    id: "fix-2",
    name: "Closer centre",
    lat: -0.39,
    lon: 36.99,
    level: "health_centre",
    services: ["oral_rehydration", "malaria_test", "antibiotics", "clinician"],
    source: "matcher fixture",
  },
  {
    id: "fix-3",
    name: "District Clinic B",
    lat: -0.47,
    lon: 36.99,
    level: "health_centre",
    services: ["pediatric_emergency", "iv_rehydration", "oral_rehydration", "antibiotics", "malaria_test", "clinician"],
    source: "matcher fixture",
  },
  {
    id: "fix-5",
    name: "Ondera District Hospital",
    lat: -0.3,
    lon: 37.08,
    level: "district_hospital",
    services: ["pediatric_emergency", "oxygen", "iv_rehydration", "oral_rehydration", "antibiotics", "malaria_test", "clinician"],
    source: "matcher fixture",
  },
];

test("picks the closest facility that offers everything, not just the nearest", () => {
  const { best } = recommendFacility(["pediatric_emergency", "iv_rehydration"], DEMO_ORIGIN, FIXTURE);
  const nearest = [...FIXTURE].sort((a, b) => distanceKm(DEMO_ORIGIN, a) - distanceKm(DEMO_ORIGIN, b))[0];
  assert.notEqual(nearest.id, "fix-3");
  assert.equal(best.name, "District Clinic B");
  assert.deepEqual(best.missing_services, []);
  assert.match(best.why, /offers everything needed/);
});

test("oxygen is only at the district hospital in the fixture", () => {
  const { best } = recommendFacility(["pediatric_emergency", "oxygen"], DEMO_ORIGIN, FIXTURE);
  assert.equal(best.name, "Ondera District Hospital");
});

test("no full match: says so honestly and lists what's missing", () => {
  const limited = FIXTURE.filter((f) => !f.services.includes("oxygen"));
  const { best } = recommendFacility(["oxygen"], DEMO_ORIGIN, limited);
  assert.deepEqual(best.missing_services, ["oxygen"]);
  assert.match(best.why, /No facility in the offline list offers everything needed/);
});

test("home care: nearest facility for follow-up", () => {
  const { best } = recommendFacility([], DEMO_ORIGIN, FIXTURE);
  assert.equal(best.name, "Nearest post");
  assert.match(best.why, /for follow-up/);
});

test("the offline list is the Maina slice and does not invent IMCI services", () => {
  assert.ok(DEMO_FACILITIES.length > 20);
  for (const facility of DEMO_FACILITIES) {
    assert.equal(facility.services.length, 0);
    assert.equal(facility.source, FACILITY_SOURCE);
    assert.match(facility.source, /Maina et al/);
    assert.ok(facility.name.length > 0);
  }
});

test("an urgent referral goes to the nearest hospital, not the nearest clinic", () => {
  const { best } = recommendFacility(["pediatric_emergency"], DEMO_ORIGIN, DEMO_FACILITIES);
  const hospital = DEMO_FACILITIES.find((f) => f.id === best.facility_id);
  assert.equal(hospital.level, "district_hospital");
  const nearestHospital = DEMO_FACILITIES.filter((f) => f.level === "district_hospital")
    .sort((a, b) => distanceKm(DEMO_ORIGIN, a) - distanceKm(DEMO_ORIGIN, b))[0];
  assert.equal(best.facility_id, nearestHospital.id);
  assert.deepEqual(best.missing_services, []);
  assert.match(best.why, /assumed from the facility type/);
});

test("a yellow case is treated at the nearest clinic of any kind", () => {
  const { best } = recommendFacility(["antibiotics"], DEMO_ORIGIN, DEMO_FACILITIES);
  const nearest = [...DEMO_FACILITIES].sort((a, b) => distanceKm(DEMO_ORIGIN, a) - distanceKm(DEMO_ORIGIN, b))[0];
  assert.equal(best.facility_id, nearest.id);
});

test("a facility that lists its own services is taken at its word", () => {
  const listed = { ...FIXTURE[0], services: ["oral_rehydration"] };
  const { best } = recommendFacility(["antibiotics"], DEMO_ORIGIN, [listed]);
  assert.deepEqual(best.missing_services, ["antibiotics"]);
  assert.doesNotMatch(best.why, /assumed/);
});

test("every reason fits the handoff's 240-character limit", () => {
  const needs = [[], ["pediatric_emergency"], ["oxygen", "iv_rehydration"], ["antibiotics"], ["malaria_test"],
    ["pediatric_emergency", "oxygen", "iv_rehydration", "oral_rehydration", "antibiotics", "malaria_test", "clinician"]];
  for (const need of needs) {
    for (const set of [DEMO_FACILITIES, FIXTURE, FIXTURE.slice(0, 1)]) {
      const { best, alternatives } = recommendFacility(need, DEMO_ORIGIN, set);
      for (const r of [best, ...alternatives]) assert.ok(r.why.length <= 240, `${r.why.length}: ${r.why}`);
    }
  }
});
