// Shared data formats for the whole app (layers 3 to 7).
// Owned by the decision layer in core/. If you need a change, ask the core owner
// first so every layer updates together.

/**
 * Signs the language layer can extract. The keys follow the wording of the
 * WHO IMCI Chart Booklet (2014), "Sick child age 2 months up to 5 years",
 * PDF pages 5 to 8.
 */
export const SYMPTOM_KEYS = [
  // General danger signs (PDF page 5)
  "cannot_drink", // not able to drink or breastfeed
  "vomiting_everything", // vomits everything
  "convulsions", // has had convulsions during this illness
  "convulsing_now",
  "lethargy", // lethargic or unconscious
  // Cough or difficult breathing (PDF page 6)
  "cough_or_difficult_breathing",
  "chest_indrawing",
  "stridor", // in a calm child
  // Diarrhoea (PDF page 7)
  "diarrhoea",
  "blood_in_stool",
  "restless_irritable",
  "sunken_eyes",
  "drinking_poorly",
  "drinks_eagerly",
  "skin_pinch_very_slow", // goes back very slowly, longer than 2 seconds
  "skin_pinch_slow",
  // Fever (PDF page 8)
  "fever",
  "stiff_neck",
] as const;

export type SymptomKey = (typeof SYMPTOM_KEYS)[number];

/** true = present, false = checked and absent, null = not known. Unknown is never treated as "no". */
export type Tri = boolean | null;

/** Main symptoms that have their own duration questions in the WHO chart. */
export type MainSymptom = "cough" | "diarrhoea" | "fever";

/** Layer 3: one schema for all languages. Produced by the language layer, confirmed by the health worker. */
export type StructuredCase = {
  age_days: number | null;
  /** A key that is missing counts as unknown, the same as null. */
  symptoms: Partial<Record<SymptomKey, Tri>>;
  /** How long the child has been ill, in days. */
  duration_days: number | null;
  /** Per-symptom durations when the caregiver gives them separately. */
  symptom_days?: Partial<Record<MainSymptom, number | null>>;
  /** Counted for one full minute while the child is calm. */
  breaths_per_minute?: number | null;
  /** Only when a pulse oximeter is available. */
  spo2_percent?: number | null;
  missing_fields: string[];
  /** 0 to 1, from the language layer. */
  confidence: number;
  /** Set to true once the health worker has checked every field on the confirm screen. */
  confirmed_by_health_worker?: boolean;
  language: "sw" | "en";
};

/** Ordered from most to least urgent. */
export type DecisionLevel = "urgent_referral" | "referral" | "treat_at_clinic" | "home_care";

/** What a facility must be able to do. Used by care navigation (layer 5). */
export type CareNeed =
  | "pediatric_emergency"
  | "oxygen"
  | "iv_rehydration"
  | "oral_rehydration"
  | "antibiotics"
  | "malaria_test"
  | "clinician";

/** One WHO rule. The quote is copied word for word from the WHO booklet. */
export type Rule = {
  id: string;
  /** WHO classification name, e.g. "VERY SEVERE DISEASE". */
  classification: string;
  colour: "pink" | "yellow" | "green";
  decision: DecisionLevel;
  required_care: CareNeed[];
  quote: string;
  source: string;
  pdf_page: number;
  /** Fields the health worker must check when this rule can't be decided yet. */
  needs: string[];
  /** true = applies, false = does not apply, null = can't tell yet. */
  applies: (c: StructuredCase) => Tri;
  /** Plain-language reasons when the rule fires. Defaults to the labels of the signs that are present. */
  explain?: (c: StructuredCase) => string[];
  /** Extra guidance shown with the decision, quoted word for word from the same source. */
  note?: string;
};

/** A complete rule set: its age scope, rules, follow-up questions and question order. */
export type Protocol = {
  name: string;
  source: string;
  age_scope: { min_days: number; max_days_exclusive: number; quote: string; pdf_page: number };
  rules: Rule[];
  /** Plain-language label for each field. */
  labels: Record<string, string>;
  /** The follow-up question for each field, in the order they should be asked. */
  questions: Record<string, string>;
  /** Main-symptom fields and the fields that only matter once that symptom is known to be present. */
  gates: Record<string, string[]>;
  /** Whether a field is already known for this case. */
  known: (c: StructuredCase, field: string) => boolean;
};

export type FollowUpQuestion = {
  /** A symptom key, "age_days", "breaths_per_minute" or "symptom_days.<symptom>". */
  field: string;
  question: string;
};

export type Citation = {
  rule_id: string;
  quote: string;
  source: string;
  pdf_page: number;
};

/** Layer 4 output. */
export type Decision = {
  decision: DecisionLevel | "need_more_info" | "out_of_scope" | "safe_fallback";
  /** The most urgent level the rules support so far, even while more information is needed. */
  level_so_far: DecisionLevel | null;
  classifications: string[];
  reasons: string[];
  fired_rules: string[];
  required_care: CareNeed[];
  follow_up_questions: FollowUpQuestion[];
  citations: Citation[];
  notes: string[];
};

/** One facility in the offline facility list (layer 5). */
export type Facility = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  level: "health_post" | "health_centre" | "district_hospital";
  services: CareNeed[];
  /** Where the record came from, e.g. "healthsites.io" or "synthetic demo data". */
  source: string;
};

/** Layer 5 output. */
export type FacilityRecommendation = {
  facility_id: string;
  name: string;
  matched_services: CareNeed[];
  missing_services: CareNeed[];
  distance_km: number;
  why: string;
};

/** Layer 6 and 7: the portable care passport. Keep it minimal, it may be scanned by anyone. */
export type Passport = {
  passport_id: string;
  timestamp: string;
  language: "sw" | "en";
  decision: Decision["decision"];
  facility: string;
  reason: string[];
};
