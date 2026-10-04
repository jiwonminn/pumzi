// Types shared across the app. Changes go through the core owner so every layer
// stays in sync.

// Keys follow the IMCI chart wording (WHO 2014, pp. 5-8).
export const SYMPTOM_KEYS = [
  // General danger signs
  "cannot_drink", // not able to drink or breastfeed
  "vomiting_everything", // vomits everything
  "convulsions", // has had convulsions during this illness
  "convulsing_now",
  "lethargy", // lethargic or unconscious
  // Cough or difficult breathing
  "cough_or_difficult_breathing",
  "chest_indrawing",
  "stridor", // in a calm child
  // Diarrhoea
  "diarrhoea",
  "blood_in_stool",
  "restless_irritable",
  "sunken_eyes",
  "drinking_poorly",
  "drinks_eagerly",
  "skin_pinch_very_slow", // longer than 2 seconds
  "skin_pinch_slow",
  // Fever
  "fever",
  "stiff_neck",
] as const;

export type SymptomKey = (typeof SYMPTOM_KEYS)[number];

// true = present, false = checked and absent, null = unknown (never treated as "no").
export type Tri = boolean | null;

export type MainSymptom = "cough" | "diarrhoea" | "fever";

// Produced by the language layer, then confirmed by the health worker.
export type StructuredCase = {
  age_days: number | null;
  // Missing keys count as unknown.
  symptoms: Partial<Record<SymptomKey, Tri>>;
  duration_days: number | null;
  symptom_days?: Partial<Record<MainSymptom, number | null>>;
  // Counted over a full minute, child calm.
  breaths_per_minute?: number | null;
  // Only if there's a pulse oximeter.
  spo2_percent?: number | null;
  missing_fields: string[];
  // 0-1, from the extractor.
  confidence: number;
  // Set once the health worker has checked the fields.
  confirmed_by_health_worker?: boolean;
  language: "sw" | "en";
};

// Most to least urgent.
export type DecisionLevel = "urgent_referral" | "referral" | "treat_at_clinic" | "home_care";

// What a facility needs to offer. Used by care navigation.
export type CareNeed =
  | "pediatric_emergency"
  | "oxygen"
  | "iv_rehydration"
  | "oral_rehydration"
  | "antibiotics"
  | "malaria_test"
  | "clinician";

export type Rule = {
  id: string;
  // e.g. "VERY SEVERE DISEASE"
  classification: string;
  colour: "pink" | "yellow" | "green";
  decision: DecisionLevel;
  required_care: CareNeed[];
  quote: string;
  source: string;
  pdf_page: number;
  // Fields to ask about when the rule can't be decided yet.
  needs: string[];
  applies: (c: StructuredCase) => Tri;
  // Defaults to the labels of the signs that are present.
  explain?: (c: StructuredCase) => string[];
  // Extra guidance, quoted verbatim from the same source.
  note?: string;
};

// A rule set plus what the engine needs to ask about it.
export type Protocol = {
  name: string;
  source: string;
  age_scope: { min_days: number; max_days_exclusive: number; quote: string; pdf_page: number };
  rules: Rule[];
  labels: Record<string, string>;
  // In the order they should be asked.
  questions: Record<string, string>;
  // Parent symptom -> fields that only matter once it's confirmed.
  gates: Record<string, string[]>;
  known: (c: StructuredCase, field: string) => boolean;
};

export type FollowUpQuestion = {
  // A symptom key, "age_days", "breaths_per_minute" or "symptom_days.<symptom>".
  field: string;
  question: string;
};

export type Citation = {
  rule_id: string;
  quote: string;
  source: string;
  pdf_page: number;
};

export type Decision = {
  decision: DecisionLevel | "need_more_info" | "out_of_scope" | "safe_fallback";
  // Most urgent level supported so far, even while more info is needed.
  level_so_far: DecisionLevel | null;
  classifications: string[];
  reasons: string[];
  fired_rules: string[];
  required_care: CareNeed[];
  follow_up_questions: FollowUpQuestion[];
  citations: Citation[];
  notes: string[];
};

export type Facility = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  level: "health_post" | "health_centre" | "district_hospital";
  services: CareNeed[];
  // e.g. "Maina et al., Scientific Data (2019)..."
  source: string;
};

export type FacilityRecommendation = {
  facility_id: string;
  name: string;
  matched_services: CareNeed[];
  missing_services: CareNeed[];
  distance_km: number;
  why: string;
};

// Keep this minimal. Anyone can scan a QR code.
export type Passport = {
  passport_id: string;
  timestamp: string;
  language: "sw" | "en";
  decision: Decision["decision"];
  facility: string;
  reason: string[];
};
