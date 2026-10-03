// The whole decision layer in one call: check the case, run the WHO rules, pick a facility,
// and return exactly the object the care-handoff screen reads (saved under "pumzi.decision").

import { validateCase } from "./case/validate";
import { evaluate } from "./rules/engine";
import { recommendFacility, type Point } from "./navigation/match";
import type { Decision, Facility, FacilityRecommendation, Protocol, StructuredCase } from "./types";

/** What the output layer reads: language from the case, the decision, and the facility. */
export type HandoffPacket = {
  language: "sw" | "en";
  decision: Decision;
  facility: FacilityRecommendation | null;
};

export type DecideResult =
  | { ok: true; case: StructuredCase; packet: HandoffPacket; warnings: string[] }
  | { ok: false; errors: string[] };

/** Decisions that send the child somewhere, so a facility is recommended. */
const NEEDS_FACILITY = new Set<Decision["decision"]>(["urgent_referral", "referral", "treat_at_clinic", "home_care"]);

export function decide(input: unknown, protocol: Protocol, facilities: Facility[], origin: Point): DecideResult {
  const checked = validateCase(input, protocol);
  if (!checked.ok || checked.value === null) return { ok: false, errors: checked.errors };

  const decision = evaluate(checked.value, protocol);
  const facility = NEEDS_FACILITY.has(decision.decision)
    ? recommendFacility(decision.required_care, origin, facilities).best
    : null;

  return {
    ok: true,
    case: checked.value,
    packet: { language: checked.value.language, decision, facility },
    warnings: checked.warnings,
  };
}
