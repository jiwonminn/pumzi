// Runs a structured case through a protocol's rules. No AI in here, so the same case
// always gets the same answer.

import type {
  CareNeed,
  Citation,
  Decision,
  DecisionLevel,
  FollowUpQuestion,
  Protocol,
  Rule,
  StructuredCase,
  SymptomKey,
} from "../types";

export const SEVERITY: Record<DecisionLevel, number> = {
  urgent_referral: 4,
  referral: 3,
  treat_at_clinic: 2,
  home_care: 1,
};

// Unconfirmed, non-urgent answers below this become safe_fallback.
export const CONFIDENCE_FLOOR = 0.6;

const emptyDecision = (decision: Decision["decision"]): Decision => ({
  decision,
  level_so_far: null,
  classifications: [],
  reasons: [],
  fired_rules: [],
  required_care: [],
  follow_up_questions: [],
  citations: [],
  notes: [],
});

const unique = <T>(items: T[]): T[] => [...new Set(items)];

const citationOf = (rule: Rule): Citation => ({
  rule_id: rule.id,
  quote: rule.quote,
  source: rule.source,
  pdf_page: rule.pdf_page,
});

const reasonsOf = (rule: Rule, c: StructuredCase, protocol: Protocol): string[] => {
  if (rule.explain) return rule.explain(c);
  return rule.needs
    .filter((field) => c.symptoms[field as SymptomKey] === true)
    .map((field) => protocol.labels[field] ?? field);
};

const questionsFor = (fields: string[], c: StructuredCase, protocol: Protocol): FollowUpQuestion[] => {
  // Hold box-specific questions until the parent symptom is confirmed.
  const hidden = new Set<string>();
  for (const [gate, boxFields] of Object.entries(protocol.gates)) {
    if (c.symptoms[gate as SymptomKey] !== true) boxFields.forEach((f) => hidden.add(f));
  }
  const wanted = new Set(fields.filter((f) => !hidden.has(f) && !protocol.known(c, f)));
  return Object.keys(protocol.questions)
    .filter((field) => wanted.has(field))
    .map((field) => ({ field, question: protocol.questions[field] }));
};

// Missing fields count as unknown, so a malformed case can't slip past a check.
const normalise = (input: StructuredCase): StructuredCase => ({
  ...input,
  age_days: typeof input.age_days === "number" ? input.age_days : null,
  duration_days: typeof input.duration_days === "number" ? input.duration_days : null,
  symptoms: input.symptoms ?? {},
  missing_fields: input.missing_fields ?? [],
  confidence: typeof input.confidence === "number" ? input.confidence : 0,
});

export function evaluate(input: StructuredCase, protocol: Protocol): Decision {
  const c = normalise(input);

  if (c.age_days === null) {
    const d = emptyDecision("need_more_info");
    d.follow_up_questions = questionsFor(["age_days"], c, protocol);
    return d;
  }
  const scope = protocol.age_scope;
  if (c.age_days < scope.min_days || c.age_days >= scope.max_days_exclusive) {
    const d = emptyDecision("out_of_scope");
    d.reasons = ["The child's age is outside what this tool covers."];
    d.citations = [{ rule_id: "AGE-SCOPE", quote: scope.quote, source: protocol.source, pdf_page: scope.pdf_page }];
    d.notes = ["This tool doesn't cover this case. See a clinician."];
    return d;
  }

  const results = protocol.rules.map((rule) => ({ rule, result: rule.applies(c) }));
  const fired = results
    .filter((r) => r.result === true)
    .map((r) => r.rule)
    .sort((a, b) => SEVERITY[b.decision] - SEVERITY[a.decision]);

  const levelSoFar: DecisionLevel | null = fired.length > 0 ? fired[0].decision : null;
  const actionable = fired.filter((rule) => rule.colour !== "green");
  const shown = actionable.length > 0 ? actionable : fired;

  const d = emptyDecision(levelSoFar ?? "home_care");
  d.level_so_far = levelSoFar;
  d.classifications = shown.map((rule) => rule.classification);
  d.fired_rules = shown.map((rule) => rule.id);
  d.reasons = unique(shown.flatMap((rule) => reasonsOf(rule, c, protocol)));
  d.required_care = unique(shown.flatMap((rule) => rule.required_care)) as CareNeed[];
  d.citations = shown.map(citationOf);
  d.notes = unique(shown.flatMap((rule) => (rule.note ? [rule.note] : [])));

  // Urgent referrals go out straight away (IMCI p. 5: don't delay referral). Otherwise,
  // ask first if an unknown could still make this more urgent.
  if (levelSoFar !== "urgent_referral") {
    const couldEscalate = results.filter(
      (r) =>
        r.result === null &&
        (levelSoFar === null || SEVERITY[r.rule.decision] > SEVERITY[levelSoFar]),
    );
    const questions = questionsFor(
      unique(couldEscalate.flatMap((r) => r.rule.needs)),
      c,
      protocol,
    );
    if (questions.length > 0) {
      d.decision = "need_more_info";
      d.follow_up_questions = questions;
      return d;
    }
  }

  if (fired.length === 0) {
    d.decision = "home_care";
    d.classifications = ["NO DANGER SIGNS FOUND"];
    d.reasons = ["No general danger signs found in what was checked."];
    d.notes = ["This is not a diagnosis. Follow the health worker's advice and come back if the child gets worse."];
  }

  // Low confidence never downgrades an urgent referral.
  if (
    d.decision !== "urgent_referral" &&
    c.confirmed_by_health_worker !== true &&
    c.confidence < CONFIDENCE_FLOOR
  ) {
    d.decision = "safe_fallback";
    d.notes = [
      "The tool isn't sure it understood. Check each sign with the caregiver and confirm.",
      ...d.notes,
    ];
  }

  return d;
}
